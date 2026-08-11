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
counter.reset()
assert.equal(counter.observe({}), 0, 'reset removes totals retained for a previous server')
assert.equal(counter.observe({ collections_total: 2 }), 2)

const initiallyEmpty = createStableCollectionTotal()
assert.equal(initiallyEmpty.observe({ collections_total: 0 }), 0)

const startupCounter = createStableCollectionTotal()
assert.equal(
  startupCounter.observe({ collections_total: 0 }, 21),
  21,
  'an authoritative collections response corrects a transient startup zero'
)
assert.equal(
  startupCounter.observe({ collections_total: 0 }),
  21,
  'one later transient zero does not replace the authoritative total'
)
assert.equal(
  startupCounter.observe({ collections_total: 21 }, 0),
  0,
  'an authoritative empty collection list is accepted immediately'
)

console.log('Stable collection total test passed')
