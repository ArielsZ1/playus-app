// Análisis de carrera de un jugador (todas las temporadas), con getFechasTodas() + getTemporadas() + getJugadores().
import { participo, puestoEnFecha, seJugo } from './fecha.js'
import { calcularPremios, rankingDesdeFechas, temporadaTerminada } from './premios.js'

const MIN_FECHAS = 5 // por debajo, la muestra es chica para sacar conclusiones
const mismo = (a, b) => String(a) === String(b)
const media = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
const desvio = (xs) => Math.sqrt(media(xs.map((x) => (x - media(xs)) ** 2)))
const nota = (x) => Math.max(1, Math.min(99, Math.round(x * 99)))
const pct = (x) => `${Math.round(x * 100)}%`

// 1 = ganó, 0 = salió último. Normaliza fechas con distinta cantidad de jugadores.
const percentil = (puesto, campo) => (campo > 1 ? 1 - (puesto - 1) / (campo - 1) : 1)

export function analizarJugador(jugadorId, fechasTodas, temporadas, apodos) {
  const id = String(jugadorId)
  const ordenTemporada = Object.fromEntries(temporadas.map((t, i) => [t.id, i]))
  const fechas = fechasTodas
    .filter((f) => f.temporada_id in ordenTemporada)
    .sort((a, b) => ordenTemporada[a.temporada_id] - ordenTemporada[b.temporada_id] || a.numero_fecha - b.numero_fecha)

  // Historial: una fila por fecha jugada, en orden cronológico
  const historial = []
  for (const f of fechas) {
    const r = f.resultados.find((x) => mismo(x.jugador_id, id))
    if (!r || !participo(r)) continue
    const puesto = puestoEnFecha(r, f.resultados)
    const campo = f.resultados.filter(participo).length
    historial.push({ fecha: f, resultado: r, puesto, campo, p: percentil(puesto, campo) })
  }

  // Trayectoria y palmarés por temporada (los premios solo cuentan en temporadas terminadas)
  const temporadasJugadas = []
  const palmares = []
  for (const t of temporadas) {
    const fechasT = fechas.filter((f) => mismo(f.temporada_id, t.id))
    if (!historial.some((h) => mismo(h.fecha.temporada_id, t.id))) continue
    const ranking = rankingDesdeFechas(fechasT, apodos)
    const terminada = temporadaTerminada(t, fechasT)
    temporadasJugadas.push({ temporada: t, puesto: ranking.findIndex((j) => mismo(j.jugador_id, id)) + 1, de: ranking.length, terminada })
    if (!terminada) continue
    for (const p of calcularPremios(ranking, fechasT)) {
      if (p.ganadores.some((g) => mismo(g.jugador_id, id))) palmares.push({ temporada: t, premio: p })
    }
  }

  const n = historial.length
  const base = { historial, temporadasJugadas, palmares, n, gemas: historial.reduce((s, h) => s + (Number(h.resultado.gemas) || 0), 0) }
  if (n === 0) return { ...base, ficha: null }

  const ps = historial.map((h) => h.p)
  const victorias = historial.filter((h) => h.puesto === 1).length
  const podios = historial.filter((h) => h.puesto <= 3).length
  const sanciones = historial.filter((h) => h.resultado.sancionado).length

  // Asistencia: solo en las temporadas en que participó (no castiga a quien dejó de jugar)
  const disputadas = fechas.filter((f) => temporadasJugadas.some((t) => mismo(t.temporada.id, f.temporada_id)) && seJugo(f)).length

  // Con 4 o 5 jugadores el podio es fácil: victorias y podios se miden contra lo esperable por cantidad de rivales
  const esperadoVictorias = media(historial.map((h) => 1 / h.campo))
  const esperadoPodios = media(historial.map((h) => Math.min(3, h.campo) / h.campo))
  const sobreEsperado = (real, esperado) => (esperado >= 1 ? 0.5 : 0.5 + (real - esperado) / (2 * (1 - esperado)))

  // Cara a cara contra cada rival en las fechas que jugaron los dos
  const duelos = {}
  for (const h of historial) {
    for (const o of h.fecha.resultados) {
      if (mismo(o.jugador_id, id) || !participo(o)) continue
      const d = (duelos[o.jugador_id] ??= { jugador_id: String(o.jugador_id), ganados: 0, jugados: 0 })
      d.jugados += 1
      if (h.puesto < puestoEnFecha(o, h.fecha.resultados)) d.ganados += 1
    }
  }
  const rivales = Object.values(duelos)
    .filter((d) => d.jugados >= MIN_FECHAS)
    .map((d) => ({ ...d, apodo: apodos[d.jugador_id] ?? '?', ratio: d.ganados / d.jugados }))
    .sort((a, b) => a.ratio - b.ratio)

  // Juegos con al menos 2 fechas, del mejor al peor
  const porJuego = {}
  for (const h of historial) {
    const nombre = h.fecha.juego?.nombre
    if (!nombre) continue
    const j = (porJuego[nombre] ??= { nombre, ps: [], victorias: 0, puestos: [] })
    j.ps.push(h.p)
    j.puestos.push(h.puesto)
    if (h.puesto === 1) j.victorias += 1
  }
  const juegos = Object.values(porJuego)
    .map((j) => ({ nombre: j.nombre, fechas: j.ps.length, victorias: j.victorias, nivel: media(j.ps), promedio: media(j.puestos) }))
    .sort((a, b) => b.nivel - a.nivel || b.fechas - a.fechas)
  const juegosFirmes = juegos.filter((j) => j.fechas >= 2)

  const ultimas = ps.slice(-MIN_FECHAS)
  const atributos = {
    nivel: nota(media(ps)),
    victorias: nota(victorias / n / (2 * esperadoVictorias)),
    podios: nota(sobreEsperado(podios / n, esperadoPodios)),
    // Calibrado con los datos reales: un desvío de 0,375 es regularidad media (50)
    regularidad: nota((0.45 - desvio(ps)) / 0.15),
    forma: nota(media(ultimas)),
    asistencia: nota(n / disputadas),
  }
  const general = Math.round(
    atributos.nivel * 0.35 + atributos.podios * 0.2 + atributos.victorias * 0.15 + atributos.regularidad * 0.15 + atributos.forma * 0.15,
  )

  const datos = {
    n, victorias, podios, sanciones, disputadas, atributos, rivales, juegosFirmes,
    promedio: media(historial.map((h) => h.puesto)),
    ultimas: historial.slice(-MIN_FECHAS),
    titulos: palmares.filter((x) => x.premio.id === 'campeon').length,
  }

  return {
    ...base,
    juegos,
    ficha: {
      general,
      atributos,
      muestraChica: n < MIN_FECHAS,
      arquetipo: arquetipo(datos),
      fortalezas: n < MIN_FECHAS ? [] : fortalezas(datos),
      debilidades: n < MIN_FECHAS ? [] : debilidades(datos),
      ...datos,
    },
  }
}

