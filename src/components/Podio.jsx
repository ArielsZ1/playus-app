import { Link } from 'react-router-dom'

// Por columna visual: 2do, 1ro, 3ro
const ORDEN_VISUAL = [1, 0, 2] // índice del array `top3` que va en cada columna
const ESTILO = [
  { alto: 'h-36', ancho: 'w-28 sm:w-40', borde: '#C9C3E3', texto: 'text-[#C9C3E3]', numero: 'text-3xl', avatar: 'w-14 h-14 text-xl' },
  { alto: 'h-48', ancho: 'w-32 sm:w-48', borde: '#E8B54D', texto: 'text-gold', numero: 'text-4xl', avatar: 'w-16 h-16 text-2xl' },
  { alto: 'h-28', ancho: 'w-28 sm:w-40', borde: '#D98A5F', texto: 'text-[#E9A57F]', numero: 'text-3xl', avatar: 'w-14 h-14 text-xl' },
]

function Corona() {
  return (
    <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="#E8B54D" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 24 L1 6 L11 14 L18 2 L25 14 L35 6 L33 24 Z" />
      <path d="M3 24 H33" />
    </svg>
  )
}

export default function Podio({ top3 }) {
  if (top3.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-4 mb-10">
      {ORDEN_VISUAL.map((idx, col) => {
        const jugador = top3[idx]
        const e = ESTILO[col]
        if (!jugador) return <div key={col} className={e.ancho} />
        return (
          <Link
            key={jugador.jugador_id}
            to={`/jugador/${jugador.jugador_id}`}
            className={`group flex flex-col items-center gap-2 ${e.ancho}`}
          >
            {idx === 0 && <Corona />}
            <span
              className={`${e.avatar} rounded-full bg-panel2 border-2 flex items-center justify-center font-display ${e.texto}`}
              style={{ borderColor: e.borde, boxShadow: idx === 0 ? '0 0 24px rgba(232,181,77,0.45)' : undefined }}
              aria-hidden="true"
            >
              {jugador.apodo.charAt(0).toUpperCase()}
            </span>
            <p
              className={`font-display text-sm text-center truncate w-full group-hover:text-gold ${idx === 0 ? 'text-gold' : ''}`}
              title={jugador.apodo}
            >
              {jugador.apodo}
            </p>
            {/* drop-shadow en un wrapper: clip-path recorta box-shadow */}
            <div className={`w-full ${idx === 0 ? 'drop-shadow-[0_0_14px_rgba(232,181,77,0.35)]' : ''}`}>
              <div
                className={`gem-panel ${e.alto} flex flex-col items-center justify-center gap-1`}
                style={{ '--edge': e.borde }}
              >
                <span className={`font-display ${e.numero} ${e.texto}`}>{idx + 1}°</span>
                <span className="text-gold text-sm font-semibold">{jugador.gemas} gemas</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
