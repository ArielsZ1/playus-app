import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { getRanking, getFechas, getEvolucionGemas } from '../lib/queries.js'
import Podio from '../components/Podio.jsx'
import EvolucionChart from '../components/EvolucionChart.jsx'

export default function Dashboard({ temporadaId }) {
  const [ranking, setRanking] = useState([])
  const [fechas, setFechas] = useState([])
  const [evolucion, setEvolucion] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [exportando, setExportando] = useState(false)
  const capturaRef = useRef(null)

  useEffect(() => {
    let activo = true
    setLoading(true)
    setErrorMsg(null)
    Promise.all([getRanking(temporadaId), getFechas(temporadaId), getEvolucionGemas(temporadaId)])
      .then(([rankingData, fechasData, evolucionData]) => {
        if (!activo) return
        setRanking(rankingData)
        setFechas(fechasData)
        setEvolucion(evolucionData)
      })
      .catch((err) => {
        if (activo) setErrorMsg(err.message)
      })
      .finally(() => setLoading(false))
    return () => {
      activo = false
    }
  }, [temporadaId])

  async function handleCompartir() {
    if (!capturaRef.current) return
    setExportando(true)
    try {
      const dataUrl = await toPng(capturaRef.current, { backgroundColor: '#14102A' })
      const link = document.createElement('a')
      link.download = 'ranking-playus.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      alert('No se pudo generar la imagen: ' + err.message)
    } finally {
      setExportando(false)
    }
  }

  if (loading) return <p className="text-muted">Cargando ranking…</p>
  if (errorMsg) return <p className="text-ruby" role="alert">No se pudo cargar el ranking: {errorMsg}</p>

  const top3 = ranking.slice(0, 3)
  const resto = ranking.slice(3)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">Tabla de posiciones</h1>
        {ranking.length > 0 && (
          <button
            onClick={handleCompartir}
            disabled={exportando}
            type="button"
            aria-label="Descargar el ranking como imagen"
            className="text-sm bg-panel2 border border-line px-3 py-2 hover:border-gold disabled:opacity-50"
          >
            {exportando ? 'Generando…' : 'Compartir como imagen'}
          </button>
        )}
      </div>

      {ranking.length === 0 ? (
        <div className="gem-panel px-6 py-8 text-center text-muted">
          Todavía no hay gemas cargadas para esta temporada.
        </div>
      ) : (
        <>
          <div ref={capturaRef} className="p-4">
            <Podio top3={top3} />

            <div className="gem-panel overflow-x-auto">
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
          </div>

          <div className="flex flex-wrap gap-2 mt-4 mb-12">
            {ranking.map((j) => (
              <Link
                key={j.jugador_id}
                to={`/jugador/${j.jugador_id}`}
                className="text-xs text-sapphire hover:text-gold"
              >
                Ver perfil de {j.apodo}
              </Link>
            ))}
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
