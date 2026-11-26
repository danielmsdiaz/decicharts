import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp } from 'lucide-react'

export function HelpTooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const touch = useRef(false)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  function cancelTimer() { clearTimeout(timer.current) }
  function show() { cancelTimer(); setOpen(true) }
  function hideLater() { cancelTimer(); timer.current = setTimeout(() => setOpen(false), 150) }
  useEffect(() => () => clearTimeout(timer.current), [])
  useLayoutEffect(() => {
    if (!open) return
    function place() {
      if (!trigger.current || !popup.current) return
      const anchor = trigger.current.getBoundingClientRect(), box = popup.current.getBoundingClientRect()
      const headerBottom = document.querySelector('.app-header')?.getBoundingClientRect().bottom ?? 0
      if (anchor.bottom <= headerBottom || anchor.top >= window.innerHeight) { setOpen(false); return }
      const topEdge = Math.max(12, headerBottom + 8)
      setPosition({ left: Math.max(12, Math.min(window.innerWidth - box.width - 12, anchor.left + anchor.width / 2 - box.width / 2)),
        top: Math.max(topEdge, anchor.top - box.height - 10 >= topEdge ? anchor.top - box.height - 10 : Math.min(window.innerHeight - box.height - 12, anchor.bottom + 10)) })
    }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { cancelTimer(); setOpen(false) } }
    function outside(event: PointerEvent) {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) { cancelTimer(); setOpen(false) }
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('keydown', escape)
    document.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true)
      document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside)
    }
  }, [open])
  return <span className="help-anchor">
    <button ref={trigger} type="button" className="help-trigger" aria-label={label} aria-describedby={open ? id : undefined}
      onPointerDown={event => { touch.current = event.pointerType === 'touch' }}
      onPointerEnter={event => { if (event.pointerType !== 'touch') { cancelTimer(); timer.current = setTimeout(() => setOpen(true), 200) } }}
      onPointerLeave={event => { if (event.pointerType !== 'touch') hideLater() }} onFocus={() => { if (!touch.current) show() }} onBlur={() => { touch.current = false; cancelTimer(); setOpen(false) }}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { touch.current = false; show() } }}
      onClick={event => { event.stopPropagation(); cancelTimer(); if (touch.current && event.detail !== 0) setOpen(value => !value); else setOpen(true) }}>
      <CircleHelp aria-hidden="true" />
    </button>
    {open && createPortal(<div ref={popup} id={id} role="tooltip" className="help-tooltip" style={position} onPointerEnter={cancelTimer} onPointerLeave={event => { if (event.pointerType !== 'touch') hideLater() }}>{children}</div>, document.body)}
  </span>
}
