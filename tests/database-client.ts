import { PrismaClient } from '../server/generated/prisma/client'
import { createPrismaClient } from '../server/prisma'

export async function testClient(connection: string, onQuery?: () => void) {
  if (['localhost', '127.0.0.1', '[::1]'].includes(new URL(connection).hostname)) {
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }, { schema: 'decicharts' }),
      transactionOptions: { maxWait: 10_000, timeout: 20_000 }, log: [{ level: 'query', emit: 'event' }] })
    if (onQuery) client.$on('query', onQuery)
    return client
  }
  return createPrismaClient(connection)
}
