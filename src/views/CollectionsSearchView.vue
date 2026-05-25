<template>
  <div class="collections-search-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <div class="collections-title-block">
          <div class="collections-title-row">
            <h1 class="collections-title-text">Collections</h1>
            <span v-if="searchQuery" class="collections-search-inline-pill">{{ searchQuery }}</span>
          </div>
          <div class="collections-pagination-info-top" v-if="filteredCollections.length > 0">
            <v-icon size="14" class="mr-2" style="opacity: 0.7;">mdi-folder-multiple</v-icon>
            Found {{ filteredCollections.length }} collection{{ filteredCollections.length !== 1 ? 's' : '' }}
            <span v-if="filteredCollections.length > itemsPerPage" class="ml-2" style="color: #94a3b8;">
              (Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredCollections.length) }})
            </span>
          </div>
        </div>
      </div>
      <!-- Action Buttons - Top Right -->
      <div class="collections-header-actions">
        <!-- Items Per Page Selector -->
        <v-menu
          v-model="showItemsPerPageMenu"
          location="bottom end"
          :close-on-content-click="true"
        >
          <template v-slot:activator="{ props }">
            <button
              v-bind="props"
              class="google-toolbar-btn items-per-page-btn"
              :class="{ 'active': showItemsPerPageMenu }"
              :aria-label="`${itemsPerPage} results per page`"
            >
              <v-icon size="16">mdi-format-list-numbered</v-icon>
              <span>{{ itemsPerPage }} per page</span>
            </button>
          </template>
          <v-list class="google-menu">
            <v-list-subheader>Results per page</v-list-subheader>
            <v-list-item
              v-for="option in itemsPerPageOptions"
              :key="option"
              @click="itemsPerPage = option; showItemsPerPageMenu = false"
              :class="['google-menu-item', { 'active': itemsPerPage === option }]"
            >
              <v-list-item-title>{{ option }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-menu
          v-model="showSortMenu"
          location="bottom end"
          :close-on-content-click="true"
        >
          <template v-slot:activator="{ props }">
            <button
              v-bind="props"
              class="google-toolbar-btn items-per-page-btn"
              :class="{ 'active': showSortMenu }"
              :aria-label="`Sort by ${currentSortLabel}`"
            >
              <v-icon size="16">mdi-sort</v-icon>
              <span>Sort: {{ currentSortLabel }}</span>
            </button>
          </template>
          <v-list class="google-menu">
            <v-list-subheader>Sort by</v-list-subheader>
            <v-list-item
              v-for="option in sortOptions"
              :key="option.label"
              @click="applySort(option)"
              :class="['google-menu-item', { 'active': option.value === sortBy && option.order === sortOrder }]"
            >
              <v-list-item-title>{{ option.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-tooltip text="Create a new collection to organize your documents (Ctrl+N)" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              @click.stop="goToCreateCollection"
              variant="flat"
              size="small"
              prepend-icon="mdi-plus"
              class="collections-action-btn create-collection-search-btn"
              style="pointer-events: auto !important; z-index: 10 !important;"
            >
              Create Collection
            </v-btn>
          </template>
        </v-tooltip>
      </div>
    </div>

    <!-- Search Query Display - Simple -->
    <div v-if="searchQuery" class="search-query-simple mb-4">
      <span class="search-query-label">Searching for</span>
      <span class="search-query-pill">{{ searchQuery }}</span>
    </div>

    <!-- Loading State -->
    <LoadingSkeleton v-if="loading" variant="list" :items="5" />

    <!-- Error State -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      <div class="font-weight-bold mb-2">Error Loading Collections</div>
      <div>{{ error }}</div>
    </v-alert>

    <!-- No Query State -->
    <v-card v-if="!loading && !searchQuery && collections.length > 0" class="mb-card card-premium">
      <v-card-text class="text-center py-12">
        <v-icon icon="mdi-folder-multiple" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <div class="text-h6 text-grey-darken-1 font-weight-medium mb-2">All Collections</div>
        <div class="text-body-2 text-grey-darken-1">Showing all {{ collections.length }} collection{{ collections.length !== 1 ? 's' : '' }}</div>
      </v-card-text>
    </v-card>

    <!-- No Results State -->
    <v-card v-if="!loading && searchQuery && filteredCollections.length === 0" class="mb-card card-premium collections-empty-card">
      <v-card-text class="text-center py-12 collections-empty-state">
        <v-icon icon="mdi-magnify-close" size="80" color="grey-lighten-1" class="mb-4 collections-empty-icon"></v-icon>
        <div class="text-h6 text-grey-darken-1 font-weight-medium mb-2">No collections found</div>
        <div class="text-body-2 text-grey-darken-1">No collections match "{{ searchQuery }}"</div>
      </v-card-text>
    </v-card>

    <!-- Collections List -->
    <div v-if="!loading && paginatedCollections.length > 0" class="collections-list">
      <div
        v-for="(item, index) in paginatedCollections"
        :key="item.name || index"
        @click="goToItem(item)"
        class="collection-item"
      >
        <div class="collection-item-content">
          <div class="d-flex align-center">
            <div class="collection-item-name">{{ item.name }}</div>
            <v-chip
              v-if="item.type === 'alias'"
              size="x-small"
              color="primary"
              variant="flat"
              class="ml-2 font-weight-bold"
            >
              Alias
            </v-chip>
          </div>
          <div class="collection-item-meta">
            <span v-if="item.type === 'alias'" class="collection-item-target">
              → {{ item.collection_name }}
            </span>
            <span class="collection-item-docs">
              {{ item.num_documents || 0 }} document{{ (item.num_documents || 0) !== 1 ? 's' : '' }}
            </span>
            <span v-if="item.created_at" class="collection-item-date">
              {{ formatDate(item.created_at) }}
            </span>
          </div>
        </div>
        <div class="collection-item-side">
          <span class="collection-item-open">Open</span>
          <v-icon icon="mdi-chevron-right" size="20" class="collection-item-arrow"></v-icon>
        </div>
      </div>
    </div>
    
    <!-- Pagination -->
    <div v-if="!loading && filteredCollections.length > itemsPerPage" class="d-flex justify-center mt-4">
      <v-pagination
        v-model="currentPage"
        :length="Math.ceil(filteredCollections.length / itemsPerPage)"
        :total-visible="7"
        class="collections-pagination"
      ></v-pagination>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { inject } from 'vue'
import { useCollections } from '../composables/useCollections'
import { useAliases } from '../composables/useAliases'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'

const route = useRoute()
const router = useRouter()
const baseUrl = inject('baseUrl')

const { collections, loading: collectionsLoading, error: collectionsError, loadCollections } = useCollections(baseUrl)
const { aliases, loading: aliasesLoading, error: aliasesError, loadAliases } = useAliases(baseUrl)

const loading = computed(() => collectionsLoading.value || aliasesLoading.value)
const error = computed(() => collectionsError.value || aliasesError.value)

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(100)
const itemsPerPageOptions = [10, 25, 50, 100]
const showItemsPerPageMenu = ref(false)
const showSortMenu = ref(false)
const sortBy = ref('name')
const sortOrder = ref('asc')
const sortOptions = [
  { label: 'Name (A-Z)', value: 'name', order: 'asc' },
  { label: 'Name (Z-A)', value: 'name', order: 'desc' },
  { label: 'Documents (High-Low)', value: 'num_documents', order: 'desc' },
  { label: 'Documents (Low-High)', value: 'num_documents', order: 'asc' },
  { label: 'Created (Newest)', value: 'created_at', order: 'desc' },
  { label: 'Created (Oldest)', value: 'created_at', order: 'asc' }
]

const currentSortLabel = computed(() => {
  const match = sortOptions.find(opt => opt.value === sortBy.value && opt.order === sortOrder.value)
  return match ? match.label.replace(' (', ' ').replace(')', '') : 'Name A-Z'
})

const applySort = (option) => {
  sortBy.value = option.value
  sortOrder.value = option.order
  showSortMenu.value = false
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getWildcardRegex = (pattern) => {
  const escaped = escapeRegex(pattern)
  const regexBody = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.')
  return new RegExp(`^${regexBody}$`, 'i')
}

const mergedCollections = computed(() => {
  const all = [
    ...collections.value.map(c => ({ ...c, type: 'collection' })),
    ...aliases.value.map(a => ({ 
      ...a, 
      type: 'alias', 
      num_documents: collections.value.find(c => c.name === a.collection_name)?.num_documents || 0 
    }))
  ]
  return all
})

const sortedCollections = computed(() => {
  const list = [...mergedCollections.value]
  const key = sortBy.value
  const dir = sortOrder.value === 'desc' ? -1 : 1
  return list.sort((a, b) => {
    const av = a?.[key] ?? ''
    const bv = b?.[key] ?? ''
    if (key === 'num_documents') {
      return (Number(av) - Number(bv)) * dir
    }
    if (key === 'created_at') {
      const ad = new Date(av).getTime() || 0
      const bd = new Date(bv).getTime() || 0
      return (ad - bd) * dir
    }
    return String(av).localeCompare(String(bv)) * dir
  })
})

const filteredCollections = computed(() => {
  const source = sortedCollections.value
  if (!searchQuery.value || !searchQuery.value.trim()) {
    return source
  }
  
  const queryRaw = searchQuery.value.trim()
  const query = queryRaw.toLowerCase()
  const hasWildcard = /[\*\?]/.test(queryRaw)
  const wildcardRegex = hasWildcard ? getWildcardRegex(queryRaw) : null
  
  return source.filter(c => {
    const name = (c.name || '').toLowerCase()
    const target = c.type === 'alias' ? (c.collection_name || '').toLowerCase() : ''
    if (hasWildcard && wildcardRegex) {
      return wildcardRegex.test(name) || wildcardRegex.test(target)
    }
    return name === query || target === query
  })
})

const paginatedCollections = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredCollections.value.slice(start, end)
})

const goToCreateCollection = () => {
  router.push('/collections/create')
}

const clearSearch = () => {
  router.push('/search/collections')
}

const getAliasRoute = (collectionName) => {
  const name = String(collectionName || '').trim()
  return name ? `/aliases/${encodeURIComponent(name)}` : '/aliases'
}

const goToItem = (item) => {
  if (item.type === 'alias') {
    router.push(getAliasRoute(item.collection_name))
  } else if (item.name) {
    router.push(`/collections/${encodeURIComponent(item.name)}`)
  }
}

const formatDate = (dateString) => {
  if (!dateString && dateString !== 0) return 'N/A'
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
    
    // Format: "Jan 15, 2024 at 3:45:12 PM" - clean and readable
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, '0')
    const displaySeconds = seconds.toString().padStart(2, '0')
    
    return `${month} ${day}, ${year} at ${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`
  } catch (err) {
    console.warn('Date formatting error:', err, dateString)
    return String(dateString)
  }
}

