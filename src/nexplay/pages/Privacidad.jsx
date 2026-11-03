import { Link } from 'react-router-dom'

// Página pública que Google pide para pasar la app de OAuth a producción.
export default function Privacidad() {
  return (
    <article className="space-y-6 pt-2 pb-8">
      <Link to="/" className="inline-block py-2 text-body-sm text-muted hover:text-ink">← NEXPLAY</Link>
      <h1 className="font-display text-heading font-bold text-ink">Política de privacidad</h1>
      <p className="text-caption text-faint">Última actualización: 2 de noviembre de 2026</p>

      <Bloque titulo="Qué es NEXPLAY">
        NEXPLAY es la parte de juegos de Playus, un torneo entre amigos. Para entrar hace falta una invitación del admin del grupo.
      </Bloque>

      <Bloque titulo="Qué datos guardamos">
        Cuando entrás con Google guardamos tu nombre, tu mail y el identificador de tu cuenta de Google. También guardamos el
        estado de tu cuenta (pendiente, aceptada o bloqueada), qué jugador del torneo sos y, más adelante, tus resultados en los
        juegos. No guardamos tu contraseña de Google ni accedemos a tus contactos, archivos ni a ningún otro dato de tu cuenta.
      </Bloque>

      <Bloque titulo="Para qué los usamos">
        Solo para que puedas entrar, para que el admin sepa quién sos al aceptarte y para mostrar los resultados del torneo.
        Tu nombre de jugador y tus resultados se ven públicamente en Playus, como siempre. Tu mail no se muestra a nadie más que
        al admin.
      </Bloque>

      <Bloque titulo="Dónde se guardan">
        En la base de datos del torneo, alojada en Supabase. No vendemos ni compartimos tus datos con nadie y no hay publicidad.
      </Bloque>

      <Bloque titulo="Borrar tu cuenta">
        Si querés que borremos tu cuenta y tus datos, pedíselo al admin del grupo. Tus resultados de fechas ya jugadas pueden
        quedar en la historia del torneo con tu apodo.
      </Bloque>
    </article>
  )
}

function Bloque({ titulo, children }) {
  return (
    <section className="space-y-2">
      <h2 className="stat-label">{titulo}</h2>
      <p className="text-body text-muted">{children}</p>
    </section>
  )
}
