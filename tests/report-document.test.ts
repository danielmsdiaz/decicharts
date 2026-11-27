// @vitest-environment node
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { blankDocument, duplicateRow, insertBlocks, newBlock, replaceBlock, rowFor, setColumns, type ReportAsset, type ReportBlock } from '../src/features/reports/model'
import { createWordDocument } from '../src/features/reports/word-export'
import { addFlowPage, cutRich, deleteFlowPage, insertOnPage, replaceRichFragment, type FlowPage } from '../src/features/reports/pagination'
import { reportSchema } from '../src/features/reports/richtext'
import { addReportPage, deleteReportPage, FIRST_PAGE, reportPages } from '../src/features/reports/pages'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const text = (value: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })

describe('documento por blocos', () => {
  it('edita a continuação de um parágrafo sem perder o começo, o final ou as marcas', () => {
    const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Antes meio depois', marks: [{ type: 'bold' }] }] }] }
    const source = reportSchema.nodeFromJSON(content), from = 7, to = 11, slice = source.slice(from, to, true)
    expect(reportSchema.nodeFromJSON(cutRich(content, from, to)).textContent).toBe('meio')
    const updated = replaceRichFragment(content, { type: 'rich', from, to, openStart: slice.openStart, openEnd: slice.openEnd }, text('outro trecho'))
    expect(reportSchema.nodeFromJSON(updated).textContent).toBe('Antes outro trecho depois')
    expect(updated.content?.[0].content?.[0].marks).toEqual([{ type: 'bold' }])
    expect(updated.content?.[0].content?.at(-1)?.marks).toEqual([{ type: 'bold' }])
    expect(source.textContent).toBe('Antes meio depois')
  })
  it('edita linhas de uma tabela dividida sem alterar as linhas das outras páginas', () => {
    const content = { type: 'doc', content: [{ type: 'table', content: ['A', 'B', 'C'].map(value => ({ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] }] })) }] }
    const source = reportSchema.nodeFromJSON(content), from = 1 + source.firstChild!.child(0).nodeSize, to = from + source.firstChild!.child(1).nodeSize, slice = source.slice(from, to, true)
    const fragment = cutRich(content, from, to)
    fragment.content![0].content![0].content![0].content![0].content![0].text = 'Editado'
    expect(reportSchema.nodeFromJSON(replaceRichFragment(content, { type: 'rich', from, to, openStart: slice.openStart, openEnd: slice.openEnd }, fragment)).textContent).toBe('AEditadoC')
  })
  it('continua a numeração de listas nas folhas seguintes', () => {
    const content = { type: 'doc', content: [{ type: 'orderedList', attrs: { start: 3 }, content: ['A', 'B', 'C'].map(value => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })) }] }
    const source = reportSchema.nodeFromJSON(content), from = 1 + source.firstChild!.child(0).nodeSize
    const continuation = cutRich(content, from, source.content.size)
    expect(continuation.content?.[0].attrs?.start).toBe(4)
    expect(reportSchema.nodeFromJSON(continuation).textContent).toBe('BC')
  })
  it('insere e exclui na folha de continuação sem apagar conteúdo de outras folhas', () => {
    const block: ReportBlock = { ...newBlock('text'), content: text('AAAABBBBCCCC') }
    const row = rowFor([[block]]), doc = { ...blankDocument(), rows: [row] }, source = reportSchema.nodeFromJSON(block.content)
    const page = (from: number, to: number, id: string): FlowPage => {
      const slice = source.slice(from, to, true)
      return { id, manualId: FIRST_PAGE, start: 0, end: 1, rows: [{ ...row, columns: [[{ ...block, content: cutRich(block.content, from, to) }]] }], fragments: { [block.id]: { type: 'rich', from, to, openStart: slice.openStart, openEnd: slice.openEnd } } }
    }
    const pages = [page(0, 5, FIRST_PAGE), page(5, 9, 'first:flow:1'), page(9, source.content.size, 'first:flow:2')]
    const deleted = deleteFlowPage(doc, pages[1], pages)
    expect(reportSchema.nodeFromJSON((deleted.rows[0].columns[0][0] as typeof block).content).textContent).toBe('AAAACCCC')
    const added = addFlowPage(doc, pages[1])
    expect(reportPages(added.document)).toHaveLength(3)
    expect(reportPages(added.document)[1].rows).toHaveLength(0)
    const content = (value: typeof doc) => value.rows.flatMap(row => row.columns.flat()).filter(block => 'content' in block).map(block => reportSchema.nodeFromJSON(block.content).textContent).join('')
    expect(content(added.document)).toBe('AAAABBBBCCCC')
    const inserted = insertOnPage(doc, pages[1], { rowId: null, column: 0, index: 1 }, [{ ...newBlock('text'), content: text('NOVO') }])
    expect(content(inserted)).toBe('AAAABBBBNOVOCCCC')
    expect(content(doc)).toBe('AAAABBBBCCCC')
  })
  it('insere na coluna vazia de uma continuação depois do conteúdo já consumido', () => {
    const left: ReportBlock = { ...newBlock('text'), content: text('AAAABBBBCCCC') }, right: ReportBlock = { ...newBlock('text'), content: text('ANTIGO') }
    const row = rowFor([[left], [right]]), doc = { ...blankDocument(), rows: [row] }, source = reportSchema.nodeFromJSON(left.content), slice = source.slice(5, 9, true)
    const page: FlowPage = { id: 'first:flow:1', manualId: FIRST_PAGE, start: 0, end: 1, rows: [{ ...row, columns: [[{ ...left, content: cutRich(left.content, 5, 9) }], []] }], columnOffsets: { [row.id]: [0, 1] }, fragments: { [left.id]: { type: 'rich', from: 5, to: 9, openStart: slice.openStart, openEnd: slice.openEnd } } }
    const inserted = insertOnPage(doc, page, { rowId: row.id, column: 1, index: 0 }, [{ ...newBlock('text'), content: text('NOVO') }])
    const contents = (column: number) => inserted.rows.flatMap(row => row.columns[column]).filter(block => 'content' in block).map(block => reportSchema.nodeFromJSON(block.content).textContent).join('')
    expect(contents(0)).toBe('AAAABBBBCCCC')
    expect(contents(1)).toBe('ANTIGONOVO')
    expect(inserted.rows).toHaveLength(3)
  })
  it('mantém páginas vazias, duplica com IDs próprios e exclui páginas sem misturar seus conteúdos', () => {
    const first: ReportBlock = { ...newBlock('text'), content: text('Primeira página') }
    let doc = { ...blankDocument(), rows: [rowFor([[first]])] }
    const second = addReportPage(doc, FIRST_PAGE); doc = second.document
    expect(reportPages(doc).map(page => page.rows.length)).toEqual([1, 0])
    doc = insertBlocks(doc, { rowId: null, column: 0, index: reportPages(doc)[1].end }, [{ ...newBlock('text'), content: text('Segunda página') }])
    const third = addReportPage(doc, second.pageId, true); doc = third.document
    const pages = reportPages(doc)
    expect(pages).toHaveLength(3)
    expect(pages[1].rows[0].id).not.toBe(pages[2].rows[0].id)
    expect(pages[1].rows[0].columns[0][0].id).not.toBe(pages[2].rows[0].columns[0][0].id)
    expect('content' in pages[2].rows[0].columns[0][0] && pages[2].rows[0].columns[0][0].content).toEqual(text('Segunda página'))
    const middleDeleted = deleteReportPage(doc, second.pageId)
    expect(reportPages(middleDeleted).map(page => page.id)).toEqual([FIRST_PAGE, third.pageId])
    const firstDeleted = deleteReportPage(middleDeleted, FIRST_PAGE)
    expect(reportPages(firstDeleted)).toHaveLength(1)
    expect(firstDeleted.rows).toEqual(pages[2].rows)
    expect(deleteReportPage(firstDeleted, FIRST_PAGE).rows).toEqual([])
    expect(doc.rows).toHaveLength(5)
  })
  it('adiciona uma página entre as existentes e recusa expansão além do limite sem alterar a origem', () => {
    const last = addReportPage(blankDocument(), FIRST_PAGE)
    const middle = addReportPage(last.document, FIRST_PAGE)
    expect(reportPages(middle.document).map(page => page.id)).toEqual([FIRST_PAGE, middle.pageId, last.pageId])
    const full = { ...blankDocument(), rows: Array.from({ length: 500 }, () => rowFor([[newBlock('text')]])) }
    expect(() => addReportPage(full, FIRST_PAGE)).toThrow('500')
    expect(full.rows).toHaveLength(500)
    expect(() => deleteReportPage(full, 'missing')).toThrow('página mudou')
  })
  it('preserva a ordem ao reduzir colunas e permite duplicar e editar sem alterar o original', () => {
    const first: ReportBlock = { ...newBlock('text'), content: text('Esquerda') }, second: ReportBlock = { ...newBlock('text'), content: text('Direita') }
    const row = rowFor([[first], [second]]), single = setColumns(row, 1)
    expect(single.columns[0].map(block => block.id)).toEqual([first.id, second.id])
    expect(setColumns(single, 2).columns.flat().map(block => block.id)).toEqual([first.id, second.id])
    const copy = duplicateRow(single)
    expect(copy.id).not.toBe(row.id)
    expect(copy.columns[0][0].id).not.toBe(first.id)
    const doc = { ...blankDocument(), rows: [row, copy] }
    const changed = replaceBlock(doc, copy.columns[0][0].id, value => 'content' in value ? { ...value, content: text('Outra informação') } : value)
    expect(changed.rows[0]).toEqual(row)
    expect('content' in changed.rows[1].columns[0][0] && changed.rows[1].columns[0][0].content).toEqual(text('Outra informação'))
  })
  it('insere figuras aos pares, preserva quantidade ímpar e recusa destinos removidos e limite excedido', () => {
    const figures: ReportBlock[] = Array.from({ length: 3 }, (_, index) => ({ id: `figure-${index}`, kind: 'figure', assetId: 'image', caption: '', alt: '' }))
    const doc = insertBlocks(blankDocument(), { rowId: null, column: 0, index: 0 }, figures, true)
    expect(doc.rows.map(row => row.columns.map(column => column.length))).toEqual([[1, 1], [1, 0]])
    expect(doc.rows.flatMap(row => row.columns.flat().map(block => block.id))).toEqual(figures.map(block => block.id))
    expect(() => insertBlocks(doc, { rowId: 'removed', column: 0, index: 0 }, [newBlock('text')])).toThrow('local de inserção mudou')
    expect(() => insertBlocks(blankDocument(), { rowId: null, column: 0, index: 0 }, Array.from({ length: 501 }, () => newBlock('text')))).toThrow('500 elementos')
  })
})

