// node src/nexplay/pendiente.test.mjs  (sin runner: falla con un AssertionError)
import assert from 'node:assert/strict'

const memoria = new Map()
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
}
const { guardarPendiente, leerPendiente, borrarPendiente, enviarPendiente } = await import('./pendiente.js')

const p = { intento_id: 'a1', resultado: 4700, datos: { errores: 0, tiempo_ms: 4700, penalizacion_ms: 0 } }
assert.equal(guardarPendiente(p), true)
assert.deepEqual(leerPendiente(), p, 'guardar y leer da lo mismo')

let llamado
assert.equal(await enviarPendiente(async (...a) => { llamado = a; return { id: 'a1' } }), 'enviado')
assert.deepEqual(llamado, ['a1', 4700, p.datos])
assert.equal(leerPendiente(), null, 'enviado borra')

guardarPendiente(p)
assert.equal(await enviarPendiente(async () => { throw { message: 'fuera_de_plazo' } }), 'descartado')
assert.equal(leerPendiente(), null, 'descartado borra')

guardarPendiente(p)
assert.equal(await enviarPendiente(async () => { throw { message: 'intento_cerrado' } }), 'descartado')
guardarPendiente(p)
assert.equal(await enviarPendiente(async () => { throw { message: 'intento_ajeno' } }), 'descartado')

guardarPendiente(p)
assert.equal(await enviarPendiente(async () => { throw new TypeError('Failed to fetch') }), 'reintentar')
assert.deepEqual(leerPendiente(), p, 'reintentar conserva')
// supabase-js no lanza: devuelve el error de red como objeto, y queries.js lo lanza
assert.equal(await enviarPendiente(async () => { throw { message: 'TypeError: Failed to fetch' } }), 'reintentar')

borrarPendiente()
assert.equal(leerPendiente(), null)
assert.equal(await enviarPendiente(async () => ({})), null, 'sin pendiente no hace nada')

memoria.set('nx_pendiente', '{roto')
assert.equal(leerPendiente(), null, 'JSON roto da null')

// sin localStorage (navegación privada que lo bloquea): nada lanza
globalThis.localStorage = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') }, removeItem() { throw new Error('x') } }
assert.equal(guardarPendiente(p), false)
assert.equal(leerPendiente(), null)
borrarPendiente()
// con el pendiente en memoria se puede mandar igual
assert.equal(await enviarPendiente(async () => ({}), p), 'enviado')

console.log('ok')
