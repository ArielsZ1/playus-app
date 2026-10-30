import { useEffect, useState } from 'react'
import {
  getJuegos,
  createJuego,
  updateJuego,
  getJugadores,
  createJugador,
  getFechas,
  createFecha,
  updateFecha,
  setFechaSinJugadores,
  deleteFecha,
  upsertResultados,
  deleteResultado,
  deleteResultados,
  createTemporada,
  getRecordsPorJuego,
  upsertRecordsHistoricos,
  getUltimoRecordMundial,
  getPremios,
  createPremio,
  deletePremio,
} from '../lib/queries.js'
import { participo, seJugo } from '../lib/fecha.js'
import { resolverRecord } from '../lib/records.js'

const inputClass =
  'w-full bg-panel2 border border-line px-3 py-2 text-sm focus:outline-none focus:border-gold'

// El <select> maneja strings; en la base es boolean o null
const SENTIDOS = [
  ['', 'Sin definir (el récord se guarda tal cual)'],
  ['false', 'Gana el valor más alto (puntos, niveles, %)'],
  ['true', 'Gana el valor más bajo (tiempo)'],
]
const sentidoAValor = (v) => (v === '' ? null : v === 'true')
const valorASentido = (v) => (v === null || v === undefined ? '' : String(v))

function SelectorSentido({ value, onChange }) {
  return (
    <label className="block text-xs text-muted">
      Récord histórico:
      <select className={`${inputClass} mt-1`} value={value} onChange={(e) => onChange(e.target.value)}>
        {SENTIDOS.map(([v, texto]) => (
          <option key={v} value={v}>{texto}</option>
        ))}
      </select>
    </label>
  )
}

const FECHA_VACIA = { numero_fecha: '', fecha_calendario: '', juego_id: '', bonus_porcentaje: '', record_mundial: '' }

