import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import { execSync } from 'node:child_process'
import path from 'node:path'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    svgLoader(),
    AutoImport({ resolvers: [ElementPlusResolver()], dts: 'src/auto-imports.d.ts' }),
    Components({ resolvers: [ElementPlusResolver()], dts: 'src/components.d.ts' }),
    {
      name: 'generate-page-api',
      configureServer(server) {
        server.middlewares.use('/api/__generate_page', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const params = JSON.parse(body)
              const script = path.resolve(__dirname, 'scripts/generate-page/generate.cjs')
              const cmd = [
                `node "${script}"`,
                `--template=${params.template || 'standard-crud'}`,
                `--module=${params.module || ''}`,
                `--entity=${params.entity || ''}`,
                `--entityCn=${params.entityCn || ''}`,
                `--entityPascal=${params.entityPascal || ''}`,
                `--fileName=${params.fileName || ''}`,
                `--api=${params.api || ''}`,
                `--perm=${params.perm || ''}`,
                `--dir=${params.dir || `src/views/${params.module || ''}`}`,
              ].join(' ')
              const output = execSync(cmd, { cwd: __dirname, encoding: 'utf-8' })
              const lastLine = output.trim().split('\n').pop() || ''
              try {
                const result = JSON.parse(lastLine)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(result))
              } catch {
                res.end(JSON.stringify({ success: true, raw: output }))
              }
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: e.message }))
            }
          })
        })
      },
    },
  ],
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __VUE_I18N_PROD_DEVTOOLS__: false,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 6501,
    proxy: { '/api': { target: 'http://localhost:6500', changeOrigin: true } },
  },
})
