import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { AuthContext } from '../src/features/auth/auth-context'
import { ConfirmationProvider } from '../src/components/ui/ConfirmationProvider'
import { WorkspaceProvider } from '../src/features/analyses/WorkspaceProvider'
import { useWorkspace } from '../src/features/analyses/workspace-context'
import { saveImport } from '../src/features/analyses/import-service'
import type { SaveSnapshot } from '../src/features/analyses/import-service'
import type { ImportSummary } from '../shared/persistence'
import { dataset } from './helpers'

vi.mock('../src/features/analyses/import-service', () => ({ saveImport: vi.fn(), loadImport: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const a = { ...dataset(), point: { id: 'A' } }, b = { ...dataset(), point: { id: 'B' } }
function Probe() {
  const work = useWorkspace()
  return <><button onClick={() => work.acceptMany([a, b])}>Importar</button>
    <button onClick={() => work.selectPoint(work.points[1].key)}>Ponto B</button>
    <button onClick={() => work.selectPoint(work.points[0].key)}>Ponto A</button>
    <button onClick={() => work.setView({ ...work.view!, title: 'Título A', report: { address: 'Rua A' } })}>Editar</button>
    <button onClick={() => void work.save()}>Salvar</button><button onClick={work.clear}>Limpar</button>
    <output aria-label="Ponto">{work.dataset?.point?.id}</output><output aria-label="Título">{work.view?.title}</output>
    <output aria-label="Salvos">{work.points.filter(point => point.saved).map(point => point.id).join(',')}</output>
    <output aria-label="Alterações">{String(work.anyDirty)}</output></>
}
function mount() {
  const setLogoutGuard = vi.fn()
  render(<AuthContext.Provider value={{ user: { uid: 'synthetic-user' } as User, configured: true, loading: false, busy: false, error: '', login: vi.fn(), logout: vi.fn(), setLogoutGuard }}><ConfirmationProvider><WorkspaceProvider><Probe /></WorkspaceProvider></ConfirmationProvider></AuthContext.Provider>)
  return setLogoutGuard
}
it('preserva ajustes por ponto, avisa saída e respeita o cancelamento do logout', async () => {
  const guards = mount()
  await userEvent.click(screen.getByText('Importar'))
  await userEvent.click(screen.getByText('Editar'))
  await userEvent.click(screen.getByText('Ponto B'))
  expect(screen.getByLabelText('Título').textContent).not.toBe('Título A')
  await userEvent.click(screen.getByText('Ponto A'))
  expect(screen.getByLabelText('Título').textContent).toBe('Título A')
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  let pending!: Promise<boolean>
  act(() => { pending = guards.mock.calls.at(-1)![0]() })
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar', exact: true }))
  expect(await pending).toBe(false)
  expect(screen.getByLabelText('Ponto').textContent).toBe('A')
  await userEvent.click(screen.getByText('Limpar'))
  const clean = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(clean)
  expect(clean.defaultPrevented).toBe(false)
})
it('salva todos os pontos mesmo após alternar para outro', async () => {
  let resolve!: (value: ImportSummary) => void
  vi.mocked(saveImport).mockImplementation(() => new Promise(done => { resolve = done }))
  mount()
  await userEvent.click(screen.getByText('Importar'))
  await userEvent.click(screen.getByText('Salvar'))
  const snapshot = vi.mocked(saveImport).mock.calls[0][1]
  await userEvent.click(screen.getByText('Ponto B'))
  await act(async () => resolve(savedSnapshot(snapshot)))
  await waitFor(() => expect(screen.getByLabelText('Salvos').textContent).toBe('A,B'))
  expect(screen.getByLabelText('Ponto').textContent).toBe('B')
  expect(screen.getByLabelText('Alterações').textContent).toBe('false')
})

function savedSnapshot(snapshot: SaveSnapshot): ImportSummary {
  return { id: snapshot.id, name: snapshot.name, fileName: a.fileName, sheetName: a.sheetName, pointCount: snapshot.points.length,
    recordCount: snapshot.points.reduce((sum, point) => sum + point.dataset.validRecords, 0), version: snapshot.baseVersion + 1, saveId: snapshot.saveId, updatedAt: new Date().toISOString() }
}
it('mantém edições posteriores ao clique pendentes e inclui todos os ajustes no salvamento seguinte', async () => {
  let resolve!: (value: ImportSummary) => void
  vi.mocked(saveImport).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  mount()
  await userEvent.click(screen.getByText('Importar'))
  await userEvent.click(screen.getByText('Salvar'))
  const first = vi.mocked(saveImport).mock.calls[0][1]
  await userEvent.click(screen.getByText('Editar'))
  await act(async () => resolve(savedSnapshot(first)))
  expect(screen.getByLabelText('Alterações').textContent).toBe('true')
  vi.mocked(saveImport).mockImplementationOnce(async (_, snapshot) => savedSnapshot(snapshot))
  await userEvent.click(screen.getByText('Salvar'))
  await waitFor(() => expect(screen.getByLabelText('Alterações').textContent).toBe('false'))
  expect(vi.mocked(saveImport).mock.calls[1][1].points[0].view.title).toBe('Título A')
})
it('retoma a mesma fotografia após falha, sem duplicar IDs ou absorver edições feitas depois', async () => {
  vi.mocked(saveImport).mockRejectedValueOnce(new Error('Falha no último ponto'))
  mount()
  await userEvent.click(screen.getByText('Importar'))
  await userEvent.click(screen.getByText('Salvar'))
  const first = vi.mocked(saveImport).mock.calls[0][1]
  await userEvent.click(screen.getByText('Editar'))
  vi.mocked(saveImport).mockImplementationOnce(async (_, snapshot) => savedSnapshot(snapshot))
  await userEvent.click(screen.getByText('Salvar'))
  await waitFor(() => expect(screen.getByLabelText('Salvos').textContent).toBe('A,B'))
  expect(vi.mocked(saveImport).mock.calls[1][1]).toBe(first)
  expect(screen.getByLabelText('Alterações').textContent).toBe('true')
})
