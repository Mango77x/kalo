import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signInWithEmail } = useAuth()
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

  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand text-3xl text-brand-fg shadow-lg">
        🥗
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Kalo</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Inicia sesión con tu email para acceder a tus registros.
        </p>
      </div>

      {status === 'sent' ? (
        <p className="max-w-xs rounded-lg bg-brand/10 p-4 text-center text-sm text-brand-dark dark:text-brand">
          Te hemos enviado un enlace mágico a <strong>{email}</strong>. Ábrelo
          desde este dispositivo para iniciar sesión.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-xs flex-col gap-3"
        >
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
          {status === 'error' && (
            <p className="text-center text-sm text-red-600">{errorMsg}</p>
          )}
        </form>
      )}
    </main>
  )
}
