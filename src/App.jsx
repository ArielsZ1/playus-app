import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Intro, { introPendiente } from './components/Intro.jsx'
import { getTemporadas, getMiCuenta } from './lib/queries.js'
import { supabase } from './lib/supabaseClient.js'
import { useNavigate } from 'react-router-dom'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const FechaDetalle = lazy(() => import('./pages/FechaDetalle.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const Notas = lazy(() => import('./pages/Notas.jsx'))
const Historial = lazy(() => import('./pages/Historial.jsx'))
const PerfilJugador = lazy(() => import('./pages/PerfilJugador.jsx'))
const Premios = lazy(() => import('./pages/Premios.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  // Solo al llegar al inicio: un link directo a un perfil o fecha no pasa por el telón
  const [mostrarIntro, setMostrarIntro] = useState(() => location.pathname === '/' && introPendiente())
  const [temporadas, setTemporadas] = useState([])
  const [temporadaId, setTemporadaId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [session, setSession] = useState(null)
  // null = verificando; misma regla que public.es_admin() en la base
  const [esAdmin, setEsAdmin] = useState(null)
  const [cuentaError, setCuentaError] = useState(null)
  const userId = session?.user?.id

  useEffect(() => {
    setEsAdmin(null)
    setCuentaError(null)
    if (!userId) return
    let vigente = true
    getMiCuenta()
      .then((c) => vigente && setEsAdmin(Boolean(c?.es_admin && c.estado === 'aceptado')))
      .catch((err) => vigente && setCuentaError(err.message))
    return () => { vigente = false }
  }, [userId])

  const noTemporada = (
    <div className="gem-panel px-6 py-8 text-center text-muted">
      Todavía no hay ninguna temporada cargada. Creá una desde la sección Admin.
    </div>
  )

  useEffect(() => {
    getTemporadas()
      .then((data) => {
        setTemporadas(data)
        // Una temporada NEXPLAY recién creada no se muestra hasta tener una fecha cerrada
        const visibles = data.filter((t) => !t.es_nexplay || t.cerradas > 0)
        const defecto = visibles.at(-1) ?? data.at(-1)
        if (defecto) setTemporadaId(defecto.id)
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false))

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen">
      {mostrarIntro && (
        <Intro
          temporadas={temporadas}
          temporadaId={temporadaId}
          onTerminar={() => setMostrarIntro(false)}
        />
      )}
      <Navbar
        temporadas={temporadas}
        temporadaId={temporadaId}
        onChangeTemporada={setTemporadaId}
        session={session}
      />

      <main className="max-w-6xl mx-auto px-4 pb-24 pt-8">
        {loading && <p className="text-muted">Cargando temporadas…</p>}
        {errorMsg && (
          <div className="gem-panel-sm bg-ruby/10 [--edge:#D14E5A] text-[#F07A84] px-4 py-3">
            No se pudo conectar con la base de datos: {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && (
          <Suspense fallback={<p className="text-muted">Cargando sección…</p>}>
            <Routes>
              <Route path="/" element={temporadaId ? <Dashboard temporadaId={temporadaId} /> : noTemporada} />
              <Route path="/fecha/:fechaId" element={temporadaId ? <FechaDetalle /> : noTemporada} />
              <Route
                path="/admin"
                element={
                  !session ? (
                    <Login />
                  ) : cuentaError ? (
                    <div className="gem-panel-sm bg-ruby/10 [--edge:#D14E5A] text-[#F07A84] px-4 py-3">
                      No se pudo verificar la cuenta: {cuentaError}
                    </div>
                  ) : esAdmin === null ? (
                    <p className="text-muted">Verificando cuenta…</p>
                  ) : !esAdmin ? (
                    <div className="gem-panel px-6 py-8 text-center">
                      <p className="text-ink">Esta cuenta no es admin.</p>
                      <button
                        type="button"
                        onClick={() => supabase.auth.signOut()}
                        className="mt-4 px-4 py-2 rounded-md border border-muted/40 text-muted hover:text-ink"
                      >
                        Salir
                      </button>
                    </div>
                  ) : (
                    <Admin
                      temporadaId={temporadaId}
                      temporadas={temporadas}
                      onTemporadaCreada={(nueva) => {
                        setTemporadas((prev) => [...prev, { ...nueva, cerradas: 0 }])
                        setTemporadaId(nueva.id)
                      }}
                    />
                  )
                }
              />
              <Route path="/notas" element={temporadaId ? <Notas temporadaId={temporadaId} /> : noTemporada} />
              <Route path="/jugador/:jugadorId" element={temporadaId ? <PerfilJugador temporadas={temporadas} /> : noTemporada} />
              <Route path="/premios" element={temporadaId ? <Premios temporadaId={temporadaId} temporada={temporadas.find((t) => String(t.id) === String(temporadaId))} /> : noTemporada} />
              <Route
                path="/historial"
                element={
                  <Historial
                    temporadas={temporadas}
                    onSeleccionar={(id) => {
                      setTemporadaId(id)
                      navigate('/')
                    }}
                  />
                }
              />
              <Route
                path="*"
                element={<div className="gem-panel px-6 py-8 text-center text-muted">La página que buscás no existe.</div>}
              />
            </Routes>
          </Suspense>
        )}
      </main>
    </div>
  )
}