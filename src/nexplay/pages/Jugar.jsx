import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { empezarIntento, getMisIntentos, getNombresJuegos, getTorneoActual, terminarIntento } from '../../lib/queries'
import { Cargando, Chip, ErrorRed, PanelAviso, codigoDeError, mejorDe, textoDeError, textoDeMotivo, tiempo } from '../componentes.jsx'
import { juegos } from '../juegos/index.js'
import Ruleta from '../Ruleta.jsx'
import { PuntosIntento } from './Inicio.jsx'

const INTENTOS = 3

// Contrato de estados etapa 2, secciones 2 y 3.
// fase: cargando | error | ruleta | instrucciones | pidiendo | cuenta | jugando | enviando | errorEnvio | rechazado | resultado
export default function Jugar({ cuenta }) {
  const navigate = useNavigate()
  const [fase, setFase] = useState('cargando')
  const [fecha, setFecha] = useState(null)
  const [intentos, setIntentos] = useState([])
  const [nombres, setNombres] = useState([])
  const [actual, setActual] = useState(null) // { intento_id, numero, semilla, modulo }
  const [pendiente, setPendiente] = useState(null) // { resultado, datos_del_intento }
  const [ultimo, setUltimo] = useState(null) // fila de intentos que devolvió el servidor
  const [error, setError] = useState(null)
  const [salir, setSalir] = useState(false)

  async function cargar() {
    setFase('cargando')
    try {
      const { abierta } = await getTorneoActual()
      const mios = abierta && cuenta.jugador_id ? await getMisIntentos(abierta.id, cuenta.jugador_id) : []
      if (!abierta || !cuenta.jugador_id || mios.length >= INTENTOS) return setSalir(true)
      setFecha(abierta)
      setIntentos(mios)
      if (mios.length === 0) {
        setNombres(await getNombresJuegos().catch(() => [abierta.juego.nombre]))
        setFase('ruleta')
      } else setFase('instrucciones')
    } catch (err) {
      console.error(err)
      setFase('error')
    }
  }
  useEffect(() => { cargar() }, [])

  const modulo = fecha && juegos[fecha.juego?.modulo]
  const menor = fecha?.juego?.menor_es_mejor ?? true

  async function pedir() {
    setError(null)
    setFase('pidiendo')
    try {
      setActual(await empezarIntento(fecha.id))
      setFase('cuenta')
    } catch (err) {
      console.error(err)
      const codigo = codigoDeError(err)
      if (codigo === 'sin_intentos' || codigo === 'fecha_no_abierta') return navigate('/', { replace: true })
      setError(textoDeError(codigo))
      setFase(ultimo ? 'resultado' : 'instrucciones')
    }
  }

  async function enviar(datos = pendiente) {
    setFase('enviando')
    let fila
    try {
      fila = await terminarIntento(actual.intento_id, datos.resultado, datos.datos_del_intento)
    } catch (err) {
      console.error(err)
      const codigo = codigoDeError(err)
      if (codigo === 'intento_ajeno') return setFase('rechazado')
      if (codigo !== 'intento_cerrado') return setFase('errorEnvio')
      // Puede ser un reintento cuya primera respuesta se perdió: si el servidor ya lo guardó, se muestra
      const mios = await getMisIntentos(fecha.id, cuenta.jugador_id).catch(() => [])
      const guardado = mios.find((i) => i.id === actual.intento_id && (i.estado === 'completado' || i.estado === 'invalido'))
      if (!guardado) return setFase('rechazado')
      setUltimo(guardado)
      setIntentos(mios)
      return setFase('resultado')
    }
    setUltimo(fila)
    // La lista solo alimenta "tu mejor": si falla, se arma con lo que ya hay
    const mios = await getMisIntentos(fecha.id, cuenta.jugador_id).catch(() => [...intentos.filter((i) => i.id !== fila.id), fila])
    setIntentos(mios)
    setFase('resultado')
  }

  if (salir) return <Navigate to="/" replace />
  if (fase === 'cargando') return <Cargando texto="Preparando la fecha…" />
  if (fase === 'error') return <div className="pt-6"><ErrorRed onReintentar={cargar} /></div>
  if (!modulo) {
    return (
      <div className="pt-6">
        <PanelAviso accion={<Link to="/" className="nx-btn nx-btn-secondary">Volver</Link>}>
          Este juego todavía no se puede jugar.
        </PanelAviso>
      </div>
    )
  }

  const { Instrucciones, Juego } = modulo
  const k = intentos.length + 1 // próximo intento

  if (fase === 'ruleta') {
    return (
      <div className="space-y-6 pt-6 text-center">
        <p className="stat-label">Fecha {fecha.numero_fecha}</p>
        <p className="text-body text-muted" role="status">Sorteando el juego…</p>
        <Ruleta nombres={nombres} elegido={fecha.juego.nombre} onFin={() => setFase('instrucciones')} />
      </div>
    )
  }

  if (fase === 'instrucciones' || fase === 'pidiendo') {
    const mejor = mejorDe(intentos, menor)
    return (
      <div className="space-y-6 pt-6">
        <div className="space-y-1">
          <p className="stat-label">{k === 1 ? `Fecha ${fecha.numero_fecha}` : `Intento ${k} de ${INTENTOS}`}</p>
          <h1 className="font-display text-heading font-bold text-ink">{fecha.juego.nombre}</h1>
          {k > 1 && <p className="text-body text-muted">Tu mejor: <span className="tabular-nums">{tiempo(mejor)}</span></p>}
        </div>
        {k === 1 ? (
          <div className="gem-panel p-6"><Instrucciones /></div>
        ) : (
          <details className="gem-panel-sm p-4">
            <summary className="cursor-pointer text-body-sm text-muted">Ver instrucciones</summary>
            <div className="pt-4"><Instrucciones /></div>
          </details>
        )}
        <div className="space-y-2">
          <button type="button" className="nx-btn nx-btn-primary w-full" disabled={fase === 'pidiendo'} onClick={pedir}>
            {fase === 'pidiendo' ? 'Preparando…' : `Jugar intento ${k}`}
          </button>
          {error && <p role="alert" className="text-body-sm text-ruby">{error}</p>}
          <p className="text-caption text-faint">Si salís en medio del intento, cuenta como usado.</p>
        </div>
      </div>
    )
  }

  if (fase === 'cuenta') return <CuentaRegresiva onFin={() => setFase('jugando')} />

  if (fase === 'jugando') {
    return (
      <div className="pt-2">
        <Juego
          semilla={actual.semilla}
          onTerminar={({ resultado, datos_del_intento }) => {
            const datos = { resultado, datos_del_intento }
            setPendiente(datos)
            enviar(datos)
          }}
        />
      </div>
    )
  }

  if (fase === 'enviando' || fase === 'errorEnvio') {
    return (
      <div className="space-y-6 pt-10 text-center">
        <p className="font-display text-5xl font-black tabular-nums text-ink">{tiempo(pendiente.resultado)}</p>
        {fase === 'enviando' ? (
          <p role="status" className="text-caption text-faint">Guardando…</p>
        ) : (
          <div className="gem-panel-sm [--edge:#E8636F] [--fill:#4A1C26] p-4 space-y-4 text-left" role="alert">
            <p className="text-body-sm text-ink">No pudimos guardar el intento. Tu tiempo sigue acá.</p>
            <button type="button" className="nx-btn nx-btn-secondary" onClick={() => enviar()}>Reintentar</button>
          </div>
        )}
      </div>
    )
  }

  if (fase === 'rechazado') {
    return (
      <div className="space-y-4 pt-10">
        <div className="gem-panel-sm [--edge:#E8636F] [--fill:#4A1C26] p-4 space-y-4" role="alert">
          <p className="text-body-sm text-ink">Ese intento ya no se puede guardar. La fecha se cerró o se empezó otro intento.</p>
          <Link to="/" className="nx-btn nx-btn-secondary">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  // resultado
  return (
    <Resultado
      ultimo={ultimo}
      intentos={intentos}
      menor={menor}
      error={error}
      onOtro={pedir}
    />
  )
}

function CuentaRegresiva({ onFin }) {
  const [n, setN] = useState(3)
  useEffect(() => {
    if (n === 0) return onFin()
    const t = setTimeout(() => setN(n - 1), 1000)
    return () => clearTimeout(t)
  }, [n])
  return (
    <div className="flex aspect-square w-full items-center justify-center" role="status" aria-live="assertive">
      <span key={n} className="font-display text-8xl font-black tabular-nums text-ink">{n || ''}</span>
    </div>
  )
}

function Resultado({ ultimo, intentos, menor, error, onOtro }) {
  const valido = ultimo.estado === 'completado'
  const k = ultimo.numero
  const previos = intentos.filter((i) => i.id !== ultimo.id && i.numero < k)
  const mejorPrevio = mejorDe(previos, menor)
  const r = Number(ultimo.resultado)
  // oro solo si supera un intento válido anterior (el primero no "bate" a nadie)
  const record = valido && mejorPrevio != null && (menor ? r < mejorPrevio : r > mejorPrevio)
  const mejor = mejorDe(intentos, menor)
  const d = ultimo.datos ?? {}

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="stat-label">Intento {k} de {INTENTOS}</p>
        <PuntosIntento usados={k} />
      </div>

      {valido ? (
        <div className="space-y-3 text-center">
          <ContarHasta valor={r} className={`font-display text-6xl font-black tabular-nums ${record ? 'text-gold' : 'text-ink'}`} />
          <p className="text-body-sm text-muted tabular-nums">
            {d.errores ? `${tiempo(d.tiempo_ms)} + ${d.errores} ${d.errores === 1 ? 'error' : 'errores'} × 0.1 s` : 'Sin errores'}
          </p>
          <div className="flex justify-center gap-2">
            <Chip tono="exito">Válido</Chip>
            {record && <Chip tono="oro">Tu mejor</Chip>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Chip tono="error">No válido</Chip>
          <p className="text-body text-ink">{textoDeMotivo(ultimo.motivo)}</p>
          <p className="text-caption text-faint">El intento cuenta como usado.</p>
        </div>
      )}

      <div className="space-y-3">
        {k < INTENTOS ? (
          <button type="button" className="nx-btn nx-btn-primary w-full" onClick={onOtro}>
            Jugar intento {k + 1}
          </button>
        ) : (
          <p className="text-body text-ink">
            Usaste tus {INTENTOS} intentos. Tu mejor: <span className="tabular-nums">{tiempo(mejor)}</span>.
          </p>
        )}
        {error && <p role="alert" className="text-body-sm text-ruby">{error}</p>}
        <Link to="/" className="nx-btn nx-btn-secondary w-full">Ver la tabla</Link>
      </div>
    </div>
  )
}

// Cuenta hasta el valor, se pasa un 4% y se asienta (450ms). Sin animación con movimiento reducido.
function ContarHasta({ valor, className }) {
  const reducido = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const [v, setV] = useState(reducido ? valor : 0)
  useEffect(() => {
    if (reducido) return
    let id
    const t0 = performance.now()
    const paso = (ahora) => {
      const p = Math.min(1, (ahora - t0) / 450)
      // easeOutBack: sobrepasa un poco y vuelve
      const c = 1 // ~4% de sobrepaso
      const e = 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2)
      setV(valor * e)
      if (p < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [valor])
  return <p className={className} aria-label={tiempo(valor)}>{tiempo(v)}</p>
}
