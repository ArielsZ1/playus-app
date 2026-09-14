import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPerfilJugador } from '../lib/queries.js'

export default function PerfilJugador() {
  const { jugadorId } = useParams()
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPerfilJugador(jugadorId)
      .then(setPerfil)
      .finally(() => setLoading(false))
  }, [jugadorId])

  if (loading) return <p className="text-muted">Cargando perfil…</p>
  if (!perfil) return null

  const { jugador, records, resultados, totalGemas } = perfil
  const historial = [...resultados].sort((a, b) => (a.fecha?.numero_fecha || 0) - (b.fecha?.numero_fecha || 0))

  return (
    <div>
      <Link to="/" className="text-sm text-muted hover:text-gold">
        ← Volver al ranking
      </Link>

      <h1 className="font-display text-2xl mt-4 mb-1">{jugador.apodo}</h1>
      <p className="text-muted mb-8">
        <span className="text-gold font-medium">{totalGemas}</span> gemas acumuladas en total (todas las temporadas)
      </p>

      <h2 className="font-display text-lg mb-4">Récords históricos por juego</h2>
      {records.length === 0 ? (
        <p className="text-muted mb-10">Todavía no tiene récords cargados.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {records.map((r) => (
            <div key={r.id} className="gem-panel-sm bg-panel2 p-4">
              <p className="stat-label">{r.juego?.nombre}</p>
              <p className="font-display text-lg text-gold">{r.valor}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display text-lg mb-4">Historial de fechas</h2>
      {historial.length === 0 ? (
        <p className="text-muted">Todavía no jugó ninguna fecha.</p>
      ) : (
        <div className="gem-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-line">
                <th className="px-5 py-3 font-medium">Temporada</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Juego</th>
                <th className="px-5 py-3 font-medium">Performance</th>
                <th className="px-5 py-3 font-medium text-right">Gemas</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-muted">{r.fecha?.temporada?.nombre}</td>
                  <td className="px-5 py-3 text-muted">{r.fecha?.numero_fecha}</td>
                  <td className="px-5 py-3">{r.fecha?.juego?.nombre}</td>
                  <td className="px-5 py-3">{r.performance || '—'}</td>
                  <td className="px-5 py-3 text-right text-gold font-medium">{r.gemas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}