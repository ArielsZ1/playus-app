-- Test de etapa 3, Task 3 (reloj diario, apertura con Underdog y ritmo maraton).
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
-- El tick se llama como postgres y sin usuario (auth.uid() null), como desde pg_cron.
do $$
declare
  adm uuid; u uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  j uuid[] := '{}'; jx uuid; k int; t temporadas; f fechas; f2 fechas; msg text; n int; jg uuid[]; tp uuid; fp uuid;
begin
  select user_id into adm from cuentas where es_admin limit 1;
  -- solo los jugadores del test cuentan para el Underdog
  update cuentas set jugador_id = null where jugador_id is not null;
  select array_agg(id) into jg from (select id from juegos where modulo is null order by nombre limit 2) x;
  insert into auth.users(id, email) select x, x::text || '@x.com' from unnest(u) x;
  for k in 1..4 loop  -- A, B, C, D (D se suma en la fecha 2)
    insert into jugadores(apodo) values ('Test ' || k) returning id into jx;
    j := j || jx;
  end loop;
  insert into cuentas(user_id, estado, jugador_id) values (u[1], 'aceptado', j[1]), (u[2], 'aceptado', j[2]), (u[3], 'aceptado', j[3]);

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  t := nx_crear_temporada('Test reloj', 3, false);
  t := nx_iniciar_temporada(t.id);
  if t.reglas->>'intentos' <> '3' or coalesce(t.reglas->>'ritmo','diario') <> 'diario' then raise exception 'FALLA: 0 %', t.reglas; end if;

  -- 1 el primer tick abre la fecha 1 sin Underdog
  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims', '', true);
  perform nx_tick();
  select * into f from fechas where temporada_id = t.id and estado = 'abierta';
  if f.numero_fecha is distinct from 1 or f.underdogs is not null or f.bonus_porcentaje <> 0 then raise exception 'FALLA: 1 %', f; end if;
  select count(*) into n from auditoria where accion = 'auto_iniciar_fecha' and entidad_id = f.id and admin_user_id is null;
  if n <> 1 then raise exception 'FALLA: 1b auditoria %', n; end if;

  -- 2 el admin no mueve a mano una temporada real diaria
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  begin perform nx_iniciar_fecha(t.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%ritmo_diario%' then raise exception 'FALLA: 2a (%)', msg; end if;
  begin perform nx_cerrar_fecha(f.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%ritmo_diario%' then raise exception 'FALLA: 2b (%)', msg; end if;
  begin perform nx_tick(); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%permission denied%' then raise exception 'FALLA: 2c (%)', msg; end if;

  -- 3 vencida: A 4000, B 5000, C no juega -> cierra la 1 y abre la 2 con underdogs {C}
  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims', '', true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f.id, j[1], 1, 'completado', 4000, 1), (f.id, j[2], 1, 'completado', 5000, 1);
  update fechas set abierta_en = now() - interval '24 hours' where id = f.id;
  update juegos set modulo = 'count' where id = jg[1];
  perform nx_tick();
  if (select estado from fechas where id = f.id) <> 'cerrada' then raise exception 'FALLA: 3a f1 sigue abierta'; end if;
  select * into f2 from fechas where temporada_id = t.id and estado = 'abierta';
  if f2.numero_fecha is distinct from 2 or f2.underdogs is distinct from array[j[3]] or f2.bonus_porcentaje <> 5
     or f2.juego_id = f.juego_id then raise exception 'FALLA: 3b %', f2; end if;

  -- 5 un segundo tick enseguida no cambia nada
  perform nx_tick();
  select count(*) into n from fechas where temporada_id = t.id;
  if n <> 2 or (select estado from fechas where id = f2.id) <> 'abierta' then raise exception 'FALLA: 5 %', n; end if;

  -- D se suma con 0 (empata con C)
  insert into cuentas(user_id, estado, jugador_id) values (u[4], 'aceptado', j[4]);

  -- 6 pausada: el tick cierra la vencida y no abre
  update fechas set abierta_en = now() - interval '24 hours' where id = f2.id;
  update temporadas set estado = 'pausada' where id = t.id;
  perform nx_tick();
  if (select estado from fechas where id = f2.id) <> 'cerrada' then raise exception 'FALLA: 6a f2 sigue abierta'; end if;
  select count(*) into n from fechas where temporada_id = t.id;
  if n <> 2 then raise exception 'FALLA: 6b abrio con la temporada pausada'; end if;

  -- 7 al reanudar sin juegos elegibles: queda pausada y se audita auto_sin_juegos
  update temporadas set estado = 'activa' where id = t.id;
  perform nx_tick();
  if (select estado from temporadas where id = t.id) <> 'pausada' then raise exception 'FALLA: 7a no se pauso'; end if;
  select count(*) into n from auditoria where accion = 'auto_sin_juegos' and entidad_id = t.id;
  if n <> 1 then raise exception 'FALLA: 7b auditoria %', n; end if;

  -- 6c y 4 con un tercer juego, al reanudar abre la 3 con el empate {C, D} en el ultimo puesto
  update juegos set modulo = 'count' where id = jg[2];
  update temporadas set estado = 'activa' where id = t.id;
  perform nx_tick();
  select * into f from fechas where temporada_id = t.id and estado = 'abierta';
  if f.numero_fecha is distinct from 3 then raise exception 'FALLA: 6c no abrio %', f; end if;
  if f.underdogs is distinct from (select array_agg(x order by x) from unnest(array[j[3], j[4]]) x) then
    raise exception 'FALLA: 4 underdogs %', f.underdogs; end if;

  -- 8 cerrar la ultima finaliza con campeones; el tick siguiente no hace nada
  update fechas set abierta_en = now() - interval '24 hours' where id = f.id;
  perform nx_tick();
  select * into t from temporadas where id = t.id;
  if t.estado <> 'finalizada' or t.campeones is distinct from array[j[1]] then raise exception 'FALLA: 8a %', t; end if;
  perform nx_tick();
  select count(*) into n from fechas where temporada_id = t.id;
  if n <> 3 or (select estado from temporadas where id = t.id) <> 'finalizada' then raise exception 'FALLA: 8b %', n; end if;

  -- 9 las de prueba no se tocan: ni se cierra la vencida ni se abre otra
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas)
  values ('Test reloj prueba', true, true, 'activa', 3) returning id into tp;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (tp, 1, current_date, jg[1], 0, 'abierta', now() - interval '48 hours') returning id into fp;
  perform nx_tick();
  if (select estado from fechas where id = fp) <> 'abierta' then raise exception 'FALLA: 9a cerro la de prueba'; end if;
  update fechas set estado = 'cerrada', cerrada_en = now() where id = fp;
  perform nx_tick();
  select count(*) into n from fechas where temporada_id = tp;
  if n <> 1 then raise exception 'FALLA: 9b abrio en la de prueba'; end if;
  update temporadas set estado = 'finalizada' where id = tp;

  -- 10 maraton: real, el tick la ignora y el admin la mueve a mano sin esperar
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  begin perform nx_crear_temporada('Test semanal', 2, false, 'semanal'); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%ritmo_invalido%' then raise exception 'FALLA: 10a (%)', msg; end if;
  t := nx_crear_temporada('Test maraton', 2, false, 'maraton');
  if t.reglas->>'ritmo' is distinct from 'maraton' then raise exception 'FALLA: 10b %', t.reglas; end if;
  t := nx_iniciar_temporada(t.id);
  if t.reglas->>'ritmo' is distinct from 'maraton' or t.reglas->>'intentos' <> '3' then raise exception 'FALLA: 10c %', t.reglas; end if;
  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims', '', true);
  perform nx_tick();
  if exists (select 1 from fechas where temporada_id = t.id) then raise exception 'FALLA: 10d el tick abrio una maraton'; end if;
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  f := nx_iniciar_fecha(t.id);
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values (f.id, j[1], 1, 'completado', 4000, 1);
  delete from records_jugador_juego where jugador_id = j[1];  -- el record tiene que venir de esta fecha
  perform set_config('role','authenticated',true);
  f := nx_cerrar_fecha(f.id);
  if f.estado <> 'cerrada' then raise exception 'FALLA: 10e %', f; end if;
  if not exists (select 1 from records_jugador_juego where jugador_id = j[1] and juego_id = f.juego_id and era = 'nexplay') then
    raise exception 'FALLA: 10f sin record nexplay'; end if;
  f2 := nx_iniciar_fecha(t.id);
  if f2.numero_fecha <> 2 or f2.estado <> 'abierta' then raise exception 'FALLA: 10g %', f2; end if;

  raise exception 'TEST_OK';
end $$;
