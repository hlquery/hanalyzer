import assert from 'node:assert/strict'
import axios from 'axios'
import { useSearch } from '../src/composables/useSearch.js'

const originalPost = axios.post

const hit = (id, title) => ({
  document: { id, title },
  score: 1
})

try {
  axios.post = async () => ({
    status: 200,
    data: {
      hits: [hit('synonym-match', 'A server-approved synonym result')],
      found: 27
    }
  })

  const authoritativeSearch = useSearch('http://example.test')
  await authoritativeSearch.performSearch('books', 'words absent from document', 1)
  assert.deepEqual(authoritativeSearch.searchResults.value.map(({ id }) => id), ['synonym-match'])
  assert.equal(authoritativeSearch.totalFound.value, 27)

  let globalSearchUrl = ''
  axios.post = async (url) => {
    globalSearchUrl = url
    return {
      status: 200,
      data: { hits: [hit('global-match', 'Cross-collection result')], found: 1 }
    }
  }

  const globalSearch = useSearch('http://example.test')
  await globalSearch.performSearch('', 'cross collection', 10, { searchAllCollections: true })
  assert.match(globalSearchUrl, /\/search$/)
  assert.deepEqual(globalSearch.searchResults.value.map(({ id }) => id), ['global-match'])

  const pending = []
  axios.post = (_url, payload) => new Promise((resolve) => {
    pending.push({ payload, resolve })
  })

  const racedSearch = useSearch('http://example.test')
  const first = racedSearch.performSearch('books', 'first query', 10)
  await Promise.resolve()
  const second = racedSearch.performSearch('books', 'second query', 10)
  await Promise.resolve()

  assert.equal(pending.length, 2)
  pending[1].resolve({ status: 200, data: { hits: [hit('newest', 'Newest')], found: 1 } })
  await second
  pending[0].resolve({ status: 200, data: { hits: [hit('stale', 'Stale')], found: 1 } })
  await first

  assert.deepEqual(racedSearch.searchResults.value.map(({ id }) => id), ['newest'])
  assert.equal(racedSearch.loading.value, false)

  let requestCount = 0
  axios.post = async () => {
    requestCount += 1
    const error = new Error('Invalid query')
    error.response = { status: 400, data: { error: 'Invalid query' } }
    throw error
  }

  const errorSearch = useSearch('/api')
  await errorSearch.performSearch('books', 'invalid query', 10)
  assert.equal(requestCount, 1)
  assert.match(errorSearch.error.value, /Invalid query/)

  console.log('Search interaction test passed')
} finally {
  axios.post = originalPost
}
