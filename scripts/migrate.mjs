import { neon } from '@neondatabase/serverless'
import { readdir, readFile } from 'node:fs/promises'
import { loadEnv } from 'vite'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const connection = env.DATABASE_URL
try {
  const url = new URL(connection || '')
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error()
} catch {
  console.error('Configure DATABASE_URL com a conexão PostgreSQL do Neon no .env.local.')
  process.exit(1)
}

try {
  const sql = neon(connection)
  const files = (await readdir(new URL('../db/migrations/', import.meta.url))).filter(name => name.endsWith('.sql')).sort()
  for (const file of files) {
    const statements = (await readFile(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8')).split(';').map(statement => statement.trim()).filter(Boolean)
    // These initial migrations contain only DDL/DML without procedural blocks.
    // A transaction keeps each version atomic; IF NOT EXISTS makes reruns safe.
    await sql.transaction(statements.map(statement => sql.query(statement)))
    console.log(`Migração aplicada: ${file}`)
  }
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'decicharts' ORDER BY table_name`
  console.log('Tabelas verificadas:', tables.map(row => row.table_name).join(', '))
} catch {
  console.error('Não foi possível aplicar a migração. Confira conexão, permissões e disponibilidade do Neon. Nenhuma credencial foi exibida.')
  process.exitCode = 1
}
