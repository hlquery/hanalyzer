<template>
  <div class="documents-view-container">
    <!-- Modern Header -->
    <div class="documents-header mb-6">
      <div class="documents-header-left">
        <v-btn
          icon
          variant="text"
          color="primary"
          size="small"
          @click="goBackToCollections"
          class="back-btn"
          title="Back to Collections"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="header-title-section">
          <h1 class="documents-title">Documents</h1>
          <p v-if="localSelectedCollection" class="documents-subtitle">{{ localSelectedCollection }}</p>
        </div>
      </div>
      <div class="documents-header-right">
        <v-select
          v-model="localSelectedCollection"
          :items="collectionItems"
          item-title="title"
          item-value="value"
          label="Collection"
          prepend-inner-icon="mdi-folder"
          variant="outlined"
          density="compact"
          class="collection-select"
          bg-color="white"
          hide-details
          :disabled="collectionItems.length === 0"
          @update:model-value="handleCollectionChange"
        ></v-select>
        <v-btn
          @click="loadDocuments"
          :disabled="loading || !localSelectedCollection"
          :loading="loading"
          prepend-icon="mdi-refresh"
          size="default"
          variant="flat"
          class="action-btn-blue"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="documents-search-container mb-6">
      <div class="google-search-wrapper">
        <v-icon class="google-search-icon" size="20">mdi-magnify</v-icon>
        <input
          v-model="filterQuery"
          type="text"
          class="google-search-input"
          placeholder="Filter documents..."
          @keyup.enter="applyFilter"
        />
        <v-btn
          v-if="filterQuery"
          icon
          variant="text"
          size="x-small"
          class="google-search-clear"
          @click="clearFilter"
        >
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6 modern-alert"
      closable
    >
      <div class="alert-title">Error Loading Documents</div>
      <div class="alert-message">{{ error }}</div>
    </v-alert>

    <!-- Empty States -->
    <v-card v-if="!localSelectedCollection" class="empty-state-card" elevation="0">
      <v-card-text class="text-center py-16">
        <v-icon size="64" color="#cbd5e1" class="empty-icon-animated" style="margin-bottom: 32px;">mdi-folder-open-outline</v-icon>
        <div class="empty-state-title">Please select a collection</div>
        <div class="empty-state-subtitle">Choose a collection from the dropdown above to view documents</div>
      </v-card-text>
    </v-card>

    <v-card v-else-if="!loading && documents.length === 0" class="empty-state-card" elevation="0">
      <v-card-text class="text-center py-16">
        <v-icon size="64" color="#cbd5e1" class="empty-icon-animated" style="margin-bottom: 32px;">mdi-file-document-outline</v-icon>
        <div class="empty-state-title">This collection is empty</div>
        <div class="empty-state-subtitle">
          No documents have been added to <span class="collection-name-badge">{{ localSelectedCollection }}</span> yet
        </div>
      </v-card-text>
    </v-card>

    <!-- No results from filter -->
    <v-card v-else-if="!loading && documents.length > 0 && filteredDocuments.length === 0" class="empty-state-card" elevation="0">
      <v-card-text class="text-center py-16">
        <v-icon size="64" color="#cbd5e1" class="empty-icon-animated" style="margin-bottom: 32px;">mdi-magnify</v-icon>
        <div class="empty-state-title">No matching documents</div>
        <div class="empty-state-subtitle">
          No documents match your search criteria "<span class="collection-name-badge">{{ filterQuery }}</span>"
        </div>
        <v-btn
          variant="text"
          color="primary"
          class="mt-4"
          @click="clearFilter"
        >
          Clear filter
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-else-if="loading" class="loading-indicator">
      <v-progress-circular indeterminate color="primary" size="20" width="2"></v-progress-circular>
    </div>

    <!-- Documents List -->
    <v-card v-else-if="filteredDocuments.length > 0" class="documents-card" elevation="0">
      <div class="documents-count-header">
        <v-icon size="16" color="#64748b" class="mr-2">mdi-file-document-outline</v-icon>
        <span class="count-text">{{ filteredDocuments.length }} {{ filteredDocuments.length === 1 ? 'document' : 'documents' }}</span>
        <span v-if="filterQuery && filteredDocuments.length !== documents.length" class="filter-info">
          (filtered from {{ documents.length }})
        </span>
      </div>
      <v-card-text class="pa-0">
        <div class="documents-list">
          <div
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="document-item"
            @click="viewDocument(doc.id)"
          >
            <div class="document-item-header">
              <div class="document-id-container">
                <span class="document-id-label">ID:</span>
                <span class="document-id-value">{{ doc.id }}</span>
              </div>
              <v-btn
                icon
                variant="text"
                size="x-small"
                @click.stop="viewDocument(doc.id)"
                color="primary"
                class="view-btn"
              >
                <v-icon size="18">mdi-open-in-new</v-icon>
              </v-btn>
            </div>
            <div class="document-item-fields">
              <div
                v-for="(value, key) in getDocumentPreviewFields(doc)"
                :key="key"
                class="field-row"
              >
                <span class="field-key">{{ key }}:</span>
                <span class="field-value">{{ formatFieldValue(value, key) }}</span>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Document Detail Dialog -->
    <v-dialog v-model="showDocumentDialog" max-width="900" persistent>
      <v-card elevation="4">
        <v-card-title class="d-flex justify-space-between align-center pa-4 bg-primary">
          <div class="d-flex align-center">
            <v-icon icon="mdi-file-document" color="white" class="mr-2"></v-icon>
            <span class="text-white font-weight-bold">Document Details</span>
          </div>
          <v-btn icon variant="text" @click="showDocumentDialog = false" color="white">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <pre class="document-json">{{ documentJson }}</pre>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-5">
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="showDocumentDialog = false" variant="flat">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useDocuments } from '../composables/useDocuments'

