# NEXPLAY — Diseño

Fecha: 2026-11-01 · Estado: borrador para revisión del usuario

Fuentes: `REGLAS_NEXPLAY.md` (reglas oficiales), `Leí todo REGLAS_NEXPLAY.md` (cuestionario respondido), `NexPlay Juegos.md` (especificación de 20 juegos), esquema vivo de Supabase (proyecto `playus-app`).

Las decisiones marcadas **[mi decisión]** son mías y pueden corregirse; el resto lo decidió el usuario o viene de las reglas.

---

## 1. Qué es y por qué

Hoy Playus es un registro: el grupo juega minijuegos en otra parte y el admin carga a mano performance, rivales superados y gemas de cada fecha. NEXPLAY trae los juegos adentro de la plataforma: cada jugador tiene cuenta, juega sus intentos en el celular y el sistema calcula solo el resultado oficial, los puntos y el ranking, con reglas fijas y auditables.

Éxito = una tarde de amigos en la que el admin inicia la fecha, la ruleta elige el juego, todos juegan sus 3 intentos desde el celu, ven la tabla provisoria en vivo, el admin cierra y el ranking de Playus (y el museo, premios, perfiles) ya muestra la fecha sin carga manual.

### Objetivos
- Motor de torneo según `REGLAS_NEXPLAY.md`: temporadas de 1–21 fechas, ruleta sin repetición, intentos, Underdog, puntos con bonus, victorias, campeón.
- Cuentas por jugador vinculadas a los jugadores actuales (no se pierde historial).
- Juegos web propios, mobile-first, que respetan un contrato común.
- Todo lo excepcional (interrupciones, correcciones, cancelaciones) queda registrado y visible.

### No-objetivos (por ahora)
- Varias salas: hay una sola sala.
- Varios admins: un solo admin, que también juega.
- Predicciones: después, sobre las mismas cuentas.
- Recalcular o tocar lo ya jugado: las temporadas de Playus quedan como "era Playus".
- Repetir la partida en el servidor a partir de eventos (opción c de validación).

### Anti-objetivos (sería un fracaso aunque funcione)
- Perder o alterar historial existente (183 fechas, 10 temporadas, 7 jugadores).
- Que un jugador pueda conseguir ventaja reiniciando intentos (cerrar pestaña, quedarse quieto).
- Que el cliente pueda escribir puntos, posición, victorias o ranking.
- Que el ranking, museo o premios de Playus se rompan o muestren fechas canceladas.

---

## 2. Decisiones del usuario (resumen del cuestionario)

