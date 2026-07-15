import { useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase'

type Step = 'choice' | 'text' | 'photo'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Volver"
      className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      ←
    </button>
  )
}

export default function EntryModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('choice')

  const [text, setText] = useState('')
  const [textStatus, setTextStatus] = useState<'idle' | 'loading' | 'error'>(
    'idle'
  )
  const [textError, setTextError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState<
    'idle' | 'compressing' | 'loading' | 'error'
  >('idle')
  const [photoError, setPhotoError] = useState('')

  function goToChoice() {
    setStep('choice')
    setPhotoFile(null)
    setPhotoPreviewUrl(null)
    setPhotoStatus('idle')
    setPhotoError('')
  }

  async function handleTextSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setTextStatus('loading')
    setTextError('')
    const { data, error } = await supabase.functions.invoke('log-text-entry', {
      body: { rawInput: text.trim() },
    })
    if (error || data?.error) {
      setTextError(data?.error ?? error!.message)
      setTextStatus('error')
      return
    }
    onClose()
  }

  function handlePhotoButtonClick() {
    setStep('photo')
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      setStep('choice')
      return
    }
    setPhotoFile(file)
    setPhotoPreviewUrl(URL.createObjectURL(file))
  }

  async function handlePhotoSubmit() {
    if (!photoFile) return
    setPhotoError('')
    try {
      setPhotoStatus('compressing')
      const compressed = await imageCompression(photoFile, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      })
      const imageBase64 = await fileToBase64(compressed)

      setPhotoStatus('loading')
      const { data, error } = await supabase.functions.invoke(
        'log-photo-entry',
        { body: { imageBase64, mediaType: compressed.type } }
      )
      if (error || data?.error) {
        setPhotoError(data?.error ?? error!.message)
        setPhotoStatus('error')
        return
      }
      onClose()
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'Error al procesar la foto'
      )
      setPhotoStatus('error')
    }
  }

  return (
    <AnimatePresence>
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
          className="relative flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:h-auto sm:min-h-[70vh] sm:rounded-3xl"
        >
          {step !== 'choice' && <BackButton onClick={goToChoice} />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>

          {/* Siempre montado (no solo en el paso 'photo'): si estuviera
              dentro del condicional, el ref sería null en el momento de
              handlePhotoButtonClick (React aún no habría re-renderizado con
              step='photo'), y el .click() no abriría nada.
              `sr-only` en vez de `hidden` (display:none) a propósito: varios
              navegadores móviles (Safari iOS incluido) BLOQUEAN en silencio
              el .click() programático sobre un <input type="file"> oculto
              con display:none — no pasa nada, sin error, sin permisos. Con
              `sr-only` (position:absolute + clip, sigue "interactuable")
              el click programático sí dispara la cámara/selector nativo. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
          />

          {step === 'choice' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <h2 className="text-lg font-semibold">¿Qué has comido?</h2>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setStep('text')}
                  className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-neutral-200 py-8 transition active:scale-[0.98] dark:border-neutral-700"
                >
                  <span className="text-3xl" aria-hidden="true">
                    ✏️
                  </span>
                  <span className="font-medium">Texto</span>
                </button>
                <button
                  type="button"
                  onClick={handlePhotoButtonClick}
                  className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-neutral-200 py-8 transition active:scale-[0.98] dark:border-neutral-700"
                >
                  <span className="text-3xl" aria-hidden="true">
                    📷
                  </span>
                  <span className="font-medium">Foto</span>
                </button>
              </div>
            </div>
          )}

          {step === 'text' && (
            <form
              onSubmit={handleTextSubmit}
              className="mt-12 flex flex-1 flex-col gap-2"
            >
              <p className="text-xs text-neutral-500">
                Un alimento por línea, como una lista de la compra — es más
                rápido y más preciso que una frase larga.
              </p>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  '2 huevos\n1 tostada con aguacate\n1 café con leche'
                }
                className="flex-1 w-full resize-none rounded-xl border border-neutral-300 bg-white p-4 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="submit"
                disabled={textStatus === 'loading' || !text.trim()}
                className="rounded-xl bg-brand px-5 py-3 font-medium text-brand-fg transition active:scale-[0.98] disabled:opacity-60"
              >
                {textStatus === 'loading' ? 'Analizando…' : 'Registrar'}
              </button>
              {textStatus === 'error' && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                  {textError}
                </p>
              )}
            </form>
          )}

          {step === 'photo' && (
            <div className="mt-12 flex flex-1 flex-col gap-3">
              {photoPreviewUrl ? (
                <>
                  <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <img
                      src={photoPreviewUrl}
                      alt="Foto de la comida"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {photoStatus === 'error' && (
                      <p className="mr-auto text-sm text-red-600">
                        {photoError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handlePhotoSubmit}
                      disabled={
                        photoStatus === 'compressing' ||
                        photoStatus === 'loading'
                      }
                      className="rounded-xl bg-brand px-5 py-3 font-medium text-brand-fg transition active:scale-[0.98] disabled:opacity-60"
                    >
                      {photoStatus === 'compressing'
                        ? 'Comprimiendo…'
                        : photoStatus === 'loading'
                          ? 'Analizando…'
                          : 'Registrar'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="flex flex-1 items-center justify-center text-sm text-neutral-500">
                  Abriendo cámara…
                </p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
