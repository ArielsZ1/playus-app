import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPerfilJugador, getFechasTodas, getJugadores } from '../lib/queries.js'
import { analizarJugador } from '../lib/perfil.js'
import IconoPremio from '../components/IconoPremio.jsx'

const ATRIBUTOS = [
  ['nivel', 'Nivel', 'Qué tan arriba termina en promedio, según la cantidad de rivales'],
  ['victorias', 'Victorias', 'Fechas ganadas comparado con lo esperable'],
  ['podios', 'Podios', 'Veces entre los 3 primeros comparado con lo esperable'],
  ['regularidad', 'Regularidad', 'Cuánto varían sus resultados de una fecha a otra'],
  ['forma', 'Forma', 'Nivel en las últimas 5 fechas'],
  ['asistencia', 'Asistencia', 'Fechas jugadas en las temporadas que participó'],
]

const colorNota = (v) => (v >= 70 ? 'bg-emerald' : v >= 45 ? 'bg-gold' : 'bg-ruby')
const promedio = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Dato({ etiqueta, children }) {
  return (
    <div className="gem-panel-sm px-4 py-3 flex flex-col gap-1">
      <span className="stat-label">{etiqueta}</span>
      <span className="font-display text-2xl">{children}</span>
    </div>
  )
}

function ChipPuesto({ puesto, title }) {
  const estilo = puesto === 1 ? 'border-gold text-gold' : puesto <= 3 ? 'border-[#C9C3E3] text-ink' : 'border-line text-muted'
  return (
    <span title={title} className={`w-10 h-10 flex items-center justify-center border-2 font-display text-sm ${estilo}`}>
      {puesto}°
    </span>
  )
}

