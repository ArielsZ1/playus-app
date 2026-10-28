// Criterios de una fecha, compartidos por el ranking, el detalle y las tarjetas.

// Admin guarda una fila por cada jugador con jugo = true aunque no haya jugado,
// así que sin performance, gemas ni rivales se toma como que no participó.
export function participo(r) {
  return Boolean(r.jugo && (r.performance || Number(r.gemas) > 0 || Number(r.rivales_superados) > 0))
}

// El puesto lo definen los rivales superados; a igualdad, las gemas.
export function compararEnFecha(a, b) {
  return (b.rivales_superados ?? 0) - (a.rivales_superados ?? 0) || (Number(b.gemas) || 0) - (Number(a.gemas) || 0)
}

// Empates comparten puesto (1, 1, 3). Null si no participó.
export function puestoEnFecha(r, resultados) {
  if (!participo(r)) return null
  return resultados.filter((o) => participo(o) && compararEnFecha(o, r) < 0).length + 1
}

export function seJugo(fecha) {
  return (fecha.resultados || []).some(participo)
}

// jugador_id de quienes terminaron 1° (puede haber empate)
export function ganadoresDeFecha(fecha) {
  const resultados = fecha.resultados || []
  return resultados.filter((r) => puestoEnFecha(r, resultados) === 1).map((r) => r.jugador_id)
}

// Victorias, podios y puesto promedio por jugador_id, a partir de getFechas()
export function estadisticasPorJugador(fechas) {
  const stats = {}
  for (const f of fechas) {
    const resultados = f.resultados || []
    for (const r of resultados) {
      const puesto = puestoEnFecha(r, resultados)
      if (!puesto) continue
      if (!stats[r.jugador_id]) stats[r.jugador_id] = { victorias: 0, podios: 0, sumaPuestos: 0, jugadas: 0 }
      const s = stats[r.jugador_id]
      if (puesto === 1) s.victorias += 1
      if (puesto <= 3) s.podios += 1
      s.sumaPuestos += puesto
      s.jugadas += 1
    }
  }
  for (const s of Object.values(stats)) s.promedio = s.sumaPuestos / s.jugadas
  return stats
}
