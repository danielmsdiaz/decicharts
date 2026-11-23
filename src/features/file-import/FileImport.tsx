import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Check, FileSpreadsheet, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { ColumnMapping, ImportSource, MeasurementDataset } from '@/features/measurements/types'
import { formatTime } from '@/features/measurements/range'
import { suggestMapping } from './normalize'
import { validateFile } from './validation'

const timezoneOptions = ['America/Recife', 'America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Cuiaba', 'America/Rio_Branco', 'UTC', 'Europe/Lisbon', 'America/New_York']

export function FileImport({ onImport, hasDataset }: { onImport: (dataset: MeasurementDataset) => boolean; hasDataset: boolean }) {
  const [source, setSource] = useState<ImportSource | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [candidate, setCandidate] = useState<MeasurementDataset | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const worker = useRef<Worker | null>(null)
  const request = useRef(0)
  useEffect(() => () => { worker.current?.terminate() }, [])

  function cancel() {
    request.current++; worker.current?.terminate(); worker.current = null
    setSource(null); setMapping(null); setCandidate(null); setBusy(false); setError(''); setStatus('Importação cancelada.')
  }
  async function read(file: File) {
    try { validateFile(file) } catch (issue) { setError((issue as Error).message); return }
    worker.current?.terminate()
    const id = ++request.current
    setBusy(true); setError(''); setStatus('Lendo arquivo no navegador…'); setCandidate(null); setSource(null); setMapping(null)
    try {
      const nextWorker = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' })
      worker.current = nextWorker
      nextWorker.onmessage = (event: MessageEvent<{ id: number; type: string; source?: ImportSource; dataset?: MeasurementDataset; error?: string }>) => {
        if (event.data.id !== request.current) return
        setBusy(false)
        if (event.data.type === 'error') { setError(event.data.error ?? 'Erro ao processar o arquivo.'); setStatus(''); return }
        if (event.data.source) {
          setSource(event.data.source); setSheetIndex(0); setMapping(suggestMapping(event.data.source.sheets[0])); setStatus('Arquivo lido. Confira as colunas sugeridas antes de normalizar.')
        }
        if (event.data.dataset) { setCandidate(event.data.dataset); setStatus('Prévia pronta. Confira os resultados antes de usar a série.') }
      }
      nextWorker.onerror = () => { if (id <= request.current && worker.current === nextWorker) { setBusy(false); setError('O processamento foi interrompido. Tente um arquivo menor ou selecione novamente.'); setStatus('') } }
      const buffer = await file.arrayBuffer()
      if (request.current === id) nextWorker.postMessage({ id, type: 'read', buffer, fileName: file.name }, [buffer])
    } catch {
      if (request.current === id) { setBusy(false); setError('Não foi possível abrir o arquivo. Selecione-o novamente.'); setStatus('') }
    }
  }
  function changeMapping<K extends keyof ColumnMapping>(key: K, value: ColumnMapping[K]) {
    if (!mapping) return
    setMapping({ ...mapping, [key]: value }); setCandidate(null); setError(''); setStatus('Mapeamento alterado. Gere uma nova prévia.')
  }
  function normalize() {
    if (!mapping || !worker.current) return
    setBusy(true); setError(''); setStatus('Normalizando e conferindo as medições…'); setCandidate(null)
    worker.current.postMessage({ id: ++request.current, type: 'normalize', sheetIndex, mapping })
  }
  function drop(event: DragEvent) {
    event.preventDefault(); setDragging(false)
    if (busy) return
    if (event.dataTransfer.files.length !== 1) { setError('Selecione um arquivo por vez.'); return }
    void read(event.dataTransfer.files[0])
  }
  const sheet = source?.sheets[sheetIndex]
  const headers = sheet?.rows[mapping?.headerRow ?? 0] ?? []
  const columnOptions = headers.map((header, index) => <option key={index} value={index}>{index + 1}. {String(header ?? '').trim().slice(0, 80) || 'Sem título'}</option>)

  if (hasDataset && !source && !busy) return <section className={`panel p-5 ${dragging ? 'border-primary bg-accent' : ''}`} aria-labelledby="import-title" onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 id="import-title" className="font-semibold">Importar outra medição</h2><p className="mt-1 text-sm text-muted-foreground">Arraste outro Excel ou CSV aqui · Até 20 MiB e 250 mil registros</p></div><Button variant="outline" onClick={() => input.current?.click()}><FileSpreadsheet />Selecionar arquivo</Button></div>
    <input ref={input} type="file" accept=".csv,.xlsx,.xls" aria-label="Arquivo de medições" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void read(file); event.target.value = '' }} />
    {status && <p className="sr-only" role="status">{status}</p>}{error && <p className="notice error mt-4" role="alert">{error}</p>}
  </section>

  return <section className="panel p-5 sm:p-7" aria-labelledby="import-title" aria-busy={busy}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 id="import-title" className="text-lg font-semibold">{hasDataset ? 'Importar outra medição' : 'Comece pelo seu arquivo'}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Excel ou CSV, até 20 MiB e 250 mil registros. O arquivo permanece neste navegador.</p></div>{(source || busy) && <Button variant="ghost" size="sm" onClick={cancel}><X />Cancelar importação</Button>}</div>
    <div className={`rounded-lg border border-dashed px-5 py-7 text-center transition-colors ${dragging ? 'border-primary bg-accent' : 'border-input'}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <Upload className="mx-auto mb-3 size-6 text-primary" aria-hidden="true" /><p className="text-sm">Arraste seu arquivo aqui ou selecione no computador</p><Button variant="outline" className="mt-4" disabled={busy} onClick={() => input.current?.click()}><FileSpreadsheet />Selecionar arquivo</Button><input ref={input} type="file" accept=".csv,.xlsx,.xls" aria-label="Arquivo de medições" className="sr-only" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void read(file); event.target.value = '' }} /><p className="mt-3 text-sm text-muted-foreground">.xlsx · .xls · .csv</p>
    </div>
    {status && <p className="mt-4 text-sm text-muted-foreground" role="status">{busy && <span className="mr-2 inline-block size-2 rounded-full bg-primary" />}{status}</p>}
    {error && <p className="notice error mt-4" role="alert">{error}</p>}
    {source && mapping && <div className="mt-6 border-t pt-6">
      <h3 className="mb-4 flex items-center gap-2 font-medium"><FileSpreadsheet className="size-4 text-primary" aria-hidden="true" /><span className="break-all">{source.fileName}</span></h3>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><legend className="sr-only">Mapeamento das colunas</legend>
        <label className="field">Aba<Select value={sheetIndex} onChange={event => { const index = Number(event.target.value); setSheetIndex(index); setMapping(suggestMapping(source.sheets[index])); setCandidate(null); setError(''); setStatus('Aba alterada. Confira o mapeamento.') }}>{source.sheets.map((item, index) => <option key={index} value={index}>{item.name}</option>)}</Select></label>
        <label className="field">Linha do cabeçalho<Input type="number" min="1" max="100" value={mapping.headerRow + 1} onChange={event => { setMapping({ ...mapping, headerRow: Number(event.target.value) - 1, dateColumn: -1, timeColumn: null, valueColumn: -1 }); setCandidate(null) }} /></label>
        <label className="field">Coluna de {mapping.timeOnly ? 'hora' : 'data / data e hora'}<Select value={mapping.dateColumn} onChange={event => changeMapping('dateColumn', Number(event.target.value))}><option value={-1}>Selecione a coluna</option>{columnOptions}</Select></label>
        <label className="field">Coluna de nível sonoro<Select value={mapping.valueColumn} onChange={event => changeMapping('valueColumn', Number(event.target.value))}><option value={-1}>Selecione a coluna</option>{columnOptions}</Select></label>
        <label className="field">Hora em coluna separada<Select disabled={mapping.timeOnly} value={mapping.timeColumn ?? -1} onChange={event => changeMapping('timeColumn', Number(event.target.value) === -1 ? null : Number(event.target.value))}><option value={-1}>Não há coluna separada</option>{columnOptions}</Select></label>
        <label className="field">Formato da data<Select disabled={mapping.timeOnly} value={mapping.dateFormat} onChange={event => changeMapping('dateFormat', event.target.value as ColumnMapping['dateFormat'])}><option value="br">Brasileiro: DD/MM/AAAA</option><option value="iso">ISO: AAAA-MM-DD</option><option value="excel">Serial Excel</option></Select></label>
        <label className="field">Separador decimal<Select value={mapping.decimal} onChange={event => changeMapping('decimal', event.target.value as ',' | '.')}><option value=",">Vírgula: 65,4</option><option value=".">Ponto: 65.4</option></Select></label>
        <label className="field">Unidade<Input value={mapping.unit} maxLength={30} placeholder="Ex.: dB ou dB(A)" onChange={event => changeMapping('unit', event.target.value)} /></label>
        <label className="field sm:col-span-2">Fuso das medições<Input list="timezones" value={mapping.timezone} onChange={event => changeMapping('timezone', event.target.value)} /><datalist id="timezones">{timezoneOptions.map(zone => <option key={zone} value={zone} />)}</datalist></label>
        <div className="flex flex-col justify-center gap-2 sm:col-span-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mapping.timeOnly} onChange={event => { setMapping({ ...mapping, timeOnly: event.target.checked, timeColumn: null }); setCandidate(null) }} className="size-4 accent-primary" />O arquivo informa apenas horários</label>{mapping.timeOnly && <label className="field">Data de referência<Input type="date" value={mapping.referenceDate} onChange={event => changeMapping('referenceDate', event.target.value)} /></label>}</div>
      </fieldset>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">Confira as sugestões. Timestamps com offset mantêm o instante informado. Linhas inválidas serão identificadas; valores repetidos serão preservados. Use ponto ou vírgula decimal sem separadores de milhar.</p>
      {!candidate && <div className="mt-5 overflow-x-auto rounded-md border"><table className="w-full text-left text-sm"><caption className="p-3 text-left text-muted-foreground">Primeiras linhas originais da aba</caption><thead className="bg-accent"><tr>{headers.map((cell, index) => <th key={index} className="max-w-60 px-3 py-2 font-medium">{String(cell ?? '')}</th>)}</tr></thead><tbody>{sheet?.rows.slice(mapping.headerRow + 1, mapping.headerRow + 5).map((row, index) => <tr key={index} className="border-t">{headers.map((_, column) => <td key={column} className="max-w-60 truncate px-3 py-2">{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table></div>}
      <Button className="mt-5" variant="outline" disabled={busy || mapping.dateColumn < 0 || mapping.valueColumn < 0} onClick={normalize}>{busy ? 'Processando…' : candidate ? 'Atualizar prévia' : 'Conferir e gerar prévia'}</Button>
    </div>}
    {candidate && <div className="mt-6 border-t pt-6">
      <h3 className="font-semibold">Confira antes de importar</h3><p className="mt-2 text-sm leading-6"><strong>{candidate.validRecords.toLocaleString('pt-BR')}</strong> válidos de {candidate.totalRecords.toLocaleString('pt-BR')} registros · {candidate.invalidRecords.toLocaleString('pt-BR')} inválidos · {candidate.duplicateTimestamps.toLocaleString('pt-BR')} timestamps repetidos adicionais</p>
      {candidate.invalidRecords > 0 && <p className="notice mt-4">As linhas inválidas serão excluídas da série. Revise os motivos abaixo ou ajuste o mapeamento.</p>}
      <div className="mt-4 overflow-x-auto rounded-md border"><table className="w-full text-left text-sm"><caption className="sr-only">Prévia de até 10 linhas no fuso {candidate.timezone}</caption><thead className="bg-accent"><tr>{['Linha', 'Valores originais', `Data/hora · ${candidate.timezone}`, candidate.unit, 'Validação'].map(label => <th key={label} className="whitespace-nowrap px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{candidate.preview.map(record => <tr key={record.row} className="border-t"><td className="px-3 py-3">{record.row}</td><td className="max-w-64 truncate px-3 py-3" title={record.original.join(' | ')}>{record.original.join(' | ').slice(0, 500)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{record.timestamp === undefined ? '—' : formatTime(record.timestamp, candidate.timezone)}</td><td className="px-3 py-3 tabular-nums">{record.value === undefined ? '—' : record.value.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td><td className="min-w-48 px-3 py-3">{record.reason ?? 'Válido'}</td></tr>)}</tbody></table></div>
      {candidate.invalidPreview.length > 0 && <details className="mt-4 text-sm"><summary className="font-medium">Ver motivos das linhas inválidas (até 100)</summary><ul className="mt-3 max-h-64 space-y-2 overflow-auto pr-2">{candidate.invalidPreview.map(record => <li key={record.row}>Linha {record.row}: {record.reason} <span className="text-muted-foreground">{record.original.join(' | ').slice(0, 200)}</span></li>)}</ul></details>}
      {!candidate.validRecords && <p className="notice error mt-4" role="alert">Nenhuma medição válida. Corrija o mapeamento ou escolha outro arquivo.</p>}
      <Button className="mt-5" disabled={candidate.validRecords === 0} onClick={() => { if (onImport(candidate)) { cancel(); setStatus('Série importada. O gráfico está pronto abaixo.') } }}><Check />{hasDataset ? 'Substituir série atual' : 'Usar esta série'}</Button>
    </div>}
  </section>
}
