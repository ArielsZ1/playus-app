import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPremios, getRanking, getFechas } from '../lib/queries.js'
import { calcularPremios, temporadaTerminada } from '../lib/premios.js'
import IconoPremio from '../components/IconoPremio.jsx'

function NombreJugador({ jugador, className }) {
  return (
    <Link to={`/jugador/${jugador.jugador_id}`} className={`hover:text-gold ${className}`}>
      {jugador.apodo}
    </Link>
  )
}

function TarjetaPremio({ premio, definitivo }) {
  const { ganadores, segundo } = premio
  return (
    <div className={`gem-panel-sm p-5 flex flex-col gap-3 ${ganadores.length ? 'gem-panel-gold' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={ganadores.length ? 'text-gold' : 'text-muted'}>
          <IconoPremio nombre={premio.icono} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight">{premio.nombre}</p>
          <p className="text-sm text-muted">{premio.descripcion}</p>
        </div>
      </div>

      {ganadores.length ? (
        <div>
          <span className="stat-label">{definitivo ? 'Ganador' : 'Va ganando'}</span>
          <p className="font-display text-xl text-gold">
            {ganadores.map((g, i) => (
              <Fragment key={g.jugador_id}>
                {i > 0 && ', '}
                <NombreJugador jugador={g} />
              </Fragment>
            ))}
          </p>
          <p className="text-sm">{ganadores[0].dato}</p>
        </div>
      ) : (
        <p className="text-sm text-muted">{definitivo ? 'Nadie lo ganó.' : 'Todavía nadie.'}</p>
      )}

      {segundo && (
        <p className="text-sm text-muted mt-auto">
          {ganadores.length ? 'Lo sigue' : 'Más cerca'}: <NombreJugador jugador={segundo} className="text-ink" /> · {segundo.dato}
        </p>
      )}
    </div>
  )
}

export default function Premios({ temporadaId, temporada }) {
  const [premios, setPremios] = useState([])
  const [automaticos, setAutomaticos] = useState([])
  const [definitivo, setDefinitivo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let activo = true
    setLoading(true)
    setErrorMsg(null)
    Promise.all([getPremios(temporadaId), getRanking(temporadaId), getFechas(temporadaId)])
      .then(([premiosData, ranking, fechas]) => {
        if (!activo) return
        setPremios(premiosData)
        setAutomaticos(calcularPremios(ranking, fechas))
        setDefinitivo(temporadaTerminada(temporada, fechas))
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
  }, [temporadaId, temporada])

  if (loading) return <p className="text-muted">Cargando premios…</p>
  if (errorMsg) return <p className="text-ruby" role="alert">No se pudieron cargar los premios: {errorMsg}</p>

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="vitrina-titulo">
        <div className="flex flex-wrap items-baseline gap-3 mb-2">
          <h1 id="vitrina-titulo" className="font-display text-3xl sm:text-4xl">Premios de la temporada</h1>
          <span className={`text-xs font-semibold uppercase tracking-wider ${definitivo ? 'text-gold' : 'text-muted'}`}>
            {definitivo ? 'Definitivos' : 'En juego'}
          </span>
        </div>
        <p className="text-muted mb-8">
          {definitivo
            ? 'La temporada terminó: estos son los ganadores.'
            : 'Se calculan solos con los resultados y cambian con cada fecha.'}
        </p>

        {automaticos.length === 0 ? (
          <div className="gem-panel px-6 py-8 text-center text-muted">
            Los premios aparecen cuando se juegue la primera fecha.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {automaticos.map((p) => (
              <TarjetaPremio key={p.id} premio={p} definitivo={definitivo} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="especiales-titulo">
        <h2 id="especiales-titulo" className="font-display text-xl mb-4">Premios especiales</h2>
        {premios.length === 0 ? (
          <div className="gem-panel px-6 py-8 text-center text-muted">
            Todavía no se cargó ningún premio especial en esta temporada.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {premios.map((p) => (
              <div key={p.id} className="gem-panel-sm p-5">
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
      </section>
    </div>
  )
}
