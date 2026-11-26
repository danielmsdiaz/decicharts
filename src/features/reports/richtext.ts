import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'

export const reportExtensions = () => [StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, code: false, link: false, horizontalRule: false, undoRedo: false, trailingNode: false }), TableKit.configure({ table: { resizable: false } }), TextAlign.configure({ types: ['paragraph'] })]
export const reportSchema = getSchema(reportExtensions())
