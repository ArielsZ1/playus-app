import { useEffect, useState } from 'react'
import { getNotas } from '../lib/queries.js'

export default function Notas({ temporadaId }) {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getNotas(temporadaId)
      .then(setNotas)
      .finally(() => setLoading(false))
  }, [temporadaId])

  if (loading) return <p className="text-muted">Cargando notas…</p>

  return (
    <div>
      <h1 className="font-display text-2xl mb-8">Notas y sanciones</h1>

      {notas.length === 0 ? (
        <div className="gem-panel px-6 py-8 text-center text-muted">
          No hay sanciones ni notas registradas en esta temporada.
        </div>
      ) : (
        <div className="space-y-3">
          {notas.map((n) => (
            <div key={n.id} className="gem-panel-sm bg-panel2 p-4">
              <p className="stat-label">
                Fecha {n.fecha?.numero_fecha} — {n.jugador?.apodo}
                {n.sancionado && <span className="ml-2 text-ruby">· sancionado</span>}
              </p>
              {n.nota && <p className="mt-1">{n.nota}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
