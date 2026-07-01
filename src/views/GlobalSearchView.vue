<template>
  <div class="global-search-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <div>
          <h1 class="collections-title-text">Search Results</h1>
          <div class="collections-pagination-info-top" v-if="totalResults > 0">
            <v-icon size="14" class="mr-2" style="opacity: 0.7;">mdi-file-document-multiple</v-icon>
            Found {{ totalResults }} document{{ totalResults !== 1 ? 's' : '' }} in {{ searchResultsByCollection.length }} collection{{ searchResultsByCollection.length !== 1 ? 's' : '' }}
          </div>
        </div>
      </div>
      <!-- Action Buttons - Top Right -->
      <div class="collections-header-actions">
        <v-tooltip text="Create a new collection to organize your documents (Ctrl+N)" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              @click.stop="goToCreateCollection"
              variant="flat"
              size="small"
              class="collections-action-btn"
              style="pointer-events: auto !important; z-index: 10 !important;"
            >
              Create Collection
            </v-btn>
          </template>
        </v-tooltip>
      </div>
    </div>

    <!-- Search Query Display -->
    <v-card class="mb-4 search-query-card" v-if="searchQuery" elevation="0">
      <v-card-text class="search-query-content">
        <div class="d-flex align-center">
          <div class="search-icon-wrapper">
            <v-icon icon="mdi-magnify" size="24" color="primary"></v-icon>
          </div>
          <div class="flex-grow-1 search-query-text">
            <div class="text-caption search-label">Searching for</div>
            <div class="search-query-value">{{ searchQuery }}</div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="clearSearch"
            class="search-clear-btn"
          >
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Error State -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      <div class="font-weight-bold mb-2">Search Error</div>
      <div>{{ error }}</div>
    </v-alert>

    <!-- No Query State -->
    <v-card v-if="!searchQuery" class="mb-card card-premium">
      <v-card-text class="text-center py-12">
        <v-icon icon="mdi-magnify" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <div class="text-h6 text-grey-darken-1 font-weight-medium mb-2">Enter a search query</div>
        <div class="text-body-2 text-grey-darken-1">Type your search query in the header search bar and press Enter</div>
      </v-card-text>
    </v-card>

    <!-- No Results State -->
    <v-card v-if="searchQuery && totalResults === 0 && indexingInProgress" class="mb-card card-premium">
      <v-card-text class="text-center py-12">
        <v-icon icon="mdi-database-sync" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <div class="text-h6 text-grey-darken-1 font-weight-medium mb-2">Indexing in progress</div>
        <div class="text-body-2 text-grey-darken-1">Results may be incomplete. Try again shortly.</div>
      </v-card-text>
    </v-card>

    <v-card v-else-if="searchQuery && totalResults === 0" class="mb-card card-premium">
      <v-card-text class="text-center py-12">
        <v-icon icon="mdi-magnify-close" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <div class="text-h6 text-grey-darken-1 font-weight-medium mb-2">No results found</div>
        <div class="text-body-2 text-grey-darken-1">Try adjusting your search query or check different collections</div>
      </v-card-text>
    </v-card>

    <!-- Search Results by Collection -->
    <div v-if="searchQuery && totalResults > 0">
      <div
        v-for="(collectionData, index) in searchResultsByCollection"
        :key="collectionData.collection"
        class="collection-results-section mb-6"
      >
        <!-- Collection Header -->
        <div class="collection-header">
          <div class="d-flex align-center">
            <v-icon icon="mdi-folder" class="mr-3" color="primary" size="28"></v-icon>
            <span class="text-h5 font-weight-bold collection-name">{{ collectionData.collection }}</span>
            <v-chip color="primary" variant="tonal" size="small" class="ml-3 collection-count-chip">
              {{ collectionData.results.length }} result{{ collectionData.results.length !== 1 ? 's' : '' }}
            </v-chip>
          </div>
        </div>
        
        <!-- Documents List -->
        <div class="documents-cards-container">
          <router-link
            v-for="(doc, docIndex) in collectionData.results"
            :key="doc.id || docIndex"
            :to="`/collections/${collectionData.collection}/documents/${doc.id}`"
            style="text-decoration: none; display: block;"
          >
            <v-card
              class="mb-3 document-card-clickable"
              style="cursor: pointer;"
            >
              <v-card-text :class="['google-result-card', getResultDensityClass(doc)]">
                <div class="google-result-content">
                  <!-- Title (Google style - blue, clickable) -->
                  <h3 class="google-result-title" v-html="getBestTitle(doc)"></h3>

                  <div v-if="getDocumentDate(doc)" class="google-result-meta google-result-meta--date">
                    <span class="google-result-date">{{ formatDocumentDate(doc) }}</span>
                  </div>
                  
                  <!-- URL/ID (Google style - green, smaller) - right below title -->
                  <div class="google-result-url">
                    <span class="google-result-url-text">{{ doc.id }}</span>
                    <v-chip
                      v-if="doc._text_match !== undefined"
                      :color="getScoreColor(doc._text_match)"
                      size="x-small"
                      variant="flat"
                      class="google-score-chip"
                    >
                      Score: {{ typeof doc._text_match === 'number' ? doc._text_match.toFixed(2) : doc._text_match }}
                    </v-chip>
                  </div>
                  
                  <!-- Snippet/Description (Google style) -->
                  <div
                    v-if="(doc.highlights && Object.keys(doc.highlights).length > 0) || getBestContent(doc)"
                    class="google-result-snippet"
                  >
                    <!-- Highlights Preview -->
                    <div v-if="doc.highlights && Object.keys(doc.highlights).length > 0">
                      <div v-for="(highlight, field) in doc.highlights" :key="field" class="google-highlight-field">
                        <span v-if="field !== 'title'" v-html="formatServerHighlights(highlight)"></span>
                      </div>
                    </div>
                    <!-- Content Preview -->
                    <div v-else-if="getBestContent(doc)" v-html="cleanHighlightText(getBestContent(doc))"></div>
                  </div>
                  <div v-else class="google-result-fallback">No preview available.</div>
                </div>
              </v-card-text>
            </v-card>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { inject } from 'vue'
