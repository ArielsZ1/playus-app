import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRecordsPorJuego } from '../lib/queries.js'
import { armarPrevia, mejorRecord } from '../lib/previa.js'
import { fechaCerrada } from '../lib/fecha.js'

function Columna({ titulo, children }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="stat-label">{titulo}</span>
      {children}
    </div>
  )
}

// Se muestra mientras haya una fecha pendiente; todo sale de la temporada en curso.
export default function PreviaFecha({ ranking, fechas }) {
  const proxima = fechas.find((f) => !fechaCerrada(f))
  const apodos = useMemo(() => Object.fromEntries(ranking.map((j) => [j.jugador_id, j.apodo])), [ranking])
  const { forma, rachas } = useMemo(() => armarPrevia(fechas, apodos), [fechas, apodos])
  const [records, setRecords] = useState({})

  const juegoId = proxima?.juego_id
  useEffect(() => {
    let activo = true
    setRecords({})
    // Si falla, la previa se muestra igual sin el récord del grupo
    if (juegoId) getRecordsPorJuego(juegoId).then((r) => activo && setRecords(r)).catch(() => {})
    return () => {
      activo = false
    }
  }, [juegoId])

  if (!proxima) return null
  const delGrupo = mejorRecord(records, proxima.juego?.menor_es_mejor, apodos)

  return (
    <section className="gem-panel px-6 py-6 sm:px-8 flex flex-col gap-5" aria-labelledby="previa-titulo">
      <div>
        <span className="stat-label">Previa · Fecha {proxima.numero_fecha}</span>
        <h2 id="previa-titulo" className="font-display text-xl">
          {proxima.juego?.nombre || 'Juego sin definir'}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Columna titulo="Récord a batir">
          {proxima.record_mundial && (
            <p className="text-sm">
              Mundial: <span className="text-gold font-medium">{proxima.record_mundial}</span>
            </p>
          )}
          {delGrupo && (
            <p className="text-sm">
              Del grupo: <span className="text-gold font-medium">{delGrupo.valor}</span>{' '}
              <Link to={`/jugador/${delGrupo.jugador_id}`} className="text-muted hover:text-gold">({delGrupo.apodo})</Link>
            </p>
          )}
          {!proxima.record_mundial && !delGrupo && <p className="text-sm text-muted">Todavía no hay récords en este juego.</p>}
        </Columna>
        <Columna titulo="Llegan mejor">
          {forma.length === 0 ? (
            <p className="text-sm text-muted">Se ve después de la primera fecha.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm">
              {forma.map((x) => (
                <li key={x.jugador_id}>
                  <Link to={`/jugador/${x.jugador_id}`} className="font-medium hover:text-gold">{x.apodo}</Link>{' '}
                  <span className="text-muted">· {x.puestos.map((p) => `${p}°`).join(', ')}</span>
                </li>
              ))}
            </ol>
          )}
        </Columna>
        <Columna titulo="Rachas en juego">
          {rachas.length === 0 ? (
            <p className="text-sm text-muted">Nadie viene de 2 podios seguidos.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {rachas.map((x) => (
                <li key={x.jugador_id}>
                  <Link to={`/jugador/${x.jugador_id}`} className="font-medium hover:text-gold">{x.apodo}</Link>{' '}
                  <span className="text-muted">{x.texto}</span>
                </li>
              ))}
            </ul>
          )}
        </Columna>
      </div>
    </section>
  )
}
