<template>
  <div class="document-detail-view">
    <!-- Header - Compact with collection and doc name on same line -->
    <div class="document-header">
      <div class="document-title-section">
        <h1 class="document-title-text">
          <span class="collection-link-wrapper">
            <v-icon size="18" class="collection-icon">mdi-folder</v-icon>
            <v-btn
              variant="text"
              size="small"
              @click="goToCollection"
              class="collection-link-btn"
            >
              <span class="collection-name-text">{{ collectionName }}</span>
            </v-btn>
          </span>
          <span class="title-separator" aria-hidden="true">/</span>
          <span class="doc-name">{{ documentId || 'Document' }}</span>
        </h1>
        <div class="document-subtitle-line">
          <span class="document-subtitle-label">Document ID</span>
          <span class="document-subtitle-id">{{ documentId || 'Document' }}</span>
        </div>
        <div v-if="document && !loading" class="fields-count-header">
          <v-icon size="14" class="mr-2">mdi-information-outline</v-icon>
          <span>{{ Object.keys(document).length }} {{ Object.keys(document).length === 1 ? 'field' : 'fields' }}</span>
        </div>
      </div>
      <div class="document-header-actions">
        <v-btn
          variant="flat"
          size="small"
          @click="viewMode = 'table'"
          prepend-icon="mdi-view-list"
          class="collections-action-btn"
          :class="{ 'view-mode-btn-active': viewMode === 'table' }"
        >
          Fields
        </v-btn>
        <v-btn
          variant="flat"
          size="small"
          @click="viewMode = 'json'"
          prepend-icon="mdi-code-json"
          class="collections-action-btn"
          :class="{ 'view-mode-btn-active': viewMode === 'json' }"
        >
          JSON
        </v-btn>
        <v-btn
          variant="flat"
          size="small"
          @click="confirmDelete"
          prepend-icon="mdi-delete"
          class="delete-action-btn"
        >
          Delete
        </v-btn>
      </div>
    </div>

    <!-- Loading -->
    <v-card v-if="loading" class="loading-state mb-card">
      <v-card-text class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" width="6" class="mb-4"></v-progress-circular>
        <div class="text-h6 text-grey-darken-1 font-weight-medium">Loading document...</div>
        <div class="text-body-2 text-grey-darken-1 mt-2">Please wait while we fetch the data</div>
      </v-card-text>
    </v-card>

    <!-- Error -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      <div class="font-weight-bold mb-1">Error Loading Document</div>
      {{ error }}
    </v-alert>

    <!-- Document Content -->
    <v-card v-if="document && !loading" class="document-card-modern">
      <div v-if="viewMode === 'table'" class="fields-table-container">
        <table class="fields-table">
          <thead>
            <tr>
              <th class="field-name-col" @click="toggleSort('field')">
                <div class="sortable-header">
                  Field
                  <div class="sort-icon-container">
                    <v-icon 
                      v-if="sortBy === 'field' && sortOrder === 'asc'"
                      icon="mdi-arrow-up" 
                      size="14" 
                      class="sort-icon sort-icon-active"
                    ></v-icon>
                    <v-icon 
                      v-else-if="sortBy === 'field' && sortOrder === 'desc'"
                      icon="mdi-arrow-down" 
                      size="14" 
                      class="sort-icon sort-icon-active"
                    ></v-icon>
                    <v-icon 
                      v-else
                      icon="mdi-swap-vertical" 
                      size="14" 
                      class="sort-icon sort-icon-inactive"
                    ></v-icon>
                  </div>
                </div>
              </th>
              <th class="field-value-col" @click="toggleSort('value')">
                <div class="sortable-header">
                  Value
                  <div class="sort-icon-container">
                    <v-icon 
                      v-if="sortBy === 'value' && sortOrder === 'asc'"
                      icon="mdi-arrow-up" 
                      size="14" 
                      class="sort-icon sort-icon-active"
                    ></v-icon>
                    <v-icon 
                      v-else-if="sortBy === 'value' && sortOrder === 'desc'"
                      icon="mdi-arrow-down" 
                      size="14" 
                      class="sort-icon sort-icon-active"
                    ></v-icon>
                    <v-icon 
                      v-else
                      icon="mdi-swap-vertical" 
                      size="14" 
                      class="sort-icon sort-icon-inactive"
                    ></v-icon>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(value, key) in sortedFields" 
              :key="key" 
              class="field-row"
            >
              <td class="field-name-cell">
                <div class="field-name-wrapper">
                  <span class="field-label">{{ key }}</span>
                  <div class="field-type-wrapper">
                    <v-chip 
                      size="x-small" 
                      :color="getFieldTypeColor(value)" 
                      variant="flat" 
                      class="field-type-badge"
                    >
                      {{ getFieldType(value) }}
                    </v-chip>
                  </div>
                </div>
              </td>
              <td class="field-value-cell">
                <pre v-if="typeof value === 'object'" class="field-json">{{ JSON.stringify(value, null, 2) }}</pre>
                <template v-else-if="isDateField(key, value)">
                  <div class="field-date">
                    <div class="date-display">{{ formatDate(value) }}</div>
                    <div class="date-raw-text">{{ value }}</div>
                  </div>
                </template>
                <span v-else class="field-text">{{ value }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-else-if="viewMode === 'json'" class="json-editor-wrapper-modern">
        <JsonEditor
          :model-value="document"
          :readonly="true"
          title="Document JSON"
        />
      </div>
    </v-card>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="560"
      persistent
      class="delete-document-dialog"
    >
      <v-card class="delete-dialog-card" elevation="0">
        <v-card-title class="delete-dialog-header-modern">
          <div class="delete-dialog-icon-wrapper-modern">
            <v-icon icon="mdi-alert-circle" size="32" color="#ef4444"></v-icon>
          </div>
          <div class="delete-dialog-title-content-modern">
            <div class="delete-dialog-title-modern">Delete Document</div>
            <div class="delete-dialog-subtitle-modern">This action cannot be undone</div>
          </div>
        </v-card-title>
        <v-card-text class="delete-dialog-content-modern">
          <div class="delete-warning-text-modern">
            The document will be permanently deleted from the collection. This action cannot be reversed.
          </div>
          <v-card variant="outlined" class="delete-info-card-modern">
            <div class="delete-info-row-modern">
              <div class="delete-info-label-modern">
                <v-icon size="16" class="mr-1">mdi-folder</v-icon>
                Collection
              </div>
              <div class="delete-info-value-modern">{{ collectionName || 'N/A' }}</div>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="delete-info-row-modern">
              <div class="delete-info-label-modern">
                <v-icon size="16" class="mr-1">mdi-file-document</v-icon>
                Document ID
              </div>
              <div class="delete-info-value-modern">{{ documentId || 'N/A' }}</div>
            </div>
          </v-card>
          <v-alert
            v-if="deleteError"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
            @click:close="deleteError = null"
            density="compact"
          >
            <div class="font-weight-bold mb-1">Delete Failed</div>
            <div>{{ deleteError }}</div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="delete-dialog-actions-modern">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="showDeleteDialog = false"
            :disabled="deleting"
            size="default"
            class="delete-cancel-btn-modern"
          >
            Cancel
          </v-btn>
          <v-btn
            variant="flat"
            @click="handleDelete"
            :loading="deleting"
            prepend-icon="mdi-delete"
            size="default"
            class="delete-confirm-btn-modern"
            color="error"
          >
            Delete Document
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDocuments } from '../composables/useDocuments'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import JsonEditor from '../components/JsonEditor.vue'

