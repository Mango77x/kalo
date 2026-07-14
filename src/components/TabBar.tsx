import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Hoy', icon: '📋', end: true },
  { to: '/calendario', label: 'Calendario', icon: '📅', end: false },
  { to: '/historico', label: 'Histórico', icon: '📊', end: false },
] as const

export default function TabBar() {
  return (
    <nav className="sticky bottom-0 flex border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition ${
              isActive
                ? 'text-brand'
                : 'text-neutral-500 dark:text-neutral-400'
            }`
          }
        >
          <span className="text-xl" aria-hidden="true">
            {tab.icon}
          </span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
