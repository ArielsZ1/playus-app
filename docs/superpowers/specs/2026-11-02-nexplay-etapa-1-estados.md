# NEXPLAY etapa 1: contrato de estados

Fecha: 2026-11-02. Cubre las pantallas de la Task 4 (entrada `/nexplay/`) y la Task 5 (admin de jugadores) del plan `docs/superpowers/plans/2026-11-01-nexplay-etapa-1-cuentas.md`.

El sistema visual es la skill `nexplay-design`: tokens en `.claude/skills/nexplay-design/design-model.yaml` y piezas en `references/components.md`. Este documento dice **qué estados existen y qué se ve en cada uno**. No define estilos nuevos.

Cada estado de la lista se implementa, y el QA lo puede provocar a propósito. Si un estado no tiene fila acá, no existe todavía: se agrega primero acá.

---

## 0. Reglas comunes

| Regla | Detalle |
|---|---|
| Marco | Siempre visible: encabezado "NEXPLAY" (Unbounded), enlace "← Playus" (`href="/"`) y "Salir" si hay sesión. Columna única, máximo 480px, margen lateral de 16px. |
| Cargando | Una línea de `--caption` en `--text3`, centrada en el panel ("Cargando tu cuenta…"). Nada de esqueletos ni shimmer. Si tarda más de 400ms, recién ahí aparece la línea; antes, nada, para que no parpadee. |
| Error de red o desconocido | Panel `gem-panel` con borde `--error`, el texto "No pudimos conectar con NEXPLAY. Revisá tu conexión y probá de nuevo." y un botón secundario "Reintentar". El mensaje técnico va a `console.error`, nunca a la pantalla. |
| Acción en curso | El botón que la disparó queda deshabilitado y cambia su texto ("Aceptando…"). El resto de la pantalla sigue usable. No se puede disparar dos veces. |
| Éxito | Lo confirma el cambio de estado en la propia pantalla (la fila desaparece de Pendientes, el link aparece). El toast se usa solo para "Link copiado". |
| Errores de RPC | Siempre se traducen con la tabla de la sección 4. Un código que no está en la tabla cae en el error de red o desconocido. |
| Sesión vencida | Si una RPC devuelve `no_autenticado` o `solo_admin` cuando la UI creía que el usuario era admin, se recarga la cuenta. La pantalla se acomoda sola al estado real (por ejemplo, vuelve a Entrar). |
| Nombre visible | `cuenta.jugador?.apodo ?? cuenta.nombre ?? cuenta.email`. `nombre` sale de Google y **puede ser null** (el admin entra con mail y contraseña y no tiene `full_name`). Los textos largos cortan con `…` en una línea; el apodo completo va en `title`. |
| Oro | Una sola acción dorada por pantalla. Está indicada en cada pantalla. |

---

## 1. Entrar (sin sesión)

**Quién:** un amigo que abrió el link de invitación, o el admin. **Acción principal:** "Entrar con Google" (dorado, 56px, mitad inferior).

| Estado | Cuándo | Qué se ve |
|---|---|---|
| Normal | Sin sesión, sin código guardado | Título, una línea "Los juegos de la temporada, desde el celu." y el botón "Entrar con Google". Abajo, `<details>` "Soy el admin". |
| Con invitación | Hay `nexplay_codigo` en `localStorage` | Lo mismo, más un chip esmeralda "Tenés una invitación" y abajo la línea "Entrá con Google para unirte." No va zafiro: una invitación no es algo "en vivo". |
| Redirigiendo | Se tocó "Entrar con Google" | El botón queda deshabilitado con el texto "Abriendo Google…". |
| Google cancelado o con error | La vuelta trae `?error=` o `#error=` (por ejemplo `access_denied`) | Panel con borde `--error`: "No se completó el ingreso con Google. Probá de nuevo." El botón sigue disponible. Se limpia el error de la URL con `history.replaceState`. |
| Admin: formulario | `<details>` abierto | Email, contraseña y el botón secundario "Entrar". El dorado sigue siendo el de Google. |
| Admin: credenciales mal | `signInWithPassword` falla con credenciales | Texto `--error` debajo del formulario: "Mail o contraseña incorrectos." El mail queda escrito; la contraseña se vacía. |
| Admin: entrando | Formulario enviado | El botón "Entrar" queda deshabilitado con el texto "Entrando…". |
| `localStorage` no disponible | Navegación privada que bloquea el almacenamiento | El código no se puede guardar. Se lee directo de `?codigo=` en la URL. Si tampoco está ahí, se ve como "Normal". No se muestra ningún error. |

