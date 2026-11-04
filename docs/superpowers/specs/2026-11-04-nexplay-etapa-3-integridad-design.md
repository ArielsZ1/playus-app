# NEXPLAY etapa 3 — Integridad · Diseño

Fecha: 2026-11-04 · Estado: borrador para revisión del usuario

Fuentes: la spec general `docs/superpowers/specs/2026-11-01-nexplay-design.md` (la llamo "spec general"), `REGLAS_NEXPLAY.md`, la conversación de brainstorming del 2026-11-04 y lo construido en la etapa 2 (migraciones `supabase/migrations/20261103_04` a `07`, ledger `.superpowers/sdd/2026-11-03-nexplay-etapa-2-motor/progress.md`).

Las decisiones marcadas **[mi decisión]** son mías y se pueden corregir. El resto lo decidió el usuario o viene de la spec general.

---

## 1. Qué es y por qué

La etapa 2 dejó un motor que funciona para una temporada de una fecha que el admin abre y cierra a mano. La etapa 3 lo convierte en un torneo que corre solo durante semanas y que aguanta lo que pasa en la vida real: cortes de luz, pestañas cerradas por accidente, alguien que se pierde un día, un resultado mal cargado o una fecha que hay que anular.

**Éxito:** el admin crea e inicia una temporada de N fechas. Desde ahí, todos los días a las 22:00 se cierra la fecha anterior y se abre la siguiente, sin que nadie toque nada. Los cortes no le hacen perder a nadie un resultado que logró. Al final la temporada termina sola con su campeón, y Playus (ranking, museo, premios, perfiles) la muestra como cualquier otra.

### Objetivos
1. Ritmo diario automático: apertura y cierre a las 22:00 de Argentina.
2. Intentos por fecha: 3 que cuentan (4 si es Underdog) más 1 de práctica, con colchón ante cortes.
3. Resultados sin conexión: una partida terminada se sube cuando vuelve la conexión.
4. Revancha para quien se perdió una fecha.
5. Underdog.
6. Temporada de varias fechas: bonus creciente, ruleta sin repetir juego, campeón y desempate.
7. Herramientas del admin: cancelar una fecha, corregir un resultado y pausar o reanudar la temporada, todo auditado con motivo.

### No-objetivos
- Notificaciones o avisos (descartados en el roadmap).
- Bots de prueba (etapa 5) y más juegos (etapa 4).
- Elegir la hora por temporada: es fija a las 22:00.
- La revisión manual de repeticiones de `REGLAS_NEXPLAY.md` §14–16 (`nx_revisar_intento`). **El usuario la reemplazó** por el colchón de práctica (§3.3).

### Anti-objetivos (sería un fracaso aunque funcione)
- Que alguien pierda un resultado que terminó de verdad por un corte de conexión.
- Que cerrar la pestaña o recargar sirva para descartar un mal intento y jugar otro (la spec general ya lo pedía). La única excepción aceptada es el colchón (§3.3): un comodín por fecha para los intentos 1 y 2.
- Que una fecha quede abierta o una temporada trabada porque el admin no entró.
- Que Playus muestre fechas canceladas, abiertas o de prueba, o que se rompa el historial existente.
- Que el cliente escriba puntos, puestos, victorias o estados. Todo pasa por funciones del servidor.

---

## 2. Decisiones del usuario (2026-11-04)

