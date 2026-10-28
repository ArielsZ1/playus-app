// Íconos de los premios automáticos (premio.icono en src/lib/premios.js)
const ICONOS = {
  corona: <path d="M3 18 2 7l5 4 5-7 5 7 5-4-1 11Z M3 21h18" />,
  trofeo: <path d="M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M17 5h3v2a3 3 0 0 1-3 3 M7 5H4v2a3 3 0 0 0 3 3" />,
  medalla: <path d="M8 2l4 7 4-7 M12 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 13v6" />,
  diana: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12h.01" />,
  calendario: <path d="M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4 M9 15l2 2 4-4" />,
  flecha: <path d="M3 17l6-6 4 4 8-8 M15 7h6v6" />,
  llama: <path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z" />,
  escudo: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4" />,
}

export default function IconoPremio({ nombre, tamano = 28 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONOS[nombre]}
    </svg>
  )
}
