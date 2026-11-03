-- Test de Task 2 (solo el admin escribe). Un solo bloque DO que termina en
-- raise exception 'TEST_OK' para que nada quede en la base.
-- Exito = el error es exactamente TEST_OK. Cualquier 'FALLA: ...' = fallo.
do $$
declare
  adm uuid; u1 uuid := gen_random_uuid(); st text; n int; rid bigint;
begin
  select user_id into adm from public.cuentas where es_admin limit 1;
  insert into auth.users(id, email) values (u1, 'test_esc@x.com');

  -- 1 usuario comun autenticado (no admin): no puede escribir
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',u1,'role','authenticated')::text, true);
  begin insert into public.jugadores(apodo) values ('hack'); st := null; exception when others then st := sqlstate; end;
  if st is distinct from '42501' then raise exception 'FALLA: 1a insert public.jugadores (%)', st; end if;
  begin insert into practica.jugadores(apodo) values ('hack'); st := null; exception when others then st := sqlstate; end;
  if st is distinct from '42501' then raise exception 'FALLA: 1b insert practica.jugadores (%)', st; end if;
  update public.resultados set gemas = 999;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLA: 1c update public.resultados filas %', n; end if;
  update practica.resultados set gemas = 999;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLA: 1d update practica.resultados filas %', n; end if;

  -- 2 admin: inserta y actualiza
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  insert into public.jugadores(apodo) values ('ok_admin');
  update public.resultados set nota = nota where id = (select id from public.resultados limit 1);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALLA: 2b update admin filas %', n; end if;

  -- 3 anon sigue leyendo
  perform set_config('role','anon',true);
  perform set_config('request.jwt.claims','{}',true);
  select count(*) into n from public.fechas;
  if n = 0 then raise exception 'FALLA: 3 lectura anon fechas %', n; end if;

  perform set_config('role','postgres',true);
  raise exception 'TEST_OK';
end $$;
