import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../server/generated/prisma/client.ts'
import { environment } from './prisma.mjs'

export async function withDatabase(run) {
  const connection = environment.DATABASE_URL
  if (!connection) throw new Error('Configure DATABASE_URL antes de acessar o banco.')
  const client = new PrismaClient({ adapter: new PrismaNeon({ connectionString: connection, max: 2, connectionTimeoutMillis: 15_000 }, { schema: 'decicharts' }), log: [] })
  try { return await run(client) }
  finally { await client.$disconnect() }
}

// Only counts and fingerprints leave PostgreSQL; existing user rows are never
// printed or written to disk during the transition to Prisma.
export async function snapshot(client) {
  return client.$queryRaw`
    SELECT 'profiles' AS name, count(*)::text AS rows,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), '')) AS fingerprint
      FROM decicharts.profiles t
    UNION ALL
    SELECT 'analyses', count(*)::text,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), ''))
      FROM decicharts.analyses t
    UNION ALL
    SELECT 'analysis_chunks', count(*)::text,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), ''))
      FROM decicharts.analysis_chunks t
    UNION ALL
    SELECT 'schema_migrations', count(*)::text,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), ''))
      FROM decicharts.schema_migrations t
    ORDER BY name`
}
