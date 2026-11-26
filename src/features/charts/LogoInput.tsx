import { useId, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { normalizeLogo } from './logo'

export function LogoInput({ value, onChange, onBusyChange }: { value?: string; onChange: (logo: string) => void; onBusyChange?: (busy: boolean) => void }) {
  const inputId = useId(), errorId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload(file: File) {
    setBusy(true); onBusyChange?.(true); setError('')
    try { onChange(await normalizeLogo(file)) }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Não foi possível ler a imagem. Escolha outro PNG ou JPEG.') }
    finally { setBusy(false); onBusyChange?.(false) }
  }
  return <div className="logo-input">
    <div className="logo-input-heading"><label htmlFor={inputId}>Logomarca opcional</label><HelpTooltip label="Sobre a logomarca">PNG ou JPEG até 5 MiB e 4096 × 4096 px. Proporção de 1:1 a 4:1 (largura:altura); recomendado 2:1. A marca é ajustada sem cortes ou distorção.</HelpTooltip></div>
    <input ref={input} id={inputId} type="file" hidden accept="image/png,image/jpeg" disabled={busy} aria-describedby={error ? errorId : undefined} aria-invalid={!!error} onChange={event => {
        const file = event.target.files?.[0]
        if (file) void upload(file)
        event.target.value = ''
    }} />
    <Button className="w-full justify-start" variant="outline" disabled={busy} aria-describedby={error ? errorId : undefined} onClick={() => input.current?.click()}><Upload aria-hidden="true" />{busy ? 'Preparando logomarca…' : value ? 'Trocar logomarca' : 'Selecionar logomarca'}</Button>
    {busy && <p className="text-sm" role="status">Preparando logomarca…</p>}
    {error && <p id={errorId} className="notice error" role="alert">{error}</p>}
    {value && <div className="logo-input-preview"><img src={value} alt="Logomarca da figura" /><Button variant="outline" size="sm" disabled={busy} onClick={() => { onChange(''); setError('') }}><X />Remover logomarca</Button></div>}
  </div>
}
