import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered } from 'lucide-react'
import type { JSONContent } from '@tiptap/core'
import type { ReportBlock } from './model'

type Block = Extract<ReportBlock, { content: JSONContent }>
export function RichTextBlock({ block, selected, onSelect, onChange }: { block: Block; selected: boolean; onSelect: () => void; onChange: (value: JSONContent) => void }) {
  const label = block.kind === 'title' ? 'Título' : block.kind === 'subtitle' ? 'Subtítulo' : block.kind === 'table' ? 'Tabela' : 'Texto'
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, code: false, link: false, horizontalRule: false, undoRedo: false, trailingNode: false }), TableKit.configure({ table: { resizable: false } }), TextAlign.configure({ types: ['paragraph'] })],
    content: block.content, shouldRerenderOnTransaction: true,
    editorProps: { attributes: { role: 'textbox', 'aria-label': label, 'aria-multiline': 'true', 'data-placeholder': label === 'Tabela' ? '' : `Digite o ${label.toLowerCase()}…` } },
    onUpdate: ({ editor }) => onChange(editor.getJSON()), onFocus: onSelect,
  }, [block.id])
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(block.content)) editor.commands.setContent(block.content, { emitUpdate: false })
  }, [editor, block.content])
  useEffect(() => { if (selected && editor && !editor.isFocused) editor.commands.focus('end') }, [selected, editor])
  if (!editor) return null
  return <div className={`report-richtext report-${block.kind}`}>
    {selected && <div className="report-text-tools" role="toolbar" aria-label="Formatar conteúdo" onMouseDown={event => event.preventDefault()}>
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
    </div>}
    <EditorContent editor={editor} />
  </div>
}
