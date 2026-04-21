<template>
  <div class="add-document-view">
    <div class="add-document-container">
      <div class="collections-header add-document-page-header">
        <div class="collections-title-section add-document-header">
          <div class="add-document-header-copy">
            <button
              type="button"
              class="add-document-breadcrumb"
              @click="goBack"
            >
              <div class="add-document-kicker">Add Document</div>
              <div class="add-document-collection-line">
                <v-icon size="18">mdi-folder</v-icon>
                <span>{{ collectionName || 'Collection' }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="add-document-layout">
        <div class="add-document-content">
          <div class="add-document-panel">
            <v-alert
              v-if="schemaError"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              icon="mdi-alert-circle"
              @click:close="schemaError = null"
            >
              <div class="font-weight-bold mb-1">Could not load schema</div>
              <div>{{ schemaError }}</div>
            </v-alert>

            <v-alert
              v-if="submitError"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              icon="mdi-alert-circle"
              @click:close="submitError = null"
            >
              <div class="font-weight-bold mb-1">Could not add document</div>
              <div>{{ submitError }}</div>
            </v-alert>

            <v-alert
              v-if="submitSuccess"
              type="success"
              variant="tonal"
              class="mb-4"
              closable
              icon="mdi-check-circle"
              @click:close="submitSuccess = ''"
            >
              <div class="font-weight-bold mb-1">Document added</div>
              <div>{{ submitSuccess }}</div>
            </v-alert>

            <div class="add-document-schema-block">
              <div class="add-document-section-title">
                Schema
              </div>
              <div class="add-document-section-copy">
                JSON is the only supported input on this page. The editor is prefilled from the collection schema.
              </div>

              <div v-if="schemaLoading" class="add-document-loading">
                <v-progress-circular indeterminate size="20" width="2" color="primary" />
                <span>Loading schema…</span>
              </div>

              <div v-else class="add-document-schema-preview">
                <pre>{{ schemaPreview }}</pre>
              </div>
            </div>

            <div class="add-document-editor-block">
              <div class="add-document-section-title">
                JSON
              </div>
              <div class="add-document-section-copy">
                Edit the payload below, then submit it as a single document object.
              </div>

              <textarea
                v-model="jsonBody"
                class="add-document-json-textarea"
                spellcheck="false"
                autocapitalize="off"
                autocomplete="off"
                autocorrect="off"
              ></textarea>
            </div>

            <div class="add-document-actions">
              <button
                type="button"
                class="add-document-secondary-btn"
                @click="resetToSchemaTemplate"
                :disabled="submitting || schemaLoading"
              >
                Reset to Schema
              </button>
              <button
                type="button"
                class="add-document-primary-btn"
                @click="submitDocument"
                :disabled="submitting || schemaLoading || !collectionName"
              >
                <span>{{ submitting ? 'Adding…' : 'Add Doc' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { buildApiUrl, getBaseUrlValue, shouldUseProxy } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const route = useRoute()
const router = useRouter()
const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })

const collectionName = computed(() => String(route.params.name || '').trim())

const schemaLoading = ref(false)
const schemaError = ref(null)
const submitError = ref(null)
const submitSuccess = ref('')
const submitting = ref(false)
const collectionSchema = ref(null)
const jsonBody = ref('{\n}')

const normalizeField = (field) => {
  if (typeof field === 'string') {
    return { name: field, type: 'string' }
  }

  if (field && typeof field === 'object') {
    return {
      name: String(field.name || '').trim(),
      type: String(field.type || 'string').trim().toLowerCase()
    }
  }

  return { name: '', type: 'string' }
}

const emptyValueForType = (type) => {
  switch (type) {
    case 'string':
    case 'text':
    case 'varchar':
    case 'keyword':
      return ''
    case 'bool':
    case 'boolean':
      return false
    case 'int':
    case 'integer':
    case 'long':
    case 'float':
    case 'double':
    case 'number':
    case 'decimal':
      return null
    case 'array':
    case 'list':
      return []
    case 'object':
    case 'json':
      return {}
    default:
      return null
  }
}

const schemaTemplateObject = computed(() => {
  const schema = collectionSchema.value
  const fields = Array.isArray(schema?.fields) ? schema.fields : []

  if (!fields.length) {
    return { id: '', title: '', content: '' }
  }

  const result = {}

  fields
    .map(normalizeField)
    .filter((field) => field.name)
    .forEach((field) => {
      result[field.name] = emptyValueForType(field.type)
    })

  if (!Object.prototype.hasOwnProperty.call(result, 'id')) {
    result.id = ''
  }

  return result
})

const schemaPreview = computed(() => JSON.stringify(schemaTemplateObject.value, null, 2))

const resetToSchemaTemplate = () => {
  jsonBody.value = schemaPreview.value
  submitError.value = null
  submitSuccess.value = ''
}

const goBack = () => {
  if (!collectionName.value) {
    router.push('/collections')
    return
  }

  router.push(`/collections/${encodeURIComponent(collectionName.value)}`)
}

const loadSchema = async () => {
  if (!collectionName.value) {
    schemaError.value = 'Missing collection name'
    return
  }

  schemaLoading.value = true
  schemaError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value)
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}`)
    const response = await axios.get(url, { timeout: 5000 })

    collectionSchema.value = response.data
    resetToSchemaTemplate()
  } catch (err) {
    schemaError.value = extractSafeErrorMessage(err, 'Failed to load schema')
    collectionSchema.value = null
    jsonBody.value = '{\n}'
  } finally {
    schemaLoading.value = false
  }
}

const submitDocument = async () => {
  if (!collectionName.value) {
    submitError.value = 'Missing collection name'
    return
  }

  submitError.value = null
  submitSuccess.value = ''

  let payload

  try {
    payload = JSON.parse(jsonBody.value)
  } catch (err) {
    submitError.value = `Invalid JSON: ${err.message}`
    return
  }

  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    submitError.value = 'JSON payload must be a single document object'
    return
  }

  submitting.value = true

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value)
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/documents`)

    const response = await axios.post(url, payload, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const documentId = response?.data?.id || payload.id || 'Document'
    submitSuccess.value = `${documentId} added to ${collectionName.value}.`
    toast.success(`Document added to ${collectionName.value}`, 'Add Document')
  } catch (err) {
    submitError.value = extractSafeErrorMessage(err, 'Failed to add document')
    toast.error(submitError.value, 'Add Document Failed')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadSchema()
})
</script>

