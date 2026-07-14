import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-brand" />
      </main>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
