import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Run only inside a disposable pg_virtualenv cluster, never with the app URL.
const cluster = process.env.PG_CLUSTER_CONF_ROOT ?? ''
if (!/^\/tmp\/pg_virtualenv\.[^/]+\/postgresql$/.test(cluster) || process.env.PGHOST !== 'localhost'
  || !/^\d+$/.test(process.env.PGPORT ?? '') || !process.env.PGUSER || !process.env.PGPASSWORD
  || !existsSync(join(cluster, process.env.PGVERSION ?? '', 'regress', '.by_pg_virtualenv'))) {
  throw new Error('Execute com pg_virtualenv -t node scripts/test-local-postgres.mjs.')
}
const database = 'decicharts_import_test'
const env = { ...process.env, PGDATABASE: database }
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { env, stdio: ['pipe', 'pipe', 'pipe'], ...options })
const connection = `postgresql://${encodeURIComponent(env.PGUSER)}:${encodeURIComponent(env.PGPASSWORD)}@127.0.0.1:${env.PGPORT}/${database}`
const cli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url))
const checkSchema = schema => run(process.execPath, [cli, 'migrate', 'diff', '--from-config-datasource', '--to-schema', schema, '--exit-code'], {
  env: { ...env, DATABASE_URL: connection, DATABASE_URL_UNPOOLED: connection, DATABASE_URL_POOLED: connection },
})
run('createdb', [database])
run('psql', ['-X', '-v', 'ON_ERROR_STOP=1'], { input: readFileSync('prisma/migrations/0001_initial/migration.sql') })
checkSchema('prisma/baseline.prisma')
const metadata = { fileName: 'legado.csv', sheetName: 'CSV', totalRecords: 3, validRecords: 3, invalidRecords: 0, duplicateTimestamps: 0,
  unit: 'dB', timezone: 'America/Recife', mapping: { headerRow: 0, dateColumn: 0, timeColumn: null, valueColumn: 1, dateFormat: 'br', decimal: ',', referenceDate: '', timeOnly: false, unit: 'dB', timezone: 'America/Recife' }, invalidPreview: [] }
const chart = { title: 'Figura legada', range: { start: 1000, end: 3000 }, report: { headerColor: '#123456', address: 'Rua sintética', logo: 'data:image/png;base64,iVBORw0KGgo=' } }
const id = '33333333-3333-4333-8333-333333333333'
run('psql', ['-X', '-v', 'ON_ERROR_STOP=1'], { input: `
  INSERT INTO decicharts.profiles(uid) VALUES ('__migration_fixture');
  INSERT INTO decicharts.analyses(user_uid,id,name,state,metadata,chart,record_count,chunk_count,first_ts,last_ts,created_at,updated_at)
  VALUES ('__migration_fixture','${id}','Análise legada','ready','${JSON.stringify(metadata)}','${JSON.stringify(chart)}',3,1,1000,3000,'2026-11-20Z','2026-11-21Z');
  INSERT INTO decicharts.analysis_chunks VALUES ('__migration_fixture','${id}',0,3,1000,3000,0,'[[1000,50],[2000,60],[3000,70]]');
  INSERT INTO decicharts.analyses(user_uid,id,name,state,metadata,chart,record_count,chunk_count)
  VALUES ('__migration_fixture','44444444-4444-4444-8444-444444444444','Análise legada','uploading','${JSON.stringify(metadata)}','${JSON.stringify(chart)}',3,1);
` })
const fingerprint = () => run('psql', ['-XAtc', `SELECT md5(jsonb_agg(jsonb_build_object('uid',user_uid,'id',id,'name',name,'state',state,'metadata',metadata,'chart',chart,'records',record_count,'chunks',chunk_count,'created',created_at,'updated',updated_at) ORDER BY id)::text) FROM decicharts.analyses;
  SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY analysis_id,chunk_index)::text) FROM decicharts.analysis_chunks c;`]).toString().trim()
const before = fingerprint()
run('psql', ['-X', '-v', 'ON_ERROR_STOP=1'], { input: readFileSync('prisma/migrations/0002_import_collections/migration.sql') })
if (fingerprint() !== before) throw new Error('A migração alterou o conteúdo legado.')
const checked = run('psql', ['-XAtc', `SELECT count(*) FROM decicharts.measurement_imports i JOIN decicharts.analyses a ON a.user_uid=i.user_uid AND a.import_id=i.id JOIN decicharts.import_save_points p ON p.user_uid=i.user_uid AND p.import_id=i.id AND p.chart=a.chart WHERE i.id=a.id AND i.point_count=1 AND i.name=a.name AND i.created_at=a.created_at AND i.updated_at=a.updated_at`]).toString().trim()
if (checked !== '2') throw new Error('A migração não preservou os conjuntos unitários.')
console.log('Migração local validada: legado publicado e rascunho, IDs, dados, configurações e datas preservados.')
checkSchema('prisma/schema.prisma')
console.log('Schema local coincide com Prisma após a migração.')
run(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/neon.integration.test.ts', 'tests/imports.integration.test.ts', 'tests/import-batch.integration.test.ts'], {
  env: { ...env, TEST_DATABASE_URL: connection, RUN_NEON_INTEGRATION: '1' }, stdio: 'inherit',
})
