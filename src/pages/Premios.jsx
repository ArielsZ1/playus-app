import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPremios } from '../lib/queries.js'

export default function Premios({ temporadaId }) {
  const [premios, setPremios] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let activo = true
    setLoading(true)
    setErrorMsg(null)
    getPremios(temporadaId)
      .then((data) => {
        if (activo) setPremios(data)
      })
      .catch((err) => {
        if (activo) setErrorMsg(err.message)
      })
      .finally(() => {
        if (activo) setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [temporadaId])

  if (loading) return <p className="text-muted">Cargando premios…</p>
  if (errorMsg) return <p className="text-ruby" role="alert">No se pudieron cargar los premios: {errorMsg}</p>

  return (
    <div>
      <h1 className="font-display text-2xl mb-8">Premios de la temporada</h1>

      {premios.length === 0 ? (
        <div className="gem-panel px-6 py-8 text-center text-muted">
          Todavía no se cargó ningún premio en esta temporada.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {premios.map((p) => (
            <div key={p.id} className="gem-panel-sm bg-panel2 p-5">
              <p className="font-display text-lg text-gold">{p.nombre}</p>
              {p.jugador ? (
                <Link to={`/jugador/${p.jugador_id}`} className="text-sm hover:text-gold">
                  {p.jugador.apodo}
                </Link>
              ) : (
                <p className="text-sm text-muted">Premio general</p>
              )}
              {p.descripcion && <p className="text-sm text-muted mt-2">{p.descripcion}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}