// Perfil de juego según los atributos; la primera regla que se cumple gana
function arquetipo({ n, atributos: a, titulos }) {
  if (n < MIN_FECHAS) return { nombre: 'Recién llegado', descripcion: 'Todavía no jugó lo suficiente para leer su estilo.' }
  if (titulos >= 3) return { nombre: 'La Leyenda', descripcion: `${titulos} temporadas ganadas: es la vara con la que se miden todos.` }
  if (a.victorias >= 60 && a.podios >= 70) return { nombre: 'El Dominador', descripcion: 'Gana seguido y casi nunca se baja del podio.' }
  if (a.victorias >= 50 && a.regularidad < 45) return { nombre: 'Todo o Nada', descripcion: 'Cuando engancha el juego gana; cuando no, se hunde.' }
  if (a.podios >= 60 && a.regularidad >= 60) return { nombre: 'Reloj Suizo', descripcion: 'Rara vez gana con lo justo y rara vez falla: siempre anda cerca.' }
  if (a.podios >= 55 && a.victorias < 45) return { nombre: 'El Escolta', descripcion: 'Siempre en el podio, pocas veces arriba de todo.' }
  if (a.forma - a.nivel >= 12) return { nombre: 'En Llamas', descripcion: 'Viene jugando por encima de su nivel histórico.' }
  if (a.nivel - a.forma >= 12) return { nombre: 'En Bache', descripcion: 'Atraviesa su peor momento comparado con su historia.' }
  if (titulos > 0) return { nombre: 'Campeón con Oficio', descripcion: 'Sabe lo que es ganar una temporada y compite en todas.' }
  if (a.nivel >= 55) return { nombre: 'Competidor Sólido', descripcion: 'Mitad de tabla para arriba; le falta el golpe para ganar más.' }
  if (a.asistencia >= 90) return { nombre: 'El Incansable', descripcion: 'No falta nunca: suma experiencia fecha tras fecha.' }
  return { nombre: 'Aspirante', descripcion: 'Busca su lugar en la tabla; cada fecha es una oportunidad.' }
}

