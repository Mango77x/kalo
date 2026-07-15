// Meta diaria: valor de referencia fijo (no hay pantalla de ajustes en el
// brief). Se muestra como orientación visual, no como límite estricto.
const DEFAULT_GOAL = 2000

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function CalorieRing({
  calories,
  goal = DEFAULT_GOAL,
}: {
  calories: number
  goal?: number
}) {
  const pct = Math.max(0, Math.min(1, calories / goal))
  const offset = CIRCUMFERENCE * (1 - pct)

  return (
    <div className="flex items-center gap-4">
      <svg width="86" height="86" viewBox="0 0 86 86" className="shrink-0">
        <circle
          cx="43"
          cy="43"
          r={RADIUS}
          fill="none"
          className="stroke-neutral-200 dark:stroke-neutral-800"
          strokeWidth="8"
        />
        <circle
          cx="43"
          cy="43"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          className="text-brand"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 43 43)"
        />
      </svg>
      <div>
        <p className="text-xl font-semibold">
          {Math.round(calories)}{' '}
          <span className="text-sm font-normal text-neutral-500">kcal</span>
        </p>
        <p className="text-xs text-neutral-500">de {goal} objetivo</p>
      </div>
    </div>
  )
}
