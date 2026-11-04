-- NEXPLAY etapa 3: el admin ve la auditoria con el motivo (aprobado por el usuario el 2026-11-04).
-- La columna motivo sigue cerrada para los clientes (migracion 03); solo este RPC la devuelve, y solo al admin.
create function public.nx_auditoria(p_limite int default 50) returns setof public.auditoria
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  return query select * from public.auditoria
  order by created_at desc limit least(greatest(coalesce(p_limite, 50), 1), 200);
end $$;

revoke execute on function public.nx_auditoria(int) from public, anon;
grant execute on function public.nx_auditoria(int) to authenticated;
