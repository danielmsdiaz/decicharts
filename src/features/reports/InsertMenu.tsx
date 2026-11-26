import { useEffect, useId, useRef } from 'react'
import { ChartNoAxesCombined, Columns2, Heading1, Heading2, ImagePlus, Pilcrow, SeparatorHorizontal, Table2 } from 'lucide-react'

export type InsertKind = 'title' | 'subtitle' | 'text' | 'table' | 'photo' | 'chart' | 'columns' | 'break'
const items = [
  ['title', 'Título', Heading1], ['subtitle', 'Subtítulo', Heading2], ['text', 'Texto', Pilcrow],
  ['table', 'Tabela', Table2], ['photo', 'Foto', ImagePlus], ['chart', 'Gráfico', ChartNoAxesCombined],
  ['columns', 'Duas colunas', Columns2], ['break', 'Quebra de página', SeparatorHorizontal],
] as const
export function InsertMenu({ anchor, insideColumn, onInsert, onClose }: { anchor: HTMLElement; insideColumn: boolean; onInsert: (kind: InsertKind) => void; onClose: () => void }) {
  const popover = useRef<HTMLDivElement>(null), id = useId()
  const rect = anchor.getBoundingClientRect(), left = Math.max(12, Math.min(rect.left, window.innerWidth - 276))
  const top = Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 430))
  useEffect(() => {
    const element = popover.current
    if (!element) return
    const closed = (event: Event) => { if ((event as ToggleEvent).newState === 'closed') onClose() }
    element.addEventListener('toggle', closed)
    element.showPopover(); element.querySelector('button')?.focus()
    return () => { element.removeEventListener('toggle', closed); element.hidePopover() }
  }, [onClose])
  return <div ref={popover} id={id} popover="auto" className="report-insert-menu" style={{ left, top }} role="menu" aria-label="Inserir elemento" onKeyDown={event => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
    }
    if (event.key === 'Escape') { event.preventDefault(); onClose(); anchor.focus() }
  }}>
    {items.filter(([kind]) => !insideColumn || !['columns', 'break'].includes(kind)).map(([kind, name, Icon]) => <button role="menuitem" type="button" key={kind} onClick={() => onInsert(kind)}><Icon aria-hidden="true" /><span>{name}</span></button>)}
  </div>
}
