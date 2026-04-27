import { useEffect } from 'react'

// Closes a modal/drawer when the user presses Escape. Pass `open` so the listener
// is only active while the surface is visible — otherwise unrelated keypresses on
// the page would be intercepted.
export function useEscapeClose(open, onClose) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key !== 'Escape') return
      onClose?.()
      e.preventDefault()
      e.stopPropagation()
    }
    // Capture phase so nested handlers / inputs do not swallow Esc before we run.
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [open, onClose])
}

export default useEscapeClose