| # | Decisión |
|---|---|
| 1 | Entrada a NEXPLAY desde la barra de navegación de Playus, a una página aparte, como el museo. |
| 2 | Lo ya jugado queda intacto. NEXPLAY usa la misma estructura: performance primero, luego gemas (= puntos NEXPLAY). |
| 3 | Premios, museo, perfil/arquetipos, récords y medallero siguen. |
| 4 | Una sola sala. |
| 5 | Alta por invitación (link/código) **y** el admin acepta. |
| 6 | Login con link mágico al mail o con Google. |
| 7 | Cada cuenta se vincula a su jugador existente. |
| 8 | Un solo admin, que también juega. |
| 9 | Bonus de la fecha n = 5% × (n−1). Una temporada de 10 fechas termina en 45%. |
| 10 | Se redondea a entero (sin decimales). |
| 11–12 | Puntos por rivales superados estrictamente; solo cuentan los que participaron. |
| 13 | Empate en el 1° → victoria para todos los empatados. |
| 14 | Desempate de campeonato: victorias; si persiste, quién ganó entre ellos en las fechas que jugaron juntos (lógica del comparador). |
| 15–16 | Inactividad y desconexión se tratan igual: el intento se puede repetir, queda marcado y pasa por revisión del admin. Tope: 1 repetición por intento. |
| 17 | Si el admin retira una repetición, cuenta el mejor de los otros intentos. |
| 18 | Los intentos se pueden jugar en cualquier momento mientras la fecha esté abierta (no se fuerza que sean seguidos). |
| 19 | La fecha la cierra el admin. Quien no jugó queda ausente con 0. |
| 20 | Tabla provisoria en vivo durante la fecha. |
| 21 | Fecha cancelada: su juego vuelve a la ruleta; la fecha de reemplazo conserva número y bonus. |
| 22 | El admin puede sacar juegos de la ruleta solo antes de la Fecha 1. |
| 23 | Pausar solo bloquea iniciar la próxima fecha. |
| 24 | Se puede jugar fuera de fecha como práctica que no suma. |
| 25 | Los juegos son los de la tabla `juegos`; la mecánica está en `NexPlay Juegos.md` (20 especificados). |
| 26 | Primero el sistema de reglas con 2–3 juegos, después juegos de a uno. Agregar bots. |
| 27 | Se juega sobre todo en celular; se prueba en celu y PC. |
| 28 | Validación: RLS + Edge Function de plausibilidad (a + b). |
| 29 | OK general para las migraciones de este diseño. |
| 30 | Predicciones después. |
| R1 | Bots solo de prueba: nunca compiten en temporadas reales ni aparecen en Playus. |
| R2 | Login solo con Google por ahora (sin mails de link mágico: el plan gratuito no los envía a terceros). Se puede sumar un remitente SMTP después. |
| R3 | NEXPLAY usa la misma fila de `juegos`, pero sus récords históricos arrancan de cero. Los anteriores quedan como récords "era Playus". |
| R4 | Toda temporada nueva es NEXPLAY. `/admin` de Playus sigue sirviendo para editar las temporadas viejas. |

---

## 3. Arquitectura

### 3.1 Dónde vive
- **[mi decisión]** NEXPLAY es una tercera entrada de Vite, como el museo: `nexplay/index.html` → `src/nexplay/main.jsx`, una app React propia (con React Router) servida en `/nexplay/`. Comparte `src/lib/supabase.js`, Tailwind y la paleta "gem". La navbar de Playus suma un `<a href="/nexplay/">`.
- Hay que agregar la entrada en `vite.config.js` (`rollupOptions.input`) y revisar `vercel.json` para que `/nexplay/*` caiga en `nexplay/index.html` (hoy hay un rewrite general hacia la SPA).
- Acceso a datos: siguiendo la regla del repo, todas las llamadas pasan por `src/lib/queries.js` (sección NEXPLAY) — las páginas no llaman a `supabase` directo, salvo auth.

### 3.2 Misma base, mismas tablas de resultados
Una temporada NEXPLAY es una fila de `temporadas` marcada como NEXPLAY. Sus fechas son filas de `fechas`, y al **cerrar** una fecha el servidor escribe en `resultados`, una fila por jugador de la sala:
- `performance` = resultado oficial (mejor intento válido), como texto, igual que hoy.
- `rivales_superados` = calculado.
- `gemas` = puntos NEXPLAY.
- `jugo` = participó (tuvo al menos un intento válido).

Así getRanking, el gráfico de evolución, el museo, los premios y los perfiles muestran las temporadas NEXPLAY sin cambios. La posición en la fecha (`puestoEnFecha`, rivales primero y luego gemas) da el mismo orden que NEXPLAY, porque a igual cantidad de rivales superados corresponden iguales puntos.

### 3.3 Confianza: qué hace el servidor
El cliente nunca escribe en `resultados`, `fechas`, puntos ni ranking. **[mi decisión]** La lógica de torneo vive en funciones Postgres (`security definer`, llamadas por RPC), y el cliente solo puede llamarlas:

