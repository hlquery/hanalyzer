<template>
  <div class="create-collection-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <div>
          <h1 class="collections-title-text">Create New Collection</h1>
        </div>
      </div>
    </div>

    <!-- Create Collection Form -->
    <v-row>
      <!-- Form - Full Width -->
      <v-col cols="12">
        <v-card class="form-card">
          <v-card-text class="form-card-content">
            <v-alert
              v-if="createError"
              type="error"
              variant="tonal"
              class="mb-4 error-alert-detailed"
              closable
              icon="mdi-alert-circle"
              @click:close="createError = null"
              prominent
            >
              <div class="font-weight-bold mb-2 text-h6">Error Creating Collection</div>
              <div class="error-message-text">{{ createError }}</div>
              <div class="mt-2 text-caption text-medium-emphasis">
                Please check your collection name and fields, then try again.
              </div>
            </v-alert>

            <v-alert
              v-if="createSuccess"
              type="success"
              variant="tonal"
              class="mb-4"
              icon="mdi-check-circle"
              closable
              @click:close="createSuccess = false"
            >
              <div class="font-weight-bold mb-1">Success!</div>
              <div>Collection created successfully. You can now add documents to it.</div>
              <v-btn
                variant="text"
                size="small"
                @click="goToCollection"
                prepend-icon="mdi-arrow-right"
                class="mt-2"
              >
                Go to Collection
              </v-btn>
            </v-alert>

            <!-- Collection Name -->
            <div class="form-section">
              <label class="form-label">Collection Name</label>
              <p class="form-description">Choose a unique name for your collection. Use lowercase letters, numbers, underscores, or hyphens.</p>
              <v-text-field
                v-model="newCollectionName"
                variant="outlined"
                :rules="[rules.required, rules.collectionName]"
                placeholder="e.g., products, articles, users"
                class="form-input collection-name-input"
                :disabled="creating"
                :error-messages="newCollectionName && !rules.collectionName(newCollectionName) ? rules.collectionName(newCollectionName) : []"
                hide-details="auto"
              ></v-text-field>
            </div>

            <!-- Fields Section -->
            <div class="fields-section" @click.stop>
              <div class="fields-header">
                <div>
                  <h3 class="fields-title">Fields</h3>
                  <p class="fields-description">Define the structure of your collection by adding fields with their data types and options.</p>
                </div>
                <div class="add-field-button-container">
                  <v-btn
                    @click.stop="addField"
                    variant="flat"
                    size="small"
                    prepend-icon="mdi-plus"
                    class="collections-action-btn add-field-btn"
                  >
                    Add Field
                  </v-btn>
                </div>
              </div>

              <!-- Field List - No longer show empty state since we always have at least one field -->

              <div v-for="(field, index) in fields" :key="field.id || index" class="field-item" @click.stop>
                <v-card variant="outlined" class="field-card-modern" @click.stop>
                  <v-card-text class="pa-5" @click.stop>
                    <div class="d-flex align-center justify-space-between mb-4" @click.stop>
                      <div class="d-flex align-center" style="gap: 12px;">
                        <div class="field-number-modern">{{ index + 1 }}</div>
                        <div>
                          <div class="field-label-text">Field {{ index + 1 }}</div>
                          <div v-if="field.name" class="field-name-preview">{{ field.name }}</div>
                        </div>
                      </div>
                      <v-btn
                        icon
                        variant="text"
                        size="small"
                        @click.stop="removeField(index)"
                        color="error"
                        class="delete-field-btn-modern"
                        :disabled="fields.length === 1"
                        :title="fields.length === 1 ? 'Cannot remove the last field' : 'Remove field'"
                      >
                        <v-icon size="20">mdi-close</v-icon>
                      </v-btn>
                    </div>

                    <div class="field-inputs-row" @click.stop>
                      <!-- Field Name -->
                      <div class="field-input-group">
                        <label class="field-input-label">Field Name</label>
                        <v-text-field
                          v-model="field.name"
                          placeholder="e.g., title, price, description"
                          variant="outlined"
                          density="comfortable"
                          class="field-input"
                          :disabled="creating"
                          hide-details="auto"
                          @click.stop
                          @mousedown.stop
                        ></v-text-field>
                      </div>

                      <!-- Field Type -->
                      <div class="field-input-group">
                        <label class="field-input-label">Data Type</label>
                        <v-select
                          v-model="field.type"
                          :items="fieldTypes"
                          variant="outlined"
                          density="comfortable"
                          class="field-input field-type-select"
                          :menu-props="{ contentClass: 'field-type-menu' }"
                          :disabled="creating"
                          hide-details="auto"
                          @click.stop
                          @mousedown.stop
                        ></v-select>
                      </div>
                    </div>

                    <!-- Field Options - Modern Chips Style -->
                    <div class="field-options-modern" @click.stop>
                      <label class="field-options-label">Field Options</label>
                      <p class="field-options-description">Enable indexing, faceting, or sorting for this field.</p>
                      <div class="field-options-chips" @click.stop>
                        <v-chip
                          :color="field.index ? 'primary' : 'default'"
                          :variant="field.index ? 'flat' : 'outlined'"
                          size="small"
                          @click.stop="field.index = !field.index"
                          :disabled="creating"
                          class="field-option-chip"
                        >
                          <v-icon start size="16">{{ field.index ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                          Index
                        </v-chip>
                        <v-chip
                          :color="field.facet ? 'primary' : 'default'"
                          :variant="field.facet ? 'flat' : 'outlined'"
                          size="small"
                          @click.stop="field.facet = !field.facet"
                          :disabled="creating"
                          class="field-option-chip"
                        >
                          <v-icon start size="16">{{ field.facet ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                          Facet
                        </v-chip>
                        <v-chip
                          :color="field.sort ? 'primary' : 'default'"
                          :variant="field.sort ? 'flat' : 'outlined'"
                          size="small"
                          @click.stop="field.sort = !field.sort"
                          :disabled="creating"
                          class="field-option-chip"
                        >
                          <v-icon start size="16">{{ field.sort ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                          Sort
                        </v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </v-card-text>

          <v-card-actions class="pa-6 create-actions">
            <v-spacer></v-spacer>
            <v-btn
              variant="text"
              @click="goBack"
              :disabled="creating"
              size="small"
            >
              Cancel
            </v-btn>
            <v-btn
              variant="flat"
              @click="createCollection"
              :loading="creating"
              size="small"
              class="collections-action-btn create-collection-btn add-field-btn"
            >
              Create Collection
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl, getDemoModeErrorMessage } from '../utils/apiHelpers'

const router = useRouter()
const baseUrl = inject('baseUrl')
const toast = inject('toast', { error: () => {} })

const newCollectionName = ref('')
// Initialize with one default field automatically
// Generate unique ID for fields
let fieldIdCounter = 0
const generateFieldId = () => `field-${Date.now()}-${++fieldIdCounter}`

const fields = ref([{
  id: generateFieldId(),
  name: '',
  type: 'string',
  index: false,
  facet: false,
  sort: false
}])
const creating = ref(false)
const createError = ref(null)
const createSuccess = ref(false)

const fieldTypes = [
  { title: 'String', value: 'string' },
  { title: 'Integer', value: 'int32' },
  { title: 'Long Integer', value: 'int64' },
  { title: 'Float', value: 'float' },
  { title: 'Double', value: 'double' },
  { title: 'Boolean', value: 'bool' },
  { title: 'Array', value: 'array' },
  { title: 'Object', value: 'object' }
]

const rules = {
  required: (value) => !!value || 'This field is required',
  collectionName: (value) => {
    if (!value) return true
    if (value.length < 1) return 'Collection name must be at least 1 character'
    if (value.length > 100) return 'Collection name must be less than 100 characters'
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Collection name can only contain letters, numbers, underscores, and hyphens'
    return true
  }
}

const addField = (event) => {
  // Only add field when explicitly called from the "Add Field" button
  // Prevent any accidental calls from event propagation
  if (event) {
    event.stopPropagation()
    event.preventDefault()
    
    // Double-check: verify the event target is actually the Add Field button
    const target = event.target || event.currentTarget
    const button = target.closest('.add-field-btn')
    if (!button) {
      // This click didn't come from the Add Field button, ignore it
      console.warn('addField called but click was not on Add Field button, ignoring')
      return
    }
  }
  
  // Always add just one field when clicking "Add Field"
  fields.value.push({
    id: generateFieldId(),
    name: '',
    type: 'string',
    index: false,
    facet: false,
    sort: false
  })
}

const removeField = (index) => {
  // Prevent removing the last field - always keep at least one field
  if (fields.value.length > 1) {
    fields.value.splice(index, 1)
  }
}

const isValidConfig = computed(() => {
  if (!newCollectionName.value?.trim()) return false
  // Validate collection name format (only letters, numbers, underscores, hyphens)
  if (!/^[a-zA-Z0-9_-]+$/.test(newCollectionName.value.trim())) return false
  // We always have at least one field now, so check if it's valid
  if (fields.value.length === 0) return false
  return fields.value.every(f => f.name?.trim() && f.type)
})

const getTypeLabel = (type) => {
  const typeMap = {
    'string': 'str',
    'int32': 'int',
    'int64': 'long',
    'float': 'float',
    'double': 'double',
    'bool': 'bool',
    'array': 'arr',
    'object': 'obj'
  }
  return typeMap[type] || type
}

const goBack = () => {
  router.push('/collections')
}

const goToCollection = () => {
  if (!newCollectionName.value) {
    return
  }
  
  const name = String(newCollectionName.value).trim()
  if (!name) {
    return
  }
  
  try {
    const encodedName = encodeURIComponent(name)
    const path = `/collections/${encodedName}`
    router.push({ path: path }).catch(err => {
      // Ignore navigation errors
      if (err.name !== 'NavigationDuplicated' && !err.message?.includes('Avoided redundant navigation')) {
        console.error('Navigation error:', err)
      }
    })
  } catch (err) {
    console.error('Error navigating to collection:', err, 'Collection name:', name)
  }
}

// Removed auto-suggest fields functionality - users should manually add fields
// This function was causing fields to change automatically when typing collection name

const createCollection = async () => {
  if (!newCollectionName.value?.trim()) {
    createError.value = 'Collection name is required'
    return
  }

  // We always have at least one field now, so this check is less critical
  if (fields.value.length === 0) {
    createError.value = 'At least one field is required'
    return
  }

  // Validate all fields have names and types
  for (let i = 0; i < fields.value.length; i++) {
    const field = fields.value[i]
    if (!field.name || !field.name.trim()) {
      createError.value = `Field ${i + 1} must have a name`
      return
    }
    if (!field.type) {
      createError.value = `Field ${i + 1} must have a type`
      return
    }
  }

  creating.value = true
  createError.value = null
  createSuccess.value = false

  try {
    const config = {
      name: newCollectionName.value.trim(),
      fields: fields.value.map(f => {
        const field = {
          name: f.name.trim(),
          type: f.type
        }
        if (f.index) field.index = true
        if (f.facet) field.facet = true
        if (f.sort) field.sort = true
        return field
      })
    }

    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      createError.value = 'Invalid server URL configuration. Please check your server settings.'
      creating.value = false
      return
    }
    
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/collections')

    console.log('Creating collection:', { url, config })

    const response = await axios.post(url, config, {
      timeout: 10000,
      validateStatus: () => true
    })

    if (response.status === 200 || response.status === 201) {
      createSuccess.value = true
      const collectionName = newCollectionName.value.trim()
      setTimeout(() => {
        try {
          router.push({
            name: 'collection-documents',
            params: {
              name: collectionName
            }
          }).catch(err => {
            // Ignore navigation errors
            if (err.name !== 'NavigationDuplicated' && !err.message?.includes('Avoided redundant navigation')) {
              console.error('Navigation error:', err)
            }
          })
        } catch (err) {
          console.error('Error navigating to collection:', err, 'Collection name:', collectionName)
        }
      }, 1500)
    } else {
      const demoModeMessage = getDemoModeErrorMessage({ response })
      if (demoModeMessage) {
        toast.error(demoModeMessage, 'Action unavailable')
        return
      }

      let errorMsg = 'Unknown error occurred'
      
      // Try to extract meaningful error message
      if (response.data) {
        if (typeof response.data === 'string') {
          errorMsg = response.data
        } else if (response.data.error) {
          errorMsg = response.data.error
        } else if (response.data.message) {
          errorMsg = response.data.message
        } else if (response.data.detail) {
          errorMsg = response.data.detail
        } else {
          errorMsg = JSON.stringify(response.data)
        }
      } else {
        errorMsg = `HTTP ${response.status}: ${response.statusText || 'Server error'}`
      }
      
      createError.value = `Failed to create collection: ${errorMsg}`
      console.error('Collection creation failed:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        config: config
      })
    }
  } catch (err) {
    const demoModeMessage = getDemoModeErrorMessage(err)
    if (demoModeMessage) {
      toast.error(demoModeMessage, 'Action unavailable')
      return
    }

    let errorMsg = 'An unexpected error occurred'
    
    if (err.response) {
      // Server responded with error
      const data = err.response.data
      if (data) {
        if (typeof data === 'string') {
          errorMsg = data
        } else if (data.error) {
          errorMsg = data.error
        } else if (data.message) {
          errorMsg = data.message
        } else if (data.detail) {
          errorMsg = data.detail
        } else {
          errorMsg = `Server error (${err.response.status}): ${JSON.stringify(data)}`
        }
      } else {
        errorMsg = `Server error: ${err.response.status} ${err.response.statusText || ''}`
      }
    } else if (err.request) {
      // Request was made but no response received
      errorMsg = 'No response from server. Please check if the server is running and accessible.'
    } else if (err.message) {
      // Error setting up the request
      errorMsg = err.message
    }
    
    createError.value = `Error creating collection: ${errorMsg}`
    console.error('Collection creation error:', {
      error: err,
      message: err.message,
      response: err.response?.data,
      config: config
    })
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.create-collection-view {
  width: 100%;
  max-width: 1400px;
  margin: 8px auto 0;
}

/* Form Card */
.form-card {
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
  background: #f6f7f9 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.form-card-content {
  padding: 32px !important;
  background: #f6f7f9 !important;
}

/* Form Sections */
.form-section {
  margin-bottom: 32px;
}

.form-label {
  display: block;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #050505 !important;
  margin-bottom: 6px !important;
  letter-spacing: 0.01em;
}

.form-description {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 12px !important;
  color: #1b1b1b !important;
  margin: 0 0 8px 0 !important;
  line-height: 1.4;
}

.form-input {
  margin-top: 8px;
}

.form-input :deep(.v-field) {
  border-radius: 4px !important;
  font-size: 14px !important;
  background-color: #ffffff !important;
  border: none !important;
  box-shadow: none !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}

.form-input :deep(.v-field:hover) {
  border-color: #8e8e93 !important;
  box-shadow: none !important;
}

.form-input :deep(.v-field__input) {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  min-height: 32px !important;
  font-size: 14px !important;
  background-color: #ffffff !important;
}

.form-input :deep(.v-field--focused) {
  border-color: transparent !important;
  box-shadow: none !important;
  background-color: #ffffff !important;
}

.collection-name-input :deep(input:focus),
.collection-name-input :deep(input:focus-visible),
.collection-name-input :deep(.v-field:focus-within),
.collection-name-input :deep(.v-field--focused) {
  outline: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

.form-input :deep(.v-field__outline) {
  display: none !important;
}

.collection-name-input :deep(.v-field),
.collection-name-input :deep(.v-field__input) {
  background-color: #ffffff !important;
  font-size: 14px !important;
  min-height: 34px !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.collection-name-input :deep(.v-field) {
  border-radius: 10px !important;
  box-shadow: none !important;
}

.collection-name-input :deep(.v-field__input) {
  padding-left: 14px !important;
  padding-right: 14px !important;
  color: #0f172a !important;
}

.collection-name-input :deep(.v-field__input input) {
  color: #0f172a !important;
}

.collection-name-input :deep(.v-field__input input::placeholder) {
  color: #94a3b8 !important;
  opacity: 1 !important;
}

.form-input :deep(.v-field__prepend-inner),
.form-input :deep(.v-field__append-inner) {
  padding: 0 8px !important;
}

.form-input :deep(.v-field__prepend-inner .v-icon),
.form-input :deep(.v-field__append-inner .v-icon) {
  font-size: 18px !important;
  color: #5f6368 !important;
}

.fields-section {
  margin-top: 24px;
}

.fields-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.add-field-button-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.fields-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 20px !important;
  font-weight: 600 !important;
  color: #050505 !important;
  margin: 0 0 6px 0 !important;
  letter-spacing: -0.01em;
}

.fields-description {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  color: #64748b !important;
  margin: 0 !important;
  line-height: 1.5;
  max-width: 500px;
}

.empty-fields-state {
  text-align: center;
  padding: 48px 24px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #cbd5e1;
}

.field-item {
  position: relative;
  margin-bottom: 0 !important;
}

.field-card-modern {
  border: 1px solid #cbd5e1 !important;
  border-radius: 10px !important;
  transition: all 0.2s ease !important;
  background: #e9edf2 !important;
  margin-bottom: 12px !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}

.field-card-modern:hover {
  border-color: #b8c4d1 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06) !important;
  background: #e2e8f0 !important;
}

.field-card-modern :deep(.v-card-text) {
  padding: 16px !important;
}

.field-number-modern {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.15);
}

.field-label-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #030303 !important;
  text-transform: none;
  letter-spacing: 0;
}

.field-name-preview {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #030303 !important;
  margin-top: 2px;
}

/* Field Inputs */
.field-inputs-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.field-input-group {
  display: flex;
  flex-direction: column;
  padding: 0 6px;
}

.field-input-label {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 500 !important;
  font-size: 12px !important;
  color: #030303 !important;
  margin-bottom: 6px !important;
  letter-spacing: 0.01em;
  padding-left: 2px;
}

.field-input :deep(.v-field) {
  border-radius: 8px !important;
  font-size: 14px !important;
  background-color: #ffffff !important;
  border: none !important;
  box-shadow: none !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
  min-height: 32px !important;
}

.field-input :deep(.v-field:hover) {
  border-color: #8e8e93 !important;
  box-shadow: none !important;
}

.field-input :deep(.v-field__input) {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  padding-left: 14px !important;
  padding-right: 14px !important;
  min-height: 34px !important;
  font-size: 14px !important;
  background-color: #ffffff !important;
}

.field-input :deep(.v-field--focused) {
  border-color: transparent !important;
  box-shadow: none !important;
  background-color: #ffffff !important;
}

.field-input :deep(input:focus),
.field-input :deep(input:focus-visible),
.field-input :deep(.v-field:focus-within),
.field-input :deep(.v-field--focused),
.field-input :deep(.v-input--focused .v-field) {
  outline: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

.field-input :deep(.v-field__outline) {
  display: none !important;
}

.field-input :deep(.v-field__prepend-inner),
.field-input :deep(.v-field__append-inner) {
  padding: 0 8px !important;
}

.field-input :deep(.v-field__prepend-inner .v-icon),
.field-input :deep(.v-field__append-inner .v-icon) {
  font-size: 18px !important;
  color: #5f6368 !important;
}

/* Select field specific styling */
.field-input :deep(.v-select .v-field) {
  background-color: #ffffff !important;
  min-height: 32px !important;
  box-shadow: none !important;
  border-radius: 10px !important;
  border: none !important;
  overflow: hidden !important;
}

.field-input :deep(.v-select .v-field__input) {
  background-color: #ffffff !important;
  min-height: 32px !important;
  display: flex !important;
  align-items: center !important;
  padding-left: 18px !important;
  padding-right: 18px !important;
  box-shadow: none !important;
}

.field-input :deep(.v-select .v-field--focused) {
  background-color: #ffffff !important;
  box-shadow: none !important;
}

.field-type-select :deep(.v-select__selection) {
  margin: 0 !important;
  line-height: 1.2 !important;
  padding-left: 4px !important;
}

.field-type-select :deep(.v-select__selection-text) {
  line-height: 1.2 !important;
}

.field-type-select :deep(.v-field__input input) {
  position: absolute !important;
  width: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

.field-type-select {
  max-width: 220px;
}

.field-type-select :deep(.v-field__append-inner) {
  padding-right: 14px !important;
}

.field-type-select :deep(.v-field__outline),
.field-type-select :deep(.v-field__overlay),
.field-type-select :deep(.v-field::before),
.field-type-select :deep(.v-field::after) {
  display: none !important;
  border: none !important;
  box-shadow: none !important;
}

:global(.field-type-menu) {
  border-radius: 12px !important;
  border: none !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12) !important;
  overflow: hidden !important;
}

:global(.field-type-menu .v-list) {
  padding: 10px !important;
  background: #ffffff !important;
}

:global(.field-type-menu .v-list-item) {
  min-height: 48px !important;
  padding: 0 18px !important;
  border-radius: 10px !important;
}

:global(.field-type-menu .v-list-item-title) {
  font-size: 14px !important;
  line-height: 1.25 !important;
}

:global(.field-type-menu .v-list-item--active) {
  background: #f3f4f6 !important;
}

:global(.field-type-menu .v-list-item--active .v-list-item-title) {
  color: #111827 !important;
}

@media (max-width: 960px) {
  .field-inputs-row {
    grid-template-columns: 1fr;
  }
}

.field-options-modern {
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.field-options-label {
  display: block;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #030303 !important;
  margin-bottom: 6px !important;
  text-transform: none;
  letter-spacing: 0;
}

.field-options-description {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  color: #030303 !important;
  margin: 0 0 12px 0 !important;
  line-height: 1.4;
}

.field-options-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-option-chip {
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.field-option-chip:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.delete-field-btn-modern {
  min-width: 36px !important;
  width: 36px !important;
  height: 36px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

.delete-field-btn-modern:hover {
  background: #fee2e2 !important;
}

.delete-field-btn-modern :deep(.v-icon) {
  color: #ef4444 !important;
  opacity: 1 !important;
}

.delete-field-btn-modern:hover :deep(.v-icon) {
  color: #dc2626 !important;
}

.preview-card {
  position: sticky;
  top: 88px;
  height: fit-content;
  border: 1px solid #e2e8f0 !important;
}

.preview-title {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
  border-bottom: 1px solid #e2e8f0 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  color: #1e293b !important;
}

.preview-visual {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.preview-collection-name {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 10px;
  border: 2px solid #1976d2;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.preview-name-text {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #1976d2 !important;
}

.preview-fields-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-field-item {
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.preview-field-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.preview-field-name {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
}

.preview-type-chip {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 11px !important;
  letter-spacing: 0.5px;
}

.preview-field-badges {
  display: flex;
  align-items: center;
  gap: 4px;
}

.preview-empty-fields {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #94a3b8;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}

.preview-json-wrapper {
  margin-top: 16px;
}

.preview-json-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.preview-json-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.refresh-json-btn {
  color: #64748b !important;
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
}

.refresh-json-btn:hover {
  background: rgba(100, 116, 139, 0.1) !important;
  color: #475569 !important;
}

.refresh-json-btn :deep(.v-icon) {
  color: inherit !important;
}

.preview-content {
  background: #1e293b;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #334155;
}

.preview-json {
  margin: 0;
}

.preview-json pre {
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

.create-actions {
  background: #f8fafc !important;
  border-top: 1px solid #e2e8f0 !important;
}

/* Blue action buttons - Same style as connection badge */
.action-btn-blue,
.action-btn-blue.v-btn,
.action-btn-blue.v-btn--variant-flat {
  border-radius: 999px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  height: 26px !important;
  padding: 0 12px !important;
  text-transform: none !important;
  box-shadow: none !important;
  background: #1976d2 !important;
  background-color: #1976d2 !important;
  border: none !important;
  letter-spacing: normal !important;
}

.action-btn-blue,
.action-btn-blue *,
.action-btn-blue .v-btn__content,
.action-btn-blue .v-btn__content *,
.action-btn-blue .v-btn__content span,
.action-btn-blue span {
  color: #ffffff !important;
}

.action-btn-blue :deep(.v-btn__content),
.action-btn-blue :deep(.v-btn__content *),
.action-btn-blue :deep(.v-btn__content span),
.action-btn-blue :deep(span),
.action-btn-blue :deep(.v-btn__prepend),
.action-btn-blue :deep(.v-btn__append) {
  color: #ffffff !important;
}

.action-btn-blue :deep(.v-icon),
.action-btn-blue :deep(.v-btn__prepend .v-icon),
.action-btn-blue :deep(.v-btn__append .v-icon) {
  color: #ffffff !important;
  opacity: 1 !important;
}

.action-btn-blue:hover,
.action-btn-blue.v-btn:hover,
.action-btn-blue.v-btn--variant-flat:hover {
  background: #1565c0 !important;
  background-color: #1565c0 !important;
}

.action-btn-blue:hover *,
.action-btn-blue:hover .v-btn__content,
.action-btn-blue:hover .v-btn__content *,
.action-btn-blue:hover :deep(.v-btn__content),
.action-btn-blue:hover :deep(.v-btn__content *),
.action-btn-blue:hover :deep(.v-icon) {
  color: #ffffff !important;
}

.action-btn-blue::before {
  display: none !important;
}

/* Delete field button */
.delete-field-btn {
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
}

.delete-field-btn :deep(.v-icon) {
  color: #ef4444 !important;
  opacity: 1 !important;
}

.delete-field-btn:hover :deep(.v-icon) {
  color: #dc2626 !important;
}

/* Override global button styles for this component - Maximum specificity */
.create-collection-view .action-btn-blue,
.create-collection-view .action-btn-blue.v-btn,
.create-collection-view .action-btn-blue.v-btn--variant-flat,
.create-collection-view .create-collection-btn,
.create-collection-view .create-collection-btn.v-btn,
.create-collection-view .create-collection-btn.v-btn--variant-flat,
.create-collection-view .add-field-btn,
.create-collection-view .add-field-btn.v-btn,
.create-collection-view .add-field-btn.v-btn--variant-flat,
.create-collection-view .white-text-btn,
.create-collection-view .white-text-btn.v-btn,
.create-collection-view .white-text-btn.v-btn--variant-flat {
  color: #ffffff !important;
}

.create-collection-view .action-btn-blue *,
.create-collection-view .action-btn-blue .v-btn__content,
.create-collection-view .action-btn-blue .v-btn__content *,
.create-collection-view .action-btn-blue .v-btn__content span,
.create-collection-view .create-collection-btn *,
.create-collection-view .create-collection-btn .v-btn__content,
.create-collection-view .create-collection-btn .v-btn__content *,
.create-collection-view .add-field-btn *,
.create-collection-view .add-field-btn .v-btn__content,
.create-collection-view .add-field-btn .v-btn__content *,
.create-collection-view .white-text-btn *,
.create-collection-view .white-text-btn .v-btn__content,
.create-collection-view .white-text-btn .v-btn__content * {
  color: #ffffff !important;
}

.create-collection-view .action-btn-blue :deep(.v-btn__content),
.create-collection-view .action-btn-blue :deep(.v-btn__content *),
.create-collection-view .action-btn-blue :deep(.v-btn__content span),
.create-collection-view .action-btn-blue :deep(span),
.create-collection-view .create-collection-btn :deep(.v-btn__content),
.create-collection-view .create-collection-btn :deep(.v-btn__content *),
.create-collection-view .create-collection-btn :deep(.v-btn__content span),
.create-collection-view .create-collection-btn :deep(span),
.create-collection-view .add-field-btn :deep(.v-btn__content),
.create-collection-view .add-field-btn :deep(.v-btn__content *),
.create-collection-view .add-field-btn :deep(.v-btn__content span),
.create-collection-view .add-field-btn :deep(span),
.create-collection-view .white-text-btn :deep(.v-btn__content),
.create-collection-view .white-text-btn :deep(.v-btn__content *),
.create-collection-view .white-text-btn :deep(.v-btn__content span),
.create-collection-view .white-text-btn :deep(span) {
  color: #ffffff !important;
}

.create-collection-view .action-btn-blue :deep(.v-icon),
.create-collection-view .action-btn-blue :deep(.v-btn__prepend .v-icon),
.create-collection-view .action-btn-blue :deep(.v-btn__append .v-icon),
.create-collection-view .create-collection-btn :deep(.v-icon),
.create-collection-view .create-collection-btn :deep(.v-btn__prepend .v-icon),
.create-collection-view .create-collection-btn :deep(.v-btn__append .v-icon),
.create-collection-view .add-field-btn :deep(.v-icon),
.create-collection-view .add-field-btn :deep(.v-btn__prepend .v-icon),
.create-collection-view .add-field-btn :deep(.v-btn__append .v-icon),
.create-collection-view .white-text-btn :deep(.v-icon),
.create-collection-view .white-text-btn :deep(.v-btn__prepend .v-icon),
.create-collection-view .white-text-btn :deep(.v-btn__append .v-icon) {
  color: #ffffff !important;
  opacity: 1 !important;
}

/* Responsive */
@media (max-width: 960px) {
  .preview-card {
    position: relative;
    top: 0;
    margin-top: 24px;
  }
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

.collections-header-actions {
  display: flex !important;
  gap: 16px !important;
  align-items: center !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
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

/* Text Back Button */
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

/* Collections action buttons */
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
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
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

.collections-action-btn:focus,
.collections-action-btn:focus-visible,
.collections-action-btn:active {
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
}

.collections-action-btn:active::before {
  opacity: 1 !important;
}

.add-field-btn:hover :deep(.v-btn__content),
.add-field-btn:hover :deep(.v-btn__content span) {
  text-decoration: underline !important;
}

.add-field-btn:hover :deep(.v-icon) {
  text-decoration: none !important;
}

.collections-action-btn :deep(.v-icon),
.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__append),
.collections-action-btn :deep(.v-btn__prepend-inner),
.collections-action-btn :deep(.v-btn__append-inner) {
  display: none !important;
}

/* Allow prepend icon for Add Field button */
.add-field-btn :deep(.v-btn__prepend),
.add-field-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
}

.add-field-btn :deep(.v-btn__prepend .v-icon),
.add-field-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 6px !important;
}

.collections-action-btn :deep(.v-btn__overlay) {
  display: none !important;
}

/* Loading spinner styling for collections-action-btn */
.collections-action-btn :deep(.v-btn__loader) {
  color: #ffffff !important;
}

.collections-action-btn :deep(.v-btn__loader .v-progress-circular) {
  color: #ffffff !important;
}

.collections-action-btn :deep(.v-btn__loader .v-progress-circular__overlay) {
  stroke: #ffffff !important;
}
/* Error Alert Styling */
.error-alert-detailed {
  border-left: 4px solid #d32f2f !important;
  background-color: #ffebee !important;
}

.error-message-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  word-break: break-word !important;
  white-space: pre-wrap !important;
}

/* Ensure form fields are properly styled */
.field-input-group {
  margin-bottom: 16px;
}

.field-inputs-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .field-inputs-row {
    grid-template-columns: 1fr;
  }
}

/* Fix any layout issues with the form */
.form-card-content {
  min-height: 200px;
}

.fields-section {
  margin-top: 32px;
}

.fields-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .fields-header {
    flex-direction: column;
  }
  
  .fields-header > div:first-child {
    width: 100%;
  }
  
  .add-field-button-container {
    width: 100%;
  }
  
  .add-field-button-container .collections-action-btn {
    width: 100%;
  }
}
</style>
