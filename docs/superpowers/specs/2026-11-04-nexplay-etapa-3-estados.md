# NEXPLAY etapa 3: contrato de estados

Fecha: 2026-11-04. Cubre las pantallas de las Tasks 8 (jugador) y 9 (admin) del plan `docs/superpowers/plans/2026-11-04-nexplay-etapa-3-integridad.md`: Inicio con la fecha abierta (cuenta regresiva, práctica, Underdog, colchón), el resultado pendiente de subir, la revancha, Inicio sin fecha (próxima apertura, pausa, cancelación, campeón) y el admin del torneo (ritmo, botones manuales, cancelar, corregir, pausar, auditoría).

Mismas reglas que los contratos de las etapas 1 y 2: el sistema visual es la skill `nexplay-design` y `DESIGN.md`, este documento dice **qué estados existen y qué se ve en cada uno**, y un estado que no está acá no existe todavía. Lo que no cambia sigue como en `2026-11-03-nexplay-etapa-2-estados.md`. Las decisiones marcadas **[mi decisión]** son mías y se pueden corregir.

El comportamiento del servidor sale de las migraciones `supabase/migrations/20261104_08` a `12`. Si este contrato y una migración no coinciden, manda la migración y se corrige el contrato.

---

## 0. Reglas comunes

Valen todas las de la sección 0 de las etapas 1 y 2. Se suman estas:

| Regla | Detalle |
|---|---|
| Hora | Toda hora se muestra en hora de Argentina (`America/Argentina/Buenos_Aires`), aunque el celu esté en otra zona, en formato 24 h: `22:00`. "Hoy" y "mañana" también se calculan en hora de Argentina. **[mi decisión]** |
| Cuenta regresiva | Etiqueta `CIERRA EN` (`stat-label`) y el valor debajo en Unbounded 700, 22px, `tabular-nums`, `--text1`: `5 h 12 min`; con menos de 1 h, `12 min`; con menos de 1 min, `45 s`. Se pone rubí recién en los últimos 5 s (regla del sistema). Se calcula con `proximaApertura(ahora)` de `reloj.js`, o sea con el reloj del celu. **[mi decisión]** |
| Lo pendiente va primero | Si hay un resultado guardado en el dispositivo (sección 3), se envía antes que cualquier otra cosa. Mientras tanto, los botones "Jugar", "Práctica" y "Jugar revancha" quedan deshabilitados y debajo dice "Primero enviamos tu resultado guardado." |
| Intentos por jugador | En ningún lado queda escrito "3" fijo: el máximo sale de `nx_mi_fecha` (`intentos_max`, 3 o 4). |
| Chips nuevos | `UNDERDOG` (live, con el punto que late, como fija `DESIGN.md`), `PAUSADA` (warning) **[mi decisión: no estaba en la lista cerrada de etiquetas; ámbar porque es una advertencia, no algo en vivo]**, `PENDIENTE` (warning, ya existía). |
| Tiempos | Como en la etapa 2: segundos con 2 decimales y punto, `4.70 s`. El "a superar" de la revancha también. |
| Acción del admin con motivo | El motivo se pide en el mismo lugar de la acción (hoja inferior o fila), nunca con `prompt()`. El botón de confirmar queda deshabilitado mientras el motivo esté vacío o sea solo espacios. |
| 320 px | Cada sección dice qué pasa a 320 px. Regla general: nada hace scroll horizontal y los botones ocupan el ancho completo. |

---

## 1. Inicio con fecha abierta (jugador)

**Orden fijo:** saludo → resultado pendiente (si hay, sección 3) → panel en vivo de la fecha → acción → revancha (si hay, sección 4) → tabla provisoria → enlaces del admin.

La pantalla pide `getTorneoActual()`, `getMiFecha(fecha_id)`, `getMisIntentos(fecha_id, jugador_id)` y `getMiRevancha()`. Todo se vuelve a pedir cada 10 s, como la tabla.

### 1.1 Panel en vivo

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Cargando / error | | Reglas comunes ("Cargando la sala…") | ninguno |
| Sin jugar | `usados = 0` | Como en la etapa 2: chip `EN VIVO`, `FECHA {n} DE {total}`, el juego en Unbounded. La línea de reglas pasa a "{max} intentos. Cuenta el mejor." Debajo, la cuenta regresiva. Botón dorado **"Jugar"**. | "Jugar" |
| Jugando | `0 < usados < max` | "Tu mejor: 4.70 s" (o "Sin intento válido todavía"), los puntos de intento (3 o 4), `INTENTO {usados+1} DE {max}` y el botón dorado **"Jugar intento {k}"**. | el botón |
| Underdog | `underdog = true` | Además, en la fila de arriba, al lado de `EN VIVO`, el chip `UNDERDOG · 4º intento` y debajo de las reglas: "Sos Underdog: tenés 4 intentos en esta fecha." El cuarto punto va con borde zafiro hasta que se usa. | |
| Sin intentos | `usados = max` | "Usaste tus {max} intentos. Tu mejor: 4.70 s." (o "Ninguno fue válido."). Sin botón dorado. La cuenta regresiva sigue. | ninguno |
| Fecha de prueba o maratón | `es_prueba` o ritmo `maraton` | En lugar de la cuenta regresiva: "Abierta desde las {hh:mm}. La cierra el admin." **[mi decisión: esas fechas no tienen hora de cierre]** | |
| Cerrando | La cuenta llegó a 0 y el refresco todavía trae la fecha abierta | La cuenta se reemplaza por "Cerrando la fecha…" (`--caption`). El botón dorado se deshabilita. Cuando el refresco trae la fecha cerrada, pasa a la sección 5. **[mi decisión]** | ninguno |
| Temporada pausada con fecha abierta | `temporada.estado = 'pausada'` | Todo igual (la fecha se juega normal), más una línea `--caption` al pie del panel: "La temporada está en pausa: después de esta fecha no se abre otra hasta que el admin la reanude." | el de arriba |
| Cuenta sin jugador | como en la etapa 2 | "Vinculá tu cuenta a un jugador en Jugadores para poder jugar." | ninguno |

