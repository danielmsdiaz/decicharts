import type { ReportInfo } from '../../../shared/persistence'

export const defaultFigureColors = {
  headerColor: '#173c38',
  chartBackgroundColor: '#f8fbfa',
  lineColor: '#116b5c',
}
export type FigureColors = typeof defaultFigureColors
export type PlotColors = { background: string; line: string }

export function figureColors(info?: ReportInfo): FigureColors {
  const color = (key: keyof FigureColors) => {
    const value = info?.[key]
    return value && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : defaultFigureColors[key]
  }
  return { headerColor: color('headerColor'), chartBackgroundColor: color('chartBackgroundColor'), lineColor: color('lineColor') }
}
const channels = (color: string) => [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16))
function luminance(color: string) {
  return channels(color).map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)
}
export function contrastRatio(first: string, second: string) {
  const values = [luminance(first), luminance(second)]
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}
export function readableText(background: string) {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#000000') ? '#ffffff' : '#000000'
}
export function mixColor(background: string, foreground: string, amount: number) {
  const target = channels(foreground)
  return `#${channels(background).map((value, index) => Math.round(value * (1 - amount) + target[index] * amount).toString(16).padStart(2, '0')).join('')}`
}