import { useCollections } from '../composables/useCollections'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl, getBestTitle, getBestContent, formatServerHighlights } from '../utils/apiHelpers'

const route = useRoute()
const router = useRouter()
const baseUrl = inject('baseUrl')

const { collections, loadCollections } = useCollections(baseUrl)

const loading = ref(false)
const error = ref(null)
const indexingInProgress = ref(false)

const searchQuery = ref('')
const allResults = ref([])
const GLOBAL_SEARCH_LIMIT = 20

const searchResultsByCollection = computed(() => {
  const grouped = {}
  
  allResults.value.forEach(result => {
    const collection = result.collection || 'Unknown'
    if (!grouped[collection]) {
      grouped[collection] = {
        collection,
        results: []
      }
    }
    grouped[collection].results.push(result.doc)
  })
  
  return Object.values(grouped).sort((a, b) => b.results.length - a.results.length)
})

const totalResults = computed(() => {
  return allResults.value.length
})

const goToCreateCollection = () => {
  router.push('/collections/create')
}

const clearSearch = () => {
  router.push('/search/collections')
}

const getScoreColor = (score) => {
  if (typeof score !== 'number') return 'primary'
  if (score >= 0.8) return 'success'
  if (score >= 0.5) return 'warning'
  return 'error'
}

const cleanHighlightText = (text) => {
  if (!text) return ''
  // Remove HTML tags but preserve <strong> tags for highlighting (from formatServerHighlights)
  return text.replace(/<(?!\/?strong\b)[^>]+>/gi, '')
}

