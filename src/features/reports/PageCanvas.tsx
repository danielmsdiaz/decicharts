import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export type PageZoom = 'fit' | '100' | '125' | '150'
export function PageCanvas({ pageId, zoom, children }: { pageId: string; zoom: PageZoom; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () => setFit(Math.max(.2, (element.clientWidth - (window.innerWidth <= 640 ? 24 : 48)) / 794))
    measure()
    const observer = new ResizeObserver(measure); observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => { viewport.current?.scrollTo({ top: 0, left: 0 }) }, [pageId])
  return <div ref={viewport} className="report-canvas-viewport"><div className="report-page-zoom" style={{ zoom: zoom === 'fit' ? fit : Number(zoom) / 100 }}>{children}</div></div>
}
