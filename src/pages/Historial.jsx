import { useEffect, useState } from 'react'
import { getFechas } from '../lib/queries.js'

export default function Historial({ temporadas, onSeleccionar }) {
  const [conteos, setConteos] = useState({})
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let activo = true
    setErrorMsg(null)
    Promise.all(temporadas.map((t) => getFechas(t.id).then((f) => [t.id, f.length])))
      .then((pares) => {
        if (activo) setConteos(Object.fromEntries(pares))
      })
      .catch((err) => {
        if (activo) setErrorMsg(err.message)
      })
    return () => {
      activo = false
    }
  }, [temporadas])

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl mb-8">Historial de temporadas</h1>

      {errorMsg && <p className="text-ruby mb-4" role="alert">No se pudo cargar el historial: {errorMsg}</p>}

      {temporadas.length === 0 ? (
        <p className="text-muted">Todavía no hay temporadas cargadas.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {temporadas.map((t) => (
            <button
              key={t.id}
              onClick={() => onSeleccionar(t.id)}
              className="gem-panel-sm p-5 text-left hover:[--edge:#E8B54D] transition-colors"
            >
              <p className="font-display text-lg">{t.nombre}</p>
              <p className="stat-label mt-1">
                {t.fecha_inicio ? `${t.fecha_inicio} → ${t.fecha_fin || '…'}` : 'Sin fechas de calendario cargadas'}
              </p>
              <p className="text-sm text-muted mt-2">{conteos[t.id] ?? '…'} fechas jugadas</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
