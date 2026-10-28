import { useEffect, useRef, useState } from 'react'
import { getFechasTodas, getJugadores } from '../lib/queries.js'
import { rankingDesdeFechas, temporadaTerminada } from '../lib/premios.js'

const CLAVE = 'playus-intro-vista'
const DURACION_APERTURA = 1200 // ms, igual que .telon en index.css
const ROTACION = 2800 // ms que se muestra cada campeón

// Una vez por visita: sessionStorage dura lo que la pestaña. Si el navegador lo bloquea, se muestra igual.
export function introPendiente() {
  try {
    return !sessionStorage.getItem(CLAVE)
  } catch {
    return true
  }
}

// La temporada elegida primero ("va ganando" si sigue en juego), después las demás de la más nueva a la más vieja
async function cargarCampeones(temporadas, temporadaId) {
  const [fechas, jugadores] = await Promise.all([getFechasTodas(), getJugadores()])
  const apodos = Object.fromEntries(jugadores.map((j) => [j.id, j.apodo]))
  const orden = [...temporadas].reverse().sort((a, b) => (String(b.id) === String(temporadaId)) - (String(a.id) === String(temporadaId)))
  const lista = []
  for (const t of orden) {
    const fechasT = fechas.filter((f) => String(f.temporada_id) === String(t.id))
    const [primero] = rankingDesdeFechas(fechasT, apodos)
    if (!primero || primero.gemas === 0) continue
    const terminada = temporadaTerminada(t, fechasT)
    lista.push({
      id: t.id,
      etiqueta: terminada ? `Campeón · ${t.nombre}` : `Va ganando · ${t.nombre}`,
      apodo: primero.apodo,
      gemas: primero.gemas,
    })
  }
  return lista
}

const CUERPO_COPA = 'M32 24H108L104 50C100 74 86 88 70 90C54 88 40 74 36 50Z'

function Trofeo() {
  return (
    <svg viewBox="0 0 140 150" className="intro-trofeo w-44 sm:w-56" aria-hidden="true">
      <defs>
        <linearGradient id="intro-oro" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A9772A" />
          <stop offset="0.3" stopColor="#F6D88A" />
          <stop offset="0.6" stopColor="#E8B54D" />
          <stop offset="1" stopColor="#8E6220" />
        </linearGradient>
        <linearGradient id="intro-gema" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DCE6FF" />
          <stop offset="0.45" stopColor="#6E9BFF" />
          <stop offset="1" stopColor="#2F4FA8" />
        </linearGradient>
        <linearGradient id="intro-luz" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="intro-copa">
          <path d={CUERPO_COPA} />
        </clipPath>
      </defs>

      <g fill="none" stroke="#F6D88A" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        {/* Asas */}
        <path className="intro-trazo" pathLength="1" stroke="url(#intro-oro)" strokeWidth="5" d="M36 32C12 30 12 64 44 68" />
        <path className="intro-trazo" pathLength="1" stroke="url(#intro-oro)" strokeWidth="5" d="M104 32C128 30 128 64 96 68" />
        {/* Copa, borde, cuello, nudo y pie */}
        <path className="intro-trazo intro-relleno" pathLength="1" fill="url(#intro-oro)" d={CUERPO_COPA} />
        <ellipse className="intro-trazo intro-relleno" pathLength="1" fill="#B9852F" cx="70" cy="24" rx="38" ry="5" />
        <path className="intro-trazo intro-relleno" pathLength="1" fill="url(#intro-oro)" d="M63 89L61 99H79L77 89" />
        <ellipse className="intro-trazo intro-relleno" pathLength="1" fill="url(#intro-oro)" cx="70" cy="103" rx="12" ry="4.5" />
        <path className="intro-trazo intro-relleno" pathLength="1" fill="url(#intro-oro)" d="M64 107L61 118H79L76 107" />
        <path className="intro-trazo intro-relleno" pathLength="1" fill="url(#intro-oro)" d="M50 118H90L95 128H45Z" />
        {/* Pedestal con placa */}
        <path className="intro-trazo intro-relleno" pathLength="1" fill="#2B2150" d="M38 128H102V146H38Z" />
        <path className="intro-trazo intro-relleno" pathLength="1" fill="url(#intro-oro)" strokeWidth="1" d="M54 132H86V142H54Z" />
        {/* Gema talla brillante */}
        <path className="intro-trazo intro-relleno intro-gema" pathLength="1" fill="url(#intro-gema)" stroke="#DCE6FF" d="M70 36L82 44L78 58L70 64L62 58L58 44Z" />
        <path className="intro-trazo intro-gema" pathLength="1" stroke="#DCE6FF" strokeWidth="1" d="M58 44H82M64 44L70 36L76 44M64 44L70 64L76 44" />
        {/* Reflejo y barrido de luz */}
        <path className="intro-reflejo" stroke="#FFF4D6" strokeWidth="2.5" d="M42 32C42 52 48 68 58 80" />
        <g clipPath="url(#intro-copa)" stroke="none">
          <rect className="intro-barrido" x="-30" y="10" width="24" height="90" fill="url(#intro-luz)" transform="skewX(-20)" />
        </g>
      </g>
    </svg>
  )
}

