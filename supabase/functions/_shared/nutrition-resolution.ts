import { round1, type ParsedFoodItem } from './food-entries.ts'
import { searchOpenFoodFacts } from './open-food-facts.ts'
import { searchUsda } from './usda.ts'

// Estrategia de resolución de nutrientes prevista en el brief original,
// implementada por fin de punta a punta: 1) producto envasado → Open Food
// Facts, 2) alimento fresco/genérico → USDA, 3) si ninguna base de datos lo
// tiene (o es un plato compuesto que no encaja en ninguna) → estimación
// directa de Claude, marcada como tal. La IA solo "inventa" un número
// cuando de verdad no hay un dato real que consultar.
export type NutritionSource = 'ai_estimate' | 'usda' | 'open_food_facts'

export interface ResolvedFoodItem extends ParsedFoodItem {
  nutrition_source: NutritionSource
}

export async function resolveNutrition(
  items: ParsedFoodItem[]
): Promise<ResolvedFoodItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (item.is_packaged_product && item.product_search_name) {
        const off = await searchOpenFoodFacts(item.product_search_name)
        if (off) {
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
        }
      }

      if (item.is_generic_food && item.usda_search_term_en) {
        const usda = await searchUsda(item.usda_search_term_en)
        if (usda) {
          const factor = item.estimated_grams / 100
          return {
            // A diferencia de Open Food Facts, NO sustituimos food_name por
            // la descripción de USDA (está en inglés y suele ser más
            // técnica, ej. "Chicken, breast, boneless, skinless, raw") — el
            // nombre en español que puso el usuario es más útil para él;
            // solo tomamos de USDA los números.
            ...item,
            calories: round1(usda.caloriesPer100g * factor),
            calories_min: round1(usda.caloriesPer100g * factor * 0.9),
            calories_max: round1(usda.caloriesPer100g * factor * 1.1),
            protein_g: round1(usda.proteinPer100g * factor),
            carbs_g: round1(usda.carbsPer100g * factor),
            fat_g: round1(usda.fatPer100g * factor),
            nutrition_source: 'usda' as const,
          }
        }
      }

      return { ...item, nutrition_source: 'ai_estimate' as const }
    })
  )
}
