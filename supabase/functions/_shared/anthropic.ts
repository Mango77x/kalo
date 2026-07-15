// Cliente mínimo para la Messages API de Claude, con tool use forzado para
// obtener siempre JSON estructurado. Se comparte entre log-text-entry
// (Sprint 2) y log-photo-entry (Sprint 3): ambos necesitan lo mismo, solo
// cambia el contenido del mensaje (texto vs. texto+imagen).
//
// Modelo: Sonnet, no Haiku — la diferencia de precio es de céntimos al mes
// pero la precisión (sobre todo en estimación visual de porciones) es
// sustancialmente mejor con Sonnet.
//
// La API key es siempre la del propio usuario (BYOK, ver _shared/user-settings.ts):
// nunca hay una key compartida del proyecto, así que un registro público no
// puede consumir la cuota de nadie más que la suya.
const MODEL = 'claude-sonnet-5'
const ANTHROPIC_VERSION = '2023-06-01'

export interface ClaudeContentBlock {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface ClaudeToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export async function callClaudeTool<T>(params: {
  apiKey: string
  system: string
  content: string | ClaudeContentBlock[]
  tool: ClaudeToolDefinition
}): Promise<T> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      // El system prompt y el esquema de la herramienta apenas cambian entre
      // llamadas (solo varía la lista de categorías, casi siempre la misma
      // taxonomía fija) — cachearlos con prompt caching de Anthropic evita
      // reprocesarlos como tokens nuevos en cada registro.
      system: [
        {
          type: 'text',
          text: params.system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: params.content }],
      tools: [{ ...params.tool, cache_control: { type: 'ephemeral' } }],
      tool_choice: { type: 'tool', name: params.tool.name },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const toolUseBlock = data.content?.find(
    (block: { type: string }) => block.type === 'tool_use'
  )

  if (!toolUseBlock) {
    throw new Error('Claude no devolvió un tool_use con la estructura esperada')
  }

  return toolUseBlock.input as T
}
