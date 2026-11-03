-- NEXPLAY etapa 2, Task 4: cerrar la fecha. Calcula puntos (spec 5), escribe resultados y records.

create function public.nx_cerrar_fecha(p_fecha_id uuid) returns public.fechas
language plpgsql security definer set search_path = public as $$
declare f public.fechas; t public.temporadas; menor boolean; bonus int; np int; filas jsonb; r public.fechas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  select * into f from public.fechas where id = p_fecha_id for update;
  if not found or f.estado is distinct from 'abierta' then raise exception 'fecha_no_abierta'; end if;
  select * into t from public.temporadas where id = f.temporada_id for update;
  select coalesce(j.menor_es_mejor, true) into menor from public.juegos j where j.id = f.juego_id;
  bonus := round(10 * coalesce(f.bonus_porcentaje, 0) / 100.0);

  update public.intentos set estado = 'interrumpido', motivo = 'fecha_cerrada', terminado_en = now()
  where fecha_id = f.id and estado = 'en_curso';

  with mejores as (
    select jugador_id, case when menor then min(resultado) else max(resultado) end as mejor
    from public.intentos
    where fecha_id = f.id and estado = 'completado' and revision is distinct from 'retirada'
    group by jugador_id
  ), calc as (
    select m.jugador_id, m.mejor,
      (select count(*) from mejores o
       where case when menor then o.mejor > m.mejor else o.mejor < m.mejor end)::int as rivales
    from mejores m
  ), sala as (
    select jugador_id from public.cuentas where estado = 'aceptado' and jugador_id is not null
    union select jugador_id from mejores
  )
  insert into public.resultados(fecha_id, jugador_id, performance, rivales_superados, gemas, jugo, sancionado)
  select f.id, s.jugador_id,
    -- shortcut: formato en segundos porque Count! es el unico juego; cada juego nuevo trae su unidad
    case when c.mejor is null then null else to_char(round(c.mejor / 1000.0, 2), 'FM9990.00') || ' Segundos' end,
    coalesce(c.rivales, 0),
    case when c.jugador_id is null then 0 else 10 + 10 * c.rivales + bonus end,
    c.jugador_id is not null, false
  from sala s left join calc c using (jugador_id)
  on conflict (fecha_id, jugador_id) do update
  set performance = excluded.performance, rivales_superados = excluded.rivales_superados,
      gemas = excluded.gemas, jugo = excluded.jugo, sancionado = false;

  select count(*) filter (where jugo),
         jsonb_agg(jsonb_build_object('jugador_id', jugador_id, 'performance', performance,
                   'rivales_superados', rivales_superados, 'gemas', gemas, 'jugo', jugo))
  into np, filas
  from public.resultados where fecha_id = f.id;

  -- Records historicos: solo temporadas reales, era nexplay, y solo si mejora
  if not t.es_prueba then
    insert into public.records_jugador_juego as rj (jugador_id, juego_id, valor, era, actualizado_en)
    select jugador_id, f.juego_id, performance, 'nexplay', now()
    from public.resultados where fecha_id = f.id and jugo
    on conflict (jugador_id, juego_id, era) do update
    set valor = excluded.valor, actualizado_en = now()
    where case when menor
      then split_part(excluded.valor, ' ', 1)::numeric < split_part(rj.valor, ' ', 1)::numeric
      else split_part(excluded.valor, ' ', 1)::numeric > split_part(rj.valor, ' ', 1)::numeric end;
  end if;

  update public.fechas set estado = 'cerrada', cerrada_en = now(), sin_jugadores = (np = 0)
  where id = f.id returning * into r;
  -- Etapa 2: al cerrar la ultima, la temporada termina. Campeon y desempate son de la etapa 3.
  if f.numero_fecha >= t.cantidad_fechas then
    update public.temporadas set estado = 'finalizada' where id = t.id;
  end if;

  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
  values (auth.uid(), 'cerrar_fecha', 'fechas', f.id, jsonb_build_object('resultados', filas));
  return r;
end $$;

revoke execute on function public.nx_cerrar_fecha(uuid) from public, anon;
grant execute on function public.nx_cerrar_fecha(uuid) to authenticated;