### 1.2 Práctica

Va dentro del panel, debajo del botón dorado, como botón **secundario** "Práctica" (el oro sigue siendo "Jugar").

| Estado | Cuándo (`nx_mi_fecha.practica`) | Qué se ve |
|---|---|---|
| Disponible | `disponible` | Botón secundario "Práctica" y debajo `--caption`: "No cuenta para nada. La podés jugar hasta que empieces el intento 2." |
| Disponible con un intento cortado | `disponible` y hay un intento 1 o 2 `en_curso` sin resultado guardado | El botón "Práctica" **no se muestra** (se ve la línea del colchón, 1.3). **[mi decisión]** Si se empezara la práctica en ese momento, el servidor da el intento cortado por perdido y el colchón no lo salva: es una trampa que la pantalla evita. |
| Usada | `usada` y `colchon_usado = false` | Sin botón. `--caption`: "Ya usaste la práctica." |
| Usada por el colchón | `usada` y `colchon_usado = true` | Sin botón. Se ve la línea de 1.3 ("El colchón te salvó…"). |
| Cerrada | `cerrada` | Sin botón. `--caption`: "La práctica se cerró al empezar el intento 2." |
| Sin intentos | `usados = max` | Sin botón ni línea de práctica. |

### 1.3 Colchón e intentos cortados

`getMisIntentos` dice qué pasó con cada intento. Un intento `en_curso` que tiene un resultado guardado en el dispositivo **no** está cortado: se envía (sección 3).

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Cortado con colchón | Intento 1 o 2 `en_curso`, sin pendiente, práctica `disponible` | `--caption` debajo del botón: "El intento {k} quedó sin terminar. Te salva el colchón: lo volvés a jugar con otro tablero y se gasta la práctica." El botón sigue diciendo **"Jugar intento {k}"** (el mismo número). | el botón |
| Cortado sin colchón | Intento `en_curso`, sin pendiente, y es el 3 o el 4, o la práctica ya no está | Como en la etapa 2: "El intento {k} quedó sin terminar y cuenta como usado." El botón dice "Jugar intento {k+1}" (o no hay botón si era el último). | el botón o ninguno |
| El colchón ya salvó | `colchon_usado = true` | `--caption` `--text2` fija en el panel: "El colchón te salvó el intento {k}." El `k` es el `numero` del intento con `motivo = 'colchon'`. No va en esmeralda: es un aviso, no un resultado válido. **[mi decisión]** | |
| Práctica cortada | Práctica (`numero = 0`) `en_curso` o con motivo `abandonado` | `--caption`: "La práctica quedó sin terminar y se gastó." | |

### 1.4 Tabla provisoria

Igual que en la etapa 2, con dos cambios:
- La columna de intentos muestra "{usados}/{max}" y el máximo es 4 para los jugadores que están en `fechas.underdogs`. No lleva chip `UNDERDOG` en la tabla, para no llenarla de zafiro. **[mi decisión]**
- La práctica y la revancha no aparecen (la vista ya las excluye).

### 1.5 A 320 px

El chip `EN VIVO` y el `UNDERDOG · 4º intento` no entran en una sola fila con el nombre del juego: los chips van en su propia fila arriba (pueden partirse en dos líneas) y el juego debajo. La cuenta regresiva entra porque la etiqueta y el valor van en dos líneas (`23 h 59 min` mide unos 170px). Los 4 puntos de Underdog miden 52px y no cambian. Los botones "Jugar" y "Práctica" van uno debajo del otro, a ancho completo.

---

## 2. Jugar: práctica, colchón y cuántos intentos

