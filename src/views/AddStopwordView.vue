<template>
  <div class="add-stopword-view">
    <div class="add-stopword-container">
      <div class="collections-header add-stopword-page-header">
        <div class="collections-title-section add-stopword-header">
          <div class="add-stopword-header-copy">
            <button
              type="button"
              class="add-stopword-breadcrumb"
              @click="handleCollectionClick"
              @contextmenu.stop
            >
              <div class="add-stopword-kicker">{{ scopeKicker }}</div>
              <div class="add-stopword-collection-line">
                <v-icon size="18">{{ scopeIcon }}</v-icon>
                <span>{{ scopeLabel }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="add-stopword-layout">
        <div class="add-stopword-content">
          <div class="add-stopword-panel">
            <v-alert
              v-if="formError"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              icon="mdi-alert-circle"
              @click:close="formError = null"
            >
              <div class="font-weight-bold mb-1">Could not add stopword</div>
              <div>{{ formError }}</div>
            </v-alert>

            <div class="add-stopword-form">
              <div class="add-stopword-row-simple">
                <div class="add-stopword-inline-label">Stopwords</div>
                <div class="add-stopword-list-compact">
                  <div
                    v-for="(term, index) in form.stopwords"
                    :key="`stopword-row-${index}`"
                    class="add-stopword-input-line"
                  >
                    <v-text-field
                      v-model="form.stopwords[index]"
                      variant="outlined"
                      density="compact"
                      hide-details="auto"
                      placeholder=""
                      prepend-inner-icon="mdi-text-box-outline"
                      class="add-stopword-input"
                    />
                    <v-btn
                      v-if="form.stopwords.length > 1"
                      icon
                      variant="text"
                      size="small"
                      color="error"
                      class="add-stopword-row-remove"
                      aria-label="Remove stopword"
                      title="Remove stopword"
                      @click="removeStopwordField(index)"
                    >
                      <v-icon size="18">mdi-close</v-icon>
                    </v-btn>
                  </div>
                </div>
                <div class="add-stopword-inline-actions">
                  <button
                    type="button"
                    class="add-stopword-add-row-btn"
                    @click="addStopwordField"
                  >
                    <v-icon size="16">mdi-plus</v-icon>
                    <span>Add another</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="add-stopword-actions">
              <div class="add-stopword-actions-group">
                <button
                  type="button"
                  class="add-stopword-cancel-btn"
                  @click="goBack"
                  :disabled="submitting"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="add-stopword-primary-btn"
                  :disabled="!canSubmit || submitting"
                  @click="submitStopwords"
                >
                  <span>Add Stopword</span>
                </button>
              </div>
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
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const route = useRoute()
const router = useRouter()
const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })

const collectionName = computed(() => route.params.name || '')
const isGlobalScope = computed(() => route.path.startsWith('/globals'))
const scopeLabel = computed(() => isGlobalScope.value ? 'Globals' : collectionName.value)
const scopeKicker = computed(() => isGlobalScope.value ? 'Add Global Stopword' : 'Add Stopword')
const scopeIcon = computed(() => isGlobalScope.value ? 'mdi-earth' : 'mdi-folder')

const form = ref({
  stopwords: ['']
})
const submitting = ref(false)
const formError = ref(null)
const existingStopwords = ref([])
const loadingExisting = ref(false)

const parsedStopwords = computed(() => {
  const seen = new Set()
  return (Array.isArray(form.value.stopwords) ? form.value.stopwords : [])
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .filter(item => {
      const lowered = item.toLowerCase()
      if (seen.has(lowered)) {
        return false
      }
      seen.add(lowered)
      return true
    })
})

const existingStopwordSet = computed(() => new Set(
  existingStopwords.value
    .map(item => {
      if (typeof item === 'string') return item.trim().toLowerCase()
      if (item && typeof item === 'object') return String(item.word || item.text || '').trim().toLowerCase()
      return ''
    })
    .filter(Boolean)
))

const pendingStopwords = computed(() =>
  parsedStopwords.value.filter(item => !existingStopwordSet.value.has(item.toLowerCase()))
)

const canSubmit = computed(() => pendingStopwords.value.length > 0)

const handleCollectionClick = (event) => {
  if (event?.button && event.button !== 0) {
    return
  }
  goBack()
}

const goBack = () => {
  if (isGlobalScope.value) {
    router.push({ path: '/globals', query: { tab: 'stopwords' } })
    return
  }
  router.push(`/collections/${encodeURIComponent(collectionName.value)}/stopwords`)
}

