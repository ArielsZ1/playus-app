import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import { getTemporadas } from './lib/queries.js'
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
  const [temporadas, setTemporadas] = useState([])
  const [temporadaId, setTemporadaId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [session, setSession] = useState(null)

  const noTemporada = (
    <div className="gem-panel px-6 py-8 text-center text-muted">
      Todavía no hay ninguna temporada cargada. Creá una desde la sección Admin.
    </div>
  )

  useEffect(() => {
    getTemporadas()
      .then((data) => {
        setTemporadas(data)
        if (data.length > 0) setTemporadaId(data[data.length - 1].id)
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
      <Navbar
        temporadas={temporadas}
        temporadaId={temporadaId}
        onChangeTemporada={setTemporadaId}
        session={session}
      />

      <main className="max-w-5xl mx-auto px-4 pb-24 pt-8">
        {loading && <p className="text-muted">Cargando temporadas…</p>}
        {errorMsg && (
          <div className="gem-panel-sm bg-ruby/10 border border-ruby text-ruby px-4 py-3">
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
                  session ? (
                    <Admin
                      temporadaId={temporadaId}
                      temporadas={temporadas}
                      onTemporadaCreada={(nueva) => {
                        setTemporadas((prev) => [...prev, nueva])
                        setTemporadaId(nueva.id)
                      }}
                    />
                  ) : (
                    <Login />
                  )
                }
              />
              <Route path="/notas" element={temporadaId ? <Notas temporadaId={temporadaId} /> : noTemporada} />
              <Route path="/jugador/:jugadorId" element={temporadaId ? <PerfilJugador /> : noTemporada} />
              <Route path="/premios" element={temporadaId ? <Premios temporadaId={temporadaId} /> : noTemporada} />
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