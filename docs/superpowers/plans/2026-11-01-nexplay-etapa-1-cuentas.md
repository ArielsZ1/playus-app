# NEXPLAY Etapa 1 — Cuentas y entrada: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada jugador pueda entrar a `/nexplay/` con Google usando un link de invitación, que el admin lo acepte y lo vincule a su jugador existente, y que solo el admin pueda escribir datos (en Playus y en NEXPLAY).

**Architecture:** Tablas `cuentas`, `invitaciones` y `auditoria` en `public`, con funciones Postgres `security definer` como única vía de escritura. Las políticas de escritura de las 7 tablas de Playus (en `public` y en `practica`) pasan de "autenticado" a `es_admin()`. NEXPLAY es una tercera entrada de Vite (`nexplay/index.html`) con su propia app React, que comparte el cliente Supabase y la sesión (mismo origen) con Playus.

**Tech Stack:** React 18, React Router 6, Vite 5 (multi-página), Tailwind, Supabase (Postgres + Auth con Google), proyecto `qzeqjaxyeezqdycgzymq`.

**Spec:** `docs/superpowers/specs/2026-11-01-nexplay-design.md` (secciones 3.1, 4 "cuentas / invitaciones / auditoria / RLS", 6 "Jugador 1–2, Admin 1, Playus existente", 8 etapa 1).

## Global Constraints

- Texto de UI e identificadores en español, como el resto del repo.
- Todo acceso a datos pasa por `src/lib/queries.js`. Cada función lanza el error de Supabase y quien la llama lo captura. La excepción es auth (`supabase.auth.*`).
- **Las tablas y funciones NEXPLAY viven en `public`.** En modo práctica el cliente usa el esquema `practica`, así que toda llamada NEXPLAY usa `supabase.schema('public')`.
- Login de jugadores: solo Google (R2). El email + contraseña existente sigue para el admin.
- Un solo admin. Hoy existe un único usuario de auth (proveedor email): es el admin.
- Las migraciones son aditivas, salvo el reemplazo de políticas de escritura (Task 2), que tiene SQL de vuelta atrás.
- Estilo: reusar `gem-panel`, `gem-panel-sm`, `stat-label` y la paleta `gem` de `tailwind.config.js`. Mobile-first.
- No hay runner de tests. Se verifica con SQL contra la base (dentro de `begin … rollback`), con `npm run build` y con el checklist de QA del usuario.
- Las migraciones se aplican con la herramienta `apply_migration` de Supabase MCP y se guardan también en `supabase/migrations/` para que queden en el repo.

## Review Focus

1. Un jugador logueado con Google abre `/admin` de Playus → ve "Esta cuenta no es admin" y no puede escribir (ni por la UI ni por la API). Lo cubren Task 2 (SQL) y Task 3 (UI).
2. Código de invitación vencido, inexistente o vacío → mensaje claro y no se crea la cuenta. Lo cubre Task 1 (SQL).
3. El admin intenta vincular un jugador que ya está vinculado a otra cuenta → error, sin cambios. Lo cubre Task 1 (SQL).
4. App en modo práctica (`npm run dev:practica`) → login, cuenta y RPCs de NEXPLAY funcionan igual, porque van a `public`. Lo cubre Task 6 (QA, paso 4).
5. El admin entra a NEXPLAY con Google y el mismo mail → Supabase vincula la identidad al usuario existente y sigue siendo admin. Si apareciera como cuenta pendiente nueva, puede usar el formulario de email + contraseña de NEXPLAY. Lo cubre Task 6 (QA, paso 2).

---

### Task 1: Base de cuentas (expand)

**Files:**
- Create: `supabase/migrations/20261101_01_nexplay_cuentas.sql`
- Create: `supabase/tests/nexplay_01_cuentas.sql`
- Add: `docs/superpowers/specs/2026-11-01-nexplay-design.md` (commitear el spec aprobado junto con esta task)

