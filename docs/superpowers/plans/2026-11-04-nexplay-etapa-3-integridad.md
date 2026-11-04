# NEXPLAY Etapa 3 — Integridad: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una temporada NEXPLAY real corra sola (las fechas se abren y se cierran a las 22:00 de Argentina) con práctica y colchón, Underdog, resultados que llegan sin conexión, revancha, herramientas del admin auditadas, y que termine con su campeón y desempate.

**Architecture:** La lógica sigue en funciones Postgres `security definer`. Las funciones **internas** (`nx__*`, sin `grant` a ningún rol de cliente) tienen la lógica. Las llaman el reloj (`nx_tick`, vía `pg_cron`) y los envoltorios RPC (`nx_*`), que chequean permisos. El cliente deja de saber las reglas: le pregunta al servidor su estado en la fecha (`nx_mi_fecha`). Los resultados terminados se guardan en `localStorage` hasta que el servidor los confirma.

**Tech Stack:** React 18, React Router 6, Vite 5, Tailwind, Supabase (Postgres + `pg_cron` + Auth Google), proyecto `qzeqjaxyeezqdycgzymq`.

**Spec:** `docs/superpowers/specs/2026-11-04-nexplay-etapa-3-integridad-design.md` (aprobada 2026-11-04). Base: `docs/superpowers/specs/2026-11-01-nexplay-design.md` §5. Lo que quedó de la etapa 2: migraciones `supabase/migrations/20261103_04` a `07` y ledger `.superpowers/sdd/2026-11-03-nexplay-etapa-2-motor/progress.md`.

## Global Constraints

- El texto de UI y los identificadores van en español.
- Todo acceso a datos pasa por `src/lib/queries.js`, con `nx` para NEXPLAY. Cada función lanza el error de Supabase.
- Las columnas nuevas de tablas de Playus (`temporadas`) van en `public` **y** en `practica`. `intentos`, la vista y las funciones van solo en `public`.
- Los RPC `nx_*` son `security definer set search_path = public`: validan permisos adentro, lanzan códigos snake_case, auditan, `revoke execute … from public, anon` y `grant execute … to authenticated`.
- Las funciones internas `nx__*` y `nx_tick` son `security definer set search_path = public` con `revoke execute … from public, anon, authenticated` (solo `postgres`). Auditan con `admin_user_id = auth.uid()` (null desde el cron) y `accion` con prefijo `auto_` cuando las llama el tick.
- Las migraciones se aplican con `apply_migration`, **solo con el OK del usuario en el chat**, y se guardan en `supabase/migrations/20261104_NN_*.sql`. Antes de pedir el OK se hace una prueba en seco: `begin; <migración>; <test>; rollback;` con `execute_sql`, igual que en la etapa 2.
- Tests SQL: van en `supabase/tests/nexplay_NN_*.sql`, con el patrón de `nexplay_06_cierre.sql`: un bloque `do $$ … $$` que termina con `raise exception 'TEST_OK'`. Para simular el paso del tiempo se hace `update` de `abierta_en`, `cerrada_en` y `empezado_en` como `postgres`.
- Tests JS: un script `node` con `node:assert/strict`, sin runner.
- UI: skill `nexplay-design` + `DESIGN.md`. Mobile-first, a 390 px y 320 px.
- Mi servidor de pruebas: `npx vite --port 5199 --strictPort`, y lo apago al terminar.
- Valores fijos de la spec:
  - tick a las 01:00 UTC (`'0 1 * * *'`) = 22:00 de Argentina;
  - la fecha dura 24 h;
  - margen para resultados tardíos: 2 h desde `cerrada_en`;
  - la revancha va de `cerrada_en` a `cerrada_en + 24 h`;
  - intentos: `reglas->>'intentos'` (3) o `reglas->>'intentos_underdog'` (4) si `jugador_id = any(fechas.underdogs)`;
  - la práctica es `numero = 0`, y el colchón cubre solo los números 1 y 2;
  - puntos = `10 + 10 × rivales + round(10 × bonus_porcentaje / 100)`.
- Las temporadas reales solo se mueven con el tick. `nx_iniciar_fecha` y `nx_cerrar_fecha` manuales solo funcionan en temporadas `es_prueba` (error `solo_prueba`).

## Review Focus

