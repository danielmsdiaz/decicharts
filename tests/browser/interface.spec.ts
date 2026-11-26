import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { mockAccountApi } from './mock-api'
import { multipointWorkbook } from '../multipoint-fixture'

test('a troca de tema anima a cortina e o símbolo da marca com movimento permitido', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/login')
  const brandMark = page.getByRole('link', { name: 'Decicharts' }).locator('svg')
  for (const [button, theme] of [['escuro', 'dark'], ['claro', 'light']] as const) {
    await page.getByRole('button', { name: `Ativar tema ${button}` }).click()
    await expect.poll(() => page.evaluate(() => document.getAnimations().some(
      animation => animation instanceof CSSAnimation && animation.animationName === 'theme-curtain',
    )), { intervals: [30], timeout: 3_000 }).toBe(true)
    await expect.poll(() => brandMark.evaluate(mark => mark.getAnimations().length), { intervals: [30], timeout: 3_000 }).toBe(1)
    expect(await page.evaluate(() => localStorage.getItem('decicharts-theme'))).toBe(theme)
  }

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  expect(await page.evaluate(() => document.documentElement.matches(':active-view-transition'))).toBe(false)
  expect(await brandMark.evaluate(mark => mark.getAnimations().length)).toBe(0)
  await page.reload()
  await expect(page.locator('html')).toHaveClass('dark')
})

test('telas responsivas, temas e confirmações com a estrutura real do app', async ({ page }) => {
  await mkdir('.impeccable/review', { recursive: true })
  for (const mode of ['desktop', 'mobile'] as const) {
    await mockAccountApi(page)
    await page.setViewportSize(mode === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 })
    await page.goto('/login')
    if (mode === 'mobile') await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
    await expect(page.getByRole('heading', { name: 'Entre no Decicharts' })).toBeVisible()
    await capture('login')
    await page.goto('/tests/browser/fixture.html')
    await expect(page.getByRole('button', { name: 'Selecionar arquivo', exact: true })).toBeEnabled()
    await capture('empty')
    await page.getByRole('link', { name: 'Minhas análises', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Nenhuma análise salva' })).toBeVisible()
    await capture('history-empty')
    await page.getByRole('link', { name: 'Análise', exact: true }).click()
    await page.getByLabel('Arquivo de medições').setInputFiles({ name: 'campo.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(multipointWorkbook()) })
    await expect(page.getByRole('button', { name: 'Gerar gráfico', exact: true })).toBeEnabled()
    await capture('import')
    await page.getByRole('button', { name: 'Gerar gráfico', exact: true }).click()
    await expect(page.getByTestId('measurement-count')).toHaveText('60')
    await page.getByRole('img', { name: /Nível sonoro em/ }).waitFor()
    await capture('chart')
    await page.evaluate(() => window.scrollTo(0, 350))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
    expect((await page.getByRole('banner').boundingBox())?.y).toBe(0)
    if (mode === 'desktop' && await page.evaluate(() => CSS.supports('appearance', 'base-select'))) {
      const point = page.getByLabel('Ponto de medição', { exact: true })
      await point.click()
      await expect.poll(() => point.evaluate(select => select.matches(':open'))).toBe(true)
      await page.keyboard.press('Escape')
      await expect.poll(() => point.evaluate(select => select.matches(':open'))).toBe(false)
    }
    const exportButton = page.getByRole('button', { name: 'Exportar figura', exact: true })
    await expect(page.getByText('Prévia da figura exportada', { exact: true })).toHaveCount(0)
    await exportButton.click()
    const exportDialog = page.getByRole('dialog', { name: 'Exportar figura' })
    const png = exportDialog.getByRole('radio', { name: /PNG/ })
    await expect(png).toBeFocused()
    await expect(exportDialog.getByRole('img', { name: 'Prévia da figura a baixar' })).toBeVisible()
    await png.press('ArrowRight')
    await expect(exportDialog.getByRole('radio', { name: /SVG/ })).toBeChecked()
    await expect(exportDialog.getByRole('button', { name: 'Baixar SVG' })).toBeEnabled()
    await capture('export')
    const animatedDialog = await page.evaluate(() => CSS.supports('overlay', 'auto') && CSS.supports('transition-behavior', 'allow-discrete'))
    if (animatedDialog) await exportDialog.evaluate(element => {
      element.addEventListener('transitionrun', event => {
        if (!element.hasAttribute('open') && event.propertyName === 'opacity' && !event.pseudoElement) element.setAttribute('data-animated-exit', 'true')
      })
    })
    await page.keyboard.press('Escape')
    await expect(exportDialog).toBeHidden()
    if (animatedDialog) await expect(page.locator('.export-dialog')).toHaveAttribute('data-animated-exit', 'true')
    await expect(exportButton).toBeFocused()
    await page.getByRole('button', { name: 'Salvar análise', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Análise salva', exact: true })).toBeDisabled()
    await page.getByRole('link', { name: 'Minhas análises', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Abrir', exact: true }).first()).toBeVisible()
    await capture('history')
    await page.getByRole('button', { name: /Excluir análise/ }).first().click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await capture('confirmation')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.getByRole('link', { name: 'Meu perfil', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Salvar preferências', exact: true })).toBeVisible()
    await capture('profile')
    await page.getByRole('button', { name: 'Menu da conta' }).click()
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
    await capture('account')
    await page.keyboard.press('Escape')
    await page.getByRole('link', { name: 'Análise', exact: true }).click()
    await page.getByRole('button', { name: 'Fechar arquivo', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Selecionar arquivo', exact: true })).toBeVisible()

    async function capture(surface: string) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: `.impeccable/review/${surface}-${mode}.png`, fullPage: true, animations: 'disabled' })
    }
  }
})
