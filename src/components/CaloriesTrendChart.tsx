import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { usePrefersDark } from '../hooks/usePrefersDark'
import { CHART_COLORS } from '../lib/chartColors'

interface Point {
  date: string
  label: string
  calories: number
}

export default function CaloriesTrendChart({ data }: { data: Point[] }) {
  const dark = usePrefersDark()
  const c = dark ? CHART_COLORS.dark : CHART_COLORS.light
  const color = c.categorical[0]

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="caloriesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
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
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: dark ? '#1a1a19' : '#fcfcfb',
              border: `1px solid ${c.grid}`,
              borderRadius: 8,
              fontSize: 12,
              color: c.ink,
            }}
            formatter={(value) => [`${Math.round(Number(value))} kcal`, 'Calorías']}
          />
          <Area
            type="monotone"
            dataKey="calories"
            stroke={color}
            strokeWidth={2}
            fill="url(#caloriesFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