function Campeones({ lista }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (lista.length < 2) return
    const t = setInterval(() => setI((x) => (x + 1) % lista.length), ROTACION)
    return () => clearInterval(t)
  }, [lista.length])

  const c = lista[i]
  if (!c) return null
  return (
    <div className="flex flex-col items-center gap-3">
      <div key={c.id} className="intro-rotar flex flex-col items-center gap-0.5">
        <span className="stat-label text-gold">{c.etiqueta}</span>
        <span className="font-display text-2xl sm:text-3xl">{c.apodo}</span>
        <span className="text-sm text-muted">{c.gemas} gemas</span>
      </div>
      {lista.length > 1 && (
        <div className="flex gap-1.5" aria-hidden="true">
          {lista.map((x, j) => (
            <span key={x.id} className={`h-1.5 transition-all ${j === i ? 'w-5 bg-gold' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Intro({ temporadas, temporadaId, onTerminar }) {
  const [abriendo, setAbriendo] = useState(false)
  const [campeones, setCampeones] = useState([])
  const botonRef = useRef(null)

  useEffect(() => {
    if (temporadas.length === 0) return
    let activo = true
    cargarCampeones(temporadas, temporadaId)
      .then((lista) => activo && setCampeones(lista))
      .catch(() => {}) // la intro se muestra igual sin campeones
    return () => {
      activo = false
    }
  }, [temporadas, temporadaId])

  useEffect(() => {
    botonRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  function entrar() {
    if (abriendo) return
    try {
      sessionStorage.setItem(CLAVE, '1')
    } catch {
      // sin storage la intro vuelve a salir al recargar; no es grave
    }
    setAbriendo(true)
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setTimeout(onTerminar, reducido ? 300 : DURACION_APERTURA)
  }

  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && entrar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  return (
    <div
      className={`intro fixed inset-0 z-50 overflow-hidden ${abriendo ? 'intro-abriendo' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-titulo"
    >
      <div className="telon telon-izq" aria-hidden="true" />
      <div className="telon telon-der" aria-hidden="true" />

      <div className="intro-contenido intro-luz absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="relative flex items-center justify-center">
          <Trofeo />
          <span className="intro-destello" style={{ top: '6%', left: '14%' }} aria-hidden="true" />
          <span className="intro-destello" style={{ top: '30%', right: '8%', animationDelay: '2.9s' }} aria-hidden="true" />
          <span className="intro-destello" style={{ bottom: '28%', left: '6%', animationDelay: '3.4s' }} aria-hidden="true" />
        </div>

        <h1 id="intro-titulo" className="intro-aparecer font-display font-black text-5xl sm:text-7xl tracking-[0.15em] text-gold" style={{ '--retraso': '1.6s' }}>
          PLAYUS
        </h1>

        <div className="intro-aparecer min-h-[6rem]" style={{ '--retraso': '2s' }}>
          <Campeones lista={campeones} />
        </div>

        <button
          ref={botonRef}
          type="button"
          onClick={entrar}
          className="intro-aparecer gem-panel-sm gem-panel-gold [--fill:#2B2150] hover:[--fill:#3A2C66] px-8 py-3 font-display text-gold tracking-wide"
          style={{ '--retraso': '2.4s' }}
        >
          Entrar al torneo
        </button>
      </div>

      {/* Va después de la capa central (que ocupa toda la pantalla) para quedar encima y recibir el clic */}
      <button
        type="button"
        onClick={entrar}
        className="intro-contenido absolute top-4 right-4 text-sm text-muted hover:text-gold px-3 py-2"
      >
        Saltar
      </button>
    </div>
  )
}