**Interfaces:**
- Produces (SQL, schema `public`):
  - table `cuentas(user_id uuid pk → auth.users on delete cascade, jugador_id uuid unique null → jugadores(id), estado text not null default 'pendiente' check in ('pendiente','aceptado','bloqueado'), es_admin bool not null default false, nombre text, email text, invitacion text, created_at timestamptz default now())`
  - table `invitaciones(codigo text pk, creada_por uuid → auth.users, expira_en timestamptz not null, created_at timestamptz default now())`. **El código es reutilizable hasta que vence** (7 días), porque el admin acepta a cada uno igual. Esto difiere del `usada_por` del spec: la cuenta guarda `invitacion` con el código que usó.
  - table `auditoria(id uuid pk default gen_random_uuid(), admin_user_id uuid, accion text not null, entidad text not null, entidad_id uuid, antes jsonb, despues jsonb, motivo text, created_at timestamptz default now())`
  - `es_admin() returns boolean` — `stable security definer set search_path = public`; true si existe una cuenta con `user_id = auth.uid()`, `es_admin` y `estado = 'aceptado'`.
  - `nx_registrarse(p_codigo text) returns cuentas` — requiere `auth.uid()`. Lanza `'codigo_invalido'` si el código no existe o venció. Inserta una cuenta `pendiente` con `nombre` (de `raw_user_meta_data->>'full_name'`), `email` e `invitacion`. Si la cuenta ya existe, la devuelve sin cambios.
  - `nx_crear_invitacion() returns text` — solo admin (si no, lanza `'solo_admin'`). Código de 8 caracteres en mayúsculas (`upper(encode(gen_random_bytes(4),'hex'))`) que vence a los 7 días. Audita `crear_invitacion`.
  - `nx_aceptar_cuenta(p_user_id uuid, p_jugador_id uuid default null, p_apodo text default null) returns cuentas` — solo admin. Con `p_jugador_id` vincula ese jugador; si ya está vinculado a otra cuenta, lanza `'jugador_ya_vinculado'`. Sin `p_jugador_id` y con `p_apodo` no vacío, crea el jugador. Sin ninguno de los dos, lanza `'falta_jugador'`. Deja `estado = 'aceptado'` y audita `aceptar_jugador` con antes y después.
  - `nx_bloquear_cuenta(p_user_id uuid, p_motivo text) returns cuentas` — solo admin. Lanza `'no_podes_bloquearte'` si `p_user_id = auth.uid()`. Audita `bloquear_jugador`.
  - Seed: el único usuario existente de `auth.users` → `cuentas` con `es_admin = true, estado = 'aceptado'` (`insert … select … from auth.users on conflict do nothing`).
  - RLS: `cuentas` select si `user_id = auth.uid() or es_admin()`. `invitaciones` select si `es_admin()`. `auditoria` select `true`. Ninguna de las tres tiene políticas de insert/update/delete. `grant execute` de las 5 funciones a `authenticated`, y `revoke` a `anon` para las `nx_*`.

