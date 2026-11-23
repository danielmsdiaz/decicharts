import { AudioLines, LogOut, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'

export function Header({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  const { user, logout, busy } = useAuth()
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  return <header className="border-b bg-card"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
    <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight no-underline"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><AudioLines className="size-5" aria-hidden="true" /></span><span className="text-lg">Decicharts</span></a>
    <div className="flex items-center gap-2 sm:gap-4">
      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>{theme === 'dark' ? <Sun /> : <Moon />}</Button>
      {user && <><div className="hidden h-7 border-l sm:block" /><div className="hidden text-right text-sm sm:block"><p className="max-w-60 truncate font-medium">{user.displayName || 'Usuário'}</p><p className="max-w-60 truncate text-muted-foreground">{user.email}</p></div>{user.photoURL && user.photoURL !== failedPhoto ? <img src={user.photoURL} alt={user.displayName || 'Foto do usuário'} className="size-9 rounded-full" referrerPolicy="no-referrer" onError={() => setFailedPhoto(user.photoURL)} /> : <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm" aria-label={user.displayName || user.email || 'Usuário'}>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>}<Button variant="ghost" onClick={() => void logout()} disabled={busy} aria-label="Sair"><LogOut /><span className="hidden sm:inline">Sair</span></Button></>}
    </div>
  </div></header>
}
