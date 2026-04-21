<template>
  <div class="add-synonym-view">
    <div class="add-synonym-container">
      <div class="collections-header add-synonym-page-header">
        <div class="collections-title-section add-synonym-header">
          <div class="add-synonym-header-copy">
            <button
              type="button"
              class="add-synonym-breadcrumb"
              @click="handleCollectionClick"
              @contextmenu.stop
            >
              <div class="add-synonym-kicker">{{ scopeKicker }}</div>
              <div class="add-synonym-collection-line">
                <v-icon size="18">{{ scopeIcon }}</v-icon>
                <span>{{ scopeLabel }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="add-synonym-layout">
        <div class="add-synonym-content">
          <div class="add-synonym-panel">
            <v-alert
              v-if="formError"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              icon="mdi-alert-circle"
              @click:close="formError = null"
            >
              <div class="font-weight-bold mb-1">Could not add synonym</div>
              <div>{{ formError }}</div>
            </v-alert>

            <div class="add-synonym-form">
              <div class="add-synonym-row-simple">
                <div class="add-synonym-inline-label">Root term</div>
                <div class="add-synonym-input-line add-synonym-input-line--single">
                  <v-text-field
                    v-model="form.root"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    placeholder=""
                    prepend-inner-icon="mdi-label"
                    class="add-synonym-input"
                  />
                </div>
              </div>

              <div class="add-synonym-row-simple">
                <div class="add-synonym-inline-label">Synonyms</div>
                <div class="add-synonym-list-compact">
                  <div
                    v-for="(term, index) in form.synonyms"
                    :key="`synonym-row-${index}`"
                    class="add-synonym-input-line"
                  >
                    <v-text-field
                      v-model="form.synonyms[index]"
                      variant="outlined"
                      density="compact"
                      hide-details="auto"
                      placeholder=""
                      prepend-inner-icon="mdi-tag"
                      class="add-synonym-input"
                    />
                    <v-btn
                      v-if="form.synonyms.length > 1"
                      icon
                      variant="text"
                      size="small"
                      color="error"
                      class="add-synonym-row-remove"
                      aria-label="Remove synonym"
                      title="Remove synonym"
                      @click="removeSynonymField(index)"
                    >
                      <v-icon size="18">mdi-close</v-icon>
                    </v-btn>
                  </div>
                </div>
                <div class="add-synonym-inline-actions">
                  <button
                    type="button"
                    class="add-synonym-add-row-btn"
                    @click="addSynonymField"
                  >
                    <v-icon size="16">mdi-plus</v-icon>
                    <span>Add another</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="add-synonym-actions">
              <div class="add-synonym-actions-group">
                <button
                  type="button"
                  class="add-synonym-cancel-btn"
                  @click="goBack"
                  :disabled="submitting"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="add-synonym-primary-btn"
                  :disabled="!canSubmit"
                  @click="submitSynonym"
                >
                  <span>Add Synonym</span>
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
const scopeKicker = computed(() => isGlobalScope.value ? 'Add Global Synonym' : 'Add Synonyms')
const scopeIcon = computed(() => isGlobalScope.value ? 'mdi-earth' : 'mdi-folder')

const form = ref({
  root: '',
  synonyms: ['']
})
const submitting = ref(false)
const formError = ref(null)
const existingSynonyms = ref([])
const existingStopwords = ref([])
const loadingExisting = ref(false)

const normalizedRoot = computed(() => form.value.root.trim())
const slugifySynonymId = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '_')
  .replace(/^_+|_+$/g, '')

const generatedId = computed(() => {
  const baseId = slugifySynonymId(normalizedRoot.value) || 'synonym_group'
  const existingIds = new Set(
    existingSynonyms.value
      .map(item => String(item?.id || '').trim())
      .filter(Boolean)
  )

  if (!existingIds.has(baseId)) {
    return baseId
  }

  let suffix = 2
  let candidate = `${baseId}_${suffix}`
  while (existingIds.has(candidate)) {
    suffix += 1
    candidate = `${baseId}_${suffix}`
  }

  return candidate
})