watch([searchQuery, sortBy, sortOrder], async () => {
  await loadCollections(true, searchQuery.value || null, sortBy.value, sortOrder.value)
})

// Watch route params for search query
watch(() => route.params.query, (newQuery) => {
  if (newQuery) {
    searchQuery.value = decodeURIComponent(newQuery)
  } else {
    searchQuery.value = ''
  }
}, { immediate: true })

onMounted(async () => {
  await Promise.all([
    loadCollections(true, searchQuery.value || null, sortBy.value, sortOrder.value),
    loadAliases()
  ])
  if (route.params.query) {
    searchQuery.value = decodeURIComponent(route.params.query)
  }
})
</script>

<style scoped>
.collections-search-view {
  padding: 0;
  position: relative;
}

.collections-search-view::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: min(420px, 40vw);
  height: 160px;
  pointer-events: none;
  background: transparent;
  z-index: 0;
}

.collections-search-view > * {
  position: relative;
  z-index: 1;
}

.collections-empty-card {
  overflow: hidden;
}

.collections-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.collections-empty-icon {
  display: flex !important;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin-left: auto !important;
  margin-right: auto !important;
}

/* Search Query Simple Display */
.search-query-simple {
  display: none;
}

.search-query-label {
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.search-query-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #d7e1ec;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
  font-weight: 700;
  color: #0f172a;
}

