import { AnimatePresence, motion } from 'framer-motion'
import type { FeedbackKind, FoodEntry } from '../types'

const SOURCE_LABEL: Record<FoodEntry['nutrition_source'], string> = {
  ai_estimate: 'Estimación IA',
  usda: 'USDA',
  open_food_facts: 'Open Food Facts',
}

const ENTRY_SOURCE_ICON: Record<FoodEntry['source'], string> = {
  text: '✏️',
  photo: '📷',
  barcode: '🔖',
}

const FEEDBACK_LABEL: Record<FeedbackKind, string> = {
  less: 'Menos de lo estimado',
  correct: 'Estimación acertada',
  more: 'Más de lo estimado',
}

export default function FoodEntryCard({
  entry,
  feedback,
  onFeedback,
}: {
  entry: FoodEntry
  feedback?: FeedbackKind
  onFeedback: (feedback: FeedbackKind) => void
}) {
  const hasRange =
    entry.calories_min != null &&
    entry.calories_max != null &&
    entry.calories_min !== entry.calories_max

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium capitalize">
            <span aria-hidden="true">{ENTRY_SOURCE_ICON[entry.source]}</span>{' '}
            {entry.food_name}
          </p>
          <p className="text-xs text-neutral-500">
            {entry.estimated_grams
              ? `~${Math.round(entry.estimated_grams)} g · `
              : ''}
            {SOURCE_LABEL[entry.nutrition_source]}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            P {Math.round(entry.protein_g)}g · C {Math.round(entry.carbs_g)}g ·
            G {Math.round(entry.fat_g)}g
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold">{Math.round(entry.calories)} kcal</p>
          {hasRange && (
            <p className="text-xs text-neutral-400">
              {Math.round(entry.calories_min!)}–
              {Math.round(entry.calories_max!)}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {feedback ? (
          <motion.p
            key="feedback-given"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-neutral-400"
          >
            {FEEDBACK_LABEL[feedback]}
          </motion.p>
        ) : (
          <motion.div
            key="feedback-buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800"
          >
            <p className="text-xs text-neutral-500">¿La ración era...?</p>
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={() => onFeedback('less')}
                className="rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700"
              >
                − Menos
              </button>
              <button
                type="button"
                onClick={() => onFeedback('correct')}
                className="rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700"
              >
                ✓ Bien
              </button>
              <button
                type="button"
                onClick={() => onFeedback('more')}
                className="rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700"
              >
                + Más
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}