const loadExistingStopwords = async () => {
  if (!isGlobalScope.value && !collectionName.value) {
    existingStopwords.value = []
    return []
  }

  loadingExisting.value = true
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value)
    const url = isGlobalScope.value
      ? buildApiUrl(baseUrlValue, useProxy, '/stopwords/global')
      : buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/stopwords`)
    const response = await axios.get(url, { timeout: 5000 })
    existingStopwords.value = Array.isArray(response.data?.stopwords) ? response.data.stopwords : []
    return existingStopwords.value
  } catch (err) {
    existingStopwords.value = []
    return []
  } finally {
    loadingExisting.value = false
  }
}

const resetForm = () => {
  form.value = {
    stopwords: ['']
  }
}

const addStopwordField = () => {
  form.value.stopwords.push('')
}

const removeStopwordField = (index) => {
  if (form.value.stopwords.length === 1) {
    form.value.stopwords[0] = ''
    return
  }

  form.value.stopwords.splice(index, 1)
}

const submitStopwords = async () => {
  if (!canSubmit.value) {
    formError.value = parsedStopwords.value.length > 0
      ? `All entered stopwords already exist in ${isGlobalScope.value ? 'globals' : 'this collection'}.`
      : 'At least one stopword is required.'
    return
  }

  submitting.value = true
  formError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value)
    const url = isGlobalScope.value
      ? buildApiUrl(baseUrlValue, useProxy, '/stopwords/global')
      : buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/stopwords`)

    for (const word of pendingStopwords.value) {
      await axios.post(url, {
        word
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      })
    }

    const count = pendingStopwords.value.length
    const refreshedStopwords = await loadExistingStopwords()
    const refreshedSet = new Set(
      refreshedStopwords
        .map(item => typeof item === 'string'
          ? item.trim().toLowerCase()
          : String(item?.word || item?.text || '').trim().toLowerCase())
        .filter(Boolean)
    )

    const missingWords = pendingStopwords.value.filter(word => !refreshedSet.has(word.toLowerCase()))
    if (missingWords.length > 0) {
      throw new Error('The server returned success, but the stopwords were not found after refresh.')
    }

    resetForm()
    toast.success(`${count} stopword${count === 1 ? '' : 's'} added to ${isGlobalScope.value ? 'globals' : collectionName.value}`, 'Stopwords Added')
    goBack()
  } catch (err) {
    formError.value = extractSafeErrorMessage(err, 'Failed to add stopwords')
    toast.error(formError.value, 'Add Failed')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadExistingStopwords()
})
</script>

<style scoped>
.add-stopword-view {
  padding: 32px 0 56px;
  background: transparent;
}

.add-stopword-container {
  max-width: 920px;
  margin: 0 auto;
  padding: 0 24px;
}

.collections-header {
  margin-bottom: 28px;
}

.add-stopword-page-header {
  padding-top: 8px;
}

.collections-title-text {
  font-size: 30px !important;
  font-weight: 600 !important;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: #0f172a !important;
}

.add-stopword-header {
  align-items: flex-start;
}

.add-stopword-header-copy {
  min-width: 0;
}

