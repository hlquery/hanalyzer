<template>
  <div class="aliases-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <div>
          <h1 class="collections-title-text">{{ pageTitle }}</h1>
          <div class="collections-total-text" v-if="!loading && aliases.length > 0">
            <v-icon icon="mdi-link-variant" size="16" class="collections-dir-icon"></v-icon>
            Showing {{ filteredAliases.length }} out of {{ aliases.length }}
          </div>
        </div>
      </div>
      <div class="collections-header-actions">
        <v-menu
          v-model="showItemsPerPageMenu"
          location="bottom start"
          :close-on-content-click="true"
        >
          <template v-slot:activator="{ props }">
            <button
              v-bind="props"
              class="google-toolbar-btn items-per-page-btn"
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
              @click="itemsPerPage = option; onItemsPerPageChange(option); showItemsPerPageMenu = false"
              :class="['google-menu-item', { 'active': itemsPerPage === option }]"
            >
              <v-list-item-title>{{ option }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn
          @click="router.push('/aliases/create')"
          variant="flat"
          size="small"
          prepend-icon="mdi-plus"
          class="collections-action-btn create-collection-header-btn"
          style="pointer-events: auto !important; z-index: 10 !important;"
        >
          Create Alias
        </v-btn>
      </div>
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      <div class="font-weight-bold mb-1">Error</div>
      {{ error }}
    </v-alert>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <div class="mt-4 text-h6 text-grey-darken-1">Loading aliases...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="aliases.length === 0" class="empty-state-wrapper">
      <v-card class="mb-card card-premium empty-collections-card">
        <v-card-text class="empty-state-premium empty-collections-content">
          <div class="empty-collections-text">
          <h2 class="empty-collections-title">{{ emptyTitle }}</h2>
          <p class="empty-collections-description">
            {{ emptyDescription }}
          </p>
          </div>
          <div class="empty-collections-action">
            <v-btn
              variant="flat"
              size="large"
              prepend-icon="mdi-plus"
              @click="router.push('/aliases/create')"
              class="collections-action-btn empty-collections-btn create-collection-header-btn"
            >
              Create Alias
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Aliases Table -->
    <div v-else class="aliases-table-section">
      <div class="aliases-search-shell">
        <v-text-field
          v-model="searchQuery"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          placeholder="Search aliases"
          prepend-inner-icon="mdi-magnify"
          class="aliases-search-input"
        />
      </div>
      <v-card class="collections-card card-premium animate-fade-in">
      <v-data-table
        :headers="headers"
        :items="filteredAliases"
        v-model:page="currentPage"
        v-model:items-per-page="itemsPerPage"
        :items-per-page="itemsPerPage"
        class="collections-table"
        hide-default-footer
      >
        <template v-slot:item="{ item }">
          <tr
            class="alias-table-row"
            @click="handleAliasRowClick(item.collection_name, $event)"
            @auxclick="handleAliasRowClick(item.collection_name, $event)"
            @contextmenu.prevent="openCollectionInNewTab(item.collection_name)"
          >
            <td>
              <span class="text-body-1 font-weight-bold text-primary alias-name-link">{{ item.name }}</span>
            </td>
            <td>
              <div class="d-flex align-center">
                <v-icon size="18" color="grey-darken-1" class="mr-2">mdi-folder</v-icon>
                <span class="text-body-1 text-grey-darken-3 collection-name-link">{{ item.collection_name }}</span>
              </div>
            </td>
            <td>
              <span class="text-caption alias-created-text">
                {{ formatDate(item.created_at) }}
              </span>
            </td>
            <td>
              <div class="d-flex justify-end">
                <button
                  type="button"
                  class="alias-delete-btn"
                  title="Delete Alias"
                  aria-label="Delete Alias"
                  @click.stop="confirmDeleteAlias(item.name)"
                >
                  <i class="mdi mdi-delete alias-delete-icon" aria-hidden="true"></i>
                </button>
              </div>
            </td>
          </tr>
        </template>
      </v-data-table>
      </v-card>
    </div>

    <!-- Alias Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="900" scrollable>
      <v-card v-if="selectedAlias" class="alias-details-card">
        <v-card-title class="pa-4 d-flex align-center detail-dialog-header">
          <v-icon class="mr-3">mdi-link-variant</v-icon>
          <div class="d-flex flex-column">
            <span class="text-h6 font-weight-bold">Alias: {{ selectedAlias.name }}</span>
            <span class="text-caption text-grey-darken-1">Points to: {{ selectedAlias.collection_name }}</span>
          </div>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="showDetailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-0">
          <div v-if="schemaLoading" class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            <div class="mt-4">Loading collection schema...</div>
          </div>
          <div v-else-if="schemaError" class="pa-6 text-center">
            <v-icon color="error" size="48">mdi-alert-circle</v-icon>
            <div class="mt-2 text-h6">Failed to load schema</div>
            <div class="text-body-2">{{ schemaError }}</div>
          </div>
          <div v-else-if="collectionSchema" class="pa-6">
            <div class="schema-section mb-6">
              <h3 class="text-subtitle-1 font-weight-bold mb-3">
                <v-icon start size="20">mdi-information-outline</v-icon>
                Collection Information
              </h3>
              <v-row>
                <v-col cols="12" md="6">
                  <div class="detail-item">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">{{ collectionSchema.name }}</span>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="detail-item">
                    <span class="detail-label">Documents:</span>
                    <span class="detail-value">{{ collectionSchema.num_documents }}</span>
                  </div>
                </v-col>
              </v-row>
            </div>

            <div class="schema-section">
              <h3 class="text-subtitle-1 font-weight-bold mb-3">
                <v-icon start size="20">mdi-database</v-icon>
                Schema Fields ({{ collectionSchema.fields?.length || 0 }})
              </h3>
              <div class="fields-grid">
                <v-card
                  v-for="(field, idx) in collectionSchema.fields"
                  :key="idx"
                  variant="outlined"
                  class="field-card mb-2"
                >
                  <v-card-text class="pa-3 d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                      <div class="field-idx mr-3">{{ idx + 1 }}</div>
                      <div>
                        <div class="font-weight-bold">{{ typeof field === 'object' ? field.name : field }}</div>
                        <div class="text-caption text-grey-darken-1">{{ typeof field === 'object' ? field.type : 'string' }}</div>
                      </div>
                    </div>
                    <div class="d-flex gap-1">
                      <v-chip v-if="field.index" size="x-small" color="success" variant="flat">Index</v-chip>
                      <v-chip v-if="field.facet" size="x-small" color="info" variant="flat">Facet</v-chip>
                      <v-chip v-if="field.sort" size="x-small" color="warning" variant="flat">Sort</v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </div>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            @click="goToCollection(selectedAlias.collection_name)"
            prepend-icon="mdi-open-in-new"
          >
            Go to Collection
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="error"
            variant="text"
            size="small"
            @click="confirmDeleteAlias(selectedAlias.name)"
            prepend-icon="mdi-delete"
          >
            Delete Alias
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirm" max-width="480" persistent>
      <v-card class="simple-delete-dialog-card" elevation="0">
        <v-card-title class="simple-delete-dialog-header">
          <div class="simple-delete-dialog-header-copy">
            <div class="simple-delete-dialog-kicker">Confirm removal</div>
            <div class="simple-delete-dialog-title-row">
              <v-icon icon="mdi-link-variant-remove" size="18" color="white" class="mr-2"></v-icon>
              <span class="simple-delete-dialog-title">Delete Alias</span>
            </div>
          </div>
          <v-btn icon variant="text" @click="showDeleteConfirm = false" color="white">
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="simple-delete-dialog-body">
          <p class="simple-delete-dialog-copy">Remove this alias from your server?</p>
          <div v-if="aliasToDelete" class="simple-delete-dialog-preview">
            <div class="simple-delete-dialog-label">Alias name</div>
            <div class="simple-delete-dialog-value">{{ aliasToDelete }}</div>
          </div>
          <div class="mt-3 text-caption text-grey-darken-1">This will NOT delete the underlying collection.</div>
        </v-card-text>
        <v-card-actions class="simple-delete-dialog-actions">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteConfirm = false" :disabled="deletingAlias" size="small" class="mr-2">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="deleteAlias" :loading="deletingAlias" size="small">Delete Alias</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useCollections } from '../composables/useCollections'
import { useAliases } from '../composables/useAliases'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const route = useRoute()
const router = useRouter()
const baseUrl = inject('baseUrl', ref('http://localhost:9200'))
const toast = inject('toast', { success: () => {}, error: () => {} })
const { collections, loading: collectionsLoading, loadCollectionsAsync } = useCollections(baseUrl)
const { aliases, loading, error, loadAliases, createAlias: apiCreateAlias, deleteAlias: apiDeleteAlias } = useAliases(baseUrl)

const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Target Collection', key: 'collection_name', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' }
]