const props = defineProps({
  collections: {
    type: Array,
    default: () => []
  },
  selectedCollection: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:selected-collection', 'go-back'])

const baseUrl = inject('baseUrl')
const { documents, loading, error, loadDocuments, getDocument } = useDocuments(baseUrl)

const localSelectedCollection = ref(props.selectedCollection)
const showDocumentDialog = ref(false)
const documentJson = ref('')
const filterQuery = ref('')

// Filtered documents based on search query
const filteredDocuments = computed(() => {
  if (!filterQuery.value || filterQuery.value.trim() === '') {
    return documents.value
  }
  
  const query = filterQuery.value.toLowerCase().trim()
  return documents.value.filter(doc => {
    // Search in all fields
    return Object.entries(doc).some(([key, value]) => {
      const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return strValue.toLowerCase().includes(query) || key.toLowerCase().includes(query)
    })
  })
})

const applyFilter = () => {
  // Filter is applied reactively via computed
}

const clearFilter = () => {
  filterQuery.value = ''
}

const collectionItems = computed(() => {
  if (!props.collections || props.collections.length === 0) {
    return []
  }
  return props.collections.map(col => ({
    title: col.name || col,
    value: col.name || col
  }))
})

const handleCollectionChange = (value) => {
  localSelectedCollection.value = value
  emit('update:selected-collection', value)
  if (value) {
    loadDocuments(value)
  }
}

const viewDocument = async (docId) => {
  if (!localSelectedCollection.value) return
  
  try {
    const doc = await getDocument(localSelectedCollection.value, docId)
    documentJson.value = JSON.stringify(doc, null, 2)
    showDocumentDialog.value = true
  } catch (err) {
    alert(`Failed to load document: ${err.message}`)
  }
}

const goBackToCollections = () => {
  emit('go-back')
}

watch(() => props.selectedCollection, (newVal) => {
  localSelectedCollection.value = newVal
  if (newVal) {
    loadDocuments(newVal)
  }
})

watch(() => props.collections, (newCollections) => {
  // If collections are loaded and we don't have a selection, select the first one
  if (newCollections && newCollections.length > 0 && !localSelectedCollection.value) {
    localSelectedCollection.value = newCollections[0].name
    handleCollectionChange(newCollections[0].name)
  }
}, { immediate: true })

const isTimestamp = (value) => {
  if (typeof value === 'number') {
    // Check if it's a reasonable timestamp (milliseconds since epoch)
    return value > 0 && value < 9999999999999
  }
  if (typeof value === 'string') {
    // Check if it's a numeric string that could be a timestamp
    const num = Number(value)
    return !isNaN(num) && num > 0 && num < 9999999999999
  }
  return false
}

const formatDate = (value) => {
  if (!value && value !== 0) return ''
  try {
    let date
    
    if (typeof value === 'number') {
      date = value < 10000000000 
        ? new Date(value * 1000)
        : new Date(value)
    } else if (typeof value === 'string') {
      date = new Date(value)
      if (isNaN(date.getTime())) {
        const timestamp = parseFloat(value)
        if (!isNaN(timestamp) && isFinite(timestamp)) {
          date = timestamp < 10000000000 
            ? new Date(timestamp * 1000)
            : new Date(timestamp)
        }
      }
    } else {
      date = new Date(value)
    }
    
    if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
      return String(value)
    }
    
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
  } catch (e) {
    console.warn('Date formatting error:', e, value)
    return String(value)
  }
}

const getFullTimestamp = (value) => {
  try {
    const timestamp = typeof value === 'string' ? Number(value) : value
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      return String(value)
    }
    return date.toISOString()
  } catch (e) {
    return String(value)
  }
}

const getDocumentPreviewFields = (doc) => {
  // Get first 5 fields (excluding id) for preview
  const fields = {}
  let count = 0
  const maxFields = 5
  
  for (const [key, value] of Object.entries(doc)) {
    if (key !== 'id' && count < maxFields) {
      fields[key] = value
      count++
    }
  }
  
  return fields
}

