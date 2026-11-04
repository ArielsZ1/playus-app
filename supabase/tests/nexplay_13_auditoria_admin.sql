-- Test de la auditoria del admin: el admin ve el motivo; un jugador no; anon no puede llamarla.
-- Un solo bloque DO que termina con raise exception 'TEST_OK': nada queda en la base.
do $$
declare adm uuid; u uuid := gen_random_uuid(); jx uuid; msg text; n int;
begin
  select user_id into adm from cuentas where es_admin limit 1;
  insert into auth.users(id, email) values (u, u::text || '@x.com');
  insert into jugadores(apodo) values ('Test 1') returning id into jx;
  insert into cuentas(user_id, estado, jugador_id) values (u, 'aceptado', jx);
  insert into auditoria(admin_user_id, accion, entidad, motivo) values (adm, 'test_auditoria', 'test', 'motivo de prueba');

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  select count(*) into n from nx_auditoria(5) where accion = 'test_auditoria' and motivo = 'motivo de prueba';
  if n <> 1 then raise exception 'FALLA: 1 admin no ve el motivo'; end if;
  select count(*) into n from nx_auditoria(0);
  if n <> 1 then raise exception 'FALLA: 2 limite minimo %', n; end if;

  perform set_config('request.jwt.claims', json_build_object('sub',u,'role','authenticated')::text, true);
  begin perform nx_auditoria(5); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%solo_admin%' then raise exception 'FALLA: 3 jugador (%)', msg; end if;

  perform set_config('role','anon',true);
  perform set_config('request.jwt.claims', '{}', true);
  begin perform nx_auditoria(5); msg := null; exception when others then msg := sqlerrm; end;
  if msg is null or msg not like '%permission denied%' then raise exception 'FALLA: 4 anon (%)', msg; end if;

  perform set_config('role','postgres',true);
  raise exception 'TEST_OK';
end $$;