- [ ] **Step 1: Escribir `supabase/tests/nexplay_01_cuentas.sql`.** Cada caso va en un bloque `do $$ … $$` que hace `raise exception 'FALLA: …'` si no se cumple, y todo el archivo corre dentro de `begin; … rollback;`. Para impersonar se usa `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', <uuid>, 'role','authenticated')::text, true);`. Cada caso necesita su usuario de prueba en `auth.users`, insertado en la transacción (`insert into auth.users(id, email, raw_user_meta_data) values (gen_random_uuid(), 'test1@x.com', '{"full_name":"Test Uno"}')`). Casos:
  1. Como el admin sembrado: `select es_admin()` → `true`.
  2. Como el usuario de prueba: `nx_registrarse('NOEXISTE')` lanza un error que contiene `codigo_invalido`.
  3. Con un código vencido (insertado con `expira_en = now() - interval '1 day'`) → `codigo_invalido`.
  4. El admin crea un código con `nx_crear_invitacion()` (devuelve 8 caracteres). El usuario de prueba hace `nx_registrarse(código)` → `estado = 'pendiente'`, `nombre = 'Test Uno'`. Llamarlo otra vez devuelve la misma fila, y `count(*)` de sus cuentas es 1.
  5. Como el usuario de prueba: `nx_crear_invitacion()` lanza `solo_admin`, y `select es_admin()` → `false`.
  6. El admin acepta al usuario 1 vinculado a un jugador existente X. Un segundo usuario registrado que intenta vincularse al mismo X → `jugador_ya_vinculado`.
  7. `nx_aceptar_cuenta(u2)` sin jugador ni apodo → `falta_jugador`. Con `p_apodo => 'Nuevo'`, crea una fila en `jugadores` y la vincula.
  8. El admin intenta bloquearse a sí mismo → `no_podes_bloquearte`. Bloquea a u2 → `estado = 'bloqueado'`, y `auditoria` tiene filas `aceptar_jugador` y `bloquear_jugador`.
  9. Como usuario de prueba: `insert into cuentas …` directo falla (RLS) y `select * from invitaciones` devuelve 0 filas.

- [ ] **Step 2: Correr el test antes de la migración.** Pasar el archivo a `execute_sql`. Esperado: falla con `function es_admin() does not exist`.

- [ ] **Step 3: Escribir `supabase/migrations/20261101_01_nexplay_cuentas.sql`** con todo lo del bloque Produces y aplicarlo con `apply_migration` (nombre `nexplay_01_cuentas`). Usar `gen_random_bytes` de `pgcrypto` (en Supabase está en el esquema `extensions`: referenciarlo como `extensions.gen_random_bytes`).

- [ ] **Step 4: Correr el test otra vez.** Esperado: termina sin `FALLA`, y el `rollback` no deja datos de prueba. Comprobar con `select count(*) from cuentas` → 1 (solo el admin).

- [ ] **Step 5: Commit**

```bash
git add supabase/ docs/superpowers/specs/2026-11-01-nexplay-design.md
git commit -m "feat(nexplay): cuentas, invitaciones y auditoría en la base"
```

---

### Task 2: Solo el admin escribe (contract)

**Files:**
- Create: `supabase/migrations/20261101_02_escritura_solo_admin.sql`
- Create: `supabase/migrations/20261101_02_escritura_solo_admin.rollback.sql` (no se aplica; queda para volver atrás)
- Create: `supabase/tests/nexplay_02_escritura.sql`

**Interfaces:**
- Consumes: `public.es_admin()` (Task 1).
- Produces: en `public` y `practica`, para `temporadas, fechas, juegos, jugadores, resultados, records_jugador_juego, premios`: se borra la política `"escritura autenticada"` y se crea `"escritura admin"` `for all using (public.es_admin()) with check (public.es_admin())`. `"lectura publica"` no se toca. El rollback recrea `"escritura autenticada"` con `auth.role() = 'authenticated'` y borra `"escritura admin"`.

- [ ] **Step 1: Escribir `supabase/tests/nexplay_02_escritura.sql`** (dentro de `begin … rollback`, mismos helpers que en Task 1):
  1. Como un usuario de prueba no admin: `insert into public.jugadores(apodo) values ('hack')` falla con violación de RLS. `update public.resultados set gemas = 999` afecta 0 filas. Lo mismo para `practica.jugadores`.
  2. Como el admin sembrado: `insert into public.jugadores(apodo) values ('ok_admin')` funciona.
  3. Como `anon`: `select count(*) from public.fechas` → 183 (la lectura pública sigue).

- [ ] **Step 2: Correr el test.** Esperado: el caso 1 falla (hoy cualquier autenticado escribe).

- [ ] **Step 3: Escribir y aplicar la migración** (`apply_migration`, nombre `nexplay_02_escritura_solo_admin`). Escribir también el archivo de rollback.

- [ ] **Step 4: Correr el test.** Esperado: sin `FALLA`.