1. **El tick corre dos veces el mismo día** (reintento del cron o llamada manual). Esperado: no cierra una fecha recién abierta ni abre dos. → Task 3, test 5.
2. **Un resultado tardío llega a las 2 h 01 min del cierre, y otro a la 1 h 59 min.** Esperado: el primero falla con `fuera_de_plazo`. El segundo recalcula los puntos de la fecha y no toca los `underdogs` de la fecha siguiente. → Task 2, tests 4 y 5.
3. **Usos indebidos de la práctica y el colchón:** abusar dos veces del colchón, practicar después de empezar el intento 2 o cortar el intento 3. Esperado: el colchón cubre una sola vez, la práctica da `sin_practica` y el intento 3 se pierde. → Task 1, tests 3 a 6.
4. **Revancha indebida:** en la última fecha, de alguien que jugó, una segunda vez o pasadas las 24 h. Esperado: `sin_revancha` en todos los casos. → Task 5, test 1.
5. **Corrección en una temporada finalizada que cambia al campeón.** Esperado: `temporadas.campeones` se recalcula y Playus muestra al nuevo. → Task 4, test 3, y Task 6.

---

### Task 1: Práctica, colchón, Underdog en los intentos y estado del jugador

**Files:**
- Create: `supabase/migrations/20261104_08_nexplay_intentos_e3.sql`
- Create: `supabase/tests/nexplay_08_intentos_e3.sql`

**Interfaces:**
- Consumes: `intentos`, `fechas.underdogs`, `temporadas.reglas` (etapa 2).
- Produces:
  - `intentos.numero check between 0 and 4`. `intentos.es_revancha boolean not null default false`. El índice único `(fecha_id, jugador_id, numero)` pasa a ser parcial: `where motivo is distinct from 'colchon'`.
  - `temporadas.campeones uuid[]` (en `public` y `practica`).
  - **Práctica usada** = existe un intento propio con `numero = 0` o con `motivo = 'colchon'`.
  - **Usados** = intentos propios con `numero between 1 and 4`, `not es_revancha` y `motivo is distinct from 'colchon'`.
  - `nx_empezar_intento(p_fecha_id uuid, p_practica boolean default false) returns table(intento_id uuid, numero int, semilla int, modulo text)`. Reemplaza a la de la etapa 2; se hace `drop` de la firma vieja.
    1. Los `en_curso` propios no revancha pasan a `interrumpido`. Si su `numero in (1,2)` y la práctica no se usó, el motivo es `'colchon'` (el número queda libre). Si no, `'abandonado'`.
    2. Con `p_practica`: lanza `sin_practica` si la práctica ya se usó o si ya existe un intento propio con `numero >= 2`. Si no, inserta `numero = 0`.
    3. Sin `p_practica`: `max` = 4 si es Underdog, si no 3. Lanza `sin_intentos` si usados ≥ max. Si no, inserta `numero = usados + 1` con semilla nueva.
  - `nx_mi_fecha(p_fecha_id uuid) returns jsonb` para el jugador de `auth.uid()`: `{ "intentos_max": int, "usados": int, "underdog": bool, "practica": "disponible"|"usada"|"cerrada", "colchon_usado": bool }`. `"cerrada"` significa que no se usó pero ya hay un intento con número ≥ 2.
  - Vista `nx_tabla_provisoria`: `mejor` e `intentos_usados` solo cuentan intentos con `numero between 1 and 4 and not es_revancha and motivo is distinct from 'colchon'`. `en_juego` no cambia.
  - `nx_terminar_intento` acepta la práctica con la misma validación. Su resultado no entra en la tabla ni en el cierre.

- [ ] **Step 0: Rama y ledger.** `git checkout main && git pull && git checkout -b nexplay-etapa-3`. Crear `.superpowers/sdd/2026-11-04-nexplay-etapa-3-integridad/progress.md`. Commitear la spec y este plan.
- [ ] **Step 1: Escribir `supabase/tests/nexplay_08_intentos_e3.sql`.** Usa una temporada `es_prueba` con su fecha abierta y jugadores con cuenta `aceptado`, como en `nexplay_06_cierre.sql`:
  1. Práctica antes del 1: `nx_empezar_intento(f, true)` → `numero = 0`. Una segunda práctica → `sin_practica`.
  2. `nx_mi_fecha` después de la práctica → `practica = 'usada'`, `usados = 0`, `intentos_max = 3`, `underdog = false`.
  3. Colchón (otro jugador, sin práctica): empieza el 1 y vuelve a empezar → el viejo queda `interrumpido`/`colchon`, el nuevo tiene `numero = 1`, y `nx_mi_fecha` da `colchon_usado = true`, `practica = 'usada'`, `usados = 0`. Empieza el 2 y vuelve a empezar → el viejo queda `abandonado` y el nuevo es el `numero = 3`.
  4. Colchón en el 2: empieza el 1, lo termina válido, empieza el 2 y vuelve a empezar → `colchon`, y el nuevo es `numero = 2`.
  5. Sin colchón en el 3: usa la práctica, juega 1 y 2, empieza el 3 y vuelve a empezar → el 3 queda `abandonado`. El siguiente pedido → `sin_intentos`.
  6. Práctica después del 2: empieza 1 y 2, y `nx_empezar_intento(f, true)` → `sin_practica`. `nx_mi_fecha` → `practica = 'cerrada'`.
  7. Underdog: con `update fechas set underdogs = array[jid]`, ese jugador llega al `numero = 4` y el quinto da `sin_intentos`. `nx_mi_fecha` → `intentos_max = 4`, `underdog = true`.
  8. Tabla: un jugador con práctica 3000 (completada) y un intento 1 de 5000 → `mejor = 5000`, `intentos_usados = 1`.
