import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { getRanking, getFechas, getEvolucionGemas } from '../lib/queries.js'
import { estadisticasPorJugador, ganadoresDeFecha, seJugo } from '../lib/fecha.js'
import Podio from '../components/Podio.jsx'
import ResumenTemporada from '../components/ResumenTemporada.jsx'
import PreviaFecha from '../components/PreviaFecha.jsx'
import EvolucionChart, { COLORES } from '../components/EvolucionChart.jsx'
import MapaCalor from '../components/MapaCalor.jsx'

// Movimiento respecto del puesto que tenía antes de la última fecha
function Tendencia({ actual, anterior }) {
  if (!anterior) return null
  const diff = anterior - actual
  if (diff === 0) return <span className="text-xs text-muted" title="Mantiene el puesto">=</span>
  return diff > 0 ? (
    <span className="text-xs font-semibold text-[#5FD39A]" title={`Subió ${diff}`}>▲{diff}</span>
  ) : (
    <span className="text-xs font-semibold text-[#F07A84]" title={`Bajó ${-diff}`}>▼{-diff}</span>
  )
}

function Trofeo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  )
}

const formatoPromedio = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

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
  const apodos = Object.fromEntries(ranking.map((j) => [j.jugador_id, j.apodo]))
  const stats = estadisticasPorJugador(fechas)

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl sm:text-4xl">Tabla de posiciones</h1>
        {ranking.length > 0 && (
          <button
            onClick={handleCompartir}
            disabled={exportando}
            type="button"
            aria-label="Descargar el ranking como imagen"
            className="flex items-center gap-2 min-h-[44px] text-sm bg-panel2 border border-line px-4 hover:border-gold disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
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
          <ResumenTemporada ranking={ranking} fechas={fechas} />
          <PreviaFecha ranking={ranking} fechas={fechas} />

          <div ref={capturaRef} className="p-4 -m-4">
            <Podio top3={top3} />

            <h2 className="font-display text-xl mb-4">Clasificación</h2>
            <div className="gem-panel overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="stat-label font-medium px-5 py-3">#</th>
                    <th className="stat-label font-medium px-5 py-3">Jugador</th>
                    <th className="stat-label font-medium px-3 py-3 text-center">Victorias</th>
                    <th className="stat-label font-medium px-3 py-3 text-center">Podios</th>
                    <th className="stat-label font-medium px-3 py-3 text-center">Puesto prom.</th>
                    <th className="stat-label font-medium px-3 py-3 text-center">Fechas</th>
                    <th className="stat-label font-medium px-3 py-3 text-right">Dif. líder</th>
                    <th className="stat-label font-medium px-5 py-3 text-right">Gemas</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((j, i) => {
                    const s = stats[j.jugador_id]
                    return (
                      <tr key={j.jugador_id} className="border-b border-[#2E2658] last:border-0 hover:bg-panel2">
                        <td className={`px-5 py-3 font-display ${i === 0 ? 'text-gold' : 'text-muted'}`}>{i + 1}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-8 h-8 shrink-0 rounded-full bg-panel2 border-2 flex items-center justify-center font-display text-xs"
                              style={{ borderColor: COLORES[i % COLORES.length] }}
                              aria-hidden="true"
                            >
                              {j.apodo.charAt(0).toUpperCase()}
                            </span>
                            <Link to={`/jugador/${j.jugador_id}`} className="font-medium hover:text-gold">
                              {j.apodo}
                            </Link>
                            <Tendencia actual={i + 1} anterior={j.puesto_anterior} />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">{s?.victorias ?? 0}</td>
                        <td className="px-3 py-3 text-center">{s?.podios ?? 0}</td>
                        <td className="px-3 py-3 text-center text-muted">{s ? formatoPromedio(s.promedio) : '—'}</td>
                        <td className="px-3 py-3 text-center text-muted">{j.fechas_jugadas}</td>
                        <td className="px-3 py-3 text-right text-muted">
                          {i === 0 ? '—' : `−${ranking[0].gemas - j.gemas}`}
                        </td>
                        <td className="px-5 py-3 text-right font-display text-gold">{j.gemas}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EvolucionChart datos={evolucion} jugadores={ranking.map((j) => j.apodo)} />
            <MapaCalor fechas={fechas} ranking={ranking} />
          </div>
        </>
      )}

      <section aria-labelledby="fechas-titulo">
        <h2 id="fechas-titulo" className="font-display text-xl mb-4">Fechas de la temporada</h2>
        {fechas.length === 0 ? (
          <p className="text-muted">Todavía no se cargó ninguna fecha.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fechas.map((f) => {
              const jugada = seJugo(f)
              return (
                <Link
                  key={f.id}
                  to={`/fecha/${f.id}`}
                  className={`gem-panel flex flex-col gap-1.5 px-5 py-4 transition-colors hover:[--edge:#E8B54D] ${
                    jugada ? '' : '[--edge:#5A5088] [--fill:#181334]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="stat-label">Fecha {f.numero_fecha}</span>
                    {f.fecha_calendario && (
                      <span className="stat-label">
                        {new Date(`${f.fecha_calendario}T00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <span className="font-display">{f.juego?.nombre || 'Juego sin definir'}</span>
                  <span className={`flex items-center gap-2 text-sm truncate ${jugada ? 'text-gold' : 'text-muted'}`}>
                    <Trofeo />
                    {jugada ? `Ganó ${ganadoresDeFecha(f).map((id) => apodos[id]).join(', ')}` : f.sin_jugadores ? 'No se jugó' : 'Por jugarse'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
