import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { leerCodigo } from '../invitacion.js'
import { Chip, PanelAviso, MENSAJE_RED } from '../componentes.jsx'

export default function Entrar({ errorGoogle }) {
  const [abriendoGoogle, setAbriendoGoogle] = useState(false)
  const [fallaGoogle, setFallaGoogle] = useState(errorGoogle)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [errorAdmin, setErrorAdmin] = useState(null)
  const tieneInvitacion = Boolean(leerCodigo())

  async function entrarConGoogle() {
    setAbriendoGoogle(true)
    setFallaGoogle(false)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/nexplay/` },
    })
    // Si sale bien el navegador ya se fue a Google; si no, volvemos a habilitar el botón.
    if (error) {
      console.error(error)
      setFallaGoogle(true)
      setAbriendoGoogle(false)
    }
  }

  async function entrarComoAdmin(e) {
    e.preventDefault()
    setEntrando(true)
    setErrorAdmin(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error(error)
      setPassword('')
      setErrorAdmin(error.status === 400 ? 'Mail o contraseña incorrectos.' : MENSAJE_RED)
    }
    setEntrando(false)
  }

  return (
    <div className="flex min-h-[70vh] flex-col justify-between gap-10 pt-6">
      <div className="space-y-4">
        <h1 className="font-display text-[32px] leading-[1.1] font-bold text-ink">Entrá a NEXPLAY</h1>
        <p className="text-body text-muted">Los juegos de la temporada, desde el celu.</p>
        {tieneInvitacion && <Chip tono="exito">Tenés una invitación</Chip>}
      </div>

      <div className="space-y-4">
        {fallaGoogle && (
          <PanelAviso tono="error">No se completó el ingreso con Google. Probá de nuevo.</PanelAviso>
        )}
        <button type="button" className="nx-btn nx-btn-primary" onClick={entrarConGoogle} disabled={abriendoGoogle}>
          {abriendoGoogle ? 'Abriendo Google…' : 'Entrar con Google'}
        </button>
        {tieneInvitacion && <p className="text-center text-body-sm text-muted">Entrá con Google para unirte.</p>}

        <details className="pt-4">
          <summary className="cursor-pointer py-3 text-body-sm text-muted hover:text-ink">Soy el admin</summary>
          <form onSubmit={entrarComoAdmin} className="space-y-4 pt-3">
            <label className="block space-y-2">
              <span className="stat-label">Mail</span>
              <input
                className="nx-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="stat-label">Contraseña</span>
              <input
                className="nx-input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errorAdmin)}
                aria-describedby={errorAdmin ? 'error-admin' : undefined}
              />
            </label>
            {errorAdmin && <p id="error-admin" role="alert" className="text-caption text-ruby">{errorAdmin}</p>}
            <button type="submit" className="nx-btn nx-btn-secondary" disabled={entrando}>
              {entrando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </details>
      </div>
    </div>
  )
}
