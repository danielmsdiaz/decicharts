import { Outlet } from 'react-router'
import { Header } from '@/components/layout/Header'
import { useTheme } from '@/hooks/use-theme'
import { ConfirmationProvider } from '@/components/ui/ConfirmationProvider'

export function App() {
  const { theme, toggleTheme } = useTheme()
  return <ConfirmationProvider><Header theme={theme} toggleTheme={toggleTheme} /><Outlet context={{ theme }} /></ConfirmationProvider>
}