---

## 2. Entrada con sesión: según la cuenta

**Quién:** cualquiera con sesión. La pantalla depende del resultado de `getMiCuenta()` y del código guardado.

| Estado | Cuándo | Qué se ve | Acción dorada |
|---|---|---|---|
| Cargando cuenta | Mientras corre `getMiCuenta()` | "Cargando tu cuenta…" (regla de cargando) | ninguna |
| Error al leer la cuenta | `getMiCuenta()` lanza | Error de red con "Reintentar" | ninguna |
| Registrando | Cuenta `null` + hay código: corre `registrarseConCodigo` | "Uniéndote a NEXPLAY…" | ninguna |
| Invitación inválida | El registro devuelve `codigo_invalido` | Panel con borde `--error`: "El link de invitación no es válido o venció. Pedile uno nuevo al admin." Se borra el código guardado. Botón secundario "Salir". | ninguna |
| Sin invitación | Cuenta `null` + sin código | Panel neutro: "Necesitás un link de invitación para entrar a NEXPLAY. Pedíselo al admin." Botón secundario "Salir" (para probar con otra cuenta de Google). | ninguna |
| Pendiente | `estado = 'pendiente'` | Chip ámbar "Pendiente". "Listo, {nombre visible}. El admin tiene que aceptarte. Cuando lo haga, tocá Actualizar." Botón "Actualizar" (secundario). | ninguna |
| Actualizando | Se tocó "Actualizar" | El botón dice "Actualizando…". Si sigue pendiente, debajo aparece "Todavía no te aceptó." por 3 segundos. | ninguna |
| Bloqueada | `estado = 'bloqueado'` | Chip rubí "Bloqueada". "Tu cuenta está bloqueada. Hablá con el admin." Botón secundario "Salir". No se muestra el motivo. | ninguna |
| Aceptada | `estado = 'aceptado'` | Rutas: `Inicio` y, si `es_admin`, `/admin`. | según la pantalla |
| Ruta admin sin permiso | `/admin` con una cuenta aceptada no admin | Redirige a `Inicio` sin mensaje. | |

**Cambio de copy respecto del plan.** El plan decía "te avisamos cuando puedas jugar". NEXPLAY no tiene notificaciones en la etapa 1, así que esa promesa sería falsa. Se reemplaza por "Cuando lo haga, tocá Actualizar." Si más adelante hay aviso por mail o push, se vuelve a la frase original.

**Por qué el chip pendiente es ámbar y no zafiro:** zafiro es "en vivo". Una cuenta esperando no está en vivo; es una advertencia suave. Ámbar (`--warning`) ya existe en el sistema para eso.

---

## 3. Inicio (cuenta aceptada)

**Acción principal:** en la etapa 1 no hay ninguna jugable. **No se pone ningún botón dorado** (sería un oro sin señal). Si es admin, el enlace "Jugadores" va como botón secundario.

| Estado | Cuándo | Qué se ve |
|---|---|---|
| Normal | Siempre en la etapa 1 | "Hola, {nombre visible}" (heading) y un `gem-panel` "La primera temporada NEXPLAY arranca pronto." |
| Admin | `es_admin` | Además, botón secundario "Jugadores" → `/admin`. |
| Admin sin jugador vinculado | `es_admin` y `jugador_id` null | El saludo usa `nombre` o el email. Debajo, `--caption`: "Vinculá tu cuenta a tu jugador en Jugadores." |
| Apodo largo | Apodo de más de 18 caracteres | Corta con `…` en una línea; no rompe en dos. |

