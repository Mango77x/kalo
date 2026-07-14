import { useMemo, useState } from 'react'
import { useDailySummaries } from '../hooks/useDailySummaries'
import CaloriesTrendChart from '../components/CaloriesTrendChart'
import MacrosBarChart from '../components/MacrosBarChart'
import type { DailySummary } from '../types'

const PERIODS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
] as const

function buildChartData(summaries: DailySummary[], days: number) {
  const byDate = new Map(summaries.map((s) => [s.date, s]))
  const points = []
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - (days - 1))

  for (let i = 0; i < days; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const summary = byDate.get(key)
    points.push({
      date: key,
      label: cursor.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      }),
      calories: summary?.total_calories ?? 0,
      protein_g: summary?.total_protein_g ?? 0,
      carbs_g: summary?.total_carbs_g ?? 0,
      fat_g: summary?.total_fat_g ?? 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return points
}

export default function History() {
  const [days, setDays] = useState<7 | 30>(7)
  const { summaries, loading } = useDailySummaries(days)
  const data = useMemo(() => buildChartData(summaries, days), [summaries, days])

  const hasAnyData = summaries.length > 0

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex justify-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              days === p.days
                ? 'bg-brand text-brand-fg'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-center text-sm text-neutral-500">Cargando…</p>
      )}

      {!loading && !hasAnyData && (
        <p className="text-center text-sm text-neutral-500">
          Todavía no hay suficiente histórico para mostrar tendencias.
        </p>
      )}

      {!loading && hasAnyData && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Calorías por día
            </h2>
            <CaloriesTrendChart data={data} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Macronutrientes por día
            </h2>
            <MacrosBarChart data={data} />
          </section>
        </>
      )}
    </main>
  )
}
