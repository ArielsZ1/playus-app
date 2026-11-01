-- NEXPLAY etapa 1, Task 1: cuentas, invitaciones y auditoria (expand, aditivo).
create table public.cuentas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  jugador_id uuid unique references public.jugadores(id),
  estado text not null default 'pendiente' check (estado in ('pendiente','aceptado','bloqueado')),
  es_admin boolean not null default false,
  nombre text,
  email text,
  invitacion text,
  created_at timestamptz default now()
);

-- El codigo es reutilizable hasta que vence (7 dias).
create table public.invitaciones (
  codigo text primary key,
  creada_por uuid references auth.users(id),
  expira_en timestamptz not null,
  created_at timestamptz default now()
);

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid,
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  antes jsonb,
  despues jsonb,
  motivo text,
  created_at timestamptz default now()
);

alter table public.cuentas enable row level security;
alter table public.invitaciones enable row level security;
alter table public.auditoria enable row level security;

create function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cuentas
    where user_id = auth.uid() and es_admin and estado = 'aceptado');
$$;

create policy cuentas_select on public.cuentas for select
  using (user_id = auth.uid() or public.es_admin());
create policy invitaciones_select on public.invitaciones for select
  using (public.es_admin());
create policy auditoria_select on public.auditoria for select using (true);

create function public.nx_registrarse(p_codigo text) returns public.cuentas
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
  returning * into r;
  return r;
end $$;

create function public.nx_crear_invitacion() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare c text;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  c := upper(encode(extensions.gen_random_bytes(4), 'hex'));
  insert into public.invitaciones(codigo, creada_por, expira_en)
  values (c, auth.uid(), now() + interval '7 days');
  insert into public.auditoria(admin_user_id, accion, entidad, despues)
  values (auth.uid(), 'crear_invitacion', 'invitaciones', jsonb_build_object('codigo', c));
  return c;
end $$;

create function public.nx_aceptar_cuenta(p_user_id uuid, p_jugador_id uuid default null, p_apodo text default null)
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
  values (auth.uid(), 'aceptar_jugador', 'cuentas', p_user_id, to_jsonb(antes), to_jsonb(r));
  return r;
end $$;

create function public.nx_bloquear_cuenta(p_user_id uuid, p_motivo text) returns public.cuentas
language plpgsql security definer set search_path = public as $$
declare antes public.cuentas; r public.cuentas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  if p_user_id = auth.uid() then raise exception 'no_podes_bloquearte'; end if;
  select * into antes from public.cuentas where user_id = p_user_id;
  if not found then raise exception 'cuenta_inexistente'; end if;
  update public.cuentas set estado = 'bloqueado' where user_id = p_user_id returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues, motivo)
  values (auth.uid(), 'bloquear_jugador', 'cuentas', p_user_id, to_jsonb(antes), to_jsonb(r), p_motivo);
  return r;
end $$;

-- es_admin() queda ejecutable por anon: las politicas RLS la evaluan tambien para anon.
revoke execute on function public.nx_registrarse(text), public.nx_crear_invitacion(),
  public.nx_aceptar_cuenta(uuid, uuid, text), public.nx_bloquear_cuenta(uuid, text) from public, anon;
grant execute on function public.es_admin(), public.nx_registrarse(text), public.nx_crear_invitacion(),
  public.nx_aceptar_cuenta(uuid, uuid, text), public.nx_bloquear_cuenta(uuid, text) to authenticated;

-- Seed: el unico usuario existente es el admin.
insert into public.cuentas(user_id, estado, es_admin, nombre, email)
select id, 'aceptado', true, raw_user_meta_data->>'full_name', email from auth.users
on conflict do nothing;
