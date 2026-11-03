# NEXPLAY Etapa 2 — Motor mínimo con Count!: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el admin pueda crear e iniciar una temporada NEXPLAY, abrir una fecha (la ruleta sortea Count!), que cada jugador juegue 3 intentos desde el celu viendo la tabla provisoria, y que al cerrar la fecha los puntos queden en `resultados` y se vean en el ranking de Playus.

**Architecture:** Columnas nuevas en las tablas de Playus (en `public` y `practica`) + tabla `intentos` y vista `nx_tabla_provisoria` en `public`. Toda escritura del torneo pasa por funciones Postgres `security definer` (patrón de la etapa 1). Count! es un módulo React en `src/nexplay/juegos/count/` con el contrato de §7. Las pantallas nuevas viven en la app `/nexplay/`.

**Tech Stack:** React 18, React Router 6, Vite 5, Tailwind, Supabase (Postgres + Auth Google), proyecto `qzeqjaxyeezqdycgzymq`.

**Spec:** `docs/superpowers/specs/2026-11-01-nexplay-design.md` (§3.3, §3.4, §3.5, §4, §5, §6, §7, §8 punto 2). Arranque y datos vivos: `.superpowers/sdd/2026-11-03-nexplay-etapa-2-motor/kickoff.md`.

## Decisiones de esta etapa (cerradas con el usuario el 2026-11-03)

1. **Prueba de la etapa:** temporada `es_prueba` de **1 fecha**, jugada con 3 cuentas Google de prueba del usuario + el admin. Para verificar el ranking de Playus se pone `es_prueba = false` unos minutos y se vuelve a `true`. Al final se borra todo (temporada, fecha, intentos, resultados, auditoría de la prueba, cuentas y jugadores de prueba), mostrando antes la lista al usuario.
2. **`performance`** de NEXPLAY: `intentos.resultado` en ms; `resultados.performance` = `"4.70 Segundos"` (segundos con 2 decimales + `" Segundos"`).
3. **Plausibilidad de Count!:** `resultado >= 2500`, `resultado = tiempo_ms + 100 × errores`, `penalizacion_ms = 100 × errores` y duración del servidor `>= tiempo_ms − 1000`. Los números viven en `juegos.validacion` para ajustarlos sin migración.
4. **Ruleta simple:** una lista de nombres que gira unos segundos y frena en el juego ya sorteado.
5. **Fecha:** el admin la abre y la cierra a mano. No hay hora de cierre.
6. **Contrato de estados** de las pantallas nuevas, aprobado por el usuario antes de construirlas (Task 5).

**[mi decisión] Validación en una RPC y no en una Edge Function.** La validación de §3.4 es aritmética pura. Como función `nx_terminar_intento` (plpgsql, `security definer`) da la misma garantía (el cliente no escribe `intentos`). Además evita desplegar Deno, manejar la service key y verificar el JWT a mano. Si el usuario prefiere la Edge Function, solo cambia Task 3.

**[mi decisión] Intento abandonado en la etapa 2.** Si un jugador empieza un intento y cierra la pestaña, al empezar el siguiente el viejo pasa a `interrumpido` y **cuenta como usado**. La repetición con revisión es de la etapa 3.

**[mi decisión] Fin de temporada mínimo.** Al cerrar la última fecha, la temporada pasa a `finalizada`. El campeón y el desempate son de la etapa 3.

## Global Constraints

- Texto de UI e identificadores en español.
- Todo acceso a datos pasa por `src/lib/queries.js`. Las llamadas NEXPLAY usan `nx` (`supabase.schema('public')`). Cada función lanza el error de Supabase.
- Las tablas de Playus existen en `public` **y** en `practica`: cada columna nueva va en los dos esquemas. `intentos`, la vista y las RPC van solo en `public`.
- Las funciones `nx_*` son `security definer set search_path = public`. Validan permisos adentro (`es_admin()` o cuenta `aceptado` con `jugador_id`). Lanzan errores con códigos cortos en snake_case (los lee `codigoDeError`). Las del admin insertan en `auditoria`. Se hace `revoke execute … from public, anon` y `grant execute … to authenticated`.
- Las migraciones se aplican con `apply_migration` (necesita el OK del usuario en el chat) y se guardan en `supabase/migrations/`.
- Tests SQL: archivo en `supabase/tests/`, con el patrón de `nexplay_01_cuentas.sql`: un `do $$ … $$` que termina con `raise exception 'TEST_OK'`. Éxito = el error es exactamente `TEST_OK`.
- Tests JS: script `node` con `node:assert/strict`, sin runner.
- UI: skill `nexplay-design` + `DESIGN.md` (`nx-btn`, `nx-input`, `nx-chip`, `gem-panel`). Mobile-first: se prueba a 390 px y 320 px.
- Mi servidor de pruebas va en `npx vite --port 5199 --strictPort` y lo apago al terminar. El 5173 es del usuario.
- Bonus: `bonus_porcentaje = 5 × (n−1)`. Bonus en puntos = `round(10 × bonus_porcentaje / 100)` (Postgres `round` de numeric redondea 0,5 hacia arriba). Puntos = `10 + 10 × rivales + bonus`. Ausente = 0.

