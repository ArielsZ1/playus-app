import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  cancelarFecha, cerrarFecha, corregirResultado, crearTemporadaNexplay, excluirJuego, getAuditoria, getIntentosFecha,
  getRuletaTemporada, getTablaProvisoria, getTorneoActual, iniciarFecha, iniciarTemporada, pausarTemporada, reanudarTemporada,
} from '../../lib/queries'
import {
  Cargando, Chip, ErrorRed, ESTADO_VIEJO, HojaInferior, MENSAJE_RED, codigoDeError, textoDeError, textoDeMotivo, tiempo, useAhora,
} from '../componentes.jsx'
import { esAutomatico, esCorregible, estadoDeIntento, fechaHoraAR, msDeSegundos, textoDeAccion } from '../admin.js'
import { diaAR, horaAR, proximaApertura, restante } from '../reloj.js'
import TablaProvisoria from '../TablaProvisoria.jsx'

const RITMOS = {
  diario: ['Diario · 22:00', 'Se abre y se cierra sola todos los días a las 22:00.'],
  maraton: ['Maratón · a mano', 'Abrís y cerrás cada fecha vos. Cuenta en Playus igual. Sin revancha.'],
}
const ritmoDe = (t) => (t.reglas?.ritmo === 'maraton' ? 'maraton' : 'diario')
// Solo las de prueba y las maratón se abren y se cierran a mano (el servidor da ritmo_diario si no).
const esManual = (t) => t.es_prueba || ritmoDe(t) === 'maraton'
const hayTexto = (s) => s.trim() !== ''
const CORTE = '[clip-path:polygon(0_8px,8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]'