/* Collections List - Clean and Simple */
.collections-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;
}

.collection-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: #ffffff;
  border: 1px solid #d9e2ec;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.22s ease;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035);
  position: relative;
}

.collection-item:hover {
  background: #ffffff;
  border-color: #b8c7d8;
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.07);
}

.collection-item-content {
  flex: 1;
  min-width: 0;
}

.collection-item-name {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 700;
  font-size: 18px;
  color: #0f172a;
  line-height: 1.4;
  margin-bottom: 6px;
  transition: color 0.2s ease;
  letter-spacing: -0.02em;
}

.collection-item:hover .collection-item-name {
  color: #0b315c;
}

.collection-item-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: #64748b;
  flex-wrap: wrap;
}

.collection-item-docs {
  font-weight: 700;
  color: #52637a;
}

.collection-item-date {
  font-size: 12px;
  opacity: 0.92;
  color: #71839a;
}

.collection-item-side {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  flex-shrink: 0;
}

.collection-item-open {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #7b8ba1;
}

.collection-item-arrow {
  color: #64748b;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.collection-item:hover .collection-item-arrow {
  color: #0f172a;
  transform: translateX(4px);
}

/* Legacy list item styles (kept for compatibility) */
.collection-list-item {
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s ease;
}

.collection-list-item:hover {
  background-color: #f8fafc !important;
}

