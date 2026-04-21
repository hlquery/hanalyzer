import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'
import defaultConfig from './hanalyzer.conf.js'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const vendorChunkMap = [
    ['vue-vendor', ['vue', 'vue-router']],
    ['vuetify-vendor', ['vuetify']],
    ['chart-vendor', ['chart.js', 'vue-chartjs']],
    ['utils-vendor', ['axios']]
  ]
  const appConfig = {
    ...defaultConfig,
    app: {
      ...defaultConfig.app,
      version: process.env.npm_package_version || defaultConfig.app.version || '1.0.0'
    },
    server: {
      ...defaultConfig.server,
      port: parseInt(process.env.HANALYZER_PORT || `${defaultConfig.server.port}`, 10),
      host: process.env.HANALYZER_HOST || defaultConfig.server.host,
      apiTarget: process.env.HANALYZER_API_TARGET || defaultConfig.server.apiTarget,
      baseUrl: process.env.HANALYZER_BASE_URL || defaultConfig.server.baseUrl
    },
    preview: {
      ...defaultConfig.preview,
      port: parseInt(process.env.HANALYZER_PREVIEW_PORT || `${defaultConfig.preview.port}`, 10)
    }
  }
  
  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    base: appConfig.server.baseUrl,
    build: {
      target: 'es2015',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']
        },
        format: {
          comments: false
        }
      } : {},
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('/node_modules/')) {
              return undefined
            }

            for (const [chunkName, packages] of vendorChunkMap) {
              if (packages.some((pkg) => id.includes(`/node_modules/${pkg}/`))) {
                return chunkName
              }
            }

            return undefined
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const assetName = assetInfo.name || ''
            const info = assetName.split('.')
            const ext = info[info.length - 1] || 'asset'
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            return `assets/[ext]/[name]-[hash][extname]`
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: true,
      cssCodeSplit: true
    },
    server: {
      port: appConfig.server.port,
      host: appConfig.server.host,
      strictPort: false,
      open: appConfig.server.open,
      cors: true,
      proxy: {
        '/api': {
          target: appConfig.server.apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          ws: true,
          timeout: 30000,
          proxyTimeout: 30000,
          secure: false,
          followRedirects: true,
          xfwd: true,
          agent: false,
          headers: {
            'Connection': 'keep-alive'
          },
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err.message, 'for path:', req.url)
              if (res && !res.headersSent) {
                res.writeHead(503, { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                })
                res.end(JSON.stringify({ 
                  error: 'Service Unavailable', 
                  message: 'The server is not ready or not running. Please wait a moment and try again.',
                  details: err.message
                }))
              }
            })
            
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Ensure all headers from the original request are forwarded
              // Vite proxy should do this automatically, but we verify here
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization)
              }
              if (req.headers['x-api-key']) {
                proxyReq.setHeader('X-API-Key', req.headers['x-api-key'])
              }
              
              // Set keep-alive for better connection reuse
              proxyReq.setHeader('Connection', 'keep-alive')
              
              proxyReq.setTimeout(30000, () => {
                if (res && !res.headersSent) {
                  res.writeHead(504, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  })
                  res.end(JSON.stringify({ 
                    error: 'Gateway Timeout', 
                    message: 'The server took too long to respond. It may still be starting up.' 
                  }))
                }
              })
            })
            
            proxy.on('proxyRes', (proxyRes, req, res) => {
              // Log successful proxy responses for debugging
              if (req.url && req.url.includes('/etc')) {
                console.log(`[Vite Proxy] Successfully proxied ${req.method} ${req.url} -> ${proxyRes.statusCode}`)
              }
            })
          }
        }
      }
    },
    preview: {
      port: appConfig.preview.port,
      host: appConfig.server.host,
      strictPort: false
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'vuetify', 'axios', 'chart.js', 'vue-chartjs', 'gsap'],
      exclude: []
    },
    define: {
      __APP_VERSION__: JSON.stringify(appConfig.app.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    }
  }
})