Lo que no está acá sigue igual que en la sección 2 de la etapa 2.

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Ruleta | Primera entrada a la fecha: no hay ningún intento propio, **ni siquiera la práctica** | Igual que en la etapa 2. Si se entró por "Práctica", después de la ruleta va a "Antes de la práctica". **[mi decisión: la ruleta es la primera vez que se ve el juego, sea práctica o intento 1]** | ninguno |
| Antes de la práctica | `/jugar?practica=1` | Etiqueta `PRÁCTICA`, el juego, las instrucciones abiertas, y `--caption`: "No cuenta para la tabla ni para los puntos. Si se corta, se pierde." Botón dorado **"Empezar práctica"**. | "Empezar práctica" |
| Antes del intento k | | Etiqueta `INTENTO {k} DE {max}` (3 o 4). Si es Underdog, el chip `UNDERDOG · 4º intento` debajo de la etiqueta. | "Jugar intento {k}" |
| Antes del intento salvado | Se entra con un intento cortado y colchón disponible | Lo mismo, más `--caption`: "Colchón: el intento {k} vuelve a empezar con otro tablero." | el botón |
| Error al pedir la práctica | `nx_empezar_intento` lanza `sin_practica` | Vuelve a Inicio con el texto de la sección 7 en una línea `--caption` arriba del panel por 3 s. | |
| Resultado de la práctica | La práctica volvió `completado` | Etiqueta `PRÁCTICA`, el tiempo grande en `--text1` (**nunca en oro**: no es una marca), chip esmeralda `VÁLIDO` y `--caption`: "No cuenta para la tabla." Botón dorado **"Jugar intento {k}"** y secundario "Ver la tabla". **[mi decisión]** | "Jugar intento {k}" |
| Práctica no válida | volvió `invalido` | Chip `FALLADO` y el motivo (sección 7), más "Igual no contaba." Mismos botones. | igual |
| Después del último | Era el intento `max` | "Usaste tus {max} intentos. Tu mejor: 4.70 s." | ninguno |

**Un solo flujo de envío.** La práctica y la revancha se guardan y se envían igual que un intento normal (sección 3). **[mi decisión: menos ramas en el código; a la práctica no le hace falta, pero tampoco molesta]**

**A 320 px:** igual que la etapa 2 (grilla de 288px). El chip `UNDERDOG · 4º intento` entra en una línea (unos 170px).

---

## 3. Resultado pendiente de subir

El cliente guarda el resultado en `localStorage` (`nx_pendiente`) **antes** de llamar a `nx_terminar_intento` y lo borra cuando el servidor responde. Un resultado pendiente vale aunque la fecha se haya cerrado, si llega hasta **2 h después del cierre** (`fuera_de_plazo` después). La revancha tiene su propio plazo: las 24 h desde el cierre de su fecha.

### 3.1 En Jugar (al terminar)

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Enviando | Terminó la partida | Como en la etapa 2: el tiempo grande y "Guardando…". | ninguno |
| Guardado en el dispositivo | `nx_terminar_intento` falla por red | Reemplaza el "Envío fallido por red" de la etapa 2. El tiempo sigue grande, chip `PENDIENTE` y el texto: "Tu resultado quedó guardado en este celu. Se envía solo cuando vuelva la conexión." Botón secundario "Reintentar ahora" y otro "Volver al inicio". Con el evento `online` se reintenta solo. | ninguno |
| Enviado | El servidor respondió | Pasa al resultado normal (válido o no válido) de la etapa 2. | según la etapa 2 |
| Llegó tarde, pero a tiempo | El intento estaba cortado por el cierre y llegó dentro de las 2 h | El resultado normal, más una línea esmeralda: "Llegó a tiempo: cuenta para la Fecha {n}. La tabla se recalculó." | según la etapa 2 |
| Fuera de plazo | Lanza `fuera_de_plazo` | Se borra el pendiente. Panel rubí: "Tu resultado llegó tarde: pasaron más de 2 horas del cierre y ya no cuenta." (en la revancha: "La revancha venció antes de que llegara tu resultado."). Botón "Volver al inicio". | |
| Rechazado | Lanza `intento_cerrado` o `intento_ajeno` | Se borra el pendiente. Panel rubí: "Ese intento ya no se puede guardar. La fecha se cerró, se canceló o empezaste la revancha." Botón "Volver al inicio". | |
| Sin `localStorage` | Navegación privada que lo bloquea | No se puede guardar en el celu. Se ve el panel rubí de la etapa 2: "No pudimos guardar el intento. Tu tiempo sigue acá. No cierres esta pestaña." con "Reintentar" (manda el mismo resultado desde la memoria). **[mi decisión: no prometer lo que no se guardó]** | ninguno |

### 3.2 En Inicio (al abrir NEXPLAY o al volver la conexión)

Va en un `gem-panel-sm` arriba del panel de la fecha (o solo, si no hay fecha abierta).

| Estado | Cuándo | Qué se ve |
|---|---|---|
| Pendiente sin conexión | Hay pendiente y el envío falla por red | Chip `PENDIENTE` y "Tenés un resultado sin enviar: {tiempo} del {intento k / la práctica / la revancha}. Se envía solo cuando vuelva la conexión." Si la fecha ya cerró, debajo `--caption`: "Tiene tiempo de llegar hasta las {cerrada_en + 2 h, hh:mm}." Botón secundario "Reintentar ahora". |
| Enviando | Corre el envío | "Enviando tu resultado…" en el mismo panel. Los botones de jugar quedan deshabilitados (regla 0). |
| Enviado | El servidor respondió | El panel se reemplaza por una línea esmeralda por 5 s: "Tu resultado del intento {k} llegó: {tiempo}." Si no fue válido: línea rubí "Tu resultado del intento {k} llegó, pero no es válido: {motivo}." Si llegó tarde y valió: "Llegó a tiempo: tu {tiempo} cuenta para la Fecha {n}." |
| Fuera de plazo o rechazado | Igual que en 3.1 | Se borra el pendiente. Panel rubí con el mismo texto de 3.1 y un botón secundario "Entendido" que lo cierra. Como el pendiente ya no está, al recargar no vuelve a aparecer. |
| Pendiente en otro dispositivo | Terminó en otro celu | No se ve nada: ese intento queda cortado (sección 1.3). Límite aceptado en la spec §3.4. |