.add-stopword-breadcrumb {
  display: inline-grid;
  justify-items: start;
  gap: 8px;
  padding: 0;
  margin-bottom: 0;
  border: 0;
  background: transparent;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.add-stopword-kicker {
  color: #0f172a;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.add-stopword-collection-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.add-stopword-collection-line :deep(.v-icon) {
  color: #1976d2 !important;
}

.add-stopword-breadcrumb:hover {
  color: #0f172a;
}

.add-stopword-breadcrumb:hover .add-stopword-collection-line span {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.add-stopword-layout {
  max-width: 820px;
}

.add-stopword-content {
  padding: 0;
}

.add-stopword-panel {
  padding: 24px 28px 22px;
  border: 1px solid #e5ebf2;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.03);
}

.add-stopword-form {
  display: grid;
  gap: 12px;
  padding-bottom: 14px;
}

.add-stopword-row-simple {
  display: grid;
  gap: 6px;
}

.add-stopword-inline-label {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.add-stopword-list-compact {
  display: grid;
  gap: 8px;
}

.add-stopword-input-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.add-stopword-input {
  margin: 0;
  width: 100%;
}

.add-stopword-input :deep(.v-field) {
  border-radius: 14px !important;
  background: #f3f6f9 !important;
  border: 1px solid #dbe3ec !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7) !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease !important;
}

.add-stopword-input :deep(.v-field:hover) {
  background: #eef3f7 !important;
  border-color: #cfd8e3 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82) !important;
}

.add-stopword-input :deep(.v-field__input) {
  color: #0f172a !important;
  font-size: 14px !important;
  min-height: 48px !important;
  padding-top: 11px !important;
  padding-bottom: 11px !important;
  padding-left: 8px !important;
  padding-right: 16px !important;
}

.add-stopword-input :deep(.v-field--focused) {
  background: #f1f5f9 !important;
  border-color: #c7d2df !important;
  box-shadow: 0 0 0 3px rgba(203, 213, 225, 0.38) !important;
}

.add-stopword-input :deep(.v-field--focused .v-field__outline),
.add-stopword-input :deep(.v-field__outline),
.add-stopword-input :deep(.v-field__overlay) {
  --v-field-border-opacity: 0 !important;
  opacity: 0 !important;
  box-shadow: none !important;
}

.add-stopword-input :deep(input:focus),
.add-stopword-input :deep(input:focus-visible),
.add-stopword-input :deep(.v-field:focus-within) {
  outline: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

.add-stopword-input :deep(.v-field--variant-outlined),
.add-stopword-input :deep(.v-field--variant-outlined:hover),
.add-stopword-input :deep(.v-field--variant-outlined.v-field--focused) {
  box-shadow: none !important;
  outline: none !important;
}

.add-stopword-input :deep(.v-field__prepend-inner) {
  color: #64748b !important;
  padding-inline-start: 14px !important;
  padding-inline-end: 10px !important;
  opacity: 1 !important;
}

.add-stopword-input :deep(.v-field__prepend-inner .v-icon) {
  font-size: 17px !important;
}

.add-stopword-inline-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-left: 0;
  margin-top: 4px;
}

.add-stopword-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 10px;
  padding: 22px 0 0;
  border-top: 1px solid rgba(226, 232, 240, 0.95);
}

.add-stopword-actions-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.add-stopword-cancel-btn,
.add-stopword-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  font-family: Inter, Helvetica, sans-serif;
  letter-spacing: 0;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    opacity 0.18s ease;
}

.add-stopword-cancel-btn {
  padding: 0 16px;
  border: 1px solid #5f1f1f;
  border-radius: 12px;
  background: linear-gradient(180deg, #7a2626 0%, #5a1717 100%);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(88, 28, 28, 0.16);
}

.add-stopword-primary-btn {
  min-width: 132px;
  padding: 0 18px;
  border: 1px solid #d4deea;
  background: linear-gradient(180deg, #21486f 0%, #13395d 100%);
  color: #ffffff;
  box-shadow:
    0 6px 14px rgba(15, 52, 93, 0.12),
    0 2px 5px rgba(15, 23, 42, 0.08);
}

.add-stopword-add-row-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #3b82f6;
  box-shadow: none;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  font-family: Inter, Helvetica, sans-serif;
  letter-spacing: 0;
  transition: color 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
}

.add-stopword-cancel-btn:hover,
.add-stopword-primary-btn:hover,
.add-stopword-add-row-btn:hover {
  background: transparent;
  color: #2563eb;
  box-shadow: none;
  transform: none;
}

.add-stopword-cancel-btn:hover {
  background: linear-gradient(180deg, #8a2d2d 0%, #671b1b 100%);
  color: #ffffff;
  border-color: #6f2020;
  box-shadow: 0 6px 14px rgba(88, 28, 28, 0.18);
}

.add-stopword-primary-btn:hover {
  background: linear-gradient(180deg, #28527c 0%, #173f65 100%);
  color: #ffffff;
  box-shadow:
    0 8px 18px rgba(15, 52, 93, 0.14),
    0 3px 7px rgba(15, 23, 42, 0.1);
}

.add-stopword-primary-btn:active {
  background: linear-gradient(180deg, #173f65 0%, #11324f 100%);
  color: #ffffff;
  box-shadow:
    0 4px 10px rgba(15, 52, 93, 0.12),
    inset 0 1px 2px rgba(0, 0, 0, 0.12);
}

.add-stopword-cancel-btn:disabled,
.add-stopword-primary-btn:disabled,
.add-stopword-add-row-btn:disabled {
  opacity: 0.45;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.add-stopword-primary-btn:disabled {
  color: #94a3b8;
}

.add-stopword-row-remove {
  flex-shrink: 0;
  color: #94a3b8 !important;
}

.add-stopword-primary-btn :deep(.v-icon),
.add-stopword-add-row-btn :deep(.v-icon) {
  color: inherit;
  margin: 0 !important;
}

@media (max-width: 720px) {
  .add-stopword-view {
    padding: 20px 0 40px;
  }

  .add-stopword-container {
    padding: 0 16px;
  }

  .add-stopword-panel {
    padding: 20px 18px 18px;
    border-radius: 18px;
  }

  .collections-title-text {
    font-size: 24px !important;
  }

  .add-stopword-actions {
    padding: 12px 0 20px;
  }

  .add-stopword-actions-group {
    margin-left: auto;
  }
}
</style>
