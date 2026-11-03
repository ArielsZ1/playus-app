// node src/nexplay/juegos/count/logica.test.mjs  (sin runner: falla con un AssertionError)
import assert from 'node:assert/strict'
import { armarGrilla, estadoInicial, tocar, armarResultado } from './logica.js'

const g = armarGrilla(42)
assert.equal(g.length, 16)
assert.deepEqual([...g].sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1))
assert.deepEqual(armarGrilla(42), g, 'misma semilla, misma grilla')
assert.notDeepEqual(armarGrilla(43), g, 'otra semilla, otra grilla')

let e = estadoInicial()
assert.deepEqual(e, { esperado: 1, errores: 0, terminado: false })
for (const n of [1, 5, 2]) e = tocar(e, n)
assert.deepEqual(e, { esperado: 3, errores: 1, terminado: false })

// tocar una celda ya usada no es error (contrato, sección 3)
assert.deepEqual(tocar(e, 2), e)

e = estadoInicial()
for (let n = 1; n <= 16; n++) e = tocar(e, n)
assert.deepEqual(e, { esperado: 17, errores: 0, terminado: true })
assert.equal(tocar(e, 3), e, 'terminado: no cambia')

// mismo caso que el test SQL de la Task 3
assert.deepEqual(armarResultado(4500.4, 2), {
  resultado: 4700,
  datos_del_intento: { tiempo_ms: 4500, errores: 2, penalizacion_ms: 200 },
})

console.log('count: ok')
