-- Test de etapa 2, Task 1 (esquema del motor + RPC de temporada y fecha).
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
-- Exito = el error es exactamente TEST_OK. Cualquier 'FALLA: ...' = fallo.
do $$
declare
  adm uuid; u1 uuid := gen_random_uuid();
  tp uuid; t1 temporadas; t2 temporadas; f fechas; msg text; n0 int; n int;
  count_id uuid := '834131a4-aa38-4a1e-b622-020c70560200';
begin
  select user_id into adm from cuentas where es_admin limit 1;
  insert into auth.users(id, email, raw_user_meta_data) values (u1, 'test1@x.com', '{"full_name":"Test Uno"}');
  insert into cuentas(user_id, estado) values (u1, 'aceptado');
  select count(*) into n0 from auditoria;

  -- 7 indice parcial: el numero de una cancelada se puede reutilizar, el de una abierta no
  insert into temporadas(nombre) values ('T7') returning id into tp;
  insert into fechas(temporada_id, numero_fecha, juego_id, estado) values (tp, 1, count_id, 'cancelada');
  insert into fechas(temporada_id, numero_fecha, juego_id) values (tp, 1, count_id);
  insert into fechas(temporada_id, numero_fecha, juego_id, estado) values (tp, 2, count_id, 'abierta');
  begin
    insert into fechas(temporada_id, numero_fecha, juego_id) values (tp, 2, count_id); msg := null;
  exception when unique_violation then msg := 'unique';
  end;
  if msg is distinct from 'unique' then raise exception 'FALLA: 7 numero repetido aceptado'; end if;
  delete from fechas where temporada_id = tp;
  delete from temporadas where id = tp;

  perform set_config('role','authenticated',true);

  -- 1 no admin
  perform set_config('request.jwt.claims', json_build_object('sub',u1,'role','authenticated')::text, true);
  begin perform nx_crear_temporada('X', 1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%solo_admin%' then raise exception 'FALLA: 1 (%)', msg; end if;

  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  -- 2 validaciones
  begin perform nx_crear_temporada('  ', 1); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%nombre_vacio%' then raise exception 'FALLA: 2a (%)', msg; end if;
  begin perform nx_crear_temporada('T', 22); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%cantidad_invalida%' then raise exception 'FALLA: 2b (%)', msg; end if;
  begin perform nx_crear_temporada('T', 0); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%cantidad_invalida%' then raise exception 'FALLA: 2c (%)', msg; end if;

  -- 3 crear en preparacion
  t1 := nx_crear_temporada('Test motor', 1, true);
  if not t1.es_nexplay or not t1.es_prueba or t1.estado <> 'preparacion' or t1.cantidad_fechas <> 1 then
    raise exception 'FALLA: 3a %', t1; end if;
  begin perform nx_iniciar_fecha(t1.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%temporada_no_activa%' then raise exception 'FALLA: 3b (%)', msg; end if;

  -- 4 iniciar temporada
  t1 := nx_iniciar_temporada(t1.id);
  if t1.estado <> 'activa' or t1.reglas->>'intentos' <> '3' then raise exception 'FALLA: 4a %', t1; end if;
  begin perform nx_iniciar_temporada(t1.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%no_en_preparacion%' then raise exception 'FALLA: 4b (%)', msg; end if;
  t2 := nx_crear_temporada('Otra', 2);
  begin perform nx_iniciar_temporada(t2.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%ya_hay_temporada_activa%' then raise exception 'FALLA: 4c (%)', msg; end if;

  -- 5 iniciar fecha
  f := nx_iniciar_fecha(t1.id);
  if f.numero_fecha <> 1 or f.bonus_porcentaje <> 0 or f.estado <> 'abierta' or f.juego_id <> count_id
     or f.abierta_en is null then raise exception 'FALLA: 5a %', f; end if;
  begin perform nx_iniciar_fecha(t1.id); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%ya_hay_fecha_abierta%' then raise exception 'FALLA: 5b (%)', msg; end if;

  -- 6 auditoria (crear x2, iniciar temporada, iniciar fecha)
  select count(*) into n from auditoria;
  if n - n0 <> 4 then raise exception 'FALLA: 6 auditoria nuevas %', n - n0; end if;

  -- 8 escritura directa de intentos denegada
  begin
    insert into intentos(fecha_id, jugador_id, numero, semilla)
    values (f.id, (select id from jugadores limit 1), 1, 1); msg := null;
  exception when others then msg := sqlstate; end;
  if msg is distinct from '42501' then raise exception 'FALLA: 8 insert intentos (%)', msg; end if;

  raise exception 'TEST_OK';
end $$;
