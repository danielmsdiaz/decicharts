import { RotateCcw } from 'lucide-react'
import type { ReportInfo } from '../../../shared/persistence'
import { Button } from '@/components/ui/button'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { defaultFigureColors, figureColors, type FigureColors as Colors } from './colors'

const fields: [keyof Colors, string][] = [
  ['headerColor', 'Cabeçalho'], ['chartBackgroundColor', 'Fundo do gráfico'], ['lineColor', 'Linha do gráfico'],
]
export function FigureColors({ report, onChange }: { report?: ReportInfo; onChange: (colors: Colors) => void }) {
  const colors = figureColors(report)
  const changed = fields.some(([key]) => colors[key] !== defaultFigureColors[key])
  return <fieldset className="figure-colors">
    <legend>Cores da figura<HelpTooltip label="Sobre as cores da figura">Personalize o cabeçalho, o fundo e a linha da figura exportada. Título e eixos ajustam o contraste automaticamente. Escolha uma linha que contraste com o fundo. As cores são preservadas ao salvar a análise.</HelpTooltip></legend>
    <div className="figure-color-list">{fields.map(([key, label]) => <label key={key} className="figure-color-control">
      <span>{label}</span><span className="figure-color-value" aria-hidden="true">{colors[key].toUpperCase()}</span>
      <input type="color" aria-label={label} value={colors[key]} onChange={event => onChange({ ...colors, [key]: event.target.value })} />
    </label>)}</div>
    {changed && <Button variant="ghost" size="sm" onClick={() => onChange({ ...defaultFigureColors })}><RotateCcw aria-hidden="true" />Restaurar cores</Button>}
  </fieldset>
}
