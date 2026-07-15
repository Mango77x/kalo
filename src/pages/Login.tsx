import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.4 0 10.3-2 13.9-5.4l-6.4-5.4C29.4 34.9 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.4 5.4C41.5 35.9 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  )
}

export default function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  )
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const { error } = await signInWithEmail(email)
    if (error) {
      setErrorMsg(error)
      setStatus('error')
      return
    }
    setStatus('sent')
  }

  async function handleGoogleClick() {
    const { error } = await signInWithGoogle()
    if (error) {
      setErrorMsg(error)
      setStatus('error')
    }
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand text-3xl text-brand-fg shadow-lg">
        🥗
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Kalo</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Inicia sesión para acceder a tus registros.
        </p>
      </div>

      {status === 'sent' ? (
        <p className="max-w-xs rounded-lg bg-brand/10 p-4 text-center text-sm text-brand-dark dark:text-brand">
          Te hemos enviado un enlace mágico a <strong>{email}</strong>. Ábrelo
          desde este dispositivo para iniciar sesión.
        </p>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogleClick}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-700 transition active:scale-[0.98] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            o
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg bg-brand px-4 py-3 font-medium text-brand-fg transition active:scale-[0.98] disabled:opacity-60"
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar enlace mágico'}
            </button>
          </form>

          {status === 'error' && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </main>
  )
}
