// node src/nexplay/admin.test.mjs  (sin runner: falla con un AssertionError)
import assert from 'node:assert/strict'
import { msDeSegundos, textoDeAccion, esAutomatico, fechaHoraAR, estadoDeIntento } from './admin.js'

// corrección (6.5): coma o punto, > 0, en ms
assert.equal(msDeSegundos('4.70'), 4700)
assert.equal(msDeSegundos('4,7'), 4700)
assert.equal(msDeSegundos(' 12 '), 12000)
assert.equal(msDeSegundos('0.0015'), 2) // redondea al ms
for (const malo of ['', ' ', '0', '0,00', '-1', 'abc', '4.7.1', '4,', '1e3']) assert.equal(msDeSegundos(malo), null, malo)

// auditoría (6.6)
assert.equal(textoDeAccion({ accion: 'crear_temporada', despues: { nombre: 'T12' } }), 'Creó la temporada T12')
assert.equal(textoDeAccion({ accion: 'auto_iniciar_fecha', despues: { numero_fecha: 3 } }), 'Abrió la Fecha 3')
assert.equal(textoDeAccion({ accion: 'cancelar_fecha', antes: { numero_fecha: 2 } }), 'Canceló la Fecha 2')
assert.equal(textoDeAccion({ accion: 'corregir_resultado', antes: { resultado: 5200 }, despues: { resultado: 4700 } }),
  'Corrigió un intento: 5.20 s → 4.70 s')
assert.equal(textoDeAccion({ accion: 'corregir_resultado', antes: { resultado: null }, despues: { resultado: 4700 } }),
  'Corrigió un intento: — → 4.70 s')
assert.equal(textoDeAccion({ accion: 'excluir_juego', despues: { excluir: true } }), 'Sacó un juego de la ruleta')
assert.equal(textoDeAccion({ accion: 'excluir_juego', despues: { excluir: false } }), 'Volvió a poner un juego en la ruleta')
assert.equal(textoDeAccion({ accion: 'auto_sin_juegos' }), 'Pausó la temporada: no quedan juegos')
assert.equal(textoDeAccion({ accion: 'pausar' }), 'Pausó la temporada')
assert.equal(textoDeAccion({ accion: 'algo_nuevo' }), null) // se muestra el código tal cual

assert.equal(esAutomatico({ accion: 'auto_cerrar_fecha', admin_user_id: 'x' }), true)
assert.equal(esAutomatico({ accion: 'cerrar_fecha', admin_user_id: null }), true)
assert.equal(esAutomatico({ accion: 'cerrar_fecha', admin_user_id: 'x' }), false)

// 01:00 UTC del 5 = 22:00 del 4 en Argentina
assert.equal(fechaHoraAR('2026-11-05T01:00:00Z'), '04/11 22:00')

// filas de intentos (6.5)
assert.deepEqual(estadoDeIntento({ estado: 'completado', motivo: null }), { chip: 'valido' })
assert.deepEqual(estadoDeIntento({ estado: 'completado', motivo: 'corregido' }), { texto: 'corregido' })
assert.deepEqual(estadoDeIntento({ estado: 'invalido', motivo: 'no_cierra' }), { chip: 'fallado', motivo: 'no_cierra' })
assert.deepEqual(estadoDeIntento({ estado: 'en_curso' }), { texto: 'sin terminar' })
assert.deepEqual(estadoDeIntento({ estado: 'interrumpido', motivo: 'abandonado' }), { texto: 'sin terminar' })
assert.deepEqual(estadoDeIntento({ estado: 'interrumpido', motivo: 'colchon' }), { texto: 'colchón' })
assert.deepEqual(estadoDeIntento({ estado: 'interrumpido', motivo: 'fecha_cerrada' }), { texto: 'cortado por el cierre' })
assert.deepEqual(estadoDeIntento({ estado: 'interrumpido', motivo: 'fecha_cancelada' }), { texto: 'cancelada' })

console.log('admin: ok')
