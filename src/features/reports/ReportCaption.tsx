import { useLayoutEffect, useRef } from 'react'

export function ReportCaption({ value, label, caret, onChange }: { value: string; label: string; caret?: { from: number; to: number; version: number }; onChange: (value: string, position: number) => void }) {
  const input = useRef<HTMLTextAreaElement>(null)
  const caretFrom = caret?.from, caretTo = caret?.to, caretVersion = caret?.version
  useLayoutEffect(() => {
    const element = input.current
    if (element) { element.style.height = '0'; element.style.height = `${element.scrollHeight}px` }
  }, [value])
  useLayoutEffect(() => {
    if (caretFrom === undefined || caretTo === undefined || !input.current) return
    input.current.focus({ preventScroll: true }); input.current.setSelectionRange(caretFrom, caretTo)
  }, [caretFrom, caretTo, caretVersion])
  return <textarea className={!value.trim() ? 'is-empty' : undefined} ref={input} rows={1} maxLength={2000} placeholder="Adicionar legenda…" aria-label={label} value={value} onChange={event => onChange(event.target.value, event.target.selectionStart)} />
}