const itemsPerPageOptions = [10, 25, 50, 100]
const itemsPerPage = ref(50)
const currentPage = ref(1)
const showItemsPerPageMenu = ref(false)
const searchQuery = ref('')

const collectionFilter = computed(() => {
  const value = route.params.collection
  return typeof value === 'string' ? value.trim() : ''
})

const pageTitle = computed(() => collectionFilter.value ? `Aliases for ${collectionFilter.value}` : 'Aliases')

const emptyTitle = computed(() => collectionFilter.value ? `No aliases for ${collectionFilter.value}` : 'Create an alias')

const emptyDescription = computed(() => collectionFilter.value
  ? 'This collection does not have aliases yet.'
  : 'Point an alias to a collection, then use the alias name in searches.')

const filteredAliases = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const items = Array.isArray(aliases.value) ? aliases.value : []

  if (!query) return items

  return items.filter((item) => {
    const aliasName = String(item?.name || '').toLowerCase()
    const collectionName = String(item?.collection_name || '').toLowerCase()
    return aliasName.includes(query) || collectionName.includes(query)
  })
})

const onItemsPerPageChange = () => {
  currentPage.value = 1
}

// Delete Alias state
const showDeleteConfirm = ref(false)
const aliasToDelete = ref('')
const deletingAlias = ref(false)

