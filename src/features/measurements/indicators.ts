import type { MeasurementDataset, Measurement } from './types'
import { summarize } from './statistics'

export function indicators(dataset: MeasurementDataset, selected: Measurement[]) {
  const stats = summarize(selected)
  if (!stats) return null
  // Divide before summing to avoid overflowing a finite arithmetic mean.
  const mean = selected.reduce((sum, item) => sum + item.value / selected.length, 0)
  let reason = ''
  const all = dataset.measurements
  if (dataset.invalidRecords) reason = 'Há registros inválidos neste ponto.'
  else if (dataset.duplicateTimestamps) reason = 'Há tempos repetidos neste ponto.'
  else if (selected.length < 2 || all.length < 2) reason = 'São necessárias pelo menos duas leituras.'
  else {
    const step = all[1].timestamp - all[0].timestamp
    if (step <= 0 || all.some((point, index) => index > 0 && point.timestamp - all[index - 1].timestamp !== step)) reason = 'A amostragem tem lacunas ou intervalos diferentes.'
  }
  const leq = reason ? null : stats.max + 10 * Math.log10(selected.reduce((sum, item) => sum + 10 ** ((item.value - stats.max) / 10), 0) / selected.length)
  return { ...stats, mean, leq, reason }
}
export const ESTIMATE_NOTE = 'Leq estimado por média energética de leituras instantâneas com amostragem regular; não é Leq integrado pelo equipamento.'
