import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { useEntriesForDate } from '../hooks/useEntriesForDate'
import FoodEntryCard from '../components/FoodEntryCard'

export default function CalendarPage() {
  const [selected, setSelected] = useState<Date>(new Date())
  const { entries, totals, loading } = useEntriesForDate(selected)

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

      <div className="mx-4 grid grid-cols-4 gap-2 rounded-lg bg-neutral-100 p-3 text-center dark:bg-neutral-900">
        <div>
          <p className="text-lg font-semibold">{Math.round(totals.calories)}</p>
          <p className="text-xs text-neutral-500">kcal</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{Math.round(totals.protein_g)}</p>
          <p className="text-xs text-neutral-500">prot. g</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{Math.round(totals.carbs_g)}</p>
          <p className="text-xs text-neutral-500">carb. g</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{Math.round(totals.fat_g)}</p>
          <p className="text-xs text-neutral-500">grasa g</p>
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
        {entries.map((entry) => (
          <FoodEntryCard key={entry.id} entry={entry} />
        ))}
      </ul>
    </main>
  )
}