| # | Decisión |
|---|---|
| E1 | Las fechas se abren solas todos los días a las **22:00 de Argentina** (UTC−3, sin horario de verano, así que 01:00 UTC). Es fijo y no se configura por temporada. |
| E2 | Cada fecha dura **24 horas** y se cierra sola. |
| E3 | Por fecha: 3 intentos que cuentan (4 si es Underdog) **más 1 intento de práctica**. |
| E4 | La práctica solo se puede jugar **antes del intento 1 o entre el 1 y el 2**. Cuando se empieza el intento 2, ya no se puede jugar. |
| E5 | **Colchón:** si el intento 1 o el 2 se corta sin terminar (pestaña cerrada, corte de luz a mitad de partida) y la práctica no se usó, se gasta la práctica en lugar del intento. Desde el intento 3 no hay colchón. |
| E6 | **Sin conexión:** si el jugador terminó la partida y el resultado no se subió por un corte, se sube solo cuando vuelve la conexión y vale igual, como en el Playus original. |
| E7 | **Margen de 2 horas:** un resultado terminado que llega después del cierre vale si llega hasta 2 h después. La fecha se recalcula. El Underdog de la fecha siguiente, ya calculado, no se toca. Pasado el margen, se pierde. |
| E8 | **Revancha:** después del cierre, quien **no jugó** esa fecha tiene **1 intento**, sin práctica ni colchón. Solo cuenta si supera el **mejor resultado general** de la fecha. Si lo supera, gana **los mismos puntos que el ganador original** y los dos quedan 1.º con victoria (respuesta del usuario a la pregunta 2). Si no, no pasa nada. Es todo o nada. **La última fecha de la temporada no tiene revancha** (respuesta a la pregunta 3). |
| E9 | Los que ya jugaron **no pierden nada** con una revancha: el ganador original conserva sus puntos y su victoria. |
| E10 | El admin juega como cualquier jugador. |
| E11 | Hay que hacer todo lo que faltaba de la spec general: Underdog, varias fechas con campeón y desempate, cancelar, corregir y pausar. |
| E12 | **Ritmo por temporada** (pedido del usuario, 2026-11-04): al crearla se elige **diario** (el reloj de las 22:00, por defecto) o **maratón** (el admin abre y cierra cada fecha a mano, por ejemplo las 21 en una tarde). Una temporada maratón es real: cuenta en Playus igual que una diaria. El tick la ignora. **Sin revancha en maratón** [mi decisión: todos juegan en la misma tarde y la fecha siguiente se abre enseguida]. |

---

## 3. Reglas precisas

### 3.1 Reloj diario (E1, E2)
- Un trabajo programado de Postgres (`pg_cron`, disponible en el plan gratis) corre todos los días a las **01:00 UTC** y llama a una sola función interna, `nx_tick()`. **[mi decisión: un único tick diario hace todo en orden y en una transacción, así no hay carreras entre "cerrar" y "abrir"]**
- Hoy no hay ninguna temporada NEXPLAY en la base: se borraron todas tras la prueba de la etapa 2 (2026-11-04). Además, `nx_iniciar_temporada` ya rechaza una segunda temporada `activa` o `pausada`. Al activar el cron no hay nada que el tick pueda tocar por error.
- `nx_tick()` hace, en este orden, para la temporada NEXPLAY real que esté `activa` o `pausada` (hay a lo sumo una):
  1. **Cierra** la fecha `abierta`, si la hay (§3.6).
  2. **Finaliza** la temporada si ya se jugaron todas las fechas y terminó la ventana de revancha de la última (§3.9).
  3. **Abre** la siguiente fecha si la temporada está `activa` (no `pausada`) y todavía faltan fechas (§3.7).
- **Iniciar la temporada:** el admin la inicia desde NEXPLAY (`nx_iniciar_temporada`, ya existe) y queda `activa`. La Fecha 1 la abre el próximo tick de las 22:00. **[mi decisión: que el admin pueda iniciarla a cualquier hora sin pensar en el reloj]**
- **Temporadas de prueba (`es_prueba`):** el tick las ignora. El admin las sigue manejando a mano con "Iniciar fecha" y "Cerrar fecha", como en la etapa 2, para probar sin esperar 24 h. En temporadas reales esos botones no aparecen y las funciones manuales los rechazan. **[mi decisión: cerrar a mano una fecha real le acortaría el día a alguien]**
- **Temporadas maratón (E12):** `reglas->>'ritmo' = 'maraton'`. Se manejan a mano igual que las de prueba, pero son reales (récords, Playus). El tick las ignora. Las manuales se permiten si `es_prueba` **o** ritmo maratón; si no, lanzan `ritmo_diario`.
- Las funciones que llama el tick no pueden exigir `es_admin()`, porque `pg_cron` corre sin usuario. Se separa la lógica en funciones internas (sin `grant` a `authenticated`/`anon`) y los RPC del admin quedan como envoltorios que chequean permisos. En la auditoría, `admin_user_id` queda en null y `accion` con prefijo `auto_`. **[mi decisión]**
- Si el tick falla un día (por ejemplo, la base estuvo caída), el siguiente tick hace lo pendiente: cierra lo vencido y abre una fecha. No intenta "recuperar" días perdidos. **[mi decisión]**