---

## 4. Traducción de errores de las RPC

| Código del servidor | Texto en pantalla | Dónde aparece |
|---|---|---|
| `codigo_invalido` | El link de invitación no es válido o venció. Pedile uno nuevo al admin. | Entrada con sesión |
| `no_autenticado` | (sin texto) se recarga la sesión y se vuelve a Entrar | Cualquier pantalla |
| `solo_admin` | (sin texto) se recarga la cuenta y se sale del admin | Admin |
| `cuenta_inexistente` | Esa cuenta ya no existe. Actualizamos la lista. | Admin, fila de la cuenta |
| `jugador_ya_vinculado` | Ese jugador ya tiene cuenta. Actualizamos la lista. | Admin, fila de la cuenta |
| `falta_jugador` | Elegí un jugador o escribí un apodo. | Admin, fila de la cuenta |
| `no_podes_bloquearte` | No podés bloquear tu propia cuenta. | Admin (no debería pasar: la fila del admin no tiene "Bloquear") |
| cualquier otro | No pudimos conectar con NEXPLAY. Revisá tu conexión y probá de nuevo. | Donde ocurra |

Después de `cuenta_inexistente` o `jugador_ya_vinculado`, la lista se vuelve a pedir: otro cambio ganó la carrera y la pantalla estaba vieja.

El texto de error de una fila va debajo de esa fila, en `--error`, y se borra cuando se cambia algún campo de esa fila.

---

## 5. Admin de jugadores (`/admin`)

**Quién:** el admin, casi siempre desde el celu. **Acción principal:** "Generar link" (dorado). En las filas, "Aceptar" es secundario: si cada fila tuviera un botón dorado, habría varios oros por pantalla.

Tres secciones en este orden: Invitar, Pendientes, Jugadores con cuenta. Cada una es un `gem-panel` con su `stat-label`.

La pantalla pide `getCuentas()` y `getJugadores()` juntas.

### 5.1 Toda la pantalla

| Estado | Qué se ve |
|---|---|
| Cargando | "Cargando jugadores…" |
| Error al cargar | Error de red con "Reintentar". Invitar sigue funcionando porque no depende de las listas. |

### 5.2 Invitar

| Estado | Qué se ve |
|---|---|
| Inicial | `stat-label` "Invitar", una línea "Un link sirve para varios amigos durante 7 días." y el botón dorado "Generar link". |
| Generando | El botón dice "Generando…" y está deshabilitado. |
| Link listo | El link completo en IBM Plex Mono, en un campo de solo lectura que se selecciona entero al tocarlo. Debajo, el botón "Copiar" y el texto "Vence en 7 días" en `--caption`. El botón de generar pasa a secundario con el texto "Generar otro". |
| Copiado | Toast "Link copiado" por 2 segundos. |
| No se pudo copiar | `navigator.clipboard` no existe o falla: el campo queda seleccionado y aparece "Copialo a mano: ya está seleccionado." No se usa toast de error. |
| Error al generar | El error va debajo del botón, según la tabla de la sección 4. |

### 5.3 Pendientes

| Estado | Qué se ve |
|---|---|
| Vacío | "No hay nadie esperando. Cuando alguien entre con tu link, aparece acá." |
| Con filas | Por cada cuenta: nombre visible y email (`--caption`, cortado con `…`), un `<select>` "Jugador" y el botón secundario "Aceptar". La lista va de la más vieja a la más nueva (`created_at`). |
| Opciones del select | Primero "Elegí…" (sin valor), después los jugadores **sin cuenta vinculada** en orden alfabético por apodo, y al final "+ Jugador nuevo". |
| Todos los jugadores vinculados | El select solo tiene "+ Jugador nuevo", que viene ya elegido con el input de apodo visible. |
| Jugador nuevo | Aparece el input "Apodo" (mínimo 48px de alto). Si queda vacío, "Aceptar" muestra el error `falta_jugador` sin llamar al servidor. |
| Aceptando | La fila queda deshabilitada y el botón dice "Aceptando…". Las otras filas siguen usables. |
| Aceptada | La fila sale de Pendientes y aparece en "Jugadores con cuenta". Se vuelve a pedir la lista. |
| Error | Debajo de la fila, según la tabla de la sección 4. |

