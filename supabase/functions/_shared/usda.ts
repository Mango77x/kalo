// Búsqueda en USDA FoodData Central para alimentos genéricos/frescos (pollo,
// arroz, huevo, fruta...) sin marca. Parte de la estrategia de resolución de
// nutrientes de _shared/nutrition-resolution.ts.
//
// Usa la DEMO_KEY pública de USDA (límite bajo, 30 req/hora compartido). Si
// hace falta más fiabilidad con más usuarios, pedir una key gratuita e
// instantánea en https://fdc.nal.usda.gov/api-key-signup.html y ponerla como
// secret USDA_API_KEY (mismo nombre que lee este fichero) — cero cambios de
// código.
//
// Detalle no obvio de la API: el nombre del nutriente de energía cambia
// según el dataset. Los alimentos "SR Legacy" usan "Energy"; los
// "Foundation" (más modernos) usan "Energy (Atwater General/Specific
// Factors)". Hay que aceptar cualquiera de los tres, filtrando por
// unitName='KCAL' (también existe una fila en kJ con el mismo nombre).
export interface UsdaNutrients {
  foodName: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

interface UsdaNutrientRow {
  nutrientName: string
  unitName: string
  value: number
}

const ENERGY_NAMES = [
  'Energy',
  'Energy (Atwater General Factors)',
  'Energy (Atwater Specific Factors)',
]

function findNutrient(
  nutrients: UsdaNutrientRow[],
  names: string[],
  unit: string
): number | null {
  for (const name of names) {
    const match = nutrients.find(
      (n) => n.nutrientName === name && n.unitName === unit
    )
    if (match) return match.value
  }
  return null
}

export async function searchUsda(query: string): Promise<UsdaNutrients | null> {
  if (!query.trim()) return null

  const apiKey = Deno.env.get('USDA_API_KEY') || 'DEMO_KEY'
  const params = new URLSearchParams({ query, api_key: apiKey, pageSize: '5' })
  params.append('dataType', 'Foundation')
  params.append('dataType', 'SR Legacy')

  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`
    )
    if (!res.ok) return null

    const data = await res.json()
    const foods = data?.foods ?? []

    // El primer resultado no siempre tiene el panel de macros completo
    // (algunos productos procesados en SR Legacy carecen de Energy/Protein);
    // se recorren los primeros resultados hasta encontrar uno con los 4
    // valores básicos presentes.
    for (const food of foods) {
      const nutrients: UsdaNutrientRow[] = food.foodNutrients ?? []
      const kcal = findNutrient(nutrients, ENERGY_NAMES, 'KCAL')
      const protein = findNutrient(nutrients, ['Protein'], 'G')
      const carbs = findNutrient(
        nutrients,
        ['Carbohydrate, by difference'],
        'G'
      )
      const fat = findNutrient(nutrients, ['Total lipid (fat)'], 'G')

      if (kcal != null && protein != null && carbs != null && fat != null) {
        return {
          foodName: food.description || query,
          caloriesPer100g: kcal,
          proteinPer100g: protein,
          carbsPer100g: carbs,
          fatPer100g: fat,
        }
      }
    }
    return null
  } catch {
    return null
  }
}
