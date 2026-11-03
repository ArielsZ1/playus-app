import { useEffect, useMemo, useRef, useState } from 'react'
import { armarGrilla, armarResultado, estadoInicial, tocar } from './logica.js'

// Contrato común de juegos (spec §7). Textos: contrato de estados etapa 2, sección 3.

function Instrucciones() {
  const lineas = [
    ['Objetivo', 'Tocá los números del 1 al 16 en orden, lo más rápido que puedas.'],
    ['Cómo', 'La grilla de 4 × 4 aparece mezclada: tocá el 1, después el 2, y así.'],
    ['Si errás', 'Tocar un número equivocado suma 0.1 s y seguís buscando el mismo.'],
    ['Termina', 'Cuando tocás el 16.'],
    ['Cuenta', 'Gana el menor tiempo, con los errores sumados.'],
  ]
  return (
    <dl className="space-y-3">
      {lineas.map(([t, d]) => (
        <div key={t}>
          <dt className="stat-label">{t}</dt>
          <dd className="text-body text-ink">{d}</dd>
        </div>
      ))}
    </dl>
  )
}

function Juego({ semilla, onActividad, onTerminar }) {
  const grilla = useMemo(() => armarGrilla(semilla), [semilla])
  const [estado, setEstado] = useState(estadoInicial)
  const [ms, setMs] = useState(0)
  const [fallo, setFallo] = useState(null) // { numero, vez } para reiniciar la animación
  const inicio = useRef(0)
  const avisado = useRef(false)

  // El borde rubí dura 300ms (también con movimiento reducido)
  useEffect(() => {
    if (fallo?.numero == null) return
    const t = setTimeout(() => setFallo((f) => ({ ...f, numero: null })), 300)
    return () => clearTimeout(t)
  }, [fallo?.vez])

  // El tiempo arranca cuando la grilla ya está a la vista
  useEffect(() => {
    inicio.current = performance.now()
    const id = setInterval(() => setMs(performance.now() - inicio.current), 100)
    return () => clearInterval(id)
  }, [])

  function elegir(numero) {
    if (estado.terminado) return
    onActividad?.()
    const nuevo = tocar(estado, numero)
    if (nuevo.errores > estado.errores) setFallo({ numero, vez: nuevo.errores })
    setEstado(nuevo)
    if (nuevo.terminado && !avisado.current) {
      avisado.current = true
      const tiempo = performance.now() - inicio.current
      setMs(tiempo)
      onTerminar({ estado: 'completado', ...armarResultado(tiempo, nuevo.errores) })
    }
  }

  const segundos = (ms / 1000).toFixed(1)
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div aria-live="polite">
          <p className="stat-label">Siguiente</p>
          <p className="font-display text-4xl font-black tabular-nums text-ink">
            {estado.terminado ? '✓' : estado.esperado}
          </p>
        </div>
        <div className="relative text-right">
          <p className="stat-label">Tiempo</p>
          <p className="text-heading tabular-nums text-muted">{segundos} s</p>
          {fallo && (
            <span key={fallo.vez} className="nx-sube absolute right-0 -top-4 text-body-sm font-semibold text-ruby">
              +0.1 s
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto grid aspect-square w-full max-w-[28rem] grid-cols-4 gap-2 touch-manipulation select-none">
        {grilla.map((n) => {
          const usado = n < estado.esperado
          const error = fallo?.numero === n
          return (
            <button
              key={n}
              type="button"
              aria-label={`Número ${n}`}
              disabled={usado || estado.terminado}
              onPointerDown={(e) => {
                e.preventDefault()
                elegir(n)
              }}
              // teclado: el click sin puntero llega con detail 0
              onClick={(e) => e.detail === 0 && elegir(n)}
              className={`gem-panel-sm min-h-16 font-display text-2xl font-bold tabular-nums ring-0 focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_2px_#E8B54D] ${
                usado ? '[--fill:#1E1840] text-ghost' : 'text-ink active:[--fill:#2E2560]'
              } ${error ? 'nx-sacudir [--edge:#E8636F]' : ''}`}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default {
  modulo: 'count',
  tipo_de_resultado: 'MENOR_ES_MEJOR',
  unidad: 'ms',
  Instrucciones,
  Juego,
}