## Review Focus

1. **Un jugador cierra la pestaña a mitad de un intento y vuelve.** Esperado: puede empezar el siguiente, y el viejo queda `interrumpido` y usado. No queda trabado con "ya tenés un intento en curso". Lo cubre Task 3 (test 4).
2. **Alguien manda un resultado imposible por la API** (0 ms, negativo, sin datos, que no cierra con los errores, o de un intento ajeno o ya terminado). Esperado: el intento queda `invalido` con motivo, o la llamada falla, y no aparece en la tabla. Lo cubre Task 3 (tests 5 a 8).
3. **Empate en el mejor resultado.** Esperado: los empatados tienen los mismos rivales superados y los mismos puntos. Lo cubre Task 4 (test 2).
4. **Playus en producción mientras hay una fecha abierta o una temporada de prueba.** Esperado: el selector no la muestra, el museo y los perfiles no cuentan sus fechas, y la temporada por defecto sigue siendo la última con una fecha cerrada. Lo cubre Task 2, que va a producción **antes** de crear datos de prueba.
5. **El admin aprieta "Cerrar fecha" dos veces o "Iniciar fecha" con otra abierta.** Esperado: la segunda llamada falla con un código claro y no duplica nada. Lo cubren Task 1 (test 5) y Task 4 (test 4).

---

### Task 1: Esquema del motor y RPC de temporada y fecha

**Files:**
- Create: `supabase/migrations/20261103_04_nexplay_motor.sql`
- Create: `supabase/tests/nexplay_04_motor.sql`

**Interfaces:**
- Consumes: `es_admin()`, `cuentas`, `auditoria` (etapa 1).
- Produces (en `public` y, salvo que se diga, también en `practica`):
  - `temporadas`: `es_nexplay bool not null default false`, `es_prueba bool not null default false`, `estado text check in ('preparacion','activa','pausada','finalizada')` (null = Playus), `cantidad_fechas int check between 1 and 21`, `reglas jsonb`, `campeon_id uuid → jugadores`.
  - `fechas`: `estado text check in ('abierta','cerrada','cancelada')` (null = Playus), `abierta_en timestamptz`, `cerrada_en timestamptz`, `underdogs uuid[]`. Se reemplaza la constraint `fechas_temporada_id_numero_fecha_key` por `create unique index fechas_numero_unico on fechas(temporada_id, numero_fecha) where estado is distinct from 'cancelada'`.
  - `jugadores`: `es_bot bool not null default false`.
  - `juegos`: `modulo text`, `inactividad_seg int`, `validacion jsonb`. Solo en `public`: `update juegos set modulo='count', validacion='{"min_ms":2500,"penalizacion_ms":100,"tolerancia_ms":1000}' where id='834131a4-aa38-4a1e-b622-020c70560200'`.
  - `records_jugador_juego`: `era text not null default 'playus' check in ('playus','nexplay')` + `create unique index records_era_unico on records_jugador_juego(jugador_id, juego_id, era)`. **La constraint vieja `(jugador_id, juego_id)` se mantiene** hasta Task 8, porque el código de producción todavía hace `onConflict: 'jugador_id,juego_id'`.
  - Solo `public`: tabla `intentos(id uuid pk default gen_random_uuid(), fecha_id uuid not null → fechas on delete cascade, jugador_id uuid not null → jugadores, numero int not null check between 1 and 4, estado text not null default 'en_curso' check in ('en_curso','completado','interrumpido','invalido'), resultado numeric, datos jsonb, semilla int not null, motivo text, empezado_en timestamptz not null default now(), terminado_en timestamptz, repeticion_de uuid → intentos, revision text check in ('pendiente','mantenida','retirada'), revision_motivo text)`. Índice `unique (fecha_id, jugador_id, numero)`. RLS habilitado, policy select `true`, sin políticas de escritura.
  - `nx_crear_temporada(p_nombre text, p_cantidad_fechas int, p_es_prueba boolean default false) returns temporadas`: solo admin. Inserta `es_nexplay = true, estado = 'preparacion'`. Errores: `solo_admin`, `nombre_vacio`, `cantidad_invalida` (fuera de 1..21). Audita `crear_temporada`.
  - `nx_iniciar_temporada(p_temporada_id uuid) returns temporadas`: solo admin. Pasa de `preparacion` a `activa` y congela `reglas = '{"intentos":3,"intentos_underdog":4,"base":10,"por_rival":10,"bonus_pct_por_fecha":5,"tope_repeticiones":1}'`. Errores: `no_en_preparacion`, `ya_hay_temporada_activa` (otra NEXPLAY `activa` o `pausada`). Audita `iniciar_temporada`.
  - `nx_iniciar_fecha(p_temporada_id uuid) returns fechas`: solo admin. Requiere temporada `activa` (`temporada_no_activa`), sin fecha `abierta` (`ya_hay_fecha_abierta`) y con fechas cerradas `< cantidad_fechas` (`temporada_completa`). `n` = cerradas + 1. Sortea con `order by random() limit 1` entre los juegos con `modulo is not null` que no se usaron en fechas `abierta` o `cerrada` de la temporada (`sin_juegos_elegibles`). Inserta `numero_fecha = n, fecha_calendario = current_date, juego_id, bonus_porcentaje = 5*(n-1), estado = 'abierta', abierta_en = now()`. Audita `iniciar_fecha`.

