<template>
  <div class="collection-details-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <v-btn
          variant="outlined"
          size="small"
          @click="goBack"
          class="back-button-white"
          prepend-icon="mdi-arrow-left"
        >
          Back
        </v-btn>
        <div>
          <h1 class="collections-title-text">Collection Schema</h1>
          <div v-if="collectionName" class="collections-pagination-info-top">
            {{ collectionName }}
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <v-card>
      <v-card-text class="pa-6">
        <div v-if="schemaLoading" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <div class="mt-4 text-h6">Loading schema...</div>
        </div>
        
        <div v-else-if="schemaError" class="text-center py-12">
          <v-icon icon="mdi-alert-circle" size="64" color="error" class="mb-4"></v-icon>
          <div class="text-h6 mb-2 font-weight-bold">Error Loading Schema</div>
          <div class="text-body-1">{{ schemaError }}</div>
          <v-btn
            color="primary"
            variant="outlined"
            @click="loadCollectionSchema(true)"
            size="small"
            class="mt-4 white-bg-button"
          >
            Retry
          </v-btn>
        </div>
        
        <div v-else-if="collectionSchema">
          <!-- Collection Info -->
          <div class="schema-section mb-6">
            <h3 class="schema-section-title mb-4">
              <v-icon icon="mdi-folder" class="mr-2" size="20"></v-icon>
              Collection Information
            </h3>
            <v-card variant="outlined" class="schema-info-card">
              <v-card-text>
                <div class="schema-info-row">
                  <span class="schema-info-label">Name:</span>
                  <span class="schema-info-value">{{ collectionSchema.name || collectionName }}</span>
                </div>
                <div class="schema-info-row" v-if="collectionSchema.num_documents !== undefined">
                  <span class="schema-info-label">Documents:</span>
                  <span class="schema-info-value">{{ collectionSchema.num_documents }}</span>
                </div>
                <div class="schema-info-row" v-if="collectionSchema.created_at">
                  <span class="schema-info-label">Created:</span>
                  <span class="schema-info-value">{{ formatDate(collectionSchema.created_at) }}</span>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Fields Schema -->
          <div class="schema-section mb-6" v-if="collectionSchema.fields && collectionSchema.fields.length > 0">
            <div class="d-flex align-center justify-space-between mb-4">
              <h3 class="schema-section-title mb-0">
                <v-icon icon="mdi-database" class="mr-2" size="20"></v-icon>
                Fields ({{ collectionSchema.fields.length }})
              </h3>
              <v-btn
                v-if="!editMode"
                size="small"
                color="primary"
                variant="outlined"
                @click="editMode = true"
                prepend-icon="mdi-pencil"
                class="white-bg-button"
              >
                Edit Schema
              </v-btn>
              <div v-else style="gap: 8px;" class="d-flex">
                <v-btn
                  size="small"
                  variant="outlined"
                  @click="cancelEdit"
                  class="white-bg-button"
                >
                  Cancel
                </v-btn>
                <v-btn
                  size="small"
                  color="success"
                  variant="outlined"
                  @click="saveSchema"
                  :loading="saving"
                  prepend-icon="mdi-content-save"
                  class="white-bg-button"
                >
                  Save
                </v-btn>
              </div>
            </div>
            
            <div v-if="!editMode" class="schema-fields-list">
              <v-card
                v-for="(field, index) in collectionSchema.fields"
                :key="`field-${index}-${field.name || ''}`"
                variant="outlined"
                class="schema-field-card mb-3"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="d-flex align-center" style="gap: 12px;">
                      <div class="schema-field-number">{{ index + 1 }}</div>
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
            
            <!-- Edit Mode -->
            <div v-else class="schema-editor">
              <v-card
                v-for="(field, index) in editableFields"
                :key="`editable-field-${index}-${field.name || ''}`"
                variant="outlined"
                class="schema-field-editor mb-3"
              >
                <v-card-text class="pa-4">
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model="field.name"
                        label="Field Name"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-select
                        v-model="field.type"
                        :items="fieldTypes"
                        label="Type"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      ></v-select>
                    </v-col>
                    <v-col cols="12" md="5">
                      <div class="d-flex align-center" style="gap: 8px;">
                        <v-checkbox
                          v-model="field.index"
                          label="Searchable"
                          density="compact"
                          hide-details
                        ></v-checkbox>
                        <v-checkbox
                          v-model="field.facet"
                          label="Filterable"
                          density="compact"
                          hide-details
                        ></v-checkbox>
                        <v-checkbox
                          v-model="field.sort"
                          label="Sortable"
                          density="compact"
                          hide-details
                        ></v-checkbox>
                        <v-btn
                          icon
                          variant="outlined"
                          color="error"
                          size="small"
                          @click="removeField(index)"
                          class="white-bg-button"
                        >
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </div>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
              
              <v-btn
                color="primary"
                variant="outlined"
                @click="addField"
                prepend-icon="mdi-plus"
                class="mt-2 white-bg-button"
              >
                Add Field
              </v-btn>
            </div>
          </div>

          <!-- Searchable Fields -->
          <div class="schema-section mb-6" v-if="collectionSchema.searchable_fields && collectionSchema.searchable_fields.length > 0">
            <h3 class="schema-section-title mb-4">
              <v-icon icon="mdi-text-search" class="mr-2" size="20"></v-icon>
              Searchable Fields
            </h3>
            <div class="schema-chips-list">
              <v-chip
                v-for="(field, index) in collectionSchema.searchable_fields"
                :key="`searchable-${index}-${field || ''}`"
                color="primary"
                variant="flat"
                size="small"
                class="mr-2 mb-2"
              >
                {{ field }}
              </v-chip>
            </div>
          </div>

          <!-- Filterable Fields -->
          <div class="schema-section mb-6" v-if="collectionSchema.filterable_fields && collectionSchema.filterable_fields.length > 0">
            <h3 class="schema-section-title mb-4">
              <v-icon icon="mdi-filter" class="mr-2" size="20"></v-icon>
              Filterable Fields
            </h3>
            <div class="schema-chips-list">
              <v-chip
                v-for="(field, index) in collectionSchema.filterable_fields"
                :key="`filterable-${index}-${field || ''}`"
                color="info"
                variant="flat"
                size="small"
                class="mr-2 mb-2"
              >
                {{ field }}
              </v-chip>
            </div>
          </div>

          <!-- Sortable Fields -->
          <div class="schema-section mb-6" v-if="collectionSchema.sortable_fields && collectionSchema.sortable_fields.length > 0">
            <h3 class="schema-section-title mb-4">
              <v-icon icon="mdi-sort" class="mr-2" size="20"></v-icon>
              Sortable Fields
            </h3>
            <div class="schema-chips-list">
              <v-chip
                v-for="(field, index) in collectionSchema.sortable_fields"
                :key="`sortable-${index}-${field || ''}`"
                color="warning"
                variant="flat"
                size="small"
                class="mr-2 mb-2"
              >
                {{ field }}
              </v-chip>
            </div>
          </div>

          <!-- JSON View -->
          <div class="schema-section">
            <div class="d-flex align-center justify-space-between mb-4">
              <h3 class="schema-section-title mb-0">
                <v-icon icon="mdi-code-json" class="mr-2" size="20"></v-icon>
                JSON Configuration
              </h3>
              <v-btn
                size="small"
                variant="outlined"
                @click="copySchemaJSON"
                prepend-icon="mdi-content-copy"
                class="white-bg-button"
              >
                Copy JSON
              </v-btn>
            </div>
            <v-card variant="outlined" class="schema-json-card">
              <v-card-text class="pa-4">
                <pre class="schema-json">{{ formatSchemaJson(collectionSchema) }}</pre>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'
