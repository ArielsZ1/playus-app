import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Paleta cíclica por puesto en el ranking; el Dashboard la usa también para los avatares
export const COLORES = ['#E8B54D', '#6E9BFF', '#3FAE7A', '#F07A84', '#B18CFF', '#5FD1D8']

// Convierte gemas acumuladas por fecha en puesto de temporada por fecha (mismo desempate que getRanking)
function aPosiciones(datos, jugadores) {
  return datos.map((punto) => {
    const orden = [...jugadores].sort((a, b) => punto[b] - punto[a] || a.localeCompare(b))
    const fila = { numero_fecha: punto.numero_fecha }
    orden.forEach((apodo, i) => (fila[apodo] = i + 1))
    return fila
  })
}

export default function EvolucionChart({ datos, jugadores }) {
  if (!datos || datos.length === 0) return null
  const posiciones = aPosiciones(datos, jugadores)

  return (
    <section className="gem-panel p-6" aria-labelledby="evolucion-titulo">
      <h2 id="evolucion-titulo" className="font-display text-xl">Evolución de posiciones</h2>
      <p className="text-sm text-muted mt-1 mb-4">Puesto en la temporada después de cada fecha</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={posiciones} margin={{ top: 10, right: 30, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#2E2658" vertical={false} />
          <XAxis
            dataKey="numero_fecha"
            tickFormatter={(n) => `F${n}`}
            stroke="#B3ABD6"
            tick={{ fill: '#B3ABD6', fontSize: 12 }}
          />
          <YAxis
            reversed
            domain={[1, jugadores.length]}
            allowDecimals={false}
            interval={0}
            ticks={jugadores.map((_, i) => i + 1)}
            tickFormatter={(p) => `${p}°`}
            stroke="#B3ABD6"
            tick={{ fill: '#B3ABD6', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: '#1E1840', border: '1px solid #3A3168', color: '#F1EDFF' }}
            labelFormatter={(n) => `Fecha ${n}`}
            formatter={(puesto, apodo) => [`${puesto}°`, apodo]}
            itemSorter={(item) => item.value}
          />
          {jugadores.map((apodo, i) => (
            <Line
              key={apodo}
              type="linear"
              dataKey={apodo}
              stroke={COLORES[i % COLORES.length]}
              strokeWidth={i === 0 ? 4 : 2.5}
              dot={{ r: 4, strokeWidth: 0, fill: COLORES[i % COLORES.length] }}
              label={(props) =>
                props.index === posiciones.length - 1 ? (
                  <text x={props.x + 10} y={props.y} dy={4} fill={COLORES[i % COLORES.length]} fontSize={12} fontWeight={600}>
                    {apodo.charAt(0).toUpperCase()}
                  </text>
                ) : null
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}
