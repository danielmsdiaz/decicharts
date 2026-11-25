export async function normalizeLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Selecione um PNG ou JPEG de até 5 MiB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    for (let width = 512; width >= 64; width = Math.floor(width * 0.75)) {
      canvas.width = width; canvas.height = Math.round(width * 72 / 136)
      const context = canvas.getContext('2d')!
      const ratio = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      const w = image.naturalWidth * ratio, h = image.naturalHeight * ratio
      context.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
      const png = canvas.toDataURL('image/png')
      if (atob(png.split(',')[1]).length <= 128 * 1024) return png
    }
    throw new Error('O logotipo ainda está muito grande. Escolha uma imagem mais simples.')
  } finally { URL.revokeObjectURL(url) }
}
