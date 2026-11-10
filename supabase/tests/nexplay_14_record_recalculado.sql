-- Test de la migracion 14: el record nexplay sigue a la correccion (baja y se borra), no solo mejora.
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
do $$
declare
  adm uuid; u uuid[] := array[gen_random_uuid(), gen_random_uuid()];
  j uuid[] := '{}'; jx uuid; k int; t temporadas; f fechas; ia uuid; v text;
begin
  select user_id into adm from cuentas where es_admin limit 1;
  insert into auth.users(id, email) select x, x::text || '@x.com' from unnest(u) x;
  for k in 1..2 loop  -- A, B
    insert into jugadores(apodo) values ('Test ' || k) returning id into jx;
    j := j || jx;
    insert into cuentas(user_id, estado, jugador_id) values (u[k], 'aceptado', jx);
  end loop;

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  -- real (no prueba) para que haya records; maraton para cerrar a mano
  t := nx_crear_temporada('Test record 14', 1, false, 'maraton');
  perform nx_iniciar_temporada(t.id);
  f := nx_iniciar_fecha(t.id);
  perform set_config('role','postgres',true);
  insert into intentos(fecha_id, jugador_id, numero, estado, semilla, resultado)
  values (f.id, j[1], 1, 'completado', 1, 3000) returning id into ia;
  insert into intentos(fecha_id, jugador_id, numero, estado, semilla, resultado)
  values (f.id, j[2], 1, 'completado', 1, 5000);
  perform set_config('role','authenticated',true);
  perform nx_cerrar_fecha(f.id);

  -- 1 al cerrar: record = la performance de la fecha
  select valor into v from records_jugador_juego where jugador_id = j[1] and juego_id = f.juego_id and era = 'nexplay';
  if v is distinct from '3.00 Segundos' then raise exception 'FALLA: 1 record al cerrar %', v; end if;

  -- 2 corregir a peor: el record baja
  perform nx_corregir_resultado(ia, 9000, 'tiempo trucho');
  select valor into v from records_jugador_juego where jugador_id = j[1] and juego_id = f.juego_id and era = 'nexplay';
  if v is distinct from '9.00 Segundos' then raise exception 'FALLA: 2 record tras corregir %', v; end if;
  select valor into v from records_jugador_juego where jugador_id = j[2] and juego_id = f.juego_id and era = 'nexplay';
  if v is distinct from '5.00 Segundos' then raise exception 'FALLA: 2b record de B %', v; end if;

  -- 3 sin ninguna performance valida: el record se borra
  perform set_config('role','postgres',true);
  update intentos set revision = 'retirada' where id = ia;
  perform nx__recalcular_fecha(f.id);
  if exists (select 1 from records_jugador_juego where jugador_id = j[1] and juego_id = f.juego_id and era = 'nexplay') then
    raise exception 'FALLA: 3 record no se borro';
  end if;

  raise exception 'TEST_OK';
end $$;
