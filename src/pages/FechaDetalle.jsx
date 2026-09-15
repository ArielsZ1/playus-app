import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFechaDetalle, getRecordsPorJuego, getRanking } from '../lib/queries.js'

export default function FechaDetalle() {
  const { fechaId } = useParams()
  const [fecha, setFecha] = useState(null)
  const [records, setRecords] = useState({})
  const [posiciones, setPosiciones] = useState({})
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    getFechaDetalle(fechaId)
      .then(async (f) => {
        setFecha(f)
        const [recordsData, rankingData] = await Promise.all([
          f.juego_id ? getRecordsPorJuego(f.juego_id) : {},
          getRanking(f.temporada_id),
        ])
        setRecords(recordsData)
        const mapa = {}
        rankingData.forEach((r, i) => {
          mapa[r.jugador_id] = i + 1
        })
        setPosiciones(mapa)
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false))
  }, [fechaId])

  if (loading) return <p className="text-muted">Cargando fecha…</p>
  if (errorMsg) return <p className="text-ruby">Error: {errorMsg}</p>
  if (!fecha) return null

  return (
    <div>
      <Link to="/" className="text-sm text-muted hover:text-gold">
        ← Volver al ranking
      </Link>

      <p className="stat-label mt-4">Fecha {fecha.numero_fecha}</p>
      <h1 className="font-display text-2xl mb-2">{fecha.juego?.nombre}</h1>
      {fecha.juego?.descripcion && <p className="text-muted mb-2 max-w-prose">{fecha.juego.descripcion}</p>}

      <div className="flex gap-6 mb-8 text-sm">
        {fecha.record_mundial && (
          <p>
            <span className="stat-label block">Récord mundial</span>
            <span className="text-gold font-medium">{fecha.record_mundial}</span>
          </p>
        )}
        {fecha.bonus_porcentaje != null && (
          <p>
            <span className="stat-label block">Bonus (informativo)</span>
            <span className="text-muted">{fecha.bonus_porcentaje}%</span>
          </p>
        )}
      </div>

      <div className="gem-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="px-5 py-3 font-medium">Jugador</th>
              <th className="px-5 py-3 font-medium">Performance</th>
              <th className="px-5 py-3 font-medium">Récord histórico</th>
              <th className="px-5 py-3 font-medium text-center">Rivales superados</th>
              <th className="px-5 py-3 font-medium text-right">Gemas</th>
            </tr>
          </thead>
          <tbody>
            {fecha.resultados.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <Link to={`/jugador/${r.jugador_id}`} className="hover:text-gold">
                    {r.jugador?.apodo}
                  </Link>
                  {posiciones[r.jugador_id] && (
                    <span className="text-muted"> ({posiciones[r.jugador_id]}° en la temporada)</span>
                  )}
                  {r.sancionado && (
                    <span className="ml-2 text-xs text-ruby border border-ruby px-1.5 py-0.5">sancionado</span>
                  )}
                </td>
                <td className="px-5 py-3">{r.performance || '—'}</td>
                <td className="px-5 py-3 text-muted">{records[r.jugador_id] || '—'}</td>
                <td className="px-5 py-3 text-center">{r.rivales_superados}</td>
                <td className="px-5 py-3 text-right text-gold font-medium">{r.gemas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
