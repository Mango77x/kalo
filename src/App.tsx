import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Today from './pages/Today'

// Calendario e Histórico cargan Recharts/react-day-picker, la parte más
// pesada del bundle (~960KB, ver PROGRESO.md); separarlas en su propio
// chunk evita que el login/vista Hoy tengan que descargarlas de entrada.
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const History = lazy(() => import('./pages/History'))

function RouteFallback() {
  return <p className="p-4 text-center text-sm text-neutral-500">Cargando…</p>
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Today />} />
              <Route
                path="/calendario"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <CalendarPage />
                  </Suspense>
                }
              />
              <Route
                path="/historico"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <History />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
