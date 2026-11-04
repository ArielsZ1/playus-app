// Resultado terminado que el servidor todavía no confirmó (contrato etapa 3, sección 3).
// Se guarda antes de llamar a nx_terminar_intento y se borra cuando responde. Sin localStorage, nada lanza.
const CLAVE = 'nx_pendiente'
const DESCARTAR = /\b(intento_cerrado|intento_ajeno|fuera_de_plazo)\b/

export function guardarPendiente(p) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p))
    return true
  } catch {
    return false
  }
}

export function leerPendiente() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE))
    return p?.intento_id ? p : null
  } catch {
    return null
  }
}

export function borrarPendiente() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    /* sin localStorage no hay nada que borrar */
  }
}

// terminar(intento_id, resultado, datos) es terminarIntento. p: el pendiente (por defecto, el guardado).
// Cualquier error que no sea uno de los tres de DESCARTAR se trata como de red: se conserva y se reintenta.
export async function enviarPendiente(terminar, p = leerPendiente()) {
  if (!p) return null
  try {
    await terminar(p.intento_id, p.resultado, p.datos)
  } catch (err) {
    if (!DESCARTAR.test(`${err?.message ?? ''} ${err?.details ?? ''}`)) return 'reintentar'
    borrarPendiente()
    return 'descartado'
  }
  borrarPendiente()
  return 'enviado'
}