### 3.2 Intentos por fecha (E3, E4)
- **Práctica:** es un intento real del servidor, del mismo juego y con semilla propia, pero no cuenta para nada: no entra en la tabla provisoria como resultado, ni en puntos ni en récords. Se modela como `intentos.numero = 0` (hay que ampliar el `check` de `1..4` a `0..4`). **[mi decisión]**
- Se puede empezar la práctica solo si no se usó antes y todavía no se empezó el intento 2.
- **Intentos que cuentan:** 1 a 3, o 1 a 4 si el jugador es Underdog de esa fecha. El cliente deja de tener `INTENTOS = 3` fijo y lee del servidor cuántos le quedan (arrastre de la etapa 2).
- En la tabla provisoria, "intentos usados" cuenta solo los que cuentan, sin la práctica. **[mi decisión]**

### 3.3 Colchón (E5)
- Hoy, cuando un jugador empieza un intento y tiene otro `en_curso`, el viejo pasa a `interrumpido` con motivo `abandonado` y cuenta como usado.
- Nuevo: si el intento abandonado es el **1 o el 2** y la práctica **no se usó**, se marca la práctica como consumida (`motivo = 'colchon'`, sin resultado) y el número abandonado **queda libre**, así que el jugador lo vuelve a jugar. Si la práctica ya se usó, o el abandonado es el 3 o el 4, se pierde como hoy.
- La práctica consumida por el colchón ya no se puede jugar.
- La práctica no tiene colchón: si se corta, se pierde.
- **Uso a propósito (aceptado por el usuario):** el servidor no distingue un corte real de cerrar la pestaña a propósito, así que el colchón funciona como un **comodín por fecha** que cada uno usa como quiera. No se intenta detectar el corte. Esto reemplaza, solo para los intentos 1 y 2 y una vez por fecha, el anti-objetivo de §1 sobre cerrar la pestaña.
- El intento que se vuelve a jugar recibe una **semilla nueva**. **[mi decisión]**
- Cada uso del colchón queda registrado (el intento abandonado conserva su fila con `motivo`), y se ve en la tabla del admin. **[mi decisión]**

### 3.4 Resultados sin conexión (E6)
- Cuando el juego termina, el cliente guarda el resultado en el dispositivo (`localStorage`: `intento_id`, resultado, datos) **antes** de enviarlo, y lo borra cuando el servidor confirma.
- Al abrir NEXPLAY o al volver la conexión, el cliente envía primero lo pendiente y recién después deja empezar otro intento. Así un resultado terminado nunca queda como abandonado.
- Ya existe la recuperación de una respuesta perdida en `Jugar.jsx`, que busca el intento guardado. Esto la extiende para que sobreviva a cerrar la pestaña.
- Límite aceptado: si el jugador terminó en un dispositivo y vuelve desde otro, el pendiente no viaja. Ese intento se trata como abandonado. **[mi decisión]**

### 3.5 Margen de 2 horas (E7)
- Al cerrar, los intentos `en_curso` pasan a `interrumpido` con motivo `fecha_cerrada`, como hoy.
- `nx_terminar_intento` acepta un intento `interrumpido` por `fecha_cerrada` si llega dentro de las **2 h** posteriores a `fechas.cerrada_en`. Pasa por la misma validación de siempre y, si es válido, queda `completado` y **recalcula la fecha cerrada** (§3.10). Después de las 2 h lo rechaza.
- Solo se pueden completar tarde los intentos que **empezaron antes del cierre**. Sí acepto un riesgo: quien empezó a las 21:59 podría jugar con el cierre ya visto. Es marginal, porque el resultado del juego no depende de saber los demás.
- El Underdog de la fecha siguiente no se recalcula.

### 3.6 Cierre de fecha
Es como `nx_cerrar_fecha` de la etapa 2 (puntos de la spec general §5), con estos cambios:
- Lo llama el tick (o el admin, solo en temporadas de prueba).
- La práctica (`numero = 0`) no cuenta.
- Ya no hay revisiones pendientes que tratar.
- Ya no finaliza la temporada directamente: eso pasa a §3.9.
- Abre la ventana de revancha de esa fecha (§3.8).

