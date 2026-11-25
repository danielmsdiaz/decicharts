import * as XLSX from 'xlsx'

export function multipointWorkbook(ids = ['Receptor A', 'P20', 'Fundo'], durations = [60, 180, 30]) {
  const rows: (string | number | null)[][] = [['MONITORAMENTO DE RUÍDO'], ['Empresa: Empreendimento sintético'], [], [], ['Ponto', 'Endereço', 'Leste', 'Norte']]
  const merges: XLSX.Range[] = []
  ids.forEach((id, index) => {
    const column = 6 + index * 3
    rows[3][column] = id
    rows[4][column] = 'Tempo (s)'; rows[4][column + 1] = 'dB'
    merges.push({ s: { r: 3, c: column }, e: { r: 3, c: column + 1 } })
    for (let t = 1; t <= durations[index]; t++) {
      const row = rows[t + 4] ??= []
      row[column] = t; row[column + 1] = 50 + index * 10 + t % 3
    }
  })
  ids.slice().reverse().forEach((id, index) => {
    const row = rows[index + 5] ??= []
    row[0] = id; row[1] = `Rua sintética do ${id}`; row[2] = 280000 + index; row[3] = 9800000 + index
  })
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!merges'] = merges
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Medições')
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
