import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getMiFecha, getMiRevancha, getMisIntentos, getTorneoActual } from '../../lib/queries'
import {
  Cargando, Chip, ErrorRed, HojaInferior, cuenta as cuentaIntento, delIntento, mejorDe, nombreVisible, subirPendiente,
  textoDeError, textoDeMotivo, tiempo, useAhora, useCadaDiezSegundos,
} from '../componentes.jsx'
import { leerPendiente } from '../pendiente.js'
import { diaAR, horaAR, proximaApertura, restante } from '../reloj.js'
import TablaProvisoria from '../TablaProvisoria.jsx'

const HORA = 3600000
const ESPERA = 'Primero enviamos tu resultado guardado.'

// Contrato de estados etapa 3, secciones 1, 3.2, 4.1 y 5 (lo que no cambia, como en la etapa 2).
export default function Inicio({ cuenta }) {
  const nombre = nombreVisible(cuenta)
  const jugadorId = cuenta.jugador_id
  const location = useLocation()
  const navigate = useNavigate()
  const [aviso, setAviso] = useState(location.state?.aviso ?? null) // texto que trae Jugar al volver
  const [datos, setDatos] = useState(null) // { torneo, mi, intentos, revancha, rev: { fecha, intentos } }
  const [errorCarga, setErrorCarga] = useState(false)
  const [recienCerrada, setRecienCerrada] = useState(null)
  const [pend, setPend] = useState(null) // { fase: enviando|sin_conexion|llego|rechazado, p, texto, tono }
  const abiertaAntes = useRef(null)
  const enviando = useRef(false)

  const cargar = useCallback(async (silencioso = false) => {
    try {
      const torneo = await getTorneoActual()
      const { abierta, ultimaCerrada } = torneo
      const [mi, intentos, revancha] = jugadorId
        ? await Promise.all([
            abierta ? getMiFecha(abierta.id) : null,
            abierta ? getMisIntentos(abierta.id, jugadorId) : [],
            getMiRevancha(),
          ])
        : [null, [], null]
      // la fecha de la revancha: la que trae el servidor o, si ya no la trae, la última cerrada en sus 24 h
      const revFecha = revancha
        ? { id: revancha.fecha_id, numero_fecha: revancha.numero_fecha, cerrada_en: torneo.fechas.find((f) => f.id === revancha.fecha_id)?.cerrada_en }
        : ultimaCerrada && Date.now() < new Date(ultimaCerrada.cerrada_en).getTime() + 24 * HORA ? ultimaCerrada : null
      const revIntentos = jugadorId && revFecha ? await getMisIntentos(revFecha.id, jugadorId) : []
      if (abiertaAntes.current && !abierta) setRecienCerrada(abiertaAntes.current)
      abiertaAntes.current = abierta?.numero_fecha ?? null
      setDatos({ torneo, mi, intentos, revancha, rev: { fecha: revFecha, intentos: revIntentos } })
      setErrorCarga(false)
      return torneo
    } catch (err) {
      console.error(err)
      if (!silencioso) setErrorCarga(true) // en el refresco se queda lo último
      return null
    }
  }, [jugadorId])

  // Lo pendiente va primero (regla 0): se manda al abrir, con el evento online, en cada refresco y con "Reintentar ahora".
  const enviarGuardado = useCallback(async () => {
    const p = leerPendiente()
    if (!p || enviando.current) return
    enviando.current = true
    setPend({ fase: 'enviando', p })
    const r = await subirPendiente(p)
    enviando.current = false
    if (r.estado === 'reintentar') return setPend({ fase: 'sin_conexion', p })
    if (r.estado === 'descartado') {
      setPend({ fase: 'rechazado', p, texto: textoDeError(r.codigo, { revancha: p.tipo === 'revancha' }) })
      return cargar(true)
    }
    const t = await cargar(true)
    const f = r.fila
    const tarde = p.tipo === 'intento' && t && t.abierta?.id !== p.fecha_id
    if (f.estado !== 'completado') {
      setPend({ fase: 'llego', p, tono: 'error', texto: `Tu resultado ${delIntento(p)} llegó, pero no es válido: ${textoDeMotivo(f.motivo)}` })
    } else if (tarde) {
      setPend({ fase: 'llego', p, tono: 'exito', texto: `Llegó a tiempo: tu ${tiempo(f.resultado)} cuenta para la Fecha ${p.numero_fecha}.` })
    } else {
      setPend({ fase: 'llego', p, tono: 'exito', texto: `Tu resultado ${delIntento(p)} llegó: ${tiempo(f.resultado)}.` })
    }
  }, [cargar])

  useEffect(() => {
    enviarGuardado()
    cargar()
    window.addEventListener('online', enviarGuardado)
    return () => window.removeEventListener('online', enviarGuardado)
  }, [cargar, enviarGuardado])
  const refrescar = useCallback(() => { enviarGuardado(); cargar(true) }, [cargar, enviarGuardado])
  useCadaDiezSegundos(refrescar)

  useEffect(() => {
    if (pend?.fase !== 'llego') return
    const t = setTimeout(() => setPend(null), 5000)
    return () => clearTimeout(t)
  }, [pend])

  useEffect(() => {
    if (!aviso) return
    navigate('.', { replace: true, state: null }) // que una recarga no lo repita
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  const bloqueado = pend?.fase === 'enviando' || pend?.fase === 'sin_conexion'

  let principal
  if (errorCarga) principal = <ErrorRed onReintentar={() => { setErrorCarga(false); cargar() }} />
  else if (!datos) principal = <Cargando texto="Cargando la sala…" />
  else
    principal = (
      <Sala datos={datos} jugadorId={jugadorId} recienCerrada={recienCerrada} bloqueado={bloqueado} pendienteId={pend?.p?.intento_id} />
    )

  return (
    <div className="space-y-6 pt-6">
      <h1 className="truncate font-display text-heading font-bold text-ink" title={nombre}>Hola, {nombre}</h1>
      {pend && <Pendiente pend={pend} torneo={datos?.torneo} onReintentar={enviarGuardado} onCerrar={() => setPend(null)} />}
      {aviso && <p role="status" className="text-caption text-faint">{aviso}</p>}
      {principal}
      {cuenta.es_admin && (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/admin/torneo" className="nx-btn nx-btn-secondary">Torneo</Link>
          <Link to="/admin" className="nx-btn nx-btn-secondary">Jugadores</Link>
        </div>
      )}
    </div>
  )
}

// Sección 3.2
function Pendiente({ pend, torneo, onReintentar, onCerrar }) {
  const { fase, p } = pend
  if (fase === 'llego') {
    return <p role="status" className={`text-body-sm ${pend.tono === 'exito' ? 'text-emerald' : 'text-ruby'}`}>{pend.texto}</p>
  }
  if (fase === 'rechazado') {
    return (
      <div className="gem-panel-sm [--edge:#E8636F] [--fill:#4A1C26] p-4 space-y-4" role="alert">
        <p className="text-body-sm text-ink">{pend.texto}</p>
        <button type="button" className="nx-btn nx-btn-secondary w-full" onClick={onCerrar}>Entendido</button>
      </div>
    )
  }
  if (fase === 'enviando') {
    return <p role="status" className="gem-panel-sm p-4 text-body-sm text-ink">Enviando tu resultado…</p>
  }
  const cerrada = p.tipo === 'revancha' ? null : torneo?.fechas.find((f) => f.id === p.fecha_id && f.cerrada_en)
  const plazo = p.tipo === 'revancha' ? p.termina_en : cerrada && new Date(cerrada.cerrada_en).getTime() + 2 * HORA
  return (
    <div className="gem-panel-sm p-4 space-y-3">
      <Chip tono="pendiente">Pendiente</Chip>
      <p className="text-body-sm text-ink">
        Tenés un resultado sin enviar: <span className="tabular-nums">{tiempo(p.resultado)}</span> {delIntento(p)}. Se envía
        solo cuando vuelva la conexión.
      </p>
      {plazo && <p className="text-caption text-faint">Tiene tiempo de llegar hasta las {horaAR(new Date(plazo))}.</p>}
      <button type="button" className="nx-btn nx-btn-secondary w-full" onClick={onReintentar}>Reintentar ahora</button>
    </div>
  )
}

function Sala({ datos, jugadorId, recienCerrada, bloqueado, pendienteId }) {
  const ahora = useAhora()
  const { torneo, mi, intentos, revancha, rev } = datos
  const { temporada: t, fechas, abierta, cancelada, campeones } = torneo
  const navigate = useNavigate()
  const avisoCierre = recienCerrada && !abierta && (
    <p role="status" className="text-body-sm text-emerald">
      La Fecha {recienCerrada} se cerró. Los puntos ya están en Playus.
    </p>
  )

  if (!t) {
    return <div className="gem-panel p-6"><p className="text-body text-ink">La primera temporada NEXPLAY arranca pronto.</p></div>
  }
  if (t.estado === 'preparacion') {
    return (
      <div className="gem-panel p-6 space-y-1">
        <Temporada t={t} />
        <p className="text-body text-muted">Arranca pronto. El admin la está preparando.</p>
      </div>
    )
  }

  const manual = t.es_prueba || t.reglas?.ritmo === 'maraton'
  const prox = proximaApertura(ahora)
  const cuandoAbre = `${diaAR(prox, ahora)} a las ${horaAR(prox)}`

  // Revancha (4.1): la tarjeta, o la línea de la revancha cortada
  const revCortada = !revancha && rev.fecha && rev.intentos.find((i) => i.es_revancha && i.estado === 'en_curso' && i.id !== pendienteId)
  const revancha_ = (oro) =>
    revancha ? (
      <TarjetaRevancha r={revancha} oro={oro} bloqueado={bloqueado} intentos={rev.intentos} ahora={ahora}
        onJugar={() => navigate(`/jugar?revancha=${revancha.fecha_id}`)} />
    ) : revCortada ? (
      <p className="text-caption text-faint">Tu revancha de la Fecha {rev.fecha.numero_fecha} quedó sin terminar y se perdió.</p>
    ) : null

  if (t.estado === 'finalizada') {
    return (
      <div className="space-y-6">
        {avisoCierre}
        <div className="gem-panel p-6 space-y-3">
          {campeones.length === 0 ? (
            <p className="text-body text-ink">La temporada {t.nombre} terminó sin campeón.</p>
          ) : (
            <>
              <p className="text-body text-ink">La temporada {t.nombre} terminó.</p>
              <div className="space-y-1">
                <p className="stat-label">{campeones.length === 1 ? 'Campeón' : 'Campeones'}</p>
                <p className="font-display text-heading font-bold text-gold">
                  {campeones.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && (i === campeones.length - 1 ? ' y ' : ', ')}
                      <span className="inline-block max-w-full truncate align-bottom" title={c.apodo}>{c.apodo}</span>
                    </span>
                  ))}
                </p>
                {campeones.length > 1 && (
                  <p className="text-caption text-faint">Empataron en puntos, victorias y duelos entre ellos: el título es compartido.</p>
                )}
                {campeones.length === 1 && campeones[0].id === jugadorId && <p className="text-body text-ink">Ganaste la temporada.</p>}
              </div>
            </>
          )}
          <a href="/" className="nx-btn nx-btn-secondary">Ver el ranking en Playus</a>
        </div>
        {revancha_(true)}
      </div>
    )
  }

  const cerradas = fechas.filter((f) => f.estado === 'cerrada').length
  if (!abierta) {
    const pausada = t.estado === 'pausada'
    return (
      <div className="space-y-6">
        {avisoCierre}
        <div className="gem-panel p-6 space-y-2">
          {pausada && <Chip tono="pendiente">Pausada</Chip>}
          <Temporada t={t} />
          <p className="stat-label">Fecha {cerradas + 1} de {t.cantidad_fechas}</p>
          <p className="text-body text-muted">
            {pausada
              ? 'La temporada está en pausa. La próxima fecha se abre cuando el admin la reanude.'
              : manual
                ? 'Esperando que el admin abra la próxima fecha.'
                : `Próxima fecha: ${cuandoAbre}.`}
          </p>
          {cancelada && (
            <p className="text-body-sm text-muted">
              El admin canceló la Fecha {cancelada.numero_fecha}. No reparte puntos y se vuelve a jugar con el mismo número{' '}
              {manual || pausada ? 'cuando el admin la abra' : cuandoAbre}.
            </p>
          )}
          {cerradas > 0 && (
            <a href="/" className="inline-block py-2 text-body-sm text-muted underline hover:text-ink">
              Mirá cómo va el ranking en Playus.
            </a>
          )}
        </div>
        {revancha_(true)}
      </div>
    )
  }

  // Fecha abierta (sección 1)
  const menor = abierta.juego?.menor_es_mejor ?? true
  const max = mi?.intentos_max
  const contables = intentos.filter(cuentaIntento)
  const usados = mi?.usados ?? contables.length
  const mejor = mejorDe(intentos, menor)
  const sinIntentos = mi && usados >= max
  // Un intento en_curso con resultado guardado en el celu no está cortado: se envía (1.3)
  const cortado = contables.find((i) => i.estado === 'en_curso' && i.id !== pendienteId)
  const conColchon = cortado && cortado.numero <= 2 && mi?.practica === 'disponible'
  const salvado = intentos.find((i) => i.motivo === 'colchon')
  const practicaCortada = intentos.some(
    (i) => i.numero === 0 && ((i.estado === 'en_curso' && i.id !== pendienteId) || i.motivo === 'abandonado'),
  )
  const k = conColchon ? cortado.numero : usados + 1
  const cierre = proximaApertura(new Date(abierta.abierta_en))
  const falta = cierre - ahora
  const cerrando = !manual && falta <= 0
  const hayOro = jugadorId && mi && !sinIntentos

  let lineaPractica = null
  if (mi && !sinIntentos && !practicaCortada) {
    if (mi.practica === 'disponible' && !cortado) lineaPractica = 'No cuenta para nada. La podés jugar hasta que empieces el intento 2.'
    else if (mi.practica === 'usada' && !mi.colchon_usado) lineaPractica = 'Ya usaste la práctica.'
    else if (mi.practica === 'cerrada') lineaPractica = 'La práctica se cerró al empezar el intento 2.'
  }

  return (
    <div className="space-y-6">
      <div className="drop-shadow-[0_0_12px_rgba(78,127,232,0.35)]">
        <div className="gem-panel [--edge:#4E7FE8] p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="stat-label">Fecha {abierta.numero_fecha} de {t.cantidad_fechas}</p>
            <div className="flex flex-wrap gap-2">
              <Chip tono="vivo">En vivo</Chip>
              {mi?.underdog && <Chip tono="vivo" late>Underdog · {max}º intento</Chip>}
            </div>
          </div>
          <p className="font-display text-heading font-bold text-ink">{abierta.juego?.nombre}</p>
          {mi && usados > 0 && !sinIntentos ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body text-ink">
                  {mejor == null ? 'Sin intento válido todavía' : <>Tu mejor: <span className="tabular-nums">{tiempo(mejor)}</span></>}
                </p>
                <PuntosIntento usados={k - 1} total={max} underdog={mi.underdog} />
              </div>
              <p className="stat-label">Intento {k} de {max}</p>
            </div>
          ) : (
            mi && usados === 0 && <p className="text-body text-muted">{max} intentos. Cuenta el mejor.</p>
          )}
          {mi?.underdog && !sinIntentos && <p className="text-body-sm text-muted">Sos Underdog: tenés {max} intentos en esta fecha.</p>}
          {manual ? (
            <p className="text-caption text-faint">Abierta desde las {horaAR(new Date(abierta.abierta_en))}. La cierra el admin.</p>
          ) : cerrando ? (
            <p role="status" className="text-caption text-faint">Cerrando la fecha…</p>
          ) : (
            <div>
              <p className="stat-label">Cierra en</p>
              <p className={`font-display text-[22px] font-bold tabular-nums ${falta <= 5000 ? 'text-ruby' : 'text-ink'}`}>{restante(falta)}</p>
            </div>
          )}
          {t.estado === 'pausada' && (
            <p className="text-caption text-faint">
              La temporada está en pausa: después de esta fecha no se abre otra hasta que el admin la reanude.
            </p>
          )}
        </div>
      </div>

      {!jugadorId ? (
        <p className="text-body-sm text-muted">Vinculá tu cuenta a un jugador en Jugadores para poder jugar.</p>
      ) : (
        mi && (
          <div className="space-y-3">
            {sinIntentos ? (
              <p className="text-body text-ink">
                Usaste tus {max} intentos.{' '}
                {mejor == null ? 'Ninguno fue válido.' : <>Tu mejor: <span className="tabular-nums">{tiempo(mejor)}</span>.</>}
              </p>
            ) : (
              <button type="button" className="nx-btn nx-btn-primary w-full" disabled={bloqueado || cerrando} onClick={() => navigate('/jugar')}>
                {usados === 0 && !conColchon ? 'Jugar' : `Jugar intento ${k}`}
              </button>
            )}
            {cortado && (
              <p className="text-caption text-faint">
                {conColchon
                  ? `El intento ${k} quedó sin terminar. Te salva el colchón: lo volvés a jugar con otro tablero y se gasta la práctica.`
                  : `El intento ${cortado.numero} quedó sin terminar y cuenta como usado.`}
              </p>
            )}
            {mi.colchon_usado && salvado && <p className="text-caption text-muted">El colchón te salvó el intento {salvado.numero}.</p>}
            {practicaCortada && !sinIntentos && <p className="text-caption text-faint">La práctica quedó sin terminar y se gastó.</p>}
            {mi.practica === 'disponible' && !cortado && !sinIntentos && !practicaCortada && (
              <button type="button" className="nx-btn nx-btn-secondary w-full" disabled={bloqueado || cerrando} onClick={() => navigate('/jugar?practica=1')}>
                Práctica
              </button>
            )}
            {lineaPractica && <p className="text-caption text-faint">{lineaPractica}</p>}
            {bloqueado && !sinIntentos && <p className="text-caption text-faint">{ESPERA}</p>}
          </div>
        )
      )}

      {revancha_(!hayOro)}

      <TablaProvisoria
        fechaId={abierta.id}
        menorEsMejor={menor}
        miJugadorId={jugadorId}
        miMax={max}
        intentosMax={t.reglas?.intentos}
        intentosUnderdog={t.reglas?.intentos_underdog}
        underdogs={abierta.underdogs}
      />
    </div>
  )
}