- [ ] **Step 5: Comprobar que el admin real no perdió acceso.** Pedirle al usuario que entre a `/admin` con su mail y contraseña y guarde una nota en cualquier resultado (y la deshaga). Si falla, aplicar el rollback antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat(nexplay): solo el admin puede escribir datos"
```

---

### Task 3: Consultas de cuenta, admin de Playus protegido y enlace en la navbar

**Files:**
- Modify: `src/lib/queries.js` (sección nueva `// NEXPLAY — cuentas` al final)
- Modify: `src/App.jsx` (ruta `/admin`)
- Modify: `src/components/Navbar.jsx` (enlace junto a "Museo")

**Interfaces:**
- Consumes: RPCs y tablas de Task 1.
- Produces (en `src/lib/queries.js`, todas con `const nx = supabase.schema('public')`):
  - `getMiCuenta(): Promise<Cuenta|null>`: `nx.from('cuentas').select('*, jugador:jugadores(id, apodo)').eq('user_id', uid).maybeSingle()`, con `uid` de `supabase.auth.getUser()`. Devuelve `null` si no hay sesión.
  - `registrarseConCodigo(codigo: string): Promise<Cuenta>`: rpc `nx_registrarse`.
  - `crearInvitacion(): Promise<string>`: rpc `nx_crear_invitacion`.
  - `getCuentas(): Promise<Cuenta[]>`: todas, con `jugador:jugadores(id, apodo)`, ordenadas por `created_at`.
  - `aceptarCuenta({ userId, jugadorId = null, apodo = null }): Promise<Cuenta>`: rpc `nx_aceptar_cuenta`.
  - `bloquearCuenta(userId: string, motivo: string): Promise<Cuenta>`: rpc `nx_bloquear_cuenta`.
  - `Cuenta = { user_id, jugador_id, estado, es_admin, nombre, email, jugador: {id, apodo}|null }`

- [ ] **Step 1: Agregar las 6 funciones a `queries.js`.**

- [ ] **Step 2: Proteger `/admin` en `App.jsx`.** Cuando hay `session`, llamar a `getMiCuenta()` (en un `useEffect` que dependa de `session?.user?.id`) y guardar `esAdmin`. Si hay sesión y `esAdmin === true`, renderizar `<Admin …>` como hoy. Si hay sesión y `esAdmin === false`, mostrar un `gem-panel` con el texto exacto "Esta cuenta no es admin." y un botón "Salir" (`supabase.auth.signOut()`). Mientras carga, mostrar "Verificando cuenta…". Sin sesión, `<Login />` como hoy.

- [ ] **Step 3: Agregar `<a href="/nexplay/" className={`${navItem} ${navItemInactive}`}>NEXPLAY</a>`** después de "Museo" en `Navbar.jsx`.

