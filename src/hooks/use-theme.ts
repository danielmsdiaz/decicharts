import { useEffect, useState } from 'react'

function initialTheme() {
  try { const saved = localStorage.getItem('decicharts-theme'); if (saved === 'dark' || saved === 'light') return saved }
  catch { /* Preference storage may be disabled; the app still works. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
export function useTheme() {
  const [theme, setTheme] = useState(initialTheme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('decicharts-theme', theme) } catch { /* Optional preference only. */ }
  }, [theme])
  return { theme, toggleTheme: () => setTheme(current => current === 'dark' ? 'light' : 'dark') }
}
