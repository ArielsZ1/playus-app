-- NEXPLAY etapa 3, Task 4: herramientas del admin (spec etapa 3, 3.11): cancelar la fecha abierta,
-- corregir un intento, pausar y reanudar, y excluir juegos en preparacion. Todo auditado.
-- fechas.estado ya admite 'cancelada' y el indice unico de numero_fecha ya la excluye (migracion 04).

-- Cancelar: solo la abierta. Sus intentos quedan como historial, no reparte puntos y su juego vuelve
-- a la ruleta. nx__abrir_fecha cuenta solo las cerradas, asi la reemplazante repite numero y bonus.
create function public.nx_cancelar_fecha(p_fecha_id uuid, p_motivo text) returns public.fechas
language plpgsql security definer set search_path = public as $$
declare f public.fechas; r public.fechas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'motivo_vacio'; end if;
  select * into f from public.fechas where id = p_fecha_id for update;
  if not found or f.estado is distinct from 'abierta' then raise exception 'fecha_no_abierta'; end if;
  update public.intentos set estado = 'interrumpido', motivo = 'fecha_cancelada', terminado_en = now()
  where fecha_id = f.id and estado = 'en_curso';
  update public.fechas set estado = 'cancelada', cerrada_en = now() where id = f.id returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues, motivo)
  values (auth.uid(), 'cancelar_fecha', 'fechas', f.id, to_jsonb(f), to_jsonb(r), p_motivo);
  return r;
end $$;

-- Corregir: un intento completado o invalido pasa a completado con el valor nuevo.
-- Las revanchas no: su motivo 'revancha_ganada' es lo que protege su fila en el recalculo.
create function public.nx_corregir_resultado(p_intento_id uuid, p_nuevo numeric, p_motivo text)
returns public.intentos
language plpgsql security definer set search_path = public as $$
declare i public.intentos; r public.intentos;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'motivo_vacio'; end if;
  if p_nuevo is null or p_nuevo < 0 then raise exception 'resultado_invalido'; end if;
  select * into i from public.intentos where id = p_intento_id for update;
  if not found or i.estado not in ('completado','invalido') or i.es_revancha then raise exception 'no_corregible'; end if;
  update public.intentos set estado = 'completado', resultado = p_nuevo, motivo = 'corregido'
  where id = i.id returning * into r;
  if (select estado from public.fechas where id = i.fecha_id) = 'cerrada' then
    perform public.nx__recalcular_fecha(i.fecha_id);
  end if;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues, motivo)
  values (auth.uid(), 'corregir_resultado', 'intentos', i.id, to_jsonb(i), to_jsonb(r), p_motivo);
  return r;
end $$;

-- Pausar solo impide abrir fechas nuevas: la abierta sigue y se cierra normalmente.
create function public.nx_pausar(p_temporada_id uuid, p_motivo text) returns public.temporadas
language plpgsql security definer set search_path = public as $$
declare antes public.temporadas; r public.temporadas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'motivo_vacio'; end if;
  select * into antes from public.temporadas where id = p_temporada_id and es_nexplay for update;
  if not found or antes.estado <> 'activa' then raise exception 'estado_invalido'; end if;
  update public.temporadas set estado = 'pausada' where id = antes.id returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues, motivo)
  values (auth.uid(), 'pausar', 'temporadas', r.id, to_jsonb(antes), to_jsonb(r), p_motivo);
  return r;
end $$;

create function public.nx_reanudar(p_temporada_id uuid) returns public.temporadas
language plpgsql security definer set search_path = public as $$
declare antes public.temporadas; r public.temporadas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  select * into antes from public.temporadas where id = p_temporada_id and es_nexplay for update;
  if not found or antes.estado <> 'pausada' then raise exception 'estado_invalido'; end if;
  update public.temporadas set estado = 'activa' where id = antes.id returning * into r;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, antes, despues)
  values (auth.uid(), 'reanudar', 'temporadas', r.id, to_jsonb(antes), to_jsonb(r));
  return r;
end $$;

-- Juegos que no entran a la ruleta de una temporada. Lectura publica; se escribe solo por nx_excluir_juego.
create table public.temporada_juegos_excluidos (
  temporada_id uuid not null references public.temporadas(id) on delete cascade,
  juego_id uuid not null references public.juegos(id),
  primary key (temporada_id, juego_id)
);
alter table public.temporada_juegos_excluidos enable row level security;
create policy temporada_juegos_excluidos_select on public.temporada_juegos_excluidos for select using (true);
revoke insert, update, delete, truncate on public.temporada_juegos_excluidos from anon, authenticated;

create function public.nx_excluir_juego(p_temporada_id uuid, p_juego_id uuid, p_excluir boolean) returns void
language plpgsql security definer set search_path = public as $$
declare t public.temporadas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  select * into t from public.temporadas where id = p_temporada_id and es_nexplay for update;
  if not found or t.estado <> 'preparacion' then raise exception 'estado_invalido'; end if;
  if p_excluir then
    insert into public.temporada_juegos_excluidos values (t.id, p_juego_id) on conflict do nothing;
  else
    delete from public.temporada_juegos_excluidos where temporada_id = t.id and juego_id = p_juego_id;
  end if;
  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
  values (auth.uid(), 'excluir_juego', 'temporadas', t.id,
          jsonb_build_object('juego_id', p_juego_id, 'excluir', coalesce(p_excluir, false)));
end $$;

revoke execute on function public.nx_cancelar_fecha(uuid, text), public.nx_corregir_resultado(uuid, numeric, text),
  public.nx_pausar(uuid, text), public.nx_reanudar(uuid), public.nx_excluir_juego(uuid, uuid, boolean)
  from public, anon;
grant execute on function public.nx_cancelar_fecha(uuid, text), public.nx_corregir_resultado(uuid, numeric, text),
  public.nx_pausar(uuid, text), public.nx_reanudar(uuid), public.nx_excluir_juego(uuid, uuid, boolean)
  to authenticated;

-- nx__abrir_fecha (migracion 10) con un unico cambio: la ruleta salta los juegos excluidos de la temporada.
create or replace function public.nx__abrir_fecha(p_temporada_id uuid) returns public.fechas
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
    and not exists (select 1 from public.temporada_juegos_excluidos x
                    where x.temporada_id = t.id and x.juego_id = j.id)
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
