import { useEffect, useMemo, useRef, useState } from 'react'

// Solo animación: el juego ya lo sorteó el servidor (spec §3.3). Contrato etapa 2, sección 2.
const ALTO = 56 // px por nombre
const VUELTAS = 24 // nombres que pasan antes del elegido

export default function Ruleta({ nombres, elegido, onFin }) {
  const reducido = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const tira = useMemo(() => {
    const otros = nombres.filter((n) => n !== elegido)
    const pool = otros.length ? otros : [elegido]
    // shortcut: Math.random en la tira es decorativo; el resultado no depende de esto
    return [...Array.from({ length: VUELTAS }, () => pool[Math.floor(Math.random() * pool.length)]), elegido, pool[0]]
  }, [nombres, elegido])
  const [girando, setGirando] = useState(false)
  const avisado = useRef(false)

  function terminar() {
    if (avisado.current) return
    avisado.current = true
    setTimeout(onFin, 700)
  }

  useEffect(() => {
    if (reducido) return terminar()
    const id = requestAnimationFrame(() => setGirando(true))
    // por si transitionend no llega (pestaña en segundo plano): el giro dura 2500 ms
    const respaldo = setTimeout(terminar, 3500)
    return () => { cancelAnimationFrame(id); clearTimeout(respaldo) }
  }, [])

  if (reducido) {
    return <p className="py-6 text-center font-display text-heading font-bold text-ink">{elegido}</p>
  }

  const destino = -(tira.length - 2) * ALTO
  return (
    <div className="relative mx-auto overflow-hidden" style={{ height: ALTO * 3 }} aria-hidden="true">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-14 -translate-y-1/2 gem-panel-sm [--fill:transparent] [--edge:#E8B54D]" />
      <div
        className="absolute inset-x-0"
        style={{
          top: ALTO,
          transform: `translateY(${girando ? destino : 0}px)`,
          // frena con un pequeño rebote pasado el elegido
          transition: girando ? 'transform 2500ms cubic-bezier(0.15, 0.85, 0.3, 1.04)' : 'none',
        }}
        onTransitionEnd={terminar}
      >
        {tira.map((n, i) => (
          <p
            key={i}
            className="flex items-center justify-center truncate px-4 text-center font-display text-lg font-bold text-ink"
            style={{ height: ALTO }}
          >
            {n}
          </p>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-base to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-base to-transparent" />
    </div>
  )
}
