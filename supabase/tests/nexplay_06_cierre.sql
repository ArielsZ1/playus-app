-- Test de etapa 2, Task 4 (cerrar la fecha: puntos, resultados, records y fin de temporada).
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
-- Los intentos se cargan directo (como postgres): la validacion ya la cubre nexplay_05.
do $$
declare
  adm uuid; u uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  ja uuid; jb uuid; jc uuid; jd uuid; t temporadas; tp temporadas; f fechas; r record; msg text; n int;
begin
  select user_id into adm from cuentas where es_admin limit 1;
  insert into auth.users(id, email) select x, x::text || '@x.com' from unnest(u) x;
  insert into jugadores(apodo) values ('Test A') returning id into ja;
  insert into jugadores(apodo) values ('Test B') returning id into jb;
  insert into jugadores(apodo) values ('Test C') returning id into jc;
  insert into jugadores(apodo) values ('Test D') returning id into jd;
  insert into cuentas(user_id, estado, jugador_id) values (u[1],'aceptado',ja), (u[2],'aceptado',jb), (u[3],'aceptado',jc), (u[4],'aceptado',jd);

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  t := nx_crear_temporada('Test cierre', 2, false);
  perform nx_iniciar_temporada(t.id);

  -- 1 fecha 1 (bonus 0): A 4000, B 5000, C 6000, D no juega
  f := nx_iniciar_fecha(t.id);
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f.id, ja, 1, 'completado', 4000, 1), (f.id, ja, 2, 'invalido', null, 1),
    (f.id, jb, 1, 'completado', 5000, 1), (f.id, jc, 1, 'completado', 6000, 1);
  -- records previos: A ya tiene uno mejor (no empeora), B uno peor (mejora)
  insert into records_jugador_juego(jugador_id, juego_id, valor, era) values
    (ja, f.juego_id, '3.50 Segundos', 'nexplay'), (jb, f.juego_id, '6.00 Segundos', 'nexplay');
  -- solo el admin cierra
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u[1],'role','authenticated')::text, true);
  begin perform nx_cerrar_fecha(f.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%solo_admin%' then raise exception 'FALLA: 0 (%)', msg; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  f := nx_cerrar_fecha(f.id);
  if f.estado <> 'cerrada' or f.cerrada_en is null or f.sin_jugadores then raise exception 'FALLA: 1a %', f; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = ja;
  if r.rivales_superados <> 2 or r.gemas <> 30 or r.performance <> '4.00 Segundos' or not r.jugo or r.sancionado then
    raise exception 'FALLA: 1b A %', r; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = jb;
  if r.rivales_superados <> 1 or r.gemas <> 20 or r.performance <> '5.00 Segundos' then raise exception 'FALLA: 1c B %', r; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = jc;
  if r.rivales_superados <> 0 or r.gemas <> 10 then raise exception 'FALLA: 1d C %', r; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = jd;
  if r.gemas <> 0 or r.jugo or r.rivales_superados <> 0 or r.performance is not null then raise exception 'FALLA: 1e D %', r; end if;
  -- 3 records era nexplay de Count!
  select valor into msg from records_jugador_juego where jugador_id = ja and juego_id = f.juego_id and era = 'nexplay';
  if msg is distinct from '3.50 Segundos' then raise exception 'FALLA: 3a record A empeoro %', msg; end if;
  select valor into msg from records_jugador_juego where jugador_id = jb and juego_id = f.juego_id and era = 'nexplay';
  if msg is distinct from '5.00 Segundos' then raise exception 'FALLA: 3b record B no mejoro %', msg; end if;
  select valor into msg from records_jugador_juego where jugador_id = jc and juego_id = f.juego_id and era = 'nexplay';
  if msg is distinct from '6.00 Segundos' then raise exception 'FALLA: 3c record C nuevo %', msg; end if;

  -- 4 cerrar dos veces
  begin perform nx_cerrar_fecha(f.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%fecha_no_abierta%' then raise exception 'FALLA: 4 (%)', msg; end if;

  -- 2 fecha 2 (bonus 5% -> 1): empate A 4000 / B 4000, C 5000; A tambien 4500
  -- Count! ya se uso: se habilita otro juego "menor es mejor" solo dentro de esta transaccion
  perform set_config('role','postgres',true);
  update juegos set modulo = 'count'
  where id = (select id from juegos where menor_es_mejor and modulo is null limit 1);
  perform set_config('role','authenticated',true);
  f := nx_iniciar_fecha(t.id);
  if f.numero_fecha <> 2 or f.bonus_porcentaje <> 5 then raise exception 'FALLA: 2a %', f; end if;
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f.id, ja, 1, 'completado', 4500, 1), (f.id, ja, 2, 'completado', 4000, 1),
    (f.id, jb, 1, 'completado', 4000, 1), (f.id, jc, 1, 'completado', 5000, 1);
  perform set_config('role','authenticated',true);
  f := nx_cerrar_fecha(f.id);
  select * into r from resultados where fecha_id = f.id and jugador_id = ja;
  if r.rivales_superados <> 1 or r.gemas <> 21 then raise exception 'FALLA: 2b A %', r; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = jb;
  if r.rivales_superados <> 1 or r.gemas <> 21 then raise exception 'FALLA: 2c B %', r; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = jc;
  if r.rivales_superados <> 0 or r.gemas <> 11 then raise exception 'FALLA: 2d C %', r; end if;

  -- 5 era la ultima: temporada finalizada
  select * into t from temporadas where id = t.id;
  if t.estado <> 'finalizada' then raise exception 'FALLA: 5a %', t.estado; end if;
  begin perform nx_iniciar_fecha(t.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%temporada_no_activa%' then raise exception 'FALLA: 5b (%)', msg; end if;

  -- 6 y 7 temporada de prueba: sin records; el intento en curso queda interrumpido
  tp := nx_crear_temporada('Test cierre prueba', 1, true);
  perform nx_iniciar_temporada(tp.id);
  f := nx_iniciar_fecha(tp.id);
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f.id, jd, 1, 'completado', 3000, 1), (f.id, jc, 1, 'en_curso', null, 1);
  perform set_config('role','authenticated',true);
  f := nx_cerrar_fecha(f.id);
  if exists (select 1 from records_jugador_juego where jugador_id = jd) then raise exception 'FALLA: 6 record en prueba'; end if;
  select count(*) into n from intentos where fecha_id = f.id and jugador_id = jc and estado = 'interrumpido' and motivo = 'fecha_cerrada';
  if n <> 1 then raise exception 'FALLA: 7 en_curso no interrumpido'; end if;
  select * into r from resultados where fecha_id = f.id and jugador_id = jd;
  if r.rivales_superados <> 0 or r.gemas <> 10 then raise exception 'FALLA: 7b unico jugador %', r; end if;

  -- 8 auditoria
  select count(*) into n from auditoria where accion = 'cerrar_fecha' and entidad_id = f.id;
  if n <> 1 then raise exception 'FALLA: 8 auditoria %', n; end if;

  perform set_config('role','postgres',true);
  raise exception 'TEST_OK';
end $$;