const parsedSynonyms = computed(() => {
  const seen = new Set()
  return (Array.isArray(form.value.synonyms) ? form.value.synonyms : [])
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

const conflictingStopwordTerms = computed(() => {
  const candidates = [normalizedRoot.value, ...parsedSynonyms.value]
  const seen = new Set()

  return candidates
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .filter(item => {
      const lowered = item.toLowerCase()
      if (seen.has(lowered)) {
        return false
      }
      seen.add(lowered)
      return existingStopwordSet.value.has(lowered)
    })
})

const duplicateRootTerms = computed(() => {
  const root = normalizedRoot.value.toLowerCase()
  if (!root) return []

  return parsedSynonyms.value.filter(item => item.toLowerCase() === root)
})

const canSubmit = computed(() =>
  normalizedRoot.value.length > 0 &&
  parsedSynonyms.value.length > 0 &&
  conflictingStopwordTerms.value.length === 0 &&
  duplicateRootTerms.value.length === 0
)

const handleCollectionClick = (event) => {
  if (event?.button && event.button !== 0) {
    return
  }
  goBack()
}

const goBack = () => {
  if (isGlobalScope.value) {
    router.push({ path: '/globals', query: { tab: 'synonyms' } })
    return
  }
  router.push(`/collections/${encodeURIComponent(collectionName.value)}/synonyms`)
}

const loadExistingSynonyms = async () => {
  if (!isGlobalScope.value && !collectionName.value) {
    existingSynonyms.value = []
    return []
  }

  loadingExisting.value = true
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value)
    const url = isGlobalScope.value
      ? buildApiUrl(baseUrlValue, useProxy, '/synonyms/global')
      : buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/synonyms`)
    const response = await axios.get(url, { timeout: 5000 })
    existingSynonyms.value = Array.isArray(response.data?.synonyms) ? response.data.synonyms : []
    return existingSynonyms.value
  } catch (err) {
    existingSynonyms.value = []
    return []
  } finally {
    loadingExisting.value = false
  }
}

const loadExistingStopwords = async () => {
  if (!isGlobalScope.value && !collectionName.value) {
    existingStopwords.value = []
    return []
  }

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
  }
}

const resetForm = () => {
  form.value = {
    root: '',
    synonyms: ['']
  }
}

const addSynonymField = () => {
  form.value.synonyms.push('')
}

const removeSynonymField = (index) => {
  if (form.value.synonyms.length === 1) {
    form.value.synonyms[0] = ''
    return
  }

  form.value.synonyms.splice(index, 1)
}

const submitSynonym = async () => {
  if (!canSubmit.value) {
    formError.value = duplicateRootTerms.value.length > 0
      ? 'Root term cannot also appear in synonyms.'
      : conflictingStopwordTerms.value.length > 0
      ? `Synonym terms cannot match configured stopwords: ${conflictingStopwordTerms.value.join(', ')}.`
      : 'Root term and at least one synonym are required.'
    return
  }

  submitting.value = true
  formError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const synonymId = generatedId.value
    const encodedId = encodeURIComponent(synonymId)
    const encodedCollection = encodeURIComponent(collectionName.value)
    const url = isGlobalScope.value
      ? buildApiUrl(baseUrlValue, useProxy, `/synonyms/global/${encodedId}`)
      : buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/synonyms/${encodedId}`)

    await axios.post(url, {
      root: normalizedRoot.value,
      synonyms: parsedSynonyms.value
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })

    const addedRoot = normalizedRoot.value
    const refreshedSynonyms = await loadExistingSynonyms()
    const wasPersisted = refreshedSynonyms.some((item) => String(item?.id || '').trim() === synonymId)

    if (!wasPersisted) {
      throw new Error('The server returned success, but the synonym was not found after refresh.')
    }

    resetForm()
    toast.success(`Synonym "${addedRoot}" added to ${isGlobalScope.value ? 'globals' : collectionName.value}`, 'Synonym Added')
    goBack()
  } catch (err) {
    formError.value = extractSafeErrorMessage(err, 'Failed to add synonym')
    toast.error(formError.value, 'Add Failed')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadExistingSynonyms()
  loadExistingStopwords()
})
</script>

<style scoped>
.add-synonym-view {
  padding: 32px 0 56px;
  background: transparent;
}

.add-synonym-container {
  max-width: 920px;
  margin: 0 auto;
  padding: 0 24px;
}

.collections-header {
  margin-bottom: 28px;
}

.add-synonym-page-header {
  padding-top: 8px;
}

.collections-title-text {
  font-size: 30px !important;
  font-weight: 600 !important;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: #0f172a !important;
}

.add-synonym-header {
  align-items: flex-start;
}

.add-synonym-header-copy {
  min-width: 0;
}

