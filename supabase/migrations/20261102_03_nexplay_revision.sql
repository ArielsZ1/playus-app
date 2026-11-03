-- Revisión de la etapa 1.
-- 1) auditoria es pública pero `motivo` es texto libre del admin (motivo de bloqueo): no se lee desde la API.
revoke select on public.auditoria from anon, authenticated;
grant select (id, admin_user_id, accion, entidad, entidad_id, antes, despues, created_at)
  on public.auditoria to anon, authenticated;

-- 2) nx_registrarse: dos llamadas a la vez (dos pestañas) no deben chocar por la clave de cuentas.
create or replace function public.nx_registrarse(p_codigo text) returns public.cuentas
language plpgsql security definer set search_path = public as $$
declare r public.cuentas;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  select * into r from public.cuentas where user_id = auth.uid();
  if found then return r; end if;
  if not exists (select 1 from public.invitaciones where codigo = p_codigo and expira_en > now()) then
    raise exception 'codigo_invalido';
  end if;
  insert into public.cuentas(user_id, nombre, email, invitacion)
  select u.id, u.raw_user_meta_data->>'full_name', u.email, p_codigo
  from auth.users u where u.id = auth.uid()
  on conflict (user_id) do nothing;
  select * into r from public.cuentas where user_id = auth.uid();
  return r;
end $$;