- [ ] **Step 0: Rama y ledger.** `git checkout main && git pull && git checkout -b nexplay-etapa-2`. Crear `.superpowers/sdd/2026-11-03-nexplay-etapa-2-motor/progress.md` y commitear este plan.
- [ ] **Step 1: Escribir `supabase/tests/nexplay_04_motor.sql`.** Como admin (primera cuenta `es_admin`) y como un usuario de prueba insertado en `auth.users` con cuenta `aceptado`:
  1. Un no admin llama a `nx_crear_temporada('X', 1)` y falla con `solo_admin`.
  2. `nx_crear_temporada('', 1)` → `nombre_vacio`. `nx_crear_temporada('T', 22)` → `cantidad_invalida`.
  3. `nx_crear_temporada('T', 1, true)` devuelve `es_nexplay`, `es_prueba` y `estado = 'preparacion'`. `nx_iniciar_fecha` sobre ella → `temporada_no_activa`.
  4. `nx_iniciar_temporada` → `estado = 'activa'`, `reglas->>'intentos' = '3'`. Una segunda temporada creada e iniciada → `ya_hay_temporada_activa`.
  5. `nx_iniciar_fecha` → fecha con `numero_fecha = 1`, `bonus_porcentaje = 0`, `estado = 'abierta'` y `juego_id` = Count!. Volver a llamar → `ya_hay_fecha_abierta`.
  6. `select count(*) from auditoria where accion in ('crear_temporada','iniciar_temporada','iniciar_fecha')` creció en 3.
  7. Insertar una fecha de Playus con el mismo `(temporada_id, numero_fecha)` que una `cancelada` funciona. Con el de una `abierta` falla (unique_violation).
- [ ] **Step 2: Correr el test con `execute_sql`.** Esperado: falla porque las funciones no existen.
- [ ] **Step 3: Escribir la migración** con lo de Interfaces. Pedir el OK del usuario y aplicarla con `apply_migration` (nombre `nexplay_04_motor`).
- [ ] **Step 4: Correr el test.** Esperado: `TEST_OK`. Correr también `nexplay_01_cuentas.sql` y `nexplay_02_escritura.sql` → `TEST_OK`. Revisar con `get_advisors` (security) que no aparezca nada nuevo fuera de las `nx_*` SECURITY DEFINER esperadas.
- [ ] **Step 5: `npm run build`** (sin cambios de código, confirma que nada se rompió) y commit `feat(nexplay): esquema del motor y RPC de temporada y fecha`.

QA del usuario: ninguno visible. Abrir Playus y `npm run dev:practica` y confirmar que se ven igual que antes.

---

### Task 2: Playus ignora lo que no está cerrado ni es real (y se despliega ya)

**Files:**
- Modify: `src/lib/queries.js` (`getTemporadas`, `getFechas`, `getFechaDetalle`, `getFechasTodas`, `getJugadores`, `getRecordsPorJuego`, `upsertRecordHistorico`, `upsertRecordsHistoricos`)
- Modify: `src/App.jsx:51-54` (temporada por defecto)
- Modify: `src/pages/Admin.jsx` (temporadas NEXPLAY en solo lectura; se saca "Nueva temporada")
- Modify: `src/pages/PerfilJugador.jsx` (etiqueta de era en los récords)

