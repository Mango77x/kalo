// Edge Function: recibe texto libre ("2 huevos y una tostada con aguacate"),
// le pide a Claude que identifique los alimentos y estime sus nutrientes, y
// guarda una fila en food_entries por cada alimento detectado.
//
// La API key de Claude vive solo aquí (secret de Supabase), nunca en el
// frontend. Ver src/lib/supabase.ts para el lado cliente.
import { corsHeaders } from '../_shared/cors.ts'
import { callClaudeTool } from '../_shared/anthropic.ts'
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

    const { rawInput, consumedAt } = await req.json()

    if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
      return jsonResponse(
        corsHeaders,
        { error: 'rawInput es obligatorio' },
        400
      )
    }

    const categories = await fetchCategories(supabase)
    const categoryNames = categories.map((c) => c.name)

    const { items } = await callClaudeTool<{ items: ParsedFoodItem[] }>({
      system: buildSystemPrompt(categoryNames),
      content: rawInput,
      tool: FOOD_ITEMS_TOOL,
    })

    if (!items?.length) {
      return jsonResponse(
        corsHeaders,
        { error: 'Claude no identificó ningún alimento' },
        422
      )
    }

    const calibrationFactors = await fetchCalibrationFactors(supabase, user.id)

    const rows = buildEntryRows({
      userId: user.id,
      items,
      categories,
      calibrationFactors,
      source: 'text',
      rawInput,
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
  return `Eres un asistente nutricional. El usuario describe en texto libre y en español informal lo que ha comido, sin pesar nada. Tu tarea:

1. Identifica cada alimento o plato distinto mencionado. Si vienen separados por comas o "y", son alimentos distintos; una descripción como "tostada con aguacate" es UN único plato compuesto, no lo dividas.
2. Para cada uno, estima una ración razonable en gramos. No asumas raciones grandes por defecto: usa tamaños de ración habituales para un adulto, salvo que el texto indique explícitamente lo contrario (ej. "un plato grande", "ración doble", "un poco de").
3. Calcula calorías, proteína, carbohidratos y grasa para esa ración. Sé conservador especialmente con la proteína, que tiende a sobrestimarse en estimaciones sin pesar.
4. Da un rango de calorías (calories_min/calories_max, aprox. ±15-20% del valor central) que refleje la incertidumbre real de la estimación, no solo un número seco.
5. Asigna cada alimento a UNA de estas categorías exactas: ${categoryNames.join(', ')}. Si ninguna encaja bien, usa "otros".

Responde únicamente invocando la herramienta proporcionada, con valores numéricos realistas.`
}