// Details state
const showDetailsDialog = ref(false)
const selectedAlias = ref(null)
const collectionSchema = ref(null)
const schemaLoading = ref(false)
const schemaError = ref(null)

const confirmDeleteAlias = (name) => {
  aliasToDelete.value = name
  showDeleteConfirm.value = true
}

const deleteAlias = async () => {
  if (!aliasToDelete.value) return
  
  deletingAlias.value = true
  try {
    await apiDeleteAlias(aliasToDelete.value)
    toast.success(`Alias "${aliasToDelete.value}" deleted`)
    showDeleteConfirm.value = false
    if (showDetailsDialog.value && selectedAlias.value?.name === aliasToDelete.value) {
      showDetailsDialog.value = false
    }
  } catch (err) {
    toast.error(err.message)
  } finally {
    deletingAlias.value = false
  }
}

const showAliasDetails = async (alias) => {
  selectedAlias.value = alias
  showDetailsDialog.value = true
  
  schemaLoading.value = true
  schemaError.value = null
  collectionSchema.value = null
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const colName = encodeURIComponent(alias.collection_name)
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${colName}`)
    
    const response = await axios.get(url, { timeout: 5000 })
    collectionSchema.value = response.data
  } catch (err) {
    console.error('Failed to load target collection schema:', err)
    schemaError.value = extractSafeErrorMessage(err, 'Failed to load target collection info')
  } finally {
    schemaLoading.value = false
  }
}

const openCollectionInNewTab = (name) => {
  if (!name) return

  const collectionName = String(name).trim()
  if (!collectionName) return

  try {
    const encodedName = encodeURIComponent(collectionName)
    const path = `/collections/${encodedName}`
    const route = router.resolve({ path })
    window.open(route?.href || path, '_blank')
  } catch (err) {
    const encodedName = encodeURIComponent(collectionName)
    window.open(`/collections/${encodedName}`, '_blank')
  }
}

const handleAliasRowClick = (name, event = null) => {
  if (!name) return

  if (event) {
    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      openCollectionInNewTab(name)
      return
    }

    if (event.button === 2) {
      return
    }
  }

  goToCollection(name)
}

const goToCollection = (name) => {
  router.push(`/collections/${encodeURIComponent(name)}`)
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

const refreshAliases = (showLoading = true) => {
  currentPage.value = 1
  searchQuery.value = ''
  loadAliases(showLoading, collectionFilter.value)
}

watch(collectionFilter, () => {
  refreshAliases(true)
})

onMounted(() => {
  refreshAliases(true)
  loadCollectionsAsync()
})
</script>

<style scoped>
.aliases-view {
  width: 100%;
}

.alias-name-link:hover {
  text-decoration: underline;
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
  font-size: 24px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-header-actions {
  display: flex !important;
  gap: 16px !important;
  align-items: center !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

/* Allow prepend icon for Create Alias button in header */
.create-collection-header-btn :deep(.v-btn__prepend),
.create-collection-header-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
}

.create-collection-header-btn :deep(.v-btn__prepend .v-icon),
.create-collection-header-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 6px !important;
}

.collections-total-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  color: #64748b !important;
  margin: 4px 0 0 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px;
}

.collections-action-btn {
  border-radius: 6px !important;
  font-family: Inter, Helvetica, sans-serif !important;
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
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
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

.collections-action-btn :deep(.v-icon),
.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__append) {
  display: none !important;
}

/* Allow prepend icon for buttons with create-collection-header-btn class */
.create-collection-header-btn :deep(.v-btn__prepend),
.create-collection-header-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
}

.create-collection-header-btn :deep(.v-btn__prepend .v-icon),
.create-collection-header-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 6px !important;
}

.card-premium {
  border-radius: 12px !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
}

.collections-card {
  overflow: hidden !important;
  border-radius: 20px !important;
  border: none !important;
  background: #ffffff !important;
  box-shadow: 0 12px 30px rgba(11, 61, 107, 0.14), 0 2px 8px rgba(11, 61, 107, 0.08) !important;
}

.aliases-table-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.aliases-search-shell {
  background: transparent;
}

.aliases-search-input {
  max-width: 280px;
}

.aliases-search-input :deep(.v-field) {
  border-radius: 8px !important;
  background: #ffffff !important;
  border: none !important;
  box-shadow: none !important;
}

.aliases-search-input :deep(.v-field__outline) {
  display: none !important;
}

.aliases-search-input :deep(.v-field--focused) {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

.aliases-search-input :deep(.v-field--focused .v-field__outline),
.aliases-search-input :deep(.v-field--active .v-field__outline),
.aliases-search-input :deep(.v-input--focused .v-field__outline) {
  display: none !important;
  opacity: 0 !important;
}

.aliases-search-input :deep(.v-field__prepend-inner) {
  padding-left: 10px !important;
  padding-right: 6px !important;
}

.aliases-search-input :deep(.v-field__input) {
  font-size: 14px !important;
}

.aliases-search-input :deep(.v-field__input input::placeholder) {
  font-size: 14px !important;
}

.collections-table :deep(th) {
  background-color: #0b3d6b !important;
  font-weight: 600 !important;
  color: #ffffff !important;
}

.alias-created-text {
  color: #111111 !important;
}

.detail-dialog-header {
  background: #f8fafc;
}

.simple-delete-dialog-card {
  border-radius: 18px !important;
  overflow: hidden !important;
  border: 1px solid rgba(226, 232, 240, 0.9) !important;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18), 0 6px 18px rgba(15, 23, 42, 0.08) !important;
  background: #ffffff !important;
}

.simple-delete-dialog-header {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 16px !important;
  padding: 20px 22px !important;
  background: linear-gradient(135deg, #0f3a68 0%, #0b2f56 55%, #08213d 100%) !important;
}

.simple-delete-dialog-header-copy {
  min-width: 0;
}

.simple-delete-dialog-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 8px;
}

.simple-delete-dialog-title-row {
  display: flex;
  align-items: center;
}

.simple-delete-dialog-title {
  font-size: 20px;
  line-height: 1.1;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.simple-delete-dialog-body {
  padding: 24px !important;
}

.simple-delete-dialog-copy {
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 1.6;
  color: #111827;
}

.simple-delete-dialog-preview {
  border-radius: 14px;
  border: 1px solid #dbe4ef;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 16px 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.simple-delete-dialog-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 6px;
}

.simple-delete-dialog-value {
  font-size: 18px;
  line-height: 1.35;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

.simple-delete-dialog-actions {
  padding: 16px 22px !important;
  background: #f8fafc !important;
  border-top: 1px solid #e2e8f0;
}

.detail-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-label {
  font-weight: 600;
  color: #64748b;
  min-width: 100px;
}

.detail-value {
  color: #1e293b;
}

.field-card {
  border-radius: 8px !important;
  border: 1px solid #e2e8f0 !important;
}

.field-idx {
  width: 24px;
  height: 24px;
  background: #e2e8f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

/* Professional Empty Aliases State - Matches Collections View */
.empty-collections-card {
  border-radius: 16px !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  max-width: 600px !important;
  margin: 0 auto !important;
  
  /* 3D Popup Effect */
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
}

.empty-state-wrapper {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-collections-card::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  border-radius: 16px !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%) !important;
  pointer-events: none !important;
  opacity: 1 !important;
}

.empty-collections-card:hover {
  /* No shadow effect on hover */
}

.empty-collections-content {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 80px 40px !important;
  text-align: center !important;
  min-height: 320px !important;
}

.empty-collections-text {
  max-width: 480px;
  margin: 0 auto 32px auto;
}

.empty-collections-title {
  font-size: 28px !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  margin: 0 0 12px 0 !important;
  letter-spacing: -0.02em !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  line-height: 1.2 !important;
}

.empty-collections-description {
  font-size: 16px !important;
  color: #64748b !important;
  line-height: 1.6 !important;
  margin: 0 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
}

.empty-collections-action {
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-collections-btn {
  height: auto !important;
  padding: 14px 32px !important;
  font-size: 15px !important;
  border-radius: 8px !important;
}

.collections-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 700 !important;
  font-size: 18px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-total-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 13px !important;
  line-height: 1.2 !important;
  color: #111111 !important;
  margin: 2px 0 0 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px;
}

.collections-total-text .collections-dir-icon {
  color: #94a3b8 !important;
  margin-right: 0;
  vertical-align: middle;
}

.google-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #f8f9fa;
  position: relative;
  border-radius: 4px;
  background: #ffffff;
  color: #5f6368;
  font-family: arial, sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
}

.google-toolbar-btn:hover {
  border-color: #dadce0;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  background: #f8f9fa;
}

.google-toolbar-btn.active {
  border-color: #1a73e8;
  color: #1a73e8;
  background: #e8f0fe;
}

.google-toolbar-btn :deep(.v-icon) {
  color: inherit;
  font-size: 18px;
}

.items-per-page-btn {
  position: relative;
}

.items-per-page-btn[title]:hover::after,
.items-per-page-btn[title]:focus::after,
.items-per-page-btn[title]::after {
  display: none !important;
  content: none !important;
  visibility: hidden !important;
}

.items-per-page-btn :deep([role="tooltip"]),
.items-per-page-btn :deep(.v-tooltip),
.items-per-page-btn :deep(.v-overlay__content) {
  display: none !important;
  visibility: hidden !important;
}

.items-per-page-btn,
.items-per-page-btn span,
.items-per-page-btn :deep(.v-icon) {
  color: #111111 !important;
  font-weight: 700 !important;
}

.google-menu {
  padding: 8px 0 !important;
  min-width: 200px !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 10px 1px rgba(64, 60, 67, 0.28) !important;
  border: 1px solid #dadce0 !important;
  background: #ffffff !important;
}

.google-menu :deep(.v-list-subheader) {
  font-family: arial, sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #5f6368;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 16px;
  margin-bottom: 4px;
}

.google-menu-item {
  padding: 10px 16px !important;
  min-height: 40px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  display: flex !important;
  align-items: center !important;
  margin: 0 2px !important;
  border-radius: 4px !important;
}

.google-menu-item:hover {
  background: #f1f3f4 !important;
}

.google-menu-item.active {
  background: #e8f0fe !important;
}

.google-menu-item :deep(.v-list-item-title) {
  font-family: arial, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #202124;
}

.google-menu-item.active :deep(.v-list-item-title) {
  font-weight: 500;
  color: #1a73e8;
}

.google-menu-item :deep(.v-list-item__append) {
  display: none !important;
}

.google-menu-item :deep(.v-list-item__prepend) {
  display: none !important;
}

.google-menu-item :deep(.v-list-item__append > .v-icon) {
  display: none !important;
}

/* Match CollectionsView table styling */
.collections-table {
  width: 100% !important;
}

.collections-table :deep(.v-data-table),
.collections-table :deep(.v-data-table__wrapper) {
  width: 100% !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
}

.collections-table :deep(.v-data-table__thead),
.collections-table :deep(.v-data-table__thead tr),
.collections-table :deep(.v-data-table__thead th) {
  background: #0b3d6b !important;
  background-color: #0b3d6b !important;
}

.collections-table :deep(.v-data-table__thead th) {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  font-size: 13px !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  padding: 16px !important;
  border-bottom: none !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.collections-table :deep(.v-data-table__thead th:hover) {
  background: #135893 !important;
  background-color: #135893 !important;
}

.collections-table :deep(.v-data-table__tbody) {
  background: #ffffff !important;
  padding: 0 !important;
}

.collections-table :deep(.v-table__wrapper) {
  background: #ffffff !important;
}

.collections-table :deep(.v-data-table__tbody tr) {
  cursor: pointer !important;
  transition: background-color 0.2s ease !important;
  background: #ffffff !important;
  border: none !important;
}

.alias-table-row {
  cursor: pointer;
}

.alias-delete-btn {
  appearance: none;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 6px !important;
  background: transparent !important;
  color: #dc2626 !important;
  cursor: pointer;
  line-height: 1 !important;
  vertical-align: middle;
  box-shadow: none !important;
  outline: none !important;
}

.alias-delete-icon {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 18px !important;
  height: 18px !important;
  color: #dc2626 !important;
  font-size: 18px !important;
  line-height: 18px !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.alias-delete-btn:hover,
.alias-delete-btn:focus-visible {
  background: #fee2e2 !important;
}

.collections-table :deep(tbody tr:hover),
.collections-table :deep(tbody tr:hover td),
.collections-table :deep(.v-data-table__tbody tr:hover),
.collections-table :deep(.v-data-table__tbody tr:hover td) {
  background: #f1f5f9 !important;
  background-color: #f1f5f9 !important;
}

.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td) {
  background: #bbdefb !important;
  background-color: #bbdefb !important;
  font-weight: bold !important;
}

.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td *) {
  background: transparent !important;
  background-color: transparent !important;
}

@media (max-width: 600px) {
  .empty-collections-card {
    max-width: 100% !important;
  }
  
  .empty-collections-content {
    padding: 60px 24px !important;
    min-height: 280px !important;
  }
  
  .empty-collections-title {
    font-size: 24px !important;
  }
  
  .empty-collections-description {
    font-size: 15px !important;
  }
  
  .empty-collections-btn {
    width: 100%;
    max-width: 280px;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