**Interfaces:**
- Consumes: columnas de Task 1.
- Produces:
  - `getTemporadas()` excluye `es_prueba = true` y agrega a cada temporada `cerradas: number`: la cantidad de fechas con `estado` null o `'cerrada'`. Se arma con un embed filtrado (`fechas(id)` + `.or('estado.is.null,estado.eq.cerrada', { referencedTable: 'fechas' })`) y `length`.
  - `getFechas`, `getFechaDetalle` y `getFechasTodas` solo devuelven fechas con `estado` null o `'cerrada'`. `getFechasTodas` además excluye las de temporadas `es_prueba` (embed `temporada:temporadas!inner(es_prueba)` + `.eq('temporada.es_prueba', false)`).
  - `getJugadores()` excluye `es_bot`.
  - `getRecordsPorJuego` filtra `era = 'playus'`. Los upserts mandan `era: 'playus'` y siguen con `onConflict: 'jugador_id,juego_id'` hasta Task 8.
  - `App.jsx`: temporada por defecto = la última con `cerradas > 0`. Si ninguna tiene, la última.
  - `Admin.jsx`: si la temporada elegida tiene `es_nexplay`, no se muestran los formularios de fecha, resultados ni récords. En su lugar va un aviso: "Esta temporada se juega en NEXPLAY. Se ve acá, pero se edita desde NEXPLAY." Los premios siguen editables. Se borra el bloque "Nueva temporada" y su estado (R4).
  - Perfil: los récords con `era = 'nexplay'` llevan un chip "NEXPLAY".

- [ ] **Step 1: Hacer los cambios.** `getRanking`, `getEvolucionGemas` y `getNotas` no se tocan: leen `resultados`, que solo se escriben al cerrar una fecha.
- [ ] **Step 2: Verificar con datos dentro de una transacción.** Con `execute_sql`: `begin;` insertar una temporada `es_prueba` y otra NEXPLAY real con una fecha `abierta`. Correr las mismas consultas que arma el cliente (traducidas a SQL), confirmar que no aparecen y hacer `rollback;`.
- [ ] **Step 3: `npm run build`**, y en el 5199: dashboard, historial, museo, un perfil, `/admin` y `npm run dev:practica` sin errores en consola.
- [ ] **Step 4: Commit** `feat(playus): ignorar fechas abiertas, temporadas de prueba y bots; NEXPLAY solo lectura en admin`.
- [ ] **Step 5: Desplegar ya.** Con el OK del usuario: `git checkout main && git merge --ff-only nexplay-etapa-2 && git push`. Así producción filtra antes de que existan datos NEXPLAY. Mirar el deploy con el MCP de Vercel.

QA del usuario (producción):
1. El ranking, el historial, el museo y un perfil se ven igual que ayer.
2. En `/admin`, el formulario "Nueva temporada" ya no está. Cargar y guardar una nota en una fecha vieja sigue funcionando.
3. El récord histórico de un jugador se sigue guardando desde `/admin` (probar con un valor igual al actual, para no cambiar nada).

---

### Task 3: Intentos con validación y tabla provisoria

**Files:**
- Create: `supabase/migrations/20261103_05_nexplay_intentos.sql`
- Create: `supabase/tests/nexplay_05_intentos.sql`

**Interfaces:**
- Consumes: `intentos`, `fechas.estado`, `temporadas.reglas`, `juegos.validacion` (Task 1).
- Produces:
  - `nx_empezar_intento(p_fecha_id uuid) returns table(intento_id uuid, numero int, semilla int, modulo text)`. Requiere una cuenta `aceptado` con `jugador_id` (`no_habilitado`) y la fecha `abierta` (`fecha_no_abierta`). Toma `for update` la fila de la fecha para serializar. Si hay intentos `en_curso` propios en la fecha, los pasa a `interrumpido` con `motivo = 'abandonado'` y `terminado_en = now()`. `numero` = cantidad de intentos propios + 1, y si supera `reglas->>'intentos'` lanza `sin_intentos`. `semilla = floor(random() * 2147483647)::int`.
  - `nx_terminar_intento(p_intento_id uuid, p_resultado numeric, p_datos jsonb) returns intentos`. Errores (lanza, no guarda): `intento_ajeno` (no es del jugador de `auth.uid()`) y `intento_cerrado` (no está `en_curso`). Si pasa, valida según `juegos.modulo`. Para `count`, con `v = juegos.validacion`, `d = p_datos`, `e = (d->>'errores')::int`, `t = (d->>'tiempo_ms')::numeric`:
    - `e`, `t` o `d->>'penalizacion_ms'` nulos o no numéricos → motivo `datos_incompletos`;
    - `e < 0` o `t <= 0` → `datos_incompletos`;
    - `(d->>'penalizacion_ms')::numeric <> e * (v->>'penalizacion_ms')::numeric` o `p_resultado <> t + penalización` → `no_cierra`;
    - `p_resultado < (v->>'min_ms')::numeric` → `demasiado_rapido`;
    - `extract(epoch from now() - empezado_en) * 1000 < t - (v->>'tolerancia_ms')::numeric` → `duracion_imposible`;
    - si pasa todo: `estado = 'completado'`, `resultado = p_resultado`. Si no: `estado = 'invalido'`, `motivo`. En los dos casos se guarda `datos = p_datos` y `terminado_en = now()`.
    - Un módulo sin regla → `invalido` con `modulo_sin_validacion`.
  - Vista `nx_tabla_provisoria` (`with (security_invoker = true)`), una fila por jugador con algún intento en la fecha: `fecha_id, jugador_id, apodo, mejor numeric` (min o max de `resultado` de los `completado` según `juegos.menor_es_mejor`; null si no tiene ninguno), `intentos_usados int` (los que no están `en_curso`), `en_juego bool` (tiene uno `en_curso`). `grant select` a `anon, authenticated`.

