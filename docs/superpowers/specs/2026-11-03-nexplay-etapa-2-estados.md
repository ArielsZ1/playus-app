# NEXPLAY etapa 2: contrato de estados

Fecha: 2026-11-03. Cubre las pantallas de las Tasks 6 y 7 del plan `docs/superpowers/plans/2026-11-03-nexplay-etapa-2-motor.md`: Inicio con la fecha, Jugar (ruleta, instrucciones, Count!, resultado), la tabla provisoria y el admin del torneo.

Mismas reglas que `2026-11-02-nexplay-etapa-1-estados.md`: el sistema visual es la skill `nexplay-design`, este documento dice **qué estados existen y qué se ve en cada uno**, y un estado que no está acá no existe todavía. Las decisiones marcadas **[mi decisión]** son mías y se pueden corregir.

---

## 0. Reglas comunes

Valen todas las de la sección 0 de la etapa 1 (marco, cargando, error de red, acción en curso, éxito, errores de RPC, sesión vencida, nombre visible, un solo oro). Se suman estas:

| Regla | Detalle |
|---|---|
| Tiempos | Se muestran en segundos con 2 decimales y punto, igual que el historial de Playus: `4.70 s`. Siempre con `tabular-nums`. **[mi decisión]** |
| Consulta cada 10 s | La tabla provisoria y el estado de la fecha se vuelven a pedir cada 10 s mientras la pantalla está visible (`document.visibilityState`). Al refrescar, la tabla anterior queda a la vista: nada de "Cargando" en medio. |
| Refresco fallido | Se mantiene lo último que llegó y aparece en `--caption` `--text3`: "Sin conexión. Mostrando lo último." Se va solo cuando vuelve a responder. |
| Zafiro | Solo para lo que está en vivo: el panel de la fecha abierta, el chip "En vivo" y el chip "jugando" de la tabla. |
| Rubí | Intento inválido, error, y el botón "Cerrar fecha". |
| Esmeralda | Intento válido y fecha cerrada. |

---

## 1. Inicio (cuenta aceptada)

**Orden fijo (de arriba a abajo):** saludo → panel de la temporada / fecha → acción → tabla provisoria → enlaces del admin.

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Cargando | Mientras corre `getTorneoActual()` | "Cargando la sala…" | ninguno |
| Error | `getTorneoActual()` falla | Error de red con "Reintentar" | ninguno |
| Sin temporada | No hay temporada NEXPLAY | `gem-panel`: "La primera temporada NEXPLAY arranca pronto." (igual que hoy) | ninguno |
| En preparación | Temporada `preparacion` | Etiqueta `TEMPORADA`, nombre, y "Arranca pronto. El admin la está preparando." | ninguno |
| Esperando fecha | Temporada `activa`, sin fecha abierta | Nombre de la temporada y "Fecha {n} de {total}" (n = cerradas + 1). Texto: "Esperando que el admin abra la próxima fecha." Si hay fechas cerradas, debajo: "Mirá cómo va el ranking en Playus." con enlace a `/`. | ninguno |
| Fecha abierta, sin jugar | Fecha `abierta` y 0 intentos propios | Panel en vivo (borde zafiro + chip "En vivo"): `FECHA {n} DE {total}`, el nombre del juego en Unbounded y "3 intentos. Cuenta el mejor." Debajo, botón dorado **"Jugar"** (56px). Debajo, la tabla provisoria. | "Jugar" |
| Fecha abierta, jugando | 1 o 2 intentos usados | Igual, pero el panel muestra "Tu mejor: 4.70 s" (o "Sin intento válido todavía") y los 3 puntos de intento (usado / actual / libre). El botón dice **"Jugar intento {k}"**. | el botón |
| Fecha abierta, sin intentos | 3 intentos usados | El panel dice "Usaste tus 3 intentos. Tu mejor: 4.70 s." No hay botón dorado; la tabla queda como la señal principal. | ninguno |
| Intento en curso | Hay un intento propio `en_curso` (cerró la pestaña a mitad) | Igual que "jugando", con una línea `--caption` debajo del botón: "El intento {k} quedó sin terminar y cuenta como usado." | el botón |
| Fecha cerrada mientras miro | El refresco trae la fecha cerrada | El panel pasa a "Esperando fecha" y aparece una línea esmeralda: "La Fecha {n} se cerró. Los puntos ya están en Playus." | ninguno |
| Temporada finalizada | Temporada `finalizada` | "La temporada {nombre} terminó." + enlace "Ver el ranking en Playus" (`/`). | ninguno |
| Cuenta sin jugador | Aceptada pero `jugador_id` null (caso del admin) | En lugar del botón: "Vinculá tu cuenta a un jugador en Jugadores para poder jugar." | ninguno |
| Admin | `es_admin` | Al final, dos botones secundarios: "Torneo" (`/admin/torneo`) y "Jugadores" (`/admin`). | |

