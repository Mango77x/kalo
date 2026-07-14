// Edge Function: recibe texto libre ("2 huevos y una tostada con aguacate"),
// le pide a Claude que identifique los alimentos y estime sus nutrientes, y
// guarda una fila en food_entries por cada alimento detectado.
//
// La API key de Claude vive solo aquí (secret de Supabase), nunca en el
// frontend. Ver src/lib/supabase.ts para el lado cliente.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { callClaudeTool } from '../_shared/anthropic.ts'

interface ParsedItem {
  food_name: string
  estimated_grams: number
  calories: number
  calories_min: number
  calories_max: number
  protein_g: number
  carbs_g: number
  fat_g: number
  category: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { rawInput, consumedAt } = await req.json()

    if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
      return jsonResponse({ error: 'rawInput es obligatorio' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'No autenticado' }, 401)
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('food_categories')
      .select('id, name')

    if (categoriesError || !categories) {
      throw new Error(
        `No se pudieron cargar las categorías: ${categoriesError?.message}`
      )
    }

    const categoryNames = categories.map((c) => c.name)

    const { items } = await callClaudeTool<{ items: ParsedItem[] }>({
      system: buildSystemPrompt(categoryNames),
      content: rawInput,
      tool: {
        name: 'log_food_items',
        description:
          'Registra los alimentos detectados en el texto con su estimación nutricional.',
        input_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  food_name: {
                    type: 'string',
                    description:
                      'Nombre descriptivo del alimento o plato, tal como lo diría un usuario.',
                  },
                  estimated_grams: { type: 'number' },
                  calories: { type: 'number' },
                  calories_min: { type: 'number' },
                  calories_max: { type: 'number' },
                  protein_g: { type: 'number' },
                  carbs_g: { type: 'number' },
                  fat_g: { type: 'number' },
                  category: {
                    type: 'string',
                    description: 'Una de las categorías exactas proporcionadas.',
                  },
                },
                required: [
                  'food_name',
                  'estimated_grams',
                  'calories',
                  'calories_min',
                  'calories_max',
                  'protein_g',
                  'carbs_g',
                  'fat_g',
                  'category',
                ],
              },
            },
          },
          required: ['items'],
        },
      },
    })

    if (!items?.length) {
      return jsonResponse({ error: 'Claude no identificó ningún alimento' }, 422)
    }

    const categoryIdByName = new Map(
      categories.map((c) => [normalizeCategory(c.name), c.id])
    )
    const otrosId = categoryIdByName.get('otros') ?? null

    const rows = items.map((item) => ({
      user_id: user.id,
      consumed_at: consumedAt ?? new Date().toISOString(),
      source: 'text' as const,
      raw_input: rawInput,
      food_name: item.food_name,
      estimated_grams: item.estimated_grams,
      calories_min: item.calories_min,
      calories_max: item.calories_max,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      category_id: categoryIdByName.get(normalizeCategory(item.category)) ?? otrosId,
      nutrition_source: 'ai_estimate' as const,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('food_entries')
      .insert(rows)
      .select()

    if (insertError) {
      throw new Error(`No se pudieron guardar las entradas: ${insertError.message}`)
    }

    return jsonResponse({ entries: inserted })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return jsonResponse({ error: message }, 500)
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

function normalizeCategory(s: string): string {
  return s.trim().toLowerCase()
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