- [ ] **Step 1: Escribir `supabase/tests/nexplay_05_intentos.sql`.** Dentro del bloque se crea una temporada y una fecha con las RPC de Task 1, y dos jugadores de prueba con cuenta `aceptado`. Para simular el tiempo se hace `update intentos set empezado_en = now() - interval '10 seconds'` antes de terminar.
  1. Un usuario sin cuenta aceptada → `no_habilitado`.
  2. `nx_empezar_intento` → `numero = 1`, `modulo = 'count'` y semilla no nula.
  3. Terminar con `p_resultado = 4700` y `{"tiempo_ms":4500,"errores":2,"penalizacion_ms":200}` → `completado`, `resultado = 4700`.
  4. Empezar el 2 y, sin terminarlo, empezar el 3 → el 2 queda `interrumpido` (`abandonado`) y el 3 tiene `numero = 3`. Pedir un 4° → `sin_intentos`.
  5. Terminar el 3 con `p_resultado = 2000` y datos que cierran (`tiempo_ms` 2000, 0 errores) → `invalido`, `demasiado_rapido`.
  6. Con resultado 5000 y datos `{"tiempo_ms":4500,"errores":1,"penalizacion_ms":100}` → `invalido`, `no_cierra`.
  7. Con `empezado_en = now()` y `tiempo_ms` 8000 → `invalido`, `duracion_imposible`.
  8. El jugador B termina un intento de A → `intento_ajeno`. A termina un intento ya `completado` → `intento_cerrado`.
  9. `nx_tabla_provisoria` para A: `mejor = 4700`, `intentos_usados = 3`, `en_juego = false`. Los `invalido` no entran en `mejor`.
- [ ] **Step 2: Correrlo.** Falla porque las funciones no existen.
- [ ] **Step 3: Escribir y aplicar la migración** (con el OK del usuario).
- [ ] **Step 4: Correr el test** → `TEST_OK`. Revisar `get_advisors` (security): la vista no debe aparecer como `security_definer_view`.
- [ ] **Step 5: Commit** `feat(nexplay): intentos con validación en el servidor y tabla provisoria`.

QA del usuario: ninguno visible (lo cubre Task 7).

---

### Task 4: Cerrar la fecha (puntos a `resultados` y récords)

**Files:**
- Create: `supabase/migrations/20261103_06_nexplay_cierre.sql`
- Create: `supabase/tests/nexplay_06_cierre.sql`

**Interfaces:**
- Consumes: Tasks 1 y 3.
- Produces: `nx_cerrar_fecha(p_fecha_id uuid) returns fechas`. Solo admin. Fecha `abierta` (si no: `fecha_no_abierta`). Pasos, según §5:
  1. Los `en_curso` que queden pasan a `interrumpido` (`motivo = 'fecha_cerrada'`).
  2. Sala = jugadores de cuentas `aceptado` con `jugador_id`. P = los que tienen al menos un intento `completado` (y `revision` distinta de `retirada`). Su resultado oficial es el mejor según `menor_es_mejor`.
  3. Por cada jugador de P: `rivales` = cantidad de P con un resultado estrictamente peor. `gemas = 10 + 10*rivales + round(10 * bonus_porcentaje / 100.0)`. `performance = to_char(round(mejor/1000.0, 2), 'FM9990.00') || ' Segundos'`. `jugo = true`.
  4. Por cada jugador de la sala fuera de P: `gemas = 0`, `rivales_superados = 0`, `jugo = false`, `performance = null`.
  5. Upsert en `resultados` (`on conflict (fecha_id, jugador_id)`), con `sancionado = false`.
  6. Si la temporada no es `es_prueba`, por cada jugador de P se hace upsert de `records_jugador_juego` con `era = 'nexplay'` (`on conflict (jugador_id, juego_id, era)`). Solo se reemplaza el `valor` si el nuevo es mejor: se compara `split_part(valor, ' ', 1)::numeric`, con el mismo formato que `performance`.
  7. La fecha queda `estado = 'cerrada'`, `cerrada_en = now()` y `sin_jugadores = (P vacío)`. Si `numero_fecha = cantidad_fechas`, la temporada pasa a `finalizada`.
  8. Audita `cerrar_fecha`, con `despues` = filas escritas.