---

## 2. Jugar (`/jugar`)

Una máquina de estados lineal. **Sin barra de navegación ni "← Playus"** mientras se juega (el marco muestra solo "NEXPLAY"), para no salir por error.

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Sin fecha | Se entra a `/jugar` sin fecha abierta o sin intentos | Redirige a Inicio sin mensaje. | |
| Ruleta | Primera entrada a la fecha (0 intentos propios) | Etiqueta `FECHA {n}`, "Sorteando el juego…" y la ruleta: los nombres de los juegos jugables pasan en una franja vertical, frenan en el elegido con un pequeño rebote, y queda el nombre en Unbounded. Dura unos 2,5 s. Con `prefers-reduced-motion`, aparece el elegido directo. Al terminar pasa sola a Instrucciones. | ninguno |
| Ruleta con un solo juego | Hay 1 solo juego jugable (hoy, Count!) | La franja igual pasa por los nombres de los **73 juegos** del historial para que tenga sentido, y frena en el sorteado. **[mi decisión]** Es solo animación: el juego ya lo sorteó el servidor. | |
| Instrucciones | Antes del intento 1 | Nombre del juego, y en 5 líneas cortas: objetivo, cómo se juega, qué pasa al errar, cuándo termina, qué cuenta. Para Count! ver la sección 3. Botón dorado **"Jugar intento 1"**. Debajo, `--caption`: "Si salís en medio del intento, cuenta como usado." | "Jugar intento 1" |
| Antes del intento 2 o 3 | Ya jugó alguno | Etiqueta `INTENTO {k} DE 3`, "Tu mejor: 4.70 s", un `<details>` "Ver instrucciones" cerrado y el botón dorado **"Jugar intento {k}"**. | el botón |
| Pidiendo intento | Se tocó "Jugar intento k" y corre `empezarIntento` | El botón queda en "Preparando…". | |
| Error al pedir | `empezarIntento` falla | Vuelve al estado anterior con el texto de la sección 6 debajo del botón. Si es `sin_intentos` o `fecha_no_abierta`, vuelve a Inicio. | |
| Cuenta regresiva | `empezarIntento` respondió | El área de juego vacía con "3", "2", "1" grandes (1 s cada uno). El tiempo del juego arranca recién cuando aparece la grilla. **[mi decisión]** El servidor ya contó desde que se pidió el intento, así que la cuenta regresiva no rompe la validación de duración. | ninguno |
| Jugando | Grilla a la vista | Ver sección 3. | ninguno |
| Enviando | Terminó el juego | El tiempo final queda grande en pantalla y debajo, `--caption`: "Guardando…". | ninguno |
| Envío fallido por red | `terminarIntento` falla por red | Panel rubí: "No pudimos guardar el intento. Tu tiempo sigue acá." Botón secundario "Reintentar" que manda **el mismo resultado**. | ninguno |
| Envío rechazado | `terminarIntento` lanza `intento_cerrado` o `intento_ajeno` | Panel rubí: "Ese intento ya no se puede guardar. La fecha se cerró o se empezó otro intento." Botón "Volver al inicio". | |
| Resultado válido | El intento volvió `completado` | Etiqueta `INTENTO {k} DE 3`, el tiempo enorme (Unbounded 900, `--text1`, cuenta hasta el valor y se asienta), y debajo "{tiempo real} + {errores} errores × 0.1 s". Chip esmeralda "Válido". Si es su mejor de la fecha, el número va en oro con chip dorado "Tu mejor", una sola vez. | "Jugar intento {k+1}" o, si fue el último, ninguno |
| Resultado inválido | El intento volvió `invalido` | El mismo encabezado, sin número grande. Chip rubí "No válido" y el motivo traducido (sección 6). El intento cuenta como usado. | igual que arriba |
| Después del último | Era el intento 3 | En lugar del botón dorado: "Usaste tus 3 intentos. Tu mejor: 4.70 s." y botón secundario "Ver la tabla" (vuelve a Inicio). | ninguno |
| Siempre en Resultado | | Botón secundario "Ver la tabla" (vuelve a Inicio). | |

