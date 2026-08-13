import assert from 'node:assert/strict'
import { ref } from 'vue'
import axios from 'axios'
import { useCollections } from '../src/composables/useCollections.js'

const originalGet = axios.get

try {
  axios.get = async () => ({
    status: 200,
    data: {
      collections: [
        { name: 'books', num_documents: '12', created_at: 'today', metadata: { owner: 'docs' } },
        { collection_name: 'legacy', document_count: '3' },
        'articles',
        { num_documents: 99 }
      ],
      total: '8',
      found: '4'
    }
  })

  const normalized = useCollections(ref('http://example.test'))
  await normalized.loadCollections()

  assert.deepEqual(normalized.collections.value.map(({ name }) => name), ['books', 'legacy', 'articles'])
  assert.deepEqual(normalized.collections.value.map(({ num_documents }) => num_documents), [12, 3, 0])
  assert.deepEqual(normalized.collections.value[0].metadata, { owner: 'docs' })
  assert.equal(normalized.total.value, 8)
  assert.equal(normalized.found.value, 4)

  const pending = []
  axios.get = (url) => new Promise((resolve) => pending.push({ url, resolve }))

  const raced = useCollections(ref('http://example.test'))
  const first = raced.loadCollections(false, 'old')
  await Promise.resolve()
  const second = raced.loadCollections(false, 'new')
  await Promise.resolve()

  pending[1].resolve({
    status: 200,
    data: { collections: [{ name: 'new-name', num_documents: 2 }], total: 1, found: 1 }
  })
  await second
  pending[0].resolve({
    status: 200,
    data: { collections: [{ name: 'stale-name', num_documents: 40 }], total: 1, found: 1 }
  })
  await first

  assert.deepEqual(raced.collections.value.map(({ name }) => name), ['new-name'])
  assert.equal(raced.collections.value[0].num_documents, 2)
  assert.equal(raced.loading.value, false)

  const originalWindow = globalThis.window
  globalThis.window = {
    HANALYZER_CONFIG: { deploymentDemoMode: true },
    location: { hostname: 'demo.hlquery.com', origin: 'https://demo.hlquery.com' }
  }

  let demoRequest = 0
  axios.get = async () => {
    demoRequest += 1
    if (demoRequest % 2 === 1) {
      return {
        status: 200,
        data: { collections: [{ name: 'universities', num_documents: 100 }], total: 1, found: 1 }
      }
    }
    return {
      status: 200,
      data: { collections: [{ name: 'benchmark', num_documents: 1500 }], total: 1, found: 1 }
    }
  }

  const recoveredDemoCatalog = useCollections(ref('/api'))
  await recoveredDemoCatalog.loadCollections()

  assert.equal(demoRequest, 4, 'demo mode samples multiple replicas')
  assert.deepEqual(
    recoveredDemoCatalog.collections.value.map(({ name }) => name),
    ['universities', 'benchmark'],
    'collections present on either demo replica remain visible'
  )
  assert.equal(recoveredDemoCatalog.total.value, 2)

  if (originalWindow === undefined) {
    delete globalThis.window
  } else {
    globalThis.window = originalWindow
  }

  console.log('Collection state test passed')
} finally {
  axios.get = originalGet
}