- [ ] **Step 1: Escribir `supabase/tests/nexplay_06_cierre.sql`.** Temporada **no** `es_prueba` de 2 fechas, con 4 jugadores de prueba en la sala. Los intentos se cargan con las RPC de Task 3 o con `update` directo en el test.
  1. Fecha 1 (bonus 0). Resultados A 4000, B 5000, C 6000; D no juega. Esperado: A rivales 2, gemas 30, `performance = '4.00 Segundos'`. B 1 y 20. C 0 y 10. D 0 gemas, `jugo = false`.
  2. Empate en la fecha 2 (bonus 5% → 1): A 4000 y B 4000, C 5000. A y B tienen rivales 1 y gemas 21. C tiene 0 y 11.
  3. Récords `era = 'nexplay'`: A queda en `'4.00 Segundos'`. Si A hace 4500 en la fecha 2, el récord no empeora.
  4. Cerrar la misma fecha dos veces → `fecha_no_abierta`.
  5. Después de cerrar la fecha 2 (la última), la temporada queda `finalizada` y `nx_iniciar_fecha` falla con `temporada_no_activa`.
  6. Con una temporada `es_prueba`, cerrar no escribe récords.
  7. Un intento `en_curso` al cerrar queda `interrumpido`.
- [ ] **Step 2: Correrlo** → falla.
- [ ] **Step 3: Escribir y aplicar la migración** (con el OK del usuario).
- [ ] **Step 4: Correr los tests 04, 05 y 06** → `TEST_OK`.
- [ ] **Step 5: Commit** `feat(nexplay): cierre de fecha con puntos, resultados y récords`.

---

### Task 5: Contrato de estados de las pantallas nuevas

**Files:**
- Create: `docs/superpowers/specs/2026-11-03-nexplay-etapa-2-estados.md`

Con las skills `anti-ui-slop` y `nexplay-design`, y con el mismo formato que `2026-11-02-nexplay-etapa-1-estados.md`. Por cada pantalla: estados (cargando, vacío, error de red, éxito y los propios de cada una), el texto exacto de cada uno y qué hace cada botón. Pantallas:
- **Inicio:** sin temporada · temporada en preparación · activa sin fecha abierta · fecha abierta (con mis intentos y la tabla) · temporada finalizada.
- **Jugar:** ruleta (solo si el jugador todavía no hizo ningún intento en la fecha) → instrucciones → juego → enviando → resultado ("Intento 2 de 3", válido o inválido con su motivo en palabras) → sin intentos.
- **Tabla provisoria:** vacía · con jugadores · "jugando ahora" · se actualiza cada 10 s sin saltar.
- **Admin torneo:** crear temporada (nombre, cantidad de fechas 1–21, "Es de prueba") · iniciar temporada · iniciar fecha · fecha abierta con su tabla · confirmar el cierre · cerrada · finalizada.
- Texto de cada código de error de Tasks 1, 3 y 4, para `textoDeError`.

- [ ] **Step 1: Escribir el contrato** (incluye capturas de baja fidelidad en texto o en el visual companion si ayuda).
- [ ] **Step 2: El usuario lo aprueba.** Recién ahí se empiezan las Tasks 6 y 7.
- [ ] **Step 3: Commit** `docs(nexplay): contrato de estados de la etapa 2`.

---

### Task 6: Count! (módulo del juego)

**Files:**
- Create: `src/nexplay/juegos/count/logica.js`
- Create: `src/nexplay/juegos/count/logica.test.mjs`
- Create: `src/nexplay/juegos/count/index.jsx` (Instrucciones, Juego, export default del contrato)
- Create: `src/nexplay/juegos/index.js` (`export const juegos = { count }`)

**Interfaces:**
- Produces:
  - `armarGrilla(semilla: number) → number[]`: los números del 1 al 16, mezclados con Fisher-Yates sobre mulberry32(semilla). La misma semilla da la misma grilla.
  - `estadoInicial() → { esperado: 1, errores: 0, terminado: false }`.
  - `tocar(estado, numero) → estado`: puro. Si `numero === esperado`, avanza; al tocar el 16 queda `terminado: true`. Si no, suma 1 a `errores`. Si ya terminó, no cambia nada.
  - `armarResultado(tiempo_ms, errores) → { resultado, datos_del_intento: { tiempo_ms, errores, penalizacion_ms } }`, con `penalizacion_ms = 100 * errores`, `resultado = tiempo_ms + penalizacion_ms` y `tiempo_ms` redondeado a entero.
  - Default export según §7: `{ modulo: 'count', tipo_de_resultado: 'MENOR_ES_MEJOR', unidad: 'ms', Instrucciones, Juego }`. `Juego({ semilla, onActividad, onTerminar })` arranca el cronómetro con `performance.now()` en el primer render visible y llama a `onTerminar({ estado: 'completado', resultado, datos_del_intento })` al tocar el 16.
