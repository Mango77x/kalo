import { useRef, useState, type ChangeEvent } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PhotoEntryForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      })
      const imageBase64 = await fileToBase64(compressed)

      const { data, error } = await supabase.functions.invoke(
        'log-photo-entry',
        { body: { imageBase64, mediaType: compressed.type } }
      )

      if (error || data?.error) {
        setErrorMsg(data?.error ?? error!.message)
        setStatus('error')
        return
      }

      setStatus('idle')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar la foto')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-2 px-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === 'loading'}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-600 transition active:scale-[0.98] disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300"
      >
        {status === 'loading' ? (
          'Analizando foto…'
        ) : (
          <>📷 Hacer foto de la comida</>
        )}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
