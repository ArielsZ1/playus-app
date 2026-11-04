import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  empezarIntento, empezarRevancha, getMiFecha, getMiRevancha, getMisIntentos, getNombresJuegos, getTorneoActual,
} from '../../lib/queries'
import {
  Cargando, Chip, ErrorRed, PanelAviso, codigoDeError, cuenta as cuentaIntento, mejorDe, subirPendiente, textoDeError,
  textoDeMotivo, tiempo,
} from '../componentes.jsx'
import { juegos } from '../juegos/index.js'
import { guardarPendiente, leerPendiente } from '../pendiente.js'
import Ruleta from '../Ruleta.jsx'
import { PuntosIntento } from './Inicio.jsx'

// Contrato de estados etapa 3, secciones 2, 3.1 y 4.2 (lo que no está, como en la etapa 2).
// modo: intento | practica (?practica=1) | revancha (?revancha=<fecha_id>)
// fase: cargando | error | ruleta | instrucciones | pidiendo | cuenta | jugando | enviando | pendiente | errorEnvio | rechazado | resultado
export default function Jugar({ cuenta }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const revanchaId = params.get('revancha')
  const [modo, setModo] = useState(revanchaId ? 'revancha' : params.get('practica') === '1' ? 'practica' : 'intento')
  const [fase, setFase] = useState('cargando')
  const [fecha, setFecha] = useState(null)
  const [mi, setMi] = useState(null) // nx_mi_fecha
  const [rev, setRev] = useState(null) // nx_mi_revancha
  const [intentos, setIntentos] = useState([])
  const [nombres, setNombres] = useState([])
  const [actual, setActual] = useState(null) // { intento_id, numero, semilla, modulo, tipo }
  const [envio, setEnvio] = useState(null) // { p, guardado }: el resultado terminado, en memoria y (si se pudo) en el celu
  const [ultimo, setUltimo] = useState(null) // fila de intentos que devolvió el servidor
  const [tarde, setTarde] = useState(false)
  const [error, setError] = useState(null)

  const volver = (aviso) => navigate('/', { replace: true, state: aviso ? { aviso } : null })

  async function cargar() {
    setFase('cargando')
    try {
      // Lo pendiente va primero (regla 0); si no sale, Inicio lo muestra y lo sigue intentando
      if (leerPendiente() && (await subirPendiente())?.estado === 'reintentar') return volver()
      const torneo = await getTorneoActual()
      if (!cuenta.jugador_id) return volver()
      if (modo === 'revancha') {
        const r = await getMiRevancha()
        const f = torneo.fechas.find((x) => x.id === revanchaId)
        if (!r || r.fecha_id !== revanchaId || !f) return volver(textoDeError('sin_revancha'))
        setRev(r)
        setFecha(f)
        return setFase('instrucciones') // sin ruleta: el juego ya se conoce
      }
      const { abierta } = torneo
      if (!abierta) return volver()
      const [m, mios] = await Promise.all([getMiFecha(abierta.id), getMisIntentos(abierta.id, cuenta.jugador_id)])
      if (modo === 'practica' && m.practica !== 'disponible') return volver(textoDeError('sin_practica'))
      if (modo === 'intento' && m.usados >= m.intentos_max) return volver()
      setFecha(abierta)
      setMi(m)
      setIntentos(mios)
      // la ruleta es la primera vez que se ve el juego, sea práctica o intento 1
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

  async function pedir(m = modo) {
    setError(null)
    setFase('pidiendo')
    try {
      const a = m === 'revancha' ? await empezarRevancha(rev.fecha_id) : await empezarIntento(fecha.id, { practica: m === 'practica' })
      setActual({ ...a, tipo: m })
      setFase('cuenta')
    } catch (err) {
      console.error(err)
      const codigo = codigoDeError(err)
      if (['sin_practica', 'sin_revancha', 'sin_intentos'].includes(codigo)) return volver(textoDeError(codigo, { max: mi?.intentos_max }))
      if (codigo === 'fecha_no_abierta') return volver()
      setError(textoDeError(codigo))
      setFase(ultimo ? 'resultado' : 'instrucciones')
    }
  }

  // Después de la práctica, el intento: la URL deja de decir práctica para que una recarga no vuelva a ella
  function siguienteIntento() {
    setModo('intento')
    setParams({}, { replace: true })
    pedir('intento')
  }

  async function enviar(e = envio) {
    setFase('enviando')
    const r = await subirPendiente(e.p)
    if (r.estado === 'reintentar') return setFase(e.guardado ? 'pendiente' : 'errorEnvio')
    if (r.estado === 'descartado') {
      setError(textoDeError(r.codigo, { revancha: e.p.tipo === 'revancha' }))
      return setFase('rechazado')
    }
    const fila = r.fila
    setUltimo(fila)
    if (e.p.tipo !== 'revancha') {
      // Solo alimentan "tu mejor", el próximo intento y "llegó a tiempo": si fallan, se sigue con lo que hay
      const [mios, m, t] = await Promise.all([
        getMisIntentos(fecha.id, cuenta.jugador_id).catch(() => null),
        getMiFecha(fecha.id).catch(() => null),
        e.p.tipo === 'intento' ? getTorneoActual().catch(() => null) : null,
      ])
      setIntentos(mios ?? ((prev) => [...prev.filter((i) => i.id !== fila.id), fila]))
      if (m) setMi(m)
      setTarde(Boolean(t && t.abierta?.id !== fecha.id))
    }
    setFase('resultado')
  }

  // Con el resultado guardado en el celu, al volver la conexión se manda solo
  useEffect(() => {
    if (fase !== 'pendiente') return
    const alVolver = () => enviar()
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [fase, envio])

  if (fase === 'cargando') return <Cargando texto="Preparando la fecha…" />
  if (fase === 'error') return <div className="pt-6"><ErrorRed onReintentar={cargar} /></div>
  const modulo = fecha && juegos[fecha.juego?.modulo]
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
  const menor = fecha.juego?.menor_es_mejor ?? true
  const max = mi?.intentos_max
  // Un intento cortado en el 1 o el 2 con la práctica sin usar: el colchón lo repite con el mismo número
  const cortado = intentos.filter(cuentaIntento).find((i) => i.estado === 'en_curso')
  const conColchon = cortado && cortado.numero <= 2 && mi?.practica === 'disponible'
  const k = conColchon ? cortado.numero : (mi?.usados ?? 0) + 1 // próximo intento

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
    const pidiendo = fase === 'pidiendo'
    const primera = modo === 'practica' || (modo === 'intento' && intentos.length === 0)
    const instrucciones = primera ? (
      <div className="gem-panel p-6"><Instrucciones /></div>
    ) : (
      <details className="gem-panel-sm p-4">
        <summary className="cursor-pointer text-body-sm text-muted">Ver instrucciones</summary>
        <div className="pt-4"><Instrucciones /></div>
      </details>
    )
    let encabezado, texto, boton
    if (modo === 'practica') {
      encabezado = <p className="stat-label">Práctica</p>
      texto = 'No cuenta para la tabla ni para los puntos. Si se corta, se pierde.'
      boton = 'Empezar práctica'
    } else if (modo === 'revancha') {
      encabezado = <p className="stat-label">Revancha · Fecha {rev.numero_fecha}</p>
      texto = 'Un solo intento. Si salís en medio, se pierde.'
      boton = 'Empezar revancha'
    } else {
      encabezado = (
        <>
          <p className="stat-label">Intento {k} de {max}</p>
          {mi.underdog && <div><Chip tono="vivo" late>Underdog · {max}º intento</Chip></div>}
        </>
      )
      texto = conColchon
        ? `Colchón: el intento ${k} vuelve a empezar con otro tablero.`
        : 'Si salís en medio del intento, cuenta como usado.'
      boton = `Jugar intento ${k}`
    }
    return (
      <div className="space-y-6 pt-6">
        <div className="space-y-1">
          {encabezado}
          <h1 className="font-display text-heading font-bold text-ink">{fecha.juego.nombre}</h1>
          {modo === 'intento' && k > 1 && (
            <p className="text-body text-muted">Tu mejor: <span className="tabular-nums">{tiempo(mejorDe(intentos, menor))}</span></p>
          )}
          {modo === 'revancha' && (
            <p className="pt-2 text-heading font-semibold tabular-nums text-ink">A superar: {tiempo(rev.a_superar)}</p>
          )}
        </div>
        {instrucciones}
        <div className="space-y-2">
          <button type="button" className="nx-btn nx-btn-primary w-full" disabled={pidiendo} onClick={() => pedir()}>
            {pidiendo ? 'Preparando…' : boton}
          </button>
          {error && <p role="alert" className="text-body-sm text-ruby">{error}</p>}
          <p className="text-caption text-faint">{texto}</p>
        </div>
      </div>
    )
  }

  if (fase === 'cuenta') return <CuentaRegresiva onFin={() => setFase('jugando')} />

  if (fase === 'jugando') {
    return (
      <div className="space-y-2 pt-2">
        {actual.tipo === 'revancha' && <p className="text-caption text-faint tabular-nums">A superar {tiempo(rev.a_superar)}</p>}
        <Juego
          semilla={actual.semilla}
          onTerminar={({ resultado, datos_del_intento }) => {
            // se guarda en el celu ANTES de mandarlo (sección 3)
            const p = {
              intento_id: actual.intento_id, resultado, datos: datos_del_intento, fecha_id: fecha.id,
              jugador_id: cuenta.jugador_id, numero: actual.numero, tipo: actual.tipo, numero_fecha: fecha.numero_fecha,
              termina_en: rev?.termina_en,
            }
            const e = { p, guardado: guardarPendiente(p) }
            setEnvio(e)
            enviar(e)
          }}
        />
      </div>
    )
  }

  if (fase === 'enviando' || fase === 'pendiente' || fase === 'errorEnvio') {
    return (
      <div className="space-y-6 pt-10 text-center">
        <p className="font-display text-5xl font-black tabular-nums text-ink">{tiempo(envio.p.resultado)}</p>
        {fase === 'enviando' && <p role="status" className="text-caption text-faint">Guardando…</p>}
        {fase === 'pendiente' && (
          <div className="gem-panel-sm p-4 space-y-4 text-left">
            <Chip tono="pendiente">Pendiente</Chip>
            <p className="text-body-sm text-ink">Tu resultado quedó guardado en este celu. Se envía solo cuando vuelva la conexión.</p>
            <div className="space-y-3">
              <button type="button" className="nx-btn nx-btn-secondary w-full" onClick={() => enviar()}>Reintentar ahora</button>
              <Link to="/" className="nx-btn nx-btn-secondary w-full">Volver al inicio</Link>
            </div>
          </div>
        )}
        {fase === 'errorEnvio' && (
          <div className="gem-panel-sm [--edge:#E8636F] [--fill:#4A1C26] p-4 space-y-4 text-left" role="alert">
            <p className="text-body-sm text-ink">No pudimos guardar el intento. Tu tiempo sigue acá. No cierres esta pestaña.</p>
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
          <p className="text-body-sm text-ink">{error}</p>
          <Link to="/" className="nx-btn nx-btn-secondary">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  // resultado
  const props = { ultimo, menor, error }
  if (actual.tipo === 'revancha') return <ResultadoRevancha {...props} rev={rev} />
  if (actual.tipo === 'practica') return <ResultadoPractica {...props} mi={mi} onOtro={siguienteIntento} />
  return <Resultado {...props} intentos={intentos} mi={mi} tarde={tarde} numeroFecha={fecha.numero_fecha} onOtro={() => pedir()} />
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

function Detalle({ ultimo }) {
  const d = ultimo.datos ?? {}
  return (
    <p className="text-body-sm text-muted tabular-nums">
      {d.errores ? `${tiempo(d.tiempo_ms)} + ${d.errores} ${d.errores === 1 ? 'error' : 'errores'} × 0.1 s` : 'Sin errores'}
    </p>
  )
}

function Resultado({ ultimo, intentos, mi, menor, tarde, numeroFecha, error, onOtro }) {
  const valido = ultimo.estado === 'completado'
  const k = ultimo.numero
  const max = mi?.intentos_max ?? k
  const previos = intentos.filter((i) => i.id !== ultimo.id && i.numero < k)
  const mejorPrevio = mejorDe(previos, menor)
  const r = Number(ultimo.resultado)
  // oro solo si supera un intento válido anterior (el primero no "bate" a nadie)
  const record = valido && mejorPrevio != null && (menor ? r < mejorPrevio : r > mejorPrevio)
  const mejor = mejorDe(intentos, menor)
  const siguiente = (mi?.usados ?? k) + 1

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="stat-label">Intento {k} de {max}</p>
        <PuntosIntento usados={k} total={max} underdog={mi?.underdog} />
      </div>

      {valido ? (
        <div className="space-y-3 text-center">
          <ContarHasta valor={r} className={`font-display text-6xl font-black tabular-nums ${record ? 'text-gold' : 'text-ink'}`} />
          <Detalle ultimo={ultimo} />
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
      {tarde && <p className="text-body-sm text-emerald">Llegó a tiempo: cuenta para la Fecha {numeroFecha}. La tabla se recalculó.</p>}

      <div className="space-y-3">
        {tarde ? null : siguiente <= max ? (
          <button type="button" className="nx-btn nx-btn-primary w-full" onClick={onOtro}>
            Jugar intento {siguiente}
          </button>
        ) : (
          <p className="text-body text-ink">
            Usaste tus {max} intentos.{' '}
            {mejor == null ? 'Ninguno fue válido.' : <>Tu mejor: <span className="tabular-nums">{tiempo(mejor)}</span>.</>}
          </p>
        )}
        {error && <p role="alert" className="text-body-sm text-ruby">{error}</p>}
        <Link to="/" className="nx-btn nx-btn-secondary w-full">Ver la tabla</Link>
      </div>
    </div>
  )
}

// Sección 2: el tiempo de la práctica nunca va en oro (no es una marca)
function ResultadoPractica({ ultimo, mi, error, onOtro }) {
  const valido = ultimo.estado === 'completado'
  const siguiente = (mi?.usados ?? 0) + 1
  return (
    <div className="space-y-6 pt-6">
      <p className="stat-label">Práctica</p>
      {valido ? (
        <div className="space-y-3 text-center">
          <ContarHasta valor={Number(ultimo.resultado)} className="font-display text-6xl font-black tabular-nums text-ink" />
          <Detalle ultimo={ultimo} />
          <div className="flex justify-center"><Chip tono="exito">Válido</Chip></div>
          <p className="text-caption text-faint">No cuenta para la tabla.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Chip tono="error">Fallado</Chip>
          <p className="text-body text-ink">{textoDeMotivo(ultimo.motivo)}</p>
          <p className="text-caption text-faint">Igual no contaba.</p>
        </div>
      )}
      <div className="space-y-3">
        {mi && siguiente <= mi.intentos_max && (
          <button type="button" className="nx-btn nx-btn-primary w-full" onClick={onOtro}>Jugar intento {siguiente}</button>
        )}
        {error && <p role="alert" className="text-body-sm text-ruby">{error}</p>}
        <Link to="/" className="nx-btn nx-btn-secondary w-full">Ver la tabla</Link>
      </div>
    </div>
  )
}

// Sección 4.2
function ResultadoRevancha({ ultimo, rev }) {
  const valido = ultimo.estado === 'completado'
  const ganada = ultimo.motivo === 'revancha_ganada'
  const [brillo, setBrillo] = useState(ganada)
  useEffect(() => {
    if (!brillo) return
    const t = setTimeout(() => setBrillo(false), 2000)
    return () => clearTimeout(t)
  }, [])
  const aSuperar = tiempo(rev.a_superar)
  return (
    <div className="space-y-6 pt-6">
      <p className="stat-label">Revancha · Fecha {rev.numero_fecha}</p>
      {valido ? (
        <div className="space-y-3 text-center">
          <div className={`transition-[filter] duration-700 ${brillo ? 'drop-shadow-[0_0_16px_rgba(232,181,77,0.55)]' : ''}`}>
            <ContarHasta valor={Number(ultimo.resultado)} className={`font-display text-6xl font-black tabular-nums ${ganada ? 'text-gold' : 'text-ink'}`} />
          </div>
          <Detalle ultimo={ultimo} />
          {!ganada && <div className="flex justify-center"><Chip tono="exito">Válido</Chip></div>}
          <p className="text-body text-ink">
            {ganada
              ? `¡Superaste ${aSuperar}! Sumás los mismos puntos que el ganador y quedás 1.º de la Fecha ${rev.numero_fecha}.`
              : `No alcanzó: había que superar ${aSuperar}. No pasa nada: tus puntos quedan como estaban.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Chip tono="error">Fallado</Chip>
          <p className="text-body text-ink">{textoDeMotivo(ultimo.motivo)}</p>
          <p className="text-caption text-faint">La revancha ya se usó.</p>
        </div>
      )}
      <Link to="/" className="nx-btn nx-btn-secondary w-full">Volver al inicio</Link>
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