**A 320 px:** el panel pendiente es texto que se parte en líneas. "Reintentar ahora" va a ancho completo debajo.

---

## 4. Revancha

Fuente: `nx_mi_revancha()` → `{fecha_id, numero_fecha, juego, a_superar, termina_en}` o null. Si es null, no se ve nada de esta sección.

Reglas que la pantalla tiene que explicar: 1 intento, tablero nuevo, sin práctica ni colchón; dura 24 h desde el cierre; gana solo si supera **estrictamente** el mejor resultado de la fecha, y entonces suma los mismos puntos que el ganador y los dos quedan 1.º. No existe en la última fecha, en temporadas maratón, en fechas canceladas ni en fechas que nadie jugó (el servidor ya no la devuelve). La puede tener quien no jugó la fecha, o quien tuvo un solo intento y se lo cortó el cierre sin terminarlo.

### 4.1 Tarjeta en Inicio

Va después del panel de la fecha (o del panel "sin fecha") y antes de la tabla. `gem-panel` sin borde de color: no está en vivo para la tabla. **[mi decisión]**

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Disponible | `nx_mi_revancha` trae datos | `stat-label` `REVANCHA · FECHA {n}`, el juego (Inter 600, no Unbounded, para no pasar de 3 Unbounded en la pantalla). Texto: "Te perdiste la Fecha {n}. Tenés 1 intento para superar {a_superar}." Debajo: "Si lo superás, ganás los mismos puntos que el ganador y los dos quedan 1.º. Si no, no pasa nada." `--caption`: "Sin práctica ni colchón: si se corta, se pierde." Y `TERMINA EN` con la cuenta regresiva hasta `termina_en` (mismo formato de la regla 0, pero en Inter 600 16px, no Unbounded). Botón **"Jugar revancha"**. | dorado solo si no hay otro oro en la pantalla (no hay fecha abierta o no le quedan intentos); si no, secundario **[mi decisión]** |
| Número a superar nuevo | El refresco trae otro `a_superar` (entró un resultado tarde u otro ganó su revancha) | El número cambia con el destello `--surface3` de 320ms. Siempre visible, `--caption`: "El número puede bajar si entra un resultado tarde u otra revancha gana antes que vos." | |
| Con un intento cortado de esa fecha | En `getMisIntentos(fecha_id)` hay un intento `interrumpido` por `fecha_cerrada` y todavía no pasaron las 2 h del cierre | Al tocar "Jugar revancha" se abre una hoja inferior: "¿Empezar la revancha?" + "Tu intento {k} de la Fecha {n} se cortó con el cierre. Si empezás la revancha, ese intento ya no se puede subir aunque lo termines." Botones **"Empezar revancha"** (dorado de la hoja) y "Volver" (secundario). | el de la hoja |
| Con un pendiente de esa fecha | Hay un resultado guardado de esa fecha | "Jugar revancha" deshabilitado con "Primero enviamos tu resultado guardado." (regla 0). Si el pendiente llega y vale, el jugador ya jugó y la tarjeta desaparece sola en el refresco. | ninguno |
| Venció mientras miro | La cuenta llega a 0 | La tarjeta se va en el siguiente refresco. Mientras tanto el botón queda deshabilitado y la cuenta dice "Terminó". | |
| Revancha cortada | El intento de revancha quedó `en_curso` sin pendiente (cerró la pestaña) | La tarjeta ya no sale (el servidor no la devuelve). En su lugar, `--caption`: "Tu revancha de la Fecha {n} quedó sin terminar y se perdió." hasta que venza la ventana. Necesita que `getMisIntentos` traiga `es_revancha`. **[mi decisión]** | |
| Sin revancha | null | Nada. No se explica por qué (última fecha, maratón, ya jugó): no hay nada que hacer. **[mi decisión]** | |

### 4.2 Jugar la revancha (`/jugar?revancha=<fecha_id>`)

Sin ruleta: el juego ya se conoce.

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Antes | Al entrar | Etiqueta `REVANCHA · FECHA {n}`, el juego, "A superar: {a_superar}" (Inter 600 grande, `tabular-nums`), las instrucciones en `<details>` cerrado, y `--caption`: "Un solo intento. Si salís en medio, se pierde." Botón dorado **"Empezar revancha"**. | "Empezar revancha" |
| Pidiendo | Corre `nx_empezar_revancha` | "Preparando…" | |
| Sin revancha | Lanza `sin_revancha` | Vuelve a Inicio con el texto de la sección 7 por 3 s. | |
| Cuenta regresiva y juego | | Iguales a la etapa 2. Arriba de la grilla, al lado del cronómetro, `--caption` "A superar {a_superar}". | ninguno |
| Enviando / pendiente | | Sección 3. El plazo es `termina_en`. | |
| Ganada | Volvió `completado` con `motivo = 'revancha_ganada'` | Etiqueta `REVANCHA · FECHA {n}`, el tiempo en **oro** (es la mejor marca de la fecha) con el destello de récord una vez. Texto: "¡Superaste {a_superar}! Sumás los mismos puntos que el ganador y quedás 1.º de la Fecha {n}." Botón secundario "Volver al inicio". | el número |
| Perdida | `motivo = 'revancha_perdida'` | El tiempo en `--text1`, chip `VÁLIDO` y: "No alcanzó: había que superar {a_superar}. No pasa nada: tus puntos quedan como estaban." Botón secundario "Volver al inicio". | ninguno |
| No válida | Volvió `invalido` | Chip `FALLADO`, el motivo (sección 7) y "La revancha ya se usó." | ninguno |

