import { AudioLines, ChevronDown, LogOut, Moon, Sun, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'

export function Header({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  const { user, logout, busy } = useAuth()
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const account = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!account.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <header className="app-header"><div className="header-inner">
    <Link to="/" className="brand" aria-label="Decicharts"><AudioLines aria-hidden="true" /><span>Decicharts</span></Link>
    {user && <nav className="account-nav" aria-label="Navegação principal"><NavLink to="/" end>Análise</NavLink><NavLink to="/analises">Minhas análises</NavLink><NavLink to="/perfil">Meu perfil</NavLink></nav>}
    <div className="header-actions"><Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>{theme === 'dark' ? <Sun /> : <Moon />}</Button>
      {user && <div className="account-control" ref={account} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
        <button ref={trigger} type="button" className="account-trigger" aria-label="Menu da conta" aria-expanded={open} aria-controls="account-popover" data-dialog-focus-fallback onClick={() => setOpen(value => !value)}>
          {user.photoURL && user.photoURL !== failedPhoto ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setFailedPhoto(user.photoURL)} /> : <span className="avatar-initial">{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>}<ChevronDown aria-hidden="true" />
        </button>
        {open && <div className="account-popover" id="account-popover"><div className="account-details"><strong>{user.displayName || 'Conta Google'}</strong><span>{user.email}</span></div><Link to="/perfil" onClick={() => setOpen(false)}><UserRound aria-hidden="true" />Configurações da conta</Link><button type="button" disabled={busy} onClick={() => { setOpen(false); void logout() }}><LogOut aria-hidden="true" />Sair</button></div>}
      </div>}
    </div>
  </div></header>
}
