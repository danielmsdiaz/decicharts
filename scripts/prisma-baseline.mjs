import { writeFile } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { withDatabase, snapshot } from './prisma-db.mjs'
import { redact, runPrisma } from './prisma.mjs'

try {
  await withDatabase(async client => {
    const before = await snapshot(client)
    await writeFile('/tmp/decicharts-prisma-before.json', JSON.stringify(before, null, 2))
    const diff = await runPrisma(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'], true)
    if (diff.code !== 0) {
      process.stdout.write(diff.output)
      throw new Error('A estrutura existente não corresponde ao schema Prisma. Baseline não aplicada.')
    }
    const history = await client.$queryRaw`SELECT to_regclass('decicharts._prisma_migrations')::text AS name`
    let applied = false
    if (history[0].name) {
      const rows = await client.$queryRaw`SELECT migration_name FROM decicharts._prisma_migrations WHERE migration_name='0001_initial' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`
      applied = rows.length > 0
    }
    if (!applied) {
      const result = await runPrisma(['migrate', 'resolve', '--applied', '0001_initial'])
      if (result.code !== 0) throw new Error('Não foi possível registrar a baseline Prisma.')
    } else console.log('Baseline Prisma já registrada.')
    const after = await snapshot(client)
    await writeFile('/tmp/decicharts-prisma-after.json', JSON.stringify(after, null, 2))
    if (!isDeepStrictEqual(before, after)) throw new Error('Os dados mudaram durante a verificação. Confira atividade concorrente antes de continuar.')
    console.log('Baseline confirmada. Contagens e fingerprints dos dados existentes foram preservados.')
    console.log(before.map(table => `${table.name}: ${table.rows} registros`).join('\n'))
  })
} catch (error) {
  console.error(redact(error instanceof Error && !('code' in error) ? error.message : 'Não foi possível verificar o Neon. Nenhuma tabela ou dado foi removido.'))
  process.exitCode = 1
}
