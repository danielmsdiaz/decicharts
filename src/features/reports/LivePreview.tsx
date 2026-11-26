import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { ReportAsset, ReportBlock, ReportDocument, ReportRow } from './model'

const paperWidth = 794, paperHeight = 1123, paperMargin = 76, usableHeight = paperHeight - paperMargin * 2
interface Page { rows: ReportRow[]; height: number }
function RichContent({ nodes = [] }: { nodes?: JSONContent[] }): ReactNode {
  return nodes.map((node, index) => {
    const children = <RichContent nodes={node.content} />
    if (node.type === 'text') {
      let value: ReactNode = node.text
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') value = <strong>{value}</strong>
        if (mark.type === 'italic') value = <em>{value}</em>
        if (mark.type === 'underline') value = <u>{value}</u>
        if (mark.type === 'strike') value = <s>{value}</s>
      }
      return <span key={index}>{value}</span>
    }
    if (node.type === 'hardBreak') return <br key={index} />
    if (node.type === 'paragraph') return <p key={index} style={{ textAlign: node.attrs?.textAlign ?? undefined }}>{children || <br />}</p>
    if (node.type === 'bulletList') return <ul key={index}>{children}</ul>
    if (node.type === 'orderedList') return <ol key={index} start={Number(node.attrs?.start ?? 1)}>{children}</ol>
    if (node.type === 'listItem') return <li key={index}>{children}</li>
    if (node.type === 'table') return <table key={index}><tbody>{children}</tbody></table>
    if (node.type === 'tableRow') return <tr key={index}>{children}</tr>
    if (node.type === 'tableHeader') return <th key={index} colSpan={Number(node.attrs?.colspan ?? 1)} rowSpan={Number(node.attrs?.rowspan ?? 1)}>{children}</th>
    if (node.type === 'tableCell') return <td key={index} colSpan={Number(node.attrs?.colspan ?? 1)} rowSpan={Number(node.attrs?.rowspan ?? 1)}>{children}</td>
    return <span key={index}>{children}</span>
  })
}
function PreviewBlock({ block, assets }: { block: ReportBlock; assets: ReadonlyMap<string, ReportAsset> }) {
  if (block.kind === 'break') return null
  if (block.kind === 'figure') {
    const asset = assets.get(block.assetId)
    return <figure>{asset && <img src={asset.url} width={asset.width} height={asset.height} alt={block.alt} />}{block.caption.trim() && <figcaption>{block.caption}</figcaption>}</figure>
  }
  const content = <RichContent nodes={block.content.content} />
  return block.kind === 'title' ? <h1>{content}</h1> : block.kind === 'subtitle' ? <h2>{content}</h2> : <div>{content}</div>
}
function PreviewRow({ row, assets }: { row: ReportRow; assets: ReadonlyMap<string, ReportAsset> }) {
  return <div className={`report-preview-row preview-columns-${row.columns.length}`} data-preview-row={row.id}>{row.columns.map((column, index) => <div key={index}>{column.map(block => <PreviewBlock key={block.id} block={block} assets={assets} />)}</div>)}</div>
}
export function LivePreview({ document: doc, assets }: { document: ReportDocument; assets: ReadonlyMap<string, ReportAsset> }) {
  const measurement = useRef<HTMLDivElement>(null), container = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<{ scale: number; pages: Page[] }>({ scale: .4, pages: [] })
  useLayoutEffect(() => {
    const element = measurement.current, wrapper = container.current
    if (!element || !wrapper) return
    let active = true
    function measure() {
      if (!active || !element || !wrapper) return
      const pages: Page[] = [{ rows: [], height: 0 }]
      for (const row of doc.rows) {
        if (row.columns.flat().some(block => block.kind === 'break')) { if (pages.at(-1)!.rows.length) pages.push({ rows: [], height: 0 }); continue }
        const height = element.querySelector<HTMLElement>(`[data-preview-row="${row.id}"]`)?.getBoundingClientRect().height ?? 0
        let page = pages.at(-1)!
        if (page.height + height > usableHeight && page.rows.length) { page = { rows: [], height: 0 }; pages.push(page) }
        page.rows.push(row); page.height += height
      }
      const scale = Math.min(1, wrapper.getBoundingClientRect().width / paperWidth)
      setLayout(previous => JSON.stringify(previous) === JSON.stringify({ scale, pages }) ? previous : { scale, pages })
    }
    measure()
    const observer = new ResizeObserver(measure); observer.observe(element); observer.observe(wrapper)
    void window.document.fonts.ready.then(measure)
    return () => { active = false; observer.disconnect() }
  }, [doc, assets])
  return <div ref={container} className="report-live-preview" aria-label="Prévia em tempo real">
    <div ref={measurement} className="report-preview-measure report-print-content" aria-hidden="true">{doc.rows.map(row => <PreviewRow key={row.id} row={row} assets={assets} />)}</div>
    {(layout.pages.length ? layout.pages : [{ rows: [], height: 0 }]).map((page, index) => {
      const continuous = page.height > usableHeight
      const height = Math.max(paperHeight, page.height + paperMargin * 2)
      return <div className="report-preview-page-wrap" key={index} style={{ height: height * layout.scale + 32 }}>
        <div className="report-preview-page report-print-content" style={{ width: paperWidth, minHeight: height, transform: `scale(${layout.scale})` }}>
          {page.rows.map(row => <PreviewRow key={row.id} row={row} assets={assets} />)}
          {!doc.rows.length && <p className="report-preview-empty">Seu conteúdo aparece aqui enquanto você edita.</p>}
        </div>
        <span className="report-preview-page-number">{continuous ? 'Trecho longo · prévia contínua' : index + 1}</span>
      </div>
    })}
  </div>
}