import { useCopy } from '../composables/useCopy'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'

const router = useRouter()
const route = useRoute()
const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })
const { copyJSON } = useCopy()

const collectionName = computed(() => {
  const name = route.params.name
  return name ? decodeURIComponent(name) : ''
})

const collectionSchema = ref(null)
const schemaLoading = ref(false)
const schemaError = ref(null)
const editMode = ref(false)
const editableFields = ref([])
const saving = ref(false)

const fieldTypes = [
  { title: 'String', value: 'string' },
  { title: 'Integer', value: 'int32' },
  { title: 'Float', value: 'float' },
  { title: 'Boolean', value: 'bool' },
  { title: 'Array', value: 'string[]' }
]

const goBack = () => {
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

// Fetch collection schema
const loadCollectionSchema = async (showLoading = false) => {
  try {
    if (showLoading) {
      schemaLoading.value = true
      schemaError.value = null
    }
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      if (showLoading) {
        schemaError.value = 'Invalid server URL configuration'
        schemaLoading.value = false
      }
      return null
    }
    
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}`)
    
    const response = await axios.get(url, { timeout: 5000 })
    collectionSchema.value = response.data
    
    // Initialize editable fields
    if (response.data.fields) {
      editableFields.value = response.data.fields.map(f => {
        if (typeof f === 'object') {
          return { ...f }
        }
        return { name: f, type: 'string', index: false, facet: false, sort: false }
      })
    }
    
    if (showLoading) {
      schemaLoading.value = false
    }
  } catch (err) {
    console.error('Failed to load collection schema:', err)
    if (showLoading) {
      schemaError.value = err.response?.data?.error || err.message || 'Failed to load schema'
      schemaLoading.value = false
    }
  }
}

// Format date helper - improved version
const formatDate = (dateString) => {
  if (!dateString && dateString !== 0) return 'N/A'
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

// Format schema as JSON
const formatSchemaJson = (schema) => {
  return JSON.stringify(schema, null, 2)
}

const copySchemaJSON = () => {
  if (collectionSchema.value) {
    copyJSON(collectionSchema.value, 'Schema JSON copied to clipboard')
  }
}

const addField = () => {
  editableFields.value.push({
    name: '',
    type: 'string',
    index: false,
    facet: false,
    sort: false
  })
}

const removeField = (index) => {
  editableFields.value.splice(index, 1)
}

const cancelEdit = () => {
  editMode.value = false
  // Reset to original schema
  if (collectionSchema.value && collectionSchema.value.fields) {
    editableFields.value = collectionSchema.value.fields.map(f => {
      if (typeof f === 'object') {
        return { ...f }
      }
      return { name: f, type: 'string', index: false, facet: false, sort: false }
    })
  }
}

const saveSchema = async () => {
  saving.value = true
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      if (showLoading) {
        schemaError.value = 'Invalid server URL configuration'
        schemaLoading.value = false
      }
      return null
    }
    
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}`)
    
    // Update schema with new fields
    const updatedSchema = {
      ...collectionSchema.value,
      fields: editableFields.value.filter(f => f.name.trim() !== '')
    }
    
    // Note: This assumes the API supports PATCH/PUT for schema updates
    // You may need to adjust this based on your actual API
    await axios.patch(url, updatedSchema, { timeout: 10000 })
    
    collectionSchema.value = updatedSchema
    editMode.value = false
    toast.success('Schema updated successfully', 'Success')
  } catch (err) {
    console.error('Failed to save schema:', err)
    schemaError.value = err.response?.data?.error || err.message || 'Failed to save schema'
    toast.error(schemaError.value, 'Save Failed')
  } finally {
    saving.value = false
  }
}

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'escape',
    handler: () => {
      if (editMode.value) {
        cancelEdit()
      } else {
        goBack()
      }
    }
  },
  {
    key: 'ctrl+s',
    handler: (e) => {
      if (editMode.value) {
        e.preventDefault()
        saveSchema()
      }
    }
  }
])

