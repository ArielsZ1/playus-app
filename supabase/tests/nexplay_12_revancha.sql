-- Test de etapa 3, Task 5 (revancha).
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
do $$
declare
  adm uuid; u uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  j uuid[] := '{}'; jx uuid; k int; jue uuid; tid uuid; f1 uuid; f2 uuid; fu uuid; fs uuid; fm uuid;
  r record; i intentos; msg text; n int; mr jsonb; ic uuid; ie uuid;
  ok constant text := '{"tiempo_ms":%s,"errores":0,"penalizacion_ms":0}';
begin
  select user_id into adm from cuentas where es_admin limit 1;
  select id into jue from juegos where modulo = 'count' limit 1;
  insert into auth.users(id, email) select x, x::text || '@x.com' from unnest(u) x;
  for k in 1..5 loop  -- A, B, C, D, E
    insert into jugadores(apodo) values ('Test ' || k) returning id into jx;
    j := j || jx;
    insert into cuentas(user_id, estado, jugador_id) values (u[k], 'aceptado', jx);
  end loop;

  -- temporada de prueba de 2 fechas: en la 1, A 4000 y B 5000; C, D y E no juegan (|P| = 2, bonus 0)
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas, reglas)
  values ('Test revancha', true, true, 'activa', 2, '{"ritmo":"diario"}') returning id into tid;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (tid, 1, current_date, jue, 0, 'abierta', now()) returning id into f1;
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values
    (f1, j[1], 1, 'completado', 4000, 1), (f1, j[2], 1, 'completado', 5000, 1);
  -- casos borde: la ultima fecha (1 de 1), una sin jugadores y una de ritmo maraton
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas, reglas)
  values ('Test rev ultima', true, true, 'activa', 1, '{}') returning id into jx;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (jx, 1, current_date, jue, 0, 'abierta', now()) returning id into fu;
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values (fu, j[1], 1, 'completado', 4000, 1);
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas, reglas)
  values ('Test rev vacia', true, true, 'activa', 2, '{}') returning id into jx;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (jx, 1, current_date, jue, 0, 'abierta', now()) returning id into fs;
  insert into temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas, reglas)
  values ('Test rev maraton', true, true, 'activa', 2, '{"ritmo":"maraton"}') returning id into jx;
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (jx, 1, current_date, jue, 0, 'abierta', now()) returning id into fm;
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, semilla) values (fm, j[1], 1, 'completado', 4000, 1);

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  perform nx_cerrar_fecha(f1); perform nx_cerrar_fecha(fu); perform nx_cerrar_fecha(fs); perform nx_cerrar_fecha(fm);
  if not (select sin_jugadores from fechas where id = fs) then raise exception 'FALLA: 0 sin_jugadores'; end if;

  -- 1 sin_revancha: B jugo; C en la ultima, en la vacia, en la maraton y pasadas las 24 h
  perform set_config('request.jwt.claims', json_build_object('sub',u[2],'role','authenticated')::text, true);
  begin perform nx_empezar_revancha(f1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 1a jugo (%)', msg; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',u[3],'role','authenticated')::text, true);
  begin perform nx_empezar_revancha(fu); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 1b ultima (%)', msg; end if;
  begin perform nx_empezar_revancha(fs); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 1c vacia (%)', msg; end if;
  begin perform nx_empezar_revancha(fm); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 1d maraton (%)', msg; end if;
  perform set_config('role','postgres',true);
  update fechas set cerrada_en = now() - interval '24 hours 1 minute' where id = f1;
  perform set_config('role','authenticated',true);
  begin perform nx_empezar_revancha(f1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 1e 24 h (%)', msg; end if;
  -- otras fechas reales pueden tener revancha para estos jugadores: solo importa que no sea f1
  if coalesce(nx_mi_revancha()->>'fecha_id', '') = f1::text then raise exception 'FALLA: 1f mi_revancha pasadas 24 h'; end if;
  perform set_config('role','postgres',true);
  update fechas set cerrada_en = now() where id = f1;

  -- 2 C 3500 gana: mismos rivales y puntos que A, los dos quedan 1.os
  perform set_config('role','authenticated',true);
  select * into r from nx_empezar_revancha(f1);
  if r.numero <> 1 or r.modulo <> 'count' or r.semilla is null then raise exception 'FALLA: 2a %', r; end if;
  ic := r.intento_id;
  begin perform nx_empezar_revancha(f1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 2b segunda (%)', msg; end if;
  perform set_config('role','postgres',true);
  update intentos set empezado_en = now() - interval '10 minutes' where id = ic;
  perform set_config('role','authenticated',true);
  i := nx_terminar_intento(ic, 3500, format(ok, 3500)::jsonb);
  if i.estado <> 'completado' or i.motivo <> 'revancha_ganada' or not i.es_revancha then raise exception 'FALLA: 2c %', i; end if;
  select * into r from resultados where fecha_id = f1 and jugador_id = j[3];
  if r.rivales_superados <> 1 or r.gemas <> 20 or not r.jugo or r.performance <> '3.50 Segundos' then
    raise exception 'FALLA: 2d C %', r; end if;
  select * into r from resultados where fecha_id = f1 and jugador_id = j[1];
  if r.rivales_superados <> 1 or r.gemas <> 20 then raise exception 'FALLA: 2e A %', r; end if;
  select * into r from resultados where fecha_id = f1 and jugador_id = j[2];
  if r.rivales_superados <> 0 or r.gemas <> 10 then raise exception 'FALLA: 2f B %', r; end if;
  -- puestoEnFecha: nadie con mas rivales, o los mismos y mas gemas, que A y que C
  select count(*) into n from resultados x where x.fecha_id = f1 and x.jugador_id in (j[1], j[3]) and not exists (
    select 1 from resultados o where o.fecha_id = f1 and o.jugo
      and (o.rivales_superados, o.gemas) > (x.rivales_superados, x.gemas));
  if n <> 2 then raise exception 'FALLA: 2g puesto 1 %', n; end if;
  begin perform nx_empezar_revancha(f1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 2h despues (%)', msg; end if;
  begin perform nx_terminar_intento(ic, 3000, format(ok, 3000)::jsonb); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%intento_cerrado%' then raise exception 'FALLA: 2i (%)', msg; end if;
  perform set_config('role','postgres',true);
  select count(*) into n from auditoria where accion = 'auto_revancha_ganada' and entidad_id = ic and admin_user_id is null;
  if n <> 1 then raise exception 'FALLA: 2j auditoria %', n; end if;

  -- 4 nx_mi_revancha de D: a superar 3500 (la de C cuenta)
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u[4],'role','authenticated')::text, true);
  mr := nx_mi_revancha();
  if mr is null or (mr->>'fecha_id')::uuid <> f1 or (mr->>'a_superar')::numeric <> 3500 or (mr->>'numero_fecha')::int <> 1
     or (mr->>'termina_en')::timestamptz <> now() + interval '24 hours' or mr->>'juego' is null then
    raise exception 'FALLA: 4a %', mr; end if;

  -- 3 D 3600 pierde (le hubiera ganado a A, no a C): su fila queda jugo = false
  select * into r from nx_empezar_revancha(f1);
  ic := r.intento_id;
  if coalesce(nx_mi_revancha()->>'fecha_id', '') = f1::text then raise exception 'FALLA: 4b mi_revancha en curso'; end if;
  perform set_config('role','postgres',true);
  update intentos set empezado_en = now() - interval '10 minutes' where id = ic;
  perform set_config('role','authenticated',true);
  i := nx_terminar_intento(ic, 3600, format(ok, 3600)::jsonb);
  if i.estado <> 'completado' or i.motivo <> 'revancha_perdida' then raise exception 'FALLA: 3a %', i; end if;
  select * into r from resultados where fecha_id = f1 and jugador_id = j[4];
  if r.jugo or r.gemas <> 0 or r.performance is not null then raise exception 'FALLA: 3b D %', r; end if;
  if coalesce(nx_mi_revancha()->>'fecha_id', '') = f1::text then raise exception 'FALLA: 4c mi_revancha usada'; end if;

  -- 5 E: la revancha en curso no se cruza con la fecha 2 abierta, y fuera de las 24 h no cuenta
  perform set_config('request.jwt.claims', json_build_object('sub',u[5],'role','authenticated')::text, true);
  select * into r from nx_empezar_revancha(f1);
  ie := r.intento_id;
  perform set_config('role','postgres',true);
  insert into fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (tid, 2, current_date, jue, 5, 'abierta', now()) returning id into f2;
  perform set_config('role','authenticated',true);
  select * into r from nx_empezar_intento(f2);
  if r.numero <> 1 then raise exception 'FALLA: 5a %', r; end if;
  select * into r from nx_empezar_intento(f2);  -- colchon en la 2
  if r.numero <> 1 then raise exception 'FALLA: 5b %', r; end if;
  select * into i from intentos where id = ie;
  if i.estado <> 'en_curso' then raise exception 'FALLA: 5c revancha tocada %', i; end if;
  mr := nx_mi_fecha(f1);
  if (mr->>'usados')::int <> 0 or (mr->>'colchon_usado')::boolean or mr->>'practica' <> 'disponible' then
    raise exception 'FALLA: 5d mi_fecha %', mr; end if;
  perform set_config('role','postgres',true);
  update intentos set empezado_en = now() - interval '25 hours' where id = ie;
  update fechas set cerrada_en = now() - interval '24 hours 1 minute' where id = f1;
  perform set_config('role','authenticated',true);
  begin perform nx_terminar_intento(ie, 3000, format(ok, 3000)::jsonb); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%fuera_de_plazo%' then raise exception 'FALLA: 5e (%)', msg; end if;

  -- 6 regla del usuario: un unico intento cortado por el cierre da revancha; dos intentos, o uno terminado, no
  perform set_config('role','postgres',true);
  update fechas set cerrada_en = now() where id = f1;
  delete from intentos where fecha_id = f1 and jugador_id in (j[3], j[4], j[5]) and es_revancha;
  delete from resultados where fecha_id = f1 and jugador_id = j[3];
  insert into intentos(fecha_id, jugador_id, numero, estado, motivo, semilla) values
    (f1, j[3], 1, 'interrumpido', 'fecha_cerrada', 1) returning id into ic;  -- C: un solo intento cortado
  insert into intentos(fecha_id, jugador_id, numero, estado, motivo, semilla) values
    (f1, j[4], 1, 'interrumpido', 'colchon', 1), (f1, j[4], 1, 'interrumpido', 'fecha_cerrada', 1);  -- D: dos
  insert into intentos(fecha_id, jugador_id, numero, estado, resultado, motivo, semilla) values
    (f1, j[5], 1, 'invalido', null, 'demasiado_rapido', 1);  -- E: uno terminado (invalido)
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u[4],'role','authenticated')::text, true);
  begin perform nx_empezar_revancha(f1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 6a dos intentos (%)', msg; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',u[5],'role','authenticated')::text, true);
  begin perform nx_empezar_revancha(f1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 6b terminado (%)', msg; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',u[3],'role','authenticated')::text, true);
  if (nx_mi_revancha()->>'fecha_id')::uuid is distinct from f1 then raise exception 'FALLA: 6c mi_revancha cortado'; end if;
  select * into r from nx_empezar_revancha(f1);
  if r.numero <> 1 then raise exception 'FALLA: 6d %', r; end if;
  -- ya en revancha, el intento cortado no se sube tarde aunque este dentro de las 2 h
  begin perform nx_terminar_intento(ic, 3000, format(ok, 3000)::jsonb); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%intento_cerrado%' then raise exception 'FALLA: 6e (%)', msg; end if;
  begin perform nx_empezar_revancha(f1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%sin_revancha%' then raise exception 'FALLA: 6f segunda (%)', msg; end if;

  raise exception 'TEST_OK';
end $$;
