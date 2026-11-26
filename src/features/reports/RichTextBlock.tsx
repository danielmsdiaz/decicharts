import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { EditorContent, useEditor } from '@tiptap/react'
import { reportExtensions } from './richtext'
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered } from 'lucide-react'
import type { JSONContent } from '@tiptap/core'
import type { ReportBlock } from './model'

type Block = Extract<ReportBlock, { content: JSONContent }>
export function RichTextBlock({ block, selected, onSelect, onChange, caret, toolbarTarget }: { block: Block; selected: boolean; onSelect: () => void; onChange: (value: JSONContent, selection: { from: number; to: number }) => void; caret?: { from: number; to: number; version: number }; toolbarTarget: HTMLElement | null }) {
  const caretFrom = caret?.from, caretTo = caret?.to, caretVersion = caret?.version
  const label = block.kind === 'title' ? 'Título' : block.kind === 'subtitle' ? 'Subtítulo' : block.kind === 'table' ? 'Tabela' : 'Texto'
  const editor = useEditor({
    extensions: reportExtensions(),
    content: block.content, shouldRerenderOnTransaction: true,
    editorProps: { attributes: { role: 'textbox', 'aria-label': label, 'aria-multiline': 'true', 'data-placeholder': label === 'Tabela' ? '' : `Digite o ${label.toLowerCase()}…` } },
    onUpdate: ({ editor }) => onChange(editor.getJSON(), { from: editor.state.selection.from, to: editor.state.selection.to }), onFocus: onSelect,
  }, [block.id])
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(block.content)) editor.commands.setContent(block.content, { emitUpdate: false })
  }, [editor, block.content])
  useEffect(() => {
    if (!selected || !editor) return
    if (caretFrom !== undefined && caretTo !== undefined) editor.commands.setTextSelection({ from: Math.max(1, Math.min(caretFrom, editor.state.doc.content.size - 1)), to: Math.max(1, Math.min(caretTo, editor.state.doc.content.size - 1)) })
    if (!editor.isFocused) editor.commands.focus(caretFrom !== undefined ? undefined : 'end', { scrollIntoView: false })
  }, [selected, editor, caretFrom, caretTo, caretVersion])
  if (!editor) return null
  return <div className={`report-richtext report-${block.kind}`}>
    {selected && toolbarTarget && createPortal(<div className="report-text-tools" role="toolbar" aria-label="Formatar conteúdo" onMouseDown={event => event.preventDefault()}>
      {([
        [Bold, 'Negrito', 'bold', () => editor.chain().focus().toggleBold().run()],
        [Italic, 'Itálico', 'italic', () => editor.chain().focus().toggleItalic().run()],
        [List, 'Lista com marcadores', 'bulletList', () => editor.chain().focus().toggleBulletList().run()],
        [ListOrdered, 'Lista numerada', 'orderedList', () => editor.chain().focus().toggleOrderedList().run()],
      ] as const).map(([Icon, name, format, run]) => <button type="button" key={name} aria-label={name} title={name} aria-pressed={editor.isActive(format)} onClick={run}><Icon aria-hidden="true" /></button>)}
      {([[AlignLeft, 'Alinhar à esquerda', 'left'], [AlignCenter, 'Centralizar texto', 'center'], [AlignRight, 'Alinhar à direita', 'right']] as const).map(([Icon, name, value]) => <button type="button" key={value} aria-label={name} title={name} aria-pressed={editor.isActive({ textAlign: value })} onClick={() => editor.chain().focus().setTextAlign(value).run()}><Icon aria-hidden="true" /></button>)}
      {block.kind === 'table' && <div className="report-table-tools">
        <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>+ Linha</button>
        <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Coluna</button>
        <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>Excluir linha</button>
        <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>Excluir coluna</button>
      </div>}
    </div>, toolbarTarget)}
    <EditorContent editor={editor} />
  </div>
}
