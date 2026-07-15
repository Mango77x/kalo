// Edge Function: recibe texto libre ("2 huevos y una tostada con aguacate"),
// le pide a Claude que identifique los alimentos y estime sus nutrientes, y
// guarda una fila en food_entries por cada alimento detectado.
//
// La API key de Claude es la del propio usuario (BYOK, ver Ajustes en la
// app) — nunca una key compartida del proyecto, para que un registro
// público no pueda gastar la cuota de nadie más.
import { corsHeaders } from '../_shared/cors.ts'
import { callClaudeTool } from '../_shared/anthropic.ts'
import { fetchUserAnthropicKey } from '../_shared/user-settings.ts'
import { resolveNutrition } from '../_shared/nutrition-resolution.ts'
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

    const enrichedItems = await resolveNutrition(items)
    const calibrationFactors = await fetchCalibrationFactors(supabase, user.id)

    const rows = buildEntryRows({
      userId: user.id,
      items: enrichedItems,
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
  return `Eres un asistente nutricional. El usuario registra lo que ha comido, sin pesar nada, normalmente como una lista (un alimento por línea, al estilo de una lista de la compra: "2 huevos", "1 tostada con aguacate"). También puede escribir una frase en una sola línea. Tu tarea:

1. Identifica cada alimento o plato distinto. Si el texto tiene varias líneas, cada línea no vacía es POR DEFECTO un alimento distinto — no las combines entre sí aunque una línea contenga "y" o "de" (esos conectores describen los ingredientes DENTRO de esa línea, ej. "tortilla de dos huevos y una yema" en una sola línea es un único plato compuesto). Si todo viene en una sola línea con varios alimentos, trátalos como alimentos separados SOLO si están enumerados como cosas independientes (separados por comas o por "y" conectando platos completos, ej. "huevos fritos, arroz y ensalada" son 3 alimentos distintos); si la "y" o el "de" describen los ingredientes de un mismo plato, es UN único plato compuesto — no lo dividas.
2. Para cada uno, estima una ración razonable en gramos. No asumas raciones grandes por defecto: usa tamaños de ración habituales para un adulto, salvo que el texto indique explícitamente lo contrario (ej. "un plato grande", "ración doble", "un poco de").
3. Calcula calorías, proteína, carbohidratos y grasa para esa ración. Sé conservador especialmente con la proteína, que tiende a sobrestimarse en estimaciones sin pesar.
4. Da un rango de calorías (calories_min/calories_max, aprox. ±15-20% del valor central) que refleje la incertidumbre real de la estimación, no solo un número seco.
5. Si el alimento es un PRODUCTO ENVASADO de marca reconocible (bebida energética o refresco de lata, café de cápsula, snack envasado, yogur de marca, etc.), marca is_packaged_product=true y da en product_search_name un nombre de búsqueda limpio: marca + producto, sin cantidades ni adjetivos de color/sabor que no formen parte del nombre oficial (ej. "Monster Energy Ultra" en vez de "Monster ENERGY Ultra 500 ml blanco"). Si no, is_packaged_product=false y product_search_name = "".
6. Si es un ingrediente fresco o genérico SIN marca y SIN combinar con otros en un plato complejo (ej. "pollo a la plancha", "arroz blanco", "un huevo", "una manzana"), marca is_generic_food=true y da en usda_search_term_en un término de búsqueda en INGLÉS para USDA FoodData Central (ej. "chicken breast grilled", "white rice cooked", "egg raw", "apple raw"). Si es un plato compuesto con varios ingredientes mezclados (ej. "tortilla de dos huevos y una yema", "ensalada de tomate y cebolla") o ya es un producto envasado, is_generic_food=false y usda_search_term_en = "".
7. En cualquier caso (sea o no producto envasado o ingrediente genérico), calcula igualmente tu propia estimación de calorías/macros como si no fueras a poder consultar ninguna base de datos — se usa como respaldo si la búsqueda no encuentra el alimento.
8. Asigna cada alimento a UNA de estas categorías exactas: ${categoryNames.join(', ')}. Si ninguna encaja bien, usa "otros".

Responde únicamente invocando la herramienta proporcionada, con valores numéricos realistas.`
}
