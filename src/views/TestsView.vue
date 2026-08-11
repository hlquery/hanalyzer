<template>
  <div>
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <h1 class="collections-title-text">Test Suite</h1>
      </div>
    </div>

    <v-card class="mb-card">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-test-tube" size="20" color="#1976d2" class="mr-3"></v-icon>
        <span class="font-weight-bold">Available Tests</span>
      </v-card-title>
      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="text-subtitle-2 font-weight-bold mb-1">Available Tests</div>
          <div class="text-body-2">Run tests to verify hlquery functionality. Tests are located in the <code>tests/</code> directory.</div>
        </v-alert>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="testFilter"
              label="Filter Tests"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              clearable
              placeholder="Search test files..."
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center">
            <v-btn
              color="primary"
              variant="flat"
              @click="runAllTests"
              :loading="runningAll"
              size="small"
              class="mr-2"
            >
              Run All Tests
            </v-btn>
            <v-btn
              color="success"
              variant="flat"
              @click="runQuickTest"
              :loading="runningQuick"
              size="small"
            >
              Quick Test
            </v-btn>
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <div class="text-subtitle-1 font-weight-bold mb-3">Test Files</div>
        <v-list>
          <v-list-item
            v-for="test in filteredTests"
            :key="test.name"
            :title="test.name"
            :subtitle="test.description"
            @click="runTest(test)"
          >
            <template v-slot:prepend>
              <v-icon :color="test.status === 'passed' ? 'success' : test.status === 'failed' ? 'error' : 'grey'">
                {{ test.status === 'passed' ? 'mdi-check-circle' : test.status === 'failed' ? 'mdi-close-circle' : 'mdi-circle-outline' }}
              </v-icon>
            </template>
            <template v-slot:append>
              <v-btn
                icon="mdi-play"
                variant="text"
                size="small"
                @click.stop="runTest(test)"
                :loading="test.running"
              ></v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-card v-if="testOutput" class="mb-card">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-console" class="mr-3" color="#1976d2" size="20"></v-icon>
        <span class="font-weight-bold">Test Output</span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="testOutput = null"
        ></v-btn>
      </v-card-title>
      <v-card-text>
        <pre class="test-output">{{ testOutput }}</pre>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'

const baseUrl = inject('baseUrl')

const testFilter = ref('')
const runningAll = ref(false)
const runningQuick = ref(false)
const testOutput = ref(null)

const tests = ref([
  { name: 'test_search.js', description: 'Search operations (80 tests)', status: null, running: false },
  { name: 'test_collections.js', description: 'Collection management (50 tests)', status: null, running: false },
  { name: 'test_documents.js', description: 'Document CRUD (60 tests)', status: null, running: false },
  { name: 'test_vector_search.js', description: 'Vector search (50 tests)', status: null, running: false },
  { name: 'test_synonyms.js', description: 'Synonyms (40 tests)', status: null, running: false },
  { name: 'test_stopwords.js', description: 'Stopwords (30 tests)', status: null, running: false },
  { name: 'test_stats.js', description: 'Stats endpoints (40 tests)', status: null, running: false },
  { name: 'test_overrides.js', description: 'Search overrides (30 tests)', status: null, running: false },
  { name: 'test_aliases.js', description: 'Alias management (30 tests)', status: null, running: false },
  { name: 'test_export.js', description: 'Document export (30 tests)', status: null, running: false },
  { name: 'test_multi_search.js', description: 'Multi-search (30 tests)', status: null, running: false },
  { name: 'test_facets.js', description: 'Facets (30 tests)', status: null, running: false },
  { name: 'test_comprehensive.js', description: 'Comprehensive workflows (100 tests)', status: null, running: false },
  { name: 'test_content_search.js', description: 'Quick test: Search for "content"', status: null, running: false },
  { name: 'all.js', description: 'Run all tests (1000+ tests)', status: null, running: false }
])

const filteredTests = computed(() => {
  if (!testFilter.value) return tests.value
  const filter = testFilter.value.toLowerCase()
  return tests.value.filter(test => 
    test.name.toLowerCase().includes(filter) || 
    test.description.toLowerCase().includes(filter)
  )
})

