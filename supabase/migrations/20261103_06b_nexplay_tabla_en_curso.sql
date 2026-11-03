-- QA etapa 2: un intento que quedo en_curso (cerro la pagina) cuenta como usado,
-- y "jugando" solo si empezo hace poco; si no, la tabla mostraba "jugando 2/3" para siempre.
create or replace view public.nx_tabla_provisoria with (security_invoker = true) as
select i.fecha_id, i.jugador_id, jg.apodo,
  case when coalesce(bool_or(j.menor_es_mejor), true)
    then min(i.resultado) filter (where i.estado = 'completado' and i.revision is distinct from 'retirada')
    else max(i.resultado) filter (where i.estado = 'completado' and i.revision is distinct from 'retirada')
  end as mejor,
  count(*)::int as intentos_usados,
  -- shortcut: 10 minutos fijos alcanzan para Count!; pasarlo a juegos.validacion si llega un juego largo
  coalesce(bool_or(i.estado = 'en_curso' and i.empezado_en > now() - interval '10 minutes'), false) as en_juego
from public.intentos i
join public.jugadores jg on jg.id = i.jugador_id
join public.fechas f on f.id = i.fecha_id
join public.juegos j on j.id = f.juego_id
group by i.fecha_id, i.jugador_id, jg.apodo;