---

## 3. Count! (el juego)

| Estado | Qué se ve |
|---|---|
| Instrucciones | **Objetivo:** tocá los números del 1 al 16 en orden, lo más rápido que puedas. **Cómo:** la grilla de 4 × 4 aparece mezclada; tocá el 1, después el 2, y así. **Si errás:** tocar un número equivocado suma 0.1 s y seguís buscando el mismo. **Termina:** cuando tocás el 16. **Cuenta:** gana el menor tiempo, con los errores sumados. |
| Grilla | Cuadrada, ocupa el ancho (máximo 28rem), 16 botones de al menos 64px con el número grande en `tabular-nums`. Arriba de la grilla: `SIGUIENTE` con el número que toca (grande) y el cronómetro corriendo (`--text2`, `tabular-nums`, décimas). |
| Toque correcto | La celda se apaga (`--surface1`, número en `--text3`) y deja de responder. El "siguiente" avanza. |
| Toque equivocado | La celda se sacude 3 veces en 200ms con borde rubí, y junto al cronómetro aparece "+0.1 s" que sube y se desvanece. Con `prefers-reduced-motion`, solo el borde rubí 300ms. |
| Toque en celda ya usada | No hace nada (no cuenta como error). |
| Terminado | Al tocar el 16 la grilla se congela, el cronómetro se detiene y se pasa a "Enviando". |
| Pantalla chica | A 320px la grilla mide 288px (celdas de 66px con 8px de separación). Nada hace scroll horizontal. |
| Accesibilidad | Cada celda es un `button` con `aria-label="Número 7"`. El "siguiente" está en una región `aria-live="polite"`. Se puede jugar con teclado (Tab + Enter), aunque el juego está pensado para el dedo. |

---

## 4. Tabla provisoria

Va en Inicio, debajo del panel de la fecha, solo cuando hay una fecha abierta.

| Estado | Cuándo | Qué se ve |
|---|---|---|
| Vacía | Nadie empezó un intento | `gem-panel-sm`: "Todavía nadie jugó. ¡Sé el primero!" |
| Con jugadores | Hay filas | Encabezado `TABLA EN VIVO` + punto zafiro que late cada 2 s. Filas de 48px: puesto, apodo (corta con `…`), mejor tiempo y "{usados}/3". Ordena por mejor tiempo; los que no tienen intento válido van al final con "—" y sin puesto. Los empatados comparten puesto ("2", "2", "4"). El puesto 1 va en oro. Tu fila tiene fondo `--surface2`. |
| Jugando ahora | `en_juego` | Chip zafiro chico "jugando" al lado del apodo. |
| Refresco | Cada 10 s | Las filas que cambiaron destellan `--surface3` 320ms. Sin movimiento con `prefers-reduced-motion`. |
| Pie | Siempre | `--caption`: "Se actualiza sola cada 10 segundos. Los puntos se calculan al cerrar la fecha." |

---

## 5. Admin del torneo (`/admin/torneo`)

Solo `es_admin`. Una columna, igual que el resto de NEXPLAY. El oro es la acción que destraba el siguiente paso.

