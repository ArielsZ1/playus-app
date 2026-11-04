// node src/nexplay/reloj.test.mjs  (sin runner: falla con un AssertionError)
import assert from 'node:assert/strict'
import { proximaApertura, restante, horaAR, diaAR } from './reloj.js'

const iso = (d) => d.toISOString()
assert.equal(iso(proximaApertura(new Date('2026-11-04T00:30:00Z'))), '2026-11-04T01:00:00.000Z')
assert.equal(iso(proximaApertura(new Date('2026-11-04T01:00:00Z'))), '2026-11-05T01:00:00.000Z')
assert.equal(iso(proximaApertura(new Date('2026-11-04T23:00:00Z'))), '2026-11-05T01:00:00.000Z')

// contrato §0: "5 h 12 min", "12 min", "45 s"
assert.equal(restante((5 * 60 + 12) * 60000 + 30000), '5 h 12 min')
assert.equal(restante(12 * 60000 + 59000), '12 min')
assert.equal(restante(45000), '45 s')
assert.equal(restante(400), '1 s')

// hora de Argentina sin importar la zona del celu
assert.equal(horaAR(new Date('2026-11-05T01:00:00Z')), '22:00')
// 01:00 UTC del 5 = 22:00 del 4 en Argentina: "hoy" si ahora es el 4 en Argentina
assert.equal(diaAR(new Date('2026-11-05T01:00:00Z'), new Date('2026-11-04T15:00:00Z')), 'hoy')
assert.equal(diaAR(new Date('2026-11-06T01:00:00Z'), new Date('2026-11-05T02:00:00Z')), 'mañana')

console.log('ok')