- [ ] **Step 2: Prueba en seco** (`begin;` test `rollback;` sin la migración). Esperado: falla en el caso 1.
- [ ] **Step 3: Escribir la migración.** Prueba en seco migración + test → `TEST_OK`. Pedir el OK y aplicarla (`nexplay_08_intentos_e3`). Volver a correr el test real y también `nexplay_05_intentos.sql` y `nexplay_06_cierre.sql` → `TEST_OK`, ajustando en esos tests solo lo que cambió a propósito (anotarlo en el ledger).
- [ ] **Step 4: Commit** `feat(nexplay): práctica, colchón y Underdog en los intentos`.

---

### Task 2: Cierre interno, recálculo, resultados tardíos y campeón

**Files:**
- Create: `supabase/migrations/20261104_09_nexplay_cierre_e3.sql`
- Create: `supabase/tests/nexplay_09_cierre_e3.sql`

**Interfaces:**
- Consumes: Task 1 (intentos que cuentan, `campeones`).
- Produces:
  - `nx__calcular_fecha(p_fecha_id uuid) returns void`: es el cálculo de puntos, `resultados` y récords de `nx_cerrar_fecha` de la etapa 2 (`20261103_06`).
    - Solo cuenta intentos `completado` con `numero between 1 and 4` y `not es_revancha`.
    - **No toca** las filas de `resultados` de jugadores con un intento `es_revancha` y `motivo = 'revancha_ganada'` en esa fecha.
    - La regla de récords no cambia (solo mejoran) y solo aplica si la temporada no es `es_prueba`.
  - `nx__campeones(p_temporada_id uuid) returns uuid[]`: el ranking es la suma de `gemas` de las fechas `cerradas`. Desempate:
    1. Más victorias (puesto 1 por `rivales_superados` y después `gemas`, igual que `puestoEnFecha` de `src/lib/fecha.js`).
    2. Mini liga entre los empatados: duelos ganados en las fechas donde ambos tienen `jugo`, comparando como `compararEnFecha`.
    3. Si persiste, devuelve todos los empatados.
  - `nx__cerrar_fecha(p_fecha_id uuid) returns fechas`:
    1. Pasa los `en_curso` a `interrumpido`/`fecha_cerrada`.
    2. Llama a `nx__calcular_fecha`.
    3. Pone `estado = 'cerrada'`, `cerrada_en = now()` y `sin_jugadores`.
    4. Si `numero_fecha >= cantidad_fechas`, la temporada pasa a `finalizada` con `campeones = nx__campeones(...)` y `campeon_id = campeones[1]` (compatibilidad).
    5. Audita `cerrar_fecha`, o `auto_cerrar_fecha` si `auth.uid()` es null.
  - `nx__recalcular_fecha(p_fecha_id uuid) returns void`: llama a `nx__calcular_fecha` y, si la temporada está `finalizada`, actualiza `campeones` y `campeon_id`.
  - `nx_cerrar_fecha(p_fecha_id)` (RPC) lanza `solo_admin`, `fecha_no_abierta` o `solo_prueba` (si la temporada no es `es_prueba`), y llama a `nx__cerrar_fecha`.
  - `nx_terminar_intento` acepta también un intento `interrumpido` con `motivo = 'fecha_cerrada'` si `now() <= fechas.cerrada_en + interval '2 hours'`, y después llama a `nx__recalcular_fecha`. Pasado el plazo lanza `fuera_de_plazo`. Cualquier otro estado lanza `intento_cerrado`, como antes.

