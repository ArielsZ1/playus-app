-- NEXPLAY etapa 2, Task 8: un jugador puede tener un record playus y uno nexplay del mismo juego.
-- Queda solo records_era_unico (jugador_id, juego_id, era). Aplicar DESPUES del deploy que usa onConflict con era:
-- el cliente viejo (onConflict 'jugador_id,juego_id') falla sin esta constraint.
alter table public.records_jugador_juego drop constraint records_jugador_juego_jugador_id_juego_id_key;
alter table practica.records_jugador_juego drop constraint records_jugador_juego_jugador_id_juego_id_key;
