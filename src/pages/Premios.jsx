import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPremios, getRanking, getFechas, getFechasTodas, getTemporadas, getJugadores, getPremiosTodos } from '../lib/queries.js'
import { armarMedallero, calcularPremios, temporadaTerminada } from '../lib/premios.js'
import IconoPremio from '../components/IconoPremio.jsx'

// Un ícono por tipo de premio ganado, con ×N si lo ganó más de una vez
function Medalla({ icono, nombre, detalle, cantidad, className = 'text-gold' }) {
  const texto = `${nombre} ×${cantidad}${detalle ? ` · ${detalle}` : ''}`
  return (
    <span className={`relative inline-flex ${className}`} title={texto} aria-label={texto} role="img">
      <IconoPremio nombre={icono} tamano={24} />
      {cantidad > 1 && (
        <span className="absolute -bottom-1 -right-2 rounded-full bg-base px-1 text-[10px] font-semibold leading-4 text-ink">
          ×{cantidad}
        </span>
      )}
    </span>
  )
}

function Medallero() {
  const [filas, setFilas] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let activo = true
    Promise.all([getFechasTodas(), getTemporadas(), getJugadores(), getPremiosTodos()])
      .then(([fechas, temporadas, jugadores, especiales]) => {
        const apodos = Object.fromEntries(jugadores.map((j) => [j.id, j.apodo]))
        if (activo) setFilas(armarMedallero(fechas, temporadas, apodos, especiales))
      })
      .catch((err) => {
        if (activo) setErrorMsg(err.message)
      })
    return () => {
      activo = false
    }
  }, [])

  if (errorMsg) return <p className="text-ruby" role="alert">No se pudo cargar el palmarés: {errorMsg}</p>
  if (!filas) return <p className="text-muted">Cargando palmarés…</p>
  if (filas.length === 0) {
    return <div className="gem-panel px-6 py-8 text-center text-muted">Los premios aparecen cuando termine la primera temporada.</div>
  }
  // Leyenda: en el celu no hay tooltip, así que se explica cada ícono que aparece
  const tipos = {}
  for (const f of filas) for (const x of Object.values(f.premios)) tipos[x.premio.id] ??= x
  const leyenda = Object.values(tipos).sort((a, b) => a.orden - b.orden)
  return (
    <>
    <ul className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs text-muted" aria-label="Qué significa cada ícono">
      {leyenda.map(({ premio }) => (
        <li key={premio.id} className="flex items-center gap-1.5">
          <span className="text-gold"><IconoPremio nombre={premio.icono} tamano={16} /></span>
          {premio.nombre}
        </li>
      ))}
      {filas.some((f) => f.especiales > 0) && (
        <li className="flex items-center gap-1.5">
          <span className="text-sapphire"><IconoPremio nombre="medalla" tamano={16} /></span>
          Premios especiales
        </li>
      )}
    </ul>
    <ol className="flex flex-col gap-2">
      {filas.map((f, i) => (
        <li key={f.jugador_id} className="gem-panel-sm px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="w-6 text-muted font-semibold">{i + 1}</span>
          <Link to={`/jugador/${f.jugador_id}`} className="font-display text-lg hover:text-gold min-w-32">
            {f.apodo}
          </Link>
          <span className="flex flex-wrap items-center gap-4 ml-auto">
            {Object.values(f.premios).sort((a, b) => a.orden - b.orden).map(({ premio, temporadas }) => (
              <Medalla key={premio.id} icono={premio.icono} nombre={premio.nombre} detalle={temporadas.join(', ')} cantidad={temporadas.length} />
            ))}
            {f.especiales > 0 && (
              <Medalla icono="medalla" nombre="Premios especiales" cantidad={f.especiales} className="text-sapphire" />
            )}
          </span>
        </li>
      ))}
    </ol>
    </>
  )
}

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

      <section aria-labelledby="palmares-titulo">
        <h2 id="palmares-titulo" className="font-display text-xl mb-1">Palmarés histórico</h2>
        <p className="text-muted mb-4">Todos los premios ganados en temporadas terminadas. Tocá un jugador para ver el detalle.</p>
        <Medallero />
      </section>
    </div>
  )
}
