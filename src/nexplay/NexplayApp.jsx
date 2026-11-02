import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getMiCuenta, registrarseConCodigo } from '../lib/queries'
import { borrarCodigo, leerCodigo } from './invitacion.js'
import { Cargando, Chip, ErrorRed, Marco, PanelAviso, codigoDeError, nombreVisible } from './componentes.jsx'
import Entrar from './pages/Entrar.jsx'
import Inicio from './pages/Inicio.jsx'
import AdminJugadores from './pages/AdminJugadores.jsx'

// Google devuelve los errores en ?error= o en #error=. Se lee una sola vez y se limpia la URL.
function leerErrorGoogle() {
  const hash = new URLSearchParams(location.hash.slice(1))
  const query = new URLSearchParams(location.search)
  if (!hash.has('error') && !query.has('error')) return false
  for (const k of ['error', 'error_code', 'error_description']) query.delete(k)
  const resto = query.toString()
  history.replaceState(null, '', location.pathname + (resto ? `?${resto}` : ''))
  return true
}
const errorGoogle = leerErrorGoogle()

export default function NexplayApp() {
  const [session, setSession] = useState(undefined) // undefined = todavía no sabemos
  // vista: cargando | registrando | error | invalida | sin_invitacion | cuenta
  const [vista, setVista] = useState('cargando')
  const [cuenta, setCuenta] = useState(null)
  const userId = session?.user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nueva) => setSession(nueva))
    return () => listener.subscription.unsubscribe()
  }, [])

  const corrida = useRef(0)
  const recargarCuenta = useCallback(async () => {
    const id = ++corrida.current
    const vigente = () => id === corrida.current
    try {
      let actual = await getMiCuenta()
      const codigo = leerCodigo()
      if (!actual && codigo) {
        if (vigente()) setVista('registrando')
        try {
          await registrarseConCodigo(codigo)
        } catch (err) {
          if (codigoDeError(err) !== 'codigo_invalido') throw err
          borrarCodigo()
          if (vigente()) setVista('invalida')
          return
        }
        actual = await getMiCuenta()
      }
      // Con cuenta ya existente el servidor ignora el código: se borra igual.
      if (codigo) borrarCodigo()
      if (!vigente()) return
      setCuenta(actual)
      setVista(actual ? 'cuenta' : 'sin_invitacion')
    } catch (err) {
      console.error(err)
      if (vigente()) setVista('error')
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      corrida.current++
      setCuenta(null)
      setVista('cargando')
      return
    }
    recargarCuenta()
  }, [userId, recargarCuenta])

  async function salir() {
    await supabase.auth.signOut()
  }

  let contenido
  if (session === undefined) contenido = <Cargando texto="Cargando…" />
  else if (!session) contenido = <Entrar errorGoogle={errorGoogle} />
  else if (vista === 'cargando') contenido = <Cargando texto="Cargando tu cuenta…" />
  else if (vista === 'registrando') contenido = <Cargando texto="Uniéndote a NEXPLAY…" />
  else if (vista === 'error') contenido = <ErrorRed onReintentar={() => { setVista('cargando'); recargarCuenta() }} />
  else if (vista === 'invalida')
    contenido = (
      <PanelAviso tono="error" accion={<BotonSalir onClick={salir} />}>
        El link de invitación no es válido o venció. Pedile uno nuevo al admin.
      </PanelAviso>
    )
  else if (vista === 'sin_invitacion')
    contenido = (
      <PanelAviso accion={<BotonSalir onClick={salir} />}>
        Necesitás un link de invitación para entrar a NEXPLAY. Pedíselo al admin.
      </PanelAviso>
    )
  else if (cuenta.estado === 'pendiente') contenido = <Pendiente cuenta={cuenta} recargarCuenta={recargarCuenta} />
  else if (cuenta.estado === 'bloqueado')
    contenido = (
      <div className="space-y-4 pt-6">
        <Chip tono="error">Bloqueada</Chip>
        <PanelAviso accion={<BotonSalir onClick={salir} />}>Tu cuenta está bloqueada. Hablá con el admin.</PanelAviso>
      </div>
    )
  else
    contenido = (
      <Routes>
        <Route path="/" element={<Inicio cuenta={cuenta} />} />
        {cuenta.es_admin && (
          <Route path="/admin" element={<AdminJugadores cuenta={cuenta} recargarCuenta={recargarCuenta} />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )

  return (
    <Marco session={session} onSalir={salir}>
      {contenido}
    </Marco>
  )
}

function BotonSalir({ onClick }) {
  return <button type="button" className="nx-btn nx-btn-secondary" onClick={onClick}>Salir</button>
}

function Pendiente({ cuenta, recargarCuenta }) {
  const [actualizando, setActualizando] = useState(false)
  const [todavia, setTodavia] = useState(false)

  useEffect(() => {
    if (!todavia) return
    const t = setTimeout(() => setTodavia(false), 3000)
    return () => clearTimeout(t)
  }, [todavia])

  async function actualizar() {
    setActualizando(true)
    setTodavia(false)
    await recargarCuenta()
    // Si cambió el estado este componente ya no está montado.
    setActualizando(false)
    setTodavia(true)
  }

  const nombre = nombreVisible(cuenta)
  return (
    <div className="space-y-4 pt-6">
      <Chip tono="pendiente">Pendiente</Chip>
      <div className="gem-panel p-6 space-y-4">
        <p className="text-body text-ink">
          Listo, <span className="inline-block max-w-full truncate align-bottom" title={nombre}>{nombre}</span>. El
          admin tiene que aceptarte. Cuando lo haga, tocá Actualizar.
        </p>
        <button type="button" className="nx-btn nx-btn-secondary" onClick={actualizar} disabled={actualizando}>
          {actualizando ? 'Actualizando…' : 'Actualizar'}
        </button>
        <p role="status" className="min-h-[1.4em] text-caption text-faint">{todavia ? 'Todavía no te aceptó.' : ''}</p>
      </div>
    </div>
  )
}
