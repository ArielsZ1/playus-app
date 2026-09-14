import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err) {
      setMensaje(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto gem-panel p-6 mt-10">
      <h1 className="font-display text-xl mb-1">Ingresar</h1>
      <p className="text-sm text-muted mb-6">Solo el admin puede cargar datos de la temporada.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full bg-panel2 border border-line px-3 py-2 text-sm focus:outline-none focus:border-gold"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Contraseña"
          className="w-full bg-panel2 border border-line px-3 py-2 text-sm focus:outline-none focus:border-gold"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          disabled={cargando}
          className="w-full bg-gold text-base font-medium py-2 hover:brightness-110 disabled:opacity-50"
        >
          {cargando ? 'Un momento…' : 'Ingresar'}
        </button>
      </form>

      {mensaje && <p className="text-sm text-ruby mt-4">{mensaje}</p>}

    </div>
  )
}
