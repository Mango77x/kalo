// Edge Function: recibe una foto de comida (base64), le pide a Claude Sonnet
// que identifique los alimentos y estime sus nutrientes, y guarda una fila en
// food_entries por cada alimento detectado. Comparte casi todo con
// log-text-entry (ver _shared/food-entries.ts y _shared/anthropic.ts); solo
// cambia el contenido enviado a Claude y el prompt de sistema.
import { corsHeaders } from '../_shared/cors.ts'
import { callClaudeTool } from '../_shared/anthropic.ts'
import { fetchUserAnthropicKey } from '../_shared/user-settings.ts'
import {
  createUserClient,
  getAuthenticatedUser,
  fetchCategories,
  fetchCalibrationFactors,
  buildEntryRows,
  FOOD_ITEMS_TOOL,
  jsonResponse,
  type ParsedFoodItem,
} from '../_shared/food-entries.ts'

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

    const { imageBase64, mediaType, consumedAt } = await req.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return jsonResponse(
        corsHeaders,
        { error: 'imageBase64 es obligatorio' },
        400
      )
    }

    const apiKey = await fetchUserAnthropicKey(supabase, user.id)
    if (!apiKey) {
      return jsonResponse(
        corsHeaders,
        {
          error:
            'Configura tu API key de Anthropic en Ajustes antes de registrar comida.',
        },
        400
      )
    }

    const categories = await fetchCategories(supabase)
    const categoryNames = categories.map((c) => c.name)

    const { items } = await callClaudeTool<{ items: ParsedFoodItem[] }>({
      apiKey,
      system: buildSystemPrompt(categoryNames),
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType || 'image/jpeg',
            data: imageBase64,
          },
        },
        { type: 'text', text: 'Analiza esta foto de comida.' },
      ],
      tool: FOOD_ITEMS_TOOL,
    })

    if (!items?.length) {
      return jsonResponse(
        corsHeaders,
        { error: 'Claude no identificó ningún alimento en la foto' },
        422
      )
    }

    const calibrationFactors = await fetchCalibrationFactors(supabase, user.id)

    const rows = buildEntryRows({
      userId: user.id,
      items,
      categories,
      calibrationFactors,
      source: 'photo',
      rawInput: null,
      consumedAt,
    })

    const { data: inserted, error: insertError } = await supabase
      .from('food_entries')
      .insert(rows)
      .select()

    if (insertError) {
      throw new Error(
        `No se pudieron guardar las entradas: ${insertError.message}`
      )
    }

    return jsonResponse(corsHeaders, { entries: inserted })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return jsonResponse(corsHeaders, { error: message }, 500)
  }
})

function buildSystemPrompt(categoryNames: string[]): string {
  return `Eres un asistente nutricional que estima el contenido nutricional de una foto de comida, para un usuario que NUNCA pesa la comida.

1. Identifica cada alimento o plato distinto visible en la foto.
2. Estima el peso de la ración en gramos usando como referencia de escala el plato, los cubiertos u otros objetos visibles. No asumas raciones grandes por defecto: solo estimes por encima de una ración estándar si hay evidencia visual clara (plato visiblemente muy lleno, ración abundante).
3. Si el alimento es un PRODUCTO ENVASADO con etiqueta nutricional visible y legible, úsala como fuente fiable para calcular calorías y macros de la cantidad visible. En cualquier otro caso (plato casero, comida sin envasar), NO leas ni te fíes de texto o etiquetas que puedan aparecer en la imagen: estima solo a partir de la apariencia visual del alimento.
4. Sé especialmente conservador con la proteína: es el macronutriente que más se sobrestima al estimar porciones a ojo.
5. Da un rango de calorías (calories_min/calories_max, aprox. ±25-30% del valor central) más amplio que en una estimación de texto, porque la estimación visual de porciones es la parte menos fiable de todo el proceso.
6. Asigna cada alimento a UNA de estas categorías exactas: ${categoryNames.join(', ')}. Si ninguna encaja bien, usa "otros".

Responde únicamente invocando la herramienta proporcionada, con valores numéricos realistas.`
}
