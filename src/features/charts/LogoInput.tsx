import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { normalizeLogo } from './logo'

export function LogoInput({ value, onChange, onBusyChange }: { value?: string; onChange: (logo: string) => void; onBusyChange?: (busy: boolean) => void }) {
  const helpId = useId(), errorId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload(file: File) {
    setBusy(true); onBusyChange?.(true); setError('')
    try { onChange(await normalizeLogo(file)) }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Não foi possível ler a imagem. Escolha outro PNG ou JPEG.') }
    finally { setBusy(false); onBusyChange?.(false) }
  }
  return <div className="logo-input">
    <label className="field">Logomarca opcional
      <Input type="file" accept="image/png,image/jpeg" disabled={busy} aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`} aria-invalid={!!error} onChange={event => {
        const file = event.target.files?.[0]
        if (file) void upload(file)
        event.target.value = ''
      }} />
    </label>
    <p id={helpId} className="logo-input-help">PNG ou JPEG até 5 MiB e 4096 × 4096 px. Proporção de 1:1 a 4:1 (largura:altura); recomendado 2:1. A marca é ajustada sem cortes ou distorção.</p>
    {busy && <p className="text-sm" role="status">Preparando logomarca…</p>}
    {error && <p id={errorId} className="notice error" role="alert">{error}</p>}
    {value && <div className="logo-input-preview"><img src={value} alt="Logomarca da figura" /><Button variant="outline" size="sm" disabled={busy} onClick={() => { onChange(''); setError('') }}><X />Remover logomarca</Button></div>}
  </div>
}
