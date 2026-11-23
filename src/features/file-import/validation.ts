import type { Cell } from '@/features/measurements/types'

export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_RECORDS = 250_000
export const isNonEmpty = (row: Cell[]) => row.some(cell => cell !== null && String(cell).trim() !== '')
export function validateFile(file: Pick<File, 'name' | 'size'>) {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Formato não suportado. Escolha um arquivo CSV, XLSX ou XLS.')
  if (file.size === 0) throw new Error('O arquivo está vazio.')
  if (file.size > MAX_FILE_BYTES) throw new Error('O arquivo excede o limite de 20 MiB.')
}
