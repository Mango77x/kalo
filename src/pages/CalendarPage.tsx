import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { useEntriesForDate } from '../hooks/useEntriesForDate'
import FoodEntryCard from '../components/FoodEntryCard'
import CalorieRing from '../components/CalorieRing'
import MacroChips from '../components/MacroChips'

export default function CalendarPage() {
  const [selected, setSelected] = useState<Date>(new Date())
  const { entries, totals, loading, feedbackByEntry, submitFeedback } =
    useEntriesForDate(selected)

  return (
    <main className="flex flex-col gap-4 pb-4">
      <div className="flex justify-center px-4 pt-2">
        <DayPicker
          mode="single"
          required
          selected={selected}
          onSelect={setSelected}
          locale={es}
          disabled={{ after: new Date() }}
          className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
        />
      </div>

      <div className="mx-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <CalorieRing calories={totals.calories} />
        <div className="mt-3">
          <MacroChips
            protein_g={totals.protein_g}
            carbs_g={totals.carbs_g}
            fat_g={totals.fat_g}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-2 px-4">
        {loading && (
          <p className="text-center text-sm text-neutral-500">Cargando…</p>
        )}
        {!loading && entries.length === 0 && (
          <p className="text-center text-sm text-neutral-500">
            No hay registros para este día.
          </p>
        )}
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <FoodEntryCard
              key={entry.id}
              entry={entry}
              feedback={feedbackByEntry[entry.id]}
              onFeedback={(feedback) => submitFeedback(entry.id, feedback)}
            />
          ))}
        </AnimatePresence>
      </ul>
    </main>
  )
}
