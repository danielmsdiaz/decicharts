import { defineConfig } from 'prisma/config'
import { loadEnv } from 'vite'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
let connection = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || ''
if (connection) {
  const url = new URL(connection)
  // Neon exposes the same database on its direct host. Migrations use the direct
  // connection; the application retains DATABASE_URL and its connection pool.
  if (!env.DATABASE_URL_UNPOOLED && url.hostname.endsWith('.neon.tech')) url.hostname = url.hostname.replace('-pooler.', '.')
  url.searchParams.set('schema', 'decicharts')
  connection = url.toString()
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: connection },
})