**A 320 px:** "A superar: 4.70 s" entra en una línea. La hoja inferior de confirmación ocupa el ancho completo con los botones uno debajo del otro.

---

## 5. Inicio sin fecha abierta

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Esperando la Fecha 1 o la siguiente, diaria | Temporada `activa`, ritmo diario, real, sin fecha abierta | `TEMPORADA`, nombre, `FECHA {n} DE {total}` y "Próxima fecha: hoy a las 22:00." (o "mañana a las 22:00." si ya pasaron las 22:00 en Argentina). | ninguno, o "Jugar revancha" |
| Esperando, a mano | Temporada `activa` de prueba o maratón | Como en la etapa 2: "Esperando que el admin abra la próxima fecha." | igual |
| Fecha cancelada | La última fecha de la temporada está `cancelada` y no hay otra abierta | Además de lo anterior, una línea `--text2`: "El admin canceló la Fecha {n}. No reparte puntos y se vuelve a jugar con el mismo número {hoy a las 22:00 / cuando el admin la abra}." Necesita que `getTorneoActual` deje ver la cancelada. **[mi decisión: el aviso dura hasta que se abre la reemplazante]** | igual |
| Fecha cerrada mientras miro | El refresco trae la fecha cerrada | Como en la etapa 2 ("La Fecha {n} se cerró. Los puntos ya están en Playus."), con la próxima apertura debajo. | |
| Pausada | Temporada `pausada`, sin fecha abierta | Chip `PAUSADA`, nombre, `FECHA {n} DE {total}` y "La temporada está en pausa. La próxima fecha se abre cuando el admin la reanude." | igual |
| Finalizada, un campeón | `finalizada` y `campeones` con 1 id | "La temporada {nombre} terminó." `stat-label` `CAMPEÓN` y el apodo en Unbounded 700 en **oro** (es el puesto 1). Si sos vos: "Ganaste la temporada." debajo. Enlace "Ver el ranking en Playus" (`/`). **[mi decisión: oro en el nombre del campeón]** | el nombre |
| Finalizada, campeonato compartido | `campeones` con 2 o más ids | `CAMPEONES` y los apodos en oro unidos por coma y "y": "Ana y Beto", "Ana, Beto y Caro". `--caption`: "Empataron en puntos, victorias y duelos entre ellos: el título es compartido." | los nombres |
| Finalizada sin campeón | `campeones` vacío o null (nadie jugó) | "La temporada {nombre} terminó sin campeón." | ninguno |
| Campeón que cambia | Entra un resultado tarde o una corrección después del final | Se muestra lo último que trae el refresco, sin aviso. | |

**A 320 px:** los apodos de los campeones cortan con `…` cada uno en su línea si no entran juntos; con 3 o más campeones, uno por línea. "Próxima fecha: mañana a las 22:00." se parte en dos líneas sin problema.

---

## 6. Admin del torneo (`/admin/torneo`)

Lo que no está acá sigue igual que en la sección 5 de la etapa 2. Sigue habiendo un solo oro: la acción que destraba el paso siguiente.

### 6.1 Crear temporada: ritmo

| Estado | Qué se ve |
|---|---|
| Formulario | Lo de la etapa 2 más el grupo "Ritmo" (dos opciones de radio a ancho completo, 56px, la elegida con el estado seleccionado del sistema): **"Diario · 22:00"** (por defecto), con `--caption` "Se abre y se cierra sola todos los días a las 22:00." y **"Maratón · a mano"**, con `--caption` "Abrís y cerrás cada fecha vos. Cuenta en Playus igual. Sin revancha." |
| Prueba marcada | Con "Es de prueba" marcado, debajo del grupo: "Las temporadas de prueba se abren y se cierran a mano, con cualquier ritmo." El ritmo se manda igual (decide si hay revancha). |
| Error | `ritmo_invalido` debajo del grupo (sección 7). |

### 6.2 En preparación