### 5.4 Jugadores con cuenta

| Estado | Qué se ve |
|---|---|
| Vacío | No puede pasar: el admin siempre está. Si la lista solo tiene al admin, igual se muestra su fila. |
| Fila aceptada | Apodo (o nombre visible), chip esmeralda "Aceptada" y botón "Bloquear" con el estilo destructivo. |
| Fila del admin | Chip "Admin" con estilo neutro, sin "Bloquear". Si no tiene jugador: el mismo select de 5.3 (con "+ Jugador nuevo") y el botón "Vincular". |
| Fila bloqueada | Apodo con `--text3`, chip rubí "Bloqueada". No tiene acciones: el desbloqueo no existe en la etapa 1. |
| Pidiendo motivo | Al tocar "Bloquear", en la misma fila aparece el input "Motivo" y dos botones: "Confirmar bloqueo" (destructivo) y "Cancelar". Sin `prompt()`. |
| Motivo vacío | "Confirmar bloqueo" queda deshabilitado hasta que se escriba algo. |
| Bloqueando | "Bloqueando…" y la fila deshabilitada. |
| Bloqueada recién | La fila pasa a "Bloqueada". La otra persona lo ve la próxima vez que cargue NEXPLAY. |
| Vinculando | "Vinculando…". Al terminar, el saludo de Inicio usa el apodo. |

**Orden de la lista:** primero el admin, después las aceptadas por apodo y al final las bloqueadas.

---

## 6. Casos extremos que el QA puede probar

| Caso | Resultado esperado |
|---|---|
| Abrir `/nexplay/?codigo=XYZ` ya logueado con una cuenta aceptada | Se ignora el código (el servidor devuelve la cuenta existente) y se borra. Va a Inicio. |
| Abrir dos links de invitación distintos | Queda guardado el último. |
| Dos pestañas: aceptar al mismo amigo con jugadores distintos | La segunda recibe `jugador_ya_vinculado` o `cuenta_inexistente`, muestra el mensaje y recarga. No queda nada a medias. |
| Entrar con Google con el mismo mail del admin | Inicio como admin. Si queda pendiente, "Soy el admin" (Review Focus 5). |
| Modo práctica (`npm run dev:practica`) | Todos los estados de arriba se ven igual. |
| Pantalla de 320px | Nada se corta en horizontal. Los botones ocupan el ancho completo. El link de invitación corta con `…` en el campo, pero se copia completo. |
| Teclado | Todo se puede usar con Tab y Enter. El foco se ve como anillo interior (regla de `nexplay-design`). |
| Sin animaciones (`prefers-reduced-motion`) | Los botones no se hunden; los cambios de estado aparecen sin transición. |

---

## 7. Fuera de esta etapa

Se nombran para no inventarlos ahora:
- desbloquear cuentas
- revocar o listar links de invitación
- avisar al jugador cuando lo aceptan
- editar apodos desde NEXPLAY

---

## 8. Control final (antes de dar por terminada cada task)

- [ ] Cada fila de las secciones 1 a 5 de esta task se provocó a mano al menos una vez.
- [ ] No hay ningún texto de error técnico en pantalla: todos pasan por la tabla de la sección 4.
- [ ] Una sola acción dorada por pantalla (prueba de entrecerrar los ojos).
- [ ] Ningún botón se puede tocar dos veces mientras su acción corre.
- [ ] Captura a 390px y a 320px sin cortes horizontales.
- [ ] `npm run build` sin errores.
