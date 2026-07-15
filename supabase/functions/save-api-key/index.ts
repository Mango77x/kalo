// Edge Function: recibe la API key de Anthropic del usuario en texto plano
// (por HTTPS, autenticado), la cifra (ver _shared/crypto.ts) y guarda solo
// el texto cifrado en user_settings. El frontend nunca hace el upsert
// directamente para que la key jamás quede en texto plano en la base de
// datos.
import { corsHeaders } from '../_shared/cors.ts'
import {
  createUserClient,
  getAuthenticatedUser,
  jsonResponse,
} from '../_shared/food-entries.ts'
import { encryptSecret } from '../_shared/crypto.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createUserClient(req)
    const user = await getAuthenticatedUser(supabase)
    if (!user) {
      return jsonResponse(corsHeaders, { error: 'No autenticado' }, 401)
    }

    const { apiKey } = await req.json()
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return jsonResponse(corsHeaders, { error: 'apiKey es obligatorio' }, 400)
    }

    const encrypted = await encryptSecret(apiKey.trim())

    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      anthropic_api_key: encrypted,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      throw new Error(`No se pudo guardar la API key: ${error.message}`)
    }

    return jsonResponse(corsHeaders, { ok: true })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return jsonResponse(corsHeaders, { error: message }, 500)
  }
})