export default function Admin({ temporadaId, temporadas, onTemporadaCreada }) {
  const [juegos, setJuegos] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [fechas, setFechas] = useState([])
  const [nuevoJugadorApodo, setNuevoJugadorApodo] = useState('')

  const [nuevoJuego, setNuevoJuego] = useState({ nombre: '', descripcion: '', menor_es_mejor: '' })
  const [mostrarNuevoJuego, setMostrarNuevoJuego] = useState(false)

  const [nuevaFecha, setNuevaFecha] = useState(FECHA_VACIA)
  const [editandoFechaId, setEditandoFechaId] = useState(null)

  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [resultados, setResultados] = useState({})
  // Récords como están en la base, para comparar contra lo que se escribe
  const [recordsGuardados, setRecordsGuardados] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensajeEstado] = useState(null)
  const setMensaje = (texto, error = false) => setMensajeEstado(texto ? { texto, error } : null)

  // Envuelve un handler para que cualquier error de Supabase se muestre en vez de perderse.
  const conError =
    (handler) =>
    async (...args) => {
      try {
        await handler(...args)
      } catch (err) {
        setMensaje(`Error: ${err.message}`, true)
      }
    }

  const [nuevaTemporada, setNuevaTemporada] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '' })

  const [premios, setPremios] = useState([])
  const [nuevoPremio, setNuevoPremio] = useState({ nombre: '', descripcion: '', jugador_id: '' })

  async function cargarBase() {
    const [j, jg, f, p] = await Promise.all([
      getJuegos(),
      getJugadores(),
      temporadaId ? getFechas(temporadaId) : Promise.resolve([]),
      temporadaId ? getPremios(temporadaId) : Promise.resolve([]),
    ])
    setJuegos(j)
    setJugadores(jg)
    setFechas(f)
    setPremios(p)
  }

  useEffect(() => {
    cargarBase().catch((err) => setMensaje(`No se pudieron cargar los datos: ${err.message}`, true))
  }, [temporadaId])

  useEffect(() => {
    async function inicializar() {
      const base = {}
      jugadores.forEach((j) => {
        base[j.id] = {
          performance: '',
          record_historico: '',
          rivales_superados: 0,
          gemas: 0,
          jugo: true,
          sancionado: false,
          nota: '',
        }
      })

      const fechaObj = fechas.find((f) => String(f.id) === String(fechaSeleccionada))
      if (fechaObj) {
        const historicos = await getRecordsPorJuego(fechaObj.juego_id)
        setRecordsGuardados(historicos)
        Object.keys(base).forEach((jugadorId) => {
          if (historicos[jugadorId]) base[jugadorId].record_historico = historicos[jugadorId]
        })

        const existentes = fechaObj.resultados
        if (existentes) {
          existentes.forEach((r) => {
            if (base[r.jugador_id]) {
              base[r.jugador_id] = {
                ...base[r.jugador_id],
                performance: r.performance || '',
                rivales_superados: r.rivales_superados,
                gemas: r.gemas,
                jugo: r.jugo,
                sancionado: r.sancionado,
                nota: r.nota || '',
              }
            }
          })
        }
      }
      setResultados(base)
    }
    if (fechaSeleccionada) inicializar()
  }, [fechaSeleccionada, jugadores, fechas])

  useEffect(() => {
    // Si el juego elegido ya tuvo un récord mundial cargado en otra fecha,
    // lo traemos solo (no pisa lo que ya hayas escrito a mano).
    async function autocompletarRecordMundial() {
      if (!nuevaFecha.juego_id || nuevaFecha.record_mundial) return
      const ultimo = await getUltimoRecordMundial(nuevaFecha.juego_id)
      if (ultimo) setNuevaFecha((prev) => ({ ...prev, record_mundial: ultimo }))
    }
    autocompletarRecordMundial()
  }, [nuevaFecha.juego_id])

  const handleCrearJuego = conError(async (e) => {
    e.preventDefault()
    const creado = await createJuego({ ...nuevoJuego, menor_es_mejor: sentidoAValor(nuevoJuego.menor_es_mejor) })
    setJuegos((prev) => [...prev, creado])
    setNuevaFecha((prev) => ({ ...prev, juego_id: creado.id }))
    setNuevoJuego({ nombre: '', descripcion: '', menor_es_mejor: '' })
    setMostrarNuevoJuego(false)
  })

  const handleGuardarFecha = conError(async (e) => {
    e.preventDefault()
    setMensaje(null)
    const numeroFecha = Number(nuevaFecha.numero_fecha)
    const bonus = nuevaFecha.bonus_porcentaje === '' ? null : Number(nuevaFecha.bonus_porcentaje)
    if (!Number.isInteger(numeroFecha) || numeroFecha < 1) {
      setMensaje('El número de fecha debe ser un entero positivo.', true)
      return
    }
    if (bonus !== null && (!Number.isFinite(bonus) || bonus < 0)) {
      setMensaje('El bonus debe ser un número mayor o igual a cero.', true)
      return
    }
    if (!nuevaFecha.juego_id) {
      setMensaje('Elegí un juego para la fecha.', true)
      return
    }
    const payload = {
      temporada_id: temporadaId,
      numero_fecha: numeroFecha,
      fecha_calendario: nuevaFecha.fecha_calendario,
      juego_id: nuevaFecha.juego_id,
      bonus_porcentaje: bonus,
      record_mundial: nuevaFecha.record_mundial,
    }

    let resultado
    if (editandoFechaId) {
      resultado = await updateFecha(editandoFechaId, payload)
      setFechas((prev) => prev.map((f) => (f.id === editandoFechaId ? { ...f, ...resultado, juego: juegos.find((j) => j.id === resultado.juego_id) } : f)))
      setMensaje('Fecha actualizada.')
    } else {
      resultado = await createFecha(payload)
      setFechas((prev) => [...prev, { ...resultado, juego: juegos.find((j) => j.id === resultado.juego_id) }])
      setMensaje('Fecha creada. Ahora cargá los resultados de cada jugador más abajo.')
    }

    setFechaSeleccionada(resultado.id)
    setNuevaFecha(FECHA_VACIA)
    setEditandoFechaId(null)
  })

  const handleCambiarSentido = conError(async (juegoId, valor) => {
    const actualizado = await updateJuego(juegoId, { menor_es_mejor: sentidoAValor(valor) })
    setJuegos((prev) => prev.map((j) => (j.id === juegoId ? actualizado : j)))
    setMensaje(`Récord de ${actualizado.nombre}: ${SENTIDOS.find(([v]) => v === valor)[1].toLowerCase()}.`)
  })

  function handleEditarFecha(fecha) {
    setEditandoFechaId(fecha.id)
    setNuevaFecha({
      numero_fecha: fecha.numero_fecha,
      fecha_calendario: fecha.fecha_calendario || '',
      juego_id: fecha.juego_id,
      bonus_porcentaje: fecha.bonus_porcentaje ?? '',
      record_mundial: fecha.record_mundial || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelarEdicion() {
    setEditandoFechaId(null)
    setNuevaFecha(FECHA_VACIA)
  }

  const handleSinJugadores = conError(async (fecha) => {
    const valor = !fecha.sin_jugadores
    await setFechaSinJugadores(fecha.id, valor)
    setFechas((prev) => prev.map((f) => (f.id === fecha.id ? { ...f, sin_jugadores: valor } : f)))
    setMensaje(valor ? `Fecha ${fecha.numero_fecha} cerrada: nadie jugó.` : `Fecha ${fecha.numero_fecha} vuelve a estar pendiente.`)
  })

  const handleBorrarFecha = conError(async (fechaId) => {
    if (!confirm('¿Seguro que querés borrar esta fecha? Se van a borrar también sus resultados.')) return
    await deleteFecha(fechaId)
    setFechas((prev) => prev.filter((f) => f.id !== fechaId))
    if (fechaSeleccionada === fechaId) setFechaSeleccionada('')
    setMensaje('Fecha borrada.')
  })

  function actualizarCampoResultado(jugadorId, campo, valor) {
    setResultados((prev) => ({
      ...prev,
      [jugadorId]: { ...prev[jugadorId], [campo]: valor },
    }))
  }

  async function handleGuardarResultados() {
    if (!fechaSeleccionada) return
    const fechaObj = fechas.find((f) => f.id === fechaSeleccionada)
    setGuardando(true)
    setMensaje(null)
    try {
      // Solo se guarda quien jugó (o tiene sanción o nota); los ausentes no generan fila
      const resultadosParaGuardar = Object.entries(resultados)
        .filter(([, r]) => participo(r) || r.sancionado || r.nota?.trim())
        .map(([jugadorId, r]) => ({
          fecha_id: fechaSeleccionada,
          jugador_id: jugadorId,
          performance: r.performance,
          rivales_superados: Number(r.rivales_superados) || 0,
          gemas: Number(r.gemas) || 0,
          jugo: participo(r),
          sancionado: r.sancionado,
          nota: r.nota || null,
        }))
      // Con el sentido del juego definido, el récord solo cambia si mejora (o si la performance lo supera)
      const juego = juegos.find((j) => j.id === fechaObj?.juego_id)
      const apodo = (id) => jugadores.find((j) => j.id === id)?.apodo
      const nuevos = []
      const rechazados = []
      const records = {}
      for (const [jugadorId, r] of Object.entries(resultados)) {
        const guardado = recordsGuardados[jugadorId]
        const { valor, estado } = resolverRecord(
          { guardado, ingresado: r.record_historico, performance: r.performance },
          juego?.menor_es_mejor,
        )
        records[jugadorId] = valor ?? ''
        if (estado === 'nuevo') nuevos.push(`${apodo(jugadorId)} (${valor})`)
        if (estado === 'rechazado') rechazados.push(`${apodo(jugadorId)}: ${r.record_historico} no supera ${valor}`)
      }
      const historicos = Object.entries(records)
        .filter(([jugadorId, valor]) => valor !== '' && valor !== recordsGuardados[jugadorId])
        .map(([jugadorId, valor]) => ({ jugador_id: jugadorId, juego_id: fechaObj.juego_id, valor }))
      // Quien tenía fila y ahora quedó vacío (se cargó por error) se borra
      const sobran = (fechaObj?.resultados || [])
        .map((r) => r.jugador_id)
        .filter((id) => !resultadosParaGuardar.some((g) => g.jugador_id === id))
      const guardados = await upsertResultados(resultadosParaGuardar)
      await deleteResultados(fechaSeleccionada, sobran)
      if (fechaObj?.juego_id) await upsertRecordsHistoricos(historicos)
      // Sin esto, al volver a abrir la fecha el formulario mostraría los datos viejos.
      setFechas((prev) => prev.map((f) => (f.id === fechaSeleccionada ? { ...f, resultados: guardados } : f)))
      setRecordsGuardados((prev) => ({ ...prev, ...Object.fromEntries(historicos.map((h) => [h.jugador_id, h.valor])) }))
      setResultados((prev) =>
        Object.fromEntries(Object.entries(prev).map(([id, r]) => [id, { ...r, record_historico: records[id] }])),
      )
      const avisos = [
        nuevos.length && `Nuevo récord histórico: ${nuevos.join(', ')}.`,
        rechazados.length && `No se cambió el récord de ${rechazados.join('; ')}.`,
      ].filter(Boolean)
      setMensaje(['Resultados guardados correctamente.', ...avisos].join(' '))
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`, true)
    } finally {
      setGuardando(false)
    }
  }

  const handleBorrarResultado = conError(async (jugadorId) => {
    if (!confirm('¿Borrar el resultado de este jugador en esta fecha?')) return
    await deleteResultado(fechaSeleccionada, jugadorId)
    // Al cambiar `fechas` el formulario se vuelve a armar desde lo guardado.
    setFechas((prev) =>
      prev.map((f) =>
        f.id === fechaSeleccionada
          ? { ...f, resultados: (f.resultados || []).filter((r) => r.jugador_id !== jugadorId) }
          : f
      )
    )
    setMensaje('Resultado borrado.')
  })

  const handleCrearTemporada = conError(async (e) => {
    e.preventDefault()
    const creada = await createTemporada(nuevaTemporada)
    setNuevaTemporada({ nombre: '', fecha_inicio: '', fecha_fin: '' })
    onTemporadaCreada?.(creada)
    setMensaje('Temporada creada. Seleccionala desde el menú de arriba.')
  })

  const handleCrearJugador = conError(async (e) => {
    e.preventDefault()
    const creado = await createJugador(nuevoJugadorApodo)
    setJugadores((prev) => [...prev, creado].sort((a, b) => a.apodo.localeCompare(b.apodo)))
    setNuevoJugadorApodo('')
    setMensaje('Jugador agregado.')
  })

  const handleCrearPremio = conError(async (e) => {
    e.preventDefault()
    const creado = await createPremio({ temporada_id: temporadaId, ...nuevoPremio })
    const jugador = jugadores.find((j) => j.id === creado.jugador_id)
    setPremios((prev) => [...prev, { ...creado, jugador: jugador ? { apodo: jugador.apodo } : null }])
    setNuevoPremio({ nombre: '', descripcion: '', jugador_id: '' })
    setMensaje('Premio agregado.')
  })

  const handleBorrarPremio = conError(async (id) => {
    if (!confirm('¿Borrar este premio?')) return
    await deletePremio(id)
    setPremios((prev) => prev.filter((p) => p.id !== id))
  })

  return (
    <div className="space-y-12">
      <h1 className="font-display text-3xl sm:text-4xl">Carga de datos</h1>

      {mensaje && (
        <div
          role={mensaje.error ? 'alert' : 'status'}
          className={`gem-panel-sm px-4 py-3 text-sm ${
            mensaje.error ? 'bg-ruby/10 [--edge:#D14E5A] text-[#F07A84]' : 'bg-emerald/10 [--edge:#3FAE7A] text-emerald'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <section className="gem-panel p-6">
        <h2 className="font-display text-xl mb-4">Nueva temporada</h2>
        <form onSubmit={handleCrearTemporada} className="grid sm:grid-cols-3 gap-3">
          <input
            required
            placeholder="Nombre (ej. Temporada 2)"
            className={inputClass}
            value={nuevaTemporada.nombre}
            onChange={(e) => setNuevaTemporada({ ...nuevaTemporada, nombre: e.target.value })}
          />
          <input
            type="date"
            className={inputClass}
            value={nuevaTemporada.fecha_inicio}
            onChange={(e) => setNuevaTemporada({ ...nuevaTemporada, fecha_inicio: e.target.value })}
          />
          <input
            type="date"
            className={inputClass}
            value={nuevaTemporada.fecha_fin}
            onChange={(e) => setNuevaTemporada({ ...nuevaTemporada, fecha_fin: e.target.value })}
          />
          <button className="sm:col-span-3 bg-gold text-base font-medium py-2 hover:brightness-110">
            Crear temporada
          </button>
        </form>
      </section>

      <section className="gem-panel p-6">
        <h2 className="font-display text-xl mb-4">Jugadores</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {jugadores.map((j) => (
            <span key={j.id} className="gem-panel-sm bg-panel2 px-3 py-1 text-sm">
              {j.apodo}
            </span>
          ))}
        </div>

        <form onSubmit={handleCrearJugador} className="flex gap-3">
          <input
            required
            placeholder="Apodo del nuevo jugador"
            className={inputClass}
            value={nuevoJugadorApodo}
            onChange={(e) => setNuevoJugadorApodo(e.target.value)}
          />
          <button className="bg-gold text-base font-medium px-4 hover:brightness-110 whitespace-nowrap">
            Agregar
          </button>
        </form>
      </section>

      <section className="gem-panel p-6">
        <h2 className="font-display text-xl mb-4">
          {editandoFechaId ? 'Editar fecha' : 'Nueva fecha'} — {temporadas.find((t) => t.id === temporadaId)?.nombre}
        </h2>
        <form onSubmit={handleGuardarFecha} className="grid sm:grid-cols-2 gap-3">
          <input
            required
            type="number"
            placeholder="Número de fecha"
            className={inputClass}
            value={nuevaFecha.numero_fecha}
            onChange={(e) => setNuevaFecha({ ...nuevaFecha, numero_fecha: e.target.value })}
          />
          <input
            type="date"
            className={inputClass}
            value={nuevaFecha.fecha_calendario}
            onChange={(e) => setNuevaFecha({ ...nuevaFecha, fecha_calendario: e.target.value })}
          />

          <div>
            <select
              required
              className={inputClass}
              value={nuevaFecha.juego_id}
              onChange={(e) => setNuevaFecha({ ...nuevaFecha, juego_id: e.target.value })}
            >
              <option value="">Elegir juego…</option>
              {juegos.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="text-xs text-sapphire mt-1"
              onClick={() => setMostrarNuevoJuego((v) => !v)}
            >
              + Crear un juego nuevo
            </button>
            {nuevaFecha.juego_id && (
              <div className="mt-2">
                <SelectorSentido
                  value={valorASentido(juegos.find((j) => j.id === nuevaFecha.juego_id)?.menor_es_mejor)}
                  onChange={(v) => handleCambiarSentido(nuevaFecha.juego_id, v)}
                />
              </div>
            )}
          </div>

          <input
            type="number"
            step="0.1"
            placeholder="Bonus % (informativo)"
            className={inputClass}
            value={nuevaFecha.bonus_porcentaje}
            onChange={(e) => setNuevaFecha({ ...nuevaFecha, bonus_porcentaje: e.target.value })}
          />

          <input
            placeholder="Récord mundial de esta fecha"
            className={`${inputClass} sm:col-span-2`}
            value={nuevaFecha.record_mundial}
            onChange={(e) => setNuevaFecha({ ...nuevaFecha, record_mundial: e.target.value })}
          />

          {mostrarNuevoJuego && (
            <div className="sm:col-span-2 gem-panel-sm bg-panel2 p-4 grid sm:grid-cols-2 gap-3">
              <input
                placeholder="Nombre del juego"
                className={inputClass}
                value={nuevoJuego.nombre}
                onChange={(e) => setNuevoJuego({ ...nuevoJuego, nombre: e.target.value })}
              />
              <input
                placeholder="Descripción"
                className={inputClass}
                value={nuevoJuego.descripcion}
                onChange={(e) => setNuevoJuego({ ...nuevoJuego, descripcion: e.target.value })}
              />
              <div className="sm:col-span-2">
                <SelectorSentido value={nuevoJuego.menor_es_mejor} onChange={(v) => setNuevoJuego({ ...nuevoJuego, menor_es_mejor: v })} />
              </div>
              <button
                type="button"
                onClick={handleCrearJuego}
                className="sm:col-span-2 bg-sapphire text-ink py-2 text-sm hover:brightness-110"
              >
                Guardar juego
              </button>
            </div>
          )}

          <div className="sm:col-span-2 flex gap-3">
            <button className="flex-1 bg-gold text-base font-medium py-2 hover:brightness-110">
              {editandoFechaId ? 'Guardar cambios' : 'Crear fecha'}
            </button>
            {editandoFechaId && (
              <button type="button" onClick={handleCancelarEdicion} className="px-4 text-sm text-muted hover:text-ink">
                Cancelar
              </button>
            )}
          </div>
        </form>

        {fechas.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="stat-label">Fechas cargadas</p>
            {fechas.map((f) => (
              <div key={f.id} className="flex items-center justify-between gem-panel-sm bg-panel2 px-4 py-2 text-sm">
                <span>
                  Fecha {f.numero_fecha} — {f.juego?.nombre}
                  {f.sin_jugadores && !seJugo(f) && (
                    <span className="ml-2 text-xs text-muted border border-muted px-1.5 py-0.5">nadie jugó</span>
                  )}
                  {(!f.resultados || f.resultados.length === 0) && !f.sin_jugadores && (
                    <span className="ml-2 text-xs text-gold border border-gold px-1.5 py-0.5">pendiente</span>
                  )}
                </span>
                <span className="flex gap-3">
                  {!seJugo(f) && (
                    <button onClick={() => handleSinJugadores(f)} className="text-muted hover:text-ink">
                      {f.sin_jugadores ? 'Reabrir' : 'Nadie jugó'}
                    </button>
                  )}
                  <button onClick={() => handleEditarFecha(f)} className="text-sapphire hover:brightness-125">
                    Editar
                  </button>
                  <button onClick={() => handleBorrarFecha(f.id)} className="text-ruby hover:brightness-125">
                    Borrar
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="gem-panel p-6">
        <h2 className="font-display text-xl mb-4">Cargar resultados por jugador</h2>

        <select
          className={`${inputClass} mb-6`}
          value={fechaSeleccionada}
          onChange={(e) => setFechaSeleccionada(e.target.value)}
        >
          <option value="">Elegir fecha…</option>
          {fechas.map((f) => (
            <option key={f.id} value={f.id}>
              Fecha {f.numero_fecha} — {f.juego?.nombre}
            </option>
          ))}
        </select>

        {fechaSeleccionada && (
          <div className="space-y-4">
            {jugadores.map((j) => {
              const r = resultados[j.id]
              if (!r) return null
              return (
                <div key={j.id} className="gem-panel-sm bg-panel2 p-4 grid sm:grid-cols-6 gap-2 items-center">
                  <p className="font-medium sm:col-span-1">{j.apodo}</p>
                  <input
                    placeholder="Performance"
                    className={inputClass}
                    value={r.performance}
                    onChange={(e) => actualizarCampoResultado(j.id, 'performance', e.target.value)}
                  />
                  <input
                    placeholder="Récord histórico en este juego"
                    className={inputClass}
                    value={r.record_historico}
                    onChange={(e) => actualizarCampoResultado(j.id, 'record_historico', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Rivales superados"
                    className={inputClass}
                    value={r.rivales_superados}
                    onChange={(e) => actualizarCampoResultado(j.id, 'rivales_superados', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Gemas"
                    className={inputClass}
                    value={r.gemas}
                    onChange={(e) => actualizarCampoResultado(j.id, 'gemas', e.target.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={r.jugo}
                        onChange={(e) => actualizarCampoResultado(j.id, 'jugo', e.target.checked)}
                      />
                      Jugó
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={r.sancionado}
                        onChange={(e) => actualizarCampoResultado(j.id, 'sancionado', e.target.checked)}
                      />
                      Sancionado
                    </label>
                  </div>
                  <input
                    placeholder="Nota (opcional)"
                    className={`${inputClass} sm:col-span-5`}
                    value={r.nota}
                    onChange={(e) => actualizarCampoResultado(j.id, 'nota', e.target.value)}
                  />
                  <button
                    onClick={() => handleBorrarResultado(j.id)}
                    className="text-xs text-ruby hover:brightness-125 justify-self-end"
                  >
                    Borrar
                  </button>
                </div>
              )
            })}

            <button
              onClick={handleGuardarResultados}
              disabled={guardando}
              className="bg-gold text-base font-medium px-6 py-2 hover:brightness-110 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar resultados'}
            </button>
          </div>
        )}
      </section>

      <section className="gem-panel p-6">
        <h2 className="font-display text-xl mb-4">Premios de la temporada</h2>

        {premios.length > 0 && (
          <div className="space-y-2 mb-6">
            {premios.map((p) => (
              <div key={p.id} className="flex items-center justify-between gem-panel-sm bg-panel2 px-4 py-2 text-sm">
                <span>
                  <span className="text-gold font-medium">{p.nombre}</span>
                  {p.jugador && <span className="text-muted"> — {p.jugador.apodo}</span>}
                  {p.descripcion && <span className="text-muted"> · {p.descripcion}</span>}
                </span>
                <button onClick={() => handleBorrarPremio(p.id)} className="text-ruby hover:brightness-125 text-xs">
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCrearPremio} className="grid sm:grid-cols-3 gap-3">
          <input
            required
            placeholder="Nombre del premio (ej. Campeón)"
            className={inputClass}
            value={nuevoPremio.nombre}
            onChange={(e) => setNuevoPremio({ ...nuevoPremio, nombre: e.target.value })}
          />
          <select
            className={inputClass}
            value={nuevoPremio.jugador_id}
            onChange={(e) => setNuevoPremio({ ...nuevoPremio, jugador_id: e.target.value })}
          >
            <option value="">General (sin jugador)</option>
            {jugadores.map((j) => (
              <option key={j.id} value={j.id}>
                {j.apodo}
              </option>
            ))}
          </select>
          <input
            placeholder="Descripción (opcional)"
            className={inputClass}
            value={nuevoPremio.descripcion}
            onChange={(e) => setNuevoPremio({ ...nuevoPremio, descripcion: e.target.value })}
          />
          <button className="sm:col-span-3 bg-gold text-base font-medium py-2 hover:brightness-110">
            Agregar premio
          </button>
        </form>
      </section>
    </div>
  )
}