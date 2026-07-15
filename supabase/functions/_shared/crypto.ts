// Cifrado simétrico (AES-GCM) para secretos en reposo — la API key de
// Anthropic de cada usuario nunca se guarda en texto plano en la base de
// datos. Solo esta Edge Function (con el secret SETTINGS_ENCRYPTION_KEY,
// que nunca sale de Supabase) puede descifrarla; ni el frontend ni una
// fuga directa de la tabla user_settings exponen la key real.
async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SETTINGS_ENCRYPTION_KEY')
  if (!secret) {
    throw new Error(
      'Falta el secret SETTINGS_ENCRYPTION_KEY en la Edge Function'
    )
  }
  const raw = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

// Formato almacenado: "<iv en base64>.<texto cifrado en base64>"
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`
}

export async function decryptSecret(stored: string): Promise<string> {
  const key = await getKey()
  const [ivB64, ctB64] = stored.split('.')
  const iv = fromBase64(ivB64)
  const ciphertext = fromBase64(ctB64)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return new TextDecoder().decode(plaintext)
}
