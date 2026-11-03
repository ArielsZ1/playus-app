// Count!: lógica pura (sin React). Test: logica.test.mjs

const PENALIZACION_MS = 100 // igual que juegos.validacion.penalizacion_ms en la base

// mulberry32: azar reproducible a partir de la semilla del servidor
function azar(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function armarGrilla(semilla) {
  const r = azar(semilla)
  const g = Array.from({ length: 16 }, (_, i) => i + 1)
  for (let i = g.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[g[i], g[j]] = [g[j], g[i]]
  }
  return g
}

export function estadoInicial() {
  return { esperado: 1, errores: 0, terminado: false }
}

export function tocar(estado, numero) {
  if (estado.terminado || numero < estado.esperado) return estado
  if (numero !== estado.esperado) return { ...estado, errores: estado.errores + 1 }
  return { ...estado, esperado: estado.esperado + 1, terminado: numero === 16 }
}

export function armarResultado(tiempo_ms, errores) {
  const t = Math.round(tiempo_ms)
  const penalizacion_ms = PENALIZACION_MS * errores
  return { resultado: t + penalizacion_ms, datos_del_intento: { tiempo_ms: t, errores, penalizacion_ms } }
}
