import { supabase } from './supabaseClient'

// ---------- Temporadas ----------
export async function getTemporadas() {
  const { data, error } = await supabase
    .from('temporadas')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createTemporada({ nombre, fecha_inicio, fecha_fin }) {
  const { data, error } = await supabase
    .from('temporadas')
    .insert([{ nombre, fecha_inicio: fecha_inicio || null, fecha_fin: fecha_fin || null }])
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------- Jugadores ----------
export async function getJugadores() {
  const { data, error } = await supabase.from('jugadores').select('*').order('apodo')
  if (error) throw error
  return data
}

export async function createJugador(apodo) {
  const { data, error } = await supabase.from('jugadores').insert([{ apodo }]).select().single()
  if (error) throw error
  return data
}

// ---------- Juegos ----------
export async function getJuegos() {
  const { data, error } = await supabase.from('juegos').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function createJuego({ nombre, descripcion }) {
  const { data, error } = await supabase
    .from('juegos')
    .insert([{ nombre, descripcion }])
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------- Fechas ----------
export async function getFechas(temporadaId) {
  const { data, error } = await supabase
    .from('fechas')
    .select('*, juego:juegos(*)')
    .eq('temporada_id', temporadaId)
    .order('numero_fecha')
  if (error) throw error
  return data
}

export async function createFecha({ temporada_id, numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, record_mundial }) {
  const { data, error } = await supabase
    .from('fechas')
    .insert([{
      temporada_id,
      numero_fecha,
      fecha_calendario: fecha_calendario || null,
      juego_id,
      bonus_porcentaje: bonus_porcentaje || null,
      record_mundial: record_mundial || null,
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFecha(id, { numero_fecha, fecha_calendario, juego_id, bonus_porcentaje, record_mundial }) {
  const { data, error } = await supabase
    .from('fechas')
    .update({
      numero_fecha,
      fecha_calendario: fecha_calendario || null,
      juego_id,
      bonus_porcentaje: bonus_porcentaje || null,
      record_mundial: record_mundial || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFecha(id) {
  const { error } = await supabase.from('fechas').delete().eq('id', id)
  if (error) throw error
}

export async function getFechaDetalle(fechaId) {
  const { data, error } = await supabase
    .from('fechas')
    .select('*, juego:juegos(*), resultados(*, jugador:jugadores(*))')
    .eq('id', fechaId)
    .single()
  if (error) throw error
  return data
}

// ---------- Resultados ----------
// Crea o actualiza el resultado de un jugador en una fecha (fecha_id + jugador_id es único)
export async function upsertResultado(resultado) {
  const { data, error } = await supabase
    .from('resultados')
    .upsert([resultado], { onConflict: 'fecha_id,jugador_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteResultado(fechaId, jugadorId) {
  const { error } = await supabase
    .from('resultados')
    .delete()
    .eq('fecha_id', fechaId)
    .eq('jugador_id', jugadorId)
  if (error) throw error
}

// ---------- Récords históricos (por jugador + juego) ----------
export async function getRecordsPorJuego(juegoId) {
  const { data, error } = await supabase
    .from('records_jugador_juego')
    .select('*')
    .eq('juego_id', juegoId)
  if (error) throw error
  // Lo devolvemos como mapa { jugador_id: valor } para consultarlo fácil
  const mapa = {}
  data.forEach((r) => {
    mapa[r.jugador_id] = r.valor
  })
  return mapa
}

export async function upsertRecordHistorico({ jugador_id, juego_id, valor }) {
  if (!valor) return null // no pisamos el récord histórico si no cargaron nada nuevo
  const { data, error } = await supabase
    .from('records_jugador_juego')
    .upsert([{ jugador_id, juego_id, valor, actualizado_en: new Date().toISOString() }], {
      onConflict: 'jugador_id,juego_id',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------- Ranking ----------
// Suma las gemas de todos los resultados de una temporada, agrupado por jugador
export async function getRanking(temporadaId) {
  const { data, error } = await supabase
    .from('resultados')
    .select('gemas, jugador:jugadores(id, apodo), fecha:fechas!inner(temporada_id)')
    .eq('fecha.temporada_id', temporadaId)

  if (error) throw error

  const totales = {}
  for (const row of data) {
    const id = row.jugador.id
    if (!totales[id]) {
      totales[id] = { jugador_id: id, apodo: row.jugador.apodo, gemas: 0 }
    }
    totales[id].gemas += Number(row.gemas) || 0
  }

  return Object.values(totales).sort((a, b) => b.gemas - a.gemas)
}

// Evolución acumulada de gemas por fecha, para el gráfico del dashboard.
// Devuelve un array de puntos: { numero_fecha, [apodoJugador1]: gemasAcumuladas, ... }
export async function getEvolucionGemas(temporadaId) {
  const { data, error } = await supabase
    .from('resultados')
    .select('gemas, jugador:jugadores(id, apodo), fecha:fechas!inner(temporada_id, numero_fecha)')
    .eq('fecha.temporada_id', temporadaId)
    .order('fecha(numero_fecha)')

  if (error) throw error

  const numerosFecha = [...new Set(data.map((r) => r.fecha.numero_fecha))].sort((a, b) => a - b)
  const jugadoresMap = {}
  data.forEach((r) => {
    jugadoresMap[r.jugador.id] = r.jugador.apodo
  })

  const acumulados = {}
  Object.keys(jugadoresMap).forEach((id) => (acumulados[id] = 0))

  return numerosFecha.map((numero) => {
    const punto = { numero_fecha: numero }
    data
      .filter((r) => r.fecha.numero_fecha === numero)
      .forEach((r) => {
        acumulados[r.jugador.id] += Number(r.gemas) || 0
      })
    Object.entries(jugadoresMap).forEach(([id, apodo]) => {
      punto[apodo] = acumulados[id]
    })
    return punto
  })
}

// ---------- Notas / sanciones ----------
export async function getNotas(temporadaId) {
  const { data, error } = await supabase
    .from('resultados')
    .select('*, jugador:jugadores(apodo), fecha:fechas!inner(temporada_id, numero_fecha)')
    .eq('fecha.temporada_id', temporadaId)
    .or('sancionado.eq.true,nota.not.is.null')
    .order('fecha(numero_fecha)')
  if (error) throw error
  return data
}