const formatFieldValue = (value, key) => {
  // Format timestamp fields
  if ((key === 'created' || key === 'created_at' || key === 'date' || key === 'timestamp') && isTimestamp(value)) {
    return formatDate(value)
  }
  
  // Truncate long strings
  if (typeof value === 'string' && value.length > 500) {
    return value.substring(0, 500) + '...'
  }
  
  // Format objects
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value).substring(0, 500) + '...'
  }
  
  return value
}

onMounted(() => {
  // If we have a selected collection from props, load it
  if (localSelectedCollection.value) {
    loadDocuments(localSelectedCollection.value)
  } else if (props.collections && props.collections.length > 0) {
    // Otherwise, select the first collection
    localSelectedCollection.value = props.collections[0].name
    handleCollectionChange(props.collections[0].name)
  }
})
</script>

<style scoped>
.documents-view-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Header Styles */
.documents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 24px 0;
  flex-wrap: wrap;
}

.documents-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.documents-title {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 28px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.02em;
}

.documents-subtitle {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
  margin: 0;
}

.documents-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collection-select {
  min-width: 220px;
}

.back-btn {
  border-radius: 8px !important;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background-color: rgba(25, 118, 210, 0.08) !important;
}

/* Alert Styles */
.modern-alert {
  border-radius: 12px !important;
  border-left: 4px solid #ef4444 !important;
}

.alert-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.alert-message {
  font-size: 14px;
  opacity: 0.9;
}

/* Empty State Styles */
.empty-state-card {
  border: 1px solid #e2e8f0 !important;
  border-radius: 16px !important;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
}

.empty-icon {
  opacity: 0.5;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.3; }
}

.empty-state-title {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 20px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.empty-state-subtitle {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #94a3b8;
}

.collection-name-badge {
  background: #e0f2fe;
  color: #0369a1;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
}

/* Loading State */
.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
}

/* Documents Card */
.documents-card {
  border: 1px solid #e2e8f0 !important;
  border-radius: 16px !important;
  background: #ffffff !important;
  overflow: hidden;
}

.documents-count-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.count-text {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

/* Documents List */
.documents-list {
  padding: 0;
}

.document-item {
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
}

.document-item:hover {
  background: #f8fafc;
  transform: translateX(4px);
}

.document-item:last-child {
  border-bottom: none;
}

.document-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.document-id-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.document-id-label {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.document-id-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #0369a1;
  background: #e0f2fe;
  padding: 4px 10px;
  border-radius: 6px;
}

.view-btn {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.document-item:hover .view-btn {
  opacity: 1;
}

.document-item-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.field-key {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  min-width: 120px;
  flex-shrink: 0;
}

.field-value {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
  line-height: 1.6;
  word-break: break-word;
}

/* Dialog Styles */
.document-json {
  background: #1e293b;
  color: #e2e8f0;
  padding: 24px;
  margin: 0;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.8;
  max-height: 600px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  border-top: 1px solid #334155;
  border-bottom: 1px solid #334155;
}

/* Action button styles */
.action-btn-blue {
  border-radius: 999px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 1 !important;
  color: #ffffff !important;
  height: 36px !important;
  padding: 0 16px !important;
  text-transform: none !important;
  box-shadow: none !important;
  background: #1976d2 !important;
  border: none !important;
  letter-spacing: normal !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.action-btn-blue:hover {
  background: #1565c0 !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3) !important;
}

.action-btn-blue :deep(.v-btn__content) {
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100% !important;
  line-height: 1 !important;
  padding: 0 !important;
  margin: 0 !important;
}

.action-btn-blue :deep(.v-icon) {
  color: #ffffff !important;
}

/* Search Bar Styles */
.documents-search-container {
  max-width: 600px;
}

.google-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  background: #f1f3f4;
  border: 1px solid #f1f3f4;
  border-radius: 24px;
  padding: 8px 16px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.google-search-wrapper:hover {
  background: #e8eaed;
  border-color: #e8eaed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.google-search-wrapper:focus-within {
  background: #ffffff;
  border-color: #dfe1e5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.google-search-icon {
  margin-right: 12px;
  opacity: 0.6;
  flex-shrink: 0;
}

.google-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: #202124;
  padding: 4px 0;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
}

.google-search-input::placeholder {
  color: #9aa0a6;
}

.google-search-clear {
  margin-left: 12px;
  opacity: 0.6;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}

.google-search-clear:hover {
  opacity: 1;
}

.filter-info {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 13px;
  color: #94a3b8;
  margin-left: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .documents-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .documents-header-right {
    width: 100%;
    flex-direction: column;
  }
  
  .collection-select {
    width: 100%;
    min-width: unset;
  }
  
  .documents-search-container {
    max-width: 100%;
  }
}
</style>
