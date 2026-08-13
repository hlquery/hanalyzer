import assert from 'node:assert/strict'
import {
  demoReplicaRetryDelay,
  isDemoDeployment,
  shouldRetryDemoCollectionRead,
  withDemoReplicaProbe
} from '../src/utils/apiHelpers.js'

const originalWindow = globalThis.window

try {
  globalThis.window = {
    HANALYZER_CONFIG: { deploymentDemoMode: true },
    location: {
      hostname: 'demo.hlquery.com',
      origin: 'https://demo.hlquery.com'
    }
  }

  assert.equal(isDemoDeployment(), true)
  assert.equal(shouldRetryDemoCollectionRead({
    response: { status: 404 },
    config: { method: 'get', url: '/api/collections/universities/documents' }
  }), true)
  assert.equal(shouldRetryDemoCollectionRead({
    response: { status: 503 },
    config: { method: 'get', url: 'https://demo.hlquery.com/api/collections/universities' }
  }), true)
  assert.equal(shouldRetryDemoCollectionRead({
    response: { status: 404 },
    config: { method: 'post', url: '/api/collections/universities/documents' }
  }), false, 'writes are never replayed')
  assert.equal(shouldRetryDemoCollectionRead({
    response: { status: 404 },
    config: { method: 'get', url: '/api/info' }
  }), false, 'unrelated missing routes are not retried')
  assert.equal(demoReplicaRetryDelay(1), 75)
  assert.equal(demoReplicaRetryDelay(99), 400)
  assert.equal(
    withDemoReplicaProbe('/api/collections?limit=1000', 'sample one'),
    '/api/collections?limit=1000&_hlq_demo_replica=sample+one'
  )
  assert.equal(
    withDemoReplicaProbe('/api/collections/universities/documents?_hlq_demo_replica=old', 'new'),
    '/api/collections/universities/documents?_hlq_demo_replica=new',
    'retry probes replace their previous value instead of growing the URL'
  )

  console.log('Demo replica recovery test passed')
} finally {
  if (originalWindow === undefined) {
    delete globalThis.window
  } else {
    globalThis.window = originalWindow
  }
}
