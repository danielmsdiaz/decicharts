import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'

export function ReportActions({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  const id = useId(), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ left: 0, top: 0 })
  return <div className={`report-action-anchor ${className}`}>
    <button ref={trigger} type="button" className="report-action-trigger" aria-label={label} title={label} aria-expanded={open} aria-controls={id} popoverTarget={id} onClick={() => {
      const box = trigger.current!.getBoundingClientRect()
      setPosition({ left: Math.max(12, Math.min(box.right - 320, innerWidth - 332)), top: Math.max(12, Math.min(box.bottom + 6, innerHeight - 120)) })
    }}><MoreHorizontal aria-hidden="true" /></button>
    {createPortal(<div ref={panel} id={id} popover="auto" className="report-actions-popover" style={position} role="group" aria-label={label}
      onToggle={event => setOpen(event.newState === 'open')}
      onClick={event => { if ((event.target as HTMLElement).closest('button')) { panel.current?.hidePopover(); trigger.current?.focus({ preventScroll: true }) } }}>
      {children}
    </div>, document.body)}
  </div>
}
