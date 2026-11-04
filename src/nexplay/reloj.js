// Las fechas diarias se abren y se cierran a las 01:00 UTC = 22:00 de Argentina (spec etapa 3).
const ZONA = 'America/Argentina/Buenos_Aires'

// La próxima 01:00 UTC estrictamente posterior a `ahora`.
export function proximaApertura(ahora) {
  const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), 1))
  if (d <= ahora) d.setUTCDate(d.getUTCDate() + 1)
  return d
}

// Cuenta regresiva (contrato §0): "5 h 12 min", "12 min" o "45 s".
export function restante(ms) {
  if (ms < 60000) return `${Math.max(0, Math.ceil(ms / 1000))} s`
  const min = Math.floor(ms / 60000)
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}

// "22:00" en hora de Argentina, aunque el celu esté en otra zona.
export const horaAR = (d) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)

const diaDe = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d)
// 'hoy' o 'mañana' en Argentina. shortcut: supone que `fecha` cae dentro de las próximas 24 h (proximaApertura).
export const diaAR = (fecha, ahora = new Date()) => (diaDe(fecha) === diaDe(ahora) ? 'hoy' : 'mañana')