function Ficha({ apodo, ficha }) {
  const { arquetipo, atributos, general, fortalezas, debilidades, muestraChica, n } = ficha
  return (
    <section className="gem-panel gem-panel-gold p-6 sm:p-8 flex flex-col gap-8" aria-label="Ficha del jugador">
      <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
        <div className="flex items-center gap-5">
          <div className="gem-panel-sm gem-panel-gold w-24 h-24 flex flex-col items-center justify-center shrink-0">
            <span className="font-display text-4xl text-gold leading-none">{general}</span>
            <span className="stat-label mt-1">General</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl break-words">{apodo}</h1>
            <p className="font-display text-gold text-lg mt-1">{arquetipo.nombre}</p>
            <p className="text-sm text-muted max-w-xs">{arquetipo.descripcion}</p>
          </div>
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {ATRIBUTOS.map(([clave, etiqueta, ayuda]) => (
            <div key={clave} title={ayuda}>
              <div className="flex justify-between text-sm">
                <dt className="stat-label">{etiqueta}</dt>
                <dd className="font-display">{atributos[clave]}</dd>
              </div>
              <div className="h-1.5 bg-panel2 mt-1" aria-hidden="true">
                <div className={`h-full ${colorNota(atributos[clave])}`} style={{ width: `${atributos[clave]}%` }} />
              </div>
            </div>
          ))}
        </dl>
      </div>

      {muestraChica ? (
        <p className="text-sm text-muted">
          Jugó {n === 1 ? 'una sola fecha' : `${n} fechas`}: hace falta jugar al menos 5 para armar el informe.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h2 className="stat-label text-[#5FD39A] mb-2">Puntos fuertes</h2>
            {fortalezas.length ? (
              <ul className="flex flex-col gap-1.5 text-sm">
                {fortalezas.map((t) => (
                  <li key={t} className="pl-4 relative before:absolute before:left-0 before:content-['+'] before:text-[#5FD39A]">{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nada que se destaque todavía.</p>
            )}
          </div>
          <div>
            <h2 className="stat-label text-ruby mb-2">A mejorar</h2>
            {debilidades.length ? (
              <ul className="flex flex-col gap-1.5 text-sm">
                {debilidades.map((t) => (
                  <li key={t} className="pl-4 relative before:absolute before:left-0 before:content-['–'] before:text-ruby">{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Sin puntos débiles claros.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// Agrupa los premios ganados por tipo: "Campeón ×5 · Temporada 2, Temporada 3…"
function Palmares({ palmares, especiales }) {
  const grupos = {}
  for (const { premio, temporada } of palmares) {
    ;(grupos[premio.id] ??= { premio, temporadas: [] }).temporadas.push(temporada.nombre)
  }
  const lista = Object.values(grupos)
  if (lista.length === 0 && especiales.length === 0) {
    return <p className="text-muted">Todavía no ganó premios en temporadas terminadas.</p>
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {lista.map(({ premio, temporadas }) => (
        <div key={premio.id} className="gem-panel-sm p-4 flex items-start gap-3">
          <span className="text-gold"><IconoPremio nombre={premio.icono} tamano={24} /></span>
          <div className="min-w-0">
            <p className="font-display">
              {premio.nombre} {temporadas.length > 1 && <span className="text-gold">×{temporadas.length}</span>}
            </p>
            <p className="text-xs text-muted">{temporadas.join(', ')}</p>
          </div>
        </div>
      ))}
      {especiales.map((p) => (
        <div key={p.id} className="gem-panel-sm p-4">
          <p className="font-display text-gold">{p.nombre}</p>
          <p className="text-xs text-muted">Premio especial · {p.temporada?.nombre}</p>
          {p.descripcion && <p className="text-sm text-muted mt-1">{p.descripcion}</p>}
        </div>
      ))}
    </div>
  )
}

export default function PerfilJugador({ temporadas }) {
  const { jugadorId } = useParams()
  const [perfil, setPerfil] = useState(null)
  const [analisis, setAnalisis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let activo = true
    setLoading(true)
    setErrorMsg(null)
    Promise.all([getPerfilJugador(jugadorId), getFechasTodas(), getJugadores()])
      .then(([perfilData, fechas, jugadores]) => {
        if (!activo) return
        const apodos = Object.fromEntries(jugadores.map((j) => [j.id, j.apodo]))
        setPerfil(perfilData)
        setAnalisis(analizarJugador(jugadorId, fechas, temporadas, apodos))
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
  }, [jugadorId, temporadas])

  if (loading) return <p className="text-muted">Cargando perfil…</p>
  if (errorMsg) return <p className="text-ruby" role="alert">No se pudo cargar el perfil: {errorMsg}</p>
  if (!perfil || !analisis) return null

  const { jugador, records, premios } = perfil
  const { ficha, historial, temporadasJugadas, palmares, juegos, gemas } = analisis

  return (
    <div className="flex flex-col gap-10">
      <Link to="/" className="text-sm text-muted hover:text-gold">
        ← Volver al ranking
      </Link>

      {ficha ? (
        <>
          <Ficha apodo={jugador.apodo} ficha={ficha} />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Dato etiqueta="Fechas">{ficha.n}</Dato>
            <Dato etiqueta="Victorias">{ficha.victorias}</Dato>
            <Dato etiqueta="Podios">{ficha.podios}</Dato>
            <Dato etiqueta="Puesto prom.">{promedio(ficha.promedio)}°</Dato>
            <Dato etiqueta="Gemas">
              <span className="text-gold">{gemas}</span>
            </Dato>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section>
              <h2 className="font-display text-xl mb-4">Últimas fechas</h2>
              <div className="flex gap-2">
                {ficha.ultimas.map((h) => (
                  <ChipPuesto
                    key={h.fecha.id}
                    puesto={h.puesto}
                    title={`Fecha ${h.fecha.numero_fecha} · ${h.fecha.juego?.nombre ?? ''} · ${h.puesto}° de ${h.campo}`}
                  />
                ))}
              </div>
            </section>
            <section>
              <h2 className="font-display text-xl mb-4">Trayectoria</h2>
              <div className="flex flex-wrap gap-2">
                {temporadasJugadas.map((t) => (
                  <div key={t.temporada.id} className={`gem-panel-sm px-3 py-2 ${t.puesto === 1 && t.terminada ? 'gem-panel-gold' : ''}`}>
                    <p className="stat-label">{t.temporada.nombre}</p>
                    <p className="font-display">
                      {t.puesto}° <span className="text-xs text-muted">de {t.de}{t.terminada ? '' : ' · en curso'}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{jugador.apodo}</h1>
          <p className="text-muted mt-2">Todavía no jugó ninguna fecha.</p>
        </div>
      )}

      <section>
        <h2 className="font-display text-xl mb-4">Palmarés</h2>
        <Palmares palmares={palmares} especiales={premios} />
      </section>

      {ficha && ficha.rivales.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-1">Cara a cara</h2>
          <p className="text-sm text-muted mb-4">Fechas en las que terminó por encima de cada rival (mínimo 5 fechas juntos).</p>
          <div className="gem-panel p-5 flex flex-col gap-3">
            {[...ficha.rivales].reverse().map((r) => (
              <div key={r.jugador_id} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm">
                <Link to={`/jugador/${r.jugador_id}`} className="truncate hover:text-gold">{r.apodo}</Link>
                <div className="h-2 bg-ruby/40" aria-hidden="true">
                  <div className="h-full bg-emerald" style={{ width: `${r.ratio * 100}%` }} />
                </div>
                <span className="text-muted tabular-nums">
                  {r.ganados}–{r.jugados - r.ganados}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {juegos?.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-4">Por juego</h2>
          <div className="gem-panel overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line">
                  <th className="stat-label px-5 py-3">Juego</th>
                  <th className="stat-label px-5 py-3 text-right">Fechas</th>
                  <th className="stat-label px-5 py-3 text-right">Victorias</th>
                  <th className="stat-label px-5 py-3 text-right">Puesto prom.</th>
                </tr>
              </thead>
              <tbody>
                {juegos.map((j) => (
                  <tr key={j.nombre} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5">{j.nombre}</td>
                    <td className="px-5 py-2.5 text-right text-muted">{j.fechas}</td>
                    <td className="px-5 py-2.5 text-right">{j.victorias || '—'}</td>
                    <td className="px-5 py-2.5 text-right font-medium">{promedio(j.promedio)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl mb-4">Récords históricos por juego</h2>
        {records.length === 0 ? (
          <p className="text-muted">Todavía no tiene récords cargados.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {records.map((r) => (
              <div key={r.id} className="gem-panel-sm p-4">
                <p className="stat-label">{r.juego?.nombre}</p>
                <p className="font-display text-lg text-gold">{r.valor}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {historial.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-4">Historial de fechas</h2>
          <div className="gem-panel overflow-x-auto max-h-[32rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line">
                  <th className="stat-label px-5 py-3">Temporada</th>
                  <th className="stat-label px-5 py-3">Fecha</th>
                  <th className="stat-label px-5 py-3">Juego</th>
                  <th className="stat-label px-5 py-3">Performance</th>
                  <th className="stat-label px-5 py-3">Puesto</th>
                  <th className="stat-label px-5 py-3 text-right">Gemas</th>
                </tr>
              </thead>
              <tbody>
                {[...historial].reverse().map(({ fecha, resultado, puesto, campo }) => (
                  <tr key={fecha.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-muted">{temporadas.find((t) => t.id === fecha.temporada_id)?.nombre}</td>
                    <td className="px-5 py-2.5 text-muted">
                      <Link to={`/fecha/${fecha.id}`} className="hover:text-gold">{fecha.numero_fecha}</Link>
                    </td>
                    <td className="px-5 py-2.5">{fecha.juego?.nombre}</td>
                    <td className="px-5 py-2.5">{resultado.performance || '—'}</td>
                    <td className={`px-5 py-2.5 ${puesto === 1 ? 'text-gold font-medium' : ''}`}>
                      {puesto}° <span className="text-xs text-muted">de {campo}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-gold font-medium">{resultado.gemas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