- UI del juego: grilla 4×4 cuadrada (`aspect-square`, ancho `min(100%, 28rem)`), cada celda es un `button` de al menos 64 px con el número grande. Un toque correcto deja la celda apagada y un error la hace sacudir en rubí, con +100 ms visibles. Arriba, el número esperado y el cronómetro. Se usa `onPointerDown` (sin esperar al `click`) y `touch-action: manipulation`. Sin hover.
- Instrucciones (regla 10): objetivo, cómo se juega, qué pasa al errar (+0,1 s), cuándo termina y qué cuenta ("menor tiempo gana"). El texto exacto sale del contrato (Task 5).

- [ ] **Step 1: Escribir `logica.test.mjs`** con `node:assert/strict`:
  - `armarGrilla(42)` tiene 16 elementos, ordenada es `[1..16]` y es igual a `armarGrilla(42)`. `armarGrilla(43)` es distinta.
  - Tocar 1, 5 (error), 2 → `{ esperado: 3, errores: 1, terminado: false }`.
  - Tocar 1..16 en orden → `terminado: true, errores: 0`. Después, `tocar(est, 3)` devuelve el mismo estado.
  - `armarResultado(4500.4, 2)` → `{ resultado: 4700, datos_del_intento: { tiempo_ms: 4500, errores: 2, penalizacion_ms: 200 } }`, el mismo caso del test SQL de Task 3.
- [ ] **Step 2: `node src/nexplay/juegos/count/logica.test.mjs`** → falla (no existe el módulo).
- [ ] **Step 3: Implementar `logica.js`** y correr el test → pasa sin salida de error.
- [ ] **Step 4: Implementar `index.jsx`** y `juegos/index.js`. `npm run build`.
- [ ] **Step 5: Commit** `feat(nexplay): módulo Count!`.

QA del usuario: va en Task 7 (todavía no hay pantalla que lo muestre).

---

### Task 7: Pantallas del torneo (admin y jugador)

**Files:**
- Modify: `src/lib/queries.js` (sección NEXPLAY)
- Modify: `src/nexplay/componentes.jsx` (`textoDeError`: textos de los códigos nuevos)
- Modify: `src/nexplay/NexplayApp.jsx` (rutas)
- Modify: `src/nexplay/pages/Inicio.jsx`
- Create: `src/nexplay/pages/Jugar.jsx`, `src/nexplay/pages/AdminTorneo.jsx`, `src/nexplay/TablaProvisoria.jsx`, `src/nexplay/Ruleta.jsx`

**Interfaces:**
- Consumes: RPC y vista de Tasks 1, 3 y 4; `juegos` de Task 6; contrato de Task 5.
- Produces (queries.js, todas con `nx`):
  - `getTorneoActual() → { temporada, fecha } | { temporada: null, fecha: null }`: la temporada `es_nexplay` más reciente (por `created_at`) con su fecha `abierta` (con `juego:juegos(id, nombre, modulo)`), si hay.
  - `getTablaProvisoria(fechaId)` → filas de la vista.
  - `getMisIntentos(fechaId, jugadorId)` → intentos propios, ordenados por `numero`.
  - `getJuegosJugables()` → `juegos` con `modulo` no nulo (`id, nombre`), para la ruleta.
  - `crearTemporadaNexplay({ nombre, cantidadFechas, esPrueba })`, `iniciarTemporada(id)`, `iniciarFecha(temporadaId)`, `cerrarFecha(fechaId)`, `empezarIntento(fechaId)` (devuelve la primera fila), `terminarIntento(intentoId, resultado, datos)`.
- Rutas: `/` Inicio, `/jugar` Jugar (solo con una fecha abierta, si no redirige a `/`), `/admin` Jugadores, `/admin/torneo` AdminTorneo (solo admin). En Inicio, el admin ve los enlaces a Jugadores y Torneo.
- `TablaProvisoria({ fechaId, menorEsMejor })`: consulta cada 10 s con `setInterval` y lo limpia al desmontar. Ordena por `mejor` (los null al final), muestra el puesto (los empatados comparten puesto), el apodo, el mejor resultado en segundos con 2 decimales, "Intentos x/3" y el chip "jugando" si `en_juego`. Cuando refresca deja la tabla anterior a la vista (no la reemplaza por un spinner).
- `Ruleta({ juegos, elegido, onFin })`: gira por los nombres unos 2,5 s, desacelera, frena en `elegido` y llama a `onFin`. Con `prefers-reduced-motion` muestra el elegido directo.
- `Jugar`: máquina de estados `ruleta → instrucciones → jugando → enviando → resultado`. "Jugar intento" llama a `empezarIntento` **al tocar el botón de arranque** (no al cargar la página), así la duración del servidor incluye todo el juego. Si `terminarIntento` falla por red, se ofrece reintentar el envío con el mismo resultado.