// Sección 4.1
function TarjetaRevancha({ r, oro, bloqueado, intentos, ahora, onJugar }) {
  const [hoja, setHoja] = useState(false)
  const [destello, setDestello] = useState(false)
  const previo = useRef(r.a_superar)
  useEffect(() => {
    if (previo.current === r.a_superar) return
    previo.current = r.a_superar
    setDestello(true)
    const t = setTimeout(() => setDestello(false), 320)
    return () => clearTimeout(t)
  }, [r.a_superar])

  const termina = new Date(r.termina_en)
  const falta = termina - ahora
  const vencida = falta <= 0
  // el intento cortado por el cierre todavía se puede subir hasta 2 h después del cierre (= termina_en - 22 h)
  const cortado = intentos.find((i) => !i.es_revancha && i.estado === 'interrumpido' && i.motivo === 'fecha_cerrada')
  const avisar = cortado && ahora < termina.getTime() - 22 * HORA

  return (
    <div className="gem-panel p-6 space-y-3">
      <p className="stat-label">Revancha · Fecha {r.numero_fecha}</p>
      <p className="text-body font-semibold text-ink">{r.juego}</p>
      <p className="text-body text-ink">
        Te perdiste la Fecha {r.numero_fecha}. Tenés 1 intento para superar{' '}
        <span className={`tabular-nums transition-colors duration-300 ${destello ? 'bg-panel3' : ''}`}>{tiempo(r.a_superar)}</span>.
      </p>
      <p className="text-body-sm text-muted">
        Si lo superás, ganás los mismos puntos que el ganador y los dos quedan 1.º. Si no, no pasa nada.
      </p>
      <p className="text-caption text-faint">Sin práctica ni colchón: si se corta, se pierde.</p>
      <p className="text-caption text-faint">El número puede bajar si entra un resultado tarde u otra revancha gana antes que vos.</p>
      <div>
        <p className="stat-label">Termina en</p>
        <p className={`text-body font-semibold tabular-nums ${!vencida && falta <= 5000 ? 'text-ruby' : 'text-ink'}`}>
          {vencida ? 'Terminó' : restante(falta)}
        </p>
      </div>
      <button
        type="button"
        className={`nx-btn w-full ${oro ? 'nx-btn-primary' : 'nx-btn-secondary'}`}
        disabled={bloqueado || vencida}
        onClick={() => (avisar ? setHoja(true) : onJugar())}
      >
        Jugar revancha
      </button>
      {bloqueado && <p className="text-caption text-faint">{ESPERA}</p>}
      <HojaInferior abierta={hoja} onCerrar={() => setHoja(false)} titulo="¿Empezar la revancha?">
        <p className="text-body-sm text-muted">
          Tu intento {cortado?.numero} de la Fecha {r.numero_fecha} se cortó con el cierre. Si empezás la revancha, ese intento ya no
          se puede subir aunque lo termines.
        </p>
        <div className="space-y-3">
          <button type="button" className="nx-btn nx-btn-primary w-full" onClick={onJugar}>Empezar revancha</button>
          <button type="button" className="nx-btn nx-btn-secondary w-full" onClick={() => setHoja(false)}>Volver</button>
        </div>
      </HojaInferior>
    </div>
  )
}

function Temporada({ t }) {
  return (
    <>
      <p className="stat-label">Temporada</p>
      <p className="truncate font-display text-heading font-bold text-ink" title={t.nombre}>{t.nombre}</p>
    </>
  )
}

// usado / actual (zafiro) / libre; el 4º del Underdog va con borde zafiro hasta que se usa
export function PuntosIntento({ usados, total, underdog = false }) {
  return (
    <span className="flex gap-1.5" role="img" aria-label={`${usados} de ${total} intentos usados`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i < usados ? 'bg-faint' : i === usados ? 'bg-sapphire' : underdog && i === 3 ? 'border border-sapphire' : 'border border-line2'
          }`}
        />
      ))}
    </span>
  )
}