### 3.7 Apertura de fecha
Es como `nx_iniciar_fecha` de la etapa 2, con estos agregados:
- **Número y bonus:** `n` = cantidad de fechas `cerradas` + 1. Una cancelada no suma, así que la siguiente reutiliza su número y su bonus (ya funciona así).
- **Ruleta:** sortea entre los juegos jugables, no excluidos y no usados en fechas `abiertas` o `cerradas` de la temporada (ya funciona así). **Si no queda ningún juego elegible**, no abre la fecha, audita `auto_sin_juegos` y la temporada queda `pausada` para que el admin decida. **[mi decisión]** Ver §6: hoy hay un solo juego jugable.
- **Underdog** (n ≥ 2): los jugadores con cuenta `aceptada` que tienen el **menor total de puntos** de la temporada al abrir, contando solo fechas cerradas. Puede haber varios si hay empate, y entra quien recién se suma con 0. Se guardan en `fechas.underdogs` y no cambian durante la fecha. En la Fecha 1 no hay Underdog.

### 3.8 Revancha (E8, E9)
- **Quién:** los jugadores con cuenta `aceptada` que **no empezaron ningún intento que cuenta** (números 1 a 4) en esa fecha. La práctica no cuenta para esto. Quien jugó y le salieron todos inválidos o abandonados, o tiene un resultado tarde pendiente, ya jugó la fecha y no tiene revancha. **[mi decisión: "se perdió la fecha" = no la jugó; así nadie ve el número a superar después de haber jugado]**
- **Fecha sin jugadores** (`sin_jugadores`): no tiene revancha, porque no hay resultado que superar. **[mi decisión]**
- La revancha usa una **semilla nueva**. **[mi decisión]**
- **Cuándo:** desde el cierre hasta el cierre siguiente, 24 h, al mismo tiempo que la fecha nueva. **[mi decisión]** La última fecha de la temporada **no tiene revancha** (decisión del usuario).
- **Cómo:** 1 intento (`intentos.numero = 1`, más una marca `es_revancha` o un estado propio, lo decide el constructor). Sin práctica ni colchón: si se corta, se pierde.
- **Mejor resultado general:** el mejor resultado oficial de la fecha en el momento en que se termina la revancha. Incluye los resultados que entraron por el margen de 2 h y una revancha ganada antes por otro jugador.
- **Si lo supera estrictamente:** se escribe su fila en `resultados` con `performance`, `rivales_superados = |P| − 1` y `gemas = 10 + 10 × (|P| − 1) + bonus`, que son los mismos rivales y puntos que el ganador original. También `jugo = true`, y se actualiza su récord histórico (era `nexplay`). P es el conjunto de los que participaron en la fecha antes de la revancha. Así `puestoEnFecha` de Playus los deja a los dos en el 1.º y los dos suman victoria, sin cambiar Playus. **Las filas de los demás no se tocan.** Se audita como `auto_revancha_ganada`.
- **Si no lo supera:** no se escribe nada en `resultados` y solo queda el intento.
- **Victoria:** el ganador de la revancha y el ganador original tienen victoria los dos.

### 3.9 Fin de temporada, campeón y desempate
- La temporada se **finaliza** en el mismo tick que cierra la fecha número `cantidad_fechas`, porque esa fecha no tiene revancha. Si después entra un resultado tarde dentro del margen de 2 h, o el admin corrige algo, se recalcula el campeón (§3.10).
- **Ranking:** suma de `gemas` de las fechas `cerradas` de la temporada.
- **Desempate:**
  1. Más puntos.
  2. Más victorias.
  3. Enfrentamiento directo: entre los empatados, quién quedó mejor en las fechas que jugaron juntos, con la misma lógica que `compararEnFecha` de `src/lib/fecha.js`, llevada a SQL. Con 3 o más empatados es una **mini liga**: gana quien suma más duelos ganados contra los otros empatados, contando solo las fechas en las que ambos tienen `jugo = true` (una revancha ganada cuenta). Si hay un ciclo o un empate en la mini liga, se pasa al punto 4. **[mi decisión]**
  4. Si sigue el empate, **campeonato compartido**.
- `temporadas.campeon_id` es un solo id. Para el campeonato compartido hace falta guardar varios (por ejemplo, `campeones uuid[]`). Lo decide el constructor, cuidando que Playus (premios, museo, medallero) muestre bien a todos los campeones. Hoy Playus calcula el campeón desde el ranking, así que hay que revisar qué lee.
- Al finalizar se audita `auto_finalizar` con el ranking final.

### 3.10 Recalcular una fecha cerrada
- Lo usan el margen de 2 h (§3.5) y la corrección del admin (§3.11).
- Vuelve a calcular `resultados` de esa fecha a partir de los intentos válidos y conserva las filas ganadas por revancha. **[mi decisión: la revancha queda fuera del recálculo, porque se juzgó contra el mejor resultado de su momento]**
- Los récords históricos solo mejoran, nunca se empeoran (igual que hoy).
- No toca los Underdog de fechas posteriores.
- Si la temporada ya está finalizada, recalcula también el campeón. **[mi decisión]**

