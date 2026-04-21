<template>
  <div class="collection-schema-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <div>
          <h1 class="collections-title-text">Collection Schema</h1>
          <button
            v-if="collectionName"
            type="button"
            class="collections-pagination-info-top schema-collection-link"
            @click="goBack"
          >
            <v-icon size="14" class="mr-2" style="opacity: 0.7;">mdi-folder</v-icon>
            {{ collectionName }}
          </button>
        </div>
      </div>
      <div class="collections-header-actions">
        <v-btn
          @click="goBack"
          variant="flat"
          size="small"
          prepend-icon="mdi-folder"
          class="collections-action-btn back-btn"
        >
          Collections
        </v-btn>
        <v-btn
          @click="openDeleteDialog"
          variant="flat"
          size="small"
          prepend-icon="mdi-delete"
          class="collections-action-btn delete-collection-btn"
        >
          Delete Collection
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="schemaLoading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <div class="mt-6 text-h6">Loading schema...</div>
    </div>

    <!-- Error State -->
    <v-alert
      v-else-if="schemaError"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="schemaError = null"
      elevation="1"
      icon="mdi-alert-circle"
    >
      <div class="text-h6 mb-2 font-weight-bold">Error Loading Schema</div>
      <div class="mb-2">{{ schemaError }}</div>
      <v-btn
        variant="outlined"
        size="default"
        prepend-icon="mdi-refresh"
        @click="loadSchema"
        class="unified-btn unified-btn-primary mt-3"
      >
        Retry
      </v-btn>
    </v-alert>

    <!-- Schema Content -->
    <div v-else-if="collectionSchema">
      <v-row>
        <v-col cols="12">
          <!-- Collection Info -->
          <v-card class="mb-4 collection-info-card">
            <v-card-title class="schema-section-title">
              <v-icon icon="mdi-folder" class="mr-2" size="20"></v-icon>
              Collection Information
            </v-card-title>
            <v-card-text>
              <div class="schema-info-grid">
                <div class="schema-info-item" v-if="collectionSchema.size_bytes !== undefined">
                  <div class="schema-info-label">
                    <v-icon icon="mdi-database" size="16" class="mr-1"></v-icon>
                    Database Size
                  </div>
                  <div class="schema-info-value">{{ formatBytes(collectionSchema.size_bytes) }}</div>
                </div>
                
                <div class="schema-info-item" v-if="collectionSchema.num_documents !== undefined">
                  <div class="schema-info-label">
                    <v-icon icon="mdi-file-document-multiple" size="16" class="mr-1"></v-icon>
                    Total Documents
                  </div>
                  <div class="schema-info-value">{{ formatNumber(collectionSchema.num_documents) }}</div>
                </div>
                
                <div class="schema-info-item" v-if="collectionSchema.created_at">
                  <div class="schema-info-label">
                    <v-icon icon="mdi-calendar-plus" size="16" class="mr-1"></v-icon>
                    Created At
                  </div>
                  <div class="schema-info-value">{{ formatDate(collectionSchema.created_at) }}</div>
                </div>
                
                <div class="schema-info-item" v-if="collectionSchema.updated_at">
                  <div class="schema-info-label">
                    <v-icon icon="mdi-calendar-edit" size="16" class="mr-1"></v-icon>
                    Last Updated
                  </div>
                  <div class="schema-info-value">{{ formatDate(collectionSchema.updated_at) }}</div>
                </div>
                
                <div class="schema-info-item" v-if="collectionSchema.fields && collectionSchema.fields.length > 0">
                  <div class="schema-info-label">
                    <v-icon icon="mdi-database" size="16" class="mr-1"></v-icon>
                    Total Fields
                  </div>
                  <div class="schema-info-value">{{ collectionSchema.fields.length }}</div>
                </div>
                
                <div class="schema-info-item" v-if="collectionSchema.searchable_fields && collectionSchema.searchable_fields.length > 0">
                  <div class="schema-info-label">
                    <v-icon icon="mdi-text-search" size="16" class="mr-1"></v-icon>
                    Searchable Fields
                  </div>
                  <div class="schema-info-value">{{ collectionSchema.searchable_fields.length }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Fields Schema -->
          <v-card class="mb-4" v-if="collectionSchema.fields && collectionSchema.fields.length > 0">
            <v-card-title class="schema-section-title">
              <v-icon icon="mdi-database" class="mr-2" size="20"></v-icon>
              Fields ({{ collectionSchema.fields.length }})
            </v-card-title>
            <v-card-text>
              <div class="schema-fields-list">
                <v-card
                  v-for="(field, fieldIndex) in collectionSchema.fields"
                  :key="fieldIndex"
                  variant="outlined"
                  class="schema-field-card mb-3"
                >
                  <v-card-text class="pa-4">
                    <div class="d-flex align-center justify-space-between mb-3">
                      <div class="d-flex align-center" style="gap: 12px;">
                        <div class="schema-field-number">{{ fieldIndex + 1 }}</div>
                        <div>
                          <div class="schema-field-name">{{ typeof field === 'object' ? field.name : field }}</div>
                          <div class="schema-field-type" v-if="typeof field === 'object' && field.type">
                            Type: {{ field.type }}
                          </div>
                        </div>
                      </div>
                      <div class="schema-field-badges">
                        <v-chip
                          v-if="typeof field === 'object' && field.index"
                          size="small"
                          color="success"
                          variant="flat"
                          class="mr-1"
                        >
                          <v-icon start size="14">mdi-magnify</v-icon>
                          Index
                        </v-chip>
                        <v-chip
                          v-if="typeof field === 'object' && field.facet"
                          size="small"
                          color="info"
                          variant="flat"
                          class="mr-1"
                        >
                          <v-icon start size="14">mdi-filter</v-icon>
                          Facet
                        </v-chip>
                        <v-chip
                          v-if="typeof field === 'object' && field.sort"
                          size="small"
                          color="warning"
                          variant="flat"
                        >
                          <v-icon start size="14">mdi-sort</v-icon>
                          Sort
                        </v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-card-text>
          </v-card>

          <!-- Searchable Fields -->
          <v-card class="mb-4" v-if="collectionSchema.searchable_fields && collectionSchema.searchable_fields.length > 0">
            <v-card-title class="schema-section-title">
              <v-icon icon="mdi-text-search" class="mr-2" size="20"></v-icon>
              Searchable Fields
            </v-card-title>
            <v-card-text>
              <div class="schema-chips-list">
                <v-chip
                  v-for="(field, fieldIndex) in collectionSchema.searchable_fields"
                  :key="fieldIndex"
                  color="primary"
                  variant="flat"
                  size="small"
                  class="mr-2 mb-2"
                >
                  {{ typeof field === 'string' ? field : field.name || field }}
                  <span v-if="getFieldType(typeof field === 'string' ? field : field.name || field)" class="ml-2 field-type-badge">
                    ({{ getFieldType(typeof field === 'string' ? field : field.name || field) }})
                  </span>
                </v-chip>
              </div>
            </v-card-text>
          </v-card>

          <!-- Filterable Fields -->
          <v-card class="mb-4" v-if="collectionSchema.filterable_fields && collectionSchema.filterable_fields.length > 0">
            <v-card-title class="schema-section-title">
              <v-icon icon="mdi-filter" class="mr-2" size="20"></v-icon>
              Filterable Fields
            </v-card-title>
            <v-card-text>
              <div class="schema-chips-list">
                <v-chip
                  v-for="(field, fieldIndex) in collectionSchema.filterable_fields"
                  :key="fieldIndex"
                  color="info"
                  variant="flat"
                  size="small"
                  class="mr-2 mb-2"
                >
                  {{ typeof field === 'string' ? field : field.name || field }}
                  <span v-if="getFieldType(typeof field === 'string' ? field : field.name || field)" class="ml-2 field-type-badge">
                    ({{ getFieldType(typeof field === 'string' ? field : field.name || field) }})
                  </span>
                </v-chip>
              </div>
            </v-card-text>
          </v-card>

          <!-- Sortable Fields -->
          <v-card class="mb-4" v-if="collectionSchema.sortable_fields && collectionSchema.sortable_fields.length > 0">
            <v-card-title class="schema-section-title">
              <v-icon icon="mdi-sort" class="mr-2" size="20"></v-icon>
              Sortable Fields
            </v-card-title>
            <v-card-text>
              <div class="schema-chips-list">
                <v-chip
                  v-for="(field, fieldIndex) in collectionSchema.sortable_fields"
                  :key="fieldIndex"
                  color="warning"
                  variant="flat"
                  size="small"
                  class="mr-2 mb-2"
                >
                  {{ typeof field === 'string' ? field : field.name || field }}
                  <span v-if="getFieldType(typeof field === 'string' ? field : field.name || field)" class="ml-2 field-type-badge">
                    ({{ getFieldType(typeof field === 'string' ? field : field.name || field) }})
                  </span>
                </v-chip>
              </div>
            </v-card-text>
          </v-card>

          <!-- JSON View -->
          <v-card>
            <v-card-title class="schema-section-title">
              <v-icon icon="mdi-code-json" class="mr-2" size="20"></v-icon>
              JSON Configuration
            </v-card-title>
            <v-card-text>
              <v-card variant="outlined" class="schema-json-card">
                <v-card-text class="pa-4">
                  <pre class="schema-json">{{ formatSchemaJson(collectionSchema) }}</pre>
                </v-card-text>
              </v-card>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Delete Collection Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="560"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert-circle" size="28" color="error" class="mr-3"></v-icon>
          <div>
            <div class="text-h6">Delete Collection</div>
            <div class="text-caption text-medium-emphasis">This action cannot be undone</div>
          </div>
        </v-card-title>
        <v-card-text>
          <div class="mb-4">
            You are about to permanently delete this collection and all of its documents. This action cannot be reversed.
          </div>
          <v-card variant="outlined">
            <v-card-text>
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="font-weight-medium">Collection Name:</span>
                <span>{{ collectionName || 'N/A' }}</span>
              </div>
              <div v-if="collectionSchema && collectionSchema.num_documents !== undefined" class="d-flex justify-space-between align-center">
                <span class="font-weight-medium">Documents:</span>
                <span>{{ formatNumber(collectionSchema.num_documents) }} document{{ (collectionSchema.num_documents || 0) !== 1 ? 's' : '' }}</span>
              </div>
            </v-card-text>
          </v-card>
          <v-alert
            v-if="deleteError"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
            @click:close="deleteError = null"
          >
            {{ deleteError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="closeDeleteDialog"
            :disabled="deleting"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="handleDeleteCollection"
            :loading="deleting"
            :disabled="deleting"
          >
            Delete Collection
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const router = useRouter()
const route = useRoute()
const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })

const collectionName = ref('')
const collectionSchema = ref(null)
const schemaLoading = ref(false)
const schemaError = ref(null)
const showDeleteDialog = ref(false)
const deleting = ref(false)
const deleteError = ref(null)

const loadSchema = async () => {
  if (!collectionName.value) {
    schemaError.value = 'Collection name is required'
    return
  }

  schemaLoading.value = true
  schemaError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      schemaError.value = 'Invalid server URL configuration'
      schemaLoading.value = false
      return
    }

    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedName = encodeURIComponent(collectionName.value)
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedName}`)

    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true
    })

    if (response.status === 200) {
      collectionSchema.value = response.data
      // Debug: log schema structure
      console.log('Collection schema loaded:', {
        fields: collectionSchema.value.fields,
        searchable_fields: collectionSchema.value.searchable_fields,
        filterable_fields: collectionSchema.value.filterable_fields,
        sortable_fields: collectionSchema.value.sortable_fields
      })
    } else {
      schemaError.value = response.data?.error || `HTTP ${response.status}: ${response.statusText || 'Server error'}`
    }
  } catch (err) {
    console.error('Failed to load collection schema:', err)
    schemaError.value = err.response?.data?.error || err.message || 'Failed to load schema'
  } finally {
    schemaLoading.value = false
  }
}

const formatSchemaJson = (schema) => {
  return JSON.stringify(schema, null, 2)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleString()
  } catch (err) {
    return dateString
  }
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatNumber = (num) => {
  if (num === null || num === undefined) return '0'
  return new Intl.NumberFormat().format(num)
}

const getFieldType = (fieldName) => {
  if (!collectionSchema.value || !fieldName) return null
  
  // Normalize field name to string for comparison
  const normalizedName = String(fieldName).trim()
  if (!normalizedName) return null
  
  // First try to find in fields array
  if (collectionSchema.value.fields && Array.isArray(collectionSchema.value.fields)) {
    for (const field of collectionSchema.value.fields) {
      let fieldNameToCompare = null
      
      if (typeof field === 'object' && field !== null) {
        fieldNameToCompare = field.name ? String(field.name).trim() : null
        if (fieldNameToCompare === normalizedName && field.type) {
          return field.type
        }
      } else if (typeof field === 'string') {
        fieldNameToCompare = field.trim()
        if (fieldNameToCompare === normalizedName) {
          // If it's just a string, we don't have type info, return null
          return null
        }
      }
    }
  }
  
  // If not found, return null
  return null
}

const goBack = () => {
  if (collectionName.value) {
    const encodedName = encodeURIComponent(collectionName.value)
    router.push(`/collections/${encodedName}`).catch(err => {
      if (err.name !== 'NavigationDuplicated') {
        console.error('Navigation error:', err)
      }
    })
  } else {
    router.push('/collections').catch(err => {
      if (err.name !== 'NavigationDuplicated') {
        console.error('Navigation error:', err)
      }
    })
  }
}

const openDeleteDialog = () => {
  if (!collectionName.value) {
    toast.error('Collection name is required', 'Error')
    return
  }
  showDeleteDialog.value = true
  deleteError.value = null
}

const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  deleteError.value = null
  deleting.value = false
}

const handleDeleteCollection = async () => {
  if (!collectionName.value) {
    deleteError.value = 'Collection name is required'
    return
  }

  deleting.value = true
  deleteError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      deleteError.value = 'Invalid server URL configuration'
      deleting.value = false
      return
    }

    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedName = encodeURIComponent(collectionName.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedName}`)

    const response = await axios.delete(url, {
      timeout: 10000,
      validateStatus: () => true
    })

    if (response.status === 200 || response.status === 204) {
      toast.success(`Collection "${collectionName.value}" deleted successfully`, 'Collection Deleted')
      closeDeleteDialog()
      // Navigate back to collections list
      router.push('/collections').catch(err => {
        if (err.name !== 'NavigationDuplicated') {
          console.error('Navigation error:', err)
        }
      })
    } else {
      deleteError.value = response.data?.error || `HTTP ${response.status}: ${response.statusText || 'Server error'}`
    }
  } catch (err) {
    console.error('Failed to delete collection:', err)
    deleteError.value = extractSafeErrorMessage(err, 'Failed to delete collection')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  // Get collection name from route params
  if (route.params.name) {
    collectionName.value = decodeURIComponent(route.params.name)
    loadSchema()
  } else {
    schemaError.value = 'Collection name is required'
  }
})
</script>

