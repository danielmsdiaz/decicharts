import { useEffect, useRef, useState } from 'react'
import type { ColumnMapping, ImportSource, MeasurementDataset } from '@/features/measurements/types'
import { suggestMapping } from './normalize'
import { validateFile } from './validation'
import { DEFAULT_PREFERENCES, type Preferences } from '../../../shared/persistence'

interface WorkerResponse {
  id: number
  type: 'source' | 'dataset' | 'datasets' | 'error'
  source?: ImportSource
  dataset?: MeasurementDataset
  datasets?: MeasurementDataset[]
  pointIndex?: number
  error?: string
}

export function useFileImport(defaults: Preferences = DEFAULT_PREFERENCES) {
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [source, setSource] = useState<ImportSource | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [candidate, setCandidate] = useState<MeasurementDataset | null>(null)
  const [datasets, setDatasets] = useState<MeasurementDataset[]>([])
  const [pointIndex, setPointIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const worker = useRef<Worker | null>(null)
  const request = useRef(0)

  useEffect(() => () => worker.current?.terminate(), [])

  function reset(message: string) {
    request.current++
    worker.current?.terminate()
    worker.current = null
    setFile(null)
    setSource(null)
    setMapping(null)
    setCandidate(null)
    setDatasets([])
    setPointIndex(0)
    setBusy(false)
    setError('')
    setSettingsOpen(false)
    setStatus(message)
  }

  function normalize(nextMapping = mapping, nextSheet = sheetIndex) {
    if (!nextMapping || !worker.current) return
    setBusy(true)
    setError('')
    setCandidate(null)
    setStatus('Conferindo as medições…')
    worker.current.postMessage({ id: ++request.current, type: 'normalize', sheetIndex: nextSheet, mapping: nextMapping, pointIndex })
  }
  function loadSheet(nextSource: ImportSource, index: number) {
    const sheet = nextSource.sheets[index]
    setSheetIndex(index); setPointIndex(0); setDatasets([]); setCandidate(null); setError('')
    if (sheet.points?.length) {
      setBusy(true); setMapping(sheet.points[0].mapping); setStatus('Conferindo os pontos de medição…')
      worker.current?.postMessage({ id: ++request.current, type: 'points', sheetIndex: index, defaults })
      return
    }
    const nextMapping = suggestMapping(sheet)
    nextMapping.timezone = defaults.timezone; nextMapping.unit = defaults.unit
    setMapping(nextMapping)
    if (nextMapping.dateColumn >= 0 && nextMapping.valueColumn >= 0) {
      setBusy(true); setStatus('Conferindo as medições…')
      worker.current?.postMessage({ id: ++request.current, type: 'normalize', sheetIndex: index, mapping: nextMapping, pointIndex: 0 })
    } else { setBusy(false); setSettingsOpen(false); setStatus('Escolha as colunas de horário e nível sonoro para continuar.') }
  }

  async function read(nextFile: File) {
    try {
      validateFile(nextFile)
    } catch (issue) {
      setError((issue as Error).message)
      return
    }
    worker.current?.terminate()
    const id = ++request.current
    setFile({ name: nextFile.name, size: nextFile.size })
    setBusy(true)
    setError('')
    setStatus('Lendo seu arquivo…')
    setCandidate(null)
    setDatasets([])
    setPointIndex(0)
    setSource(null)
    setMapping(null)
    setSheetIndex(0)
    setSettingsOpen(false)
    try {
      const nextWorker = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' })
      worker.current = nextWorker
      nextWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== request.current) return
        if (event.data.type === 'error') {
          setBusy(false)
          setError(event.data.error ?? 'Não foi possível ler o arquivo. Selecione-o novamente.')
          setStatus('A leitura precisa de atenção.')
          setSettingsOpen(true)
          return
        }
        if (event.data.source) {
          const nextSource = event.data.source
          setSource(nextSource)
          loadSheet(nextSource, 0)
        }
        if (event.data.datasets) {
          const items = event.data.datasets
          const active = Math.max(0, items.findIndex(data => data.validRecords > 0))
          setDatasets(items); setPointIndex(active); setCandidate(items[active]); setMapping(items[active].mapping)
          setBusy(false); setStatus(`${items.length} ${items.length === 1 ? 'ponto encontrado' : 'pontos encontrados'}. Confira a prévia.`)
        }
        if (event.data.dataset) {
          setCandidate(event.data.dataset)
          const data = event.data.dataset, index = event.data.pointIndex ?? 0
          setDatasets(previous => { const next = [...previous]; next[index] = data; return next })
          setBusy(false)
          setStatus(event.data.dataset.validRecords ? 'Leitura concluída.' : 'Revise a leitura: nenhuma medição válida foi encontrada.')
          if (!event.data.dataset.validRecords) setSettingsOpen(true)
        }
      }
      nextWorker.onerror = () => {
        if (worker.current !== nextWorker) return
        setBusy(false)
        setError('O processamento foi interrompido. Tente um arquivo menor ou selecione novamente.')
        setStatus('Não foi possível concluir a leitura.')
      }
      const buffer = await nextFile.arrayBuffer()
      if (request.current === id) nextWorker.postMessage({ id, type: 'read', buffer, fileName: nextFile.name }, [buffer])
    } catch {
      if (request.current === id) {
        setBusy(false)
        setError('Não foi possível abrir o arquivo. Selecione-o novamente.')
        setStatus('Falha na leitura do arquivo.')
      }
    }
  }

  function changeMapping<K extends keyof ColumnMapping>(key: K, value: ColumnMapping[K]) {
    if (!mapping) return
    const nextMapping = { ...mapping, [key]: value }
    setMapping(nextMapping)
    setCandidate(null)
    setError('')
    setStatus('Leitura alterada. Atualize a prévia para conferir os dados.')
    if ((mapping.dateColumn < 0 || mapping.valueColumn < 0) && nextMapping.dateColumn >= 0 && nextMapping.valueColumn >= 0) normalize(nextMapping)
  }

  function selectSheet(index: number) {
    if (!source) return
    loadSheet(source, index)
  }
  function selectPoint(index: number) {
    const data = datasets[index]
    if (!data || busy) return
    setPointIndex(index); setCandidate(data); setMapping(data.mapping); setError('')
  }

  return {
    file, source, sheetIndex, mapping, candidate, datasets, pointIndex, busy, error, status,
    settingsOpen, setSettingsOpen, setError, read, normalize, changeMapping, selectSheet, selectPoint,
    cancel: () => reset('Importação cancelada.'),
    finish: () => reset('Arquivo importado.'),
    removed: () => reset('Arquivo removido.'),
  }
}
