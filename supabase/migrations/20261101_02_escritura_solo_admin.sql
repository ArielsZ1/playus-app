-- NEXPLAY etapa 1, Task 2: solo el admin escribe en las tablas de Playus.
-- Reemplaza "escritura autenticada" por "escritura admin" en public y practica.
-- Rollback: 20261101_02_escritura_solo_admin.rollback.sql
do $$
declare s text; t text;
begin
  foreach s in array array['public','practica'] loop
    foreach t in array array['temporadas','fechas','juegos','jugadores','resultados','records_jugador_juego','premios'] loop
      execute format('drop policy "escritura autenticada" on %I.%I', s, t);
      execute format('create policy "escritura admin" on %I.%I for all using (public.es_admin()) with check (public.es_admin())', s, t);
    end loop;
  end loop;
end $$;
