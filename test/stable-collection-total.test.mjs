import assert from 'node:assert/strict'
import {
  createStableCollectionTotal,
  extractCollectionTotal
} from '../src/utils/stableCollectionTotal.js'

assert.equal(extractCollectionTotal({ collections_total: 7 }), 7)
assert.equal(extractCollectionTotal({ storage: { total_collections: 6 } }), 6)
assert.equal(extractCollectionTotal({ collections: { total: 5 } }), 5)
assert.equal(extractCollectionTotal({}), null)

const counter = createStableCollectionTotal()
assert.equal(counter.observe({ collections_total: 4 }), 4)
assert.equal(counter.observe({}), 4, 'partial responses keep the confirmed total')
assert.equal(counter.observe({ collections_total: 0 }), 4, 'one transient zero is ignored')
assert.equal(counter.observe({ collections_total: 4 }), 4, 'a positive response cancels the pending zero')
assert.equal(counter.observe({ collections_total: 0 }), 4)
assert.equal(counter.observe({ collections_total: 0 }), 0, 'two zero responses confirm an empty server')
assert.equal(counter.observe({ collections_total: 3 }), 3)

const initiallyEmpty = createStableCollectionTotal()
assert.equal(initiallyEmpty.observe({ collections_total: 0 }), 0)

console.log('Stable collection total test passed')
