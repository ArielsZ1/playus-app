-- Test de etapa 3, Task 4 (cancelar, corregir, pausar, reanudar y excluir juegos).
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
do $$
declare
  adm uuid; u uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  j uuid[] := '{}'; jx uuid; k int; t temporadas; f fechas; f1 fechas; f2 fechas; i intentos; r record;
  msg text; n int; s text; jue uuid; jg uuid; ib uuid; ic uuid;
begin
  select user_id into adm from cuentas where es_admin limit 1;
  select id into jue from juegos where modulo = 'count' limit 1;
  insert into auth.users(id, email) select x, x::text || '@x.com' from unnest(u) x;
  for k in 1..3 loop  -- A, B, C
    insert into jugadores(apodo) values ('Test ' || k) returning id into jx;
    j := j || jx;
    insert into cuentas(user_id, estado, jugador_id) values (u[k], 'aceptado', jx);
  end loop;
  -- un segundo juego jugable, solo en esta transaccion
  select id into jg from juegos where modulo is null order by nombre limit 1;
  update juegos set modulo = 'count' where id = jg;

  -- 1 solo el admin, y con motivo
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u[1],'role','authenticated')::text, true);
  foreach s in array array['nx_cancelar_fecha(gen_random_uuid(), ''x'')', 'nx_corregir_resultado(gen_random_uuid(), 1, ''x'')',
      'nx_pausar(gen_random_uuid(), ''x'')', 'nx_reanudar(gen_random_uuid())',
      'nx_excluir_juego(gen_random_uuid(), gen_random_uuid(), true)'] loop
    begin execute 'select ' || s; msg := null; exception when others then msg := sqlerrm; end;
    if msg is null or msg not like '%solo_admin%' then raise exception 'FALLA: 1a % (%)', s, msg; end if;
  end loop;
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  foreach s in array array['nx_cancelar_fecha(gen_random_uuid(), ''  '')', 'nx_corregir_resultado(gen_random_uuid(), 1, ''  '')',
      'nx_pausar(gen_random_uuid(), ''  '')'] loop
    begin execute 'select ' || s; msg := null; exception when others then msg := sqlerrm; end;
    if msg is null or msg not like '%motivo_vacio%' then raise exception 'FALLA: 1b % (%)', s, msg; end if;
  end loop;

  -- 2 cancelar: fecha 1 cerrada, la 2 (el otro juego) se cancela con B en curso y se reabre igual
  t := nx_crear_temporada('Test e3 admin', 2, true);
  perform nx_iniciar_temporada(t.id);
  f1 := nx_iniciar_fecha(t.id);
  perform nx_cerrar_fecha(f1.id);
  f := nx_iniciar_fecha(t.id);
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, semilla) values (f.id, j[2], 1, 'en_curso', 1) returning id into ib;
  perform set_config('role','authenticated',true);
  f2 := nx_cancelar_fecha(f.id, 'se corto la luz');
  if f2.estado <> 'cancelada' or f2.cerrada_en is null then raise exception 'FALLA: 2a %', f2; end if;
  select * into i from intentos where id = ib;
  if i.estado <> 'interrumpido' or i.motivo <> 'fecha_cancelada' then raise exception 'FALLA: 2b %', i; end if;
  -- auditoria.motivo no se lee desde los clientes (migracion 01b): se mira como postgres
  perform set_config('role','postgres',true);
  select count(*) into n from auditoria where accion = 'cancelar_fecha' and entidad_id = f.id
    and motivo = 'se corto la luz' and antes->>'estado' = 'abierta' and despues->>'estado' = 'cancelada';
  if n <> 1 then raise exception 'FALLA: 2c auditoria %', n; end if;
  perform set_config('role','authenticated',true);
  if exists (select 1 from resultados where fecha_id = f.id) then raise exception 'FALLA: 2d reparte puntos'; end if;
  begin perform nx_cancelar_fecha(f.id, 'otra vez'); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%fecha_no_abierta%' then raise exception 'FALLA: 2e (%)', msg; end if;
  -- la cancelada no se juega ni acepta el intento cortado
  perform set_config('request.jwt.claims', json_build_object('sub',u[2],'role','authenticated')::text, true);
  begin perform nx_empezar_intento(f.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%fecha_no_abierta%' then raise exception 'FALLA: 2f (%)', msg; end if;
  begin perform nx_terminar_intento(ib, 3000, '{"tiempo_ms":3000,"errores":0,"penalizacion_ms":0}'); msg := null;
  exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%intento_cerrado%' then raise exception 'FALLA: 2g (%)', msg; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  f2 := nx_iniciar_fecha(t.id);
  if f2.numero_fecha <> 2 or f2.bonus_porcentaje <> 5 or f2.juego_id <> f.juego_id then raise exception 'FALLA: 2h %', f2; end if;

  -- 4 pausar y reanudar; la fecha abierta se sigue jugando
  t := nx_pausar(t.id, 'vacaciones');
  if t.estado <> 'pausada' then raise exception 'FALLA: 4a %', t.estado; end if;
  begin perform nx_pausar(t.id, 'de nuevo'); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%estado_invalido%' then raise exception 'FALLA: 4b (%)', msg; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',u[1],'role','authenticated')::text, true);
  perform nx_empezar_intento(f2.id);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  t := nx_reanudar(t.id);
  if t.estado <> 'activa' then raise exception 'FALLA: 4c %', t.estado; end if;
  begin perform nx_reanudar(t.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%estado_invalido%' then raise exception 'FALLA: 4d (%)', msg; end if;
  select count(*) into n from auditoria where entidad_id = t.id and accion in ('pausar','reanudar');
  if n <> 2 then raise exception 'FALLA: 4e auditoria %', n; end if;
  perform nx_cerrar_fecha(f2.id);  -- finaliza la temporada

  -- 3 corregir en una temporada finalizada: A 4000 gano, B 5000; B corregido a 3000 pasa a campeon
  t := nx_crear_temporada('Test e3 corregir', 1, true);
  perform nx_iniciar_temporada(t.id);
  perform set_config('role','postgres',true);
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (t.id, 1, current_date, jue, 0, 'abierta', now()) returning * into f;
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values (f.id, j[1], 1, 'completado', 4000, 1);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values (f.id, j[2], 1, 'completado', 5000, 1)
  returning id into ib;
  insert into intentos(fecha_id, jugador_id, numero, estado, motivo, semilla) values (f.id, j[3], 1, 'interrumpido', 'abandonado', 1)
  returning id into ic;
  perform set_config('role','authenticated',true);
  perform nx_cerrar_fecha(f.id);
  select * into t from temporadas where id = t.id;
  if t.estado <> 'finalizada' or t.campeones is distinct from array[j[1]] then raise exception 'FALLA: 3a %', t; end if;
  i := nx_corregir_resultado(ib, 3000, 'se midio mal');
  if i.estado <> 'completado' or i.resultado <> 3000 or i.motivo <> 'corregido' then raise exception 'FALLA: 3b %', i; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = j[2];
  if r.gemas <> 20 or r.rivales_superados <> 1 then raise exception 'FALLA: 3c B %', r; end if;
  select * into t from temporadas where id = t.id;
  if t.campeones is distinct from array[j[2]] or t.campeon_id is distinct from j[2] then raise exception 'FALLA: 3d %', t; end if;
  perform set_config('role','postgres',true);
  select count(*) into n from auditoria where accion = 'corregir_resultado' and entidad_id = ib and motivo = 'se midio mal'
    and antes->>'resultado' = '5000' and despues->>'resultado' = '3000';
  if n <> 1 then raise exception 'FALLA: 3e auditoria %', n; end if;
  perform set_config('role','authenticated',true);
  begin perform nx_corregir_resultado(ic, 3000, 'x'); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%no_corregible%' then raise exception 'FALLA: 3f (%)', msg; end if;

  -- 5 excluir Count! en preparacion: la ruleta siempre saca el otro juego
  t := nx_crear_temporada('Test e3 excluir', 3, true);
  perform nx_excluir_juego(t.id, jue, true);
  perform nx_iniciar_temporada(t.id);
  for k in 1..5 loop
    f := nx_iniciar_fecha(t.id);
    if f.juego_id <> jg or f.numero_fecha <> 1 then raise exception 'FALLA: 5a vuelta % %', k, f; end if;
    perform nx_cancelar_fecha(f.id, 'otra vuelta');
  end loop;
  begin perform nx_excluir_juego(t.id, jg, true); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%estado_invalido%' then raise exception 'FALLA: 5b (%)', msg; end if;
  select count(*) into n from auditoria where accion = 'excluir_juego' and entidad_id = t.id;
  if n <> 1 then raise exception 'FALLA: 5c auditoria %', n; end if;

  raise exception 'TEST_OK';
end $$;
