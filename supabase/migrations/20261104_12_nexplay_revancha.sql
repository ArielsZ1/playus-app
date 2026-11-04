-- NEXPLAY etapa 3, Task 5: revancha (spec etapa 3, 3.8, E8, E9 y E12).
-- Un intento (numero 1, es_revancha) para quien no jugo una fecha cerrada, durante 24 h desde cerrada_en.

-- Mejor resultado oficial de la fecha: intentos que cuentan y revanchas ganadas (respeta menor_es_mejor).
create function public.nx__a_superar(p_fecha_id uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select case when coalesce(j.menor_es_mejor, true) then min(i.resultado) else max(i.resultado) end
  from public.intentos i join public.fechas f on f.id = i.fecha_id join public.juegos j on j.id = f.juego_id
  where i.fecha_id = p_fecha_id and i.estado = 'completado' and i.revision is distinct from 'retirada'
    and ((i.numero between 1 and 4 and not i.es_revancha and i.motivo is distinct from 'colchon')
         or (i.es_revancha and i.motivo = 'revancha_ganada'))
  group by j.menor_es_mejor
$$;

-- Quien tiene revancha en esa fecha. estado = 'cerrada' (no solo cerrada_en): las canceladas tambien lo tienen.
-- "No jugo" = ningun intento con numero 1..4 (cualquier estado o motivo, colchon incluido); la revancha es numero 1.
create function public.nx__puede_revancha(p_fecha_id uuid, p_jugador_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.fechas f join public.temporadas t on t.id = f.temporada_id
    where f.id = p_fecha_id and f.estado = 'cerrada' and now() < f.cerrada_en + interval '24 hours'
      and f.numero_fecha < t.cantidad_fechas and coalesce(t.reglas->>'ritmo', 'diario') <> 'maraton'
      and not coalesce(f.sin_jugadores, false)
      and not exists (select 1 from public.intentos i
                      where i.fecha_id = f.id and i.jugador_id = p_jugador_id and i.numero between 1 and 4))
$$;

revoke execute on function public.nx__a_superar(uuid), public.nx__puede_revancha(uuid, uuid)
  from public, anon, authenticated;

create function public.nx_empezar_revancha(p_fecha_id uuid)
returns table(intento_id uuid, numero int, semilla int, modulo text)
language plpgsql security definer set search_path = public as $$
declare c public.cuentas; f public.fechas; r public.intentos;
begin
  select * into c from public.cuentas where user_id = auth.uid();
  if not found or c.estado <> 'aceptado' or c.jugador_id is null then raise exception 'no_habilitado'; end if;
  -- for update: dos pestanas a la vez no empiezan dos revanchas
  select * into f from public.fechas where id = p_fecha_id for update;
  if not found or not public.nx__puede_revancha(f.id, c.jugador_id) then raise exception 'sin_revancha'; end if;
  insert into public.intentos(fecha_id, jugador_id, numero, semilla, es_revancha)
  values (f.id, c.jugador_id, 1, floor(random() * 2147483647)::int, true)
  returning * into r;
  return query select r.id, r.numero, r.semilla, (select j.modulo from public.juegos j where j.id = f.juego_id);
end $$;

-- La revancha disponible del jugador (la fecha cerrada mas reciente), o null.
create function public.nx_mi_revancha() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare jid uuid; f public.fechas;
begin
  select jugador_id into jid from public.cuentas where user_id = auth.uid() and estado = 'aceptado';
  if jid is null then raise exception 'no_habilitado'; end if;
  select * into f from public.fechas fe
  where fe.estado = 'cerrada' and fe.cerrada_en > now() - interval '24 hours' and public.nx__puede_revancha(fe.id, jid)
  order by fe.cerrada_en desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object('fecha_id', f.id, 'numero_fecha', f.numero_fecha,
    'juego', (select j.nombre from public.juegos j where j.id = f.juego_id),
    'a_superar', public.nx__a_superar(f.id), 'termina_en', f.cerrada_en + interval '24 hours');
end $$;

revoke execute on function public.nx_empezar_revancha(uuid), public.nx_mi_revancha() from public, anon;
grant execute on function public.nx_empezar_revancha(uuid), public.nx_mi_revancha() to authenticated;

-- nx_terminar_intento (09) + revancha: la misma validacion; si queda completada y supera
-- estrictamente el mejor resultado de la fecha, gana los rivales y puntos del ganador original.
create or replace function public.nx_terminar_intento(p_intento_id uuid, p_resultado numeric, p_datos jsonb)
returns public.intentos
language plpgsql security definer set search_path = public as $$
declare jid uuid; i public.intentos; j public.juegos; v jsonb; d jsonb := coalesce(p_datos, '{}');
  e numeric; tm numeric; pen numeric; mot text; r public.intentos; ms numeric; tarde boolean := false;
  fr public.fechas; a numeric; np int;
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
  if i.es_revancha then
    -- for update: dos revanchas que terminan a la vez se comparan una despues de la otra
    select * into fr from public.fechas where id = i.fecha_id for update;
    if now() > fr.cerrada_en + interval '24 hours' then raise exception 'fuera_de_plazo'; end if;
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

  if i.es_revancha and mot is null then
    a := public.nx__a_superar(i.fecha_id);
    mot := case when a is not null and case when coalesce(j.menor_es_mejor, true) then p_resultado < a
      else p_resultado > a end then 'revancha_ganada' else 'revancha_perdida' end;
  end if;

  update public.intentos
  set estado = case when mot is null or mot in ('revancha_ganada','revancha_perdida') then 'completado' else 'invalido' end,
      resultado = case when mot is null or mot in ('revancha_ganada','revancha_perdida') then p_resultado end,
      motivo = mot, datos = p_datos, terminado_en = now()
  where id = i.id returning * into r;
  if tarde and r.estado = 'completado' then perform public.nx__recalcular_fecha(i.fecha_id); end if;

  if mot = 'revancha_ganada' then
    -- |P| = los que jugaron la fecha, sin contar revanchas ganadas (la propia incluida)
    select count(*) into np from public.resultados re
    where re.fecha_id = fr.id and re.jugo and re.jugador_id not in (select x.jugador_id from public.intentos x
      where x.fecha_id = fr.id and x.es_revancha and x.motivo = 'revancha_ganada');
    insert into public.resultados(fecha_id, jugador_id, performance, rivales_superados, gemas, jugo, sancionado)
    values (fr.id, jid, to_char(round(p_resultado / 1000.0, 2), 'FM9990.00') || ' Segundos', np - 1,
      10 + 10 * (np - 1) + round(10 * coalesce(fr.bonus_porcentaje, 0) / 100.0), true, false)
    on conflict (fecha_id, jugador_id) do update
    set performance = excluded.performance, rivales_superados = excluded.rivales_superados,
        gemas = excluded.gemas, jugo = true, sancionado = false;
    -- el recalculo no toca su fila: actualiza su record nexplay y, si la temporada ya termino, el campeon
    perform public.nx__recalcular_fecha(fr.id);
    insert into public.auditoria(admin_user_id, accion, entidad, entidad_id, despues)
    values (null, 'auto_revancha_ganada', 'intentos', r.id, jsonb_build_object('jugador_id', jid,
      'resultado', p_resultado, 'a_superar', a, 'rivales_superados', np - 1));
  end if;
  return r;
end $$;