- [ ] **Step 1: Queries y textos de error.**
- [ ] **Step 2: AdminTorneo.** `npm run build`. En el 5199, como admin, crear en `public` una temporada **de prueba** de 1 fecha (producción ya filtra desde Task 2), iniciarla, iniciar la fecha y ver que sale Count!. **No cerrarla.**
- [ ] **Step 3: Inicio, Jugar, Ruleta y TablaProvisoria.** `npm run build`. Con el admin vinculado: ruleta → instrucciones → jugar los 3 intentos → la tabla muestra el mejor.
- [ ] **Step 4: Capturas a 390 y 320 px** (Chrome con la extensión o Edge headless con el arnés de iframe del kickoff) del Inicio con la fecha abierta, la grilla de Count!, el resultado y AdminTorneo. Comparar con el contrato.
- [ ] **Step 5: Borrar los datos de la prueba local** (temporada, fecha, intentos y auditoría de esa temporada), con la lista y el OK del usuario. Apagar el 5199.
- [ ] **Step 6: Commit** `feat(nexplay): torneo del admin, ruleta, Count! y tabla provisoria`.

QA del usuario (en `npm run dev`, en la PC y en el celu con la IP local):
1. Como admin: Torneo → crear "Prueba QA" (1 fecha, de prueba) → iniciar → iniciar fecha → sale Count!.
2. Inicio muestra la fecha abierta. Jugar → la ruleta frena en Count! → las instrucciones se entienden → jugar.
3. Errar a propósito: se ve la penalización. Al terminar dice "Intento 1 de 3" y el tiempo.
4. Cerrar la pestaña en medio del intento 2, volver, y el próximo es el intento 3.
5. Después del 3°: "Ya usaste tus 3 intentos" y la tabla con tu mejor.
6. La grilla entra entera a 320 px de ancho, sin scroll.
7. Avisame y borro los datos de "Prueba QA".

---

### Task 8: Revisión, deploy y prueba de punta a punta

**Files:**
- Create: `supabase/migrations/20261103_07_nexplay_records_contract.sql` (`alter table … drop constraint records_jugador_juego_jugador_id_juego_id_key` en `public` y en `practica`)
- Modify: `src/lib/queries.js` (los dos upserts de récords pasan a `onConflict: 'jugador_id,juego_id,era'`)
- Create: `.superpowers/sdd/2026-11-03-nexplay-etapa-2-motor/progress.md` (ledger; se va llenando desde la Task 1)

- [ ] **Step 1: Revisión de código** con el agente `pro-workflow:reviewer` sobre `main..nexplay-etapa-2`. Corregir lo que se confirme y hacer commit.
- [ ] **Step 2: Contract de récords.** Cambiar el `onConflict` y aplicar la migración 07 (con el OK del usuario) **en el mismo momento** del merge: primero el merge y push, y apenas Vercel termina de desplegar, la migración. Probar en producción guardar un récord desde `/admin`.
- [ ] **Step 3: Prueba de punta a punta en producción** con el admin y las 3 cuentas de prueba:
  1. El admin crea una invitación y las 3 cuentas entran con Google. El admin las acepta y crea los jugadores "Prueba 1", "Prueba 2" y "Prueba 3".
  2. El admin crea "Prueba etapa 2" (1 fecha, de prueba), la inicia e inicia la fecha.
  3. Los 4 juegan sus intentos desde distintos dispositivos y ven la tabla cada 10 s. Uno juega solo 1 intento.
  4. El admin cierra la fecha. Esperado: puntos según §5, la temporada `finalizada` y ningún récord escrito (es de prueba).
  5. Verificar el ranking de Playus: con OK, `update temporadas set es_prueba = false` → la temporada aparece en el selector con los puntos correctos → volver a `es_prueba = true`.
- [ ] **Step 4: Limpieza.** Mostrar al usuario la lista de lo que se borra (ids y conteos) y, con su OK, borrar los resultados, intentos, la fecha, la temporada, la auditoría de esas entidades, las cuentas de prueba (y sus usuarios de `auth.users`) y los jugadores "Prueba N". Verificar con conteos que quedó como antes.
- [ ] **Step 5: Memoria y ledger.** Actualizar `nexplay-proposal` (etapa 2 hecha y cómo arranca la etapa 3) y cerrar el ledger.

QA del usuario: los pasos 3.1 a 3.5 (los hacemos juntos).