- [ ] **Step 4: Verificar.** `npm run build` → sin errores. `npm run dev`: entrar a `/admin` con el admin funciona igual que antes, y el enlace NEXPLAY aparece (por ahora lleva a una página vacía o a la SPA).

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.js src/App.jsx src/components/Navbar.jsx
git commit -m "feat(nexplay): consultas de cuenta y /admin solo para el admin"
```

---

### Task 4: Entrada `/nexplay/` con login, registro por invitación y estados de cuenta

**Files:**
- Modify: `vite.config.js` (`rollupOptions.input.nexplay: resolve(__dirname, 'nexplay/index.html')`)
- Modify: `vercel.json`: agregar antes del catch-all `{ "source": "/nexplay", "destination": "/nexplay/index.html" }` y `{ "source": "/nexplay/(.*)", "destination": "/nexplay/index.html" }`
- Create: `nexplay/index.html` (copia de `index.html` raíz con `<title>NEXPLAY</title>` y `<script type="module" src="/src/nexplay/main.jsx">`)
- Create: `src/nexplay/main.jsx` (monta `<BrowserRouter basename="/nexplay"><NexplayApp/></BrowserRouter>` e importa `../index.css`)
- Create: `src/nexplay/NexplayApp.jsx`: sesión + cuenta + enrutado por estado
- Create: `src/nexplay/pages/Entrar.jsx`
- Create: `src/nexplay/pages/Inicio.jsx`
- Create: `src/nexplay/invitacion.js`

**Interfaces:**
- Consumes: `getMiCuenta`, `registrarseConCodigo` (Task 3); `supabase` de `src/lib/supabaseClient.js`.
- Produces:
  - `src/nexplay/invitacion.js`: `guardarCodigoDeUrl(): void` (lee `?codigo=` de `location.search` y lo guarda en `localStorage['nexplay_codigo']`), `leerCodigo(): string|null`, `borrarCodigo(): void`. Cada acceso a `localStorage` va en `try/catch`, porque puede no estar disponible.
  - `NexplayApp` expone a sus hijos `{ session, cuenta, recargarCuenta }` por props (sin context, como Playus).
  - Rutas: `/` → `Inicio`; `/admin` → (Task 5).

- [ ] **Step 1: Configuración y página HTML.** Editar `vite.config.js` y `vercel.json`, y crear `nexplay/index.html` y `src/nexplay/main.jsx`. Verificar: `npm run build` genera `dist/nexplay/index.html`.

- [ ] **Step 2: `invitacion.js`.** Al cargar el módulo, llamar a `guardarCodigoDeUrl()` desde `main.jsx`, antes de montar.

- [ ] **Step 3: `Entrar.jsx`.** Botón principal "Entrar con Google": `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/nexplay/` } })`. Debajo, un `<details>` "Soy el admin" con email + contraseña (`signInWithPassword`), para el caso 5 del Review Focus. Si hay un código guardado, mostrar "Tenés una invitación: entrá para unirte."

- [ ] **Step 4: `NexplayApp.jsx`.** Escuchar la sesión como `App.jsx` (`getSession` + `onAuthStateChange`). Con sesión, llamar a `getMiCuenta()`:
  - si es `null` y `leerCodigo()` tiene valor → `registrarseConCodigo(código)`, luego `borrarCodigo()` y recargar la cuenta. Si el error contiene `codigo_invalido`, borrar el código y mostrar "El link de invitación no es válido o venció. Pedile uno nuevo al admin.";
  - si es `null` y no hay código → "Necesitás un link de invitación para entrar a NEXPLAY.";
  - si `estado = 'pendiente'` → "Listo, {nombre}. El admin tiene que aceptarte; te avisamos cuando puedas jugar." con un botón "Actualizar";
  - si `estado = 'bloqueado'` → "Tu cuenta está bloqueada. Hablá con el admin.";
  - si `estado = 'aceptado'` → rutas (`Inicio`, y `/admin` si `es_admin`).
  
  Sin sesión → `Entrar`. Siempre visible: encabezado "NEXPLAY" y enlace "← Playus" (`href="/"`), más "Salir" cuando hay sesión.

- [ ] **Step 5: `Inicio.jsx`.** Saludo "Hola, {cuenta.jugador?.apodo ?? cuenta.nombre}" y un panel "La primera temporada NEXPLAY arranca pronto." Si `es_admin`, un enlace a "Jugadores" (`/admin`).

- [ ] **Step 6: Verificar.** `npm run build` sin errores. `npm run dev` → `/nexplay/` muestra Entrar, y entrar con el formulario de admin llega a Inicio. `/nexplay/?codigo=XYZ` muestra el aviso de invitación.

- [ ] **Step 7: Commit**

```bash
git add vite.config.js vercel.json nexplay/ src/nexplay/
git commit -m "feat(nexplay): entrada /nexplay/ con login y registro por invitación"
```

---

### Task 5: Admin de jugadores en NEXPLAY

**Files:**
- Create: `src/nexplay/pages/AdminJugadores.jsx`
- Modify: `src/nexplay/NexplayApp.jsx` (ruta `/admin`, solo si `cuenta.es_admin`)

