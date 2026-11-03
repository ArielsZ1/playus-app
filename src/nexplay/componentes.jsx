import { useEffect, useState } from 'react'

// Piezas que se repiten en varias pantallas de NEXPLAY (contrato de estados, sección 0).

export const MENSAJE_RED = 'No pudimos conectar con NEXPLAY. Revisá tu conexión y probá de nuevo.'

// Las RPC lanzan 'codigo_invalido', 'solo_admin', etc. dentro del mensaje de error.
export function codigoDeError(err) {
  const texto = `${err?.message ?? ''} ${err?.details ?? ''}`
  return texto.match(/\b(codigo_invalido|no_autenticado|solo_admin|cuenta_inexistente|jugador_ya_vinculado|falta_jugador|no_podes_bloquearte|nombre_vacio|cantidad_invalida|no_en_preparacion|ya_hay_temporada_activa|temporada_no_activa|ya_hay_fecha_abierta|temporada_completa|sin_juegos_elegibles|fecha_no_abierta|no_habilitado|sin_intentos|intento_cerrado|intento_ajeno)\b/)?.[1] ?? null
}

// Contrato de estados, sección 4. Lo que no está acá cae en el error de red.
const TEXTOS_ERROR = {
  codigo_invalido: 'El link de invitación no es válido o venció. Pedile uno nuevo al admin.',
  cuenta_inexistente: 'Esa cuenta ya no existe. Actualizamos la lista.',
  jugador_ya_vinculado: 'Ese jugador ya tiene cuenta. Actualizamos la lista.',
  falta_jugador: 'Elegí un jugador o escribí un apodo.',
  no_podes_bloquearte: 'No podés bloquear tu propia cuenta.',
  // etapa 2 (contrato de estados etapa 2, sección 6)
  nombre_vacio: 'Escribí un nombre para la temporada.',
  cantidad_invalida: 'La temporada tiene que tener entre 1 y 21 fechas.',
  no_en_preparacion: 'Esa temporada ya arrancó. Actualizamos la pantalla.',
  ya_hay_temporada_activa: 'Ya hay una temporada en juego. Terminala antes de iniciar otra.',
  temporada_no_activa: 'La temporada no está en juego. Actualizamos la pantalla.',
  ya_hay_fecha_abierta: 'Ya hay una fecha abierta. Actualizamos la pantalla.',
  temporada_completa: 'Ya se jugaron todas las fechas de la temporada.',
  sin_juegos_elegibles: 'No quedan juegos para la ruleta en esta temporada.',
  fecha_no_abierta: 'La fecha ya se cerró.',
  no_habilitado: 'Tu cuenta todavía no puede jugar. Hablá con el admin.',
  sin_intentos: 'Ya usaste tus 3 intentos.',
  intento_cerrado: 'Ese intento ya no se puede guardar.',
  intento_ajeno: 'Ese intento ya no se puede guardar.',
}
// Errores que vienen de mirar un estado viejo: además del texto, se recarga la pantalla.
export const ESTADO_VIEJO = new Set(['no_en_preparacion', 'temporada_no_activa', 'ya_hay_fecha_abierta', 'fecha_no_abierta'])

// Por qué un intento quedó sin validez (intentos.motivo).
const MOTIVOS = {
  demasiado_rapido: 'Ese tiempo es imposible: el mínimo es 2.50 s.',
  no_cierra: 'El tiempo y los errores no coinciden.',
  datos_incompletos: 'Al intento le faltaron datos.',
  duracion_imposible: 'El intento terminó antes de lo que marcó el reloj.',
  abandonado: 'Lo dejaste sin terminar.',
  fecha_cerrada: 'La fecha se cerró antes de que terminaras.',
  modulo_sin_validacion: 'Este juego todavía no se puede validar.',
}
export const textoDeMotivo = (motivo) => MOTIVOS[motivo] ?? 'El intento no se pudo validar.'

// Tiempos como en el historial de Playus: segundos con 2 decimales y punto.
export const tiempo = (ms) => (ms == null ? '—' : `${(Number(ms) / 1000).toFixed(2)} s`)

// Mejor resultado válido de una lista de intentos.
export function mejorDe(intentos, menorEsMejor = true) {
  const v = intentos.filter((i) => i.estado === 'completado').map((i) => Number(i.resultado))
  if (v.length === 0) return null
  return menorEsMejor ? Math.min(...v) : Math.max(...v)
}

// Corre fn cada 10 s mientras la pestaña está a la vista.
export function useCadaDiezSegundos(fn, activo = true) {
  useEffect(() => {
    if (!activo) return
    const id = setInterval(() => document.visibilityState === 'visible' && fn(), 10000)
    return () => clearInterval(id)
  }, [fn, activo])
}
export function textoDeError(codigo) {
  return TEXTOS_ERROR[codigo] ?? MENSAJE_RED
}

export function nombreVisible(cuenta) {
  return cuenta?.jugador?.apodo ?? cuenta?.nombre ?? cuenta?.email ?? ''
}

// jugando: sin enlaces, para no salir de un intento por error (contrato etapa 2, sección 2)
export function Marco({ session, onSalir, jugando = false, children }) {
  return (
    <div className="min-h-screen px-4 pb-12">
      <div className="mx-auto max-w-[480px]">
        <header className={`flex items-center gap-3 py-5 ${jugando ? 'justify-center' : 'justify-between'}`}>
          {!jugando && <a href="/" className="text-body-sm text-muted hover:text-ink py-2">← Playus</a>}
          <span className="font-display font-bold tracking-wide text-ink">NEXPLAY</span>
          {jugando ? null : session ? (
            <button type="button" onClick={onSalir} className="text-body-sm text-muted hover:text-ink py-2">
              Salir
            </button>
          ) : (
            <span className="w-[52px]" aria-hidden="true" />
          )}
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}

// Aparece recién a los 400ms para que una carga rápida no parpadee.
export function Cargando({ texto }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(t)
  }, [])
  return (
    <p role="status" className="py-16 text-center text-caption text-faint">
      {visible ? texto : ''}
    </p>
  )
}

export function PanelAviso({ tono = 'neutro', children, accion }) {
  const tonos = {
    neutro: '',
    error: '[--edge:#E8636F] [--fill:#4A1C26]',
  }
  return (
    <div className={`gem-panel-sm p-4 space-y-4 ${tonos[tono]}`} role={tono === 'error' ? 'alert' : undefined}>
      <p className="text-body-sm text-ink">{children}</p>
      {accion}
    </div>
  )
}

export function ErrorRed({ onReintentar }) {
  return (
    <PanelAviso
      tono="error"
      accion={<button type="button" className="nx-btn nx-btn-secondary" onClick={onReintentar}>Reintentar</button>}
    >
      {MENSAJE_RED}
    </PanelAviso>
  )
}

const CHIPS = {
  exito: 'bg-success-bg text-emerald border-emerald',
  pendiente: 'bg-warning-bg text-amber border-amber',
  error: 'bg-error-bg text-ruby border-ruby',
  vivo: 'bg-live-bg text-sapphire border-sapphire',
  oro: 'bg-gold-subtle text-gold border-gold',
}

export function Chip({ tono, children }) {
  return <span className={`nx-chip ${CHIPS[tono]}`}>{children}</span>
}
