import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en la UI:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-2xl">😵</p>
          <div>
            <h1 className="font-semibold">Algo ha ido mal</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Recarga la página. Si el problema persiste, tus datos están a
              salvo en Supabase.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-brand-fg transition active:scale-[0.98]"
          >
            Recargar
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
