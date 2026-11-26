import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { mockAccountApi } from './mock-api'

function gate() {
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  return { pending, release }
}

for (const mode of ['desktop', 'mobile'] as const) {
  test(`skeletons: perfil, histórico e gráfico em ${mode}`, async ({ page }) => {
    await page.setViewportSize(mode === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 })
    await mockAccountApi(page)
    const profile = gate(), history = gate(), chart = gate()
    await page.route('**/api/profile', async route => { await profile.pending; await route.fallback() })
    await page.route('**/api/imports', async route => { await history.pending; await route.fallback() })
    await page.route('**/src/features/charts/ChartWorkspace.tsx*', async route => { await chart.pending; await route.fallback() })
    await page.goto('/tests/browser/fixture.html')
    if (mode === 'mobile') await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
    await page.getByRole('link', { name: 'Meu perfil', exact: true }).click()
    const preferences = page.getByRole('status', { name: 'Carregando preferências…', exact: true })
    await expect(preferences).toBeVisible()
    await expect(page.getByLabel('Fuso horário padrão')).toHaveCount(0)
    await capture('profile')
    profile.release()
    await expect(page.getByLabel('Fuso horário padrão')).toHaveValue('America/Recife')
    await expect(preferences).toHaveCount(0)
    await page.getByRole('link', { name: 'Minhas análises', exact: true }).click()
    const analyses = page.getByRole('status', { name: 'Carregando suas análises…', exact: true })
    await expect(analyses).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nenhuma análise salva' })).toHaveCount(0)
    await capture('history')
    history.release()
    await expect(page.getByRole('heading', { name: 'Nenhuma análise salva' })).toBeVisible()
    await expect(analyses).toHaveCount(0)
    await page.getByRole('link', { name: 'Análise', exact: true }).click()
    await page.getByLabel('Arquivo de medições').setInputFiles({ name: 'sintetico.csv', mimeType: 'text/csv', buffer: Buffer.from('Data;Nível\n23/11/2026 12:00:00;50\n23/11/2026 12:00:01;60\n') })
    await page.getByRole('button', { name: 'Gerar gráfico', exact: true }).click()
    const visualization = page.getByRole('status', { name: 'Preparando a visualização…', exact: true })
    await expect(visualization).toBeVisible()
    await capture('chart')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(visualization.locator('.skeleton').first()).toHaveCSS('animation-name', 'none')
    chart.release()
    await expect(page.getByTestId('measurement-count')).toHaveText('2')
    await expect(visualization).toHaveCount(0)

    async function capture(surface: string) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await mkdir('.impeccable/review', { recursive: true })
      await page.screenshot({ path: `.impeccable/review/loading-${surface}-${mode}.png`, fullPage: true, animations: 'disabled' })
    }
  })
}

test('skeleton encerra em erro, reaparece na tentativa e pagina sem ocultar resultados', async ({ page }) => {
  await mockAccountApi(page)
  const retry = gate(), more = gate()
  let request = 0
  const item = (id: string) => ({ id, name: `Ponto ${id}`, fileName: 'sintetico.csv', recordCount: 2, pointCount: 1, sheetName: 'CSV', version: 1, saveId: id, updatedAt: '2026-11-26T12:00:00Z' })
  await page.route('**/api/imports*', async route => {
    request++
    if (request === 1) return route.fulfill({ status: 503, json: { error: 'Serviço indisponível para o teste.' } })
    if (request === 2) { await retry.pending; return route.fulfill({ json: { imports: [item('A')], hasMore: true } }) }
    await more.pending
    return route.fulfill({ json: { imports: [item('B')], hasMore: false } })
  })
  await page.goto('/tests/browser/fixture.html')
  await page.getByRole('link', { name: 'Minhas análises', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Serviço indisponível')
  await expect(page.getByRole('status', { name: 'Carregando suas análises…' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Carregando suas análises…' })).toBeVisible()
  retry.release()
  await expect(page.getByRole('heading', { name: 'Ponto A', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Carregar mais', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Carregando mais análises…' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ponto A', exact: true })).toBeVisible()
  more.release()
  await expect(page.getByRole('heading', { name: 'Ponto B', exact: true })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Carregando mais análises…' })).toHaveCount(0)
})
