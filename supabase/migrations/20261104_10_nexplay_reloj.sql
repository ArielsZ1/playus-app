-- NEXPLAY etapa 3, Task 3: apertura interna con Underdog, ritmo por temporada (diario o maraton)
-- y reloj diario con pg_cron (spec etapa 3, 3.1 y 3.7, E12).

-- Ritmo al crear: 'diario' (lo mueve el tick) o 'maraton' (el admin abre y cierra a mano).
drop function public.nx_crear_temporada(text, int, boolean);
create function public.nx_crear_temporada(p_nombre text, p_cantidad_fechas int, p_es_prueba boolean default false,
  p_ritmo text default 'diario')
returns public.temporadas
language plpgsql security definer set search_path = public as $$
declare r public.temporadas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'nombre_vacio'; end if;
  if p_cantidad_fechas is null or p_cantidad_fechas not between 1 and 21 then raise exception 'cantidad_invalida'; end if;
  if coalesce(p_ritmo, '') not in ('diario', 'maraton') then raise exception 'ritmo_invalido'; end if;
  insert into public.temporadas(nombre, es_nexplay, es_prueba, estado, cantidad_fechas, reglas)
  values (trim(p_nombre), true, coalesce(p_es_prueba, false), 'preparacion', p_cantidad_fechas,
          jsonb_build_object('ritmo', p_ritmo))
  returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
  values (auth.uid(), 'crear_temporada', 'temporadas', r.id, to_jsonb(r));
  return r;
end $$;

revoke execute on function public.nx_crear_temporada(text, int, boolean, text) from public, anon;
grant execute on function public.nx_crear_temporada(text, int, boolean, text) to authenticated;

-- nx_iniciar_temporada (04): las reglas fijas se suman a las de la creacion, asi no se pierde el ritmo.
create or replace function public.nx_iniciar_temporada(p_temporada_id uuid) returns public.temporadas
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
      reglas = '{"intentos":3,"intentos_underdog":4,"base":10,"por_rival":10,"bonus_pct_por_fecha":5,"tope_repeticiones":1}'::jsonb
               || coalesce(reglas, '{}')
  where id = p_temporada_id returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues)
  values (auth.uid(), 'iniciar_temporada', 'temporadas', r.id, to_jsonb(antes), to_jsonb(r));
  return r;
end $$;

-- Apertura sin chequeo de permisos (la llaman el tick y nx_iniciar_fecha). Devuelve null si no hay juego:
-- en ese caso la temporada queda pausada para que el admin decida.
create function public.nx__abrir_fecha(p_temporada_id uuid) returns public.fechas
language plpgsql security definer set search_path = public as $$
declare t public.temporadas; n int; jid uuid; und uuid[]; r public.fechas;
  pre text := case when auth.uid() is null then 'auto_' else '' end;
begin
  select * into t from public.temporadas where id = p_temporada_id for update;
  select count(*) + 1 into n from public.fechas where temporada_id = t.id and estado = 'cerrada';
  select j.id into jid from public.juegos j
  where j.modulo is not null
    and not exists (select 1 from public.fechas f
                    where f.temporada_id = t.id and f.juego_id = j.id and f.estado in ('abierta','cerrada'))
  order by random() limit 1;
  if jid is null then
    update public.temporadas set estado = 'pausada' where id = t.id;
    insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
    values (auth.uid(), pre || 'sin_juegos', 'temporadas', t.id, jsonb_build_object('numero_fecha', n));
    return null;
  end if;
  -- Underdog: menor total de gemas en fechas cerradas (0 si no jugo ninguna); con empate entran todos
  if n >= 2 then
    with tot as (
      select c.jugador_id, coalesce((select sum(re.gemas) from public.resultados re
                                     join public.fechas fe on fe.id = re.fecha_id
                                     where fe.temporada_id = t.id and fe.estado = 'cerrada'
                                       and re.jugador_id = c.jugador_id), 0) as g
      from public.cuentas c where c.estado = 'aceptado' and c.jugador_id is not null
    )
    select array_agg(jugador_id order by jugador_id) into und from tot where g = (select min(g) from tot);
  end if;
  insert into public.fechas(temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, estado,
                            abierta_en, underdogs)
  values (t.id, n, current_date, jid, 5 * (n - 1), 'abierta', now(), und)
  returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
  values (auth.uid(), pre || 'iniciar_fecha', 'fechas', r.id, to_jsonb(r));
  return r;
