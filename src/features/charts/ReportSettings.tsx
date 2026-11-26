import { useEffect, useRef } from 'react'
import { FileImage } from 'lucide-react'
import type { ChartView, ReportInfo } from '../../../shared/persistence'
import { Input } from '@/components/ui/input'
import { LogoInput } from './LogoInput'
import { HelpTooltip } from '@/components/ui/help-tooltip'

const fields: [keyof ReportInfo, string, number][] = [
  ['enterprise', 'Empreendimento', 200], ['address', 'Endereço', 500],
  ['east', 'Coordenada Leste (mE)', 200], ['north', 'Coordenada Norte (mN)', 200],
  ['datum', 'Datum, se conhecido', 200], ['zone', 'Zona UTM, se conhecida', 200], ['hemisphere', 'Hemisfério, se conhecido', 200],
]
export function ReportSettings({ view, onChange }: { view: ChartView; onChange: (view: ChartView) => void }) {
  const latest = useRef(view)
  useEffect(() => { latest.current = view }, [view])
  function field(key: keyof ReportInfo, value: string) { onChange({ ...latest.current, report: { ...latest.current.report, [key]: value } }) }
  return <details className="disclosure report-settings"><summary><FileImage className="size-4" aria-hidden="true" />Informações da figura<HelpTooltip label="Sobre as informações da figura">Campos vazios não aparecem na figura. Data e coordenadas não são inferidas. As informações e o logotipo são enviados à sua conta somente quando você salva este ponto.</HelpTooltip></summary>
    <div className="mt-5 grid gap-5 sm:grid-cols-2">{fields.map(([key, label, max]) => <label key={key} className={`field ${key === 'address' ? 'sm:col-span-2' : ''}`}>{label}<Input value={view.report?.[key] ?? ''} maxLength={max} onChange={event => field(key, event.target.value)} /></label>)}
      <label className="field">Data e hora inicial, se conhecida<Input type="datetime-local" value={view.report?.startedAt ?? ''} onChange={event => field('startedAt', event.target.value)} /></label>
      <LogoInput value={view.report?.logo} onChange={logo => field('logo', logo)} />
    </div>
  </details>
}
