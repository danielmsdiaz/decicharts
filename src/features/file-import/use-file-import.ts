import { useEffect, useRef, useState } from 'react'
import type { ColumnMapping, ImportSource, MeasurementDataset } from '@/features/measurements/types'
import { suggestMapping } from './normalize'
import { validateFile } from './validation'
import { DEFAULT_PREFERENCES, type Preferences } from '../../../shared/persistence'

interface WorkerResponse {
  id: number
  type: 'source' | 'dataset' | 'error'
  source?: ImportSource
  dataset?: MeasurementDataset
  error?: string
}

export function useFileImport(defaults: Preferences = DEFAULT_PREFERENCES) {
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [source, setSource] = useState<ImportSource | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [candidate, setCandidate] = useState<MeasurementDataset | null>(null)
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
    worker.current.postMessage({ id: ++request.current, type: 'normalize', sheetIndex: nextSheet, mapping: nextMapping })
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
          const nextMapping = suggestMapping(nextSource.sheets[0])
          nextMapping.timezone = defaults.timezone
          nextMapping.unit = defaults.unit
          setSource(nextSource)
          setMapping(nextMapping)
          if (nextMapping.dateColumn >= 0 && nextMapping.valueColumn >= 0) {
            normalize(nextMapping, 0)
          } else {
            setBusy(false)
            setSettingsOpen(false)
            setStatus('Escolha as colunas de horário e nível sonoro para continuar.')
          }
        }
        if (event.data.dataset) {
          setCandidate(event.data.dataset)
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
    const nextMapping = suggestMapping(source.sheets[index])
    // Preserve explicit interpretation choices when switching worksheets.
    if (mapping) { nextMapping.timezone = mapping.timezone; nextMapping.unit = mapping.unit }
    setSheetIndex(index)
    setMapping(nextMapping)
    setCandidate(null)
    setError('')
    if (nextMapping.dateColumn >= 0 && nextMapping.valueColumn >= 0) normalize(nextMapping, index)
    else { setSettingsOpen(false); setStatus('Escolha as colunas desta aba para continuar.') }
  }

  return {
    file, source, sheetIndex, mapping, candidate, busy, error, status,
    settingsOpen, setSettingsOpen, setError, read, normalize, changeMapping, selectSheet,
    cancel: () => reset('Importação cancelada.'),
    finish: () => reset('Arquivo importado.'),
    removed: () => reset('Arquivo removido.'),
  }
}
