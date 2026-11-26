import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Trash2, X } from 'lucide-react'
import { Button } from './button'
import { ConfirmationContext, type ConfirmationOptions } from './confirmation-context'

interface Request { options: ConfirmationOptions; resolve: (value: boolean) => void; trigger: HTMLElement | null }
export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null), cancelButton = useRef<HTMLButtonElement>(null)
  const current = useRef<Request | null>(null), queue = useRef<Request[]>([])
  const [presentation, setPresentation] = useState<{ options: ConfirmationOptions; closing: boolean } | null>(null)
  const titleId = useId(), descriptionId = useId()
  const confirm = useCallback((options: ConfirmationOptions) => new Promise<boolean>(resolve => {
    const request = { options, resolve, trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null }
    if (current.current) queue.current.push(request)
    else { current.current = request; setPresentation({ options, closing: false }) }
  }), [])
  const settle = useCallback((value: boolean) => {
    const request = current.current
    if (!request) return
    dialog.current?.close()
    const next = queue.current.shift() ?? null
    current.current = next
    setPresentation(next ? { options: next.options, closing: false } : { options: request.options, closing: true })
    request.resolve(value)
    if (!next) requestAnimationFrame(() => {
      if (current.current) return
      const fallback = document.querySelector<HTMLElement>('[data-dialog-focus-fallback]')
      const target = request.trigger?.isConnected && !request.trigger.closest('[inert]') ? request.trigger : fallback
      target?.focus({ preventScroll: true })
    })
  }, [])
  useEffect(() => {
    if (presentation && !presentation.closing && dialog.current && !dialog.current.open) { dialog.current.showModal(); cancelButton.current?.focus() }
  }, [presentation])
  useEffect(() => () => {
    current.current?.resolve(false); current.current = null
    queue.current.splice(0).forEach(request => request.resolve(false))
  }, [])
  const danger = presentation?.options.tone === 'danger'
  return <ConfirmationContext.Provider value={confirm}>{children}
    <dialog ref={dialog} className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-hidden={presentation?.closing || undefined} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); settle(false) }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
        const first = buttons[0], last = buttons.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}
      onClick={event => { if (event.target === event.currentTarget) settle(false) }}>
      {presentation && <div className="confirmation-content" inert={presentation.closing}>
        <div className={`confirmation-icon ${danger ? 'is-danger' : ''}`}>{danger ? <Trash2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}</div>
        <button type="button" className="dialog-close" aria-label="Fechar confirmação" onClick={() => settle(false)}><X aria-hidden="true" /></button>
        <h2 id={titleId}>{presentation.options.title}</h2><p id={descriptionId}>{presentation.options.description}</p>
        <div className="confirmation-actions"><Button ref={cancelButton} variant="outline" onClick={() => settle(false)}>Cancelar</Button><Button variant={danger ? 'destructive' : 'default'} onClick={() => settle(true)}>{presentation.options.confirmLabel}</Button></div>
      </div>}
    </dialog>
  </ConfirmationContext.Provider>
}
