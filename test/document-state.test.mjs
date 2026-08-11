import assert from 'node:assert/strict'
import { ref } from 'vue'
import axios from 'axios'
import { useDocuments } from '../src/composables/useDocuments.js'

const originalGet = axios.get

try {
  const pending = []
  axios.get = (url) => new Promise((resolve) => pending.push({ url, resolve }))

  const state = useDocuments(ref('http://example.test'))
  const oldCollection = state.loadDocuments('old collection', { limit: 10 })
  await Promise.resolve()
  const newCollection = state.loadDocuments('new collection', { limit: 10 })
  await Promise.resolve()

  assert.match(pending[0].url, /old%20collection\/documents$/)
  assert.match(pending[1].url, /new%20collection\/documents$/)

  pending[1].resolve({ data: { documents: [{ id: 'new-doc' }], total: '17' } })
  await newCollection
  pending[0].resolve({ data: { documents: [{ id: 'stale-doc' }], total: 91 } })
  await oldCollection

  assert.deepEqual(state.documents.value, [{ id: 'new-doc' }])
  assert.equal(state.total.value, 17)
  assert.equal(state.loading.value, false)

  axios.get = async () => ({ data: { documents: [{ id: 'only-doc' }], total: 'invalid' } })
  await state.loadDocuments('fallback-total')
  assert.equal(state.total.value, 1, 'invalid counters fall back to the returned document count')

  axios.get = async () => ({ data: { documents: [{ id: 'visible-doc' }], total: 0 } })
  await state.loadDocuments('transient-zero')
  assert.equal(state.total.value, 1, 'a total cannot be smaller than the returned page')

  await state.loadDocuments('fetch-all-zero', { fetchAll: true, limit: 10 })
  assert.equal(state.total.value, 1, 'fetch-all totals cannot be smaller than fetched documents')

  console.log('Document state test passed')
} finally {
  axios.get = originalGet
}
