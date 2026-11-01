-- Test de Task 1 (cuentas). Corre todo en un solo bloque DO y termina con
-- raise exception 'TEST_OK' para que nada quede en la base.
-- Exito = el error es exactamente TEST_OK. Cualquier 'FALLA: ...' = fallo.
do $$
declare
  adm uuid; u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
  jx uuid; st text; cod text; cod_venc text := 'VENCIDO1'; msg text; r cuentas; n int; b boolean;
begin
  select user_id into adm from cuentas where es_admin limit 1;
  select id into jx from jugadores limit 1;
  insert into auth.users(id, email, raw_user_meta_data) values
    (u1, 'test1@x.com', '{"full_name":"Test Uno"}'), (u2, 'test2@x.com', '{"full_name":"Test Dos"}');
  insert into invitaciones(codigo, creada_por, expira_en) values (cod_venc, adm, now() - interval '1 day');

  -- 1 admin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  if not es_admin() then raise exception 'FALLA: 1 es_admin del admin'; end if;

  -- 2 y 3 codigos invalidos
  perform set_config('request.jwt.claims', json_build_object('sub',u1,'role','authenticated')::text, true);
  begin perform nx_registrarse('NOEXISTE'); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%codigo_invalido%' then raise exception 'FALLA: 2 (%)', msg; end if;
  begin perform nx_registrarse(cod_venc); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%codigo_invalido%' then raise exception 'FALLA: 3 (%)', msg; end if;

  -- 5 usuario comun
  begin perform nx_crear_invitacion(); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%solo_admin%' then raise exception 'FALLA: 5a (%)', msg; end if;
  if es_admin() then raise exception 'FALLA: 5b es_admin de u1'; end if;

  -- 4 invitacion y registro
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  cod := nx_crear_invitacion();
  if length(cod) <> 8 then raise exception 'FALLA: 4a largo %', cod; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',u1,'role','authenticated')::text, true);
  r := nx_registrarse(cod);
  if r.estado <> 'pendiente' or r.nombre <> 'Test Uno' or r.invitacion <> cod then raise exception 'FALLA: 4b %', r; end if;
  if (select created_at from nx_registrarse(cod)) <> r.created_at then raise exception 'FALLA: 4c'; end if;
  select count(*) into n from cuentas where user_id = u1;
  if n <> 1 then raise exception 'FALLA: 4d count %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',u2,'role','authenticated')::text, true);
  perform nx_registrarse(cod);

  -- 6 aceptar y vinculo duplicado
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  r := nx_aceptar_cuenta(u1, jx);
  if r.estado <> 'aceptado' or r.jugador_id <> jx then raise exception 'FALLA: 6a %', r; end if;
  begin perform nx_aceptar_cuenta(u2, jx); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%jugador_ya_vinculado%' then raise exception 'FALLA: 6b (%)', msg; end if;

  -- 7 falta_jugador y crear jugador
  begin perform nx_aceptar_cuenta(u2); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%falta_jugador%' then raise exception 'FALLA: 7a (%)', msg; end if;
  r := nx_aceptar_cuenta(u2, null, 'Nuevo');
  if not exists (select 1 from jugadores where id = r.jugador_id and apodo = 'Nuevo') then raise exception 'FALLA: 7b'; end if;

  -- 8 bloqueo y auditoria
  begin perform nx_bloquear_cuenta(adm, 'x'); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%no_podes_bloquearte%' then raise exception 'FALLA: 8a (%)', msg; end if;
  r := nx_bloquear_cuenta(u2, 'prueba');
  if r.estado <> 'bloqueado' then raise exception 'FALLA: 8b %', r; end if;
  if not exists (select 1 from auditoria where accion='aceptar_jugador' and antes is not null and despues is not null)
     or not exists (select 1 from auditoria where accion='bloquear_jugador') then raise exception 'FALLA: 8c auditoria'; end if;

  -- 9 RLS
  perform set_config('request.jwt.claims', json_build_object('sub',u1,'role','authenticated')::text, true);
  -- 9a escritura directa denegada por privilegios (42501), no por FK
  begin insert into cuentas(user_id) values (u1); st := null; exception when others then st := sqlstate; end;
  if st is distinct from '42501' then raise exception 'FALLA: 9a insert directo (%)', st; end if;
  -- 9c auto-promocion: error 42501 o 0 filas, y sigue sin ser admin
  begin
    update cuentas set es_admin = true, estado = 'aceptado' where user_id = u1;
    get diagnostics n = row_count; st := case when n = 0 then '42501' else 'FILAS' end;
  exception when others then st := sqlstate; end;
  if st is distinct from '42501' then raise exception 'FALLA: 9c update directo (%)', st; end if;
  if es_admin() then raise exception 'FALLA: 9c u1 se hizo admin'; end if;
  select count(*) into n from invitaciones;
  if n <> 0 then raise exception 'FALLA: 9b invitaciones visibles %', n; end if;

  -- 10 anon no ve datos personales ni codigos en auditoria
  perform set_config('role','anon',true);
  perform set_config('request.jwt.claims','{}',true);
  select count(*) into n from auditoria;
  if n < 3 then raise exception 'FALLA: 10a auditoria vacia %', n; end if;
  if exists (select 1 from auditoria a where a.antes::text ~ 'email|nombre|invitacion' or a.despues::text ~ 'email|nombre|invitacion'
             or a.despues::text like '%'||cod||'%' or a.antes::text like '%'||cod||'%') then
    raise exception 'FALLA: 10b auditoria filtra datos'; end if;

  perform set_config('role','postgres',true);
  raise exception 'TEST_OK';
end $$;