### 3.11 Herramientas del admin (todas auditadas y con motivo obligatorio)
- **Corregir resultado:** `nx_corregir_resultado(intento_id, nuevo_resultado, motivo)` guarda el valor anterior y el nuevo. Si la fecha está cerrada, la recalcula (§3.10). Se puede corregir un intento `completado` o `invalido`. **[mi decisión]**
- **Cancelar fecha:** `nx_cancelar_fecha(fecha_id, motivo)`, solo sobre una fecha `abierta`. Sus intentos quedan como historial y no reparte puntos. Su juego vuelve a la ruleta. No hay fecha ese día; la reemplazante se abre en el tick siguiente con el mismo número y bonus, así que la temporada dura un día más. Cancelar una fecha ya cerrada queda fuera. **[mi decisión]**
- **Pausar y reanudar:** `nx_pausar` y `nx_reanudar`. Pausar solo impide abrir fechas nuevas (decisión 23 de la spec general). La fecha abierta sigue y se cierra normalmente a las 22:00, y la revancha también sigue. Al reanudar, la próxima fecha se abre en el siguiente tick. `nx_empezar_intento` **no** mira la pausa. Con esto se cierra el arrastre de la etapa 2 a propósito.
- **Excluir juegos:** solo en `preparacion`, como en la spec general.

### 3.12 Admin jugador (E10)
El admin no tiene ninguna ventaja como jugador. Todo lo que hace como admin queda en `auditoria` con motivo, y la auditoría se puede leer desde NEXPLAY.

---

## 4. Pantallas (lo mínimo; el diseño visual sigue `DESIGN.md` y el skill `nexplay-design`)

- **Jugador, fecha abierta:**
  - Muestra cuánto falta para el cierre.
  - Botón "Práctica" mientras está disponible.
  - "Intento k de 3/4", con insignia Underdog cuando corresponde.
  - Aviso cuando el colchón salvó un intento.
- **Jugador, fecha cerrada sin jugar:** tarjeta "Revancha". Explica la regla de todo o nada, muestra el mejor resultado a superar y el tiempo que queda.
- **Resultado pendiente de subir:** un estado visible ("Guardado en tu dispositivo, se enviará al volver la conexión").
- **Inicio:** temporada con "Fecha n de N", próxima apertura a las 22:00 si no hay fecha abierta, ranking con desempate y campeón cuando termina.
- **Admin:** pausar y reanudar, cancelar la fecha abierta con motivo, corregir un intento con motivo, ver la auditoría. En temporadas de prueba, siguen los botones manuales de iniciar y cerrar.
- Cada pantalla nueva o cambiada lleva su contrato de estados en `docs/superpowers/specs/`, como en las etapas 1 y 2.

---

## 5. Playus existente

- Ya filtra fechas abiertas, canceladas y de prueba (etapa 2). Verificar que siga así con las fechas nuevas.
- **Victorias en Playus:** Playus deriva la victoria del puesto (`puestoEnFecha`: rivales primero, después gemas). Como la revancha ganada copia los rivales y los puntos del ganador original, los dos quedan 1.º y no hace falta cambiar nada.
- **Campeón en Playus:** revisar de dónde lo toman premios, museo y medallero para el caso de campeonato compartido.

---

## 6. Preguntas abiertas

Ninguna. Las respuestas del usuario (2026-11-04) quedaron en el documento:
1. El colchón se acepta como comodín (§3.3).
2. El que gana la revancha recibe los mismos puntos que el ganador original y los dos tienen victoria (E8, §3.8).
3. La última fecha no tiene revancha (E8, §3.9).

---

## 7. Lo que queda al constructor

- Cómo marcar la práctica y la revancha en `intentos` (número 0 y un flag, o un estado nuevo), sin romper `nx_tabla_provisoria`.
- Los nombres de las funciones internas y de los envoltorios.
- El orden de las migraciones (pg_cron necesita habilitar la extensión, y cada migración necesita el OK del usuario según la memoria del proyecto).
- Cómo probar el reloj sin esperar 24 h: llamar a `nx_tick()` a mano dentro de una transacción con datos de prueba, como en las pruebas SQL de la etapa 2.
- El formato de `performance`, que sigue con el shortcut de Count! en segundos.
