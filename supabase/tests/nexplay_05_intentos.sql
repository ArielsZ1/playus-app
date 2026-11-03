-- Test de etapa 2, Task 3 (intentos, validacion de Count! y tabla provisoria).
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
-- now() es fijo dentro de la transaccion: para simular duracion se atrasa empezado_en.
do $$
declare
  adm uuid; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ja uuid; jb uuid; t temporadas; f fechas; e record; i intentos; i1 uuid; i2 uuid; i3 uuid;
  msg text; tp record;
  ok jsonb := '{"tiempo_ms":4500,"errores":2,"penalizacion_ms":200}';
begin
  select user_id into adm from cuentas where es_admin limit 1;
  insert into auth.users(id, email) values (ua, 'a@x.com'), (ub, 'b@x.com'), (uc, 'c@x.com');
  insert into jugadores(apodo) values ('Test A') returning id into ja;
  insert into jugadores(apodo) values ('Test B') returning id into jb;
  insert into cuentas(user_id, estado, jugador_id) values (ua, 'aceptado', ja), (ub, 'aceptado', jb), (uc, 'pendiente', null);

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  t := nx_crear_temporada('Test intentos', 1, true);
  perform nx_iniciar_temporada(t.id);
  f := nx_iniciar_fecha(t.id);

  -- 1 cuenta no aceptada
  perform set_config('request.jwt.claims', json_build_object('sub',uc,'role','authenticated')::text, true);
  begin perform nx_empezar_intento(f.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%no_habilitado%' then raise exception 'FALLA: 1 (%)', msg; end if;

  -- 2 empezar
  perform set_config('request.jwt.claims', json_build_object('sub',ua,'role','authenticated')::text, true);
  select * into e from nx_empezar_intento(f.id);
  if e.numero <> 1 or e.modulo <> 'count' or e.semilla is null then raise exception 'FALLA: 2 %', e; end if;
  i1 := e.intento_id;

  -- 3 terminar valido
  perform set_config('role','postgres',true);
  update intentos set empezado_en = now() - interval '10 seconds' where id = i1;
  perform set_config('role','authenticated',true);
  i := nx_terminar_intento(i1, 4700, ok);
  if i.estado <> 'completado' or i.resultado <> 4700 or i.datos <> ok or i.terminado_en is null then
    raise exception 'FALLA: 3 %', i; end if;

  -- 4 abandono: empezar el 3 sin terminar el 2
  select intento_id into i2 from nx_empezar_intento(f.id);
  select * into e from nx_empezar_intento(f.id);
  i3 := e.intento_id;
  if e.numero <> 3 then raise exception 'FALLA: 4a numero %', e.numero; end if;
  select * into i from intentos where id = i2;
  if i.estado <> 'interrumpido' or i.motivo <> 'abandonado' then raise exception 'FALLA: 4b %', i; end if;
  begin perform nx_empezar_intento(f.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_intentos%' then raise exception 'FALLA: 4c (%)', msg; end if;

  -- 5 demasiado rapido (el 3 sigue en curso tras el sin_intentos)
  perform set_config('role','postgres',true);
  update intentos set empezado_en = now() - interval '10 seconds' where id = i3;
  perform set_config('role','authenticated',true);
  i := nx_terminar_intento(i3, 2000, '{"tiempo_ms":2000,"errores":0,"penalizacion_ms":0}');
  if i.estado <> 'invalido' or i.motivo <> 'demasiado_rapido' or i.resultado is not null then raise exception 'FALLA: 5 %', i; end if;

  -- 6, 7 y datos incompletos con el jugador B
  perform set_config('request.jwt.claims', json_build_object('sub',ub,'role','authenticated')::text, true);
  select intento_id into i2 from nx_empezar_intento(f.id);
  perform set_config('role','postgres',true);
  update intentos set empezado_en = now() - interval '10 seconds' where id = i2;
  perform set_config('role','authenticated',true);
  i := nx_terminar_intento(i2, 5000, '{"tiempo_ms":4500,"errores":1,"penalizacion_ms":100}');
  if i.estado <> 'invalido' or i.motivo <> 'no_cierra' then raise exception 'FALLA: 6 %', i; end if;

  select intento_id into i2 from nx_empezar_intento(f.id);
  i := nx_terminar_intento(i2, 8000, '{"tiempo_ms":8000,"errores":0,"penalizacion_ms":0}');
  if i.estado <> 'invalido' or i.motivo <> 'duracion_imposible' then raise exception 'FALLA: 7 %', i; end if;

  select intento_id into i2 from nx_empezar_intento(f.id);
  i := nx_terminar_intento(i2, 4700, '{"tiempo_ms":"x"}');
  if i.estado <> 'invalido' or i.motivo <> 'datos_incompletos' then raise exception 'FALLA: 7b %', i; end if;

  -- 8 ajeno y cerrado
  begin perform nx_terminar_intento(i1, 4700, ok); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%intento_ajeno%' then raise exception 'FALLA: 8a (%)', msg; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',ua,'role','authenticated')::text, true);
  begin perform nx_terminar_intento(i1, 4700, ok); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%intento_cerrado%' then raise exception 'FALLA: 8b (%)', msg; end if;

  -- 9 tabla provisoria (la lee anon)
  perform set_config('role','anon',true);
  perform set_config('request.jwt.claims','{}',true);
  select * into tp from nx_tabla_provisoria where fecha_id = f.id and jugador_id = ja;
  if tp.mejor <> 4700 or tp.intentos_usados <> 3 or tp.en_juego or tp.apodo <> 'Test A' then raise exception 'FALLA: 9a %', tp; end if;
  select * into tp from nx_tabla_provisoria where fecha_id = f.id and jugador_id = jb;
  if tp.mejor is not null or tp.intentos_usados <> 3 then raise exception 'FALLA: 9b %', tp; end if;

  perform set_config('role','postgres',true);
  raise exception 'TEST_OK';
end $$;
