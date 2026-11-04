// Lógica pura del admin del torneo (contrato de estados etapa 3, 6.5 y 6.6). Sin imports: se prueba con node.

// "4.70" o "4,7" → 4700 ms; null si no es un número mayor que 0.
export function msDeSegundos(texto) {
  const s = String(texto ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const ms = Math.round(Number(s) * 1000)
  return ms > 0 ? ms : null
}

const seg = (ms) => (ms == null ? '—' : `${(Number(ms) / 1000).toFixed(2)} s`)

const ACCIONES = {
  crear_invitacion: () => 'Generó un link de invitación',
  aceptar_jugador: () => 'Aceptó una cuenta',
  bloquear_jugador: () => 'Bloqueó una cuenta',
  crear_temporada: (f) => `Creó la temporada ${f.despues?.nombre ?? ''}`.trim(),
  iniciar_temporada: () => 'Inició la temporada',
  iniciar_fecha: (f) => `Abrió la Fecha ${f.despues?.numero_fecha ?? ''}`.trim(),
  cerrar_fecha: () => 'Cerró una fecha',
  finalizar: () => 'Terminó la temporada',
  sin_juegos: () => 'Pausó la temporada: no quedan juegos',
  cancelar_fecha: (f) => `Canceló la Fecha ${f.antes?.numero_fecha ?? ''}`.trim(),
  corregir_resultado: (f) => `Corrigió un intento: ${seg(f.antes?.resultado)} → ${seg(f.despues?.resultado)}`,
  pausar: () => 'Pausó la temporada',
  reanudar: () => 'Reanudó la temporada',
  excluir_juego: (f) => (f.despues?.excluir ? 'Sacó un juego de la ruleta' : 'Volvió a poner un juego en la ruleta'),
  revancha_ganada: () => 'Alguien ganó una revancha',
}
// El texto de una fila de auditoría; null si la acción no se conoce (se muestra el código).
// Las auto_* usan el mismo texto que la manual.
export function textoDeAccion(fila) {
  const fn = ACCIONES[fila.accion.replace(/^auto_/, '')]
  return fn ? fn(fila) : null
}

export const esAutomatico = (fila) => fila.admin_user_id == null || fila.accion.startsWith('auto_')

// "dd/mm hh:mm" en hora de Argentina
export function fechaHoraAR(iso) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  )
  const d2 = (s) => s.padStart(2, '0')
  return `${d2(p.day)}/${d2(p.month)} ${d2(p.hour)}:${d2(p.minute)}`
}

// Cómo se muestra el estado de un intento en la lista del admin: un chip o una línea de texto.
export function estadoDeIntento(i) {
  if (i.estado === 'completado') return i.motivo === 'corregido' ? { texto: 'corregido' } : { chip: 'valido' }
  if (i.estado === 'invalido') return { chip: 'fallado', motivo: i.motivo }
  if (i.motivo === 'colchon') return { texto: 'colchón' }
  if (i.motivo === 'fecha_cerrada') return { texto: 'cortado por el cierre' }
  if (i.motivo === 'fecha_cancelada') return { texto: 'cancelada' }
  return { texto: 'sin terminar' }
}

// Corregible (6.5): completado o inválido, ni práctica ni revancha.
export const esCorregible = (i) => (i.estado === 'completado' || i.estado === 'invalido') && i.numero >= 1 && !i.es_revancha