| Estado | Cuándo | Qué se ve | Oro |
|---|---|---|---|
| Cargando / error | | Reglas comunes | |
| Sin temporada en juego | No hay temporada `preparacion` ni `activa` | Formulario "Nueva temporada": nombre (`nx-input`), cantidad de fechas (número, 1 a 21, por defecto 10) y un checkbox "Es de prueba (no aparece en Playus)". Botón dorado **"Crear temporada"**. Si la última temporada terminó, arriba una línea: "{nombre} terminó." | "Crear temporada" |
| Creando | Formulario enviado | "Creando…" | |
| En preparación | Temporada `preparacion` | Nombre, "{total} fechas", chip "De prueba" si corresponde. Texto: "Al iniciarla se congelan las reglas: 3 intentos, 10 puntos base, 10 por rival y bonus de 5% por fecha." Botón dorado **"Iniciar temporada"**. | "Iniciar temporada" |
| Activa sin fecha | Temporada `activa`, sin fecha abierta | "Fecha {n} de {total}" y botón dorado **"Abrir Fecha {n}"**. Debajo, la lista de fechas cerradas: "Fecha 1 · Count! · cerrada" con chip esmeralda. | "Abrir Fecha {n}" |
| Abriendo | | "Sorteando…". Al responder, una línea: "Salió {juego}." (sin ruleta; la ruleta es para los jugadores). | |
| Fecha abierta | Hay fecha `abierta` | Panel en vivo con `FECHA {n}`, el juego y "Abierta desde las {hh:mm}". Debajo, la tabla provisoria (sección 4). Al final, botón **"Cerrar fecha"** con estilo de acción destructiva (borde rubí, no dorado). | ninguno |
| Confirmar cierre | Se tocó "Cerrar fecha" | Hoja inferior: "¿Cerrar la Fecha {n}?" + "Se calculan los puntos y pasan a Playus. No se puede deshacer." Si hay alguien `en_juego`: línea rubí "{k} jugando ahora: ese intento no va a contar." Botones: **"Cerrar fecha"** (rubí) y "Volver" (secundario). | ninguno |
| Cerrando | | "Cerrando…" en el botón de la hoja. | |
| Cerrada | `nx_cerrar_fecha` respondió | Vuelve a "Activa sin fecha" (o "Temporada terminada"), con la línea esmeralda: "Fecha {n} cerrada. Los puntos ya están en Playus." | |
| Temporada terminada | Se cerró la última | "{nombre} terminó." + el formulario de "Nueva temporada". | "Crear temporada" |

**Qué no está en la etapa 2** (para que nadie lo busque): cancelar o pausar, excluir juegos, Underdog, revisar repeticiones, corregir resultados.

---

## 6. Textos de errores y motivos

Se suman a la tabla de la etapa 1 en `textoDeError` (`src/nexplay/componentes.jsx`).

| Código | Texto |
|---|---|
| `nombre_vacio` | Escribí un nombre para la temporada. |
| `cantidad_invalida` | La temporada tiene que tener entre 1 y 21 fechas. |
| `no_en_preparacion` | Esa temporada ya arrancó. Actualizamos la pantalla. |
| `ya_hay_temporada_activa` | Ya hay una temporada en juego. Terminala antes de iniciar otra. |
| `temporada_no_activa` | La temporada no está en juego. Actualizamos la pantalla. |
| `ya_hay_fecha_abierta` | Ya hay una fecha abierta. Actualizamos la pantalla. |
| `temporada_completa` | Ya se jugaron todas las fechas de la temporada. |
| `sin_juegos_elegibles` | No quedan juegos para la ruleta en esta temporada. |
| `fecha_no_abierta` | La fecha ya se cerró. |
| `no_habilitado` | Tu cuenta todavía no puede jugar. Hablá con el admin. |
| `sin_intentos` | Ya usaste tus 3 intentos. |
| `intento_cerrado`, `intento_ajeno` | Ese intento ya no se puede guardar. |

Cuando la acción del admin choca con un estado viejo (`no_en_preparacion`, `temporada_no_activa`, `ya_hay_fecha_abierta`, `fecha_no_abierta`), además del texto se recarga la pantalla.

**Motivos de un intento no válido** (columna `intentos.motivo`):

| Motivo | Texto en el resultado |
|---|---|
| `demasiado_rapido` | Ese tiempo es imposible: el mínimo es 2.50 s. |
| `no_cierra` | El tiempo y los errores no coinciden. |
| `datos_incompletos` | Al intento le faltaron datos. |
| `duracion_imposible` | El intento terminó antes de lo que marcó el reloj. |
| `abandonado` | Lo dejaste sin terminar. |
| `fecha_cerrada` | La fecha se cerró antes de que terminaras. |
| `modulo_sin_validacion` | Este juego todavía no se puede validar. |

---

## 7. Casos extremos que el QA prueba

- Apodo de 24 caracteres en la tabla y en el saludo: corta con `…`.
- 1 solo jugador en la fecha: la tabla tiene una fila, puesto 1 en oro.
- 7 jugadores, todos con 3 intentos: la tabla entra sin scroll horizontal a 320px.
- Dos jugadores empatados en el mejor tiempo: comparten puesto.
- El admin cierra la fecha mientras un jugador está en la grilla: al terminar, el jugador ve "Envío rechazado".
- Se corta el wifi en medio de la grilla: el juego sigue (no necesita red) y el envío ofrece "Reintentar".
- Volver atrás con el navegador durante la grilla: vuelve a Inicio y el intento queda sin terminar (cuenta como usado; lo avisa la línea de Inicio).