<style scoped>
.collection-schema-view {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
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
  font-size: 18px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-pagination-info-top {
  font-family: Inter, Helvetica, sans-serif !important;
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

.schema-collection-link {
  background: #f3f4f6;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  padding: 6px 12px !important;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.schema-collection-link:hover,
.schema-collection-link:focus-visible {
  background: #e5e7eb;
  color: #334155 !important;
  outline: none;
}

.collections-header-actions {
  display: flex !important;
  gap: 16px !important;
  align-items: center !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
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
}

.collections-action-btn :deep(.v-icon),
.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__append) {
  display: none !important;
}

.back-btn :deep(.v-btn__prepend),
.back-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

.back-btn :deep(.v-btn__prepend .v-icon),
.back-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 6px !important;
}

.delete-collection-btn :deep(.v-btn__prepend),
.delete-collection-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

.delete-collection-btn :deep(.v-btn__prepend .v-icon),
.delete-collection-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 6px !important;
}

.delete-collection-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
}

.delete-collection-btn:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%) !important;
}

.delete-collection-btn:active {
  background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #6b1a1a 100%) !important;
}

.schema-section-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  color: #1e293b !important;
  display: flex !important;
  align-items: center !important;
}

.schema-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.schema-info-item {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #f8f9fa !important;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: none !important;
}

.schema-info-item:hover {
  background: #f8f9fa !important;
  border-color: #e2e8f0;
  box-shadow: none !important;
}

.schema-info-label {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 500 !important;
  font-size: 12px !important;
  color: #64748b !important;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.schema-info-value {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  color: #1e293b !important;
  line-height: 1.4;
}

.collection-info-card {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
}

.schema-field-card {
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  transition: none !important;
}

.schema-field-card:hover {
  border-color: #e2e8f0 !important;
  box-shadow: none !important;
}

.schema-field-number {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  border: 1px solid #e2e8f0;
}

.schema-field-name {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  color: #1e293b !important;
}

.schema-field-type {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 13px !important;
  color: #64748b !important;
  margin-top: 4px;
}

.schema-field-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.schema-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.schema-json-card {
  background: #1e293b !important;
  border: 1px solid #334155 !important;
}

.schema-json {
  margin: 0;
  padding: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  color: #e2e8f0 !important;
  background: transparent !important;
  border: none !important;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.field-type-badge {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 11px !important;
  color: rgba(255, 255, 255, 0.8) !important;
  opacity: 0.9;
}
</style>
