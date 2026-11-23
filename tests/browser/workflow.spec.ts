import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const csv = 'Data;Nível\n23/11/2026 12:00:00;50,5\n23/11/2026 12:00:01;65,4\n23/11/2026 12:00:01;70\n23/11/2026 12:00:09;55\ninválida;20\n'
async function importCsv(page: Page, contents = csv) {
  await page.getByLabel('Arquivo de medições').setInputFiles({ name: 'medicao.csv', mimeType: 'text/csv', buffer: Buffer.from(contents) })
  await page.getByRole('button', { name: 'Conferir e gerar prévia' }).click()
  await expect(page.getByRole('heading', { name: 'Confira antes de importar' })).toBeVisible()
  await page.getByRole('button', { name: 'Usar esta série' }).click()
  await expect(page.getByRole('heading', { name: 'Explore suas medições' })).toBeVisible()
}

test('rota real exige sessão e informa configuração Firebase ausente', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText('Firebase')
  await page.screenshot({ path: '/tmp/decicharts-login.png', fullPage: true })
})

test('importação, duplicados, filtros, zoom, PNG/SVG, tema e logout', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/tests/browser/fixture.html')
  await importCsv(page)
  const stats = page.locator('dl')
  await expect(stats).toContainText('50,5 dB')
  await expect(stats).toContainText('70 dB')
  await expect(page.getByText(/1 registros inválidos excluídos/)).toBeVisible()
  await expect(page.getByText(/1 timestamps repetidos preservados/)).toBeVisible()
  await page.getByLabel('Título do gráfico').fill('Medição ambiental — Ponto 1')
  await page.getByLabel('Início', { exact: true }).fill('2026-11-23T12:00:01.000')
  await page.getByLabel('Fim', { exact: true }).fill('2026-11-23T12:00:01.000')
  await page.getByRole('button', { name: 'Aplicar intervalo' }).click()
  await expect(stats).toContainText('65,4 dB')
  await expect(stats.locator('dd').first()).toHaveText('2')
  for (const format of ['SVG', 'PNG']) {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: format, exact: true }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(`decicharts-medicao.${format.toLowerCase()}`)
    const data = await readFile((await download.path())!)
    if (format === 'SVG') {
      const svg = data.toString('utf8')
      expect(svg).toContain('<svg')
      expect(svg).toContain('Medição ambiental')
      expect(svg).toContain('America/Recife')
      expect(svg).toContain('Nível sonoro (dB)')
      expect(svg).toContain('12:00:01.000')
      expect(svg).not.toContain('22/11')
      expect(svg).not.toContain('24/11')
      await download.saveAs('/tmp/decicharts-selected.svg')
    } else {
      expect(data.subarray(1, 4).toString()).toBe('PNG')
      expect(data.readUInt32BE(16)).toBe(3200)
      expect(data.readUInt32BE(20)).toBe(1800)
      await download.saveAs('/tmp/decicharts-selected.png')
    }
  }
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click()
  await expect(stats.locator('dd').first()).toHaveText('4')
  await page.getByLabel('Início', { exact: true }).fill('2026-11-23T12:00:03.000')
  await page.getByLabel('Fim', { exact: true }).fill('2026-11-23T12:00:05.000')
  await page.getByRole('button', { name: 'Aplicar intervalo' }).click()
  await expect(page.getByRole('button', { name: 'PNG', exact: true })).toBeDisabled()
  await expect(page.getByText('Não há medições neste intervalo.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click()
  const chart = page.getByRole('img', { name: /Nível sonoro em/ })
  await chart.scrollIntoViewIfNeeded()
  const box = (await chart.boundingBox())!
  const originalStart = await page.getByLabel('Início', { exact: true }).inputValue()
  await page.mouse.move(box.x + box.width / 2, box.y + 160)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -500)
  await page.keyboard.up('Control')
  await expect(page.getByLabel('Início', { exact: true })).not.toHaveValue(originalStart)
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click()
  await page.screenshot({ path: '/tmp/decicharts-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.screenshot({ path: '/tmp/decicharts-dark.png', fullPage: true })
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByText('Sessão de teste encerrada')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explore suas medições' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('layout mobile e erros de importação', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tests/browser/fixture.html')
  await page.getByLabel('Arquivo de medições').setInputFiles({ name: 'arquivo.txt', mimeType: 'text/plain', buffer: Buffer.from('teste') })
  await expect(page.getByRole('alert')).toContainText('Formato não suportado')
  await importCsv(page)
  await expect(page.locator('dl').locator('dd').first()).toHaveText('4')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/decicharts-mobile.png', fullPage: true })
})

test('processa e representa 250 mil registros no navegador', async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const start = Date.UTC(2026, 10, 23, 15)
  const rows = Array.from({ length: 250_000 }, (_, index) => `${new Date(start + index * 1000).toISOString()};${50 + index % 40}`)
  await page.goto('/tests/browser/fixture.html')
  const before = Date.now()
  await page.getByLabel('Arquivo de medições').setInputFiles({ name: '250mil.csv', mimeType: 'text/csv', buffer: Buffer.from('Timestamp;Nível\n' + rows.join('\n')) })
  await page.getByRole('button', { name: 'Conferir e gerar prévia' }).click()
  // The main thread remains interactive while normalization runs in the worker.
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click({ timeout: 5000 })
  await expect(page.getByRole('heading', { name: 'Confira antes de importar' })).toBeVisible({ timeout: 120_000 })
  await page.getByRole('button', { name: 'Usar esta série' }).click()
  await expect(page.locator('dl').locator('dd').first()).toHaveText('250.000', { timeout: 30_000 })
  await expect(page.getByRole('img', { name: /Nível sonoro em/ }).locator('canvas')).toBeVisible()
  await page.getByLabel('Início', { exact: true }).fill('2026-11-23T12:00:10.000')
  await page.getByLabel('Fim', { exact: true }).fill('2026-11-23T12:00:20.000')
  await page.getByRole('button', { name: 'Aplicar intervalo' }).click()
  await expect(page.locator('dl').locator('dd').first()).toHaveText('11')
  console.log(`250 mil registros: leitura, normalização e primeira renderização em ${Date.now() - before} ms (inclui interação de teste).`)
  expect(errors).toEqual([])
})
