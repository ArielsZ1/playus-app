// El código de invitación llega en ?codigo= y tiene que sobrevivir la ida y vuelta a Google.
const CLAVE = 'nexplay_codigo'

function codigoDeUrl() {
  return new URLSearchParams(location.search).get('codigo')?.trim().toUpperCase() || null
}

export function guardarCodigoDeUrl() {
  const codigo = codigoDeUrl()
  if (!codigo) return
  try { localStorage.setItem(CLAVE, codigo) } catch { /* sin storage: se lee de la URL */ }
}

export function leerCodigo() {
  try {
    return localStorage.getItem(CLAVE) || codigoDeUrl()
  } catch {
    return codigoDeUrl()
  }
}

export function borrarCodigo() {
  try { localStorage.removeItem(CLAVE) } catch { /* nada que borrar */ }
  if (codigoDeUrl()) {
    const url = new URL(location.href)
    url.searchParams.delete('codigo')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  }
}
