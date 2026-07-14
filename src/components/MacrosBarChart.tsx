import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { usePrefersDark } from '../hooks/usePrefersDark'
import { CHART_COLORS } from '../lib/chartColors'

interface Point {
  date: string
  label: string
  protein_g: number
  carbs_g: number
  fat_g: number
}

const LABELS: Record<string, string> = {
  protein_g: 'Proteína',
  carbs_g: 'Carbohidratos',
  fat_g: 'Grasa',
}

export default function MacrosBarChart({ data }: { data: Point[] }) {
  const dark = usePrefersDark()
  const c = dark ? CHART_COLORS.dark : CHART_COLORS.light
  const [proteinColor, carbsColor, fatColor] = c.categorical

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={c.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            tick={{ fill: c.axis, fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 11 }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: dark ? '#1a1a19' : '#fcfcfb',
              border: `1px solid ${c.grid}`,
              borderRadius: 8,
              fontSize: 12,
              color: c.ink,
            }}
            formatter={(value, name) => [
              `${Math.round(Number(value))} g`,
              LABELS[name as string] ?? name,
            ]}
          />
          <Legend
            formatter={(name: string) => (
              <span style={{ color: c.ink, fontSize: 12 }}>
                {LABELS[name] ?? name}
              </span>
            )}
          />
          <Bar
            dataKey="protein_g"
            stackId="macros"
            fill={proteinColor}
            radius={[0, 0, 0, 0]}
          />
          <Bar dataKey="carbs_g" stackId="macros" fill={carbsColor} />
          <Bar
            dataKey="fat_g"
            stackId="macros"
            fill={fatColor}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
