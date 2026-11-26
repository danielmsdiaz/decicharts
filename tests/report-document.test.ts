// @vitest-environment node
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { blankDocument, duplicateRow, insertBlocks, newBlock, replaceBlock, rowFor, setColumns, type ReportAsset, type ReportBlock } from '../src/features/reports/model'
import { createWordDocument } from '../src/features/reports/word-export'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const text = (value: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })

describe('documento por blocos', () => {
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