**Interfaces:**
- Consumes: `crearInvitacion`, `getCuentas`, `aceptarCuenta`, `bloquearCuenta` (Task 3), y `getJugadores` (existente).

- [ ] **Step 1: Sección "Invitar".** Botón "Generar link". Muestra `${location.origin}/nexplay/?codigo=${codigo}`, un botón "Copiar" (`navigator.clipboard.writeText`, con un fallback de texto seleccionable) y "Vence en 7 días".

- [ ] **Step 2: Sección "Pendientes".** Una fila por cuenta `pendiente` con nombre y email, un `<select>` con los jugadores **sin cuenta vinculada** (los de `getJugadores()` cuyo id no aparece en `getCuentas()`), más la opción "+ Jugador nuevo" (que muestra un input de apodo) y el botón "Aceptar". Los errores se muestran traducidos: `jugador_ya_vinculado` → "Ese jugador ya tiene cuenta.", `falta_jugador` → "Elegí un jugador o escribí un apodo.".

- [ ] **Step 3: Sección "Jugadores con cuenta".** Lista de las cuentas `aceptado` y `bloqueado` con su apodo vinculado y estado. Las aceptadas que no son admin tienen un botón "Bloquear", que pide el motivo con un input inline (sin `prompt()`). El admin puede vincularse a sí mismo a su jugador desde aquí: su cuenta aceptada sin jugador muestra el mismo `<select>` y un botón "Vincular".

- [ ] **Step 4: Verificar.** `npm run build` sin errores. Con el admin: generar un link, ver las secciones vacías y vincular la cuenta del admin a su jugador. Inicio ahora saluda con el apodo.

- [ ] **Step 5: Commit**

```bash
git add src/nexplay/
git commit -m "feat(nexplay): admin de jugadores (invitar, aceptar, vincular, bloquear)"
```

---

### Task 6: Google y QA de punta a punta

Esta task la hace el usuario con guía; no hay código.

- [ ] **Step 1: Crear el cliente OAuth** (guía para el usuario):
  1. En Google Cloud Console, crear un proyecto → "OAuth consent screen" (External, nombre NEXPLAY) → "Credentials" → "OAuth client ID" (Web application).
  2. "Authorized redirect URI": `https://qzeqjaxyeezqdycgzymq.supabase.co/auth/v1/callback`.
  3. En Supabase Dashboard → Authentication → Providers → Google: pegar el Client ID y el Secret y activar.
  4. En Authentication → URL Configuration → Redirect URLs, agregar `http://localhost:5173/nexplay/` y la URL de producción de Vercel + `/nexplay/`.
  5. Publicar la consent screen ("In production"), si no Google solo deja entrar a los usuarios de prueba.

- [ ] **Step 2: Checklist de QA** (el usuario lo prueba en el celu y en la PC):
  1. Playus sin sesión: ranking, museo y premios se ven igual que antes.
  2. El admin entra a `/nexplay/` con Google con su mismo mail → llega a Inicio como admin. Si queda "pendiente", usar "Soy el admin" con mail + contraseña y avisar.
  3. El admin genera un link. Un amigo (u otra cuenta Google) lo abre → entra con Google → ve "El admin tiene que aceptarte".
  4. El admin lo acepta vinculándolo a su jugador → el amigo toca "Actualizar" → ve "Hola, {apodo}". Repetir el registro con `npm run dev:practica`: debe funcionar igual.
  5. Ese amigo abre `/admin` de Playus → "Esta cuenta no es admin."
  6. Un link con un código inventado → "El link de invitación no es válido o venció."
  7. El admin bloquea esa cuenta → el amigo recarga y ve "Tu cuenta está bloqueada."
  8. El admin sigue cargando datos en `/admin` de Playus normalmente.

- [ ] **Step 3: Guardar en memoria** que la etapa 1 está hecha (o qué quedó pendiente de QA).
