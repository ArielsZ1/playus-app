-- NEXPLAY etapa 2, Task 3: intentos con validacion en el servidor y tabla provisoria.
-- La validacion es una RPC y no una Edge Function: es aritmetica pura y el cliente igual no escribe intentos.

create function public.nx_empezar_intento(p_fecha_id uuid)
returns table(intento_id uuid, numero int, semilla int, modulo text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare c public.cuentas; f public.fechas; maxi int; n int; r public.intentos;
begin
  select * into c from public.cuentas where user_id = auth.uid();
  if not found or c.estado <> 'aceptado' or c.jugador_id is null then raise exception 'no_habilitado'; end if;
  -- for update: dos pestanas a la vez no sacan el mismo numero de intento
  select * into f from public.fechas where id = p_fecha_id for update;
  if not found or f.estado is distinct from 'abierta' then raise exception 'fecha_no_abierta'; end if;
  select coalesce((t.reglas->>'intentos')::int, 3) into maxi from public.temporadas t where t.id = f.temporada_id;
  select count(*) into n from public.intentos i where i.fecha_id = f.id and i.jugador_id = c.jugador_id;
  if n >= maxi then raise exception 'sin_intentos'; end if;
  -- Etapa 2: un intento abandonado (pestana cerrada) cuenta como usado. La repeticion es de la etapa 3.
  update public.intentos i set estado = 'interrumpido', motivo = 'abandonado', terminado_en = now()
  where i.fecha_id = f.id and i.jugador_id = c.jugador_id and i.estado = 'en_curso';
  insert into public.intentos(fecha_id, jugador_id, numero, semilla)
  values (f.id, c.jugador_id, n + 1, floor(random() * 2147483647)::int)
  returning * into r;
  return query select r.id, r.numero, r.semilla, (select j.modulo from public.juegos j where j.id = f.juego_id);
end $$;

create function public.nx_terminar_intento(p_intento_id uuid, p_resultado numeric, p_datos jsonb)
returns public.intentos
language plpgsql security definer set search_path = public as $$
declare jid uuid; i public.intentos; j public.juegos; v jsonb; d jsonb := coalesce(p_datos, '{}');
  e numeric; tm numeric; pen numeric; mot text; r public.intentos;
begin
  select jugador_id into jid from public.cuentas where user_id = auth.uid() and estado = 'aceptado';
  select * into i from public.intentos where id = p_intento_id for update;
  if not found or jid is null or i.jugador_id <> jid then raise exception 'intento_ajeno'; end if;
  if i.estado <> 'en_curso' then raise exception 'intento_cerrado'; end if;
  select jg.* into j from public.juegos jg join public.fechas f on f.juego_id = jg.id where f.id = i.fecha_id;
  v := j.validacion;

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
    elsif extract(epoch from now() - i.empezado_en) * 1000 < tm - (v->>'tolerancia_ms')::numeric then
      mot := 'duracion_imposible';
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

-- Mejor intento valido por jugador. security_invoker: respeta el RLS de quien consulta.
create view public.nx_tabla_provisoria with (security_invoker = true) as
select i.fecha_id, i.jugador_id, jg.apodo,
  case when coalesce(bool_or(j.menor_es_mejor), true)
    then min(i.resultado) filter (where i.estado = 'completado' and i.revision is distinct from 'retirada')
    else max(i.resultado) filter (where i.estado = 'completado' and i.revision is distinct from 'retirada')
  end as mejor,
  (count(*) filter (where i.estado <> 'en_curso'))::int as intentos_usados,
  bool_or(i.estado = 'en_curso') as en_juego
from public.intentos i
join public.jugadores jg on jg.id = i.jugador_id
join public.fechas f on f.id = i.fecha_id
join public.juegos j on j.id = f.juego_id
group by i.fecha_id, i.jugador_id, jg.apodo;

grant select on public.nx_tabla_provisoria to anon, authenticated;
revoke execute on function public.nx_empezar_intento(uuid), public.nx_terminar_intento(uuid, numeric, jsonb) from public, anon;
grant execute on function public.nx_empezar_intento(uuid), public.nx_terminar_intento(uuid, numeric, jsonb) to authenticated;