- [ ] **Step 1: Escribir `supabase/tests/nexplay_09_cierre_e3.sql`.** Con una temporada `es_prueba` de 2 fechas e intentos insertados como `postgres`:
  1. `nx_cerrar_fecha` en una temporada real → `solo_prueba`.
  2. La práctica de 1000 no gana: A 4000 (n.º 1), B práctica 1000 + 5000 (n.º 1) → A tiene 20 gemas y B 10.
  3. Un intento `en_curso` al cerrar queda `fecha_cerrada`.
  4. Tardío dentro del plazo: con `cerrada_en = now() - 1h59m`, `nx_terminar_intento` de C con un valor válido mejor que el de A → C queda `completado` y los `resultados` de la fecha se recalculan (C con 2 rivales). Los `underdogs` de la fecha 2 abierta no cambian.
  5. Tardío fuera del plazo: con `cerrada_en = now() - 2h01m` → `fuera_de_plazo`.
  6. Una fila de revancha ganada (intento `es_revancha`, `revancha_ganada`, con su fila en `resultados`) no cambia después de `nx__recalcular_fecha`.
  7. Campeón y desempate:
     - Puntos iguales y más victorias → gana el de más victorias.
     - Puntos y victorias iguales, y A le ganó a B en la única fecha que jugaron juntos → `campeones = {A}`.
     - Empate total → `campeones = {A,B}`.
     - Al cerrar la última fecha → `finalizada`.
- [ ] **Step 2: Prueba en seco sin migración.** Esperado: falla.
- [ ] **Step 3: Migración.** Prueba en seco migración + test → `TEST_OK`, OK del usuario y aplicar (`nexplay_09_cierre_e3`). Test real → `TEST_OK`. Volver a correr `nexplay_06_cierre.sql` (ajustado a `es_prueba` si hace falta, y anotarlo en el ledger) y `nexplay_08` → `TEST_OK`.
- [ ] **Step 4: Commit** `feat(nexplay): cierre interno, recálculo, resultados tardíos y campeón`.

---

### Task 3: Apertura con Underdog y reloj diario

**Files:**
- Create: `supabase/migrations/20261104_10_nexplay_reloj.sql`
- Create: `supabase/tests/nexplay_10_reloj.sql`

**Interfaces:**
- Consumes: `nx__cerrar_fecha` (Task 2).
- Produces:
  - `nx__abrir_fecha(p_temporada_id uuid) returns fechas` (null si no abre). Es la apertura de `nx_iniciar_fecha` de la etapa 2 (`20261103_04`) más dos cosas:
    - Si `n >= 2`, pone `underdogs` = jugadores con cuenta `aceptado` y `jugador_id`, que tienen el menor total de `gemas` en las fechas `cerradas` de la temporada (0 si no tienen ninguna). Si hay empate, entran todos.
    - Si no hay juegos elegibles, la temporada pasa a `pausada`, audita `auto_sin_juegos` y devuelve null.
  - `nx_iniciar_fecha(p_temporada_id)` (RPC) lanza `solo_admin`, `solo_prueba`, `temporada_no_activa`, `ya_hay_fecha_abierta`, `temporada_completa` o `sin_juegos_elegibles` (si `nx__abrir_fecha` devuelve null), y si no, llama a `nx__abrir_fecha`.
  - `nx_tick() returns void`. Para cada temporada `es_nexplay and not es_prueba and estado in ('activa','pausada')`:
    1. Cierra la fecha `abierta` si `abierta_en <= now() - interval '23 hours'`.
    2. Si queda `activa`, no hay fecha `abierta` y hay menos de `cantidad_fechas` cerradas, llama a `nx__abrir_fecha`.
    3. Toma `pg_advisory_xact_lock(hashtext('nx_tick'))` al empezar.
  - `create extension if not exists pg_cron;` y `select cron.schedule('nx_tick', '0 1 * * *', 'select public.nx_tick()');`.

- [ ] **Step 1: Escribir `supabase/tests/nexplay_10_reloj.sql`.** Temporada **real** (`es_prueba = false`) de 3 fechas, iniciada. Llama a `nx_tick()` como `postgres`:
  1. El primer tick abre la Fecha 1 sin `underdogs`.
  2. `nx_iniciar_fecha` y `nx_cerrar_fecha` del admin en esta temporada → `solo_prueba`.
  3. Con `abierta_en = now() - 24h`, intentos de A y B y C sin jugar, el tick cierra la 1 y abre la 2 con `underdogs = {C}`, `bonus_porcentaje = 5` y un juego distinto. Para eso, el test habilita dentro de la transacción un segundo juego con `modulo`, como en la etapa 2 Task 4.
  4. Empate en el último puesto → los dos en `underdogs`.
  5. Un segundo tick inmediato no cambia nada: la 2 sigue abierta y no hay fechas nuevas.
  6. Pausada: con `abierta_en` vencida, el tick cierra y no abre. Al reanudar (`update estado = 'activa'`), el tick siguiente abre.
  7. Sin juegos elegibles: el tick deja la temporada `pausada` y audita `auto_sin_juegos`.
  8. Al cerrar la última fecha la temporada queda `finalizada` con `campeones`, y el tick siguiente no hace nada.
  9. Las temporadas `es_prueba` no se tocan.
