import { ganadoresDeFecha, seJugo } from '../lib/fecha.js'

function Dato({ etiqueta, children, detalle }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="stat-label">{etiqueta}</span>
      <span className="font-display text-2xl truncate">{children}</span>
      {detalle && <span className="text-sm text-muted truncate">{detalle}</span>}
    </div>
  )
}

export default function ResumenTemporada({ ranking, fechas }) {
  const jugadas = fechas.filter(seJugo)
  const ultima = jugadas[jugadas.length - 1]
  const proxima = fechas.find((f) => !seJugo(f))
  const [lider, segundo] = ranking
  const apodos = Object.fromEntries(ranking.map((j) => [j.jugador_id, j.apodo]))
  const progreso = fechas.length ? Math.round((jugadas.length / fechas.length) * 100) : 0

  return (
    <section className="gem-panel gem-panel-gold px-6 py-6 sm:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" aria-label="Resumen de la temporada">
      <div className="flex flex-col gap-1.5">
        <span className="stat-label">Progreso</span>
        <span className="font-display text-2xl">
          Fecha {jugadas.length} <span className="text-[1rem] text-muted">de {fechas.length}</span>
        </span>
        <div
          className="h-1.5 bg-panel2 mt-1"
          role="progressbar"
          aria-valuenow={progreso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Fechas jugadas"
        >
          <div className="h-full bg-gold" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      {lider && (
        <Dato
          etiqueta="Líder"
          detalle={`${lider.gemas} gemas${segundo ? ` · +${lider.gemas - segundo.gemas} sobre el 2°` : ''}`}
        >
          <span className="text-gold">{lider.apodo}</span>
        </Dato>
      )}

      {ultima && (
        <Dato etiqueta="Última fecha" detalle={`Ganó ${ganadoresDeFecha(ultima).map((id) => apodos[id]).join(', ')}`}>
          {ultima.juego?.nombre || `Fecha ${ultima.numero_fecha}`}
        </Dato>
      )}

      {proxima ? (
        <Dato etiqueta="Próxima fecha" detalle={proxima.juego?.nombre || 'Juego sin definir'}>
          Fecha {proxima.numero_fecha}
        </Dato>
      ) : (
        <Dato etiqueta="Próxima fecha" detalle="No hay fechas pendientes cargadas">
          —
        </Dato>
      )}
    </section>
  )
}