| Estado | Qué se ve | Oro |
|---|---|---|
| Normal | Nombre, "{total} fechas", chip "De prueba" si corresponde, y el ritmo en texto ("Diario · 22:00" o "Maratón · a mano"). Texto de reglas: "Al iniciarla se congelan las reglas: 3 intentos (4 para el Underdog) más 1 de práctica, 10 puntos base, 10 por rival y bonus de 5% por fecha." Si es diaria y real: "La Fecha 1 se abre sola a las 22:00 después de iniciarla." | "Iniciar temporada" |
| Juegos de la ruleta | Lista de los juegos jugables (con módulo), cada uno en una fila de 48px con un interruptor "En la ruleta". Apagado = excluido. Al tocar, el interruptor queda deshabilitado hasta que responde `nx_excluir_juego`. | |
| Todos excluidos | Línea ámbar: "Sin juegos en la ruleta, la temporada se va a pausar sola al abrir la Fecha 1." | |
| Error al excluir | Debajo de la fila (`estado_invalido` recarga, sección 7). | |

### 6.3 Activa o pausada

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Diaria real sin fecha | | `FECHA {n} DE {total}` y "Se abre sola hoy a las 22:00." (o mañana). **Sin botón de abrir.** | ninguno |
| Prueba o maratón sin fecha | | Como en la etapa 2: **"Abrir Fecha {n}"**. | "Abrir Fecha {n}" |
| Pausar | Temporada `activa` | Botón secundario "Pausar temporada", al final del panel de la temporada. | |
| Confirmar pausa | Se tocó "Pausar temporada" | Hoja inferior: "¿Pausar {nombre}?" + "No se abren fechas nuevas hasta que la reanudes. La fecha abierta sigue y se cierra normal, y las revanchas también siguen." Input "Motivo" (obligatorio). Botones "Pausar" (secundario con borde ámbar **[mi decisión: no es destructivo, se deshace]**) y "Volver". | ninguno |
| Pausando | | "Pausando…" | |
| Pausada | Temporada `pausada` | Chip `PAUSADA` y botón **"Reanudar temporada"** (sin motivo ni confirmación: el servidor no lo pide). Si es diaria: "Al reanudarla, la próxima fecha se abre a las 22:00." | "Reanudar temporada" |
| Pausada sola | La última acción de la auditoría para la temporada es `auto_sin_juegos` | Además, línea ámbar: "Se pausó sola: no quedan juegos para la ruleta." **[mi decisión]** | igual |
| Reanudando | | "Reanudando…" | |

### 6.4 Fecha abierta

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Diaria real | | Panel en vivo de la etapa 2 con la cuenta regresiva (`CIERRA EN`). **Sin "Cerrar fecha".** | ninguno |
| Prueba o maratón | | Como en la etapa 2, con "Cerrar fecha" (rubí). | ninguno |
| Cancelar | Siempre que haya fecha abierta (cualquier ritmo) | Botón secundario "Cancelar fecha" debajo de todo. **[mi decisión: secundario, para no tener dos botones rubí juntos; el rubí está en la confirmación]** | |
| Confirmar cancelación | Se tocó "Cancelar fecha" | Hoja inferior: "¿Cancelar la Fecha {n}?" + "No reparte puntos y sus intentos quedan como historial. El juego vuelve a la ruleta y la fecha se repite con el mismo número y bonus {hoy/mañana a las 22:00 / cuando la abras}." Si es diaria: "La temporada dura un día más." Si hay alguien `en_juego`: línea rubí "{k} jugando ahora: pierden ese intento." Input "Motivo" (obligatorio). Botones **"Cancelar fecha"** (rubí) y "Volver". | ninguno |
| Cancelando | | "Cancelando…" | |
| Cancelada | Respondió | Vuelve al estado sin fecha, con la línea `--text2`: "Fecha {n} cancelada." | |

### 6.5 Corregir un intento

Cada fecha (la abierta y cada cerrada de la lista) tiene un `<details>` "Intentos". Se lee con `intentos` de esa fecha (lectura pública) y se ordena por apodo y número. **[mi decisión]**

| Estado | Qué se ve |
|---|---|
| Cargando / vacío | "Cargando intentos…" / "Nadie jugó esta fecha." |
| Fila | Apodo (corta con `…`), "Intento {k}" (o "Práctica" o "Revancha"), el tiempo o "—", y el estado: chip `VÁLIDO`, `FALLADO` con el motivo en `--caption`, o en `--caption` "sin terminar", "colchón", "cortado por el cierre", "cancelada", "corregido". |
| Corregible | Estado `completado` o `invalido`, ni práctica ni revancha | Botón secundario "Corregir" en la fila. La práctica no lo lleva aunque el servidor lo permita. **[mi decisión: no cuenta para nada]** |
| Corrigiendo | Se tocó "Corregir" | En la misma fila: input "Tiempo nuevo (s)" (decimal, `inputmode="decimal"`, acepta coma o punto), input "Motivo" y botones "Guardar corrección" (secundario) y "Volver". "Guardar corrección" queda deshabilitado sin motivo o con un tiempo que no sea un número mayor que 0. Se manda en milisegundos. |
| Guardando | "Guardando…" y la fila deshabilitada. |
| Corregido | La fila muestra el tiempo nuevo con "corregido". Si la fecha estaba cerrada, línea esmeralda: "Corregido. La Fecha {n} se recalculó." Se vuelven a pedir la fila y la tabla. |
| Error | Debajo de la fila (sección 7). `no_corregible` recarga la lista. |

### 6.6 Auditoría

