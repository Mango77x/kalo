import type { FoodEntry } from '../types'

const SOURCE_LABEL: Record<FoodEntry['nutrition_source'], string> = {
  ai_estimate: 'Estimación IA',
  usda: 'USDA',
  open_food_facts: 'Open Food Facts',
}

export default function FoodEntryCard({ entry }: { entry: FoodEntry }) {
  const hasRange =
    entry.calories_min != null &&
    entry.calories_max != null &&
    entry.calories_min !== entry.calories_max

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div>
        <p className="font-medium capitalize">{entry.food_name}</p>
        <p className="text-xs text-neutral-500">
          {entry.estimated_grams ? `~${Math.round(entry.estimated_grams)} g · ` : ''}
          {SOURCE_LABEL[entry.nutrition_source]}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          P {Math.round(entry.protein_g)}g · C {Math.round(entry.carbs_g)}g · G{' '}
          {Math.round(entry.fat_g)}g
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold">{Math.round(entry.calories)} kcal</p>
        {hasRange && (
          <p className="text-xs text-neutral-400">
            {Math.round(entry.calories_min!)}–{Math.round(entry.calories_max!)}
          </p>
        )}
      </div>
    </li>
  )
}