end $$;

revoke execute on function public.nx__abrir_fecha(uuid) from public, anon, authenticated;

-- El admin abre y cierra a mano solo las temporadas de prueba o maraton; las diarias reales las mueve el tick.
create or replace function public.nx_iniciar_fecha(p_temporada_id uuid) returns public.fechas
language plpgsql security definer set search_path = public as $$
declare t public.temporadas; r public.fechas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  -- for update: dos clics seguidos no abren dos fechas
  select * into t from public.temporadas where id = p_temporada_id and es_nexplay for update;
  if found and not t.es_prueba and coalesce(t.reglas->>'ritmo', 'diario') = 'diario' then
    raise exception 'ritmo_diario';
  end if;
  if not found or t.estado <> 'activa' then raise exception 'temporada_no_activa'; end if;
  if exists (select 1 from public.fechas where temporada_id = t.id and estado = 'abierta') then
    raise exception 'ya_hay_fecha_abierta';
  end if;
  if (select count(*) from public.fechas where temporada_id = t.id and estado = 'cerrada') >= t.cantidad_fechas then
    raise exception 'temporada_completa';
  end if;
  r := public.nx__abrir_fecha(t.id);
  -- la excepcion deshace tambien la pausa de nx__abrir_fecha
  if r.id is null then raise exception 'sin_juegos_elegibles'; end if;
  return r;
end $$;

revoke execute on function public.nx_iniciar_fecha(uuid) from public, anon;
grant execute on function public.nx_iniciar_fecha(uuid) to authenticated;

create or replace function public.nx_cerrar_fecha(p_fecha_id uuid) returns public.fechas
language plpgsql security definer set search_path = public as $$
declare f public.fechas; t public.temporadas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  select * into f from public.fechas where id = p_fecha_id;
  if not found or f.estado is distinct from 'abierta' then raise exception 'fecha_no_abierta'; end if;
  select * into t from public.temporadas where id = f.temporada_id;
  if not t.es_prueba and coalesce(t.reglas->>'ritmo', 'diario') = 'diario' then raise exception 'ritmo_diario'; end if;
  return public.nx__cerrar_fecha(p_fecha_id);
end $$;

revoke execute on function public.nx_cerrar_fecha(uuid) from public, anon;
grant execute on function public.nx_cerrar_fecha(uuid) to authenticated;

-- Reloj diario: cierra la fecha vencida y abre la siguiente de las temporadas reales de ritmo diario.
create function public.nx_tick() returns void
language plpgsql security definer set search_path = public as $$
declare t public.temporadas; fid uuid;
begin
  -- un reintento del cron o una llamada manual a la vez esperan al primero
  perform pg_advisory_xact_lock(hashtext('nx_tick'));
  for t in select * from public.temporadas
           where es_nexplay and not es_prueba and coalesce(reglas->>'ritmo', 'diario') = 'diario'
             and estado in ('activa','pausada') loop
    -- 23 h y no 24: el cron corre a la misma hora y abierta_en lleva unos segundos de mas
    for fid in select id from public.fechas
               where temporada_id = t.id and estado = 'abierta' and abierta_en <= now() - interval '23 hours' loop
      perform public.nx__cerrar_fecha(fid);
    end loop;
    select * into t from public.temporadas where id = t.id;  -- el cierre de la ultima la finaliza
    if t.estado = 'activa'
       and not exists (select 1 from public.fechas where temporada_id = t.id and estado = 'abierta')
       and (select count(*) from public.fechas where temporada_id = t.id and estado = 'cerrada') < t.cantidad_fechas then
      perform public.nx__abrir_fecha(t.id);
    end if;
  end loop;
end $$;

revoke execute on function public.nx_tick() from public, anon, authenticated;

create extension if not exists pg_cron;
-- 01:00 UTC = 22:00 de Argentina
select cron.schedule('nx_tick', '0 1 * * *', 'select public.nx_tick()');