Último `gem-panel` de la pantalla, `stat-label` `AUDITORÍA`. Es un `<details>` cerrado: se pide recién al abrirlo (`getAuditoria({ limite: 50 })`). **[mi decisión]** El servidor **no deja leer `motivo`** (migración `20261102_03`), así que no se muestra (ver la pregunta abierta).

| Estado | Qué se ve |
|---|---|
| Cargando | "Cargando la auditoría…" |
| Error | Error de red con "Reintentar" dentro del panel. |
| Vacía | "Todavía no hay acciones registradas." |
| Filas | Una por acción, de la más nueva a la más vieja. Arriba, `--caption` `--text3`: "{dd/mm hh:mm} · {Admin / Automático}" (Automático si `admin_user_id` es null o la acción empieza con `auto_`). Abajo, la acción en `--body` según la tabla de abajo. Al final, `<details>` "Ver antes y después" con `antes` y `despues` en IBM Plex Mono 12px, con saltos de línea y cortes en cualquier carácter. |
| Pie | `--caption`: "Se muestran las últimas 50 acciones. El motivo queda guardado, pero no se ve acá." |

| `accion` | Texto |
|---|---|
| `crear_invitacion` | Generó un link de invitación |
| `aceptar_jugador` | Aceptó una cuenta |
| `bloquear_jugador` | Bloqueó una cuenta |
| `crear_temporada` | Creó la temporada {nombre de `despues`} |
| `iniciar_temporada` | Inició la temporada |
| `iniciar_fecha`, `auto_iniciar_fecha` | Abrió la Fecha {numero_fecha} |
| `cerrar_fecha`, `auto_cerrar_fecha` | Cerró una fecha |
| `finalizar`, `auto_finalizar` | Terminó la temporada |
| `auto_sin_juegos` | Pausó la temporada: no quedan juegos |
| `cancelar_fecha` | Canceló la Fecha {numero_fecha de `antes`} |
| `corregir_resultado` | Corrigió un intento: {antes.resultado} → {despues.resultado} (en segundos) |
| `pausar` | Pausó la temporada |
| `reanudar` | Reanudó la temporada |
| `excluir_juego` | Sacó un juego de la ruleta / Volvió a poner un juego en la ruleta |
| `auto_revancha_ganada` | Alguien ganó una revancha |
| otra | el código tal cual, en Plex Mono |

### 6.7 A 320 px

Las hojas inferiores ocupan el ancho completo y el input de motivo, los dos botones y el texto van uno debajo del otro; con el teclado abierto, la hoja sube y el botón de confirmar sigue visible. Las filas de intentos pasan a dos líneas (apodo y número arriba; tiempo, estado y "Corregir" abajo). En la corrección, los dos inputs van uno debajo del otro a ancho completo. En la auditoría, el JSON corta línea dentro de su caja: nada hace scroll horizontal. Las opciones de ritmo van una debajo de la otra.

---

## 7. Textos de errores y motivos

Todos en `textoDeError` (`src/nexplay/componentes.jsx`). Reemplazan o se suman a las tablas de las etapas 1 y 2.

| Código | Texto | Además |
|---|---|---|
| `sin_practica` | Ya no podés jugar la práctica: se juega antes del intento 2, una sola vez. | se recarga Inicio |
| `sin_intentos` | Ya usaste tus {max} intentos. | vuelve a Inicio |
| `sin_revancha` | Esa revancha ya no está disponible. | se recarga Inicio |
| `fuera_de_plazo` | Tu resultado llegó tarde: pasaron más de 2 horas del cierre y ya no cuenta. (En la revancha: La revancha venció antes de que llegara tu resultado.) | se borra el pendiente |
| `intento_cerrado`, `intento_ajeno` | Ese intento ya no se puede guardar. La fecha se cerró, se canceló o empezaste la revancha. | se borra el pendiente |
| `ritmo_diario` | Esta temporada se abre y se cierra sola a las 22:00. | se recarga la pantalla |
| `ritmo_invalido` | Elegí Diario o Maratón. | |
| `motivo_vacio` | Escribí un motivo. | (no debería pasar: el botón está deshabilitado) |
| `estado_invalido` | La temporada cambió de estado. Actualizamos la pantalla. | se recarga la pantalla |
| `no_corregible` | Ese intento ya no se puede corregir. Actualizamos la lista. | se recarga la lista |
| `resultado_invalido` | Escribí un tiempo válido, por ejemplo 4.70. | |
| `fecha_no_abierta` | La fecha ya se cerró. | se recarga la pantalla |
| `temporada_no_activa` | La temporada no está en juego. Actualizamos la pantalla. | se recarga la pantalla |
| `ya_hay_fecha_abierta` | Ya hay una fecha abierta. Actualizamos la pantalla. | se recarga la pantalla |
| `temporada_completa` | Ya se jugaron todas las fechas de la temporada. | |
| `sin_juegos_elegibles` | No quedan juegos para la ruleta en esta temporada. | |
| `solo_admin` | (sin texto) se recarga la cuenta y se sale del admin | como en la etapa 1 |
| `no_habilitado` | Tu cuenta todavía no puede jugar. Hablá con el admin. | |
| cualquier otro | No pudimos conectar con NEXPLAY. Revisá tu conexión y probá de nuevo. | |

**Motivos nuevos de un intento** (se suman a la tabla de la etapa 2):

