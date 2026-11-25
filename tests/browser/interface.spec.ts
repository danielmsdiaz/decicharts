import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { mockAccountApi } from './mock-api'
import { multipointWorkbook } from '../multipoint-fixture'

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
    await page.getByRole('alertdialog').getByRole('button', { name: 'Fechar arquivo', exact: true }).click()

    async function capture(surface: string) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: `.impeccable/review/${surface}-${mode}.png`, fullPage: true, animations: 'disabled' })
    }
  }
})
