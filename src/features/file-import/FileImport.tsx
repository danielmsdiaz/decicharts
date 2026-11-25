import { useRef, useState, type DragEvent } from 'react'
import { ArrowRight, Check, CheckCheck, FileSpreadsheet, FolderOpen, SlidersHorizontal, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { ColumnMapping, MeasurementDataset } from '@/features/measurements/types'
import { datasetTime, levelUnit } from '@/features/measurements/temporal'
import { useFileImport } from './use-file-import'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { useAccount } from '@/features/account/account-context'
import { DEFAULT_PREFERENCES } from '../../../shared/persistence'

const timezoneOptions = ['America/Recife', 'America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Cuiaba', 'America/Rio_Branco', 'UTC', 'Europe/Lisbon', 'America/New_York']
const count = (value: number) => value.toLocaleString('pt-BR')

interface FileImportProps {
  dataset: MeasurementDataset | null
  saved?: boolean
  onImport: (dataset: MeasurementDataset, all?: MeasurementDataset[]) => boolean | Promise<boolean>
  onRemove: () => boolean | Promise<boolean>
}

export function FileImport({ dataset, saved = false, onImport, onRemove }: FileImportProps) {
  const { profile, loading: profileLoading, error: profileError } = useAccount()
  const form = useFileImport(profile?.preferences ?? DEFAULT_PREFERENCES)
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const { file, source, mapping, candidate, busy, settingsOpen } = form
  const sheet = source?.sheets[form.sheetIndex]
  const headers = sheet?.rows[mapping?.headerRow ?? 0] ?? []
  const columnOptions = headers.map((header, index) => (
    <option key={index} value={index}>{String(header ?? '').trim().slice(0, 80) || `Coluna ${index + 1}`}</option>
  ))

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (busy || profileLoading) return
    if (event.dataTransfer.files.length !== 1) { form.setError('Escolha um arquivo por vez.'); return }
    void form.read(event.dataTransfer.files[0])
  }

  const fileInput = <input
    ref={input} type="file" accept=".csv,.xlsx,.xls" aria-label="Arquivo de medições"
    className="sr-only" tabIndex={-1} disabled={busy || profileLoading}
    onChange={event => {
      const nextFile = event.target.files?.[0]
      if (nextFile) void form.read(nextFile)
      event.target.value = ''
    }}
  />

  if (!file) return (
    <section aria-label={dataset ? 'Arquivo em análise' : 'Importar medições'}>
      {fileInput}
      {dataset ? (
        <div className={`file-bar ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}>
          <span className="file-symbol"><FileSpreadsheet aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-sm text-primary"><CheckCheck className="size-4" aria-hidden="true" />Arquivo em análise</div>
            <p className="truncate font-semibold" title={dataset.fileName}>{dataset.fileName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{count(dataset.validRecords)} medições · {dataset.sheetName}{saved ? (dataset.point ? ' · Ponto salvo na sua conta' : ' · Salva na sua conta') : ' · Ainda não salva'}</p>
          </div>
          <div className="file-actions">
            <Button variant="outline" disabled={profileLoading} onClick={() => input.current?.click()}><FolderOpen />Trocar arquivo</Button>
            <Button variant="outline" onClick={async () => { if (await onRemove()) form.removed() }}><X />{saved ? (dataset.point ? 'Fechar arquivo' : 'Fechar análise') : 'Remover arquivo'}</Button>
          </div>
        </div>
      ) : (
        <div className={`upload-zone ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}>
          <span className="upload-symbol"><Upload aria-hidden="true" /></span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Importar medições</h2>
          <p className="mt-2 text-sm text-muted-foreground">Arraste uma planilha Excel ou CSV para começar.</p>
          <Button className="mt-6" disabled={profileLoading} onClick={() => input.current?.click()}><FolderOpen />{profileLoading ? 'Carregando preferências…' : 'Selecionar arquivo'}</Button>
          <div className="upload-formats"><span>.xlsx</span><span>.xls</span><span>.csv</span><HelpTooltip label="Limites de importação">Até 20 MiB e 250 mil registros por arquivo. Pode conter um ou mais pontos de medição.</HelpTooltip></div>
        </div>
      )}
      {form.error && <p className="notice error mt-4" role="alert">{form.error}</p>}
      {profileError && <p className="notice warning mt-4">Preferências da conta indisponíveis. Confira o fuso e a unidade em Ajustar leitura ao importar.</p>}
      {form.status && <p className={dataset ? 'sr-only' : 'mt-4 text-sm text-muted-foreground'} role="status">{form.status}</p>}

    </section>
  )

  return (
    <section className="panel overflow-hidden" aria-labelledby="import-title" aria-busy={busy}>
      {fileInput}
      <div className="file-bar file-bar-pending">
        <span className="file-symbol"><FileSpreadsheet aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 id="import-title" className="text-sm font-medium text-primary">Arquivo carregado</h2>
            <span className="file-type">{file.name.split('.').at(-1)?.toUpperCase()}</span>
          </div>
          <p className="break-all font-semibold">{file.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{count(Math.ceil(file.size / 1024))} KiB{dataset ? ' · A série atual será mantida até você confirmar a troca.' : ''}</p>
        </div>
        <Button variant="destructive" onClick={form.cancel}><X />Cancelar importação</Button>
      </div>

      <div className="import-content">
        <div className="mb-5 flex items-center gap-2.5 text-sm" role="status">
          {busy ? <span className="size-2 rounded-full bg-primary" /> : candidate?.validRecords ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
          <span className={busy ? 'text-muted-foreground' : ''}>{form.status}</span>
        </div>
        {form.error && <p className="notice error mb-5" role="alert">{form.error}</p>}
        {source && source.sheets.length > 1 && (
          <label className="field mb-5 max-w-sm">Qual aba você quer analisar?
            <Select value={form.sheetIndex} disabled={busy} onChange={event => form.selectSheet(Number(event.target.value))}>
              {source.sheets.map((item, index) => <option key={index} value={index}>{item.name}</option>)}
            </Select>
          </label>
        )}

        {mapping && (mapping.dateColumn < 0 || mapping.valueColumn < 0) && (
          <div className="mb-5 grid gap-5 sm:grid-cols-2">
            {mapping.dateColumn < 0 && <label className="field">Coluna de data e hora
              <Select value={mapping.dateColumn} onChange={event => form.changeMapping('dateColumn', Number(event.target.value))}><option value={-1}>Selecione a coluna</option>{columnOptions}</Select>
            </label>}
            {mapping.valueColumn < 0 && <label className="field">Coluna de nível sonoro
              <Select value={mapping.valueColumn} onChange={event => form.changeMapping('valueColumn', Number(event.target.value))}><option value={-1}>Selecione a coluna</option>{columnOptions}</Select>
            </label>}
          </div>
        )}

        {form.datasets.length > 1 && <label className="field mb-5 max-w-lg">Conferir ponto<Select value={form.pointIndex} disabled={busy} onChange={event => form.selectPoint(Number(event.target.value))}>{form.datasets.map((data, index) => <option key={index} value={index}>{data.point?.id ?? `Série ${index + 1}`} · {count(data.validRecords)} medições{data.validRecords ? '' : ' · sem dados válidos'}</option>)}</Select></label>}
        {candidate && (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{count(candidate.validRecords)} medições encontradas</h3>
              <p className="text-sm text-muted-foreground">{candidate.timeBasis === 'elapsed' ? 'Tempo decorrido em segundos' : `Horários em ${candidate.timezone}`}</p>
            </div>
            {candidate.invalidRecords > 0 && <p className="notice warning mb-4">{count(candidate.invalidRecords)} {candidate.invalidRecords === 1 ? 'linha não pôde ser lida e será ignorada' : 'linhas não puderam ser lidas e serão ignoradas'}. Confira os motivos abaixo ou ajuste a leitura.</p>}
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">Prévia das primeiras medições do arquivo carregado</caption>
                <thead><tr><th>{candidate.timeBasis === 'elapsed' ? 'Tempo decorrido' : 'Data e hora'}</th><th>Nível sonoro ({levelUnit(candidate)})</th>{candidate.preview.some(record => record.reason) && <th>Conferência</th>}</tr></thead>
                <tbody>{candidate.preview.slice(0, 5).map(record => (
                  <tr key={record.row}>
                    <td className="whitespace-nowrap tabular-nums">{record.timestamp === undefined ? String(record.original[mapping?.dateColumn ?? 0] ?? '—') : datasetTime(candidate, record.timestamp, record.timestamp % 1000 ? 'dd/MM/yyyy HH:mm:ss.SSS' : 'dd/MM/yyyy HH:mm:ss')}</td>
                    <td className="tabular-nums">{record.value === undefined ? String(record.original[mapping?.valueColumn ?? 1] ?? '—') : record.value.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td>
                    {candidate.preview.some(item => item.reason) && <td className="min-w-52 text-muted-foreground">{record.reason ?? 'Válido'}</td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="preview-caption"><span>Prévia · {Math.min(candidate.preview.length, 5)} linhas</span><HelpTooltip label="Sobre a prévia">O gráfico usará todas as medições válidas, não apenas as linhas desta prévia. Todos os pontos válidos da aba ficam disponíveis após gerar o gráfico.</HelpTooltip></div>
            {candidate.duplicateTimestamps > 0 && <p className="mt-3 text-sm text-muted-foreground">{count(candidate.duplicateTimestamps)} {candidate.duplicateTimestamps === 1 ? 'horário repetido preservado' : 'horários repetidos preservados'}, com todos os valores originais.</p>}
            {candidate.invalidPreview.length > 0 && (
              <details className="disclosure mt-4"><summary>Ver linhas com problema ({count(candidate.invalidRecords)})</summary>
                <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm text-muted-foreground">{candidate.invalidPreview.map(record => <li key={record.row}><strong className="text-foreground">Linha {record.row}:</strong> {record.reason}</li>)}</ul>
              </details>
            )}
          </>
        )}

        {mapping && (
          <details className="disclosure reading-settings" open={settingsOpen} onToggle={event => form.setSettingsOpen(event.currentTarget.open)}>
            <summary><SlidersHorizontal className="size-4" aria-hidden="true" />Ajustar leitura do arquivo<HelpTooltip label="Sobre os ajustes de leitura">Altere somente se as colunas ou os valores da prévia não corresponderem ao arquivo. A ponderação acústica deve ser confirmada pelo equipamento.</HelpTooltip></summary>

            <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2"><legend className="sr-only">Configuração de leitura do arquivo</legend>
              <label className="field">Coluna com {mapping.timeOnly ? 'o horário' : 'a data e o horário'}
                <Select value={mapping.dateColumn} onChange={event => form.changeMapping('dateColumn', Number(event.target.value))}><option value={-1}>Selecione a coluna</option>{columnOptions}</Select>
              </label>
              <label className="field">Coluna com o nível sonoro
                <Select value={mapping.valueColumn} onChange={event => form.changeMapping('valueColumn', Number(event.target.value))}><option value={-1}>Selecione a coluna</option>{columnOptions}</Select>
              </label>
              <label className="field">Linha com os títulos das colunas
                <Input type="number" min="1" max="100" value={mapping.headerRow + 1} onChange={event => form.changeMapping('headerRow', Number(event.target.value) - 1)} />
              </label>
              <label className="field">O tempo representa<Select value={mapping.timeBasis ?? 'absolute'} onChange={event => form.changeMapping('timeBasis', event.target.value as 'absolute' | 'elapsed')}><option value="absolute">Data e hora</option><option value="elapsed">Segundos decorridos</option></Select></label>
              <label className="field">Ponderação confirmada do equipamento<Select value={mapping.weighting ?? 'unknown'} onChange={event => form.changeMapping('weighting', event.target.value as 'unknown' | 'A' | 'C' | 'Z')}><option value="unknown">Não informada</option><option value="A">A</option><option value="C">C</option><option value="Z">Z</option></Select></label>
              <label className="field">Formato da data
                <Select disabled={mapping.timeOnly || mapping.timeBasis === 'elapsed'} value={mapping.dateFormat} onChange={event => form.changeMapping('dateFormat', event.target.value as ColumnMapping['dateFormat'])}><option value="br">Dia/mês/ano · 23/11/2026</option><option value="iso">Ano-mês-dia · 2026-11-23</option><option value="excel">Número de data do Excel</option></Select>
              </label>
              <label className="field">Como os decimais aparecem?
                <Select value={mapping.decimal} onChange={event => form.changeMapping('decimal', event.target.value as ',' | '.')}><option value=",">Com vírgula · 65,4</option><option value=".">Com ponto · 65.4</option></Select>
              </label>
              <label className="field">Unidade dos valores<Input value={mapping.unit} maxLength={30} onChange={event => form.changeMapping('unit', event.target.value)} /></label>
              <label className="field">Horário em outra coluna
                <Select disabled={mapping.timeOnly || mapping.timeBasis === 'elapsed'} value={mapping.timeColumn ?? -1} onChange={event => form.changeMapping('timeColumn', Number(event.target.value) === -1 ? null : Number(event.target.value))}><option value={-1}>Data e hora estão juntas</option>{columnOptions}</Select>
              </label>
              <label className="field">Fuso horário do arquivo
                <Input list="timezones" disabled={mapping.timeBasis === 'elapsed'} value={mapping.timezone} onChange={event => form.changeMapping('timezone', event.target.value)} /><datalist id="timezones">{timezoneOptions.map(zone => <option key={zone} value={zone} />)}</datalist>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" disabled={mapping.timeBasis === 'elapsed'} checked={mapping.timeOnly} onChange={event => form.changeMapping('timeOnly', event.target.checked)} className="size-4 accent-primary" />O arquivo tem horários, mas não informa a data</label>
              {mapping.timeOnly && <label className="field">Data das medições<Input type="date" value={mapping.referenceDate} onChange={event => form.changeMapping('referenceDate', event.target.value)} /></label>}
            </fieldset>
            <Button className="mt-5" variant="outline" disabled={busy || mapping.dateColumn < 0 || mapping.valueColumn < 0} onClick={() => form.normalize()}>Atualizar prévia</Button>
          </details>
        )}
      </div>
      <div className="import-footer">
        {(busy || !candidate?.validRecords) && <p className="mr-auto text-sm text-muted-foreground">{busy ? 'Preparando seus dados…' : 'Confira a leitura para continuar.'}</p>}
        <Button disabled={busy || accepting || !candidate?.validRecords} onClick={async () => {
          if (!candidate || accepting) return
          setAccepting(true)
          try { if (await onImport(candidate, form.datasets)) form.finish() }
          finally { setAccepting(false) }
        }}>
          {dataset ? 'Substituir e gerar gráfico' : 'Gerar gráfico'}<ArrowRight />
        </Button>
      </div>
    </section>
  )
}
