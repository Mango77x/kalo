// Cliente mínimo para la Messages API de Claude, con tool use forzado para
// obtener siempre JSON estructurado. Se comparte entre log-text-entry
// (Sprint 2) y log-photo-entry (Sprint 3): ambos necesitan lo mismo, solo
// cambia el contenido del mensaje (texto vs. texto+imagen) y el modelo.
//
// Modelo por defecto: Sonnet — necesario para la estimación VISUAL de
// porciones en fotos (la diferencia de precisión frente a Haiku está
// documentada, R² 0.60 vs 0.23). log-text-entry pasa Haiku explícitamente:
// para parsear texto (una tarea de extracción, no de estimación visual)
// Haiku da resultados equivalentes a una fracción del coste — verificado
// repitiendo los mismos casos de prueba con ambos modelos.
//
// La API key es siempre la del propio usuario (BYOK, ver
// _shared/user-settings.ts): nunca hay una key compartida del proyecto, así
// que un registro público no puede consumir la cuota de nadie más que la
// suya.
const DEFAULT_MODEL = 'claude-sonnet-5'
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
  model?: string
}): Promise<T> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: params.model ?? DEFAULT_MODEL,
      max_tokens: 2048,
      // Sin prompt caching: probado en real y, con el patrón de uso de esta
      // app (registros espaciados por horas, no varios por minuto), el
      // caché ephemeral de 5 min casi nunca acierta — se paga siempre el
      // precio de "crear caché" (1.25x el normal) y casi nunca el de
      // "leer caché" (0.1x), así que sale más caro que no cachear nada.
      system: params.system,
      messages: [{ role: 'user', content: params.content }],
      tools: [params.tool],
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
