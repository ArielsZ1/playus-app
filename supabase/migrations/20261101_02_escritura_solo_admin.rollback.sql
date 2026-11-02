-- Vuelve a "cualquier autenticado escribe". NO se aplica automaticamente.
do $$
declare s text; t text;
begin
  foreach s in array array['public','practica'] loop
    foreach t in array array['temporadas','fechas','juegos','jugadores','resultados','records_jugador_juego','premios'] loop
      execute format('drop policy "escritura admin" on %I.%I', s, t);
      execute format('create policy "escritura autenticada" on %I.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', s, t);
    end loop;
  end loop;
end $$;
