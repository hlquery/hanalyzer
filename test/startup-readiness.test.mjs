import assert from 'node:assert/strict'
import { ref } from 'vue'
import axios from 'axios'
import { useConnectionStatus } from '../src/composables/useConnectionStatus.js'

const originalGet = axios.get
const originalWarn = console.warn

try {
  // The composable is exercised directly here instead of through a mounted
  // component; suppress only Vue's expected lifecycle-context warnings.
  console.warn = (...args) => {
    if (!String(args[0] || '').startsWith('[Vue warn]: onMounted') &&
        !String(args[0] || '').startsWith('[Vue warn]: onUnmounted')) {
      originalWarn(...args)
    }
  }

  const requests = []
  axios.get = async (url) => {
    requests.push(url)
    return { status: 503, data: { ready: false } }
  }

  const startingConnection = useConnectionStatus(ref('http://example.test'))
  await startingConnection.checkConnection()

  assert.deepEqual(requests, ['http://example.test/ready'])
  assert.equal(startingConnection.hasChecked.value, true)
  assert.equal(startingConnection.isConnected.value, false)

  requests.length = 0
  axios.get = async (url) => {
    requests.push(url)
    if (url.endsWith('/ready')) return { status: 200, data: { ready: true } }
    return { status: 404, data: {} }
  }

  const unroutableCollections = useConnectionStatus(ref('http://loading.example.test'))
  await unroutableCollections.checkConnection()

  assert.deepEqual(requests, [
    'http://loading.example.test/ready',
    'http://loading.example.test/collections'
  ])
  assert.equal(
    unroutableCollections.isConnected.value,
    false,
    'collection views stay locked until the collections API is routable'
  )

  requests.length = 0
  axios.get = async (url) => {
    requests.push(url)
    if (url.endsWith('/ready')) return { status: 404, data: {} }
    return { status: 200, data: { auth_required: false } }
  }

  const legacyConnection = useConnectionStatus(ref('http://legacy.example.test'))
  await legacyConnection.checkConnection()

  assert.deepEqual(requests, [
    'http://legacy.example.test/ready',
    'http://legacy.example.test/ping'
  ])
  assert.equal(legacyConnection.isConnected.value, true)

  console.log('Startup readiness test passed')
} finally {
  axios.get = originalGet
  console.warn = originalWarn
}
