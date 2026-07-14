import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import TabBar from './TabBar'

export default function Layout() {
  const { session, signOut } = useAuth()

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <span className="font-semibold">🥗 Kalo</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">
            {session?.user.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

      <TabBar />
    </div>
  )
}
