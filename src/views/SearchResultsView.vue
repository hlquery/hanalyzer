<template>
  <div class="search-results-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <v-btn
          variant="text"
          size="small"
          @click="goBack"
          class="back-button-text"
          prepend-icon="mdi-arrow-left"
        >
          Back
        </v-btn>
        <div>
          <h1 class="collections-title-text">Search Results</h1>
          <div v-if="searchQuery || collectionName" class="collections-pagination-info-top">
            <span v-if="searchQuery">Query: "{{ searchQuery }}"</span>
            <span v-if="collectionName"> in {{ collectionName }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Form -->
    <v-card class="mb-card">
      <v-card-text class="pa-4">
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedCollection"
              :items="collectionItems"
              item-title="title"
              item-value="value"
              label="Collection"
              prepend-inner-icon="mdi-folder"
              variant="outlined"
              @update:model-value="handleSearch"
            ></v-select>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              label="Search Query"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              @keyup.enter="handleSearch"
              clearable
              placeholder="Enter search terms... Use quotes for exact phrases: &quot;Document 95&quot;"
              hint="Tip: Use quotes for exact phrase matching. Multiple words will be searched individually."
              persistent-hint
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="2">
              <v-btn
                color="primary"
                variant="flat"
                @click="handleSearch"
                :disabled="!selectedCollection || !searchQuery"
                size="small"
                block
              >
                Search
              </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      <div class="font-weight-bold mb-1">Search Error</div>
      {{ error }}
    </v-alert>

    <!-- Results -->
    <div v-if="searchPerformed">
      <v-card class="mb-card mt-card">
        <v-card-title class="pa-4" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 16px 16px 0 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 16px;">
            <div class="d-flex align-center" style="gap: 16px;">
              <v-btn-toggle
                v-model="viewMode"
                mandatory
                density="compact"
                color="primary"
                variant="flat"
                style="height: 42px; border-radius: 8px; overflow: hidden; background: white; padding: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
              >
                <v-tooltip location="top" :disabled="!isUnorganized" text="This collection doesn't have title or content fields, list view is not available.">
                  <template v-slot:activator="{ props: tooltipProps }">
                    <div v-bind="tooltipProps" style="height: 100%;">
                      <v-btn 
                        value="list" 
                        :disabled="isUnorganized" 
                        class="px-6"
                        style="height: 38px; min-width: 120px; font-weight: 600; text-transform: none; letter-spacing: 0.3px;"
                        variant="text"
                      >
                        <v-icon icon="mdi-view-list" start size="20"></v-icon>
                        Results
                      </v-btn>
                    </div>
                  </template>
                </v-tooltip>
                <v-btn 
                  value="table" 
                  class="px-6"
                  style="height: 38px; min-width: 120px; font-weight: 600; text-transform: none; letter-spacing: 0.3px;"
                  variant="text"
                >
                  <v-icon icon="mdi-table" start size="20"></v-icon>
                  Table
                </v-btn>
              </v-btn-toggle>

              <div class="d-flex align-center" style="gap: 8px; margin-left: 8px;">
                <v-icon icon="mdi-format-list-bulleted" color="white" size="20"></v-icon>
                <span class="text-white font-weight-bold" style="font-size: 16px;">Results ({{ searchResults.length }})</span>
                <span v-if="searchTime" class="text-caption text-white" style="opacity: 0.9; font-weight: 500; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 12px;">
                  {{ searchTime }}s
                </span>
              </div>
            </div>

            <div class="d-flex justify-end">
              <v-select
                v-model="sortBy"
                :items="sortOptions"
                item-title="title"
                item-value="value"
                label="Sort"
                prepend-inner-icon="mdi-sort-variant"
                variant="solo"
                density="compact"
                bg-color="white"
                flat
                style="max-width: 240px; min-width: 180px; border-radius: 8px;"
                hide-details
                @update:model-value="handleSortChange"
              ></v-select>
            </div>
          </div>
        </v-card-title>
        <v-card-text class="pa-4">
          <!-- List View -->
          <div v-if="viewMode === 'list'" class="search-results-list">
            <router-link
              v-for="(doc, index) in searchResults"
              :key="doc.id || index"
              :to="getDocumentRoute(doc)"
              style="text-decoration: none; display: block; outline: none; border: none;"
            >
            <v-card
              class="result-card mb-3"
              style="cursor: pointer;"
            >
              <v-card-text class="pa-4">
                <!-- Result Header -->
                <div class="result-header mb-2">
                  <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center" style="gap: 8px;">
                      <span class="result-url">{{ collectionName }} • Document ID: {{ doc.id }}</span>
                    </div>
                    <div class="d-flex align-center" style="gap: 8px;">
                      <v-chip
                        v-if="doc._text_match !== undefined"
                        :color="getScoreColor(doc._text_match)"
                        size="small"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        {{ typeof doc._text_match === 'number' ? doc._text_match.toFixed(2) : doc._text_match }}
                      </v-chip>
                    </div>
                  </div>
                </div>
                
                <!-- Result Title -->
                <h3 class="result-title">
                  {{ getBestTitle(doc) }}
                </h3>
                
                <!-- Result Snippet with Highlights -->
                <div class="result-snippet">
                  <span v-if="doc.highlights && Object.keys(doc.highlights).length > 0">
                    <span v-for="(highlight, field) in doc.highlights" :key="field" v-html="formatServerHighlights(highlight)"></span>
                  </span>
                  <span v-else-if="getBestContent(doc)">
                    {{ truncateText(getBestContent(doc), 500) }}
                  </span>
                  <span v-else class="text-grey-darken-1">
                    No preview available
                  </span>
                </div>
                
                <!-- Quick Actions -->
                <div class="result-actions mt-3" @click.stop>
                  <router-link
                    :to="getDocumentRoute(doc)"
                    style="text-decoration: none;"
                  >
                    <v-btn
                      size="small"
                      variant="text"
                      @click.stop
                      prepend-icon="mdi-open-in-new"
                    >
                      View
                    </v-btn>
                  </router-link>
                  <v-btn
                    size="small"
                    variant="text"
                    @click="copyDocumentId(doc.id)"
                    prepend-icon="mdi-content-copy"
                  >
                    Copy ID
                  </v-btn>
                  <router-link
                    :to="getCollectionRoute(selectedCollection)"
                    style="text-decoration: none;"
                  >
                    <v-btn
                      size="small"
                      variant="text"
                      @click.stop
                      prepend-icon="mdi-folder"
                    >
                      Collection
                    </v-btn>
                  </router-link>
                </div>
              </v-card-text>
            </v-card>
            </router-link>
          </div>

          <!-- Table View -->
          <div v-else class="search-results-table-container">
            <v-data-table
              :headers="tableHeaders"
              :items="searchResults"
              hover
              class="results-data-table border rounded"
            >
              <template #[`item.id`]="{ item, value }">
                <router-link
                  :to="getDocumentRoute(item)"
                  class="results-table-link"
                >
                  {{ value || '—' }}
                </router-link>
              </template>

              <template #[`item.title`]="{ item }">
                <router-link
                  :to="getDocumentRoute(item)"
                  class="results-table-link font-weight-medium"
                >
                  {{ item.title || '—' }}
                </router-link>
              </template>

              <template #[`item.name`]="{ item, value }">
                <router-link
                  :to="getDocumentRoute(item)"
                  class="results-table-link font-weight-medium"
                >
                  {{ value || '—' }}
                </router-link>
              </template>
              
              <template #[`item.content`]="{ value }">
                <div class="text-truncate" style="max-width: 300px;">
                  {{ value || '—' }}
                </div>
              </template>

              <template #[`item._text_match`]="{ value }">
                <v-chip
                  v-if="value !== undefined"
                  :color="getScoreColor(value)"
                  size="x-small"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ typeof value === 'number' ? value.toFixed(2) : value }}
                </v-chip>
                <span v-else>—</span>
              </template>

              <template v-for="header in tableHeaders.filter(h => !['id', 'title', 'name', 'content', '_text_match'].includes(h.key))" :key="header.key" #[`item.${header.key}`]="{ value }">
                <div class="text-truncate" style="max-width: 200px;">
                  {{ value !== null && value !== undefined ? value : '—' }}
                </div>
              </template>
            </v-data-table>
          </div>
        </v-card-text>
      </v-card>

      <!-- No Results -->
      <v-card v-if="searchResults.length === 0 && indexingInProgress" class="empty-state">
        <v-card-text class="text-center py-16">
          <v-icon icon="mdi-database-sync" size="64" color="grey-lighten-1" class="mb-4 empty-state-icon"></v-icon>
          <div class="empty-state-title">Indexing in progress</div>
          <div class="empty-state-subtitle">Results may be incomplete. Try again shortly.</div>
        </v-card-text>
      </v-card>

      <v-card v-else-if="searchResults.length === 0" class="empty-state">
        <v-card-text class="text-center py-16">
          <v-icon icon="mdi-magnify" size="64" color="grey-lighten-1" class="mb-4 empty-state-icon"></v-icon>
          <div class="empty-state-title">No search results</div>
          <div class="empty-state-subtitle">Try adjusting your search terms or selecting a different collection</div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Initial State -->
    <v-card v-else class="empty-state">
      <v-card-text class="text-center py-16">
        <v-icon icon="mdi-magnify" size="64" color="grey-lighten-1" class="mb-4 empty-state-icon"></v-icon>
        <div class="empty-state-title">Start Searching</div>
        <div class="empty-state-subtitle">Select a collection and enter a search query</div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCollections } from '../composables/useCollections'
