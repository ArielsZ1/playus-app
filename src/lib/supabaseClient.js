import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// `npm run dev:practica` usa el esquema "practica" (datos ficticios) en vez de "public" (datos reales).
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: import.meta.env.VITE_SUPABASE_SCHEMA || 'public' },
})