- [ ] **Step 2: Prueba en seco sin migración.** Esperado: falla.
- [ ] **Step 3: Migración.** Prueba en seco con todo **menos** el `cron.schedule`. Pedir el OK al usuario, aclarando que habilita `pg_cron`. Aplicar (`nexplay_10_reloj`). Test real → `TEST_OK`. Verificar que `select jobname, schedule from cron.job` muestre `nx_tick | 0 1 * * *`. Confirmar que no hay temporadas NEXPLAY reales activas (`select count(*) from temporadas where es_nexplay and not es_prueba and estado in ('activa','pausada')` = 0).
- [ ] **Step 4: Commit** `feat(nexplay): apertura con Underdog y reloj diario`.

---

### Task 4: Herramientas del admin

**Files:**
- Create: `supabase/migrations/20261104_11_nexplay_admin_e3.sql`
- Create: `supabase/tests/nexplay_11_admin_e3.sql`

**Interfaces:**
- Consumes: `nx__recalcular_fecha` (Task 2).
- Produces (todas son solo para el admin, lanzan `solo_admin` y `motivo_vacio` si el motivo viene vacío o en blanco, y auditan con `antes`, `despues` y `motivo`):
  - `nx_cancelar_fecha(p_fecha_id uuid, p_motivo text) returns fechas`: solo sobre una fecha `abierta` (si no, `fecha_no_abierta`). Pasa los `en_curso` a `interrumpido`/`fecha_cancelada` y deja `estado = 'cancelada'`, `cerrada_en = now()`.
  - `nx_corregir_resultado(p_intento_id uuid, p_nuevo numeric, p_motivo text) returns intentos`: sobre un intento `completado` o `invalido` (si no, `no_corregible`). Pone `estado = 'completado'`, `resultado = p_nuevo` y `motivo = 'corregido'`. Si la fecha está `cerrada`, llama a `nx__recalcular_fecha`.
  - `nx_pausar(p_temporada_id uuid, p_motivo text)` pasa de `activa` a `pausada`, y `nx_reanudar(p_temporada_id uuid)` hace lo contrario. Si el estado no es el esperado, lanzan `estado_invalido`. Las dos devuelven `temporadas`.
  - Tabla `temporada_juegos_excluidos(temporada_id uuid → temporadas on delete cascade, juego_id uuid → juegos, primary key (temporada_id, juego_id))` (solo `public`, select público, sin escritura directa). `nx_excluir_juego(p_temporada_id uuid, p_juego_id uuid, p_excluir boolean) returns void` funciona solo con la temporada en `preparacion` (si no, `estado_invalido`), no pide motivo y audita `excluir_juego`. `nx__abrir_fecha` (Task 3) filtra estos juegos: el `create or replace` va en esta migración.

- [ ] **Step 1: Escribir `supabase/tests/nexplay_11_admin_e3.sql`:**
  1. No admin → `solo_admin`. Motivo `'  '` → `motivo_vacio`.
  2. Cancelar la abierta: queda `cancelada`, su `en_curso` queda `fecha_cancelada`, y el próximo `nx__abrir_fecha` reutiliza el `numero_fecha` y el `bonus_porcentaje` y puede volver a sortear su juego.
  3. Corregir en una temporada finalizada (1 fecha, A ganó): corregir el intento de B a un valor mejor deja a B con más gemas y `campeones = {B}`, con auditoría `corregir_resultado` (con `antes` y `despues`).
  4. Pausar y reanudar cambian el estado, una segunda pausa da `estado_invalido`, y `nx_empezar_intento` sigue funcionando en la fecha abierta mientras está pausada.
  5. Excluir: con dos juegos jugables (habilitados en la transacción) y uno excluido en `preparacion`, `nx__abrir_fecha` siempre sortea el otro. Excluir con la temporada `activa` da `estado_invalido`.
- [ ] **Step 2: Prueba en seco sin migración**, después **migración** (prueba en seco, OK, aplicar `nexplay_11_admin_e3`) y test real → `TEST_OK`.
- [ ] **Step 3: Commit** `feat(nexplay): cancelar, corregir, pausar y reanudar`.

---

### Task 5: Revancha

**Files:**
- Create: `supabase/migrations/20261104_12_nexplay_revancha.sql`
- Create: `supabase/tests/nexplay_12_revancha.sql`