| Función | Quién | Qué hace |
|---|---|---|
| `nx_iniciar_fecha(temporada_id)` | admin | Verifica que la temporada esté activa y no pausada, y que no haya otra fecha abierta. Sortea el juego con `random()` entre los elegibles. Calcula el bonus y los Underdog a partir del ranking oficial. Crea la fecha `abierta` y audita. |
| `nx_empezar_intento(fecha_id)` | jugador | Verifica fecha abierta, jugador aceptado, intentos restantes (3, o 4 si es Underdog) y que no tenga otro intento en curso. Crea el intento `en_curso` con hora del servidor y devuelve `attempt_id`, `game_id` y una semilla. |
| Edge Function `nx-terminar-intento` | jugador | Recibe `{attempt_id, resultado, datos_del_intento}` y valida dueño, estado `en_curso` y plausibilidad por juego (ver 3.4). Si pasa, guarda `completado` con el resultado. Si no, guarda `invalido` con el motivo. |
| `nx_cerrar_fecha(fecha_id)` | admin | Calcula resultados oficiales, rivales superados, puntos y victorias, hace upsert en `resultados` y actualiza los récords. Si era la última fecha, finaliza la temporada y registra al campeón. Audita. |
| `nx_cancelar_fecha(fecha_id, motivo)` | admin | Pasa la fecha a `cancelada` sin asignar puntos. Su juego vuelve a la ruleta. Audita. |
| `nx_revisar_intento(intento_id, decision, motivo)` | admin | Mantiene o retira la puntuación de una repetición. Audita. |
| `nx_corregir_resultado(intento_id, nuevo, motivo)` | admin | Corrección manual con valor anterior y nuevo. Audita. Si la fecha ya está cerrada, la recalcula. |
| `nx_pausar / nx_reanudar / nx_iniciar_temporada / nx_excluir_juego` | admin | Cambian el estado de la temporada y auditan. |

La ruleta del cliente es solo una animación que frena en el juego ya sorteado por el servidor.

### 3.4 Validación de plausibilidad (Edge Function)
Cada juego declara reglas mínimas que la función verifica:
- duración del intento: hora del servidor entre `empezar` y `terminar`, con un mínimo posible por juego;
- rango del resultado (p. ej. Count! no puede bajar de un tiempo humano mínimo, Tower Stack no puede superar bloques/segundo × duración);
- coherencia interna de `datos_del_intento` (React!: el promedio coincide con las 4 rondas y las penalizaciones = 100 ms × errores).

Una persona que sepa programar todavía podría enviar un resultado falso pero plausible. Es el límite aceptado de la opción a+b.

### 3.5 Tabla en vivo
**[mi decisión]** La pantalla de fecha consulta cada 10 s una vista `nx_tabla_provisoria`: mejor intento válido por jugador, marcas de repetición e intentos usados. Es más simple que Realtime y alcanza para una tarde de juego. Se puede pasar a Realtime después.

---

## 4. Modelo de datos (migraciones)

Todo es aditivo; no se borra ni se renombra nada existente.

### Columnas nuevas
- `temporadas`: `es_nexplay bool default false`, `es_prueba bool default false` (temporada de prueba con bots: invisible en Playus), `estado text` (`preparacion | activa | pausada | finalizada`, null para Playus), `cantidad_fechas int check 1..21`, `reglas jsonb` (snapshot congelado al iniciar la Fecha 1: intentos 3, underdog 4, base 10, por rival 10, bonus 5%/fecha, tope de repeticiones 1), `campeon_id uuid → jugadores`.
- `fechas`: `estado text` (`abierta | cerrada | cancelada`, null para Playus = cerrada), `abierta_en`, `cerrada_en timestamptz`, `underdogs uuid[]`.
- `jugadores`: `es_bot bool default false`. Los bots solo pueden participar en temporadas `es_prueba`.
- `records_jugador_juego`: `era text not null default 'playus'` (`playus | nexplay`). Las filas existentes quedan `playus`. La unicidad pasa a `(jugador_id, juego_id, era)`. Las escrituras de `/admin` de Playus usan `era = 'playus'` (hay que ajustar el `onConflict` de `upsertRecordHistorico(s)`), y el cierre NEXPLAY escribe `era = 'nexplay'`. Solo las temporadas NEXPLAY reales actualizan récords; las de prueba no. El perfil muestra ambos récords, cada uno con su era.
- `juegos`: `modulo text` (slug del módulo jugable, p. ej. `count`; null = todavía no jugable en NEXPLAY), `inactividad_seg int`, `validacion jsonb` (mínimos y máximos para la Edge Function).

