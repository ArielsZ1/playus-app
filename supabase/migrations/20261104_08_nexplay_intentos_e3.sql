-- NEXPLAY etapa 3, Task 1: practica (numero 0), colchon, Underdog con 4 intentos y estado del jugador.
-- "Contar" = numero 1..4, no revancha y motivo distinto de 'colchon'.

do $$
declare s text;
begin
  foreach s in array array['public','practica'] loop
    execute format('alter table %1$I.temporadas add column if not exists campeones uuid[]', s);
  end loop;
end $$;

alter table public.intentos drop constraint intentos_numero_check;
alter table public.intentos add constraint intentos_numero_check check (numero between 0 and 4);
alter table public.intentos add column es_revancha boolean not null default false;
-- El colchon libera el numero: el intento viejo conserva el suyo, por eso el indice excluye 'colchon'.
alter table public.intentos drop constraint intentos_fecha_id_jugador_id_numero_key;
create unique index intentos_fecha_jugador_numero on public.intentos(fecha_id, jugador_id, numero)
  where motivo is distinct from 'colchon';

drop function public.nx_empezar_intento(uuid);
create function public.nx_empezar_intento(p_fecha_id uuid, p_practica boolean default false)
returns table(intento_id uuid, numero int, semilla int, modulo text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare c public.cuentas; f public.fechas; maxi int; n int; r public.intentos; usada boolean; reg jsonb;
begin
  select * into c from public.cuentas where user_id = auth.uid();
  if not found or c.estado <> 'aceptado' or c.jugador_id is null then raise exception 'no_habilitado'; end if;
  -- for update: dos pestanas a la vez no sacan el mismo numero de intento
  select * into f from public.fechas where id = p_fecha_id for update;
  if not found or f.estado is distinct from 'abierta' then raise exception 'fecha_no_abierta'; end if;

  select exists (select 1 from public.intentos i where i.fecha_id = f.id and i.jugador_id = c.jugador_id
                 and (i.numero = 0 or i.motivo = 'colchon')) into usada;
  if p_practica and (usada or exists (select 1 from public.intentos i
      where i.fecha_id = f.id and i.jugador_id = c.jugador_id and i.numero >= 2)) then
    raise exception 'sin_practica';
  end if;

  -- Un intento sin terminar: en el 1 o 2 y con la practica sin usar, es el colchon (el numero queda libre).
  update public.intentos i set estado = 'interrumpido', terminado_en = now(),
    -- con p_practica el colchon y la practica son el mismo recurso: el intento viejo cuenta como abandonado
    motivo = case when i.numero in (1,2) and not usada and not p_practica then 'colchon' else 'abandonado' end
  where i.fecha_id = f.id and i.jugador_id = c.jugador_id and i.estado = 'en_curso' and not i.es_revancha;

  if p_practica then
    n := 0;
  else
    select t.reglas into reg from public.temporadas t where t.id = f.temporada_id;
    maxi := case when c.jugador_id = any(coalesce(f.underdogs, '{}'))
      then coalesce((reg->>'intentos_underdog')::int, 4) else coalesce((reg->>'intentos')::int, 3) end;
    select count(*) into n from public.intentos i
    where i.fecha_id = f.id and i.jugador_id = c.jugador_id
      and i.numero between 1 and 4 and not i.es_revancha and i.motivo is distinct from 'colchon';
    if n >= maxi then raise exception 'sin_intentos'; end if;
    n := n + 1;
  end if;
  insert into public.intentos(fecha_id, jugador_id, numero, semilla)
  values (f.id, c.jugador_id, n, floor(random() * 2147483647)::int)
  returning * into r;
  return query select r.id, r.numero, r.semilla, (select j.modulo from public.juegos j where j.id = f.juego_id);
end $$;

create function public.nx_mi_fecha(p_fecha_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare jid uuid; f public.fechas; und boolean; usados int; col boolean; pra boolean; cerr boolean; reg jsonb;
begin
  select jugador_id into jid from public.cuentas where user_id = auth.uid() and estado = 'aceptado';
  if jid is null then raise exception 'no_habilitado'; end if;
  select * into f from public.fechas where id = p_fecha_id;
  if not found then raise exception 'fecha_no_abierta'; end if;
  select t.reglas into reg from public.temporadas t where t.id = f.temporada_id;
  und := jid = any(coalesce(f.underdogs, '{}'));
  select count(*) filter (where numero between 1 and 4 and not es_revancha and motivo is distinct from 'colchon'),
         coalesce(bool_or(motivo = 'colchon'), false),
         coalesce(bool_or(numero = 0 or motivo = 'colchon'), false),
         coalesce(bool_or(numero >= 2), false)
  into usados, col, pra, cerr
  from public.intentos where fecha_id = f.id and jugador_id = jid;
  return jsonb_build_object('intentos_max', case when und then coalesce((reg->>'intentos_underdog')::int, 4)
      else coalesce((reg->>'intentos')::int, 3) end, 'usados', usados, 'underdog', und,
    'practica', case when pra then 'usada' when cerr then 'cerrada' else 'disponible' end,
    'colchon_usado', col);
end $$;

revoke execute on function public.nx_empezar_intento(uuid, boolean), public.nx_mi_fecha(uuid) from public, anon;
grant execute on function public.nx_empezar_intento(uuid, boolean), public.nx_mi_fecha(uuid) to authenticated;

create or replace view public.nx_tabla_provisoria with (security_invoker = true) as
select i.fecha_id, i.jugador_id, jg.apodo,
  case when coalesce(bool_or(j.menor_es_mejor), true)
    then min(i.resultado) filter (where i.estado = 'completado' and i.revision is distinct from 'retirada'
      and i.numero between 1 and 4 and not i.es_revancha and i.motivo is distinct from 'colchon')
    else max(i.resultado) filter (where i.estado = 'completado' and i.revision is distinct from 'retirada'
      and i.numero between 1 and 4 and not i.es_revancha and i.motivo is distinct from 'colchon')
  end as mejor,
  (count(*) filter (where i.numero between 1 and 4 and not i.es_revancha and i.motivo is distinct from 'colchon'))::int as intentos_usados,
  -- shortcut: 10 minutos fijos alcanzan para Count!; pasarlo a juegos.validacion si llega un juego largo
  coalesce(bool_or(i.estado = 'en_curso' and i.empezado_en > now() - interval '10 minutes'), false) as en_juego
from public.intentos i
join public.jugadores jg on jg.id = i.jugador_id
join public.fechas f on f.id = i.fecha_id
join public.juegos j on j.id = f.juego_id
group by i.fecha_id, i.jugador_id, jg.apodo;
-- La practica (numero 0) y las revanchas no entran al cierre: nx_cerrar_fecha igual que antes, con ese unico filtro nuevo.
create or replace function public.nx_cerrar_fecha(p_fecha_id uuid) returns public.fechas
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