.collections-header {
  margin-top: 0 !important;
  margin-bottom: 18px !important;
  padding: 6px 0 0 !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  visibility: visible !important;
  opacity: 1 !important;
  flex-wrap: wrap;
  gap: 18px;
}

.collections-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
}

.collections-title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.collections-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.collections-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 800 !important;
  font-size: 26px !important;
  line-height: 1.2 !important;
  color: #0f172a !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-search-inline-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #d9e2ec;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.collections-pagination-info-top {
  font-size: 13px;
  color: #0f172a;
  margin-top: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.collections-header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Collections action buttons - Same style as CollectionsView */
.collections-action-btn {
  border-radius: 12px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  line-height: 40px !important;
  height: 40px !important;
  padding: 0 18px !important;
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
  border-radius: 12px !important;
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

.collections-action-btn :deep(.v-btn__append),
.collections-action-btn :deep(.v-btn__append-inner) {
  display: none !important;
}

.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  margin-right: 6px !important;
}

.collections-action-btn :deep(.v-btn__prepend .v-icon),
.collections-action-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
}

.create-collection-search-btn :deep(.v-btn__content) {
  gap: 4px !important;
  transform: translateX(-2px);
}

.create-collection-search-btn :deep(.v-btn__prepend),
.create-collection-search-btn :deep(.v-btn__prepend-inner) {
  margin-right: 4px !important;
}

.gap-2 {
  gap: 8px;
}

/* Google-style toolbar button */
.google-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 16px;
  background: #ffffff;
  border: 1px solid #d7e1ec;
  border-radius: 14px;
  font-family: Inter, Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #5b6677;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow:
    0 6px 14px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  white-space: nowrap;
}

.google-toolbar-btn:hover {
  background: #ffffff;
  border-color: #bac8d8;
  color: #334155;
  transform: translateY(-1px);
  box-shadow:
    0 10px 22px rgba(15, 23, 42, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.98);
}

.google-toolbar-btn.active {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-color: #94a3b8;
  color: #334155;
}

.items-per-page-btn {
  min-width: 132px;
}

.google-toolbar-btn :deep(.v-icon) {
  font-size: 20px !important;
  color: #6b7280 !important;
}

@media (max-width: 960px) {
  .collections-header-actions {
    gap: 10px;
    justify-content: flex-start;
  }

  .google-toolbar-btn {
    min-height: 42px;
    padding: 0 14px;
    border-radius: 14px;
    font-size: 14px;
    gap: 8px;
  }

  .google-toolbar-btn :deep(.v-icon) {
    font-size: 19px !important;
  }

  .items-per-page-btn {
    min-width: 124px;
  }

  .collections-title-text {
    font-size: 22px !important;
  }

  .collection-item {
    padding: 16px 16px;
    border-radius: 16px;
  }

  .collection-item-name {
    font-size: 16px;
  }
}

/* Google-style menu */
.google-menu {
  padding: 8px 0;
  min-width: 160px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.google-menu-item {
  padding: 8px 16px;
  font-family: Inter, Helvetica, sans-serif;
  font-size: 14px;
  color: #1e293b;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.google-menu-item:hover {
  background: #f8fafc;
}

.google-menu-item.active {
  background: #e0e7ff;
  color: #043061;
  font-weight: 600;
}
</style>