**Interfaces:**
- Consumes: Tasks 1 y 2.
- Produces:
  - `nx_empezar_revancha(p_fecha_id uuid) returns table(intento_id uuid, numero int, semilla int, modulo text)`. Lanza `sin_revancha` si alguna de estas cosas no se cumple:
    - la fecha está `cerrada`;
    - `now() < cerrada_en + 24h`;
    - `numero_fecha < cantidad_fechas`;
    - `not sin_jugadores`;
    - el jugador no tiene intentos con `numero between 1 and 4` en la fecha;
    - no tiene un intento `es_revancha` previo.

    Inserta `numero = 1, es_revancha = true` con semilla nueva.
  - `nx_mi_revancha() returns jsonb`: para el jugador de `auth.uid()`, devuelve la revancha disponible o null: `{ "fecha_id", "numero_fecha", "juego", "a_superar": numeric, "termina_en": timestamptz }`. `a_superar` es el mejor resultado de la fecha, contando intentos válidos y revanchas ganadas.
  - `nx_terminar_intento` con `es_revancha`:
    - Valida igual que siempre.
    - Si queda `completado` y supera **estrictamente** a `a_superar`: `motivo = 'revancha_ganada'`. Hace upsert en `resultados` con `rivales_superados = |P| − 1`, `gemas = 10 + 10 × (|P| − 1) + bonus`, `jugo = true` y `performance` con el formato de `nx__calcular_fecha`, donde |P| = cantidad de `resultados.jugo` de la fecha sin contar revanchas ganadas. Actualiza el récord `nexplay` si mejora y no es prueba. Audita `auto_revancha_ganada`.
    - Si no lo supera: `motivo = 'revancha_perdida'` y no toca `resultados`.
    - Si llega después de `cerrada_en + 24h`: `fuera_de_plazo`.
    - Una revancha `en_curso` que se abandona no tiene colchón.

- [ ] **Step 1: Escribir `supabase/tests/nexplay_12_revancha.sql`.** Temporada `es_prueba` de 2 fechas. En la Fecha 1, A 4000 y B 5000 (|P| = 2, bonus 0) y C no jugó:
  1. `sin_revancha` para B (jugó), para C pasadas 24 h, para C en la última fecha, para C en una fecha `sin_jugadores` y para C la segunda vez.
  2. C 3500 → `revancha_ganada`, con `rivales_superados = 1`, `gemas = 20` y `jugo`. A sigue con 20 gemas. Con `puestoEnFecha`, A y C quedan en el puesto 1 (comprobado en SQL: los dos con 1 rival y 20 gemas).
  3. D (no jugó) 3600 → `revancha_perdida`, porque `a_superar` ya es 3500 por la de C. Sin fila nueva en `resultados` para D, o con su fila `jugo = false` intacta.
  4. `nx_mi_revancha` para D antes de jugar → `a_superar = 3500` después de la de C, y null después de usarla.
- [ ] **Step 2: Prueba en seco sin migración**, después **migración** (prueba en seco, OK, aplicar `nexplay_12_revancha`) y test real → `TEST_OK`. Volver a correr los tests 08 a 11 → `TEST_OK`.
- [ ] **Step 3: Commit** `feat(nexplay): revancha`.

---

### Task 6: Playus muestra el campeón de NEXPLAY

**Files:**
- Modify: `src/lib/queries.js` (`getTemporadas` suma `campeones` al select)
- Modify: `src/lib/premios.js` (premio `campeon`), `src/lib/museo.js:23-36` (salón de honor)
- Test: `src/lib/campeones.test.mjs`

**Interfaces:**
- Consumes: `temporadas.campeones` (Task 1, la llena Task 2).
- Produces:
  - `campeonesDe(temporada, ranking) → jugador_id[]`, exportada desde `src/lib/premios.js`. Si `temporada.campeones?.length`, los devuelve. Si no, devuelve el primero de `ranking`, como hoy.
  - El premio `campeon` y el salón de honor del museo la usan. Con varios campeones, cada uno recibe el título.

- [ ] **Step 1: Test** `node src/lib/campeones.test.mjs`. Casos:
  - `campeonesDe({campeones:['b']}, [{jugador_id:'a'}])` da `['b']`.
  - `campeonesDe({campeones:null}, [{jugador_id:'a'}])` da `['a']`.
  - `campeonesDe({campeones:['a','b']}, …)` da los dos.

  Correrlo → falla.
- [ ] **Step 2: Implementar y usarla** en `premios.js` y `museo.js`. Test → `ok`. `npm run build` → ok.
- [ ] **Step 3: En el 5199,** Premios, Museo y un perfil de una temporada vieja se ven igual que en producción.
- [ ] **Step 4: Commit** `feat(playus): campeón de NEXPLAY desde temporadas.campeones`.