### Tablas nuevas
- `cuentas`: `user_id uuid pk → auth.users`, `jugador_id uuid unique → jugadores` (null hasta que el admin vincula), `estado` (`pendiente | aceptado | bloqueado`), `es_admin bool`, `created_at`.
- `invitaciones`: `codigo text pk`, `creada_por`, `expira_en` (7 días), `created_at`. El código se puede reutilizar hasta que vence, porque el admin acepta a cada uno igual. La cuenta guarda en `cuentas.invitacion` el código que usó. **[mi decisión, tomada en el plan de la etapa 1]**
- `intentos`: `id`, `fecha_id`, `jugador_id`, `numero int` (1..4, el número de intento oficial que ocupa), `estado` (`en_curso | completado | interrumpido | invalido`), `resultado numeric`, `datos jsonb`, `semilla int`, `empezado_en`, `terminado_en`, `repeticion_de uuid → intentos` (si es la repetición de uno interrumpido), `revision` (`null | pendiente | mantenida | retirada`), `revision_motivo text`.
- `temporada_juegos_excluidos`: `temporada_id`, `juego_id` (solo editable en `preparacion`).
- `auditoria`: `id`, `admin_user_id`, `accion text`, `entidad text`, `entidad_id uuid`, `antes jsonb`, `despues jsonb`, `motivo text`, `created_at`. Solo se inserta desde las funciones; lectura pública.

### RLS
- Lectura pública de lo de NEXPLAY (transparencia, regla 46), salvo `invitaciones` y datos personales de `cuentas`.
- Sin `insert/update/delete` directo de clientes en `intentos`, `auditoria`, `resultados` (NEXPLAY) y en estados de `fechas/temporadas`: todo pasa por las funciones.
- Ojo: hoy los usuarios autenticados escriben en `resultados`/`fechas` desde `/admin`. Al haber cuentas de jugadores, "autenticado" deja de significar "admin". **Las políticas de escritura actuales deben pasar a exigir `es_admin`** (vía `cuentas`), si no, cualquier jugador logueado podría editar resultados de Playus.
- Hoy existe un único usuario de auth (email + contraseña): es el admin de `/admin`. La misma migración crea su fila en `cuentas` con `es_admin = true` **antes** de endurecer las políticas, para no dejarlo afuera. El admin sigue entrando a `/admin` con su mail y contraseña. **[mi decisión]** En NEXPLAY puede entrar con esa misma cuenta o vincular Google con el mismo mail.

### Restricción existente que hay que cambiar
- `fechas` tiene `UNIQUE (temporada_id, numero_fecha)`. Eso impide que la fecha de reemplazo de una cancelada reutilice el número (decisión 21). **[mi decisión]** Se reemplaza por un índice único parcial `(temporada_id, numero_fecha) WHERE estado IS DISTINCT FROM 'cancelada'`. Las fechas de Playus (estado null) siguen igual de protegidas y no se toca ningún dato.

### Récord mundial
- **[mi decisión]** En las fechas NEXPLAY `record_mundial` queda vacío por defecto. El admin puede cargarlo a mano como hoy, si quiere. El récord histórico por jugador y juego (`records_jugador_juego`) sí se actualiza al cerrar la fecha (sujeto a la pregunta abierta 3).

---

## 5. Reglas de cálculo (precisas)

Sea una fecha con número `n` y con P = conjunto de jugadores que **participaron** (al menos un intento válido).