const getDocumentDate = (doc) => {
  const dateFields = ['created_at', 'updated_at', 'date', 'timestamp', 'created', 'updated']
  for (const field of dateFields) {
    if (doc[field]) {
      return doc[field]
    }
  }
  return null
}

const formatDocumentDate = (doc) => {
  const dateString = getDocumentDate(doc)
  if (!dateString && dateString !== 0) return ''
  try {
    let date
    
    // Handle different input types
    if (typeof dateString === 'number') {
      // Unix timestamp: check if seconds (< year 2286) or milliseconds
      date = dateString < 10000000000 
        ? new Date(dateString * 1000) // seconds since epoch
        : new Date(dateString) // milliseconds since epoch
    } else if (typeof dateString === 'string') {
      // Try ISO string first (most common)
      date = new Date(dateString)
      
      // If ISO parsing failed, try Unix timestamp string
      if (isNaN(date.getTime())) {
        const timestamp = parseFloat(dateString)
        if (!isNaN(timestamp) && isFinite(timestamp)) {
          date = timestamp < 10000000000 
            ? new Date(timestamp * 1000) // seconds
            : new Date(timestamp) // milliseconds
        }
      }
    } else {
      date = new Date(dateString)
    }
    
    // Validate the date
    if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
      return String(dateString) // Return original if invalid
    }
    
    // Format: "Jan 15, 2024 at 3:45 PM" - clean and readable
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, '0')
    
    return `${month} ${day}, ${year} at ${displayHours}:${displayMinutes} ${ampm}`
  } catch (err) {
    return String(dateString)
  }
}

const getResultContentLength = (doc) => {
  const title = getBestTitle(doc) || ''
  const id = doc?.id || ''
  const content = getBestContent(doc) || ''
  const date = getDocumentDate(doc) || ''
  return String(title).length + String(id).length + String(content).length + String(date).length
}

const getResultDensityClass = (doc) => {
  const length = getResultContentLength(doc)
  if (length > 520) return 'google-result-card--dense'
  if (length > 260) return 'google-result-card--compact'
  return ''
}

const performGlobalSearch = async () => {
  if (!searchQuery.value || !searchQuery.value.trim()) {
    allResults.value = []
    return
  }

  loading.value = true
  error.value = null
  indexingInProgress.value = false

  try {
    // Load collections lazily: first search may need it, later searches reuse cached list.
    if (!collections.value || collections.value.length === 0) {
      await loadCollections()
    }

    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const query = searchQuery.value.trim()

    const searchUrl = buildApiUrl(baseUrlValue, useProxy, '/search')
    const response = await axios.post(searchUrl, {
      q: query,
      query_by: 'name,title,content',
      per_page: GLOBAL_SEARCH_LIMIT,
      highlight: false,
      collections: collections.value.map(c => c.name)
    }, { timeout: 10000 })

    if (response.data?.indexing_in_progress) {
      indexingInProgress.value = true
    }

    const hits = Array.isArray(response.data?.hits) ? response.data.hits : []
    allResults.value = hits.map(hit => {
      const doc = hit?.document || {}
      const collectionName = doc._collection || 'Unknown'
      return {
        collection: collectionName,
        doc
      }
    })
  } catch (err) {
    error.value = err.message || 'Error performing search'
    console.error('Global search error:', err)
  } finally {
    loading.value = false
  }
}

// Watch route params for search query
watch(() => route.params.query, async (newQuery) => {
  if (newQuery) {
    searchQuery.value = decodeURIComponent(newQuery)
    await performGlobalSearch()
  } else {
    searchQuery.value = ''
    allResults.value = []
  }
}, { immediate: true })
</script>

<style scoped>
.global-search-view {
  padding: 0;
}

.search-query-card {
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
  transition: all 0.2s ease !important;
}

.search-query-card:hover {
  border-color: #cbd5e1 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
}

.search-query-content {
  padding: 16px 20px !important;
}

.search-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(72, 138, 236, 0.1) 0%, rgba(72, 138, 236, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}

