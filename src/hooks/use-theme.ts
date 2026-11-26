import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

function initialTheme() {
  try { const saved = localStorage.getItem('decicharts-theme'); if (saved === 'dark' || saved === 'light') return saved }
  catch { /* Preference storage may be disabled; the app still works. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
export function useTheme() {
  const [theme, setTheme] = useState(initialTheme)
  const activeTransition = useRef<ViewTransition | null>(null)
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('decicharts-theme', theme) } catch { /* Optional preference only. */ }
  }, [theme])

  function toggleTheme(onRevealed: () => void) {
    const changeTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark')
    activeTransition.current?.skipTransition()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      changeTheme()
      return
    }
    if (!document.startViewTransition) {
      changeTheme()
      onRevealed()
      return
    }

    // The new snapshot needs both the root colors and the updated React tree.
    const transition = document.startViewTransition(() => flushSync(changeTheme))
    activeTransition.current = transition
    void transition.ready.catch(() => { /* Rapid toggles can skip the animation. */ })
    void transition.finished.then(() => {
      if (activeTransition.current !== transition) return
      activeTransition.current = null
      onRevealed()
    }, () => {
      if (activeTransition.current === transition) activeTransition.current = null
    })
  }

  return { theme, toggleTheme }
}
