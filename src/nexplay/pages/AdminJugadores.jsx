import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { aceptarCuenta, bloquearCuenta, crearInvitacion, getCuentas, getJugadoresNexplay } from '../../lib/queries'
import { Cargando, Chip, ErrorRed, codigoDeError, nombreVisible, textoDeError } from '../componentes.jsx'

// Contrato de estados, sección 5.
export default function AdminJugadores({ cuenta, recargarCuenta }) {
  const [datos, setDatos] = useState(null) // { cuentas, jugadores }
  const [errorCarga, setErrorCarga] = useState(false)

  const cargar = useCallback(async () => {
    setErrorCarga(false)
    try {
      const [cuentas, jugadores] = await Promise.all([getCuentas(), getJugadoresNexplay()])
      setDatos({ cuentas, jugadores })
    } catch (err) {
      console.error(err)
      setErrorCarga(true)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Errores comunes a todas las acciones de la pantalla: devuelve el texto a mostrar o null.
  async function manejarError(err) {
    console.error(err)
    const codigo = codigoDeError(err)
    if (codigo === 'solo_admin' || codigo === 'no_autenticado') {
      await recargarCuenta()
      return null
    }
    if (codigo === 'cuenta_inexistente' || codigo === 'jugador_ya_vinculado') cargar()
    return textoDeError(codigo)
  }

  async function vincular(userId, eleccion) {
    await aceptarCuenta(eleccion)
    await cargar()
    // El admin vinculándose a sí mismo cambia el saludo de Inicio.
    if (userId === cuenta.user_id) await recargarCuenta()
  }

  let listas
  if (errorCarga) listas = <ErrorRed onReintentar={cargar} />
  else if (!datos) listas = <Cargando texto="Cargando jugadores…" />
  else {
    const vinculados = new Set(datos.cuentas.map((c) => c.jugador_id).filter(Boolean))
    const libres = datos.jugadores.filter((j) => !vinculados.has(j.id))
    const pendientes = datos.cuentas.filter((c) => c.estado === 'pendiente')
    const conCuenta = datos.cuentas
      .filter((c) => c.estado !== 'pendiente')
      .sort((a, b) => orden(a) - orden(b) || nombreVisible(a).localeCompare(nombreVisible(b), 'es'))
    listas = (
      <>
        <Seccion titulo="Pendientes">
          {pendientes.length === 0 ? (
            <p className="text-body-sm text-muted">No hay nadie esperando. Cuando alguien entre con tu link, aparece acá.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pendientes.map((c) => (
                <li key={c.user_id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <Identidad cuenta={c} conEmail />
                  <ElegirJugador
                    libres={libres}
                    boton="Aceptar"
                    enCursoTexto="Aceptando…"
                    onConfirmar={(eleccion) => vincular(c.user_id, { userId: c.user_id, ...eleccion })}
                    manejarError={manejarError}
                  />
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Jugadores con cuenta">
          <ul className="divide-y divide-line">
            {conCuenta.map((c) => (
              <li key={c.user_id} className="py-4 first:pt-0 last:pb-0">
                <FilaConCuenta
                  cuenta={c}
                  libres={libres}
                  onVincular={(eleccion) => vincular(c.user_id, { userId: c.user_id, ...eleccion })}
                  onBloquear={async (motivo) => { await bloquearCuenta(c.user_id, motivo); await cargar() }}
                  manejarError={manejarError}
                />
              </li>
            ))}
          </ul>
        </Seccion>
      </>
    )
  }

  return (
    <div className="space-y-6 pt-2">
      <Link to="/" className="inline-block py-2 text-body-sm text-muted hover:text-ink">← Inicio</Link>
      <h1 className="font-display text-heading font-bold text-ink">Jugadores</h1>
      <Invitar manejarError={manejarError} />
      {listas}
    </div>
  )
}

// Admin primero, después aceptadas, al final bloqueadas.
function orden(c) {
  if (c.es_admin) return 0
  return c.estado === 'bloqueado' ? 2 : 1
}

function Seccion({ titulo, children }) {
  return (
    <section className="gem-panel p-6 space-y-4">
      <h2 className="stat-label">{titulo}</h2>
      {children}
    </section>
  )
}

function Identidad({ cuenta, conEmail, apagado }) {
  const nombre = nombreVisible(cuenta)
  return (
    <div className="min-w-0">
      <p className={`truncate text-body font-semibold ${apagado ? 'text-faint' : 'text-ink'}`} title={nombre}>{nombre}</p>
      {conEmail && cuenta.email && cuenta.email !== nombre && (
        <p className="truncate text-caption text-faint" title={cuenta.email}>{cuenta.email}</p>
      )}
    </div>
  )
}

function Invitar({ manejarError }) {
  const [estado, setEstado] = useState('inicial') // inicial | generando | listo
  const [link, setLink] = useState('')
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null) // 'copiado' | 'a_mano'
  const campo = useRef(null)

  useEffect(() => {
    if (aviso !== 'copiado') return
    const t = setTimeout(() => setAviso(null), 2000)
    return () => clearTimeout(t)
  }, [aviso])

  async function generar() {
    const anterior = estado
    setEstado('generando')
    setError(null)
    setAviso(null)
    try {
      const codigo = await crearInvitacion()
      setLink(`${location.origin}/nexplay/?codigo=${codigo}`)
      setEstado('listo')
    } catch (err) {
      setError(await manejarError(err))
      setEstado(anterior)
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setAviso('copiado')
    } catch {
      campo.current?.select()
      setAviso('a_mano')
    }
  }

  return (
    <section className="gem-panel p-6 space-y-4">
      <h2 className="stat-label">Invitar</h2>
      <p className="text-body-sm text-muted">Un link sirve para varios amigos durante 7 días.</p>
      {estado === 'listo' && (
        <div className="space-y-3">
          <input
            ref={campo}
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            aria-label="Link de invitación"
            className="nx-input font-mono text-body-sm text-ellipsis"
          />
          <button type="button" className="nx-btn nx-btn-secondary" onClick={copiar}>Copiar</button>
          <p className="text-caption text-faint">Vence en 7 días</p>
          {aviso === 'a_mano' && <p className="text-caption text-muted">Copialo a mano: ya está seleccionado.</p>}
        </div>
      )}
      <button
        type="button"
        className={`nx-btn ${estado === 'listo' ? 'nx-btn-secondary' : 'nx-btn-primary'}`}
        onClick={generar}
        disabled={estado === 'generando'}
      >
        {estado === 'generando' ? 'Generando…' : estado === 'listo' ? 'Generar otro' : 'Generar link'}
      </button>
      {error && <p role="alert" className="text-caption text-ruby">{error}</p>}
      {aviso === 'copiado' && (
        <div role="status" className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-[360px] gem-panel-sm [--fill:#2E2560] px-4 py-3 text-body-sm text-ink shadow-[0_12px_32px_rgba(8,6,20,0.55)]">
          Link copiado
        </div>
      )}
    </section>
  )
}

const NUEVO = '__nuevo__'

// Select de jugador + apodo nuevo + botón. Se usa para Aceptar (pendientes) y Vincular (admin).
function ElegirJugador({ libres, boton, enCursoTexto, onConfirmar, manejarError }) {
  const [eleccion, setEleccion] = useState(libres.length ? '' : NUEVO)
  const [apodo, setApodo] = useState('')
  const [enCurso, setEnCurso] = useState(false)
  const [error, setError] = useState(null)

  // Si la lista cambió y el elegido ya no está libre, se vuelve a elegir.
  useEffect(() => {
    if (eleccion !== NUEVO && !libres.some((j) => j.id === eleccion)) setEleccion(libres.length ? '' : NUEVO)
  }, [libres, eleccion])

  async function confirmar() {
    const nuevo = eleccion === NUEVO
    if (!eleccion || (nuevo && !apodo.trim())) {
      setError(textoDeError('falta_jugador'))
      return
    }
    setEnCurso(true)
    setError(null)
    try {
      await onConfirmar(nuevo ? { apodo: apodo.trim() } : { jugadorId: eleccion })
    } catch (err) {
      setError(await manejarError(err))
      setEnCurso(false)
    }
    // Si salió bien la fila se desmonta al recargar la lista.
  }

  function cambiar(fn) {
    return (e) => { setError(null); fn(e.target.value) }
  }

  return (
    <fieldset disabled={enCurso} className="space-y-3">
      <label className="block space-y-2">
        <span className="stat-label">Jugador</span>
        <select className="nx-input" value={eleccion} onChange={cambiar(setEleccion)}>
          {libres.length > 0 && <option value="">Elegí…</option>}
          {libres.map((j) => <option key={j.id} value={j.id}>{j.apodo}</option>)}
          <option value={NUEVO}>+ Jugador nuevo</option>
        </select>
      </label>
      {eleccion === NUEVO && (
        <label className="block space-y-2">
          <span className="stat-label">Apodo</span>
          <input className="nx-input" value={apodo} onChange={cambiar(setApodo)} maxLength={40} />
        </label>
      )}
      <button type="button" className="nx-btn nx-btn-secondary" onClick={confirmar}>
        {enCurso ? enCursoTexto : boton}
      </button>
      {error && <p role="alert" className="text-caption text-ruby">{error}</p>}
    </fieldset>
  )
}

function FilaConCuenta({ cuenta, libres, onVincular, onBloquear, manejarError }) {
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [bloqueando, setBloqueando] = useState(false)
  const [error, setError] = useState(null)
  const bloqueada = cuenta.estado === 'bloqueado'

  async function confirmarBloqueo() {
    setBloqueando(true)
    setError(null)
    try {
      await onBloquear(motivo.trim())
      setPidiendoMotivo(false)
      setMotivo('')
    } catch (err) {
      // El motivo queda escrito para reintentar.
      setError(await manejarError(err))
    }
    setBloqueando(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Identidad cuenta={cuenta} apagado={bloqueada} />
        {cuenta.es_admin ? (
          <span className="nx-chip shrink-0 bg-panel2 text-muted border-line">Admin</span>
        ) : bloqueada ? (
          <span className="shrink-0"><Chip tono="error">Bloqueada</Chip></span>
        ) : (
          <span className="shrink-0"><Chip tono="exito">Aceptada</Chip></span>
        )}
      </div>

      {cuenta.es_admin && !cuenta.jugador_id && (
        <ElegirJugador libres={libres} boton="Vincular" enCursoTexto="Vinculando…" onConfirmar={onVincular} manejarError={manejarError} />
      )}

      {!cuenta.es_admin && !bloqueada && !pidiendoMotivo && (
        <button type="button" className="nx-btn nx-btn-danger" onClick={() => { setError(null); setPidiendoMotivo(true) }}>
          Bloquear
        </button>
      )}

      {pidiendoMotivo && (
        <fieldset disabled={bloqueando} className="space-y-3">
          <label className="block space-y-2">
            <span className="stat-label">Motivo</span>
            <input className="nx-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} autoFocus />
          </label>
          <button type="button" className="nx-btn nx-btn-danger" onClick={confirmarBloqueo} disabled={!motivo.trim()}>
            {bloqueando ? 'Bloqueando…' : 'Confirmar bloqueo'}
          </button>
          <button type="button" className="nx-btn nx-btn-secondary" onClick={() => { setPidiendoMotivo(false); setMotivo('') }}>
            Cancelar
          </button>
        </fieldset>
      )}
      {error && <p role="alert" className="text-caption text-ruby">{error}</p>}
    </div>
  )
}