describe('exportação Word editável', () => {
  it('gera títulos/textos/tabela nativos e dez figuras internas com legendas, em duas colunas', async () => {
    const title: ReportBlock = { ...newBlock('title'), content: text('Medições & resultados') }
    const paragraph: ReportBlock = { ...newBlock('text'), content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto editável', marks: [{ type: 'bold' }] }] }] } }
    const table = newBlock('table'), pageBreak = newBlock('break')
    let doc = { ...blankDocument(), rows: [rowFor([[title]]), rowFor([[paragraph]]), rowFor([[table]]), rowFor([[pageBreak]])] }
    const figures: ReportBlock[] = Array.from({ length: 10 }, (_, index) => ({ id: `graph-${index}`, kind: 'figure', assetId: 'image', caption: `Figura ${index + 1} — ponto sintético`, alt: `Gráfico ${index + 1}` }))
    doc = insertBlocks(doc, { rowId: null, column: 0, index: doc.rows.length }, figures, true)
    const asset: ReportAsset = { id: 'image', blob: new Blob([png], { type: 'image/png' }), url: 'blob:synthetic', width: 1, height: 1 }
    const before = structuredClone(doc), word = await createWordDocument(doc, new Map([['image', asset]]))
    expect(doc).toEqual(before)
    const zip = await JSZip.loadAsync(await word.arrayBuffer()), xml = await zip.file('word/document.xml')!.async('string')
    expect(xml).toContain('Medições &amp; resultados')
    expect(xml).toContain('Texto editável')
    expect(xml).toContain('w:val="Heading1"')
    expect(xml).toContain('<w:b/>')
    expect(xml.match(/<w:drawing>/g)).toHaveLength(10)
    expect(xml.match(/<w:tbl>/g)).toHaveLength(6)
    expect(xml).toContain('w:type="page"')
    expect(xml).toContain('w:top="1440"')
    expect(xml).toContain('w:bottom="1440"')
    expect(xml).toContain('w:line="275" w:lineRule="exact"')
    for (let i = 1; i <= 10; i++) expect(xml).toContain(`Figura ${i} — ponto sintético`)
    const relationships = await zip.file('word/_rels/document.xml.rels')!.async('string')
    expect(relationships).not.toContain('TargetMode="External"')
    const media = Object.values(zip.files).filter(file => file.name.startsWith('word/media/') && !file.dir)
    expect(media.length).toBeGreaterThan(0)
    expect(Buffer.from(await media[0].async('uint8array'))).toEqual(png)
  })
  it('recusa mídia ausente e conteúdo desconhecido em vez de exportar silenciosamente incompleto', async () => {
    const doc = { ...blankDocument(), rows: [rowFor([[{ id: 'f', kind: 'figure' as const, assetId: 'missing', caption: '', alt: '' }]])] }
    await expect(createWordDocument(doc, new Map())).rejects.toThrow('figura está indisponível')
    const block: ReportBlock = { ...newBlock('text'), content: { type: 'doc', content: [{ type: 'unknown' }] } }
    await expect(createWordDocument({ ...blankDocument(), rows: [rowFor([[block]])] }, new Map())).rejects.toThrow('não suportado')
  })
})
