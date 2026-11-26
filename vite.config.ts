import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const name of ['DATABASE_URL', 'FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID']) {
    if (!process.env[name] && env[name]) process.env[name] = env[name]
  }
  return {
  plugins: [react(), tailwindcss(), {
    name: 'decicharts-local-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        try {
          const { handleNodeRequest } = await server.ssrLoadModule('/server/node.ts')
          await handleNodeRequest(req, res)
        } catch {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'API local indisponível. Reinicie o servidor.' }))
        }
      })
    },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Workers load these after the page. Prebundle them before the first upload so
  // Vite does not reload the page to discover a new dependency mid-import.
  optimizeDeps: { include: ['papaparse', 'xlsx', '@tiptap/react', '@tiptap/core', '@tiptap/starter-kit', '@tiptap/extension-table', '@tiptap/extension-text-align', 'docx'] },
  worker: { format: 'es' },
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes('/node_modules/zrender/')) return 'zrender'
    if (id.includes('/node_modules/echarts/')) return 'echarts'
  } } } },
  }
})
