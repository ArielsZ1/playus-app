-- NEXPLAY etapa 3, Task 2: cierre interno (para el tick), recalculo de una fecha cerrada,
-- resultados tardios dentro de 2 h y campeon con desempate (spec etapa 3, 3.5, 3.6, 3.9 y 3.10).

-- Puntos, resultados y records de una fecha: el calculo de nx_cerrar_fecha (migracion 08), sin cerrar nada.
-- No toca las filas de quien gano la revancha: se juzgaron contra el mejor resultado de su momento.
create function public.nx__calcular_fecha(p_fecha_id uuid) returns void
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
end $$;

-- Campeon: suma de gemas de las fechas cerradas; desempate por victorias y despues mini liga
-- (duelos ganados en las fechas que jugaron juntos, como compararEnFecha). Si sigue el empate, todos.
create function public.nx__campeones(p_temporada_id uuid) returns uuid[]
language sql stable security definer set search_path = public as $$
  with res as (
    select r.fecha_id, r.jugador_id, r.jugo,
      coalesce(r.rivales_superados, 0) as riv, coalesce(r.gemas, 0) as gemas
    from public.resultados r join public.fechas f on f.id = r.fecha_id
    where f.temporada_id = p_temporada_id and f.estado = 'cerrada'
  ), tabla as (
    -- victoria = puesto 1 en la fecha (nadie con mas rivales, o los mismos y mas gemas)
    select x.jugador_id, sum(x.gemas) as pts,
      count(*) filter (where x.jugo and not exists (
        select 1 from res o where o.fecha_id = x.fecha_id and o.jugo and (o.riv, o.gemas) > (x.riv, x.gemas))) as vic
    from res x group by x.jugador_id
    having bool_or(x.jugo)
  ), top as (
    select jugador_id from (select jugador_id, rank() over (order by pts desc, vic desc) as rk from tabla) s
    where rk = 1
  ), liga as (
    select a.jugador_id, count(b.fecha_id) as duelos
    from top a
    left join res ra on ra.jugador_id = a.jugador_id and ra.jugo
    left join res b on b.fecha_id = ra.fecha_id and b.jugo and b.jugador_id <> a.jugador_id
      and b.jugador_id in (select jugador_id from top) and (ra.riv, ra.gemas) > (b.riv, b.gemas)
    group by a.jugador_id
  )
  select array_agg(jugador_id order by jugador_id)
  from (select jugador_id, rank() over (order by duelos desc) as rk from liga) s
  where rk = 1
$$;

-- Cierre sin chequeo de permisos: lo llaman el tick (auth.uid() null) y nx_cerrar_fecha.
create function public.nx__cerrar_fecha(p_fecha_id uuid) returns public.fechas
language plpgsql security definer set search_path = public as $$
declare f public.fechas; t public.temporadas; np int; filas jsonb; r public.fechas; camp uuid[];
  pre text := case when auth.uid() is null then 'auto_' else '' end;
begin
  select * into f from public.fechas where id = p_fecha_id for update;
  if not found or f.estado is distinct from 'abierta' then raise exception 'fecha_no_abierta'; end if;
  select * into t from public.temporadas where id = f.temporada_id for update;

  update public.intentos set estado = 'interrumpido', motivo = 'fecha_cerrada', terminado_en = now()
  where fecha_id = f.id and estado = 'en_curso';

  perform public.nx__calcular_fecha(f.id);

  select count(*) filter (where jugo),
         jsonb_agg(jsonb_build_object('jugador_id', jugador_id, 'performance', performance,
                   'rivales_superados', rivales_superados, 'gemas', gemas, 'jugo', jugo))
  into np, filas
  from public.resultados where fecha_id = f.id;

  update public.fechas set estado = 'cerrada', cerrada_en = now(), sin_jugadores = (np = 0)
  where id = f.id returning * into r;

  insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
  values (auth.uid(), pre || 'cerrar_fecha', 'fechas', f.id, jsonb_build_object('resultados', filas));

  if f.numero_fecha >= t.cantidad_fechas then
    camp := public.nx__campeones(t.id);
    update public.temporadas set estado = 'finalizada', campeones = camp, campeon_id = camp[1] where id = t.id;
    insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
    values (auth.uid(), pre || 'finalizar', 'temporadas', t.id, jsonb_build_object('campeones', camp,
      'ranking', (select jsonb_agg(jsonb_build_object('jugador_id', x.jugador_id, 'gemas', x.g) order by x.g desc)
                  from (select re.jugador_id, sum(re.gemas) as g from public.resultados re
                        join public.fechas fe on fe.id = re.fecha_id
                        where fe.temporada_id = t.id and fe.estado = 'cerrada' group by re.jugador_id) x)));
  end if;
  return r;
