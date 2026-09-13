# Playus — Tracker de temporada

App web para reemplazar el Excel de seguimiento de la competencia Playus. Hecha con React + Vite + Tailwind, conectada a Supabase.

## Cómo correrlo localmente

```bash
npm install
npm run dev
```

La app ya viene con un archivo `.env` apuntando al proyecto de Supabase creado para este proyecto (`playus-app`). Si en algún momento cambiás de proyecto de Supabase, actualizá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (mirá `.env.example`).

## Primer uso — crear tu cuenta de admin

1. Andá a la sección **Cargar datos** (`/admin`).
2. Como todavía no hay ninguna cuenta creada, tocá "¿Primera vez? Creá tu cuenta de admin" y registrate con tu email y una contraseña.
3. Una vez logueado, ya podés crear temporadas, fechas, juegos y cargar resultados.

Nota: por defecto, Supabase puede pedir que confirmes el email antes de poder iniciar sesión (según la configuración del proyecto). Si el login falla después de registrarte, revisá la bandeja de entrada o desactivá la confirmación de email desde el dashboard de Supabase (Authentication → Providers → Email).

## Permisos

- Cualquiera puede ver el ranking, el detalle de las fechas y las notas (lectura pública).
- Solo un usuario logueado (vos) puede crear/editar datos. Esto está reforzado con Row Level Security en la base, no solo en el frontend.

## Estructura

- `src/lib/supabaseClient.js` — cliente de Supabase
- `src/lib/queries.js` — todas las consultas a la base (ranking, fechas, resultados, etc.)
- `src/pages/` — Dashboard (ranking), FechaDetalle, Admin (carga de datos), Notas, Login
- `src/components/` — Navbar, Podio

## Récords

- **Récord mundial**: se carga una vez al crear la fecha (va ligado al juego de ese día), no por jugador.
- **Récord histórico**: es por jugador + juego, se actualiza cada vez que cargás resultados en ese juego, y se mantiene entre fechas (no se resetea).

## Pendiente / ideas para el QA

- El récord histórico hoy se sobreescribe con cualquier valor que cargues, no valida que sea "mejor" que el anterior — eso queda a criterio del admin al cargarlo.
- El gráfico de evolución usa el apodo del jugador como clave; si algún día cambiás un apodo, las líneas viejas del gráfico no se van a "fusionar" solas con el nuevo nombre.
- Sería bueno paginar o buscar entre fechas si la temporada crece mucho.
