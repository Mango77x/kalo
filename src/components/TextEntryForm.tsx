import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function TextEntryForm() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setStatus('loading')
    setErrorMsg('')

    const { data, error } = await supabase.functions.invoke('log-text-entry', {
      body: { rawInput: text.trim() },
    })

    if (error || data?.error) {
      setErrorMsg(data?.error ?? error!.message)
      setStatus('error')
      return
    }

    // Las nuevas filas llegan por Realtime; solo limpiamos el formulario.
    setText('')
    setStatus('idle')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="¿Qué has comido? Ej: 2 huevos y una tostada con aguacate"
        rows={2}
        className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={status === 'loading' || !text.trim()}
        className="self-end rounded-lg bg-brand px-5 py-2.5 font-medium text-brand-fg transition active:scale-[0.98] disabled:opacity-60"
      >
        {status === 'loading' ? 'Analizando…' : 'Registrar'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}
    </form>
  )
}
