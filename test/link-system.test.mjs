import assert from 'node:assert/strict'
import {
  buildLinkEndpointKey,
  findLinkPingResult,
  getLinkEndpointParts
} from '../src/utils/linkHelpers.js'

assert.equal(
  buildLinkEndpointKey({ endpoint: 'localhost:9200' }),
  buildLinkEndpointKey({ normalized_endpoint: '127.0.0.1:9200' }),
  'loopback aliases use one link identity'
)

assert.deepEqual(
  getLinkEndpointParts({ endpoint: 'https://[2001:db8::7]:9443' }),
  { host: '2001:db8::7', port: '9443', secure: true },
  'IPv6 endpoints keep the complete host and port'
)
assert.equal(
  buildLinkEndpointKey({ endpoint: 'https://[2001:db8::7]:9443' }),
  'https://[2001:db8::7]:9443'
)

const targetKey = buildLinkEndpointKey({ endpoint: 'node-b.example:9200' })
const matchingPing = findLinkPingResult({
  nodes: [
    { endpoint: 'node-a.example:9200', reachable: true },
    { endpoint: 'node-b.example:9200', reachable: false }
  ]
}, targetKey)
assert.equal(matchingPing?.endpoint, 'node-b.example:9200')

assert.equal(
  findLinkPingResult({
    nodes: [{ endpoint: 'node-a.example:9200', reachable: true }]
  }, targetKey),
  null,
  'an unrelated first result is never applied to the requested link'
)

assert.equal(
  findLinkPingResult({
    endpoint: { endpoint: 'node-b.example:9200', reachable: true }
  }, targetKey)?.reachable,
  true,
  'single-endpoint ping responses are supported'
)

console.log('Link system test passed')
