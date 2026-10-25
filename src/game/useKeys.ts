import { useEffect, useRef } from 'react'

export function useKeys() {
  const keys = useRef<Set<string>>(new Set())
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
      keys.current.add(e.code)
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const clear = () => keys.current.clear() // focus loss: no stuck keys
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    const hide = () => { if (document.hidden) keys.current.clear() }
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [])
  return keys
}
