import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useTodayEntries } from '../hooks/useTodayEntries'
import FoodEntryCard from '../components/FoodEntryCard'
import CalorieRing from '../components/CalorieRing'
import MacroChips from '../components/MacroChips'
import EntryModal from '../components/EntryModal'

export default function Today() {
  const { entries, totals, loading } = useTodayEntries()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="flex flex-col gap-4 pb-4">
      <div className="mx-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <CalorieRing calories={totals.calories} />
        <div className="mt-3">
          <MacroChips
            protein_g={totals.protein_g}
            carbs_g={totals.carbs_g}
            fat_g={totals.fat_g}
          />
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-3 w-full rounded-xl bg-brand px-4 py-3 font-medium text-brand-fg transition active:scale-[0.98]"
        >
          + Registrar comida
        </button>
      </div>

      <ul className="flex flex-col gap-2 px-4">
        {loading && (
          <p className="text-center text-sm text-neutral-500">Cargando…</p>
        )}
        {!loading && entries.length === 0 && (
          <p className="text-center text-sm text-neutral-500">
            Todavía no has registrado nada hoy.
          </p>
        )}
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <FoodEntryCard key={entry.id} entry={entry} />
          ))}
        </AnimatePresence>
      </ul>

      {modalOpen && <EntryModal onClose={() => setModalOpen(false)} />}
    </main>
  )
}
