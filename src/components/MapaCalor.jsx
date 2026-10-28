import { puestoEnFecha, seJugo } from '../lib/fecha.js'

// Fondo y texto por puesto: dorado para el 1°, apagándose hasta el 3°, el resto neutro
const ESTILOS = {
  1: 'bg-gold text-[#14102A]',
  2: 'bg-[#A8843C] text-[#14102A]',
  3: 'bg-[#6E5536] text-ink',
}

export default function MapaCalor({ fechas, ranking }) {
  const jugadas = fechas.filter(seJugo)
  if (jugadas.length === 0) return null

  return (
    <section className="gem-panel p-6" aria-labelledby="mapa-titulo">
      <h2 id="mapa-titulo" className="font-display text-xl">Puesto en cada fecha</h2>
      <p className="text-sm text-muted mt-1 mb-4">Toda la temporada de un vistazo</p>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="sr-only">Jugador</th>
              {jugadas.map((f) => (
                <th key={f.id} scope="col" className="stat-label font-medium text-center min-w-[2.75rem]">
                  F{f.numero_fecha}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((j) => (
              <tr key={j.jugador_id}>
                <th scope="row" className="text-left font-medium pr-2 whitespace-nowrap">
                  {j.apodo}
                </th>
                {jugadas.map((f) => {
                  const r = f.resultados.find((x) => x.jugador_id === j.jugador_id)
                  const puesto = r ? puestoEnFecha(r, f.resultados) : null
                  return puesto ? (
                    <td key={f.id} className={`h-10 text-center font-display text-xs ${ESTILOS[puesto] || 'bg-line text-ink'}`}>
                      {puesto}°
                    </td>
                  ) : (
                    <td key={f.id} className="h-10 border border-dashed border-[#5A5088]">
                      <span className="sr-only">No jugó</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-gold" />1°</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-[#A8843C]" />2°</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-[#6E5536]" />3°</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-line" />resto</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border border-dashed border-[#5A5088]" />no jugó</span>
      </div>
    </section>
  )
}