// Contrato de estados etapa 3, sección 6 (lo que no está ahí, como en la sección 5 de la etapa 2).
export default function AdminTorneo({ recargarCuenta }) {
  const [torneo, setTorneo] = useState(null)
  const [errorCarga, setErrorCarga] = useState(false)
  const [ocupado, setOcupado] = useState(null) // texto del botón en curso
  const [error, setError] = useState(null) // { codigo, texto }
  const [aviso, setAviso] = useState(null) // línea tras una acción
  // 'cerrar' | 'cancelar' | 'pausar'. Cerrar la hoja con Escape a mitad no corta la acción: su error sale arriba.
  const [hoja, setHoja] = useState(null)
  const [pausaSola, setPausaSola] = useState(false)
  const [version, setVersion] = useState(0) // para volver a pedir la tabla tras una corrección

  const cargar = useCallback(async () => {
    setErrorCarga(false)
    try {
      const datos = await getTorneoActual()
      setTorneo(datos)
      const t = datos.temporada
      if (t?.estado === 'pausada') {
        // 6.3 "Pausada sola": la última acción de la auditoría para esta temporada
        const filas = await getAuditoria({ limite: 50 }).catch(() => [])
        setPausaSola(!!filas.find((f) => f.entidad_id === t.id)?.accion.endsWith('sin_juegos'))
      } else setPausaSola(false)
    } catch (err) {
      console.error(err)
      setErrorCarga(true)
    }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  // → true si salió bien
  async function accion(textoEnCurso, fn) {
    setOcupado(textoEnCurso)
    setError(null)
    setAviso(null)
    try {
      await fn()
      await cargar()
      return true
    } catch (err) {
      console.error(err)
      const codigo = codigoDeError(err)
      if (codigo === 'solo_admin' || codigo === 'no_autenticado') {
        recargarCuenta()
        return false
      }
      if (ESTADO_VIEJO.has(codigo)) {
        setHoja(null)
        cargar()
      }
      setError({ codigo, texto: textoDeError(codigo) })
      return false
    } finally {
      setOcupado(null)
    }
  }

  if (errorCarga) return <div className="pt-6"><ErrorRed onReintentar={cargar} /></div>
  if (!torneo) return <Cargando texto="Cargando el torneo…" />

  const { temporada: t, fechas, abierta } = torneo
  const cerradas = fechas.filter((f) => f.estado === 'cerrada')
  const enJuego = t && (t.estado === 'preparacion' || t.estado === 'activa' || t.estado === 'pausada')
  const errorRitmo = error?.codigo === 'ritmo_invalido'

  let contenido
  if (!enJuego) {
    contenido = (
      <NuevaTemporada
        terminada={t?.estado === 'finalizada' ? t.nombre : null}
        ocupado={ocupado}
        errorRitmo={errorRitmo ? error.texto : null}
        onCrear={(datos) => accion('Creando…', () => crearTemporadaNexplay(datos))}
      />
    )
  } else if (t.estado === 'preparacion') {
    contenido = (
      <div className="space-y-4">
        <div className="gem-panel p-6 space-y-4">
          <Encabezado t={t} />
          <p className="text-body text-muted">
            Al iniciarla se congelan las reglas: 3 intentos (4 para el Underdog) más 1 de práctica, 10 puntos base, 10 por rival y bonus de 5% por fecha.
          </p>
          {!esManual(t) && <p className="text-body-sm text-muted">La Fecha 1 se abre sola a las 22:00 después de iniciarla.</p>}
          <button type="button" className="nx-btn nx-btn-primary w-full" disabled={!!ocupado}
            onClick={() => accion('Iniciando…', () => iniciarTemporada(t.id))}>
            {ocupado ?? 'Iniciar temporada'}
          </button>
        </div>
        <JuegosRuleta temporadaId={t.id} onViejo={cargar} recargarCuenta={recargarCuenta} />
      </div>
    )
  } else {
    const manual = esManual(t)
    const pausada = t.estado === 'pausada'
    const n = cerradas.length + 1
    const prox = proximaApertura(new Date())
    contenido = (
      <div className="space-y-6">
        <div className="gem-panel p-6 space-y-4">
          <Encabezado t={t} />
          {!abierta && (
            <>
              <p className="stat-label">Fecha {n} de {t.cantidad_fechas}</p>
              {!pausada && (manual ? (
                <button type="button" className="nx-btn nx-btn-primary w-full" disabled={!!ocupado}
                  onClick={() => accion('Sorteando…', async () => {
                    await iniciarFecha(t.id)
                    setAviso({ salio: true })
                  })}>
                  {ocupado === 'Sorteando…' ? ocupado : `Abrir Fecha ${n}`}
                </button>
              ) : (
                <p className="text-body text-ink">Se abre sola {diaAR(prox)} a las {horaAR(prox)}.</p>
              ))}
            </>
          )}
          {pausada && pausaSola && <p className="text-body-sm text-amber">Se pausó sola: no quedan juegos para la ruleta.</p>}
          {pausada ? (
            <>
              {!manual && <p className="text-body-sm text-muted">Al reanudarla, la próxima fecha se abre a las 22:00.</p>}
              <button type="button" className="nx-btn nx-btn-primary w-full" disabled={!!ocupado}
                onClick={() => accion('Reanudando…', () => reanudarTemporada(t.id))}>
                {ocupado === 'Reanudando…' ? ocupado : 'Reanudar temporada'}
              </button>
            </>
          ) : (
            <button type="button" className="nx-btn nx-btn-secondary w-full" disabled={!!ocupado} onClick={() => { setError(null); setHoja('pausar') }}>
              Pausar temporada
            </button>
          )}
        </div>

        {abierta && (
          <>
            <div className="drop-shadow-[0_0_12px_rgba(78,127,232,0.35)]">
              <div className="gem-panel [--edge:#4E7FE8] p-6 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="stat-label">Fecha {abierta.numero_fecha} de {t.cantidad_fechas}</p>
                  <Chip tono="vivo" late>En vivo</Chip>
                </div>
                <p className="font-display text-heading font-bold text-ink">{abierta.juego?.nombre}</p>
                {manual ? (
                  <p className="text-caption text-faint">Abierta desde las {horaAR(new Date(abierta.abierta_en))}</p>
                ) : (
                  <CierraEn abiertaEn={abierta.abierta_en} />
                )}
              </div>
            </div>
            <TablaProvisoria key={`${abierta.id}-${version}`} fechaId={abierta.id} menorEsMejor={abierta.juego?.menor_es_mejor ?? true}
              intentosMax={t.reglas?.intentos} intentosUnderdog={t.reglas?.intentos_underdog} underdogs={abierta.underdogs} />
            {manual && (
              <button type="button" className="nx-btn nx-btn-danger w-full" disabled={!!ocupado} onClick={() => { setError(null); setHoja('cerrar') }}>
                Cerrar fecha
              </button>
            )}
            <details className="gem-panel-sm">
              <summary className="flex min-h-12 cursor-pointer items-center px-4 text-body-sm text-ink">Intentos</summary>
              <Intentos fecha={abierta} recargarCuenta={recargarCuenta} onCorregido={() => setVersion((v) => v + 1)} />
            </details>
            <button type="button" className="nx-btn nx-btn-secondary w-full" disabled={!!ocupado} onClick={() => { setError(null); setHoja('cancelar') }}>
              Cancelar fecha
            </button>
          </>
        )}
        <ListaCerradas fechas={cerradas} recargarCuenta={recargarCuenta} />

        {hoja === 'cerrar' && abierta && (
          <ConfirmarCierre
            fecha={abierta}
            ocupado={ocupado}
            onVolver={() => setHoja(null)}
            onCerrar={() => accion('Cerrando…', async () => {
              await cerrarFecha(abierta.id)
              setHoja(null)
              setAviso({ tono: 'exito', texto: `Fecha ${abierta.numero_fecha} cerrada. Los puntos ya están en Playus.` })
            })}
          />
        )}
        {hoja === 'cancelar' && abierta && (
          <HojaCancelar
            fecha={abierta}
            manual={manual}
            ocupado={ocupado}
            error={error?.texto}
            onVolver={() => setHoja(null)}
            onCancelar={(motivo) => accion('Cancelando…', async () => {
              await cancelarFecha(abierta.id, motivo)
              setHoja(null)
              setAviso({ tono: 'suave', texto: `Fecha ${abierta.numero_fecha} cancelada.` })
            })}
          />
        )}
        {hoja === 'pausar' && (
          <HojaMotivo
            titulo={`¿Pausar ${t.nombre}?`}
            texto="No se abren fechas nuevas hasta que la reanudes. La fecha abierta sigue y se cierra normal, y las revanchas también siguen."
            boton="Pausar"
            claseBoton="nx-btn-secondary border-amber"
            enCurso="Pausando…"
            ocupado={ocupado}
            error={error?.texto}
            onVolver={() => setHoja(null)}
            onConfirmar={(motivo) => accion('Pausando…', async () => {
              await pausarTemporada(t.id, motivo)
              setHoja(null)
            })}
          />
        )}
      </div>
    )
  }

  const tonoAviso = { exito: 'text-emerald', suave: 'text-muted' }
  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-heading font-bold text-ink">Torneo</h1>
        <Link to="/" className="text-body-sm text-muted hover:text-ink py-2">Volver</Link>
      </div>
      {aviso && (
        <p role="status" className={`text-body-sm ${tonoAviso[aviso.tono] ?? 'text-ink'}`}>
          {aviso.salio ? `Salió ${abierta?.juego?.nombre ?? 'el juego'}.` : aviso.texto}
        </p>
      )}
      {error && !errorRitmo && <p role="alert" className="text-body-sm text-ruby">{error.texto}</p>}
      {contenido}
      <Auditoria recargarCuenta={recargarCuenta} />
    </div>
  )
}

function Encabezado({ t }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="stat-label">Temporada</p>
        {t.es_prueba && <Chip tono="pendiente">De prueba</Chip>}
        {t.estado === 'pausada' && <Chip tono="pendiente">Pausada</Chip>}
      </div>
      <p className="truncate font-display text-heading font-bold text-ink" title={t.nombre}>{t.nombre}</p>
      <p className="text-caption text-faint">
        {t.cantidad_fechas} {t.cantidad_fechas === 1 ? 'fecha' : 'fechas'} · {RITMOS[ritmoDe(t)][0]}
      </p>
    </div>
  )
}

