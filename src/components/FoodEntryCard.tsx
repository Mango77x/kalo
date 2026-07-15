import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { FoodEntry } from '../types'

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

export default function FoodEntryCard({ entry }: { entry: FoodEntry }) {
  const [deleting, setDeleting] = useState(false)

  const hasRange =
    entry.calories_min != null &&
    entry.calories_max != null &&
    entry.calories_min !== entry.calories_max

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${entry.food_name}"?`)) return
    setDeleting(true)
    const { error } = await supabase
      .from('food_entries')
      .delete()
      .eq('id', entry.id)
    if (error) {
      setDeleting(false)
      alert('No se pudo eliminar: ' + error.message)
      return
    }
    // La quitamos de la lista vía el evento Realtime DELETE (useEntriesForDate);
    // no hace falta tocar el estado local aquí.
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-lg">
          <span aria-hidden="true">{ENTRY_SOURCE_ICON[entry.source]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium capitalize">{entry.food_name}</p>
          <p className="text-xs text-neutral-500">
            {entry.estimated_grams
              ? `~${Math.round(entry.estimated_grams)} g · `
              : ''}
            {SOURCE_LABEL[entry.nutrition_source]}
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Eliminar ${entry.food_name}`}
          className="shrink-0 self-start rounded-full p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40"
        >
          🗑️
        </button>
      </div>
      <p className="pl-12 text-xs text-neutral-500">
        P {Math.round(entry.protein_g)}g · C {Math.round(entry.carbs_g)}g · G{' '}
        {Math.round(entry.fat_g)}g
      </p>
    </motion.li>
  )
}