end $$;

-- Recalcula una fecha cerrada (resultado tardio o correccion del admin) y, si la temporada termino, el campeon.
create function public.nx__recalcular_fecha(p_fecha_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.temporadas; camp uuid[];
begin
  perform public.nx__calcular_fecha(p_fecha_id);
  select tp.* into t from public.temporadas tp join public.fechas f on f.temporada_id = tp.id where f.id = p_fecha_id;
  if t.estado = 'finalizada' then
    camp := public.nx__campeones(t.id);
    update public.temporadas set campeones = camp, campeon_id = camp[1] where id = t.id;
  end if;
end $$;

revoke execute on function public.nx__calcular_fecha(uuid), public.nx__campeones(uuid),
  public.nx__cerrar_fecha(uuid), public.nx__recalcular_fecha(uuid) from public, anon, authenticated;

-- El admin solo cierra a mano las temporadas de prueba; las reales las cierra el tick.
create or replace function public.nx_cerrar_fecha(p_fecha_id uuid) returns public.fechas
language plpgsql security definer set search_path = public as $$
declare f public.fechas;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  select * into f from public.fechas where id = p_fecha_id;
  if not found or f.estado is distinct from 'abierta' then raise exception 'fecha_no_abierta'; end if;
  if not (select es_prueba from public.temporadas where id = f.temporada_id) then raise exception 'solo_prueba'; end if;
  return public.nx__cerrar_fecha(p_fecha_id);
end $$;

revoke execute on function public.nx_cerrar_fecha(uuid) from public, anon;
grant execute on function public.nx_cerrar_fecha(uuid) to authenticated;

-- nx_terminar_intento (06c) + resultado tardio: un intento cortado por el cierre se puede
-- terminar hasta 2 h despues de cerrada_en; si queda completado, la fecha se recalcula.
create or replace function public.nx_terminar_intento(p_intento_id uuid, p_resultado numeric, p_datos jsonb)
returns public.intentos
language plpgsql security definer set search_path = public as $$
declare jid uuid; i public.intentos; j public.juegos; v jsonb; d jsonb := coalesce(p_datos, '{}');
  e numeric; tm numeric; pen numeric; mot text; r public.intentos; ms numeric; tarde boolean := false;
begin
  select jugador_id into jid from public.cuentas where user_id = auth.uid() and estado = 'aceptado';
  select * into i from public.intentos where id = p_intento_id for update;
  if not found or jid is null or i.jugador_id <> jid then raise exception 'intento_ajeno'; end if;
  if i.estado = 'interrumpido' and i.motivo = 'fecha_cerrada' then
    if now() > (select f.cerrada_en from public.fechas f where f.id = i.fecha_id) + interval '2 hours' then
      raise exception 'fuera_de_plazo';
    end if;
    tarde := true;
  elsif i.estado <> 'en_curso' then
    raise exception 'intento_cerrado';
  end if;
  select jg.* into j from public.juegos jg join public.fechas f on f.juego_id = jg.id where f.id = i.fecha_id;
  v := j.validacion;
  ms := extract(epoch from now() - i.empezado_en) * 1000;

  if j.modulo = 'count' then
    begin
      e := (d->>'errores')::numeric; tm := (d->>'tiempo_ms')::numeric; pen := (d->>'penalizacion_ms')::numeric;
    exception when others then e := null;
    end;
    if e is null or tm is null or pen is null or p_resultado is null or e < 0 or e <> trunc(e) or tm <= 0 then
      mot := 'datos_incompletos';
    elsif pen <> e * (v->>'penalizacion_ms')::numeric or p_resultado <> tm + pen then
      mot := 'no_cierra';
    elsif p_resultado < (v->>'min_ms')::numeric then
      mot := 'demasiado_rapido';
    elsif ms < tm - (v->>'tolerancia_ms')::numeric then
      mot := 'duracion_imposible';
    elsif p_resultado > 3600000 then
      mot := 'demasiado_lento';
    end if;
  else
    mot := 'modulo_sin_validacion';
  end if;

  update public.intentos
  set estado = case when mot is null then 'completado' else 'invalido' end,
      resultado = case when mot is null then p_resultado end,
      motivo = mot, datos = p_datos, terminado_en = now()
  where id = i.id returning * into r;
  if tarde and r.estado = 'completado' then perform public.nx__recalcular_fecha(i.fecha_id); end if;
  return r;
end $$;