function fortalezas({ n, victorias, podios, atributos: a, rivales, juegosFirmes, titulos }) {
  const lista = []
  if (titulos > 0) lista.push(`${titulos === 1 ? 'Campeón de una temporada' : `Campeón de ${titulos} temporadas`}.`)
  if (a.victorias >= 55) lista.push(`Definidor: ganó ${victorias} de ${n} fechas (${pct(victorias / n)}).`)
  if (a.podios >= 65) lista.push(`Vive en el podio: ${podios} de ${n} fechas entre los 3 primeros.`)
  if (a.regularidad >= 65 && a.nivel >= 50) lista.push('Muy regular: sus resultados casi no varían.')
  if (a.forma >= a.nivel + 8) lista.push('Llega en su mejor momento: las últimas fechas están por encima de su promedio.')
  if (a.asistencia >= 95) lista.push('Presencia total: no se pierde fechas.')
  const mejor = juegosFirmes[0]
  if (mejor && mejor.nivel >= 0.6) lista.push(`Su terreno es ${mejor.nombre}: ${mejor.promedio.toFixed(1)}° de promedio en ${mejor.fechas} fechas.`)
  const victima = rivales[rivales.length - 1]
  if (victima && victima.ratio >= 0.65) lista.push(`Le tiene tomado el tiempo a ${victima.apodo}: le ganó ${victima.ganados} de ${victima.jugados} veces.`)
  return lista.slice(0, 4)
}

function debilidades({ n, victorias, sanciones, atributos: a, rivales, juegosFirmes }) {
  const lista = []
  if (victorias === 0 && n >= MIN_FECHAS) lista.push('Todavía no ganó ninguna fecha: le falta el cierre.')
  else if (a.victorias < 30 && a.podios >= 50) lista.push('Llega al podio pero le cuesta ganar.')
  if (a.regularidad < 45) lista.push('Irregular: alterna fechas muy buenas con muy malas.')
  if (a.forma <= a.nivel - 8) lista.push('Viene en baja: las últimas fechas están debajo de su promedio.')
  if (a.asistencia < 75) lista.push(`Falta seguido: jugó ${pct(a.asistencia / 99)} de las fechas de sus temporadas.`)
  if (sanciones > 0) lista.push(`Disciplina: ${sanciones === 1 ? 'una sanción' : `${sanciones} sanciones`} en su carrera.`)
  const peor = juegosFirmes[juegosFirmes.length - 1]
  if (peor && juegosFirmes.length > 1 && peor.nivel <= 0.4) lista.push(`Sufre en ${peor.nombre}: ${peor.promedio.toFixed(1)}° de promedio.`)
  const nemesis = rivales[0]
  if (nemesis && nemesis.ratio <= 0.35) lista.push(`Su némesis es ${nemesis.apodo}: solo le ganó ${nemesis.ganados} de ${nemesis.jugados} veces.`)
  return lista.slice(0, 4)
}