---

### Task 7: Contrato de estados de las pantallas de la etapa 3

**Files:**
- Create: `docs/superpowers/specs/2026-11-04-nexplay-etapa-3-estados.md`

Cubre las pantallas de spec §4, con los estados de cada una (cargando, error de red, vacío, cada caso de las reglas), los textos exactos y qué pasa a 320 px.

**Jugador, Inicio con fecha abierta:**
- cuenta regresiva al cierre;
- Práctica disponible, usada o cerrada;
- "Intento k de 3/4" e insignia Underdog;
- aviso "El colchón te salvó el intento k";
- sin intentos.

**Jugador, resultado pendiente:** guardado en el dispositivo, enviando, enviado, fuera de plazo.

**Revancha:** disponible (a superar y tiempo restante), jugando, ganada, perdida.

**Inicio sin fecha:** "Próxima fecha hoy/mañana a las 22:00", temporada pausada, temporada finalizada con campeón o campeones.

**Admin:**
- pausar y reanudar;
- cancelar con motivo (con confirmación);
- corregir un intento con motivo;
- auditoría;
- en temporadas de prueba, los botones manuales de iniciar y cerrar.

- [ ] **Step 1: Escribir el contrato** con el skill `nexplay-design`.
- [ ] **Step 2: Aprobación del usuario.** Esperar el OK antes de Task 8.
- [ ] **Step 3: Commit** `docs(nexplay): contrato de estados de la etapa 3`.

---

### Task 8: Pantallas del jugador

**Files:**
- Create: `src/nexplay/pendiente.js`, `src/nexplay/pendiente.test.mjs`, `src/nexplay/reloj.js`, `src/nexplay/reloj.test.mjs`
- Modify: `src/lib/queries.js` (sección NEXPLAY), `src/nexplay/pages/Jugar.jsx`, `src/nexplay/pages/Inicio.jsx`, `src/nexplay/TablaProvisoria.jsx`

**Interfaces:**
- Consumes: `nx_empezar_intento(p_fecha_id, p_practica)`, `nx_mi_fecha`, `nx_empezar_revancha`, `nx_mi_revancha` y `nx_terminar_intento` (Tasks 1, 2 y 5), y el contrato de Task 7.
- Produces:
  - `queries.js`:
    - `empezarIntento(fechaId, { practica = false } = {})`;
    - `getMiFecha(fechaId)`;
    - `getMiRevancha()`;
    - `empezarRevancha(fechaId)`;
    - `getTorneoActual()` también devuelve la última fecha cerrada (para la revancha) y `temporada.campeones`.
  - `pendiente.js`: `guardarPendiente({ intento_id, resultado, datos })`, `leerPendiente() → objeto|null` y `borrarPendiente()`, con la clave `nx_pendiente` en `localStorage`, todo envuelto en try/catch. También `enviarPendiente(terminar) → 'enviado'|'descartado'|'reintentar'`:
    - `'enviado'` si `terminar` responde;
    - `'descartado'` (y borra) si el error es `intento_cerrado`, `intento_ajeno` o `fuera_de_plazo`;
    - `'reintentar'` si es un error de red.
  - `reloj.js`: `proximaApertura(ahora: Date) → Date`, que da la próxima 01:00 UTC estrictamente posterior a `ahora`.
  - `Jugar.jsx`:
    - guarda el pendiente **antes** de llamar a `terminarIntento` y lo borra cuando el servidor confirma;
    - al montar y con el evento `online`, llama a `enviarPendiente` antes de dejar empezar un intento;
    - saca la constante `INTENTOS` y usa `getMiFecha`;
    - tiene un modo práctica (`?practica=1`) y un modo revancha (`?revancha=<fecha_id>`).
  - `Inicio.jsx` y `TablaProvisoria.jsx`: también sacan `INTENTOS`, y `intentosMax` sale de `getMiFecha`. Agregan la cuenta regresiva, la tarjeta de revancha y los estados de temporada pausada o finalizada, según el contrato.

- [ ] **Step 1: Tests JS.**
  - `pendiente.test.mjs` usa un `localStorage` falso y un `terminar` falso:
    - guardar → leer da lo mismo;
    - `enviarPendiente` con éxito devuelve `'enviado'` y borra;
    - con un error `{ message: 'fuera_de_plazo' }` devuelve `'descartado'` y borra;
    - con un `TypeError('Failed to fetch')` devuelve `'reintentar'` y conserva;
    - `leerPendiente` con JSON roto devuelve null.
  - `reloj.test.mjs`:
    - `proximaApertura(2026-11-04T00:30Z)` da `2026-11-04T01:00Z`;
    - `proximaApertura(2026-11-04T01:00Z)` da `2026-11-05T01:00Z`;
    - `proximaApertura(2026-11-04T23:00Z)` da `2026-11-05T01:00Z`.
  - Correrlos → fallan.