async function runQuickTest() {
  runningQuick.value = true
  testOutput.value = 'Running quick test for "content" search...\n\n'
  
  try {
    // Get collections
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const collectionsUrl = buildApiUrl(baseUrlValue, useProxy, '/collections')
    const collectionsResp = await axios.get(collectionsUrl)
    
    if (!collectionsResp.data.collections || collectionsResp.data.collections.length === 0) {
      testOutput.value += '❌ No collections found\n'
      return
    }
    
    const testCollection = collectionsResp.data.collections[0].name
    testOutput.value += `📁 Using collection: ${testCollection}\n\n`
    
    // Search for "content"
    const encodedCollection = encodeURIComponent(testCollection)
    const searchUrl = buildApiUrl(
      baseUrlValue,
      useProxy,
      `/collections/${encodedCollection}/documents/search`
    )
    
    testOutput.value += ' Searching for "content"...\n'
    const searchResp = await axios.post(searchUrl, {
      q: 'content',
      query_by: 'title,content',
      limit: 10
    })
    
    testOutput.value += `Status: ${searchResp.status}\n`
    testOutput.value += `Found: ${searchResp.data.found || 0} documents\n`
    testOutput.value += `Hits: ${searchResp.data.hits?.length || 0} results\n\n`
    
    if (searchResp.data.hits && searchResp.data.hits.length > 0) {
      testOutput.value += ' SUCCESS: Search for "content" returned results!\n\n'
      testOutput.value += 'First result:\n'
      testOutput.value += JSON.stringify(searchResp.data.hits[0], null, 2) + '\n'
    } else {
      testOutput.value += '❌ FAILED: No results returned for "content"\n\n'
      testOutput.value += 'Full response:\n'
      testOutput.value += JSON.stringify(searchResp.data, null, 2) + '\n'
    }
    
    // List some documents
    testOutput.value += '\n\n📄 Listing first 3 documents:\n'
    const docsUrl = buildApiUrl(
      baseUrlValue,
      useProxy,
      `/collections/${encodedCollection}/documents`,
      { limit: 3 }
    )
    const docsResp = await axios.get(docsUrl)
    
    if (docsResp.data.documents && docsResp.data.documents.length > 0) {
      docsResp.data.documents.forEach((doc, i) => {
        testOutput.value += `\nDocument ${i + 1}:\n`
        testOutput.value += `  ID: ${doc.id}\n`
        testOutput.value += `  Title: ${doc.title || '(empty)'}\n`
        testOutput.value += `  Content: ${(doc.content || '').substring(0, 100)}...\n`
      })
    } else {
      testOutput.value += 'No documents found\n'
    }
    
  } catch (error) {
    testOutput.value += `\n❌ Error: ${error.message}\n`
    if (error.response) {
      testOutput.value += `Response: ${JSON.stringify(error.response.data, null, 2)}\n`
    }
  } finally {
    runningQuick.value = false
  }
}

async function runTest(test) {
  test.running = true
  testOutput.value = `Running ${test.name}...\n\nNote: This requires the test file to be run via Node.js on the server.\n`
  test.running = false
}

async function runAllTests() {
  runningAll.value = true
  testOutput.value = 'Running all tests...\n\nNote: This requires running "node tests/all.js" on the server.\n'
  runningAll.value = false
}
</script>

<style scoped>
.tests-view {
  width: 100%;
}

.tests-header-card {
  border: 1px solid #e2e8f0 !important;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
}

.tests-output-card {
  border: 1px solid #e2e8f0 !important;
}

.test-output {
  background: #1e293b;
  color: #e2e8f0;
  padding: 20px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  border: 1px solid #334155;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Unified Header Styles */
.collections-header {
  margin-top: 0 !important;
  margin-bottom: 24px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  visibility: visible !important;
  opacity: 1 !important;
  flex-wrap: wrap;
  gap: 16px;
}

.collections-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
}

.collections-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 18px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