| Motivo | Texto |
|---|---|
| `demasiado_lento` | Ese intento pasó de 1 hora. |
| `colchon` | (no se muestra como resultado) El colchón salvó este intento. |
| `fecha_cancelada` | La fecha se canceló. |
| `corregido` | El admin corrigió este resultado. |
| `revancha_ganada`, `revancha_perdida` | (no son errores; ver 4.2) |

---

## 8. Casos extremos que el QA prueba

| Caso | Resultado esperado |
|---|---|
| Recargar a mitad del intento 1 con la práctica sin usar | Inicio muestra "Te salva el colchón"; "Jugar intento 1" da otro tablero; después, "El colchón te salvó el intento 1." y la práctica ya no está. |
| Lo mismo en el intento 3 | "El intento 3 quedó sin terminar y cuenta como usado." |
| Jugar la práctica entre el intento 1 y el 2 | Se puede. Al empezar el 2, la práctica pasa a "cerrada". |
| Underdog (con `underdogs` puesto a mano) | Chip `UNDERDOG · 4º intento`, 4 puntos, "/4" en la tabla, "Usaste tus 4 intentos." al final. |
| DevTools sin conexión al terminar | `PENDIENTE` en Jugar; al volver online se envía solo y Inicio muestra "Tu resultado del intento {k} llegó". |
| Sin conexión al terminar, cerrar la pestaña y volver después | Inicio envía lo pendiente antes de dejar jugar. |
| El cierre pasa mientras estoy en la grilla | Si termino y llega antes de 2 h: "Llegó a tiempo". Después de 2 h: "llegó tarde". |
| Revancha con un intento cortado de esa fecha (antes de las 2 h) | Sale la hoja de aviso antes de empezar. Después de empezarla, subir el intento cortado da "Ese intento ya no se puede guardar". |
| Revancha ganada | Tiempo en oro, "quedás 1.º"; en Playus los dos aparecen 1.º en la fecha. |
| Revancha perdida, o empate exacto con el mejor | "No alcanzó". Empatar no gana. |
| Cerrar la pestaña en medio de la revancha | La tarjeta desaparece y queda "quedó sin terminar y se perdió". |
| Última fecha, temporada maratón, fecha cancelada, fecha que nadie jugó | Sin tarjeta de revancha. |
| Admin cancela la fecha mientras alguien juega | El jugador ve "Ese intento ya no se puede guardar…"; Inicio muestra "El admin canceló la Fecha {n}…"; la siguiente tiene el mismo número. |
| Admin pausa con fecha abierta | La fecha sigue y se cierra normal; después no se abre otra; Inicio dice "en pausa". |
| Corregir un intento de una fecha cerrada | La tabla y los puntos de esa fecha cambian; en la auditoría aparece "Corrigió un intento: a → b". |
| Temporada diaria real | No aparecen "Abrir" ni "Cerrar fecha"; la cuenta regresiva sí. |
| Empate total al final | "CAMPEONES" con los dos apodos en oro. |
| Celu con la zona horaria de otro país | Las horas siguen diciendo 22:00. |
| Pantalla de 320 px | Cada sección cumple su párrafo "A 320 px". |

---

## 9. Fuera de esta etapa

Se nombran para no inventarlos ahora:
- avisos o notificaciones (el pendiente y la revancha solo se ven al abrir NEXPLAY);
- el ranking de la temporada con desempate dentro de NEXPLAY: se ve en Playus, y NEXPLAY muestra solo el campeón; **[mi decisión]**
- cancelar una fecha ya cerrada;
- corregir una revancha (el servidor no lo permite);
- subir un pendiente que quedó en otro dispositivo.

---

## 10. Control final (antes de dar por terminada cada task)

- [ ] Cada fila de las secciones 1 a 6 de esta task se provocó a mano al menos una vez.
- [ ] Ningún texto de error técnico en pantalla: todos pasan por la sección 7.
- [ ] Un solo oro por pantalla (el campeón y el puesto 1 son los permitidos), y zafiro solo en lo que está en vivo.
- [ ] Ningún "3" fijo de intentos en el cliente.
- [ ] Ningún botón se puede tocar dos veces mientras su acción corre.
- [ ] Capturas a 390 y 320 px sin cortes horizontales.
- [ ] `npm run build` sin errores.

---

## 11. Pregunta abierta para el usuario

**¿Agregamos una función solo para el admin que le deje ver los motivos en la auditoría?** Hoy `auditoria.motivo` no se puede leer desde la app (lo cerramos en la etapa 1 porque el motivo de un bloqueo es texto libre del admin). La vista de la sección 6.6 muestra qué se hizo, cuándo, y el antes y el después, pero no el porqué. Sin el motivo, la auditoría sirve de menos para cancelar, corregir y pausar, que justamente piden motivo.

La opción sería un RPC `security definer` (por ejemplo, `nx_auditoria(limite)`) que chequee `es_admin()` y devuelva las filas con `motivo`. Los jugadores seguirían sin verlo. Es una migración nueva, así que necesita tu OK. Si decís que sí, la fila de la sección 6.6 suma el motivo en `--body` `--text2` debajo de la acción y se saca la frase "El motivo queda guardado, pero no se ve acá."
