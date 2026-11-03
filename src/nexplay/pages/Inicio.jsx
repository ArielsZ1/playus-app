import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMisIntentos, getTorneoActual } from '../../lib/queries'
import { Cargando, Chip, ErrorRed, mejorDe, nombreVisible, tiempo, useCadaDiezSegundos } from '../componentes.jsx'
import TablaProvisoria from '../TablaProvisoria.jsx'

const INTENTOS = 3 // reglas congeladas de la etapa 2 (sin Underdog)

// Contrato de estados etapa 2, sección 1.
export default function Inicio({ cuenta }) {
  const nombre = nombreVisible(cuenta)
  const jugadorId = cuenta.jugador_id
  const [torneo, setTorneo] = useState(null)
  const [intentos, setIntentos] = useState([])
  const [errorCarga, setErrorCarga] = useState(false)
  const [recienCerrada, setRecienCerrada] = useState(null)
  const abiertaAntes = useRef(null)

  const cargar = useCallback(async (silencioso = false) => {
    try {
      const t = await getTorneoActual()
      const mios = t.abierta && jugadorId ? await getMisIntentos(t.abierta.id, jugadorId) : []
      if (abiertaAntes.current && !t.abierta) setRecienCerrada(abiertaAntes.current)
      abiertaAntes.current = t.abierta?.numero_fecha ?? null
      setTorneo(t)
      setIntentos(mios)
      setErrorCarga(false)
    } catch (err) {
      console.error(err)
      if (!silencioso) setErrorCarga(true) // en el refresco se queda lo último
    }
  }, [jugadorId])
  useEffect(() => { cargar() }, [cargar])
  const refrescar = useCallback(() => cargar(true), [cargar])
  useCadaDiezSegundos(refrescar)

  let principal
  if (errorCarga) principal = <ErrorRed onReintentar={() => { setErrorCarga(false); cargar() }} />
  else if (!torneo) principal = <Cargando texto="Cargando la sala…" />
  else principal = <Sala torneo={torneo} intentos={intentos} jugadorId={jugadorId} recienCerrada={recienCerrada} />

  return (
    <div className="space-y-6 pt-6">
      <h1 className="truncate font-display text-heading font-bold text-ink" title={nombre}>Hola, {nombre}</h1>
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

function Sala({ torneo, intentos, jugadorId, recienCerrada }) {
  const { temporada: t, fechas, abierta } = torneo
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
  if (t.estado === 'finalizada') {
    return (
      <div className="space-y-3">
        {avisoCierre}
        <div className="gem-panel p-6 space-y-3">
          <p className="text-body text-ink">La temporada {t.nombre} terminó.</p>
          <a href="/" className="nx-btn nx-btn-secondary">Ver el ranking en Playus</a>
        </div>
      </div>
    )
  }

  const cerradas = fechas.filter((f) => f.estado === 'cerrada').length
  if (!abierta) {
    return (
      <div className="space-y-3">
        {avisoCierre}
        <div className="gem-panel p-6 space-y-2">
          <Temporada t={t} />
          <p className="stat-label">Fecha {cerradas + 1} de {t.cantidad_fechas}</p>
          <p className="text-body text-muted">Esperando que el admin abra la próxima fecha.</p>
          {cerradas > 0 && (
            <a href="/" className="inline-block py-2 text-body-sm text-muted underline hover:text-ink">
              Mirá cómo va el ranking en Playus.
            </a>
          )}
        </div>
      </div>
    )
  }

  const menor = abierta.juego?.menor_es_mejor ?? true
  const usados = intentos.length
  const mejor = mejorDe(intentos, menor)
  const colgado = intentos.find((i) => i.estado === 'en_curso')
  return (
    <div className="space-y-6">
      <div className="drop-shadow-[0_0_12px_rgba(78,127,232,0.35)]">
        <div className="gem-panel [--edge:#4E7FE8] p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="stat-label">Fecha {abierta.numero_fecha} de {t.cantidad_fechas}</p>
            <Chip tono="vivo">En vivo</Chip>
          </div>
          <p className="font-display text-heading font-bold text-ink">{abierta.juego?.nombre}</p>
          {usados === 0 ? (
            <p className="text-body text-muted">{INTENTOS} intentos. Cuenta el mejor.</p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-body text-ink">
                {mejor == null ? 'Sin intento válido todavía' : <>Tu mejor: <span className="tabular-nums">{tiempo(mejor)}</span></>}
              </p>
              <PuntosIntento usados={usados} />
            </div>
          )}
        </div>
      </div>

      {!jugadorId ? (
        <p className="text-body-sm text-muted">Vinculá tu cuenta a un jugador en Jugadores para poder jugar.</p>
      ) : usados >= INTENTOS ? (
        <p className="text-body text-ink">
          Usaste tus {INTENTOS} intentos. Tu mejor: <span className="tabular-nums">{tiempo(mejor)}</span>.
        </p>
      ) : (
        <div className="space-y-2">
          <Link to="/jugar" className="nx-btn nx-btn-primary w-full">
            {usados === 0 ? 'Jugar' : `Jugar intento ${usados + 1}`}
          </Link>
          {colgado && (
            <p className="text-caption text-faint">El intento {colgado.numero} quedó sin terminar y cuenta como usado.</p>
          )}
        </div>
      )}

      <TablaProvisoria fechaId={abierta.id} menorEsMejor={menor} miJugadorId={jugadorId} intentosMax={INTENTOS} />
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

// usado / actual (zafiro) / libre
export function PuntosIntento({ usados, total = INTENTOS }) {
  return (
    <span className="flex gap-1.5" role="img" aria-label={`${usados} de ${total} intentos usados`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i < usados ? 'bg-faint' : i === usados ? 'bg-sapphire' : 'border border-line2'
          }`}
        />
      ))}
    </span>
  )
}