<style scoped>
.add-document-view {
  min-height: 100%;
}

.add-document-container {
  max-width: 1040px;
  margin: 0 auto;
}

.add-document-page-header {
  margin-bottom: 20px;
}

.add-document-header-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-document-breadcrumb {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.add-document-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #111827;
}

.add-document-collection-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #000000;
}

.add-document-layout {
  display: block;
}

.add-document-content {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.add-document-panel {
  border-radius: 18px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  padding: 24px;
}

.add-document-schema-block,
.add-document-editor-block {
  margin-bottom: 20px;
}

.add-document-section-title {
  font-size: 14px;
  font-weight: 800;
  color: #000000;
  margin-bottom: 6px;
}

.add-document-section-copy {
  font-size: 13px;
  line-height: 1.5;
  color: #000000;
  margin-bottom: 12px;
}

.add-document-loading {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #000000;
}

.add-document-schema-preview {
  border-radius: 12px;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  padding: 14px 16px;
}

.add-document-schema-preview pre {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #000000;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
}

.add-document-json-textarea {
  width: 100%;
  min-height: 420px;
  resize: vertical;
  border: 1px solid #94a3b8;
  border-radius: 14px;
  background: #e5e7eb;
  padding: 16px 18px;
  font-size: 13px;
  line-height: 1.65;
  color: #000000;
  outline: none;
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.add-document-json-textarea:focus {
  border-color: #64748b;
  background: #ffffff;
}

.add-document-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.add-document-secondary-btn,
.add-document-primary-btn {
  min-height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  line-height: 32px;
  font-family: Inter, Helvetica, sans-serif;
  cursor: pointer;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease;
}

.add-document-secondary-btn {
  background: #d1d5db;
  color: #000000;
}

.add-document-primary-btn {
  color: #ffffff;
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%);
  box-shadow:
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  transform: perspective(1000px) translateZ(0);
}

.add-document-primary-btn:hover {
  color: #ffffff;
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%);
  box-shadow:
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  transform: perspective(1000px) translateZ(0);
  text-decoration: underline;
}

.add-document-primary-btn:active {
  background: linear-gradient(135deg, #032a4f 0%, #021d3a 50%, #011528 100%);
  box-shadow:
    0 2px 4px rgba(4, 48, 97, 0.4),
    0 1px 2px rgba(4, 48, 97, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3);
  transform: perspective(1000px) translateY(0) translateZ(0);
}

.add-document-primary-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  pointer-events: none;
}

.add-document-secondary-btn:hover {
  transform: translateY(-1px);
}

.add-document-secondary-btn:disabled,
.add-document-primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .add-document-panel {
    padding: 18px;
  }

  .add-document-json-textarea {
    min-height: 340px;
  }

  .add-document-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>
