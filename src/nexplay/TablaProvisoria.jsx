import { useCallback, useEffect, useRef, useState } from 'react'
import { getTablaProvisoria } from '../lib/queries'
import { Cargando, tiempo, useCadaDiezSegundos } from './componentes.jsx'

// Contrato de estados etapa 2, sección 4.
export default function TablaProvisoria({ fechaId, menorEsMejor = true, miJugadorId, intentosMax = 3 }) {
  const [filas, setFilas] = useState(null)
  const [sinConexion, setSinConexion] = useState(false)
  const [cambiadas, setCambiadas] = useState(new Set())
  const previas = useRef(new Map())

  const cargar = useCallback(async () => {
    try {
      const datos = await getTablaProvisoria(fechaId)
      const nuevas = new Set()
      for (const f of datos) {
        const firma = `${f.mejor}|${f.intentos_usados}|${f.en_juego}`
        const antes = previas.current.get(f.jugador_id)
        if (antes !== undefined && antes !== firma) nuevas.add(f.jugador_id)
        previas.current.set(f.jugador_id, firma)
      }
      setFilas(datos)
      setCambiadas(nuevas)
      setSinConexion(false)
    } catch (err) {
      console.error(err)
      setSinConexion(true) // se queda lo último que llegó
    }
  }, [fechaId])

  useEffect(() => {
    previas.current = new Map()
    setFilas(null)
    cargar()
  }, [cargar])
  useCadaDiezSegundos(cargar)

  useEffect(() => {
    if (cambiadas.size === 0) return
    const t = setTimeout(() => setCambiadas(new Set()), 320)
    return () => clearTimeout(t)
  }, [cambiadas])

  if (!filas) return sinConexion ? <p className="text-caption text-faint">Sin conexión. Probamos de nuevo en unos segundos.</p> : <Cargando texto="Cargando la tabla…" />

  const conMarca = filas.filter((f) => f.mejor != null).map((f) => Number(f.mejor))
  const mejorQue = (a, b) => (menorEsMejor ? a < b : a > b)
  const ordenadas = [...filas].sort((a, b) => {
    if (a.mejor == null || b.mejor == null) return (a.mejor == null) - (b.mejor == null) || a.apodo.localeCompare(b.apodo, 'es')
    return menorEsMejor ? a.mejor - b.mejor : b.mejor - a.mejor
  })

  return (
    <section className="space-y-3" aria-labelledby="tabla-vivo">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-sapphire opacity-60 motion-safe:animate-ping [animation-duration:2s]" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sapphire" />
        </span>
        <h2 id="tabla-vivo" className="stat-label">Tabla en vivo</h2>
      </div>

      {ordenadas.length === 0 ? (
        <p className="gem-panel-sm p-4 text-body-sm text-muted">Todavía nadie jugó. ¡Sé el primero!</p>
      ) : (
        <ol className="gem-panel-sm divide-y divide-line">
          {ordenadas.map((f) => {
            const puesto = f.mejor == null ? null : 1 + conMarca.filter((m) => mejorQue(m, Number(f.mejor))).length
            const mia = f.jugador_id === miJugadorId
            return (
              <li
                key={f.jugador_id}
                className={`flex h-12 items-center gap-2 min-[360px]:gap-3 px-3 transition-colors duration-300 ${
                  cambiadas.has(f.jugador_id) ? 'bg-panel3' : mia ? 'bg-panel3/60' : ''
                }`}
              >
                <span className={`w-6 text-center font-semibold tabular-nums ${puesto === 1 ? 'text-gold' : 'text-faint'}`}>
                  {puesto ?? ''}
                </span>
                <span className="min-w-0 flex-1 truncate text-body text-ink" title={f.apodo}>
                  {f.apodo}
                  {mia && <span className="sr-only"> (vos)</span>}
                </span>
                {/* bajo 360px el chip deja el apodo en una letra: ahí va solo el punto zafiro */}
                {f.en_juego && (
                  <>
                    <span className="nx-chip h-6 bg-live-bg text-sapphire border-sapphire hidden min-[360px]:inline-flex">jugando</span>
                    <span role="img" aria-label="jugando" className="size-2 shrink-0 rounded-full bg-sapphire min-[360px]:hidden" />
                  </>
                )}
                <span className="w-16 text-right tabular-nums text-ink">{tiempo(f.mejor)}</span>
                <span className="w-9 text-right text-caption tabular-nums text-faint">
                  {f.intentos_usados}/{intentosMax}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <p className="text-caption text-faint">
        {sinConexion
          ? 'Sin conexión. Mostrando lo último.'
          : 'Se actualiza sola cada 10 segundos. Los puntos se calculan al cerrar la fecha.'}
      </p>
    </section>
  )
}
