import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRanking, getFechas, getEvolucionGemas } from '../lib/queries.js'
import Podio from '../components/Podio.jsx'
import EvolucionChart from '../components/EvolucionChart.jsx'

export default function Dashboard({ temporadaId }) {
  const [ranking, setRanking] = useState([])
  const [fechas, setFechas] = useState([])
  const [evolucion, setEvolucion] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getRanking(temporadaId), getFechas(temporadaId), getEvolucionGemas(temporadaId)])
      .then(([rankingData, fechasData, evolucionData]) => {
        setRanking(rankingData)
        setFechas(fechasData)
        setEvolucion(evolucionData)
      })
      .finally(() => setLoading(false))
  }, [temporadaId])

  if (loading) return <p className="text-muted">Cargando ranking…</p>

  const top3 = ranking.slice(0, 3)
  const resto = ranking.slice(3)

  return (
    <div>
      <h1 className="font-display text-2xl mb-8">Tabla de posiciones</h1>

      {ranking.length === 0 ? (
        <div className="gem-panel px-6 py-8 text-center text-muted">
          Todavía no hay gemas cargadas para esta temporada.
        </div>
      ) : (
        <>
          <Podio top3={top3} />

          <div className="gem-panel overflow-hidden mb-12">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-line">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Jugador</th>
                  <th className="px-5 py-3 font-medium text-right">Gemas</th>
                </tr>
              </thead>
              <tbody>
                {resto.map((j, i) => (
                  <tr key={j.jugador_id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-muted">{i + 4}</td>
                    <td className="px-5 py-3">{j.apodo}</td>
                    <td className="px-5 py-3 text-right text-gold font-medium">{j.gemas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <EvolucionChart datos={evolucion} jugadores={ranking.map((j) => j.apodo)} />
        </>
      )}

      <h2 className="font-display text-xl mb-4">Fechas de la temporada</h2>
      {fechas.length === 0 ? (
        <p className="text-muted">Todavía no se cargó ninguna fecha.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fechas.map((f) => (
            <Link
              key={f.id}
              to={`/fecha/${f.id}`}
              className="gem-panel-sm px-4 py-3 hover:border-gold border border-line transition-colors"
            >
              <p className="stat-label">Fecha {f.numero_fecha}</p>
              <p className="font-display">{f.juego?.nombre || 'Juego sin definir'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
