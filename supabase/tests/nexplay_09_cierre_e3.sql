-- Test de etapa 3, Task 2 (cierre interno, resultados tardios, revancha intacta y campeon).
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
do $$
declare
  adm uuid; u uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  j uuid[] := '{}'; jx uuid; k int; t temporadas; f fechas; f2 fechas; r record; i intentos; msg text; n int;
  ic uuid; und uuid[]; tr uuid; fr uuid; jue uuid; tx uuid; fa uuid; fb uuid; camp uuid[];
begin
  select user_id into adm from cuentas where es_admin limit 1;
  select id into jue from juegos where modulo = 'count' limit 1;
  insert into auth.users(id, email) select x, x::text || '@x.com' from unnest(u) x;
  for k in 1..5 loop  -- A, B, C, D, E
    insert into jugadores(apodo) values ('Test ' || k) returning id into jx;
    j := j || jx;
    insert into cuentas(user_id, estado, jugador_id) values (u[k], 'aceptado', jx);
  end loop;

  -- 1 temporada real: el admin no la cierra a mano
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas)
  values ('Test real', true, false, 'preparacion', 1) returning id into tr;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (tr, 1, current_date, jue, 0, 'abierta', now()) returning id into fr;
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  begin perform nx_cerrar_fecha(fr); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%solo_prueba%' then raise exception 'FALLA: 1 (%)', msg; end if;
  -- los nx__ no son para clientes
  begin perform nx__recalcular_fecha(fr); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%permission denied%' then raise exception 'FALLA: 1b (%)', msg; end if;

  t := nx_crear_temporada('Test e3 cierre', 2, true);
  perform nx_iniciar_temporada(t.id);
  f := nx_iniciar_fecha(t.id);

  -- 2 y 3: A 4000; B practica 1000 + 5000; C en curso al cerrar
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f.id, j[1], 1, 'completado', 4000, 1), (f.id, j[2], 0, 'completado', 1000, 1), (f.id, j[2], 1, 'completado', 5000, 1);
  insert into intentos(fecha_id, jugador_id, numero, estado, semilla, empezado_en)
  values (f.id, j[3], 1, 'en_curso', 1, now() - interval '10 minutes') returning id into ic;
  perform set_config('role','authenticated',true);
  f := nx_cerrar_fecha(f.id);
  select * into r from resultados where fecha_id = f.id and jugador_id = j[1];
  if r.gemas <> 20 or r.rivales_superados <> 1 then raise exception 'FALLA: 2a A %', r; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = j[2];
  if r.gemas <> 10 or r.performance <> '5.00 Segundos' then raise exception 'FALLA: 2b B %', r; end if;
  select * into i from intentos where id = ic;
  if i.estado <> 'interrumpido' or i.motivo <> 'fecha_cerrada' then raise exception 'FALLA: 3 %', i; end if;
  select count(*) into n from auditoria where accion = 'cerrar_fecha' and entidad_id = f.id;
  if n <> 1 then raise exception 'FALLA: 3b auditoria %', n; end if;

  -- fecha 2 abierta con Underdog (Count! ya se uso: se habilita otro juego solo en esta transaccion)
  perform set_config('role','postgres',true);
  update juegos set modulo = 'count' where id = (select id from juegos where menor_es_mejor and modulo is null limit 1);
  perform set_config('role','authenticated',true);
  f2 := nx_iniciar_fecha(t.id);
  perform set_config('role','postgres',true);
  update fechas set underdogs = array[j[4]] where id = f2.id;

  -- 4 tardio dentro del plazo: C 3000 le gana a A y a B (A sigue superando a B)
  update fechas set cerrada_en = now() - interval '1 hour 59 minutes' where id = f.id;
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u[3],'role','authenticated')::text, true);
  i := nx_terminar_intento(ic, 3000, '{"tiempo_ms":3000,"errores":0,"penalizacion_ms":0}');
  if i.estado <> 'completado' then raise exception 'FALLA: 4a %', i; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = j[3];
  if r.rivales_superados <> 2 or r.gemas <> 30 or not r.jugo then raise exception 'FALLA: 4b C %', r; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = j[1];
  if r.rivales_superados <> 1 or r.gemas <> 20 then raise exception 'FALLA: 4c A %', r; end if;
  select underdogs into und from fechas where id = f2.id;
  if und is distinct from array[j[4]] then raise exception 'FALLA: 4d underdogs %', und; end if;

  -- 5 tardio fuera del plazo (D)
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, motivo, semilla, empezado_en)
  values (f.id, j[4], 1, 'interrumpido', 'fecha_cerrada', 1, now() - interval '3 hours') returning id into ic;
  update fechas set cerrada_en = now() - interval '2 hours 1 minute' where id = f.id;
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u[4],'role','authenticated')::text, true);
  begin perform nx_terminar_intento(ic, 3000, '{"tiempo_ms":3000,"errores":0,"penalizacion_ms":0}'); msg := null;
  exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%fuera_de_plazo%' then raise exception 'FALLA: 5 (%)', msg; end if;

  -- 6 la revancha ganada de E no se toca al recalcular
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, motivo, es_revancha, semilla)
  values (f.id, j[5], 1, 'completado', 2500, 'revancha_ganada', true, 1);
  update resultados set performance = '2.50 Segundos', rivales_superados = 2, gemas = 30, jugo = true
  where fecha_id = f.id and jugador_id = j[5];
  perform nx__recalcular_fecha(f.id);
  select * into r from resultados where fecha_id = f.id and jugador_id = j[5];
  if r.performance <> '2.50 Segundos' or r.rivales_superados <> 2 or r.gemas <> 30 or not r.jugo then
    raise exception 'FALLA: 6 E %', r; end if;

  -- 7d cerrar la ultima: A 20, B 10 + 11 = 21, C 30, E 30 (revancha). C y E: mismos puntos, 1 victoria cada uno
  -- y empataron en la unica fecha juntos -> campeonato compartido {C, E}
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values (f2.id, j[2], 1, 'completado', 4000, 1);
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  perform nx_cerrar_fecha(f2.id);
  select * into t from temporadas where id = t.id;
  if t.estado <> 'finalizada' or t.campeones is distinct from (select array_agg(x order by x) from unnest(array[j[3], j[5]]) x)
     or t.campeon_id is distinct from t.campeones[1] then raise exception 'FALLA: 7d %', t; end if;
  select count(*) into n from auditoria where accion = 'finalizar' and entidad_id = t.id;
  if n <> 1 then raise exception 'FALLA: 7e auditoria %', n; end if;

  -- 7a-c desempate con resultados cargados a mano (fechas cerradas en temporadas sueltas)
  perform set_config('role','postgres',true);
  -- 7a puntos iguales (A 40, B 40): A tiene 1 victoria, B ninguna; el mano a mano esta 1-1
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas)
  values ('Test 7a', true, true, 'finalizada', 2) returning id into tx;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, estado) values
    (tx, 1, current_date, jue, 'cerrada') returning id into fa;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, estado) values
    (tx, 2, current_date, jue, 'cerrada') returning id into fb;
  insert into resultados(fecha_id, jugador_id, rivales_superados, gemas, jugo) values
    (fa, j[1], 1, 20, true), (fa, j[2], 0, 10, true),
    (fb, j[3], 2, 15, true), (fb, j[2], 1, 30, true), (fb, j[1], 0, 20, true);
  camp := nx__campeones(tx);
  if camp is distinct from array[j[1]] then raise exception 'FALLA: 7a %', camp; end if;

  -- 7b puntos (20) y victorias (1) iguales; A le gano a B en la unica fecha juntos
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas)
  values ('Test 7b', true, true, 'finalizada', 2) returning id into tx;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, estado) values
    (tx, 1, current_date, jue, 'cerrada') returning id into fa;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, estado) values
    (tx, 2, current_date, jue, 'cerrada') returning id into fb;
  insert into resultados(fecha_id, jugador_id, rivales_superados, gemas, jugo) values
    (fa, j[1], 1, 20, true), (fa, j[2], 0, 10, true), (fb, j[2], 0, 10, true);
  camp := nx__campeones(tx);
  if camp is distinct from array[j[1]] then raise exception 'FALLA: 7b %', camp; end if;

  -- 7c empate total
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas)
  values ('Test 7c', true, true, 'finalizada', 1) returning id into tx;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, estado) values
    (tx, 1, current_date, jue, 'cerrada') returning id into fa;
  insert into resultados(fecha_id, jugador_id, rivales_superados, gemas, jugo) values
    (fa, j[1], 0, 10, true), (fa, j[2], 0, 10, true);
  camp := nx__campeones(tx);
  if camp is distinct from (select array_agg(x order by x) from unnest(array[j[1], j[2]]) x) then
    raise exception 'FALLA: 7c %', camp; end if;

  raise exception 'TEST_OK';
end $$;
