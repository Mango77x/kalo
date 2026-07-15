export default function MacroChips({
  protein_g,
  carbs_g,
  fat_g,
}: {
  protein_g: number
  carbs_g: number
  fat_g: number
}) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 rounded-lg bg-blue-50 p-2 text-center dark:bg-blue-950/40">
        <p className="font-semibold text-blue-700 dark:text-blue-300">
          {Math.round(protein_g)}g
        </p>
        <p className="text-[10px] text-blue-700 dark:text-blue-300">Proteína</p>
      </div>
      <div className="flex-1 rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-950/40">
        <p className="font-semibold text-amber-700 dark:text-amber-300">
          {Math.round(carbs_g)}g
        </p>
        <p className="text-[10px] text-amber-700 dark:text-amber-300">Carbos</p>
      </div>
      <div className="flex-1 rounded-lg bg-rose-50 p-2 text-center dark:bg-rose-950/40">
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          {Math.round(fat_g)}g
        </p>
        <p className="text-[10px] text-rose-700 dark:text-rose-300">Grasa</p>
      </div>
    </div>
  )
}
