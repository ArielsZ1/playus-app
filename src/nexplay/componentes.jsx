import { useEffect, useState } from 'react'

// Piezas que se repiten en varias pantallas de NEXPLAY (contrato de estados, sección 0).

export const MENSAJE_RED = 'No pudimos conectar con NEXPLAY. Revisá tu conexión y probá de nuevo.'

// Las RPC lanzan 'codigo_invalido', 'solo_admin', etc. dentro del mensaje de error.
export function codigoDeError(err) {
  const texto = `${err?.message ?? ''} ${err?.details ?? ''}`
  return texto.match(/\b(codigo_invalido|no_autenticado|solo_admin|cuenta_inexistente|jugador_ya_vinculado|falta_jugador|no_podes_bloquearte)\b/)?.[1] ?? null
}

// Contrato de estados, sección 4. Lo que no está acá cae en el error de red.
const TEXTOS_ERROR = {
  codigo_invalido: 'El link de invitación no es válido o venció. Pedile uno nuevo al admin.',
  cuenta_inexistente: 'Esa cuenta ya no existe. Actualizamos la lista.',
  jugador_ya_vinculado: 'Ese jugador ya tiene cuenta. Actualizamos la lista.',
  falta_jugador: 'Elegí un jugador o escribí un apodo.',
  no_podes_bloquearte: 'No podés bloquear tu propia cuenta.',
}
export function textoDeError(codigo) {
  return TEXTOS_ERROR[codigo] ?? MENSAJE_RED
}

export function nombreVisible(cuenta) {
  return cuenta?.jugador?.apodo ?? cuenta?.nombre ?? cuenta?.email ?? ''
}

export function Marco({ session, onSalir, children }) {
  return (
    <div className="min-h-screen px-4 pb-12">
      <div className="mx-auto max-w-[480px]">
        <header className="flex items-center justify-between gap-3 py-5">
          <a href="/" className="text-body-sm text-muted hover:text-ink py-2">← Playus</a>
          <span className="font-display font-bold tracking-wide text-ink">NEXPLAY</span>
          {session ? (
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
}

export function Chip({ tono, children }) {
  return <span className={`nx-chip ${CHIPS[tono]}`}>{children}</span>
}