- [ ] **Step 2: Implementar `pendiente.js` y `reloj.js`.** Tests → `ok`.
- [ ] **Step 3: Pantallas** según el contrato. `npm run build` → ok.
- [ ] **Step 4: QA en el 5199** con una temporada `es_prueba` (con el OK del usuario para crearla), siguiendo la receta de `dev-server-port`: el admin entra con Google en una ventana visible. Casos a recorrer:
  - práctica;
  - colchón (recargar a mitad del intento 1);
  - Underdog (con `underdogs` puesto a mano en la fecha de prueba);
  - resultado sin conexión (DevTools offline al terminar, después online);
  - revancha (con una segunda cuenta de prueba).

  Capturas a 390 y 320 px comparadas con el contrato.
- [ ] **Step 5: Commit** `feat(nexplay): práctica, colchón, Underdog, resultados sin conexión y revancha en el cliente`.

---

### Task 9: Pantallas del admin

**Files:**
- Modify: `src/lib/queries.js`, `src/nexplay/pages/AdminTorneo.jsx`

**Interfaces:**
- Consumes: los RPC de Task 4, y `nx_iniciar_fecha` y `nx_cerrar_fecha` (solo prueba) de Tasks 2 y 3.
- Produces:
  - `queries.js`:
    - `cancelarFecha(fechaId, motivo)`;
    - `corregirResultado(intentoId, nuevo, motivo)`;
    - `pausarTemporada(id, motivo)`;
    - `reanudarTemporada(id)`;
    - `getAuditoria({ limite = 50 })` (select de `auditoria` ordenado por `created_at desc`; `motivo` no es legible por la API según la migración 03, así que se muestra lo que la vista pública permita, y lo verifica el implementador con `list_tables`).
  - `AdminTorneo.jsx`, según el contrato:
    - los botones de iniciar y cerrar fecha solo si `temporada.es_prueba`;
    - en `preparacion`, la lista de juegos jugables con un interruptor para excluirlos (`excluirJuego(temporadaId, juegoId, excluir)` en `queries.js`);
    - pausar y reanudar;
    - cancelar con motivo;
    - la lista de intentos de la fecha con "Corregir";
    - la auditoría.

- [ ] **Step 1: Implementar.** `npm run build` → ok.
- [ ] **Step 2: QA en el 5199** con la temporada de prueba de Task 8: cancelar, corregir (con recálculo visible en la tabla) y pausar/reanudar. Capturas a 390 y 320 px.
- [ ] **Step 3: Commit** `feat(nexplay): herramientas del admin en el torneo`.

---

### Task 10: Revisión, despliegue y prueba en producción

- [ ] **Step 1: Revisión de toda la rama** (pro-workflow:reviewer o superpowers:requesting-code-review). Corregir lo crítico y lo alto con su test.
- [ ] **Step 2: Despliegue.** Con el OK del usuario: `git checkout main && git merge --ff-only nexplay-etapa-3 && git push`. Mirar el deploy con el MCP de Vercel hasta `READY`. Las migraciones ya están aplicadas, y el cliente viejo sigue funcionando con temporadas de prueba en el rato que dura el deploy.
- [ ] **Step 3: Prueba en producción** con las 3 cuentas Google de prueba y el admin, en una temporada `es_prueba` de 2 fechas manejada a mano. Casos a recorrer:
  - práctica y colchón;
  - Underdog en la fecha 2;
  - resultado sin conexión;
  - revancha de la fecha 1;
  - corrección, cancelación y reapertura;
  - campeón al cerrar la 2.

  En Playus, con `es_prueba = false` unos minutos como en la etapa 2: ranking, premios y museo.
- [ ] **Step 4: Prueba del reloj real.** Con el OK del usuario, crear una temporada **real** de 1 fecha con nombre de prueba e iniciarla:
  - a las 22:00 se abre sola (verificar `cron.job_run_details`);
  - a las 22:00 del día siguiente se cierra sola y queda `finalizada`.
- [ ] **Step 5: Limpieza** con la lista y el OK del usuario, comparando con una foto de la base tomada antes del Step 3 (como en la etapa 2). Actualizar la memoria y el ledger: etapa 3 terminada, y lo que pasa a la etapa 4.
