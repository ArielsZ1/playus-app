// Previa de la próxima fecha: quién llega mejor, rachas en juego y récord a batir. Usa getFechas() de la temporada.
import { participo, puestoEnFecha, seJugo } from './fecha.js'
import { numeroDe } from './records.js'

const FORMA_FECHAS = 3 // últimas fechas jugadas por cada uno que cuentan para la forma

// 1 = ganó, 0 = salió último (igual que en perfil.js)
const percentil = (puesto, campo) => (campo > 1 ? 1 - (puesto - 1) / (campo - 1) : 1)

export function armarPrevia(fechas, apodos) {
  const jugadas = fechas.filter(seJugo).sort((a, b) => a.numero_fecha - b.numero_fecha)
  const historial = {} // jugador_id -> [{ puesto, p }] en orden; null = no jugó esa fecha
  for (const id of Object.keys(apodos)) historial[id] = []
  for (const f of jugadas) {
    const campo = f.resultados.filter(participo).length
    for (const id of Object.keys(historial)) {
      const r = f.resultados.find((x) => String(x.jugador_id) === id)
      const puesto = r ? puestoEnFecha(r, f.resultados) : null
      historial[id].push(puesto ? { puesto, p: percentil(puesto, campo) } : null)
    }
  }

  const forma = Object.entries(historial)
    .map(([id, h]) => {
      const ultimas = h.filter(Boolean).slice(-FORMA_FECHAS)
      return { jugador_id: id, apodo: apodos[id], puestos: ultimas.map((x) => x.puesto), valor: ultimas.reduce((s, x) => s + x.p, 0) / (ultimas.length || 1) }
    })
    .filter((x) => x.puestos.length > 0)
    .sort((a, b) => b.valor - a.valor || b.puestos.length - a.puestos.length || a.apodo.localeCompare(b.apodo))
    .slice(0, 3)

  // Racha vigente: fechas seguidas hasta la última; faltar la corta
  const racha = (h, cumple) => {
    let n = 0
    for (let i = h.length - 1; i >= 0 && h[i] && cumple(h[i].puesto); i--) n++
    return n
  }
  const rachas = Object.entries(historial)
    .map(([id, h]) => ({ jugador_id: id, apodo: apodos[id], victorias: racha(h, (p) => p === 1), podios: racha(h, (p) => p <= 3) }))
    .filter((x) => x.podios >= 2)
    .sort((a, b) => b.victorias - a.victorias || b.podios - a.podios || a.apodo.localeCompare(b.apodo))
    .slice(0, 3)
    .map((x) => ({ ...x, texto: x.victorias >= 2 ? `ganó las últimas ${x.victorias}` : `viene de ${x.podios} podios seguidos` }))

  return { forma, rachas }
}

// Mejor récord histórico del grupo en un juego. records: { jugador_id: valor } (getRecordsPorJuego).
// Sin sentido definido (menorEsMejor null) no se puede elegir el mejor.
export function mejorRecord(records, menorEsMejor, apodos) {
  if (menorEsMejor === null || menorEsMejor === undefined) return null
  const validos = Object.entries(records).filter(([, v]) => numeroDe(v) !== null)
  if (validos.length === 0) return null
  const [id, valor] = validos.reduce((a, b) => ((menorEsMejor ? numeroDe(b[1]) < numeroDe(a[1]) : numeroDe(b[1]) > numeroDe(a[1])) ? b : a))
  return { jugador_id: id, apodo: apodos[id] ?? '?', valor }
}
