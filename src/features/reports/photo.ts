import { assetFor } from './model'

export async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Escolha uma foto PNG ou JPEG de até 10 MiB.')
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255
  if (!png && !jpeg) throw new Error('A foto não pôde ser lida. Escolha outro PNG ou JPEG.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image(); image.src = url
    try { await image.decode() } catch { throw new Error('A foto não pôde ser lida. Escolha outro PNG ou JPEG.') }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 12000 || image.naturalHeight > 12000) throw new Error('A foto deve ter até 12.000 px em cada dimensão.')
    const ratio = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * ratio)), height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('O navegador não conseguiu preparar a foto.')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível preparar a foto.')), 'image/jpeg', 0.9))
    return assetFor(blob, width, height)
  } finally { URL.revokeObjectURL(url) }
}