const router = useRouter()
const route = useRoute()
const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })
const { getDocument, deleteDocument } = useDocuments(baseUrl)

const collectionName = ref('')
const documentId = ref('')
const document = ref(null)
const loading = ref(true)
const error = ref(null)
const showDeleteDialog = ref(false)
const deleting = ref(false)
const deleteError = ref(null)
const viewMode = ref('table')
const sortBy = ref(null) // 'field' or 'value'
const sortOrder = ref('asc') // 'asc' or 'desc'

// Check if a field is a date field
const isDateField = (key, value) => {
  if (!value || typeof value !== 'string') return false
  
  // Check if the key suggests it's a date field
  const dateFieldNames = ['created_at', 'created', 'updated_at', 'updated', 'date', 'timestamp', 'time']
  const isDateFieldName = dateFieldNames.some(name => key.toLowerCase().includes(name))
  
  if (!isDateFieldName) return false
  
  // Try to parse as date
  const date = new Date(value)
  return !isNaN(date.getTime())
}

// Format date for display - improved version
const formatDate = (dateString) => {
  if (!dateString && dateString !== 0) return ''
  
  try {
    let date
    
    if (typeof dateString === 'number') {
      date = dateString < 10000000000 
        ? new Date(dateString * 1000)
        : new Date(dateString)
    } else if (typeof dateString === 'string') {
      date = new Date(dateString)
      if (isNaN(date.getTime())) {
        const timestamp = parseFloat(dateString)
        if (!isNaN(timestamp) && isFinite(timestamp)) {
          date = timestamp < 10000000000 
            ? new Date(timestamp * 1000)
            : new Date(timestamp)
        }
      }
    } else {
      date = new Date(dateString)
    }
    
    if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
      return String(dateString)
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
  } catch (err) {
    console.warn('Date formatting error:', err, dateString)
    return String(dateString)
  }
}

