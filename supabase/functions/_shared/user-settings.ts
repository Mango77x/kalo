import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { decryptSecret } from './crypto.ts'

// BYOK: cada usuario guarda su propia API key de Anthropic en user_settings,
// cifrada en reposo (ver _shared/crypto.ts y la Edge Function
// save-api-key). Sin key propia, no puede usar el registro por texto/foto —
// así un registro público nunca consume la cuota de otro usuario.
export async function fetchUserAnthropicKey(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('anthropic_api_key')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `No se pudo leer la configuración del usuario: ${error.message}`
    )
  }

  if (!data?.anthropic_api_key) return null
  return decryptSecret(data.anthropic_api_key)
}