- **Intento válido**: `completado`, sin `revision = retirada`.
- **Resultado oficial** del jugador: el mejor de sus intentos válidos según `juegos.menor_es_mejor`.
- **Rivales superados** de j: cantidad de jugadores en P con resultado oficial estrictamente peor que el de j.
- **Bonus** = `round(10 × 5% × (n−1))`, con redondeo hacia arriba en 0,5: Fecha 2 → 1, Fecha 3 → 1, Fecha 4 → 2, …, Fecha 21 → 10. Se guarda `bonus_porcentaje = 5×(n−1)` en la fecha, como hoy. **[mi decisión: el redondeo es solo del bonus, la única parte con decimales]**
- **Puntos** de j en P = `10 + 10 × rivales_superados + bonus`. Fuera de P: 0, `jugo = false`.
- **Victoria**: todos los de P con rivales superados = |P|−1 o con el mejor resultado (empate en el 1° → todos).
- **Ranking de temporada**: suma de puntos de fechas `cerradas`. Desempate: victorias, luego enfrentamiento directo (`compararEnFecha` de `src/lib/fecha.js`) en las fechas que jugaron juntos, luego compartido.
- **Underdog** de la fecha n ≥ 2: los jugadores aceptados con el menor total del ranking oficial al iniciar la fecha (incluye a quien recién entra con 0). Se guardan en `fechas.underdogs` y no cambian durante la fecha.
- **Juegos elegibles para la ruleta**: `modulo` no nulo, no excluidos de la temporada, no usados en fechas `abiertas/cerradas` de la temporada (las canceladas liberan su juego).
- **Fecha cancelada**: no cuenta para el número de fechas jugadas. La siguiente fecha iniciada reutiliza su número `n` y su bonus.

### Interrupciones e inactividad
- Si un intento queda `en_curso` y el jugador vuelve (recarga, reconexión, otra pestaña), o el juego reporta inactividad, el intento pasa a `interrumpido`. **No ocupa** un intento oficial.
- El jugador puede repetir ese número de intento **una sola vez**: el nuevo intento lleva `repeticion_de` y `revision = pendiente`, y se ve marcado para todos.
- Una segunda interrupción del mismo número consume el intento (queda sin resultado). **[mi decisión: así "1 repetición por intento" se puede hacer cumplir]**
- Mientras la revisión está pendiente, el resultado cuenta en la tabla provisoria con la marca. Al cerrar la fecha, las revisiones todavía pendientes se tratan como `mantenida`. **[mi decisión]**

---

## 6. Flujos y pantallas (mobile-first)

### Jugador
1. **Entrar**: `/nexplay/` → login con Google (Supabase Auth, proveedor Google; el usuario crea el cliente OAuth en Google Cloud con la guía del constructor). Primera vez: con código de invitación (desde el link) → cuenta `pendiente` → pantalla "esperando que el admin te acepte".
2. **Inicio** (sala): temporada actual, fecha abierta (si hay), botón "Jugar", tabla provisoria, ranking de la temporada, "Practicar".
3. **Fecha abierta**: animación de la ruleta la primera vez → juego elegido → **instrucciones** (objetivo, controles, reglas, fin, resultado: regla 10) → intento → resultado del intento → "Intento 2 de 3" (o 4 con insignia Underdog).
4. **Tabla provisoria**: posición, mejor resultado, intentos usados, marca de repetición.
5. **Práctica**: cualquier juego jugable, sin llamar al servidor y sin guardar. **[mi decisión]**

### Admin (dentro de NEXPLAY, no en `/admin` de Playus)
1. **Jugadores**: generar link de invitación, aceptar pendientes vinculando cada cuenta a un jugador existente (o a uno nuevo), bloquear.
2. **Temporada**: crear (nombre, cantidad de fechas 1–21), excluir juegos de la ruleta, iniciar (congela reglas), pausar o reanudar.
3. **Fecha**: iniciar (ruleta), ver intentos en vivo, revisar repeticiones (mantener o retirar con motivo), corregir un resultado con motivo, cerrar, cancelar con motivo.
4. **Auditoría**: lista de lo que hizo el admin.

