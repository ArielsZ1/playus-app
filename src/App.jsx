import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FechaDetalle from './pages/FechaDetalle.jsx'
import Admin from './pages/Admin.jsx'
import Notas from './pages/Notas.jsx'
import Historial from './pages/Historial.jsx'
import Login from './pages/Login.jsx'
import { getTemporadas } from './lib/queries.js'
import { supabase } from './lib/supabaseClient.js'
import { useNavigate } from 'react-router-dom'

export default function App() {
  const navigate = useNavigate()
  const [temporadas, setTemporadas] = useState([])
  const [temporadaId, setTemporadaId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [session, setSession] = useState(null)

  function handleTemporadaCreada(temporada) {
    setTemporadas((prev) => [...prev, temporada])
    setTemporadaId(temporada.id)
  }

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

        {!loading && !errorMsg && !temporadaId && (
          <div className="gem-panel px-6 py-8 text-center text-muted">
            Todavía no hay ninguna temporada cargada. Creá una desde la sección Admin.
          </div>
        )}

        <Routes>
          <Route path="/" element={temporadaId ? <Dashboard temporadaId={temporadaId} /> : null} />
          <Route path="/fecha/:fechaId" element={<FechaDetalle />} />
          <Route
            path="/admin"
            element={
              session ? (
                <Admin
                  temporadaId={temporadaId}
                  temporadas={temporadas}
                  onTemporadaCreada={handleTemporadaCreada}
                />
              ) : (
                <Login />
              )
            }
          />
          <Route path="/notas" element={temporadaId ? <Notas temporadaId={temporadaId} /> : null} />
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
        </Routes>
      </main>
    </div>
  )
}
