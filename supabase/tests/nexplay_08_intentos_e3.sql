-- Test de etapa 3, Task 1 (practica, colchon, Underdog, nx_mi_fecha, tabla provisoria y cierre).
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
do $$
declare
  adm uuid; u uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  j uuid[] := '{}'; jx uuid; k int; t temporadas; f fechas; e record; i intentos; m jsonb; msg text; n int; id1 uuid;
begin
  select user_id into adm from cuentas where es_admin limit 1;
  insert into auth.users(id, email) select x, x::text || '@x.com' from unnest(u) x;
  for k in 1..8 loop
    insert into jugadores(apodo) values ('Test ' || k) returning id into jx;
    j := j || jx;
    insert into cuentas(user_id, estado, jugador_id) values (u[k], 'aceptado', jx);
  end loop;

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  t := nx_crear_temporada('Test e3 intentos', 1, true);
  perform nx_iniciar_temporada(t.id);
  f := nx_iniciar_fecha(t.id);

  -- 1 y 2: jugador 1, practica antes del 1
  perform set_config('request.jwt.claims', json_build_object('sub',u[1],'role','authenticated')::text, true);
  select * into e from nx_empezar_intento(f.id, true);
  if e.numero <> 0 then raise exception 'FALLA: 1a %', e; end if;
  begin perform nx_empezar_intento(f.id, true); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_practica%' then raise exception 'FALLA: 1b (%)', msg; end if;
  m := nx_mi_fecha(f.id);
  if m->>'practica' <> 'usada' or (m->>'usados')::int <> 0 or (m->>'intentos_max')::int <> 3 or (m->>'underdog')::boolean then
    raise exception 'FALLA: 2 %', m; end if;

  -- 3 colchon en el 1 (jugador 2)
  perform set_config('request.jwt.claims', json_build_object('sub',u[2],'role','authenticated')::text, true);
  m := nx_mi_fecha(f.id);
  if m->>'practica' <> 'disponible' or (m->>'colchon_usado')::boolean then raise exception 'FALLA: 3a %', m; end if;
  select intento_id into id1 from nx_empezar_intento(f.id);
  select * into e from nx_empezar_intento(f.id);
  select * into i from intentos where id = id1;
  if i.estado <> 'interrumpido' or i.motivo <> 'colchon' or e.numero <> 1 then raise exception 'FALLA: 3b % %', i, e; end if;
  m := nx_mi_fecha(f.id);
  -- el intento nuevo (1) esta en curso y cuenta como usado
  if not (m->>'colchon_usado')::boolean or m->>'practica' <> 'usada' or (m->>'usados')::int <> 1 then raise exception 'FALLA: 3c %', m; end if;
  -- ya sin colchon: abandonar el 1 da el 2, abandonar el 2 da el 3
  select intento_id into id1 from nx_empezar_intento(f.id);
  select * into e from nx_empezar_intento(f.id);
  select * into i from intentos where id = id1;
  if i.estado <> 'interrumpido' or i.motivo <> 'abandonado' or e.numero <> 3 then raise exception 'FALLA: 3d % %', i, e; end if;
  select count(*) into n from intentos where fecha_id = f.id and jugador_id = j[2] and motivo = 'abandonado';
  if n <> 2 then raise exception 'FALLA: 3f %', n; end if;

  -- 4 colchon en el 2 (jugador 3)
  perform set_config('request.jwt.claims', json_build_object('sub',u[3],'role','authenticated')::text, true);
  select intento_id into id1 from nx_empezar_intento(f.id);
  perform set_config('role','postgres',true);
  update intentos set estado = 'completado', resultado = 5000, terminado_en = now() where id = id1;
  perform set_config('role','authenticated',true);
  select intento_id into id1 from nx_empezar_intento(f.id);
  select * into e from nx_empezar_intento(f.id);
  select * into i from intentos where id = id1;
  if i.motivo <> 'colchon' or e.numero <> 2 then raise exception 'FALLA: 4 % %', i, e; end if;

  -- 5 sin colchon en el 3 (jugador 4): practica, 1 y 2 jugados, el 3 sin terminar
  perform set_config('request.jwt.claims', json_build_object('sub',u[4],'role','authenticated')::text, true);
  perform nx_empezar_intento(f.id, true);
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f.id, j[4], 1, 'completado', 5000, 1), (f.id, j[4], 2, 'completado', 5000, 1);
  perform set_config('role','authenticated',true);
  select * into e from nx_empezar_intento(f.id);
  if e.numero <> 3 then raise exception 'FALLA: 5a %', e; end if;
  -- el pedido da sin_intentos y, al deshacerse, el 3 sigue en curso (cuenta como usado)
  begin perform nx_empezar_intento(f.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_intentos%' then raise exception 'FALLA: 5b (%)', msg; end if;
  m := nx_mi_fecha(f.id);
  if (m->>'usados')::int <> 3 then raise exception 'FALLA: 5c %', m; end if;

  -- 6 practica despues del 2 (jugador 5)
  perform set_config('request.jwt.claims', json_build_object('sub',u[5],'role','authenticated')::text, true);
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values (f.id, j[5], 1, 'completado', 5000, 1);
  perform set_config('role','authenticated',true);
  perform nx_empezar_intento(f.id);
  begin perform nx_empezar_intento(f.id, true); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_practica%' then raise exception 'FALLA: 6a (%)', msg; end if;
  m := nx_mi_fecha(f.id);
  if m->>'practica' <> 'cerrada' then raise exception 'FALLA: 6b %', m; end if;

  -- 7 Underdog (jugador 6): cuatro intentos, el quinto no
  perform set_config('role','postgres',true);
  update fechas set underdogs = array[j[6]] where id = f.id;
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f.id, j[6], 1, 'completado', 5000, 1), (f.id, j[6], 2, 'completado', 5000, 1), (f.id, j[6], 3, 'completado', 5000, 1);
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u[6],'role','authenticated')::text, true);
  select * into e from nx_empezar_intento(f.id);
  if e.numero <> 4 then raise exception 'FALLA: 7a %', e; end if;
  begin perform nx_empezar_intento(f.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_intentos%' then raise exception 'FALLA: 7b (%)', msg; end if;
  m := nx_mi_fecha(f.id);
  if (m->>'intentos_max')::int <> 4 or not (m->>'underdog')::boolean then raise exception 'FALLA: 7c %', m; end if;

  -- 8 tabla: la practica no entra a mejor ni a intentos_usados (jugador 7)
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f.id, j[7], 0, 'completado', 3000, 1), (f.id, j[7], 1, 'completado', 5000, 1);
  select * into e from nx_tabla_provisoria where fecha_id = f.id and jugador_id = j[7];
  if e.mejor <> 5000 or e.intentos_usados <> 1 then raise exception 'FALLA: 8a %', e; end if;

  -- 10 practica con el 1 en curso (jugador 8): el 1 queda abandonado (no colchon) y la practica se concede
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u[8],'role','authenticated')::text, true);
  select intento_id into id1 from nx_empezar_intento(f.id);
  select * into e from nx_empezar_intento(f.id, true);
  select * into i from intentos where id = id1;
  if e.numero <> 0 or i.estado <> 'interrumpido' or i.motivo <> 'abandonado' then raise exception 'FALLA: 10a % %', i, e; end if;
  m := nx_mi_fecha(f.id);
  if (m->>'colchon_usado')::boolean or m->>'practica' <> 'usada' or (m->>'usados')::int <> 1 then raise exception 'FALLA: 10b %', m; end if;

  -- 9 el cierre tampoco cuenta la practica: el 7 queda con 5.00, no con 3.00
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  f := nx_cerrar_fecha(f.id);
  select performance into msg from resultados where fecha_id = f.id and jugador_id = j[7];
  if msg is distinct from '5.00 Segundos' then raise exception 'FALLA: 9 %', msg; end if;

  perform set_config('role','postgres',true);
  raise exception 'TEST_OK';
end $$;