### Playus existente
- La navbar suma "NEXPLAY".
- Las consultas de fechas (`getFechas`, `getFechasTodas`, ranking, evolución, notas) **excluyen `estado = 'cancelada'` y `'abierta'`**, para que el ranking y el museo vean solo fechas cerradas.
- `/admin` de Playus no edita temporadas `es_nexplay` (las muestra como solo lectura), para que nadie pise lo que calculó el motor. Tampoco crea temporadas nuevas: eso pasa a NEXPLAY (R4).
- `getTemporadas` excluye las `es_prueba`, y `getJugadores` excluye los `es_bot`, así que nada de prueba llega al ranking, museo, premios ni perfiles.
- La temporada por defecto de Playus es la última **con al menos una fecha cerrada**. Una temporada NEXPLAY en `preparacion` no se muestra todavía. **[mi decisión]**

---

## 7. Contrato común de juegos

Cada juego es un módulo React en `src/nexplay/juegos/<modulo>/` con esta forma:

```js
export default {
  modulo: 'count',
  tipo_de_resultado: 'MENOR_ES_MEJOR',   // debe coincidir con juegos.menor_es_mejor
  unidad: 'ms',                           // cómo se muestra el resultado
  Instrucciones,                          // componente: objetivo, controles, reglas, fin, resultado
  Juego,                                  // componente({ semilla, onActividad, onTerminar })
}
// onTerminar({ estado: 'completado'|'fallido', resultado, datos_del_intento })
```

- El motor administra temporada, fecha, intentos, envío y puntuación. El juego administra solo su mecánica (regla 49).
- `semilla` (del servidor) alimenta el azar del juego, para que el layout sea reproducible y verificable.
- `onActividad()` reinicia el contador de inactividad que lleva el motor (`juegos.inactividad_seg`).
- Los juegos con rondas (Center Hit, Time's Up!, React!) mandan el detalle por ronda en `datos_del_intento`.
- Parejo entre dispositivos (regla 44): tiempos con `performance.now()`, área de juego de proporción fija escalada a la pantalla, objetivos táctiles grandes y sin depender del hover.

Se diseñan como juegos propios de cada género, con la mecánica de `NexPlay Juegos.md`. No son copias de juegos comerciales.

---

## 8. Etapas

1. **Cuentas y entrada**: migración de `cuentas` e `invitaciones`, ajuste de RLS de escritura a `es_admin`, entrada `/nexplay/`, login, invitación, aceptar y vincular. *Prueba: entrar con dos cuentas, aceptar, ver Playus intacto.*
2. **Motor mínimo con 1 juego (Count!)**: temporadas y fechas NEXPLAY, ruleta, intentos (3), Edge Function, cierre con puntos hacia `resultados`, tabla provisoria, filtro de fechas abiertas o canceladas en Playus. *Prueba: una temporada de 1–2 fechas completa y verla en el ranking de Playus.*
3. **Integridad**: Underdog, interrupciones e inactividad, revisión, corrección auditada, cancelación, pausa, finalización con campeón y desempate.
4. **Más juegos**: Tower Stack (mayor es mejor) y React! (rondas). Después uno por vez, en el orden de `NexPlay Juegos.md`.
5. **Bots de prueba**: el admin crea una temporada `es_prueba` y suma bots (jugadores `es_bot`). Una función `nx_bots_jugar(fecha_id)` (solo para temporadas de prueba) crea intentos `completado` con resultados al azar dentro del rango `juegos.validacion`. Así el admin puede probar una fecha completa (ruleta, intentos, Underdog, cierre, desempates) sin el grupo. **[mi decisión: los bots entran después del motor; hasta entonces, se prueba con 2 cuentas Google]**

---

## 9. Lo que queda al constructor
- Nombres exactos de componentes y rutas internas de `/nexplay/`.
- Los números de plausibilidad de cada juego (se ajustan con pruebas reales).
- El diseño visual dentro de la paleta gem existente.
- Si conviene un pequeño helper compartido para "mejor resultado según menor_es_mejor" (ya existe lógica similar en `src/lib/records.js`).

## 10. Preguntas abiertas
- Ninguna. Las 4 que salieron de la revisión están respondidas en R1–R4.
