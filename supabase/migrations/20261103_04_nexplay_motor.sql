-- NEXPLAY etapa 2, Task 1: esquema del motor (aditivo) + RPC de temporada y fecha.
-- Las columnas van en public y en practica (npm run dev:practica lee las mismas tablas de Playus).

do $$
declare s text;
begin
  foreach s in array array['public','practica'] loop
    execute format($f$
      alter table %1$I.temporadas
        add column es_nexplay boolean not null default false,
        add column es_prueba boolean not null default false,
        add column estado text check (estado in ('preparacion','activa','pausada','finalizada')),
        add column cantidad_fechas int check (cantidad_fechas between 1 and 21),
        add column reglas jsonb,
        add column campeon_id uuid references %1$I.jugadores(id);
      alter table %1$I.fechas
        add column estado text check (estado in ('abierta','cerrada','cancelada')),
        add column abierta_en timestamptz,
        add column cerrada_en timestamptz,
        add column underdogs uuid[];
      alter table %1$I.fechas drop constraint fechas_temporada_id_numero_fecha_key;
      create unique index fechas_numero_unico on %1$I.fechas(temporada_id, numero_fecha)
        where estado is distinct from 'cancelada';
      alter table %1$I.jugadores add column es_bot boolean not null default false;
      alter table %1$I.juegos
        add column modulo text,
        add column inactividad_seg int,
        add column validacion jsonb;
      alter table %1$I.records_jugador_juego
        add column era text not null default 'playus' check (era in ('playus','nexplay'));
      -- La unique vieja (jugador_id, juego_id) queda hasta la migracion 07 (contract).
      create unique index records_era_unico on %1$I.records_jugador_juego(jugador_id, juego_id, era);
    $f$, s);
  end loop;
end $$;

update public.juegos
set modulo = 'count', validacion = '{"min_ms":2500,"penalizacion_ms":100,"tolerancia_ms":1000}'
where id = '834131a4-aa38-4a1e-b622-020c70560200';

create table public.intentos (
  id uuid primary key default gen_random_uuid(),
  fecha_id uuid not null references public.fechas(id) on delete cascade,
  jugador_id uuid not null references public.jugadores(id),
  numero int not null check (numero between 1 and 4),
  estado text not null default 'en_curso' check (estado in ('en_curso','completado','interrumpido','invalido')),
  resultado numeric,
  datos jsonb,
  semilla int not null,
  motivo text,
  empezado_en timestamptz not null default now(),
  terminado_en timestamptz,
  repeticion_de uuid references public.intentos(id),
  revision text check (revision in ('pendiente','mantenida','retirada')),
  revision_motivo text,
  unique (fecha_id, jugador_id, numero)
);
alter table public.intentos enable row level security;
create policy intentos_select on public.intentos for select using (true);

create function public.nx_crear_temporada(p_nombre text, p_cantidad_fechas int, p_es_prueba boolean default false)
returns public.temporadas
language plpgsql security definer set search_path = public as $$
declare r public.temporadas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'nombre_vacio'; end if;
  if p_cantidad_fechas is null or p_cantidad_fechas not between 1 and 21 then raise exception 'cantidad_invalida'; end if;
  insert into public.temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas)
  values (trim(p_nombre), true, coalesce(p_es_prueba, false), 'preparacion', p_cantidad_fechas)
  returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
  values (auth.uid(), 'crear_temporada', 'temporadas', r.id, to_jsonb(r));
  return r;
end $$;

create function public.nx_iniciar_temporada(p_temporada_id uuid) returns public.temporadas
language plpgsql security definer set search_path = public as $$
declare antes public.temporadas; r public.temporadas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  select * into antes from public.temporadas where id = p_temporada_id and es_nexplay for update;
  if not found or antes.estado <> 'preparacion' then raise exception 'no_en_preparacion'; end if;
  if exists (select 1 from public.temporadas
             where es_nexplay and estado in ('activa','pausada') and id <> p_temporada_id) then
    raise exception 'ya_hay_temporada_activa';
  end if;
  update public.temporadas
  set estado = 'activa',
      reglas = '{"intentos":3,"intentos_underdog":4,"base":10,"por_rival":10,"bonus_pct_por_fecha":5,"tope_repeticiones":1}'
  where id = p_temporada_id returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues)
  values (auth.uid(), 'iniciar_temporada', 'temporadas', r.id, to_jsonb(antes), to_jsonb(r));
  return r;
end $$;

create function public.nx_iniciar_fecha(p_temporada_id uuid) returns public.fechas
language plpgsql security definer set search_path = public as $$
declare t public.temporadas; n int; jid uuid; r public.fechas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  -- for update: dos clics seguidos no abren dos fechas
  select * into t from public.temporadas where id = p_temporada_id and es_nexplay for update;
  if not found or t.estado <> 'activa' then raise exception 'temporada_no_activa'; end if;
  if exists (select 1 from public.fechas where temporada_id = t.id and estado = 'abierta') then
    raise exception 'ya_hay_fecha_abierta';
  end if;
  select count(*) + 1 into n from public.fechas where temporada_id = t.id and estado = 'cerrada';
  if n > t.cantidad_fechas then raise exception 'temporada_completa'; end if;
  select j.id into jid from public.juegos j
  where j.modulo is not null
    and not exists (select 1 from public.fechas f
                    where f.temporada_id = t.id and f.juego_id = j.id and f.estado in ('abierta','cerrada'))
  order by random() limit 1;
  if jid is null then raise exception 'sin_juegos_elegibles'; end if;
  insert into public.fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado, abierta_en)
  values (t.id, n, current_date, jid, 5 * (n - 1), 'abierta', now())
  returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
  values (auth.uid(), 'iniciar_fecha', 'fechas', r.id, to_jsonb(r));
  return r;
end $$;

revoke execute on function public.nx_crear_temporada(text, int, boolean), public.nx_iniciar_temporada(uuid),
  public.nx_iniciar_fecha(uuid) from public, anon;
grant execute on function public.nx_crear_temporada(text, int, boolean), public.nx_iniciar_temporada(uuid),
  public.nx_iniciar_fecha(uuid) to authenticated;
