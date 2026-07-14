import { useEffect, useState } from 'react'

// Recharts pinta con strings de color en JS, no vía CSS vars con soltura
// (SVG + custom properties es frágil entre navegadores). Como la app no
// tiene un toggle de tema propio, solo seguimos la preferencia del sistema.
export function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return prefersDark
}
