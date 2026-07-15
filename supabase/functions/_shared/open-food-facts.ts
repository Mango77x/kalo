// Búsqueda en Open Food Facts para productos envasados de marca (bebidas
// enlatadas, café de cápsula, snacks envasados...). Parte de la estrategia
// de resolución de nutrientes de _shared/nutrition-resolution.ts.
export interface OffNutrients {
  productName: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

export async function searchOpenFoodFacts(
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
