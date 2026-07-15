import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fallamos ruidosamente en desarrollo: sin credenciales no hay app.
  // Las claves reales van en .env (no versionado); ver .env.example.
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y rellénalas.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // PKCE (el flow por defecto de supabase-js) exige que el enlace mágico se
    // abra en el MISMO navegador que lo pidió, porque guarda el
    // code_verifier en localStorage de esa pestaña. En móvil, el enlace del
    // email casi siempre se abre desde la app de Mail (un contexto de
    // navegador distinto, sin acceso a ese localStorage), y el intercambio
    // de sesión falla mostrando el JSON crudo del endpoint de verify ("{}").
    // El flow implícito mete los tokens directamente en el hash de la URL de
    // redirección, así que funciona sin importar dónde se abra el enlace.
    flowType: 'implicit',
  },
})
