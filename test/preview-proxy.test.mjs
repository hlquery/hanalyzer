import assert from 'node:assert/strict'
import viteConfig from '../vite.config.js'

const config = viteConfig({ mode: 'production', command: 'serve' })
const devProxy = config.server?.proxy?.['/api']
const previewProxy = config.preview?.proxy?.['/api']

assert.ok(devProxy, 'the development server must proxy /api requests')
assert.ok(previewProxy, 'the preview server must proxy /api requests')
assert.equal(previewProxy.target, devProxy.target, 'development and preview must use the same API target')
assert.equal(
  previewProxy.rewrite('/api/sql?sql=SELECT%20*%20FROM%20food'),
  '/sql?sql=SELECT%20*%20FROM%20food',
  'preview must forward /api/sql to the daemon /sql route',
)

console.log('Preview proxy test passed')
