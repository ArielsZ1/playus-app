import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Paleta cíclica para las líneas de cada jugador (no sabemos cuántos jugadores va a haber)
const COLORES = ['#E8B54D', '#4E7FE8', '#3FAE7A', '#D14E5A', '#B18CFF', '#5FD1D8']

export default function EvolucionChart({ datos, jugadores }) {
  if (!datos || datos.length === 0) return null

  return (
    <div className="gem-panel p-6 mb-12">
      <h2 className="font-display text-lg mb-4">Evolución de gemas por fecha</h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={datos}>
          <CartesianGrid stroke="#3A3168" strokeDasharray="3 3" />
          <XAxis
            dataKey="numero_fecha"
            tickFormatter={(n) => `F${n}`}
            stroke="#9C93C0"
            tick={{ fill: '#9C93C0', fontSize: 12 }}
          />
          <YAxis stroke="#9C93C0" tick={{ fill: '#9C93C0', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#1E1840', border: '1px solid #3A3168', color: '#F1EDFF' }}
            labelFormatter={(n) => `Fecha ${n}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9C93C0' }} />
          {jugadores.map((apodo, i) => (
            <Line
              key={apodo}
              type="monotone"
              dataKey={apodo}
              stroke={COLORES[i % COLORES.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
