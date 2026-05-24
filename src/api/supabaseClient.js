import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL o Anon Key mancanti. Controlla il file .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Funzione helper per debug
export const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...')
  const { data, error } = await supabase.from('restaurants').select('count')
  if (error) console.error('Supabase error:', error)
  else console.log('✅ Supabase connected successfully', data)
}

export default supabase