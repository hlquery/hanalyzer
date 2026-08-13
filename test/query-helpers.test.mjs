import assert from 'node:assert/strict'
import { buildFilterExpression, resolveSearchTarget } from '../src/utils/queryHelpers.js'

assert.deepEqual(resolveSearchTarget(''), {
  collectionName: '',
  searchAllCollections: true
})
assert.deepEqual(resolveSearchTarget(' universities '), {
  collectionName: 'universities',
  searchAllCollections: false
})

assert.deepEqual(
  buildFilterExpression([
    { field: 'category', operator: '=', value: 'science', connector: 'AND' },
    { field: 'score', operator: '>=', value: 0, connector: 'OR' }
  ]),
  {
    expression: 'category:=science || score:>=0',
    error: null
  }
)

assert.deepEqual(
  buildFilterExpression([
    { field: 'title', operator: 'contains', value: 'computer', connector: 'AND' }
  ]),
  {
    expression: 'title:*computer*',
    error: null
  }
)

assert.match(
  buildFilterExpression([
    { field: 'category', operator: '=', value: 'science || score:>0', connector: 'AND' }
  ]).error,
  /reserved filter syntax/
)

assert.match(
  buildFilterExpression([
    { field: 'invalid-field', operator: '=', value: 'science', connector: 'AND' }
  ]).error,
  /invalid field name/
)

console.log('Query helpers test passed')
