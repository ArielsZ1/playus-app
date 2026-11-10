-- NEXPLAY etapa 3, revision de la rama: el record historico nexplay se recalcula en vez de "solo si mejora".
-- Antes, corregir un tiempo trucho (3 s -> 9 s) dejaba el record en 3 s para siempre.
-- Ahora, para los jugadores de la fecha, el record = su mejor performance en todas las fechas NEXPLAY reales
-- de ese juego; si ya no tienen ninguna valida, se borra. Unico cambio: el bloque de records de nx__calcular_fecha (09).
create or replace function public.nx__calcular_fecha(p_fecha_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare f public.fechas; t public.temporadas; menor boolean; bonus int;
begin
  -- for update: dos recalculos a la vez se serializan y el segundo lee los intentos ya confirmados
  select * into f from public.fechas where id = p_fecha_id for update;
  select * into t from public.temporadas where id = f.temporada_id;
  select coalesce(j.menor_es_mejor, true) into menor from public.juegos j where j.id = f.juego_id;
  bonus := round(10 * coalesce(f.bonus_porcentaje, 0) / 100.0);

  with mejores as (
    select jugador_id, case when menor then min(resultado) else max(resultado) end as mejor
    from public.intentos
    where fecha_id = f.id and estado = 'completado' and revision is distinct from 'retirada'
      and numero between 1 and 4 and not es_revancha and motivo is distinct from 'colchon'
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
  where s.jugador_id not in (select i.jugador_id from public.intentos i
                             where i.fecha_id = f.id and i.es_revancha and i.motivo = 'revancha_ganada')
  on conflict (fecha_id, jugador_id) do update
  set performance = excluded.performance, rivales_superados = excluded.rivales_superados,
      gemas = excluded.gemas, jugo = excluded.jugo, sancionado = false;

  -- Records historicos: solo temporadas reales, era nexplay, recalculados desde todas las fechas del juego.
  -- La fecha actual entra aunque siga 'abierta': nx__cerrar_fecha la marca cerrada despues de llamar aca.
  if not t.es_prueba then
    with mejor as (
      select re.jugador_id,
        (array_agg(re.performance order by case when menor then split_part(re.performance, ' ', 1)::numeric
                                                else -split_part(re.performance, ' ', 1)::numeric end))[1] as valor
      from public.resultados re
      join public.fechas fe on fe.id = re.fecha_id
      join public.temporadas te on te.id = fe.temporada_id
      where fe.juego_id = f.juego_id and (fe.estado = 'cerrada' or fe.id = f.id)
        and te.es_nexplay and not te.es_prueba and re.jugo and re.performance is not null
        and re.jugador_id in (select jugador_id from public.resultados where fecha_id = f.id)
      group by re.jugador_id
    ), borrados as (
      -- quien ya no tiene ninguna performance valida pierde el record (los dos conjuntos no se pisan)
      delete from public.records_jugador_juego rj
      where rj.era = 'nexplay' and rj.juego_id = f.juego_id
        and rj.jugador_id in (select jugador_id from public.resultados where fecha_id = f.id)
        and rj.jugador_id not in (select jugador_id from mejor)
    )
    insert into public.records_jugador_juego as rj (jugador_id, juego_id, valor, era, actualizado_en)
    select jugador_id, f.juego_id, valor, 'nexplay', now() from mejor
    on conflict (jugador_id, juego_id, era) do update
    set valor = excluded.valor, actualizado_en = now()
    where rj.valor is distinct from excluded.valor;
  end if;
end $$;

revoke execute on function public.nx__calcular_fecha(uuid) from public, anon, authenticated;
