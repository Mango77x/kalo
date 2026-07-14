// Helpers compartidos entre log-text-entry y log-photo-entry: cliente
// autenticado como el usuario (respeta RLS, nunca service_role), categorías,
// y construcción de las filas a insertar en food_entries.
import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2'

export function createUserClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  )
}

export async function getAuthenticatedUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export interface FoodCategory {
  id: string
  name: string
}

export async function fetchCategories(
  supabase: SupabaseClient
): Promise<FoodCategory[]> {
  const { data, error } = await supabase.from('food_categories').select('id, name')
  if (error || !data) {
    throw new Error(`No se pudieron cargar las categorías: ${error?.message}`)
  }
  return data
}

export function categoryIdFor(
  categories: FoodCategory[],
  name: string
): string | null {
  const normalized = name.trim().toLowerCase()
  const match = categories.find((c) => c.name.toLowerCase() === normalized)
  if (match) return match.id
  return categories.find((c) => c.name.toLowerCase() === 'otros')?.id ?? null
}

// Esquema de la herramienta que Claude debe rellenar, idéntico para texto y
// foto: una lista de alimentos con su estimación nutricional.
export const FOOD_ITEMS_TOOL = {
  name: 'log_food_items',
  description:
    'Registra los alimentos detectados con su estimación nutricional.',
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
} as const

export interface ParsedFoodItem {
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

export function buildEntryRows(params: {
  userId: string
  items: ParsedFoodItem[]
  categories: FoodCategory[]
  source: 'text' | 'photo'
  rawInput: string | null
  consumedAt?: string
}) {
  return params.items.map((item) => ({
    user_id: params.userId,
    consumed_at: params.consumedAt ?? new Date().toISOString(),
    source: params.source,
    raw_input: params.rawInput,
    food_name: item.food_name,
    estimated_grams: item.estimated_grams,
    calories_min: item.calories_min,
    calories_max: item.calories_max,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    category_id: categoryIdFor(params.categories, item.category),
    nutrition_source: 'ai_estimate' as const,
  }))
}

export function jsonResponse(
  corsHeaders: Record<string, string>,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
