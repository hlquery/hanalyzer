import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const builtIndex = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const nginxConfig = await readFile(new URL('../nginx.conf', import.meta.url), 'utf8')

const localReferences = [
  ...builtIndex.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/gi),
].map((match) => match[1]).filter((value) => !/^(?:https?:|data:|#)/i.test(value))

assert.ok(localReferences.length > 0, 'the production index must contain local asset references')

for (const reference of localReferences) {
  assert.ok(
    reference.startsWith('/'),
    `deep routes require root-relative asset references; found ${reference}`,
  )
}

assert.doesNotMatch(
  builtIndex,
  /fetch\(\s*['"]\.\//,
  'runtime files must not be fetched relative to the current browser route',
)

assert.doesNotMatch(
  nginxConfig,
  /^\s*error_page\s+404\s+\/index\.html\s*;/m,
  'missing static assets must return 404 instead of the SPA HTML document',
)

console.log(`Deep-link asset test passed for ${projectRoot}`)
