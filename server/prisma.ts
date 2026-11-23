import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from './generated/prisma/client'
import { HttpError } from './errors'

export function createPrismaClient(connection: string) {
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: connection, max: 4, connectionTimeoutMillis: 15_000, idleTimeoutMillis: 30_000 }, { schema: 'decicharts' }),
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
    // Database errors are translated by the API; do not log queries or user data.
    log: [],
  })
}

const globalClient = globalThis as typeof globalThis & { decichartsPrisma?: { connection: string; client: PrismaClient } }
export function getPrismaClient() {
  const connection = process.env.DATABASE_URL
  if (!connection) throw new HttpError(503, 'O salvamento precisa da conexão Neon configurada no servidor.')
  if (globalClient.decichartsPrisma?.connection !== connection) {
    void globalClient.decichartsPrisma?.client.$disconnect()
    globalClient.decichartsPrisma = { connection, client: createPrismaClient(connection) }
  }
  return globalClient.decichartsPrisma.client
}
