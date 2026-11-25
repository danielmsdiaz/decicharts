// @vitest-environment node
import { expect, it } from 'vitest'
import { testDatabaseConnection } from '../scripts/test-database.mjs'

it('bloqueia integração no banco da aplicação, inclusive pooled versus direto', () => {
  const prod = 'postgresql://user:password@ep-production-pooler.example/neondb?sslmode=require'
  const same = 'postgresql://other:secret@ep-production.example/neondb'
  const dev = 'postgresql://user:password@ep-development.example/neondb'
  expect(() => testDatabaseConnection(undefined, [prod])).toThrow(/TEST_DATABASE_URL/)
  expect(() => testDatabaseConnection(same, [prod])).toThrow(/mesmo/)
  expect(() => testDatabaseConnection(dev, [])).toThrow(/DATABASE_URL/)
  expect(testDatabaseConnection(dev, [prod])).toBe(dev)
})
