---
name: playus-data-change
description: Use when changing anything that reads or writes Supabase data in Playus — new query, new column, admin form field, ranking/gemas logic, records, premios. Covers verifying the live schema (it is not in the repo), where code goes, and how to check nothing breaks.
---

# Cambios de datos en Playus

El esquema vivo está en el proyecto Supabase `playus-app` (id `qzeqjaxyeezqdycgzymq`). Las tablas viejas de Playus no tienen migraciones en el repo; desde NEXPLAY (2026-11) cada cambio queda también en `supabase/migrations/` y sus tests SQL en `supabase/tests/`. Nunca adivines nombres de columnas ni tipos: mirá la base.

Hay dos esquemas con las mismas tablas de Playus: `public` (datos reales) y `practica` (`npm run dev:practica`, datos ficticios). Una columna nueva en una tabla de Playus va **en los dos**. Las tablas y funciones NEXPLAY (`cuentas`, `invitaciones`, `auditoria`, `nx_*`) viven solo en `public`, y el cliente las llama con `nx = supabase.schema('public')` en `queries.js`.

## 1. Verificar el esquema real

Antes de escribir una query o un campo nuevo:

- Con el MCP de Supabase: `list_tables` del proyecto `playus-app` y revisá columnas, tipos y FKs de las tablas que tocás.
- Anotá el **tipo de los `id`** (int o uuid). Los `<select>` devuelven string: si los ids son int, compará con `String(a) === String(b)` o convertí con `Number()`. Comparar `f.id === e.target.value` falla en silencio.
- Si cambiás el esquema (columna, índice, constraint), hacelo con `apply_migration`, no con SQL suelto, guardá el mismo SQL en `supabase/migrations/AAAAMMDD_NN_nombre.sql` y revisá `get_advisors` (seguridad) después. Una migración ya aplicada no se edita: se corrige con otra nueva. Las migraciones necesitan el OK del usuario en el chat.
- Toda tabla nueva necesita RLS: lectura pública y **escritura solo admin** (`using (public.es_admin())`). "Autenticado" ya no significa admin: los jugadores de NEXPLAY también tienen sesión. Lo que escriben los jugadores pasa por funciones `security definer` que validan adentro, nunca por políticas de insert/update.

## 2. Dónde va el código

- Toda llamada a Supabase va en `src/lib/queries.js`, en la sección de su entidad. La función hace `if (error) throw error` y devuelve `data`.
- El `.select(...)` tiene que traer **todas** las columnas que usa quien llama. Ejemplo real: `getFechas` trae `resultados(id)` y el admin lee `r.jugador_id` → undefined.
- Las pages llaman a la query dentro de `try/catch` y muestran el error con `setMensaje`. Un `await` sin catch en un handler deja al admin sin feedback.
- Escrituras masivas usan `upsert` con `onConflict` (ver `upsertResultados`). Nunca guardes valores por defecto (0, '') encima de datos existentes que no se cargaron en el formulario.

## 3. Lógica de temporada

- Ranking y evolución se calculan en JS sumando `resultados.gemas` filtrados por `fechas!inner(temporada_id)`. Si cambiás cómo se calculan las gemas, cambiá `getRanking` y `getEvolucionGemas` juntas, o los totales no van a coincidir con el gráfico.
- El gráfico usa `apodo` como clave de serie; no lo uses como identificador en lógica nueva, usá `jugador.id`.

## 4. Verificar

1. `npm run build` sin errores.
2. Probá el SQL nuevo dentro de `begin; … rollback;` impersonando roles (`set local role authenticated; select set_config('request.jwt.claims', …)`), como en `supabase/tests/`.
3. `npm run dev`, logueate en `/admin` y probá el flujo completo: crear → guardar → **recargar la página** → volver a abrir la misma fecha y confirmar que los valores guardados aparecen.
4. Revisá `/`, `/fecha/:id` y `/jugador/:id` para ver que lo cargado se refleja.