.search-query-text {
  min-width: 0;
  flex: 1;
}

.search-label {
  color: #64748b !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px !important;
  line-height: 1.2 !important;
}

.search-query-value {
  color: #1e293b !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  word-break: break-word;
}

.search-clear-btn {
  color: #64748b !important;
  margin-left: 12px !important;
  opacity: 0.7;
  transition: all 0.2s ease !important;
}

.search-clear-btn:hover {
  color: #1e293b !important;
  opacity: 1;
  background: rgba(100, 116, 139, 0.1) !important;
}

.collection-results-section {
  margin-bottom: 40px;
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
}

.collection-results-section:last-child {
  margin-bottom: 0;
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
}

/* Remove any dividers from Vuetify components */
.collection-results-section :deep(.v-divider),
.collection-results-section :deep(hr),
.collection-results-section :deep([class*="divider"]) {
  display: none !important;
}

.document-card-clickable :deep(.v-divider),
.document-card-clickable :deep(hr),
.document-card-clickable :deep([class*="divider"]) {
  display: none !important;
}

.google-result-card :deep(.v-divider),
.google-result-card :deep(hr),
.google-result-card :deep([class*="divider"]) {
  display: none !important;
}

.collection-header {
  padding: 20px 0 12px 0;
  margin-bottom: 20px;
  border: none !important;
  border-bottom: none !important;
  border-top: none !important;
}

.collection-name {
  color: #1e293b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em;
}

.collection-count-chip {
  font-weight: 600 !important;
  font-size: 12px !important;
}

/* Documents Cards Container - Same as CollectionDocumentsView */
.documents-cards-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 100%;
  padding: 0;
}

.document-card-clickable {
  background: transparent !important;
  border-radius: 8px !important;
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  transition: all 0.2s ease !important;
  margin-bottom: 12px !important;
  outline: none !important;
}

.document-card-clickable:hover {
  background: #f8fafc !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-1px);
}

.document-card-clickable:last-child {
  margin-bottom: 0 !important;
}

/* Google-style Result Cards - Same as CollectionDocumentsView */
.google-result-card {
  background: transparent !important;
  padding: 20px 24px !important;
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  box-shadow: none !important;
  margin-bottom: 0 !important;
  border-radius: 8px !important;
}

.google-result-card--compact {
  padding: 16px 20px !important;
}

.google-result-card--dense {
  padding: 14px 18px !important;
}

.google-result-card:hover {
  background: transparent !important;
  box-shadow: none !important;
}

.google-result-content {
  max-width: 100%;
  padding: 0;
}

/* Google-style Title */
.google-result-title {
  font-size: 20px !important;
  line-height: 1.24 !important;
  font-weight: 700 !important;
  color: #1a0dab !important;
  margin: 0 0 1px 0 !important;
  padding: 0 !important;
  cursor: pointer !important;
  font-family: arial, sans-serif !important;
  text-decoration: none !important;
  display: block !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
}

.google-result-meta {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  min-width: 0 !important;
  margin: 0 0 2px 0 !important;
  line-height: 1.25 !important;
}

.google-result-title:hover {
  text-decoration: underline !important;
}

.google-result-title :deep(a),
.google-result-title :deep(span) {
  color: #1a0dab !important;
  text-decoration: none !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
}

.google-result-title :deep(em) {
  font-style: normal !important;
  font-weight: bold !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
}

/* Google-style URL */
.google-result-url {
  display: flex !important;
  align-items: flex-start !important;
  margin-bottom: 4px !important;
  margin-top: 0 !important;
  flex-wrap: wrap !important;
  gap: 4px 8px !important;
  min-width: 0 !important;
}

.google-result-url-text {
  font-size: 14px !important;
  line-height: 1.3 !important;
  color: #006621 !important;
  font-family: arial, sans-serif !important;
  font-style: normal !important;
  display: inline-block !important;
  max-width: 100% !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  white-space: normal !important;
}

