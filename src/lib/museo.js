// Contenido del museo (museo/index.html), con getTemporadas() + getFechasTodas() + getJugadores().
import { participo, seJugo } from './fecha.js'
import { campeonesDe, rankingDesdeFechas, temporadaTerminada } from './premios.js'
import { analizarJugador } from './perfil.js'
import { numeroDe } from './records.js'

export function armarMuseo(temporadas, fechas, apodos) {
  const jugadas = fechas.filter(seJugo)
  const resultados = jugadas.flatMap((f) => f.resultados.filter(participo).map((r) => ({ ...r, fecha: f })))
  const actual = temporadas[temporadas.length - 1]

  const origen = {
    temporadas: temporadas.length,
    fechas: jugadas.length,
    gemas: resultados.reduce((s, r) => s + (Number(r.gemas) || 0), 0),
    juegos: new Set(jugadas.map((f) => f.juego?.nombre).filter(Boolean)).size,
    jugadores: new Set(resultados.map((r) => String(r.jugador_id))).size,
    primera: temporadas[0]?.nombre,
    actual: actual?.nombre,
  }

  // Campeones de temporadas terminadas (un título compartido cuenta para cada uno);
  // las seguidas del mismo jugador se agrupan
  const campeones = []
  let previos = []
  let enJuego = null
  for (const t of temporadas) {
    const fechasT = fechas.filter((f) => String(f.temporada_id) === String(t.id))
    const ranking = rankingDesdeFechas(fechasT, apodos)
    if (!ranking[0]) continue
    if (!temporadaTerminada(t, fechasT)) {
      enJuego = { temporada: t.nombre, apodo: ranking[0].apodo }
      continue
    }
    previos = campeonesDe(t, ranking).map((id) => {
      const seguido = previos.find((c) => c.jugador_id === id)
      if (seguido) return seguido.temporadas.push(t.nombre), seguido
      const nuevo = { jugador_id: id, apodo: apodos[id] ?? '?', temporadas: [t.nombre] }
      campeones.push(nuevo)
      return nuevo
    })
  }

  // La leyenda: más títulos; a igualdad, más victorias
  const titulos = {}
  for (const c of campeones) titulos[c.jugador_id] = (titulos[c.jugador_id] ?? 0) + c.temporadas.length
  const candidatos = Object.keys(titulos).map((id) => ({ id, a: analizarJugador(id, fechas, temporadas, apodos) }))
  candidatos.sort((x, y) => titulos[y.id] - titulos[x.id] || (y.a.ficha?.victorias ?? 0) - (x.a.ficha?.victorias ?? 0))
  const top = candidatos[0]
  const leyenda = top?.a.ficha && {
    jugador_id: top.id,
    apodo: apodos[top.id],
    titulos: titulos[top.id],
    victorias: top.a.ficha.victorias,
    podios: top.a.ficha.podios,
    fechas: top.a.ficha.n,
    arquetipo: top.a.ficha.arquetipo,
  }

  // Mejor marca del grupo en los 3 juegos más jugados con sentido definido
  const porJuego = {}
  for (const r of resultados) {
    const juego = r.fecha.juego
    if (!juego?.nombre || juego.menor_es_mejor == null || numeroDe(r.performance) === null) continue
    const j = (porJuego[juego.nombre] ??= { nombre: juego.nombre, menorEsMejor: juego.menor_es_mejor, fechas: new Set(), mejor: null })
    j.fechas.add(r.fecha.id)
    const n = numeroDe(r.performance)
    if (!j.mejor || (j.menorEsMejor ? n < j.mejor.n : n > j.mejor.n)) j.mejor = { n, marca: r.performance, apodo: apodos[r.jugador_id] }
  }
  const marcas = Object.values(porJuego)
    .sort((a, b) => b.fechas.size - a.fechas.size || a.nombre.localeCompare(b.nombre))
    .slice(0, 3)
    .map((j) => ({ juego: j.nombre, marca: j.mejor.marca, apodo: j.mejor.apodo }))

  return { origen, campeones, enJuego, leyenda, marcas }
}