const goBack = () => {
  router.back()
}

const goToCollection = () => {
  if (!collectionName.value) {
    router.push('/collections').catch(() => {})
    return
  }
  
  try {
    const encodedName = encodeURIComponent(collectionName.value)
    const path = `/collections/${encodedName}`
    router.push({ path: path }).catch(err => {
      // Ignore navigation errors
      if (err.name !== 'NavigationDuplicated' && !err.message?.includes('Avoided redundant navigation')) {
        console.error('Navigation error:', err)
      }
    })
  } catch (err) {
    console.error('Error navigating to collection:', err, 'Collection name:', collectionName.value)
  }
}

const getFieldType = (value) => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'string'
}

const getFieldTypeColor = (value) => {
  const type = getFieldType(value)
  const colors = {
    string: 'primary',
    number: 'success',
    boolean: 'warning',
    object: 'info',
    array: 'purple',
    null: 'grey'
  }
  return colors[type] || 'grey'
}

const copyFieldValue = async (key, value) => {
  try {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${key} to clipboard`, 'Copied')
  } catch (e) {
    console.error('Failed to copy:', e)
    toast.error('Failed to copy to clipboard', 'Error')
  }
}

const toggleSort = (column) => {
  if (sortBy.value === column) {
    // Toggle order if same column
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New column, start with ascending
    sortBy.value = column
    sortOrder.value = 'asc'
  }
}

const sortedFields = computed(() => {
  if (!document.value || !sortBy.value) {
    return document.value || {}
  }
  
  const entries = Object.entries(document.value)
  
  entries.sort((a, b) => {
    const [keyA, valueA] = a
    const [keyB, valueB] = b
    
    if (sortBy.value === 'field') {
      const comparison = keyA.localeCompare(keyB)
      return sortOrder.value === 'asc' ? comparison : -comparison
    } else {
      // Sort by value
      const strA = typeof valueA === 'object' ? JSON.stringify(valueA) : String(valueA)
      const strB = typeof valueB === 'object' ? JSON.stringify(valueB) : String(valueB)
      const comparison = strA.localeCompare(strB)
      return sortOrder.value === 'asc' ? comparison : -comparison
    }
  })
  
  return Object.fromEntries(entries)
})

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'escape',
    handler: () => {
      if (showDeleteDialog.value) {
        showDeleteDialog.value = false
      } else {
        goBack()
      }
    }
  },
  {
    key: 'ctrl+c',
    handler: (e) => {
      // Check for text selection BEFORE doing anything
      // This allows normal copy behavior when user selects text
      const selection = window.getSelection()
      const hasSelection = selection && selection.toString().trim().length > 0
      
      // If text is selected OR user is in input/textarea, don't interfere
      // The useKeyboardShortcuts composable already checks this, but double-check here
      if (hasSelection || e.target.matches('input, textarea, [contenteditable="true"]')) {
        // Let default browser copy behavior work - don't do anything
        return
      }
      
      // Only copy entire document if no text is selected and not in input/textarea
      if (document.value) {
        const json = JSON.stringify(document.value, null, 2)
        navigator.clipboard.writeText(json).then(() => {
          toast.success('Document copied to clipboard', 'Copied')
        }).catch(() => {
          toast.error('Failed to copy document', 'Error')
        })
      }
    }
  }
])

const confirmDelete = () => {
  showDeleteDialog.value = true
  deleteError.value = null
}

const handleDelete = async () => {
  deleting.value = true
  deleteError.value = null
  
  try {
    await deleteDocument(collectionName.value, documentId.value)
    toast.success(`Document "${documentId.value}" deleted successfully`, 'Deleted')
    // Navigate back to collection after successful deletion
    router.push({
      name: 'collection-documents',
      params: {
        name: collectionName.value
      }
    }).catch(err => {
      // Ignore navigation errors
      if (err.name !== 'NavigationDuplicated' && !err.message?.includes('Avoided redundant navigation')) {
        console.error('Navigation error:', err)
      }
    })
  } catch (err) {
    deleteError.value = err.message || 'Failed to delete document'
    toast.error(deleteError.value, 'Delete Failed')
  } finally {
    deleting.value = false
  }
}

// Update favicon for collection
const updateFavicon = (collectionName) => {
  if (!collectionName || typeof window === 'undefined' || !window.document) return
  
  try {
    let link = window.document.querySelector("link[rel~='icon']")
    if (!link) {
      link = window.document.createElement('link')
      link.rel = 'icon'
      window.document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = '/collection-favicon.svg'
  } catch (e) {
    console.warn('Failed to update favicon:', e)
  }
}

onMounted(async () => {
  collectionName.value = decodeURIComponent(route.params.name || '')
  documentId.value = decodeURIComponent(route.params.docId || '')
  
  // Update favicon for collection
  updateFavicon(collectionName.value)
  
  if (!collectionName.value || !documentId.value) {
    error.value = 'Missing collection name or document ID'
    loading.value = false
    return
  }
  
  try {
    document.value = await getDocument(collectionName.value, documentId.value)
  } catch (err) {
    error.value = err.message || 'Failed to load document'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.document-detail-view {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header - Compact with collection and doc on same line */
.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 24px;
}

.document-title-section {
  flex: 1;
  min-width: 0;
}

.document-title-text {
  font-size: 18px;
  font-weight: 700;
  color: #000000 !important;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.3;
  font-family: Inter, Helvetica, sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.collection-link-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transform: none !important;
}

.collection-icon {
  color: #1976d2 !important;
  flex-shrink: 0;
  text-decoration: none !important;
  pointer-events: none;
  transform: none !important;
}

.collection-link-wrapper:hover .collection-icon {
  color: #1565c0 !important;
  transform: none !important;
}

.collection-link-btn {
  font-size: 18px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  color: #1976d2 !important;
  padding: 0 !important;
  min-width: auto !important;
  height: auto !important;
  transition: color 0.2s ease, text-decoration 0.2s ease !important;
  background: transparent !important;
  background-color: transparent !important;
  text-decoration: none !important;
  display: inline-flex !important;
  align-items: center !important;
  transform: none !important;
  box-shadow: none !important;
  border: none !important;
}

.collection-link-btn :deep(.v-btn__overlay) {
  display: none !important;
  opacity: 0 !important;
  background: transparent !important;
}

.collection-link-btn:hover {
  color: #1565c0 !important;
  text-decoration: underline !important;
  background: transparent !important;
  background-color: transparent !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  transform: none !important;
  box-shadow: none !important;
  border: none !important;
}

.collection-link-btn:hover :deep(.v-btn__overlay) {
  display: none !important;
  opacity: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
}

.collection-link-btn :deep(.v-ripple__container) {
  display: none !important;
}

.collection-name-text {
  text-decoration: none !important;
  display: inline-block !important;
}

.title-separator {
  color: #cbd5e1;
  font-weight: 700;
  margin: 0 6px;
  font-size: 18px;
}

.doc-name {
  color: #000000 !important;
  font-weight: 700;
  font-size: 18px;
  word-break: break-word;
}

.document-subtitle-line {
  display: none;
}

.document-header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  align-items: center;
  padding-top: 4px;
}

@media (max-width: 700px) {
  .document-header {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .document-title-section {
    width: 100%;
  }

  .document-title-text {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    min-width: 0;
  }

  .collection-link-wrapper {
    min-width: 0;
    flex: 1 1 auto;
    width: 100%;
    padding-left: 26px;
    box-sizing: border-box;
  }

  .collection-link-btn {
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .collection-name-text {
    display: inline-block !important;
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .title-separator,
  .doc-name {
    display: none;
  }

  .document-subtitle-line {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 6px;
    padding-left: 26px;
    min-width: 0;
  }

  .document-subtitle-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #0f172a;
    line-height: 1.3;
  }

  .document-subtitle-id {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
    color: #0f172a;
    word-break: break-word;
  }

  .fields-count-header {
    margin-top: 10px;
    padding-left: 26px;
  }

  .document-header-actions {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: stretch;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 0;
  }

  .document-header-actions .collections-action-btn,
  .document-header-actions .delete-action-btn {
    flex: 0 1 auto !important;
    width: auto !important;
    min-width: 0 !important;
  }

  .document-header-actions .collections-action-btn :deep(.v-btn__content),
  .document-header-actions .delete-action-btn :deep(.v-btn__content) {
    white-space: nowrap !important;
  }
}

/* Delete Action Button - Red 3D version like before */
.delete-action-btn {
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
  gap: 6px !important;
  
  /* 3D gradient background with red colors */
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
  
  /* Multi-layer 3D shadow effect - raised appearance */
  box-shadow: 
    0 4px 8px rgba(220, 38, 38, 0.4),
    0 2px 4px rgba(220, 38, 38, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  
  /* Slight 3D transform */
  transform: perspective(1000px) translateZ(0) !important;
}

.delete-action-btn::before {
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

.delete-action-btn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
  box-shadow: 
    0 6px 12px rgba(220, 38, 38, 0.5),
    0 3px 6px rgba(220, 38, 38, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateY(-1px) translateZ(0) !important;
  color: #ffffff !important;
}

.delete-action-btn:hover::before {
  opacity: 1 !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 50%) !important;
}

.delete-action-btn:active {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow: 
    0 2px 4px rgba(220, 38, 38, 0.4),
    0 1px 2px rgba(220, 38, 38, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.delete-action-btn:active::before {
  opacity: 0.5 !important;
}

.delete-action-btn :deep(.v-btn__content) {
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
}

.delete-action-btn :deep(.v-icon) {
  color: #ffffff !important;
  display: inline-flex !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

.delete-action-btn :deep(.v-btn__overlay) {
  display: none !important;
}

.delete-action-btn :deep(.v-btn__wrapper) {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.delete-btn-centered {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
}

.delete-btn-centered :deep(.v-btn__content) {
  justify-content: center !important;
  align-items: center !important;
  width: 100% !important;
  display: flex !important;
  gap: 6px !important;
}

.delete-action-btn.delete-btn-centered :deep(.v-btn__content) {
  justify-content: center !important;
  align-items: center !important;
  gap: 6px !important;
}

/* Document Card */
.document-card-modern {
  border-radius: 16px !important;
  border: 1px solid #e2e8f0 !important;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
  background: #ffffff !important;
}

/* View Mode Buttons - Consistent with Delete */
/* Collections action buttons style - Same as CollectionDocumentsView */
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

.collections-action-btn :deep(.v-btn__content) {
  position: relative !important;
  z-index: 1 !important;
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  margin-right: 6px !important;
}

.collections-action-btn :deep(.v-btn__prepend .v-icon),
.collections-action-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
}

.view-mode-btn-active {
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
}

/* Fields Table - 2 Column Layout */
.fields-table-container {
  padding: 0;
  overflow-x: auto;
  border-radius: 16px 16px 0 0;
}

.fields-table {
  transform: none !important;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #ffffff;
}

.fields-table thead {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  position: sticky;
  top: 0;
  z-index: 1;
}

.fields-table th {
  color: #ffffff !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 12px 20px !important;
  text-align: left !important;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
}

.sortable-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.sortable-header:hover {
  color: rgba(255, 255, 255, 0.92);
}

.sort-icons {
  display: flex;
  flex-direction: column;
  gap: 0;
  opacity: 0.4;
  transition: opacity 0.2s ease;
}

.sortable-header:hover .sort-icons {
  opacity: 0.7;
}

.sort-icon {
  line-height: 1;
  color: #64748b;
  transition: color 0.2s ease;
}

.sort-icon.active {
  color: #e2e8f0;
  opacity: 1;
}

.sortable-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.sort-icon-container {
  display: flex !important;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  min-width: 24px;
  opacity: 1 !important;
}

.sort-icon {
  transition: all 0.2s ease !important;
  opacity: 1 !important;
}

.sort-icon-active {
  color: #64748b !important;
  opacity: 1 !important;
  font-weight: bold !important;
}

.sort-icon-inactive {
  color: #64748b !important;
  opacity: 0.6 !important;
  transition: all 0.2s ease !important;
}

.sortable-header:hover .sort-icon-inactive {
  color: #cbd5e1 !important;
  opacity: 0.9 !important;
  transform: scale(1.1) !important;
}

.sortable-header:active .sort-icon {
  transform: scale(0.95) !important;
}

.field-name-col,
.field-value-col {
  cursor: pointer;
  user-select: none;
}

.field-name-col:hover,
.field-value-col:hover {
  background-color: #f8fafc;
  transform: none !important;
}

.field-name-col {
  width: 35%;
  min-width: 200px;
}

.field-value-col {
  width: 65%;
}

.fields-table tbody tr {
  transition: background-color 0.15s ease !important;
  border-bottom: 1px solid #f1f5f9;
  transform: none !important;
}

.fields-table tbody tr:hover {
  background: #f8fafc !important;
  transform: none !important;
  box-shadow: none !important;
}

.fields-table tbody tr:nth-child(even) {
  background: #fafbfc;
  transform: none !important;
}

.fields-table tbody tr:nth-child(even):hover {
  background: #f1f5f9 !important;
  transform: none !important;
  box-shadow: none !important;
}

.field-name-cell {
  padding: 14px 20px !important;
  vertical-align: top !important;
  background: inherit;
  border-right: 1px solid #f1f5f9;
}

.field-value-cell {
  padding: 14px 20px !important;
  vertical-align: top !important;
  background: inherit;
  text-align: left !important;
}

.field-name-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.field-type-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  width: auto;
  justify-content: flex-start;
  margin-left: -4px;
}

.field-label {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Consolas', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
}

.field-type-badge {
  font-size: 9px !important;
  font-weight: 600 !important;
  height: 18px !important;
  padding: 0 5px !important;
  flex-shrink: 0;
  margin: 0 !important;
}

.field-copy-btn {
  opacity: 0.4;
  transition: opacity 0.2s ease;
  color: #64748b !important;
  margin-left: auto;
}

.fields-table tbody tr:hover .field-copy-btn {
  opacity: 0.8;
}

.field-text {
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  word-break: break-word;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  text-align: left;
  display: block;
}

.field-json {
  margin: 0;
  padding: 12px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 6px;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  overflow-x: auto;
  max-width: 100%;
  text-align: left;
}

.field-date {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.date-display {
  font-weight: 500;
  color: #0f172a;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.date-raw-text {
  font-size: 11px;
  color: #64748b;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

/* Fields Count in Header */
.fields-count-header {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
}

.fields-count-header :deep(.v-icon) {
  color: #0f172a !important;
}

.json-editor-wrapper-modern {
  padding: 24px;
}

/* Delete Document Dialog - Consistent Styling */
.delete-document-dialog :deep(.v-overlay__content) {
  border-radius: 16px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.delete-document-dialog :deep(.v-overlay__scrim) {
  background: rgba(15, 23, 42, 0.45) !important;
  backdrop-filter: blur(4px) !important;
}

.delete-dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.delete-dialog-header-modern {
  background: #ffffff !important;
  padding: 20px 24px !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  border-bottom: 1px solid #e5e7eb !important;
}

.delete-dialog-icon-wrapper-modern {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #fef2f2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid #fee2e2;
}

.delete-dialog-title-content-modern {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.delete-dialog-title-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 700 !important;
  font-size: 18px !important;
  line-height: 1.35 !important;
  color: #111827 !important;
  letter-spacing: -0.01em !important;
}

.delete-dialog-subtitle-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
  color: #6b7280 !important;
}

.delete-dialog-content-modern {
  padding: 20px 24px !important;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%) !important;
}

.delete-warning-text-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  color: #4b5563 !important;
  margin-bottom: 16px;
}

.delete-info-card-modern {
  background: linear-gradient(180deg, #fbfcfe 0%, #f8fafc 100%) !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 10px !important;
  padding: 16px !important;
  margin-bottom: 0 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.delete-info-row-modern {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delete-info-label-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: #6b7280 !important;
  display: flex;
  align-items: center;
}

.delete-info-value-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  line-height: 1.5 !important;
  color: #111827 !important;
  word-break: break-word;
}

.delete-dialog-actions-modern {
  padding: 16px 24px !important;
  background: #f9fafb !important;
  border-top: 1px solid #e5e7eb !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  justify-content: flex-end !important;
}

.delete-cancel-btn-modern {
  color: #6b7280 !important;
  font-weight: 600 !important;
  text-transform: none !important;
  padding: 0 20px !important;
}

.delete-cancel-btn-modern:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.delete-confirm-btn-modern {
  background: #ef4444 !important;
  background-color: #ef4444 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  text-transform: none !important;
  padding: 0 24px !important;
  border-radius: 10px !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}

.delete-confirm-btn-modern :deep(.v-btn__overlay) {
  background: transparent !important;
}

.delete-confirm-btn-modern :deep(.v-btn__loader) {
  color: #ffffff !important;
}

.delete-confirm-btn-modern :deep(.v-btn__prepend .v-icon),
.delete-confirm-btn-modern :deep(.v-btn__prepend-inner .v-icon) {
  color: #ffffff !important;
}

.delete-confirm-btn-modern:hover {
  background: #dc2626 !important;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.22) !important;
  color: #ffffff !important;
}

.delete-confirm-btn-modern:active {
  background: #b91c1c !important;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.24) !important;
  color: #ffffff !important;
}
</style>
