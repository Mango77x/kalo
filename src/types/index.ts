// Tipos de dominio de Kalo. Se corresponden 1:1 con el esquema de Postgres.

export type FoodSource = 'text' | 'photo' | 'barcode'
export type NutritionSource = 'open_food_facts' | 'usda' | 'ai_estimate'
export type FeedbackKind = 'less' | 'correct' | 'more'

export interface FoodCategory {
  id: string
  name: string
}

export interface FoodEntry {
  id: string
  user_id: string
  created_at: string
  consumed_at: string
  source: FoodSource
  raw_input: string | null
  food_name: string
  estimated_grams: number | null
  // Rango de confianza de calorías: comunicamos estimación, no dato exacto.
  calories_min: number | null
  calories_max: number | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  category_id: string | null
  nutrition_source: NutritionSource
}

export interface CalibrationFactor {
  id: string
  user_id: string
  category_id: string
  correction_multiplier: number
  sample_count: number
  updated_at: string
}

export interface CalibrationFeedback {
  id: string
  food_entry_id: string
  user_id: string
  feedback: FeedbackKind
  created_at: string
}

export interface DailySummary {
  id: string
  user_id: string
  date: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
}