onMounted(() => {
  loadCollectionSchema(true)
})
</script>

<style scoped>
.collection-details-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  margin-top: 48px;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 28px !important;
  font-weight: 600 !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  margin: 0 0 8px 0 !important;
  padding: 0 !important;
}

.page-subtitle {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  color: #64748b !important;
  margin: 0 !important;
  padding: 0 !important;
}

.schema-section {
  margin-bottom: 32px;
}

.schema-section-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.schema-info-card {
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
}

.schema-info-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;
}

.schema-info-row:last-child {
  border-bottom: none;
}

.schema-info-label {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600;
  font-size: 14px;
  color: #64748b;
  min-width: 120px;
}

.schema-info-value {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500;
  font-size: 14px;
  color: #1e293b;
}

.schema-field-card {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
  transition: all 0.2s ease;
}

.schema-field-card:hover {
  border-color: #cbd5e1 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.schema-field-number {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
}

.schema-field-name {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
}

.schema-field-type {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  color: #64748b !important;
  margin-top: 4px;
}

.schema-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.schema-json-card {
  background: #1e293b !important;
  border: 1px solid #334155 !important;
  border-radius: 12px !important;
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

.back-button-white {
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
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
}

.back-button-white:hover {
  background: #f8fafc !important;
  color: #1565c0 !important;
  border-color: #cbd5e1 !important;
  transform: translateY(-1px);
}

.back-button-white:active {
  background: #f1f5f9 !important;
  transform: translateY(0) !important;
}

.back-button-white :deep(.v-icon) {
  color: inherit !important;
  font-size: 18px !important;
  margin-right: 4px !important;
}

.white-bg-button {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
}

.white-bg-button:hover {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
}

.white-bg-button:active {
  background: #f1f5f9 !important;
}
</style>

