-- auditoria es de lectura publica: solo guarda user_id, estado, jugador_id, es_admin (nunca email/nombre/invitacion ni codigos).
create or replace function public.nx_crear_invitacion() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare c text; v timestamptz := now() + interval '7 days';
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  c := upper(encode(extensions.gen_random_bytes(4), 'hex'));
  insert into public.invitaciones(codigo, creada_por, expira_en) values (c, auth.uid(), v);
  insert into public.auditoria(admin_user_id, accion, entidad, despues)
  values (auth.uid(), 'crear_invitacion', 'invitaciones', jsonb_build_object('expira_en', v));
  return c;
end $$;

create or replace function public.nx_aceptar_cuenta(p_user_id uuid, p_jugador_id uuid default null, p_apodo text default null)
returns public.cuentas
language plpgsql security definer set search_path = public as $$
declare antes public.cuentas; r public.cuentas; jid uuid := p_jugador_id;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  select * into antes from public.cuentas where user_id = p_user_id;
  if not found then raise exception 'cuenta_inexistente'; end if;
  if jid is not null then
    if exists (select 1 from public.cuentas where jugador_id = jid and user_id <> p_user_id) then
      raise exception 'jugador_ya_vinculado';
    end if;
  elsif coalesce(trim(p_apodo), '') <> '' then
    insert into public.jugadores(apodo) values (trim(p_apodo)) returning id into jid;
  else
    raise exception 'falta_jugador';
  end if;
  update public.cuentas set jugador_id = jid, estado = 'aceptado'
  where user_id = p_user_id returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues)
  values (auth.uid(), 'aceptar_jugador', 'cuentas', p_user_id,
    jsonb_build_object('user_id', antes.user_id, 'estado', antes.estado, 'jugador_id', antes.jugador_id, 'es_admin', antes.es_admin),
    jsonb_build_object('user_id', r.user_id, 'estado', r.estado, 'jugador_id', r.jugador_id, 'es_admin', r.es_admin));
  return r;
end $$;

create or replace function public.nx_bloquear_cuenta(p_user_id uuid, p_motivo text) returns public.cuentas
language plpgsql security definer set search_path = public as $$
declare antes public.cuentas; r public.cuentas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  if p_user_id = auth.uid() then raise exception 'no_podes_bloquearte'; end if;
  select * into antes from public.cuentas where user_id = p_user_id;
  if not found then raise exception 'cuenta_inexistente'; end if;
  update public.cuentas set estado = 'bloqueado' where user_id = p_user_id returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues, motivo)
  values (auth.uid(), 'bloquear_jugador', 'cuentas', p_user_id,
    jsonb_build_object('user_id', antes.user_id, 'estado', antes.estado, 'jugador_id', antes.jugador_id, 'es_admin', antes.es_admin),
    jsonb_build_object('user_id', r.user_id, 'estado', r.estado, 'jugador_id', r.jugador_id, 'es_admin', r.es_admin),
    p_motivo);
  return r;
end $$;

-- Hardening: las escrituras solo pasan por las funciones security definer.
revoke insert, update, delete, truncate on public.cuentas, public.invitaciones, public.auditoria from anon, authenticated;
