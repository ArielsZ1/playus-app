import { Link } from 'react-router-dom'
import { nombreVisible } from '../componentes.jsx'

export default function Inicio({ cuenta }) {
  const nombre = nombreVisible(cuenta)
  return (
    <div className="space-y-6 pt-6">
      <div className="space-y-2">
        <h1 className="truncate font-display text-heading font-bold text-ink" title={nombre}>
          Hola, {nombre}
        </h1>
        {cuenta.es_admin && !cuenta.jugador_id && (
          <p className="text-caption text-faint">Vinculá tu cuenta a tu jugador en Jugadores.</p>
        )}
      </div>
      <div className="gem-panel p-6">
        <p className="text-body text-ink">La primera temporada NEXPLAY arranca pronto.</p>
      </div>
      {cuenta.es_admin && (
        <Link to="/admin" className="nx-btn nx-btn-secondary">Jugadores</Link>
      )}
    </div>
  )
}
