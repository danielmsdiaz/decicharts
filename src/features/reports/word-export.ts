import {
  AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, LevelFormat, LineRuleType, Packer, PageBreak, Paragraph,
  Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType,
  type ILevelsOptions, type IParagraphOptions,
} from 'docx'
import type { JSONContent } from '@tiptap/core'
import { MAX_REPORT_FIGURE_HEIGHT } from './model'
import type { ReportAsset, ReportBlock, ReportDocument } from './model'
import { PAGE_MARGIN, PAGE_ROW_GAP } from './page-layout'

type Child = Paragraph | Table
const pageWidth = 11906, pageHeight = 16838, margin = PAGE_MARGIN * 15
const contentWidth = pageWidth - margin * 2
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }
const alignments = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED } as const
function alignment(value: unknown) { return alignments[value as keyof typeof alignments] ?? AlignmentType.LEFT }
function textRuns(nodes: JSONContent[] = [], bold = false, size?: number): TextRun[] {
  return nodes.flatMap(node => {
    if (node.type === 'hardBreak') return [new TextRun({ break: 1 })]
    if (node.type !== 'text') throw new Error('Há um conteúdo de texto não suportado. Revise o elemento antes de exportar.')
    const marks = new Set(node.marks?.map(mark => mark.type))
    return [new TextRun({ text: node.text ?? '', size, bold: bold || marks.has('bold') ? true : undefined, italics: marks.has('italic') ? true : undefined, strike: marks.has('strike') ? true : undefined, underline: marks.has('underline') ? {} : undefined })]
  })
}
export async function createWordDocument(report: ReportDocument, assets: ReadonlyMap<string, ReportAsset>): Promise<Blob> {
  const numbering: { reference: string; levels: ILevelsOptions[] }[] = []
  function rich(nodes: JSONContent[] = [], width: number, heading?: IParagraphOptions['heading'], list?: { reference: string; level: number }, header = false, table = false): Child[] {
    return nodes.flatMap((node): Child[] => {
      if (node.type === 'paragraph' || node.type === 'heading') return [new Paragraph({ children: textRuns(node.content, header, table ? 20 : undefined),
        heading, alignment: alignment(node.attrs?.textAlign), spacing: { after: 120, line: table ? 244 : heading === HeadingLevel.HEADING_1 ? 400 : heading === HeadingLevel.HEADING_2 ? 325 : 275, lineRule: LineRuleType.EXACT }, keepNext: !!heading,
        ...(list ? { numbering: list } : {}), widowControl: true })]
      if (node.type === 'bulletList' || node.type === 'orderedList') {
        const reference = `list-${numbering.length}`, level = Math.min(8, (list?.level ?? -1) + 1)
        numbering.push({ reference, levels: Array.from({ length: 9 }, (_, index) => ({ level: index,
          format: node.type === 'bulletList' ? LevelFormat.BULLET : LevelFormat.DECIMAL,
          text: node.type === 'bulletList' ? '•' : `%${index + 1}.`, start: Number(node.attrs?.start ?? 1),
          style: { paragraph: { indent: { left: 360 * (index + 1), hanging: 180 } } },
        })) })
        return (node.content ?? []).flatMap(item => rich(item.content, width, heading, { reference, level }, header, table))
      }
      if (node.type === 'table') {
        const rows = node.content ?? [], count = Math.max(1, ...rows.map(row => (row.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0)))
        return [new Table({ width: { size: width, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: Array.from({ length: count }, () => Math.floor(width / count)),
          rows: rows.map(row => new TableRow({ tableHeader: row.content?.every(cell => cell.type === 'tableHeader'), cantSplit: true, children: (row.content ?? []).map(cell => new TableCell({
            children: rich(cell.content, Math.floor(width / count), undefined, undefined, cell.type === 'tableHeader', true),
            columnSpan: Number(cell.attrs?.colspan ?? 1), rowSpan: Number(cell.attrs?.rowspan ?? 1),
            margins: { top: 90, bottom: 90, left: 90, right: 90 },
            shading: cell.type === 'tableHeader' ? { fill: 'E8EEEB' } : undefined,
          })) })),
        }), new Paragraph({ spacing: { before: 0, after: 120, line: 1, lineRule: LineRuleType.EXACT } })]
      }
      throw new Error('Há um elemento de texto não suportado. Revise-o antes de exportar.')
    })
  }
  async function blocks(values: ReportBlock[], width: number): Promise<Child[]> {
    const children: Child[] = []
    for (const block of values) {
      if (block.kind === 'break') { children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT } })); continue }
      if (block.kind === 'figure') {
        const asset = assets.get(block.assetId)
        if (!asset) throw new Error('Uma figura está indisponível. Insira-a novamente antes de exportar.')
        const maxWidth = width / 15, maxHeight = (pageHeight - margin * 2 - 650) / 15
        const factor = Math.min(maxWidth / asset.width, Math.min(maxHeight, MAX_REPORT_FIGURE_HEIGHT) / asset.height)
        if (!block.continuation) children.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: !!block.caption.trim(), spacing: { after: block.caption.trim() ? 75 : 150, line: 240, lineRule: LineRuleType.AUTO },
          children: [new ImageRun({ type: asset.blob.type === 'image/jpeg' ? 'jpg' : 'png', data: new Uint8Array(await asset.blob.arrayBuffer()),
            transformation: { width: Math.round(asset.width * factor), height: Math.round(asset.height * factor) },
            altText: { name: block.alt || 'Figura', title: block.alt || 'Figura', description: block.alt || 'Figura do relatório' } })] }))
        if (block.caption.trim()) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: block.caption.split('\n').flatMap((line, index) => [...(index ? [new TextRun({ break: 1 })] : []), new TextRun({ text: line, size: 18 })]), spacing: { after: 150, line: 252, lineRule: LineRuleType.EXACT }, widowControl: true }))
      } else children.push(...rich(block.content.content, width, block.kind === 'title' ? HeadingLevel.HEADING_1 : block.kind === 'subtitle' ? HeadingLevel.HEADING_2 : undefined))
    }
    return children.length ? children : [new Paragraph('')]
  }
  const children: Child[] = []
  for (const row of report.rows) {
    if (row.columns.length === 1) children.push(...await blocks(row.columns[0], contentWidth))
    else {
      const gap = 170, cellWidth = Math.floor(contentWidth / 2)
      children.push(new Table({ width: { size: contentWidth, type: WidthType.DXA }, columnWidths: [cellWidth, cellWidth], layout: TableLayoutType.FIXED, borders: noBorders,
        rows: [new TableRow({ children: await Promise.all(row.columns.map(async (column, index) => new TableCell({
          children: await blocks(column, cellWidth - gap),
          width: { size: cellWidth, type: WidthType.DXA }, borders: noBorders,
          margins: { top: 0, bottom: 0, left: index === 0 ? 0 : gap, right: index === 0 ? gap : 0 },
        }))) })],
      }))
    }
    if (!row.columns.flat().some(block => block.kind === 'break')) children.push(new Paragraph({ spacing: { before: 0, after: 0, line: PAGE_ROW_GAP * 15, lineRule: LineRuleType.EXACT } }))
  }
  return Packer.toBlob(new Document({ title: report.name, creator: 'Decicharts', numbering: { config: numbering },
    styles: { default: { document: { run: { font: 'Arial', size: 22, color: '1E2D2B' }, paragraph: { spacing: { line: 275, lineRule: LineRuleType.EXACT, after: 120 } } },
      heading1: { run: { font: 'Arial', size: 32, bold: true, color: '1E2D2B' }, paragraph: { spacing: { before: 220, after: 120 }, keepNext: true } },
      heading2: { run: { font: 'Arial', size: 26, bold: true, color: '1E2D2B' }, paragraph: { spacing: { before: 180, after: 100 }, keepNext: true } } } },
    sections: [{ properties: { page: { size: { width: pageWidth, height: pageHeight }, margin: { top: margin, bottom: margin, left: margin, right: margin } } }, children: children.length ? children : [new Paragraph('')] }],
  }))
}

export function downloadWord(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = `${name.trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 100) || 'Documento'}.docx`
  document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