// Fecha diaria real abierta: CIERRA EN (contrato §0), con su propio reloj para no redibujar toda la pantalla.
function CierraEn({ abiertaEn }) {
  const ahora = useAhora()
  const falta = proximaApertura(new Date(abiertaEn)) - ahora
  if (falta <= 0) return <p className="text-caption text-faint">Cerrando la fecha…</p>
  return (
    <div>
      <p className="stat-label">Cierra en</p>
      <p className={`font-display text-[22px] font-bold tabular-nums ${falta <= 5000 ? 'text-ruby' : 'text-ink'}`}>{restante(falta)}</p>
    </div>
  )
}

function ListaCerradas({ fechas, recargarCuenta }) {
  if (fechas.length === 0) return null
  return (
    <ul className="gem-panel-sm divide-y divide-line">
      {fechas.map((f) => (
        <li key={f.id}>
          <div className="flex h-12 items-center justify-between gap-3 px-4 text-body-sm">
            <span className="truncate text-ink">Fecha {f.numero_fecha} · {f.juego?.nombre}</span>
            <Chip tono="exito">cerrada</Chip>
          </div>
          <details>
            <summary className="flex min-h-12 cursor-pointer items-center px-4 text-body-sm text-muted">Intentos</summary>
            <Intentos fecha={f} recargarCuenta={recargarCuenta} />
          </details>
        </li>
      ))}
    </ul>
  )
}

