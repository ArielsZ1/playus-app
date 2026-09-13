import { Link, NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

const navItem =
  'px-3 py-2 text-sm font-medium transition-colors border-b-2 border-transparent hover:text-ink'
const navItemActive = 'text-gold border-gold'
const navItemInactive = 'text-muted'

export default function Navbar({ temporadas, temporadaId, onChangeTemporada, session }) {
  return (
    <header className="border-b border-line">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-3 h-3 bg-gold" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} />
          <span className="font-display text-xl text-ink">Playus</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={({ isActive }) => `${navItem} ${isActive ? navItemActive : navItemInactive}`}>
            Ranking
          </NavLink>
          <NavLink to="/notas" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : navItemInactive}`}>
            Notas
          </NavLink>
          <NavLink to="/historial" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : navItemInactive}`}>
            Historial
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : navItemInactive}`}>
            Cargar datos
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {temporadas.length > 0 && (
            <select
              value={temporadaId || ''}
              onChange={(e) => onChangeTemporada(e.target.value)}
              className="bg-panel border border-line text-ink text-sm px-3 py-2 focus:outline-none focus:border-gold"
            >
              {temporadas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          )}

          {session && (
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-muted hover:text-ruby">
              Salir
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