.add-synonym-breadcrumb {
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

.add-synonym-collection-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.add-synonym-collection-line :deep(.v-icon) {
  color: #1976d2 !important;
}

.add-synonym-breadcrumb:hover {
  color: #0f172a;
}

.add-synonym-breadcrumb:hover .add-synonym-collection-line span {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.add-synonym-kicker {
  color: #0f172a;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.add-synonym-layout {
  max-width: 820px;
}

.add-synonym-content {
  padding: 0;
}

.add-synonym-panel {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.add-synonym-form {
  display: grid;
  gap: 16px;
  padding-bottom: 0;
}

.add-synonym-row-simple {
  display: grid;
  gap: 6px;
}

.add-synonym-input {
  margin: 0;
  width: 100%;
}

.add-synonym-inline-label {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.add-synonym-list-compact {
  display: grid;
  gap: 8px;
}

.add-synonym-input-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.add-synonym-input-line--single {
  grid-template-columns: minmax(0, 1fr);
}

.add-synonym-input :deep(.v-field) {
  border-radius: 10px !important;
  background: #f1f5f9 !important;
  border: 1px solid #d7e0ea !important;
  box-shadow: none !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease !important;
}

.add-synonym-input :deep(.v-field:hover) {
  background: #eef2f7 !important;
  border-color: #c9d5e2 !important;
  box-shadow: none !important;
}

.add-synonym-input :deep(.v-field__input) {
  color: #0f172a !important;
  font-size: 14px !important;
  min-height: 48px !important;
  padding-top: 11px !important;
  padding-bottom: 11px !important;
  padding-left: 8px !important;
  padding-right: 16px !important;
}

.add-synonym-input :deep(.v-field--focused) {
  background: #f1f5f9 !important;
  border-color: #c5d0dc !important;
  box-shadow: 0 0 0 2px rgba(203, 213, 225, 0.32) !important;
}

.add-synonym-input :deep(.v-field--focused .v-field__outline),
.add-synonym-input :deep(.v-field__outline),
.add-synonym-input :deep(.v-field__overlay) {
  --v-field-border-opacity: 0 !important;
  opacity: 0 !important;
  box-shadow: none !important;
}

.add-synonym-input :deep(input:focus),
.add-synonym-input :deep(input:focus-visible),
.add-synonym-input :deep(.v-field:focus-within) {
  outline: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

.add-synonym-input :deep(.v-field--variant-outlined),
.add-synonym-input :deep(.v-field--variant-outlined:hover),
.add-synonym-input :deep(.v-field--variant-outlined.v-field--focused) {
  box-shadow: none !important;
  outline: none !important;
}

.add-synonym-input :deep(.v-field__prepend-inner) {
  color: #64748b !important;
  padding-inline-start: 14px !important;
  padding-inline-end: 10px !important;
  opacity: 1 !important;
}

.add-synonym-input :deep(.v-field__prepend-inner .v-icon) {
  font-size: 17px !important;
}

.add-synonym-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 18px;
  padding: 0;
  border-top: 0;
}

.add-synonym-actions-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.add-synonym-cancel-btn,
.add-synonym-primary-btn {
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

.add-synonym-cancel-btn {
  padding: 0 16px;
  border: 1px solid #d7e0ea;
  border-radius: 10px;
  background: #ffffff;
  color: #334155;
  box-shadow: none;
}

.add-synonym-primary-btn {
  min-width: 132px;
  padding: 0 18px;
  border: 1px solid #d4deea;
  background: #13395d;
  color: #ffffff;
  box-shadow: none;
}

.add-synonym-row-remove {
  flex-shrink: 0;
  color: #94a3b8 !important;
}

.add-synonym-inline-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-left: 0;
  margin-top: 4px;
}

.add-synonym-add-row-btn {
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

.add-synonym-cancel-btn:hover,
.add-synonym-primary-btn:hover,
.add-synonym-add-row-btn:hover {
  background: transparent;
  color: #2563eb;
  box-shadow: none;
  transform: none;
}

.add-synonym-cancel-btn:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #cbd5e1;
  box-shadow: none;
}

.add-synonym-primary-btn:hover {
  background: #17456f;
  color: #ffffff;
  box-shadow: none;
}

.add-synonym-primary-btn:active {
  background: #0f3352;
  color: #ffffff;
  box-shadow: none;
}

.add-synonym-primary-btn:disabled,
.add-synonym-add-row-btn:disabled,
.add-synonym-cancel-btn:disabled {
  opacity: 0.45;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.add-synonym-primary-btn:disabled {
  color: #94a3b8;
}

.add-synonym-primary-btn :deep(.v-icon),
.add-synonym-add-row-btn :deep(.v-icon) {
  color: inherit;
  margin: 0 !important;
}

@media (max-width: 700px) {
  .add-synonym-view {
    padding: 20px 0 40px;
  }

  .add-synonym-container {
    padding: 0 16px;
  }

  .add-synonym-panel {
    padding: 0;
    border-radius: 0;
  }

  .collections-title-text {
    font-size: 24px !important;
  }

  .add-synonym-actions {
    padding: 0 0 20px;
  }

}
</style>
