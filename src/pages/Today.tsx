import { useTodayEntries } from '../hooks/useTodayEntries'
import TextEntryForm from '../components/TextEntryForm'
import PhotoEntryForm from '../components/PhotoEntryForm'
import FoodEntryCard from '../components/FoodEntryCard'

export default function Today() {
  const { entries, totals, loading } = useTodayEntries()

  return (
    <main className="flex flex-col gap-4 pb-4">
      <TextEntryForm />
      <PhotoEntryForm />

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
            Todavía no has registrado nada hoy.
          </p>
        )}
        {entries.map((entry) => (
          <FoodEntryCard key={entry.id} entry={entry} />
        ))}
      </ul>
    </main>
  )
}
