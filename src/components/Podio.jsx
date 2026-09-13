const ALTURAS = ['h-28', 'h-40', 'h-20'] // 2do, 1ro, 3ro (orden visual)
const COLORES = ['border-muted', 'border-gold', 'border-ruby']
const ORDEN_VISUAL = [1, 0, 2] // índice del array `top3` que va en cada columna

export default function Podio({ top3 }) {
  if (top3.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-3 mb-10">
      {ORDEN_VISUAL.map((idx, col) => {
        const jugador = top3[idx]
        if (!jugador) return <div key={col} className="w-28" />
        return (
          <div key={jugador.jugador_id} className="flex flex-col items-center w-28">
            <p className="font-display text-sm text-center mb-2 truncate w-full" title={jugador.apodo}>
              {jugador.apodo}
            </p>
            <p className="text-gold font-display text-lg mb-2">{jugador.gemas}</p>
            <div
              className={`gem-panel-sm w-full ${ALTURAS[col]} border-2 ${COLORES[col]} flex items-start justify-center pt-2`}
            >
              <span className="font-display text-2xl text-muted">{idx + 1}°</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