import { useSearch } from '../composables/useSearch'
import { useCopy } from '../composables/useCopy'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useSearchHistory } from '../composables/useSearchHistory'

import { getBaseUrlValue, shouldUseProxy, buildApiUrl, getBestTitle, getBestContent, formatServerHighlights } from '../utils/apiHelpers'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })
const { collections, loadCollections } = useCollections(baseUrl)
const { searchResults, loading, error, searchTime, indexingInProgress, performSearch } = useSearch(baseUrl)
const { copyToClipboard } = useCopy()
const { addSearch } = useSearchHistory()

const selectedCollection = ref('')
const searchQuery = ref('')
const searchPerformed = ref(false)
const expandedRows = ref([])
const sortBy = ref('_relevance')
const viewMode = ref('list')
const hasHandledInitialMount = ref(false)
const collectionSchema = ref(null)

const loadCollectionSchema = async () => {
  if (!selectedCollection.value) {
    collectionSchema.value = null
    return
  }
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(selectedCollection.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}`)
    const response = await axios.get(url)
    collectionSchema.value = response.data
  } catch (err) {
    console.error('Failed to load collection schema in SearchResultsView:', err)
  }
}

watch(selectedCollection, loadCollectionSchema)

// Detect if documents are unorganized (no title/content)
const isUnorganized = computed(() => {
  // Check schema first if available
  if (collectionSchema.value && collectionSchema.value.searchable_fields) {
    const fields = collectionSchema.value.searchable_fields
    const hasStandardFields = fields.includes('title') || fields.includes('content')
    if (!hasStandardFields) return true
  }

  if (!searchResults.value || !Array.isArray(searchResults.value) || searchResults.value.length === 0) return false
  
  // Check first few documents
  const sample = searchResults.value.slice(0, 10)
  return sample.every(doc => {
    if (!doc) return true
    const hasTitle = doc.title !== undefined && doc.title !== null && String(doc.title).trim() !== ''
    const hasContent = doc.content !== undefined && doc.content !== null && String(doc.content).trim() !== ''
    return !hasTitle && !hasContent
  })
})

// Auto-switch to table mode for unorganized data
watch([searchResults, isUnorganized, loading, searchPerformed], ([newResults, unorganized, isLoading, performed]) => {
  if (newResults && newResults.length > 0 && performed && !isLoading) {
    if (unorganized) {
      viewMode.value = 'table'
    } else if (viewMode.value === 'table' && !hasHandledInitialMount.value) {
      // Default to list view for organized collections on first load
      viewMode.value = 'list'
      hasHandledInitialMount.value = true
    }
  }
}, { immediate: true })

// Generate table headers dynamically based on document fields
const tableHeaders = computed(() => {
  if (!searchResults.value || searchResults.value.length === 0) return []
  
  const allKeys = new Set()
  // Collect keys from a sample of documents to be efficient
  searchResults.value.slice(0, 20).forEach(doc => {
    Object.keys(doc).forEach(key => {
      if (!key.startsWith('_') && key !== 'highlights' && key !== 'id' && key !== 'title' && key !== 'name' && key !== 'content') {
        allKeys.add(key)
      }
    })
  })
  
  // Define priority fields that should always come first
  const headers = [
    { title: 'ID', key: 'id', sortable: true, width: '100px' },
    { title: 'Title', key: 'title', sortable: true },
    { title: 'Name', key: 'name', sortable: true },
    { title: 'Content', key: 'content', sortable: true }
  ]
  
  // Add other fields discovered in the documents
  Array.from(allKeys).sort().forEach(key => {
    headers.push({
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      key: key,
      sortable: true
    })
  })
  
  // Add score if present
  if (searchResults.value.some(doc => doc._text_match !== undefined)) {
    headers.push({ title: 'Score', key: '_text_match', sortable: true, align: 'end' })
  }
  
  return headers
})

const collectionName = computed(() => selectedCollection.value)

const collectionItems = computed(() => {
  return collections.value.map(col => ({
    title: col.name,
    value: col.name
  }))
})

const baseSortOptions = [
  { title: 'Relevance', value: '_relevance' },
  { title: 'Score (Lowest First)', value: '_text_match:asc' },
  { title: 'Document ID (A-Z)', value: 'id:asc' },
  { title: 'Document ID (Z-A)', value: 'id:desc' }
]

const buildSortOptionPair = (fieldName) => {
  const lowerName = String(fieldName || '').toLowerCase()

  if (lowerName === 'rank' || lowerName.endsWith('_rank') || lowerName.includes('ranking')) {
    return [
      { title: `${fieldName} (Best First)`, value: `${fieldName}:asc` },
      { title: `${fieldName} (Worst First)`, value: `${fieldName}:desc` }
    ]
  }

  if (lowerName.includes('score') || lowerName.includes('rating') || lowerName.includes('count')) {
    return [
      { title: `${fieldName} (High to Low)`, value: `${fieldName}:desc` },
      { title: `${fieldName} (Low to High)`, value: `${fieldName}:asc` }
    ]
  }

  if (lowerName.includes('date') || lowerName.includes('created') || lowerName.includes('updated')) {
    return [
      { title: `${fieldName} (Newest First)`, value: `${fieldName}:desc` },
      { title: `${fieldName} (Oldest First)`, value: `${fieldName}:asc` }
    ]
  }

  return [
    { title: `${fieldName} (A-Z)`, value: `${fieldName}:asc` },
    { title: `${fieldName} (Z-A)`, value: `${fieldName}:desc` }
  ]
}

const sortOptions = computed(() => {
  const options = [...baseSortOptions]
  const seen = new Set(options.map((option) => option.value))
  const schema = collectionSchema.value

  if (schema && Array.isArray(schema.sortable_fields)) {
    schema.sortable_fields.forEach((field) => {
      const fieldName = typeof field === 'string' ? field : field?.name
      if (!fieldName) return

      buildSortOptionPair(fieldName).forEach((option) => {
        if (!seen.has(option.value)) {
          seen.add(option.value)
          options.push(option)
        }
      })
    })
  }

  return options
})

const getCollectionRoute = (collectionName) => {
  if (!collectionName) return '/collections'
  return `/collections/${encodeURIComponent(collectionName)}`
}

const getDocumentRoute = (doc) => {
  if (!doc || !doc.id) return { name: 'collections' }
  const encodedName = encodeURIComponent(collectionName.value || '')
  const encodedId = encodeURIComponent(String(doc.id))
  return {
    name: 'document-detail',
    params: {
      name: encodedName,
      docId: encodedId
    }
  }
}

const getScoreColor = (score) => {
  if (score >= 0.8) return 'success'
  if (score >= 0.5) return 'warning'
  return 'info'
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  // Show full content - no truncation
  return text
}

const copyDocumentId = (docId) => {
  copyToClipboard(docId, 'Document ID copied to clipboard')
}

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'escape',
    handler: () => {
      goBack()
    }
  }
])

const handleSearch = async () => {
  if (!selectedCollection.value || !searchQuery.value?.trim()) {
    return
  }
  
  searchPerformed.value = true
  expandedRows.value = []
  
  try {
    await performSearch(selectedCollection.value, searchQuery.value.trim(), 10, {
      sortBy: sortBy.value
    })
    // Update URL
    router.replace({
      query: {
        q: searchQuery.value,
        collection: selectedCollection.value,
        ...(sortBy.value && sortBy.value !== '_relevance' ? { sort_by: sortBy.value } : {})
      }
    })
  } catch (err) {
    console.error('Search error:', err)
  }
}

const handleSortChange = () => {
  if (selectedCollection.value && searchQuery.value) {
    handleSearch()
  }
}

const goBack = () => {
  router.push('/').catch(err => {
    // Ignore navigation errors (e.g., navigating to same route)
    if (err.name !== 'NavigationDuplicated') {
      console.error('Navigation error:', err)
    }
  })
}

// Read query parameters from URL
onMounted(async () => {
  await loadCollections()
  
  if (route.query.q) {
    searchQuery.value = route.query.q
  }
  if (route.query.collection) {
    selectedCollection.value = route.query.collection
  } else {
    // Default to "products" collection if it exists (for ecommerce search)
    const productsCollection = collections.value.find(col => col.name === 'products')
    if (productsCollection) {
      selectedCollection.value = 'products'
    }
  }
  if (route.query.sort_by) {
    sortBy.value = route.query.sort_by
  }
  
  // Auto-search if query is in URL
  if (searchQuery.value && selectedCollection.value) {
    handleSearch()
  }
})
</script>

<style scoped>
.search-results-view {
  width: 100%;
}

.search-header-card {
  background: #f8f9fa !important;
  border-radius: 12px !important;
  border: 1px solid #e8eaed !important;
}

.search-results-view .v-card {
  background: #f8f9fa !important;
  border: 1px solid #e8eaed !important;
}

.document-card {
  background: #f8f9fa !important;
  border-radius: 12px !important;
  border: 1px solid rgba(209, 213, 219, 0.4) !important;
  margin-bottom: 12px !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}

.results-header-gray {
  background: #f1f3f4 !important;
  border-bottom: 1px solid #e8eaed !important;
}

.document-title-google {
  color: #137333 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  line-height: 26px !important;
  margin-top: 4px !important;
  cursor: pointer !important;
  text-decoration: none !important;
  transition: color 0.2s ease !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
}

.document-title-google:hover {
  color: #0d652d !important;
  text-decoration: underline !important;
}

.document-details-content {
  padding: 8px 0;
}

.document-details-content .content-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  max-height: 200px;
  overflow-y: auto;
}

.document-fields-grid {
  display: grid;
  gap: 16px;
}

.document-field-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.field-label {
  font-weight: 600;
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.field-value {
  font-size: 14px;
  color: #1e293b;
  word-break: break-word;
}

.highlights-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.highlight-item {
  padding: 8px;
  background: #fef3c7;
  border-radius: 6px;
  border-left: 3px solid #f59e0b;
}

.highlight-field {
  color: #92400e;
  margin-right: 8px;
}

.highlight-text {
  color: #1e293b;
}

/* Google-style Result Cards */
.search-results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-results-list {
  display: flex;
  flex-direction: column;
}

.results-data-table {
  background-color: white !important;
}

.results-data-table :deep(th) {
  background-color: #f8f9fa !important;
  color: #5f6368 !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 11px !important;
  letter-spacing: 0.5px;
}

.results-data-table :deep(tr:hover) {
  background-color: #f1f3f4 !important;
}

.results-table-link {
  color: #1a73e8;
  text-decoration: none;
  display: inline-block;
  width: 100%;
}

.results-table-link:hover {
  text-decoration: underline;
}

.result-card {
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  background: #ffffff !important;
}

.result-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  border-color: #cbd5e1 !important;
}

/* Remove focus/active outlines and borders on router-link */
.search-results-list router-link,
.search-results-list router-link a,
.search-results-list a {
  outline: none !important;
  border: none !important;
}

.search-results-list :deep(router-link a:focus),
.search-results-list :deep(router-link a:active),
.search-results-list :deep(router-link a:focus-visible),
.search-results-list :deep(a:focus),
.search-results-list :deep(a:active),
.search-results-list :deep(a:focus-visible),
.search-results-list :deep(router-link:focus),
.search-results-list :deep(router-link:active),
.search-results-list :deep(router-link:focus-visible) {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

/* Remove blue border from all link elements */
.search-results-list :deep(a),
.search-results-list :deep(router-link a) {
  outline: none !important;
  border: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

.result-header {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #64748b;
}

.result-url {
  font-size: 12px;
  color: #64748b;
  font-family: 'Monaco', 'Menlo', monospace;
}

.result-title {
  font-size: 18px;
  font-weight: 500;
  color: #1a73e8;
  margin: 8px 0;
  line-height: 1.4;
  cursor: pointer;
  text-decoration: none;
  -webkit-user-select: text;
  -moz-user-select: text;
  user-select: text;
}

.result-title:hover {
  text-decoration: underline;
}

.result-snippet {
  font-size: 14px;
  line-height: 1.6;
  color: #4a5568;
  margin: 8px 0;
}

.result-snippet :deep(strong) {
  background: #fef3c7;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
  color: #92400e;
}

.result-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.collections-title-section > div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
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

.collections-pagination-info-top {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  color: #64748b !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px;
}

.back-button-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  color: #1976d2 !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  min-width: auto !important;
  height: 36px !important;
  transition: all 0.2s ease !important;
  background: transparent !important;
}

.back-button-text:hover {
  background: #e3f2fd !important;
  color: #1565c0 !important;
  transform: translateY(-1px);
}

.back-button-text:active {
  background: #bbdefb !important;
  transform: translateY(0) !important;
}

.back-button-text :deep(.v-icon) {
  color: inherit !important;
  font-size: 18px !important;
  margin-right: 4px !important;
}

.disabled-btn {
  opacity: 0.5;
  cursor: not-allowed !important;
  background-color: #f8f9fa !important;
  color: #9aa0a6 !important;
}
</style>
