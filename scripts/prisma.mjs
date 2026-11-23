import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { existsSync, realpathSync } from 'node:fs'

export const environment = { PRISMA_HIDE_UPDATE_MESSAGE: '1', ...loadEnv('development', process.cwd(), ''), ...process.env }

export function redact(output) {
  let result = output.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, '[conexão protegida]')
  for (const name of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
    const connection = environment[name]
    if (!connection) continue
    result = result.split(connection).join('[conexão protegida]')
    try {
      const password = new URL(connection).password
      if (password) {
        result = result.split(password).join('[senha protegida]')
        result = result.split(decodeURIComponent(password)).join('[senha protegida]')
      }
    } catch { /* Prisma will report invalid configuration without exposing it. */ }
  }
  return result
}

export async function runPrisma(args, quiet = false) {
  const cli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url))
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { env: environment, stdio: ['inherit', 'pipe', 'pipe'] })
    let output = ''
    let pending = ''
    const receive = chunk => {
      output += chunk
      if (quiet) return
      pending += chunk
      // Redact complete lines so credentials split across chunks cannot leak.
      // Stream progress and the Studio URL before the process finishes.
      const end = pending.lastIndexOf('\n')
      if (end >= 0) {
        process.stdout.write(redact(pending.slice(0, end + 1)))
        pending = pending.slice(end + 1)
      }
    }
    child.stdout.on('data', receive)
    child.stderr.on('data', receive)
    child.on('error', () => reject(new Error('Não foi possível iniciar a CLI Prisma. Execute npm ci.')))
    child.on('close', code => {
      const safeOutput = redact(output)
      if (code === 0 && !safeOutput.trim()) {
        reject(new Error('A CLI Prisma terminou sem confirmar a operação. Execute novamente com permissão para iniciar seus processos auxiliares.'))
        return
      }
      if (!quiet && pending) process.stdout.write(redact(pending))
      resolve({ code: code ?? 1, output: safeOutput })
    })
  })
}

if (process.argv[1] && existsSync(process.argv[1]) && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  try { process.exitCode = (await runPrisma(process.argv.slice(2))).code }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
