// node src/lib/campeones.test.mjs
import assert from 'node:assert/strict'
import { calcularPremios, campeonesDe } from './premios.js'
import { armarMuseo } from './museo.js'

const ranking = [{ jugador_id: 'a', apodo: 'A', gemas: 30 }, { jugador_id: 'b', apodo: 'B', gemas: 20 }]

assert.deepEqual(campeonesDe({ campeones: ['b'] }, ranking), ['b'])
assert.deepEqual(campeonesDe({ campeones: null }, ranking), ['a'])
assert.deepEqual(campeonesDe({ campeones: ['a', 'b'] }, ranking), ['a', 'b'])
assert.deepEqual(campeonesDe({ campeones: [] }, []), [])

// Premio campeón: con campeones guardados ganan esos; sin ellos, como hoy
const fecha = (id, temporada_id, gemasA, gemasB) => ({
  id, temporada_id, estado: 'cerrada', juego: null,
  resultados: [
    { jugador_id: 'a', gemas: gemasA, rivales_superados: 1, jugo: true },
    { jugador_id: 'b', gemas: gemasB, rivales_superados: 0, jugo: true },
  ],
})
const fechas = [fecha(1, 't1', 30, 20)]
const campeon = (t) => calcularPremios(ranking, fechas, t).find((p) => p.id === 'campeon')
assert.deepEqual(campeon({ campeones: null }).ganadores.map((g) => g.jugador_id), ['a'])
assert.deepEqual(campeon({ campeones: ['a', 'b'] }).ganadores.map((g) => g.jugador_id), ['a', 'b'])

// Museo: título compartido, cada uno lo recibe; seguidas del mismo se agrupan
const temporadas = [
  { id: 't1', nombre: 'T1', fecha_fin: '2000-01-01', campeones: ['a', 'b'] },
  { id: 't2', nombre: 'T2', fecha_fin: '2000-01-02', campeones: null },
]
const museo = armarMuseo(temporadas, [fecha(1, 't1', 30, 20), fecha(2, 't2', 30, 20)], { a: 'A', b: 'B' })
assert.deepEqual(museo.campeones.map((c) => [c.jugador_id, c.temporadas]), [['a', ['T1', 'T2']], ['b', ['T1']]])

console.log('ok')
