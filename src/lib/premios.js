// Premios automáticos de una temporada, calculados con getRanking() + getFechas().
import { estadisticasPorJugador, participo, puestoEnFecha, seJugo } from './fecha.js'

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`
const promedio = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// candidatos: [{ id, valor }]. Ganan todos los empatados en el mejor valor; "segundo" es el siguiente valor.
function elegir(candidatos, menorEsMejor = false) {
  const orden = [...candidatos].sort((a, b) => (menorEsMejor ? a.valor - b.valor : b.valor - a.valor))
  if (orden.length === 0) return { ganadores: [], segundo: null }
  const mejor = orden[0].valor
  return {
    ganadores: orden.filter((c) => c.valor === mejor),
    segundo: orden.find((c) => c.valor !== mejor) ?? null,
  }
}

// Puesto de temporada de cada jugador después de cada fecha jugada (mismo desempate que getRanking)
function puestosPorFecha(jugadas, apodos) {
  const acumulado = Object.fromEntries(Object.keys(apodos).map((id) => [id, 0]))
  return jugadas.map((f) => {
    for (const r of f.resultados) if (r.jugador_id in acumulado) acumulado[r.jugador_id] += Number(r.gemas) || 0
    const orden = Object.keys(acumulado).sort((a, b) => acumulado[b] - acumulado[a] || apodos[a].localeCompare(apodos[b]))
    return Object.fromEntries(orden.map((id, i) => [id, i + 1]))
  })
}

export function calcularPremios(ranking, fechas) {
  const jugadas = fechas.filter(seJugo)
  if (jugadas.length === 0 || ranking.length === 0) return []
  const apodos = Object.fromEntries(ranking.map((j) => [j.jugador_id, j.apodo]))
  const ids = Object.keys(apodos)
  const stats = estadisticasPorJugador(jugadas)
  const st = (id) => stats[id] ?? { victorias: 0, podios: 0, jugadas: 0 }
  const total = jugadas.length

  // Rachas de podio y sanciones, recorriendo las fechas en orden
  const racha = {}
  const mejorRacha = {}
  const sanciones = {}
  for (const f of jugadas) {
    for (const id of ids) {
      const r = f.resultados.find((x) => String(x.jugador_id) === id)
      const puesto = r ? puestoEnFecha(r, f.resultados) : null
      racha[id] = puesto && puesto <= 3 ? (racha[id] ?? 0) + 1 : 0
      mejorRacha[id] = Math.max(mejorRacha[id] ?? 0, racha[id])
      if (r?.sancionado) sanciones[id] = (sanciones[id] ?? 0) + 1
    }
  }

  // Remontada: del peor puesto (desde su primera fecha) al puesto actual
  const puestos = puestosPorFecha(jugadas, apodos)
  const remontada = {}
  for (const id of ids) {
    const desde = jugadas.findIndex((f) => f.resultados.some((r) => String(r.jugador_id) === id && participo(r)))
    if (desde === -1) continue
    const tramo = puestos.slice(desde).map((p) => p[id])
    const peor = Math.max(...tramo)
    remontada[id] = { valor: peor - tramo[tramo.length - 1], peor, actual: tramo[tramo.length - 1] }
  }

  // Para el promedio pide jugar al menos la mitad de las fechas, si no gana quien jugó una sola
  const minimo = Math.ceil(total / 2)
  const participantes = ids.filter((id) => st(id).jugadas > 0)
  const gemas = Object.fromEntries(ranking.map((j) => [j.jugador_id, j.gemas]))

  const premios = [
    {
      id: 'campeon',
      nombre: 'Campeón',
      descripcion: 'Más gemas en la temporada',
      icono: 'corona',
      ...elegir(ids.map((id) => ({ id, valor: gemas[id] }))),
      dato: (c) => plural(c.valor, 'gema', 'gemas'),
    },
    {
      id: 'victorias',
      nombre: 'Más victorias',
      descripcion: 'Más fechas ganadas',
      icono: 'trofeo',
      ...elegir(participantes.map((id) => ({ id, valor: st(id).victorias })).filter((c) => c.valor > 0)),
      dato: (c) => plural(c.valor, 'victoria', 'victorias'),
    },
    {
      id: 'podios',
      nombre: 'Más podios',
      descripcion: 'Más veces entre los 3 primeros de una fecha',
      icono: 'medalla',
      ...elegir(participantes.map((id) => ({ id, valor: st(id).podios })).filter((c) => c.valor > 0)),
      dato: (c) => plural(c.valor, 'podio', 'podios'),
    },
    {
      id: 'promedio',
      nombre: 'Mejor puesto promedio',
      descripcion: `Entre quienes jugaron al menos ${plural(minimo, 'fecha', 'fechas')}`,
      icono: 'diana',
      ...elegir(
        participantes.filter((id) => st(id).jugadas >= minimo).map((id) => ({ id, valor: st(id).promedio })),
        true,
      ),
      dato: (c) => `${promedio(c.valor)}° promedio`,
    },
    {
      id: 'asistencia',
      nombre: 'Asistencia perfecta',
      descripcion: 'Jugó todas las fechas',
      icono: 'calendario',
      ...elegir(participantes.map((id) => ({ id, valor: st(id).jugadas }))),
      dato: (c) => `${c.valor} de ${total} fechas`,
    },
    {
      id: 'remontada',
      nombre: 'Mayor remontada',
      descripcion: 'Más puestos subidos en la tabla de la temporada',
      icono: 'flecha',
      ...elegir(Object.entries(remontada).map(([id, r]) => ({ id, ...r })).filter((c) => c.valor > 0)),
      dato: (c) => `Subió ${plural(c.valor, 'puesto', 'puestos')} (${c.peor}° → ${c.actual}°)`,
    },
    {
      id: 'racha',
      nombre: 'Mejor racha',
      descripcion: 'Más fechas seguidas en el podio',
      icono: 'llama',
      ...elegir(participantes.map((id) => ({ id, valor: mejorRacha[id] ?? 0 })).filter((c) => c.valor > 1)),
      dato: (c) => plural(c.valor, 'fecha seguida', 'fechas seguidas'),
    },
    {
      id: 'fairplay',
      nombre: 'Fair play',
      descripcion: 'Sin sanciones, con más fechas jugadas',
      icono: 'escudo',
      ...elegir(participantes.filter((id) => !sanciones[id]).map((id) => ({ id, valor: st(id).jugadas }))),
      dato: (c) => `Sin sanciones en ${plural(c.valor, 'fecha', 'fechas')}`,
    },
  ]

  // Asistencia perfecta solo la gana quien jugó todas
  const asistencia = premios.find((p) => p.id === 'asistencia')
  if (asistencia.ganadores[0]?.valor !== total) {
    asistencia.segundo = asistencia.ganadores[0] ?? null
    asistencia.ganadores = []
  }

  return premios.map((p) => ({
    ...p,
    ganadores: p.ganadores.map((c) => ({ jugador_id: c.id, apodo: apodos[c.id], dato: p.dato(c) })),
    segundo: p.segundo && { jugador_id: p.segundo.id, apodo: apodos[p.segundo.id], dato: p.dato(p.segundo) },
  }))
}

// Con fecha de fin, la temporada termina cuando pasa ese día; sin ella, cuando se jugaron todas las fechas.
export function temporadaTerminada(temporada, fechas) {
  if (temporada?.fecha_fin) return temporada.fecha_fin < new Date().toLocaleDateString('sv')
  return fechas.length > 0 && fechas.every(seJugo)
}

// Mismo resultado que getRanking() pero a partir de getFechas(), para calcular varias temporadas de una vez
export function rankingDesdeFechas(fechas, apodos) {
  const gemas = {}
  const jugaron = new Set()
  for (const f of fechas) {
    for (const r of f.resultados || []) {
      gemas[r.jugador_id] = (gemas[r.jugador_id] ?? 0) + (Number(r.gemas) || 0)
      if (participo(r)) jugaron.add(String(r.jugador_id))
    }
  }
  return Object.entries(gemas)
    .filter(([jugador_id]) => jugaron.has(jugador_id))
    .map(([jugador_id, total]) => ({ jugador_id, apodo: apodos[jugador_id] ?? '?', gemas: total }))
    .sort((a, b) => b.gemas - a.gemas || a.apodo.localeCompare(b.apodo))
}

// Medallero histórico: premios automáticos de cada temporada terminada + premios especiales, por jugador.
// Orden: títulos, después total de premios, después apodo.
export function armarMedallero(fechasTodas, temporadas, apodos, especiales) {
  const filas = {}
  const fila = (id) => (filas[id] ??= { jugador_id: id, apodo: apodos[id] ?? '?', premios: {}, especiales: 0, total: 0 })
  for (const t of temporadas) {
    const fechasT = fechasTodas.filter((f) => String(f.temporada_id) === String(t.id))
    if (!temporadaTerminada(t, fechasT)) continue
    calcularPremios(rankingDesdeFechas(fechasT, apodos), fechasT).forEach((p, orden) => {
      for (const g of p.ganadores) {
        const f = fila(String(g.jugador_id))
        ;(f.premios[p.id] ??= { premio: p, orden, temporadas: [] }).temporadas.push(t.nombre)
        f.total++
      }
    })
  }
  for (const e of especiales) {
    if (e.jugador_id == null) continue
    const f = fila(String(e.jugador_id))
    f.especiales++
    f.total++
  }
  const titulos = (f) => f.premios.campeon?.temporadas.length ?? 0
  return Object.values(filas).sort((a, b) => titulos(b) - titulos(a) || b.total - a.total || a.apodo.localeCompare(b.apodo))
}
