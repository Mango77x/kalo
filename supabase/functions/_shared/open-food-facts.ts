import { round1, type ParsedFoodItem } from './food-entries.ts'

// Cruce con Open Food Facts para productos envasados de marca (bebidas
// enlatadas, café de cápsula, snacks envasados...). Sin esto, Claude solo
// "adivina" los nutrientes de un producto con etiqueta real conocible —
// bastante menos fiable que consultar la base de datos real. Es el paso de
// la estrategia de resolución de nutrientes del brief que habíamos dejado
// pendiente en los Sprints 2/3 ("nutrition_source siempre ai_estimate").
interface OffNutrients {
  productName: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

async function searchOpenFoodFacts(
  query: string
): Promise<OffNutrients | null> {
  if (!query.trim()) return null

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=1`

  try {
    const res = await fetch(url, {
      // Open Food Facts pide un User-Agent descriptivo en su política de uso.
      headers: {
        'User-Agent': 'Kalo-CalorieTracker/1.0 (antoinegizpa@gmail.com)',
      },
    })
    if (!res.ok) return null

    const data = await res.json()
    const product = data?.products?.[0]
    const n = product?.nutriments
    const kcal = n?.['energy-kcal_100g']
    if (typeof kcal !== 'number') return null

    return {
      productName: product.product_name || query,
      caloriesPer100g: kcal,
      proteinPer100g: n['proteins_100g'] ?? 0,
      carbsPer100g: n['carbohydrates_100g'] ?? 0,
      fatPer100g: n['fat_100g'] ?? 0,
    }
  } catch {
    // Fallo de red/formato: seguimos con la estimación de Claude en vez de
    // romper el registro entero por esto.
    return null
  }
}

export interface EnrichedFoodItem extends ParsedFoodItem {
  nutrition_source: 'ai_estimate' | 'open_food_facts'
}

// Para los alimentos que Claude marcó como producto envasado, intenta
// sustituir su estimación por los nutrientes reales de Open Food Facts
// (escalados a los gramos estimados). Si no encuentra el producto, se queda
// con la estimación de Claude tal cual (fallback, marcado como ai_estimate).
export async function enrichWithOpenFoodFacts(
  items: ParsedFoodItem[]
): Promise<EnrichedFoodItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.is_packaged_product || !item.product_search_name) {
        return { ...item, nutrition_source: 'ai_estimate' as const }
      }

      const off = await searchOpenFoodFacts(item.product_search_name)
      if (!off) {
        return { ...item, nutrition_source: 'ai_estimate' as const }
      }

      const factor = item.estimated_grams / 100
      return {
        ...item,
        food_name: off.productName,
        calories: round1(off.caloriesPer100g * factor),
        calories_min: round1(off.caloriesPer100g * factor * 0.9),
        calories_max: round1(off.caloriesPer100g * factor * 1.1),
        protein_g: round1(off.proteinPer100g * factor),
        carbs_g: round1(off.carbsPer100g * factor),
        fat_g: round1(off.fatPer100g * factor),
        nutrition_source: 'open_food_facts' as const,
      }
    })
  )
}
