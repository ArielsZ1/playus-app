# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Playus: a season tracker web app (replaces an Excel sheet) for a gem-based competition. React 18 + Vite + Tailwind, backed directly by Supabase (no custom backend). UI text and identifiers are in Spanish (temporada = season, fecha = match day, juego = game, jugador = player, gemas = points).

## Commands

```bash
npm install
npm run dev      # Vite dev server on 0.0.0.0:5173
npm run build    # production build to dist/
npm run preview
```

There is no test runner, linter, or TypeScript. Verify changes with `npm run build` and by running the app.

Requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`).

## Architecture

- **All data access goes through `src/lib/queries.js`.** Pages never call `supabase` directly for data (only `App.jsx` uses it for auth session). Add new queries there; each throws on Supabase error and callers catch.
- **Aggregation happens client-side.** Ranking (`getRanking`) and evolution chart (`getEvolucionGemas`) fetch raw `resultados` rows filtered via inner join on `fechas.temporada_id` and sum `gemas` in JS. There are no DB views/RPCs.
- **Supabase tables:** `temporadas`, `fechas`, `juegos`, `jugadores`, `resultados` (keyed by fecha + jugador, upserted), `records_jugador_juego` (historical record per player+game), `premios`. The schema/RLS is not in this repo — it lives in the Supabase project. Public read, writes only for authenticated users (enforced by RLS).
- **Global state lives in `App.jsx`:** the season list, the selected `temporadaId` (defaults to the last one), and the auth session. These are passed as props; there is no context or state library. Pages are lazy-loaded routes.
- **`/admin` is the only write surface** (`src/pages/Admin.jsx`, the largest file): create seasons/fechas/games/players, bulk-upsert results, records, premios. It renders `Login` when there is no session. Login only signs in existing accounts (sign-up was removed).
- **Records:** "récord mundial" is stored on the `fecha` (tied to that day's game); "récord histórico" is per player+game in `records_jugador_juego` and persists across fechas. On save it keeps the best of stored / typed / that fecha's performance, using `juegos.menor_es_mejor` (true = lower wins, null = no validation); logic in `src/lib/records.js`.
- **Evolution chart keys series by player `apodo`**, so renaming a player splits their line.

## Styling

Tailwind with a custom dark "gem" palette in `tailwind.config.js` (`base`, `panel`, `ink`, `muted`, `gold`, `ruby`, `emerald`, `sapphire`). Reuse the component classes in `src/index.css` (`gem-panel`, `gem-panel-sm`, `stat-label`) for faceted panels instead of new ad-hoc styles.
