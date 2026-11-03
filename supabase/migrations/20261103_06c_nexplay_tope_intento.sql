-- NEXPLAY etapa 2, revision: tope al resultado de un intento.
-- Sin tope, un resultado enorme cerraba como '####.## Segundos' (to_char 'FM9990.00') y rompia el upsert de records.
-- El tiempo ya estaba acotado por la duracion del servidor, pero la penalizacion (errores) no: maximo 1 hora en total.

create or replace function public.nx_terminar_intento(p_intento_id uuid, p_resultado numeric, p_datos jsonb)
returns public.intentos
language plpgsql security definer set search_path = public as $$
declare jid uuid; i public.intentos; j public.juegos; v jsonb; d jsonb := coalesce(p_datos, '{}');
  e numeric; tm numeric; pen numeric; mot text; r public.intentos; ms numeric;
begin
  select jugador_id into jid from public.cuentas where user_id = auth.uid() and estado = 'aceptado';
  select * into i from public.intentos where id = p_intento_id for update;
  if not found or jid is null or i.jugador_id <> jid then raise exception 'intento_ajeno'; end if;
  if i.estado <> 'en_curso' then raise exception 'intento_cerrado'; end if;
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
  return r;
end $$;
