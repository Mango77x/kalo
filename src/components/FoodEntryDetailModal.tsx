import { motion } from 'framer-motion'
import type { FoodEntry } from '../types'
import MacroChips from './MacroChips'

const SOURCE_LABEL: Record<FoodEntry['nutrition_source'], string> = {
  ai_estimate: 'Estimación IA',
  usda: 'USDA FoodData Central',
  open_food_facts: 'Open Food Facts',
}

const ENTRY_SOURCE_LABEL: Record<FoodEntry['source'], string> = {
  text: '✏️ Registrado por texto',
  photo: '📷 Registrado por foto',
  barcode: '🔖 Registrado por código de barras',
}

export default function FoodEntryDetailModal({
  entry,
  onClose,
}: {
  entry: FoodEntry
  onClose: () => void
}) {
  const hasRange =
    entry.calories_min != null &&
    entry.calories_max != null &&
    entry.calories_min !== entry.calories_max

  const consumedAt = new Date(entry.consumed_at).toLocaleString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-h-[85vh] sm:overflow-y-auto sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          ✕
        </button>

        <div className="pr-8">
          <p className="break-words text-lg font-semibold capitalize">
            {entry.food_name}
          </p>
          <p className="mt-1 text-xs capitalize text-neutral-500">
            {consumedAt}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
          <div>
            <p className="text-2xl font-semibold">
              {Math.round(entry.calories)}{' '}
              <span className="text-sm font-normal text-neutral-500">kcal</span>
            </p>
            {hasRange && (
              <p className="text-xs text-neutral-500">
                Rango estimado: {Math.round(entry.calories_min!)}–
                {Math.round(entry.calories_max!)} kcal
              </p>
            )}
          </div>
          {entry.estimated_grams && (
            <p className="text-sm text-neutral-500">
              ~{Math.round(entry.estimated_grams)} g
            </p>
          )}
        </div>

        <MacroChips
          protein_g={entry.protein_g}
          carbs_g={entry.carbs_g}
          fat_g={entry.fat_g}
        />

        <div className="flex flex-col gap-1 text-sm text-neutral-500">
          <p>{ENTRY_SOURCE_LABEL[entry.source]}</p>
          <p>
            Fuente de datos nutricionales:{' '}
            {SOURCE_LABEL[entry.nutrition_source]}
          </p>
        </div>

        {entry.raw_input && (
          <div className="rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800/50">
            <p className="mb-1 text-xs font-medium text-neutral-500">
              Lo que escribiste
            </p>
            <p className="whitespace-pre-wrap break-words text-neutral-700 dark:text-neutral-300">
              {entry.raw_input}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
