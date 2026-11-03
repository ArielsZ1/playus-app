import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cerrarFecha, crearTemporadaNexplay, getTablaProvisoria, getTorneoActual, iniciarFecha, iniciarTemporada } from '../../lib/queries'
import { Cargando, Chip, ErrorRed, ESTADO_VIEJO, codigoDeError, textoDeError } from '../componentes.jsx'
import TablaProvisoria from '../TablaProvisoria.jsx'

// Contrato de estados etapa 2, sección 5.
export default function AdminTorneo({ recargarCuenta }) {
  const [torneo, setTorneo] = useState(null)
  const [errorCarga, setErrorCarga] = useState(false)
  const [ocupado, setOcupado] = useState(null) // texto del botón en curso
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null) // línea esmeralda / neutra tras una acción
  const [confirmar, setConfirmar] = useState(false)

  const cargar = useCallback(async () => {
    setErrorCarga(false)
    try {
      setTorneo(await getTorneoActual())
    } catch (err) {
      console.error(err)
      setErrorCarga(true)
    }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function accion(textoEnCurso, fn) {
    setOcupado(textoEnCurso)
    setError(null)
    setAviso(null)
    try {
      await fn()
      await cargar()
    } catch (err) {
      console.error(err)
      const codigo = codigoDeError(err)
      if (codigo === 'solo_admin' || codigo === 'no_autenticado') return recargarCuenta()
      if (ESTADO_VIEJO.has(codigo)) cargar()
      setError(textoDeError(codigo))
    } finally {
      setOcupado(null)
    }
  }

  if (errorCarga) return <div className="pt-6"><ErrorRed onReintentar={cargar} /></div>
  if (!torneo) return <Cargando texto="Cargando el torneo…" />

  const { temporada: t, fechas, abierta } = torneo
  const cerradas = fechas.filter((f) => f.estado === 'cerrada')
  const enJuego = t && (t.estado === 'preparacion' || t.estado === 'activa' || t.estado === 'pausada')

  let contenido
  if (!enJuego) {
    contenido = (
      <NuevaTemporada
        terminada={t?.estado === 'finalizada' ? t.nombre : null}
        ocupado={ocupado}
        onCrear={(datos) => accion('Creando…', () => crearTemporadaNexplay(datos))}
      />
    )
  } else if (t.estado === 'preparacion') {
    contenido = (
      <div className="gem-panel p-6 space-y-4">
        <Encabezado t={t} />
        <p className="text-body text-muted">
          Al iniciarla se congelan las reglas: 3 intentos, 10 puntos base, 10 por rival y bonus de 5% por fecha.
        </p>
        <button type="button" className="nx-btn nx-btn-primary w-full" disabled={!!ocupado}
          onClick={() => accion('Iniciando…', () => iniciarTemporada(t.id))}>
          {ocupado ?? 'Iniciar temporada'}
        </button>
      </div>
    )
  } else if (!abierta) {
    const n = cerradas.length + 1
    contenido = (
      <div className="space-y-4">
        <div className="gem-panel p-6 space-y-4">
          <Encabezado t={t} />
          <p className="text-body text-ink">Fecha {n} de {t.cantidad_fechas}</p>
          <button type="button" className="nx-btn nx-btn-primary w-full" disabled={!!ocupado}
            onClick={() => accion('Sorteando…', async () => {
              await iniciarFecha(t.id)
              setAviso({ tono: 'neutro', salio: true })
            })}>
            {ocupado ?? `Abrir Fecha ${n}`}
          </button>
        </div>
        <ListaCerradas fechas={cerradas} />
      </div>
    )
  } else {
    contenido = (
      <div className="space-y-6">
        <div className="drop-shadow-[0_0_12px_rgba(78,127,232,0.35)]">
          <div className="gem-panel [--edge:#4E7FE8] p-6 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="stat-label">Fecha {abierta.numero_fecha} de {t.cantidad_fechas}</p>
              <Chip tono="vivo">En vivo</Chip>
            </div>
            <p className="font-display text-heading font-bold text-ink">{abierta.juego?.nombre}</p>
            <p className="text-caption text-faint">
              Abierta desde las {new Date(abierta.abierta_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <TablaProvisoria fechaId={abierta.id} menorEsMejor={abierta.juego?.menor_es_mejor ?? true} />
        <button type="button" className="nx-btn nx-btn-danger w-full" onClick={() => setConfirmar(true)}>
          Cerrar fecha
        </button>
        {confirmar && (
          <ConfirmarCierre
            fecha={abierta}
            ocupado={ocupado}
            onVolver={() => setConfirmar(false)}
            onCerrar={() => accion('Cerrando…', async () => {
              await cerrarFecha(abierta.id)
              setConfirmar(false)
              setAviso({ tono: 'exito', texto: `Fecha ${abierta.numero_fecha} cerrada. Los puntos ya están en Playus.` })
            })}
          />
        )}
        <ListaCerradas fechas={cerradas} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-heading font-bold text-ink">Torneo</h1>
        <Link to="/" className="text-body-sm text-muted hover:text-ink py-2">Volver</Link>
      </div>
      {aviso && (
        <p role="status" className={`text-body-sm ${aviso.tono === 'exito' ? 'text-emerald' : 'text-ink'}`}>
          {aviso.salio ? `Salió ${abierta?.juego?.nombre ?? 'el juego'}.` : aviso.texto}
        </p>
      )}
      {error && <p role="alert" className="text-body-sm text-ruby">{error}</p>}
      {contenido}
    </div>
  )
}

function Encabezado({ t }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <p className="stat-label">Temporada</p>
        {t.es_prueba && <Chip tono="pendiente">De prueba</Chip>}
      </div>
      <p className="truncate font-display text-heading font-bold text-ink" title={t.nombre}>{t.nombre}</p>
      <p className="text-caption text-faint">{t.cantidad_fechas} {t.cantidad_fechas === 1 ? 'fecha' : 'fechas'}</p>
    </div>
  )
}

function ListaCerradas({ fechas }) {
  if (fechas.length === 0) return null
  return (
    <ul className="gem-panel-sm divide-y divide-line">
      {fechas.map((f) => (
        <li key={f.id} className="flex h-12 items-center justify-between gap-3 px-4 text-body-sm">
          <span className="truncate text-ink">Fecha {f.numero_fecha} · {f.juego?.nombre}</span>
          <Chip tono="exito">cerrada</Chip>
        </li>
      ))}
    </ul>
  )
}

function NuevaTemporada({ terminada, ocupado, onCrear }) {
  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState(10)
  const [esPrueba, setEsPrueba] = useState(false)
  return (
    <form
      className="gem-panel p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onCrear({ nombre: nombre.trim(), cantidadFechas: Number(cantidad), esPrueba })
      }}
    >
      {terminada && <p className="text-body-sm text-muted">{terminada} terminó.</p>}
      <h2 className="stat-label">Nueva temporada</h2>
      <label className="block space-y-1">
        <span className="text-body-sm text-muted">Nombre</span>
        <input className="nx-input" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-body-sm text-muted">Cantidad de fechas (1 a 21)</span>
        <input className="nx-input tabular-nums" type="number" min={1} max={21} required
          value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </label>
      <label className="flex min-h-12 items-center gap-3 text-body text-ink">
        <input type="checkbox" className="h-5 w-5 accent-[#E8B54D]" checked={esPrueba} onChange={(e) => setEsPrueba(e.target.checked)} />
        Es de prueba (no aparece en Playus)
      </label>
      <button className="nx-btn nx-btn-primary w-full" disabled={!!ocupado}>{ocupado ?? 'Crear temporada'}</button>
    </form>
  )
}

function ConfirmarCierre({ fecha, ocupado, onVolver, onCerrar }) {
  const primero = useRef(null)
  const [jugando, setJugando] = useState(0)
  useEffect(() => {
    primero.current?.focus()
    const esc = (e) => e.key === 'Escape' && !ocupado && onVolver()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [ocupado, onVolver])
  useEffect(() => {
    getTablaProvisoria(fecha.id)
      .then((f) => setJugando(f.filter((x) => x.en_juego).length))
      .catch(() => {}) // si falla, la hoja igual sirve: solo falta el aviso
  }, [fecha.id])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => !ocupado && onVolver()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cerrar-titulo"
        className="gem-panel w-full max-w-[480px] p-6 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cerrar-titulo" className="font-display text-heading font-bold text-ink">¿Cerrar la Fecha {fecha.numero_fecha}?</h2>
        <p className="text-body text-muted">Se calculan los puntos y pasan a Playus. No se puede deshacer.</p>
        {jugando > 0 && (
          <p className="text-body-sm text-ruby">
            {jugando} jugando ahora: ese intento no va a contar.
          </p>
        )}
        <button ref={primero} type="button" className="nx-btn nx-btn-secondary w-full" disabled={!!ocupado} onClick={onVolver}>
          Volver
        </button>
        <button type="button" className="nx-btn nx-btn-danger w-full" disabled={!!ocupado} onClick={onCerrar}>
          {ocupado ?? 'Cerrar fecha'}
        </button>
      </div>
    </div>
  )
}
