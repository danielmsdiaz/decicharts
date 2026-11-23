import { Outlet } from 'react-router'
import { Header } from '@/components/layout/Header'
import { useTheme } from '@/hooks/use-theme'

export function App() {
  const { theme, toggleTheme } = useTheme()
  return <><Header theme={theme} toggleTheme={toggleTheme} /><Outlet context={{ theme }} /><footer className="mx-auto max-w-[1280px] px-5 py-7 text-sm text-muted-foreground sm:px-8">Decicharts · Análise de medições acústicas · Processamento local</footer></>
}
