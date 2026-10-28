// Récords históricos: se guardan como texto con unidad ("34.92 Segundos", "363 Puntos", "89.41%").

// Primer número del texto, aceptando coma decimal. Null si no hay número.
export function numeroDe(texto) {
  const m = String(texto ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

const vacio = (v) => v === '' || v === null || v === undefined

// Elige el récord a guardar entre el guardado, lo que escribió el admin y la performance de la fecha.
// menorEsMejor null = juego sin definir: se guarda lo escrito, como antes.
// estado: 'nuevo' (mejoró), 'rechazado' (lo escrito es peor que el récord) o null.
export function resolverRecord({ guardado, ingresado, performance }, menorEsMejor) {
  if (menorEsMejor === null || menorEsMejor === undefined) return { valor: ingresado, estado: null }
  // Lo escrito sin número no se puede comparar: se respeta
  if (!vacio(ingresado) && numeroDe(ingresado) === null) return { valor: ingresado, estado: null }

  const mejor = (a, b) => (menorEsMejor ? numeroDe(a) < numeroDe(b) : numeroDe(a) > numeroDe(b))
  const candidatos = [guardado, ingresado, performance].filter((v) => !vacio(v) && numeroDe(v) !== null)
  if (candidatos.length === 0) return { valor: ingresado, estado: null }

  const ganador = candidatos.reduce((a, b) => (mejor(b, a) ? b : a))
  const supera = vacio(guardado) || numeroDe(guardado) === null || mejor(ganador, guardado)
  const rechazado = !vacio(ingresado) && mejor(ganador, ingresado) && ingresado !== guardado
  return { valor: ganador, estado: rechazado ? 'rechazado' : supera && ganador !== guardado ? 'nuevo' : null }
}