// 6.5: se monta recién cuando se abre su <details>
function Intentos({ fecha, recargarCuenta, onCorregido }) {
  const [filas, setFilas] = useState(null)
  const [fallo, setFallo] = useState(false)
  const [editando, setEditando] = useState(null) // id
  const [guardando, setGuardando] = useState(false)
  const [errorFila, setErrorFila] = useState(null) // { id, texto }
  const [exito, setExito] = useState(null)

  const cargar = useCallback(async () => {
    setFallo(false)
    try {
      setFilas(await getIntentosFecha(fecha.id))
    } catch (err) {
      console.error(err)
      setFallo(true)
    }
  }, [fecha.id])
  useEffect(() => { cargar() }, [cargar])

  async function guardar(i, ms, motivo) {
    setGuardando(true)
    setErrorFila(null)
    setExito(null)
    try {
      await corregirResultado(i.id, ms, motivo)
      setEditando(null)
      if (fecha.estado === 'cerrada') setExito(`Corregido. La Fecha ${fecha.numero_fecha} se recalculó.`)
      onCorregido?.()
      await cargar()
    } catch (err) {
      console.error(err)
      const codigo = codigoDeError(err)
      if (codigo === 'solo_admin' || codigo === 'no_autenticado') return recargarCuenta()
      if (codigo === 'no_corregible') {
        setEditando(null)
        cargar()
      }
      setErrorFila({ id: i.id, texto: textoDeError(codigo) })
    } finally {
      setGuardando(false)
    }
  }

  if (fallo) {
    return (
      <div className="space-y-3 px-4 pb-4">
        <p role="alert" className="text-body-sm text-ruby">{MENSAJE_RED}</p>
        <button type="button" className="nx-btn nx-btn-secondary" onClick={cargar}>Reintentar</button>
      </div>
    )
  }
  if (!filas) return <p role="status" className="px-4 pb-4 text-caption text-faint">Cargando intentos…</p>
  if (filas.length === 0) return <p className="px-4 pb-4 text-body-sm text-muted">Nadie jugó esta fecha.</p>

  return (
    <div className="pb-2">
      {exito && <p role="status" className="px-4 pb-2 text-body-sm text-emerald">{exito}</p>}
      <ul className="divide-y divide-line border-t border-line">
        {filas.map((i) => {
          const e = estadoDeIntento(i)
          const esta = editando === i.id
          return (
            <li key={i.id} className="space-y-2 px-4 py-3" aria-busy={esta && guardando}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-body text-ink" title={i.jugador.apodo}>{i.jugador.apodo}</span>
                <span className="shrink-0 text-caption text-faint">
                  {i.es_revancha ? 'Revancha' : i.numero === 0 ? 'Práctica' : `Intento ${i.numero}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="tabular-nums text-body text-ink">{tiempo(i.resultado)}</span>
                {e.chip === 'valido' && <Chip tono="exito">VÁLIDO</Chip>}
                {e.chip === 'fallado' && <Chip tono="error">FALLADO</Chip>}
                {e.texto && <span className="text-caption text-faint">{e.texto}</span>}
                {esCorregible(i) && !esta && (
                  <button type="button" className="nx-btn nx-btn-secondary ml-auto w-auto px-4" disabled={guardando}
                    onClick={() => { setEditando(i.id); setErrorFila(null); setExito(null) }}>
                    Corregir
                  </button>
                )}
              </div>
              {e.chip === 'fallado' && <p className="text-caption text-faint">{textoDeMotivo(e.motivo)}</p>}
              {esta && (
                <FormCorreccion guardando={guardando} onVolver={() => setEditando(null)}
                  onGuardar={(ms, motivo) => guardar(i, ms, motivo)} />
              )}
              {errorFila?.id === i.id && <p role="alert" className="text-body-sm text-ruby">{errorFila.texto}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FormCorreccion({ guardando, onVolver, onGuardar }) {
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const ms = msDeSegundos(valor)
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ms && hayTexto(motivo)) onGuardar(ms, motivo.trim()) }}>
      <label className="block space-y-1">
        <span className="text-body-sm text-muted">Tiempo nuevo (s)</span>
        <input className="nx-input tabular-nums" inputMode="decimal" autoComplete="off" placeholder="4.70" autoFocus
          disabled={guardando} value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-body-sm text-muted">Motivo</span>
        <input className="nx-input" maxLength={200} disabled={guardando} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </label>
      <button type="submit" className="nx-btn nx-btn-secondary w-full" disabled={guardando || !ms || !hayTexto(motivo)}>
        {guardando ? 'Guardando…' : 'Guardar corrección'}
      </button>
      <button type="button" className="nx-btn nx-btn-secondary w-full" disabled={guardando} onClick={onVolver}>Volver</button>
    </form>
  )
}

// Hoja inferior con motivo obligatorio (contrato §0). El botón de confirmar va primero: con el teclado abierto sigue a la vista.
function HojaMotivo({ titulo, texto, extra, boton, claseBoton, enCurso, ocupado, error, onVolver, onConfirmar }) {
  const [motivo, setMotivo] = useState('')
  return (
    <HojaInferior abierta onCerrar={onVolver} titulo={titulo}>
      <p className="text-body text-muted">{texto}</p>
      {extra}
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (hayTexto(motivo)) onConfirmar(motivo.trim()) }}>
        <label className="block space-y-1">
          <span className="text-body-sm text-muted">Motivo</span>
          <input className="nx-input" maxLength={200} required disabled={!!ocupado} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-body-sm text-ruby">{error}</p>}
        <button type="submit" className={`nx-btn w-full ${claseBoton}`} disabled={!!ocupado || !hayTexto(motivo)}>
          {ocupado === enCurso ? enCurso : boton}
        </button>
        <button type="button" className="nx-btn nx-btn-secondary w-full" disabled={!!ocupado} onClick={onVolver}>Volver</button>
      </form>
    </HojaInferior>
  )
}

function HojaCancelar({ fecha, manual, ocupado, error, onVolver, onCancelar }) {
  const [jugando, setJugando] = useState(0)
  useEffect(() => {
    getTablaProvisoria(fecha.id)
      .then((f) => setJugando(f.filter((x) => x.en_juego).length))
      .catch(() => {}) // si falla, la hoja igual sirve: solo falta el aviso
  }, [fecha.id])
  const prox = proximaApertura(new Date())
  const cuando = manual ? 'cuando la abras' : `${diaAR(prox)} a las ${horaAR(prox)}`
  return (
    <HojaMotivo
      titulo={`¿Cancelar la Fecha ${fecha.numero_fecha}?`}
      texto={`No reparte puntos y sus intentos quedan como historial. El juego vuelve a la ruleta y la fecha se repite con el mismo número y bonus ${cuando}.`}
      extra={
        <>
          {!manual && <p className="text-body text-muted">La temporada dura un día más.</p>}
          {jugando > 0 && <p className="text-body-sm text-ruby">{jugando} jugando ahora: pierden ese intento.</p>}
        </>
      }
      boton="Cancelar fecha"
      claseBoton="nx-btn-danger"
      enCurso="Cancelando…"
      ocupado={ocupado}
      error={error}
      onVolver={onVolver}
      onConfirmar={onCancelar}
    />
  )
}

// 6.2: los juegos jugables, con el interruptor "En la ruleta" (apagado = excluido)
function JuegosRuleta({ temporadaId, onViejo, recargarCuenta }) {
  const [juegos, setJuegos] = useState(null)
  const [fallo, setFallo] = useState(false)
  const [cambiando, setCambiando] = useState(null) // id
  const [errorDe, setErrorDe] = useState(null) // { id, texto }

  const cargar = useCallback(async () => {
    setFallo(false)
    try {
      setJuegos(await getRuletaTemporada(temporadaId))
    } catch (err) {
      console.error(err)
      setFallo(true)
    }
  }, [temporadaId])
  useEffect(() => { cargar() }, [cargar])

  async function cambiar(j) {
    setCambiando(j.id)
    setErrorDe(null)
    try {
      await excluirJuego(temporadaId, j.id, !j.excluido)
      setJuegos((js) => js.map((x) => (x.id === j.id ? { ...x, excluido: !j.excluido } : x)))
    } catch (err) {
      console.error(err)
      const codigo = codigoDeError(err)
      if (codigo === 'solo_admin' || codigo === 'no_autenticado') return recargarCuenta()
      setErrorDe({ id: j.id, texto: textoDeError(codigo) })
      if (ESTADO_VIEJO.has(codigo)) onViejo()
    } finally {
      setCambiando(null)
    }
  }

  return (
    <section className="gem-panel p-6 space-y-3" aria-labelledby="ruleta-titulo">
      <h2 id="ruleta-titulo" className="stat-label">Juegos de la ruleta</h2>
      {fallo ? (
        <ErrorRed onReintentar={cargar} />
      ) : !juegos ? (
        <p role="status" className="text-caption text-faint">Cargando los juegos…</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {juegos.map((j) => (
              <li key={j.id}>
                <div className="flex min-h-12 items-center justify-between gap-4">
                  <span className="min-w-0 truncate text-body text-ink" title={j.nombre}>{j.nombre}</span>
                  <Interruptor
                    encendido={!j.excluido}
                    etiqueta={`${j.nombre} en la ruleta`}
                    deshabilitado={cambiando === j.id}
                    onCambiar={() => cambiar(j)}
                  />
                </div>
                {errorDe?.id === j.id && <p role="alert" className="pb-3 text-body-sm text-ruby">{errorDe.texto}</p>}
              </li>
            ))}
          </ul>
          {juegos.length > 0 && juegos.every((j) => j.excluido) && (
            <p className="text-body-sm text-amber">Sin juegos en la ruleta, la temporada se va a pausar sola al abrir la Fecha 1.</p>
          )}
        </>
      )}
    </section>
  )
}

// DESIGN: switch 48×28 con corte. Encendido en esmeralda (no oro: el oro de la pantalla es "Iniciar temporada").
function Interruptor({ encendido, etiqueta, deshabilitado, onCambiar }) {
  return (
    <button type="button" role="switch" aria-checked={encendido} aria-label={etiqueta} disabled={deshabilitado} onClick={onCambiar}
      className="flex h-12 shrink-0 items-center gap-3 disabled:opacity-40">
      <span className="hidden text-caption text-faint min-[360px]:inline" aria-hidden="true">En la ruleta</span>
      <span className={`relative h-7 w-12 border ${CORTE} ${encendido ? 'bg-emerald border-emerald' : 'bg-panel3 border-line2'}`}>
        <span className={`absolute top-[3px] h-5 w-5 transition-[left] duration-150 motion-reduce:transition-none [clip-path:polygon(0_4px,4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%)] ${
          encendido ? 'left-[23px] bg-base' : 'left-[3px] bg-faint'}`} />
      </span>
    </button>
  )
}

// 6.6: se pide recién al abrir el <details>
function Auditoria({ recargarCuenta }) {
  const [abierta, setAbierta] = useState(false)
  const [filas, setFilas] = useState(null)
  const [fallo, setFallo] = useState(false)

  const cargar = useCallback(async () => {
    setFallo(false)
    try {
      setFilas(await getAuditoria({ limite: 50 }))
    } catch (err) {
      console.error(err)
      const codigo = codigoDeError(err)
      if (codigo === 'solo_admin' || codigo === 'no_autenticado') return recargarCuenta()
      setFallo(true)
    }
  }, [recargarCuenta])

  return (
    <details className="gem-panel p-6" onToggle={(e) => {
      const ahora = e.currentTarget.open
      setAbierta(ahora)
      if (ahora) cargar() // cada vez que se abre, lo último
    }}>
      <summary className="flex min-h-12 cursor-pointer items-center stat-label">Auditoría</summary>
      {abierta && (
        <div className="space-y-3 pt-2">
          {fallo ? (
            <ErrorRed onReintentar={cargar} />
          ) : !filas ? (
            <p role="status" className="text-caption text-faint">Cargando la auditoría…</p>
          ) : filas.length === 0 ? (
            <p className="text-body-sm text-muted">Todavía no hay acciones registradas.</p>
          ) : (
            <ul className="divide-y divide-line">
              {filas.map((f) => {
                const texto = textoDeAccion(f)
                return (
                  <li key={f.id} className="space-y-1 py-3">
                    <p className="text-caption text-faint">{fechaHoraAR(f.created_at)} · {esAutomatico(f) ? 'Automático' : 'Admin'}</p>
                    {texto
                      ? <p className="text-body text-ink">{texto}</p>
                      : <p className="break-all font-mono text-body-sm text-ink">{f.accion}</p>}
                    {f.motivo && <p className="break-words text-body text-muted">Motivo: {f.motivo}</p>}
                    {(f.antes || f.despues) && (
                      <details>
                        <summary className="flex min-h-12 cursor-pointer items-center text-body-sm text-muted">Ver antes y después</summary>
                        <pre className="whitespace-pre-wrap break-all bg-panel3 p-3 font-mono text-[12px] text-muted">
                          {JSON.stringify({ antes: f.antes, despues: f.despues }, null, 2)}
                        </pre>
                      </details>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {filas && <p className="text-caption text-faint">Se muestran las últimas 50 acciones.</p>}
        </div>
      )}
    </details>
  )
}

function NuevaTemporada({ terminada, ocupado, errorRitmo, onCrear }) {
  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState(10)
  const [esPrueba, setEsPrueba] = useState(false)
  const [ritmo, setRitmo] = useState('diario')
  return (
    <form
      className="gem-panel p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onCrear({ nombre: nombre.trim(), cantidadFechas: Number(cantidad), esPrueba, ritmo })
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
      <fieldset className="space-y-2">
        <legend className="mb-1 text-body-sm text-muted">Ritmo</legend>
        {Object.entries(RITMOS).map(([valor, [titulo, nota]]) => (
          <label key={valor} className={`flex min-h-14 cursor-pointer items-start gap-3 border px-4 py-3 ${CORTE} ${
            ritmo === valor ? 'bg-gold-subtle border-gold' : 'bg-panel2 border-line2'}`}>
            <input type="radio" name="ritmo" value={valor} checked={ritmo === valor} onChange={() => setRitmo(valor)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#E8B54D]" />
            <span className="min-w-0">
              <span className="block text-body text-ink">{titulo}</span>
              <span className="block text-caption text-faint">{nota}</span>
            </span>
          </label>
        ))}
        {esPrueba && (
          <p className="text-caption text-faint">Las temporadas de prueba se abren y se cierran a mano, con cualquier ritmo.</p>
        )}
        {errorRitmo && <p role="alert" className="text-body-sm text-ruby">{errorRitmo}</p>}
      </fieldset>
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
