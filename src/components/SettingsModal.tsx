import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { session } = useAuth()
  const [hasKey, setHasKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>(
    'idle'
  )
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!session) return
    supabase
      .from('user_settings')
      .select('anthropic_api_key')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setHasKey(!!data?.anthropic_api_key))
  }, [session])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!session || !apiKey.trim()) return
    setStatus('loading')
    setErrorMsg('')

    // El cifrado ocurre en la Edge Function (save-api-key), nunca aquí: el
    // frontend nunca escribe la key en texto plano en la base de datos.
    const { data, error } = await supabase.functions.invoke('save-api-key', {
      body: { apiKey: apiKey.trim() },
    })

    if (error || data?.error) {
      setErrorMsg(data?.error ?? error!.message)
      setStatus('error')
      return
    }
    setApiKey('')
    setHasKey(true)
    setStatus('saved')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          ✕
        </button>

        <div>
          <h2 className="text-lg font-semibold">Ajustes</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Kalo usa tu propia API key de Anthropic para analizar tus comidas:
            así nadie más consume tu cuota. Consíguela en{' '}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noreferrer"
              className="text-brand underline"
            >
              console.anthropic.com
            </a>
            .
          </p>
          <p className="mt-2 rounded-lg bg-neutral-100 p-2 text-xs text-neutral-500 dark:bg-neutral-800">
            🔒 Tu API key se cifra (AES-256) antes de guardarse. Solo se
            descifra en el servidor para llamar a Claude en el momento de
            analizar tu comida; nunca se guarda en texto plano, no se expone en
            el frontend ni se comparte con nadie.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            API key de Anthropic{' '}
            {hasKey && (
              <span className="font-normal text-brand">✓ configurada</span>
            )}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              hasKey ? '•••••••••••••• (guardar para reemplazar)' : 'sk-ant-...'
            }
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !apiKey.trim()}
            className="rounded-lg bg-brand px-4 py-3 font-medium text-brand-fg transition active:scale-[0.98] disabled:opacity-60"
          >
            {status === 'loading' ? 'Guardando…' : 'Guardar'}
          </button>
          {status === 'saved' && (
            <p className="text-sm text-brand">Guardada correctamente.</p>
          )}
          {status === 'error' && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}
        </form>
      </motion.div>
    </motion.div>
  )
}