.google-score-chip {
  font-size: 11px !important;
  height: 18px !important;
  font-weight: 600 !important;
  flex: 0 0 auto !important;
  margin-top: 0 !important;
}

/* Google-style Snippet */
.google-result-snippet {
  font-size: 14px !important;
  line-height: 1.45 !important;
  color: #545454 !important;
  margin-top: 3px !important;
  font-family: arial, sans-serif !important;
  display: block !important;
}

.google-result-snippet :deep(em) {
  font-style: normal !important;
  font-weight: bold !important;
  color: #202124 !important;
}

.google-highlight-field {
  margin-bottom: 4px !important;
}

.google-highlight-field:last-child {
  margin-bottom: 0 !important;
}

.google-result-fallback {
  color: #70757a !important;
  font-size: 13px !important;
  margin-top: 3px !important;
}

.google-result-date {
  color: #70757a !important;
  font-size: 13px !important;
  line-height: 1.25 !important;
}

@media (max-width: 640px) {
  .google-result-card {
    padding: 13px 14px !important;
  }

  .google-result-card--compact {
    padding: 11px 12px !important;
  }

  .google-result-card--dense {
    padding: 10px 11px !important;
  }

  .google-result-title {
    font-size: 18px !important;
    line-height: 1.22 !important;
  }

  .google-result-url {
    align-items: flex-start !important;
    gap: 3px 6px !important;
    margin-bottom: 2px !important;
  }

  .google-result-url-text {
    flex: 1 1 170px !important;
    min-width: 0 !important;
    font-size: 13px !important;
    line-height: 1.25 !important;
  }

  .google-score-chip {
    max-width: 100% !important;
    margin-top: 1px !important;
  }

  .google-result-snippet {
    font-size: 13px !important;
    line-height: 1.38 !important;
    margin-top: 2px !important;
  }
}

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
  font-weight: 700 !important;
  font-size: 18px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-pagination-info-top {
  font-size: 13px;
  color: #64748b;
  margin-top: 8px;
  display: flex;
  align-items: center;
}

.collections-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Collections action buttons - Same style as CollectionsView */
.collections-action-btn {
  border-radius: 6px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  line-height: 32px !important;
  height: 32px !important;
  padding: 0 14px !important;
  text-transform: none !important;
  border: none !important;
  letter-spacing: normal !important;
  color: #ffffff !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  position: relative !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  gap: 0 !important;
  pointer-events: auto !important;
  z-index: 10 !important;
  cursor: pointer !important;
  
  /* 3D gradient background with #043061 */
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  
  /* Multi-layer 3D shadow effect - raised appearance */
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  
  /* Slight 3D transform */
  transform: perspective(1000px) translateZ(0) !important;
}

.collections-action-btn :deep(.v-btn__overlay) {
  pointer-events: none !important;
}

.collections-action-btn :deep(.v-btn__content) {
  position: relative !important;
  z-index: 1 !important;
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.collections-action-btn::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%) !important;
  pointer-events: none !important;
  opacity: 1 !important;
  transition: opacity 0.3s ease !important;
}

.collections-action-btn:hover {
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
  color: #ffffff !important;
}

.collections-action-btn:hover::before {
  opacity: 1 !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%) !important;
}

.collections-action-btn:hover :deep(.v-btn__content) {
  text-decoration: underline !important;
}

.collections-action-btn:active {
  background: linear-gradient(135deg, #032a4f 0%, #021d3a 50%, #011528 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow: 
    0 2px 4px rgba(4, 48, 97, 0.4),
    0 1px 2px rgba(4, 48, 97, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.collections-action-btn:active::before {
  opacity: 0.5 !important;
}

.collections-action-btn :deep(.v-icon),
.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__append),
.collections-action-btn :deep(.v-btn__prepend-inner),
.collections-action-btn :deep(.v-btn__append-inner) {
  display: none !important;
}
</style>
