import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import TabBar from './TabBar'

export default function Layout() {
  const { session, signOut } = useAuth()
  const location = useLocation()

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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

      <TabBar />
    </div>
  )
}
