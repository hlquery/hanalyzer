<template>
  <div class="globals-view">
    <div class="collections-header">
      <div class="collections-title-section">
        <div>
          <h1 class="collections-title-text">
            <v-icon icon="mdi-earth" size="20" class="collection-dir-icon"></v-icon>
            <span class="collection-name-label">Globals</span>
          </h1>
          <div class="collections-pagination-info-top">
            Shared stopwords and synonyms applied across all collections
          </div>
        </div>
      </div>
    </div>

    <div class="collection-tabs-container mb-2">
      <v-tabs v-model="activeTab" class="collection-tabs" bg-color="transparent">
        <v-tab value="synonyms" class="collection-tab">
          <span class="tab-icon-shell tab-icon-shell--synonyms">
            <v-icon size="18">mdi-link-variant</v-icon>
          </span>
          <span class="tab-label-stack">
            <span class="tab-text">Synonyms</span>
            <span class="tab-count">{{ synonyms.length }}</span>
          </span>
        </v-tab>
        <v-tab value="stopwords" class="collection-tab">
          <span class="tab-icon-shell tab-icon-shell--stopwords">
            <v-icon size="18">mdi-filter-remove-outline</v-icon>
          </span>
          <span class="tab-label-stack">
            <span class="tab-text">Stopwords</span>
            <span class="tab-count">{{ stopwordRows.length }}</span>
          </span>
        </v-tab>
      </v-tabs>
    </div>

    <div v-if="activeTab === 'synonyms'" class="globals-panel">
      <div class="globals-panel-header">
        <div class="globals-panel-heading">
          <div class="globals-panel-title">Global Synonyms</div>
          <div class="globals-panel-description">Root terms and variants shared by every collection.</div>
        </div>
        <div class="collections-header-actions globals-panel-actions">
          <v-btn
            variant="flat"
            size="small"
            class="collections-action-btn create-collection-header-btn"
            prepend-icon="mdi-plus"
            @click="toggleInlineSynonymForm"
          >
            {{ showInlineSynonymForm ? 'Close Form' : 'Add Synonym' }}
          </v-btn>
          <v-btn
            variant="flat"
            size="small"
            class="collections-action-btn create-collection-header-btn"
            prepend-icon="mdi-refresh"
            :loading="synonymsLoading"
            @click="loadSynonyms"
          >
            Refresh
          </v-btn>
        </div>
      </div>

      <v-alert v-if="synonymsError" type="error" variant="tonal" class="mb-4" closable @click:close="synonymsError = null">
        {{ synonymsError }}
      </v-alert>

      <v-expand-transition>
        <v-card v-if="showInlineSynonymForm" class="mb-4 collections-card card-premium globals-inline-form-card">
          <v-card-text class="globals-inline-form-body">
            <div class="globals-inline-form-grid">
              <v-text-field
                v-model="inlineSynonymForm.root"
                label="Root term"
                variant="outlined"
                density="compact"
                hide-details="auto"
                prepend-inner-icon="mdi-label"
                class="globals-inline-input"
              />
              <v-text-field
                v-model="inlineSynonymForm.synonyms"
                label="Synonyms"
                variant="outlined"
                density="compact"
                hide-details="auto"
                prepend-inner-icon="mdi-tag-multiple"
                hint="Comma-separated values"
                persistent-hint
                class="globals-inline-input"
              />
            </div>
            <v-alert v-if="inlineSynonymError" type="error" variant="tonal" class="mt-4" closable @click:close="inlineSynonymError = null">
              {{ inlineSynonymError }}
            </v-alert>
          </v-card-text>
          <v-card-actions class="globals-inline-form-actions">
            <v-spacer></v-spacer>
            <v-btn variant="flat" size="small" class="globals-inline-cancel-btn collections-action-btn globals-inline-cancel-btn--danger" @click="closeInlineSynonymForm" :disabled="addingSynonym">Cancel</v-btn>
            <v-btn color="primary" variant="flat" size="small" class="globals-inline-submit-btn collections-action-btn create-collection-header-btn" @click="submitInlineSynonym" :loading="addingSynonym">Add Synonym</v-btn>
          </v-card-actions>
        </v-card>
      </v-expand-transition>

      <v-card v-if="synonymsLoading" class="mb-card">
        <v-card-text class="text-center py-8">
          <v-progress-circular indeterminate color="primary" class="mb-3"></v-progress-circular>
          <div>Loading global synonyms...</div>
        </v-card-text>
      </v-card>

      <v-card v-else-if="synonyms.length === 0" class="mb-card card-premium globals-empty-card">
        <v-card-text class="globals-empty-state">
          <div class="globals-empty-icon globals-empty-icon--synonyms">
            <v-icon size="30">mdi-link-variant</v-icon>
          </div>
          <div class="globals-empty-title">No global synonyms configured</div>
          <div class="globals-empty-copy">Add root terms and variants to standardize search language across collections.</div>
          <v-btn
            variant="flat"
            size="small"
            class="collections-action-btn create-collection-header-btn mt-4"
            prepend-icon="mdi-plus"
            @click="toggleInlineSynonymForm"
          >
            Create Synonym
          </v-btn>
        </v-card-text>
      </v-card>

      <v-card v-else class="collections-card card-premium globals-table-card">
        <v-data-table
          :headers="synonymHeaders"
          :items="synonyms"
          item-value="id"
          class="collections-table globals-table"
          hide-default-footer
        >
          <template v-slot:item.root="{ item }">
            <span class="globals-primary-cell">{{ getItemRow(item).root || '-' }}</span>
          </template>
          <template v-slot:item.synonyms="{ item }">
            <div class="synonyms-list">
              <span
                v-for="(term, index) in getItemRow(item).synonyms || []"
                :key="`syn-${index}-${term}`"
                class="synonym-pill"
              >
                {{ term }}
              </span>
              <span v-if="!getItemRow(item).synonyms || getItemRow(item).synonyms.length === 0" class="text-grey-darken-1">-</span>
            </div>
          </template>
          <template v-slot:item.actions="{ item }">
              <v-btn icon size="x-small" variant="text" class="global-delete-icon-btn" @click="openDeleteSynonymDialog(getItemRow(item))">
                <v-icon size="18" class="global-delete-icon">mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
      </v-card>
    </div>

    <div v-if="activeTab === 'stopwords'" class="globals-panel">
      <div class="globals-panel-header">
        <div class="globals-panel-heading">
          <div class="globals-panel-title">Global Stopwords</div>
          <div class="globals-panel-description">Terms ignored across the whole server during lexical filtering.</div>
        </div>
        <div class="collections-header-actions globals-panel-actions">
          <v-btn
            variant="flat"
            size="small"
            class="collections-action-btn create-collection-header-btn"
            prepend-icon="mdi-plus"
            @click="toggleInlineStopwordForm"
          >
            {{ showInlineStopwordForm ? 'Close Form' : 'Add Stopword' }}
          </v-btn>
          <v-btn
            variant="flat"
            size="small"
            class="collections-action-btn create-collection-header-btn"
            prepend-icon="mdi-refresh"
            :loading="stopwordsLoading"
            @click="loadStopwords"
          >
            Refresh
          </v-btn>
        </div>
      </div>

      <v-alert v-if="stopwordsError" type="error" variant="tonal" class="mb-4" closable @click:close="stopwordsError = null">
        {{ stopwordsError }}
      </v-alert>

      <v-expand-transition>
        <v-card v-if="showInlineStopwordForm" class="mb-4 collections-card card-premium globals-inline-form-card">
          <v-card-text class="globals-inline-form-body">
            <div class="globals-inline-form-grid">
              <v-text-field
                v-model="inlineStopwordForm.word"
                label="Stopword"
                variant="outlined"
                density="compact"
                hide-details="auto"
                prepend-inner-icon="mdi-text-box-outline"
                class="globals-inline-input"
              />
            </div>
            <v-alert v-if="inlineStopwordError" type="error" variant="tonal" class="mt-4" closable @click:close="inlineStopwordError = null">
              {{ inlineStopwordError }}
            </v-alert>
          </v-card-text>
          <v-card-actions class="globals-inline-form-actions">
            <v-spacer></v-spacer>
            <v-btn variant="flat" size="small" class="globals-inline-cancel-btn collections-action-btn globals-inline-cancel-btn--danger" @click="closeInlineStopwordForm" :disabled="addingStopword">Cancel</v-btn>
            <v-btn color="primary" variant="flat" size="small" class="globals-inline-submit-btn collections-action-btn create-collection-header-btn" @click="submitInlineStopword" :loading="addingStopword">Add Stopword</v-btn>
          </v-card-actions>
        </v-card>
      </v-expand-transition>

      <v-card v-if="stopwordsLoading" class="mb-card">
        <v-card-text class="text-center py-8">
          <v-progress-circular indeterminate color="primary" class="mb-3"></v-progress-circular>
          <div>Loading global stopwords...</div>
        </v-card-text>
      </v-card>

      <v-card v-else-if="stopwords.length === 0" class="mb-card card-premium globals-empty-card">
        <v-card-text class="globals-empty-state">
          <div class="globals-empty-icon globals-empty-icon--stopwords">
            <v-icon size="30">mdi-filter-remove-outline</v-icon>
          </div>
          <div class="globals-empty-title">No global stopwords configured</div>
          <div class="globals-empty-copy">Keep this list for high-frequency words that should be ignored across the whole server.</div>
          <v-btn
            variant="flat"
            size="small"
            class="collections-action-btn create-collection-header-btn mt-4"
            prepend-icon="mdi-plus"
            @click="toggleInlineStopwordForm"
          >
            Create Stopword
          </v-btn>
        </v-card-text>
      </v-card>

      <v-card v-else class="collections-card card-premium globals-table-card">
        <v-data-table
          :headers="stopwordHeaders"
          :items="stopwordRows"
          item-value="word"
          class="collections-table globals-table"
          hide-default-footer
        >
          <template v-slot:item.word="{ item }">
            <span class="globals-primary-cell">{{ getItemRow(item).word }}</span>
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn icon size="x-small" variant="text" class="global-delete-icon-btn" @click="openDeleteStopwordDialog(getItemRow(item).word)">
              <v-icon size="18" class="global-delete-icon">mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </div>

  <v-dialog v-model="showDeleteSynonymDialog" max-width="480" persistent>
    <v-card class="simple-delete-dialog-card" elevation="0">
      <v-card-title class="simple-delete-dialog-header">
        <div class="simple-delete-dialog-header-copy">
          <div class="simple-delete-dialog-kicker">Confirm removal</div>
          <div class="simple-delete-dialog-title-row">
            <v-icon icon="mdi-swap-horizontal" size="18" class="simple-delete-dialog-title-icon mr-2"></v-icon>
            <span class="simple-delete-dialog-title">Delete Global Synonym</span>
          </div>
        </div>
        <v-btn icon variant="text" @click="closeDeleteSynonymDialog" color="white">
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="simple-delete-dialog-body">
        <p class="simple-delete-dialog-copy">Remove this synonym group from globals?</p>
        <div v-if="synonymToDelete" class="simple-delete-dialog-preview">
          <div class="simple-delete-dialog-label">Root term</div>
          <div class="simple-delete-dialog-value">{{ synonymToDelete.root }}</div>
        </div>
        <v-alert v-if="deleteSynonymError" type="error" variant="tonal" class="mt-4" closable @click:close="deleteSynonymError = null">
          {{ deleteSynonymError }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="simple-delete-dialog-actions">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeDeleteSynonymDialog" :disabled="deletingSynonym" size="small" class="mr-2">Cancel</v-btn>
        <v-btn color="primary" variant="flat" class="global-delete-confirm-btn" @click="confirmDeleteSynonym" :loading="deletingSynonym" :disabled="deletingSynonym" size="small">
          <v-icon size="16" class="global-delete-confirm-icon">mdi-delete</v-icon>
          <span>Delete Global Synonym</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showDeleteStopwordDialog" max-width="480" persistent>
    <v-card class="simple-delete-dialog-card" elevation="0">
      <v-card-title class="simple-delete-dialog-header">
        <div class="simple-delete-dialog-header-copy">
          <div class="simple-delete-dialog-kicker">Confirm removal</div>
          <div class="simple-delete-dialog-title-row">
            <v-icon icon="mdi-text-box-remove" size="18" class="simple-delete-dialog-title-icon mr-2"></v-icon>
            <span class="simple-delete-dialog-title">Delete Global Stopword</span>
          </div>
        </div>
        <v-btn icon variant="text" @click="closeDeleteStopwordDialog" color="white">
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="simple-delete-dialog-body">
        <p class="simple-delete-dialog-copy">Remove this stopword from globals?</p>
        <div v-if="stopwordToDelete" class="simple-delete-dialog-preview">
          <div class="simple-delete-dialog-label">Stopword</div>
          <div class="simple-delete-dialog-value">{{ getStopwordText(stopwordToDelete) }}</div>
        </div>
        <v-alert v-if="deleteStopwordError" type="error" variant="tonal" class="mt-4" closable @click:close="deleteStopwordError = null">
          {{ deleteStopwordError }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="simple-delete-dialog-actions">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeDeleteStopwordDialog" :disabled="deletingStopword" size="small" class="mr-2">Cancel</v-btn>
        <v-btn color="primary" variant="flat" class="global-delete-confirm-btn" @click="confirmDeleteStopword" :loading="deletingStopword" :disabled="deletingStopword" size="small">
          <v-icon size="16" class="global-delete-confirm-icon">mdi-delete</v-icon>
          <span>Delete Global Stopword</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl, extractSynonyms, normalizeStopwords, getStopwordText } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const route = useRoute()
const router = useRouter()
const baseUrl = inject('baseUrl')
const deploymentDemoMode = inject('deploymentDemoMode', ref(false))
const toast = inject('toast', { success: () => {}, error: () => {} })

const activeTab = ref(route.query.tab === 'stopwords' ? 'stopwords' : 'synonyms')
const synonyms = ref([])
const stopwords = ref([])
const synonymsLoading = ref(false)
const stopwordsLoading = ref(false)
const synonymsError = ref(null)
const stopwordsError = ref(null)
const showDeleteSynonymDialog = ref(false)
const showDeleteStopwordDialog = ref(false)
const synonymToDelete = ref(null)
const stopwordToDelete = ref(null)
const deleteSynonymError = ref(null)
const deleteStopwordError = ref(null)
const deletingSynonym = ref(false)
const deletingStopword = ref(false)
const showInlineSynonymForm = ref(false)
const showInlineStopwordForm = ref(false)
const inlineSynonymForm = ref({ root: '', synonyms: '' })
const inlineStopwordForm = ref({ word: '' })
const inlineSynonymError = ref(null)
const inlineStopwordError = ref(null)
const addingSynonym = ref(false)
const addingStopword = ref(false)

const synonymHeaders = [
  { title: 'Root', key: 'root' },
  { title: 'Synonyms', key: 'synonyms' },
  { title: 'Actions', key: 'actions', align: 'end', sortable: false, width: 96 }
]

const stopwordHeaders = [
  { title: 'Stopword', key: 'word' },
  { title: 'Actions', key: 'actions', align: 'end', sortable: false, width: 96 }
]

const stopwordRows = computed(() => {
  return stopwords.value
    .map((stopword) => ({ word: getStopwordText(stopword) }))
    .filter((row) => row.word && row.word.trim().length > 0)
})

const getItemRow = (item) => {
  if (!item) return {}
  return item.raw || item
}

const slugifySynonymId = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '_')
  .replace(/^_+|_+$/g, '')

const demoModeDeleteMessage = 'Demo mode is enabled. Synonyms and stopwords cannot be deleted.'

const isDemoModeActive = () => {
  return deploymentDemoMode.value === true ||
    (typeof window !== 'undefined' && window.__HLQUERY_DEMO_MODE__ === true)
}

const showDemoDeleteToast = () => {
  const serverMessage = typeof window !== 'undefined' && typeof window.__HLQUERY_DEMO_MESSAGE__ === 'string'
    ? window.__HLQUERY_DEMO_MESSAGE__.trim()
    : ''
  const message = serverMessage || demoModeDeleteMessage
  toast.error(message, 'Action unavailable')
}

const toggleInlineSynonymForm = () => {
  showInlineSynonymForm.value = !showInlineSynonymForm.value
  inlineSynonymError.value = null
}

const closeInlineSynonymForm = () => {
  showInlineSynonymForm.value = false
  inlineSynonymError.value = null
  inlineSynonymForm.value = { root: '', synonyms: '' }
}

const toggleInlineStopwordForm = () => {
  showInlineStopwordForm.value = !showInlineStopwordForm.value
  inlineStopwordError.value = null
}

const closeInlineStopwordForm = () => {
  showInlineStopwordForm.value = false
  inlineStopwordError.value = null
  inlineStopwordForm.value = { word: '' }
}

const loadSynonyms = async () => {
  synonymsLoading.value = true
  synonymsError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/synonyms/global')
    const response = await axios.get(url, { timeout: 10000 })
    synonyms.value = extractSynonyms(response.data)
  } catch (err) {
    synonymsError.value = err.response?.data?.error || err.message || 'Failed to load global synonyms'
    synonyms.value = []
  } finally {
    synonymsLoading.value = false
  }
}

const loadStopwords = async () => {
  stopwordsLoading.value = true
  stopwordsError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/stopwords/global')
    const response = await axios.get(url, { timeout: 10000 })
    stopwords.value = normalizeStopwords(response.data)
  } catch (err) {
    stopwordsError.value = err.response?.data?.error || err.message || 'Failed to load global stopwords'
    stopwords.value = []
  } finally {
    stopwordsLoading.value = false
  }
}

const submitInlineSynonym = async () => {
  const root = String(inlineSynonymForm.value.root || '').trim()
  const parsedSynonyms = String(inlineSynonymForm.value.synonyms || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const normalizedStopwords = new Set(stopwordRows.value.map(row => row.word.toLowerCase()))
  const conflicts = [root, ...parsedSynonyms]
    .filter(Boolean)
    .filter((value, index, array) => array.findIndex(item => item.toLowerCase() === value.toLowerCase()) === index)
    .filter(value => normalizedStopwords.has(value.toLowerCase()))

  if (!root || parsedSynonyms.length === 0) {
    inlineSynonymError.value = 'Root term and at least one synonym are required.'
    return
  }
  if (parsedSynonyms.some(value => value.toLowerCase() === root.toLowerCase())) {
    inlineSynonymError.value = 'Root term cannot also appear in synonyms.'
    return
  }
  if (conflicts.length > 0) {
    inlineSynonymError.value = `Synonym terms cannot match configured stopwords: ${conflicts.join(', ')}.`
    return
  }

  addingSynonym.value = true
  inlineSynonymError.value = null
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    let synonymId = slugifySynonymId(root) || 'synonym_group'
    const existingIds = new Set(synonyms.value.map(item => String(item?.id || '').trim()).filter(Boolean))
    if (existingIds.has(synonymId)) {
      let suffix = 2
      while (existingIds.has(`${synonymId}_${suffix}`)) suffix += 1
      synonymId = `${synonymId}_${suffix}`
    }
    const url = buildApiUrl(baseUrlValue, useProxy, `/synonyms/global/${encodeURIComponent(synonymId)}`)
    await axios.post(url, { root, synonyms: parsedSynonyms }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 })
    await loadSynonyms()
    const wasPersisted = synonyms.value.some((item) =>
      String(item?.id || '').trim() === synonymId ||
      String(item?.root || '').trim().toLowerCase() === root.toLowerCase()
    )
    if (!wasPersisted) {
      throw new Error('The server returned success, but the synonym was not found after refresh.')
    }
    closeInlineSynonymForm()
  } catch (err) {
    inlineSynonymError.value = err.response?.data?.error || err.message || 'Failed to add global synonym'
  } finally {
    addingSynonym.value = false
  }
}

const submitInlineStopword = async () => {
  const word = String(inlineStopwordForm.value.word || '').trim()
  if (!word) {
    inlineStopwordError.value = 'Stopword is required.'
    return
  }

  addingStopword.value = true
  inlineStopwordError.value = null
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/stopwords/global')
    await axios.post(url, { word }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 })
    await loadStopwords()
    const wasPersisted = stopwords.value.some((item) => getStopwordText(item).trim().toLowerCase() === word.toLowerCase())
    if (!wasPersisted) {
      throw new Error('The server returned success, but the stopword was not found after refresh.')
    }
    closeInlineStopwordForm()
  } catch (err) {
    inlineStopwordError.value = err.response?.data?.error || err.message || 'Failed to add global stopword'
  } finally {
    addingStopword.value = false
  }
}

const openDeleteSynonymDialog = (synonym) => {
  if (isDemoModeActive()) {
    showDemoDeleteToast()
    return
  }

  synonymToDelete.value = synonym
  deleteSynonymError.value = null
  showDeleteSynonymDialog.value = true
}

const closeDeleteSynonymDialog = () => {
  showDeleteSynonymDialog.value = false
  synonymToDelete.value = null
  deleteSynonymError.value = null
  deletingSynonym.value = false
}

const confirmDeleteSynonym = async () => {
  if (deletingSynonym.value) return

  if (isDemoModeActive()) {
    showDemoDeleteToast()
    return
  }

  const synonym = synonymToDelete.value
  const id = synonym?.id || synonym?.root
  if (!id) return
  deletingSynonym.value = true
  deleteSynonymError.value = null
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedId = encodeURIComponent(id)
    const url = buildApiUrl(baseUrlValue, useProxy, `/synonyms/global/${encodedId}`)
    await axios.delete(url, { timeout: 10000 })
    closeDeleteSynonymDialog()
    await loadSynonyms()
  } catch (err) {
    const errorMsg = extractSafeErrorMessage(err, 'Failed to delete global synonym')
    deleteSynonymError.value = errorMsg
    toast.error(errorMsg, 'Delete Failed')
  } finally {
    deletingSynonym.value = false
  }
}

const openDeleteStopwordDialog = (stopword) => {
  if (isDemoModeActive()) {
    showDemoDeleteToast()
    return
  }

  stopwordToDelete.value = stopword
  deleteStopwordError.value = null
  showDeleteStopwordDialog.value = true
}

const closeDeleteStopwordDialog = () => {
  showDeleteStopwordDialog.value = false
  stopwordToDelete.value = null
  deleteStopwordError.value = null
  deletingStopword.value = false
}

const confirmDeleteStopword = async () => {
  if (deletingStopword.value) return

  if (isDemoModeActive()) {
    showDemoDeleteToast()
    return
  }

  const word = getStopwordText(stopwordToDelete.value)
  if (!word) return
  deletingStopword.value = true
  deleteStopwordError.value = null
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedWord = encodeURIComponent(word)
    const url = buildApiUrl(baseUrlValue, useProxy, `/stopwords/global/${encodedWord}`)
    await axios.delete(url, { timeout: 10000 })
    closeDeleteStopwordDialog()
    await loadStopwords()
  } catch (err) {
    const errorMsg = extractSafeErrorMessage(err, 'Failed to delete global stopword')
    deleteStopwordError.value = errorMsg
    toast.error(errorMsg, 'Delete Failed')
  } finally {
    deletingStopword.value = false
  }
}

onMounted(async () => {
  await loadSynonyms()
  await loadStopwords()
})
</script>

<style scoped>
.globals-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.globals-view::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: #f6f7f8;
  z-index: 0;
}

.globals-view > * {
  position: relative;
  z-index: 1;
}

.globals-inline-form-card {
  border: 1px solid #dfe4ea !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
}

.globals-inline-form-body {
  padding: 18px 18px 10px !important;
}

.globals-inline-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
  gap: 12px;
}

.globals-inline-input :deep(.v-field) {
  background: #f8fafc !important;
  border-radius: 7px !important;
  border: 1px solid #dbe3ea !important;
  box-shadow: none !important;
}

.globals-inline-input :deep(.v-field:hover) {
  background: #ffffff !important;
  border-color: #c7d0da !important;
}

.globals-inline-input :deep(.v-field--focused) {
  background: #ffffff !important;
  border-color: #6b7280 !important;
  box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.12) !important;
}

.globals-inline-input :deep(.v-field__outline),
.globals-inline-input :deep(.v-field__overlay) {
  --v-field-border-opacity: 0 !important;
  opacity: 0 !important;
  box-shadow: none !important;
}

.globals-inline-input :deep(input:focus),
.globals-inline-input :deep(input:focus-visible),
.globals-inline-input :deep(.v-field:focus-within),
.globals-inline-input :deep(.v-field--variant-outlined),
.globals-inline-input :deep(.v-field--variant-outlined:hover),
.globals-inline-input :deep(.v-field--variant-outlined.v-field--focused) {
  outline: none !important;
  border: 0 !important;
  box-shadow: none !important;
}

.globals-inline-input :deep(.v-field__input) {
  color: #0f172a !important;
  font-size: 14px !important;
  min-height: 44px !important;
  padding-left: 12px !important;
  padding-right: 14px !important;
}

.globals-inline-input :deep(.v-field__prepend-inner) {
  color: #64748b !important;
  opacity: 1 !important;
  padding-inline-start: 14px !important;
  padding-inline-end: 10px !important;
}

.globals-inline-form-actions {
  padding: 10px 18px 18px !important;
  background: transparent !important;
  border-top: 0 !important;
  gap: 8px !important;
}

.globals-inline-submit-btn {
  text-transform: none !important;
  box-shadow: none !important;
}

.globals-inline-cancel-btn {
  text-transform: none !important;
  box-shadow: none !important;
}

.globals-inline-cancel-btn--danger {
  background: linear-gradient(135deg, #7a2626 0%, #5a1717 50%, #451010 100%) !important;
  box-shadow:
    0 4px 8px rgba(122, 38, 38, 0.34),
    0 2px 4px rgba(90, 23, 23, 0.28),
    0 1px 2px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
}

.globals-inline-cancel-btn--danger:hover {
  background: linear-gradient(135deg, #8a2d2d 0%, #671b1b 50%, #531313 100%) !important;
  box-shadow:
    0 4px 8px rgba(122, 38, 38, 0.34),
    0 2px 4px rgba(90, 23, 23, 0.28),
    0 1px 2px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
}

.globals-inline-cancel-btn--danger:active {
  background: linear-gradient(135deg, #671b1b 0%, #531313 50%, #3f0d0d 100%) !important;
  box-shadow:
    0 2px 4px rgba(122, 38, 38, 0.3),
    0 1px 2px rgba(90, 23, 23, 0.24),
    0 1px 1px rgba(0, 0, 0, 0.18),
    inset 0 2px 4px rgba(0, 0, 0, 0.22) !important;
}

.collections-header {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  padding: 14px 16px !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

@media (max-width: 760px) {
  .globals-inline-form-grid {
    grid-template-columns: 1fr;
  }
}

.collections-title-section {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  flex-direction: column;
}

.collections-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 700 !important;
  font-size: 17px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collection-dir-icon {
  color: #2f3437 !important;
  margin-right: 8px !important;
}

.collection-name-label {
  color: #1e293b !important;
}

.collections-pagination-info-top {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 13px !important;
  line-height: 20px !important;
  color: #64748b !important;
  margin: 0 !important;
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
  background: linear-gradient(135deg, #3b3f3d 0%, #2d302f 52%, #202322 100%) !important;
  box-shadow:
    0 4px 8px rgba(45, 48, 47, 0.28),
    0 2px 4px rgba(45, 48, 47, 0.22),
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
  background: linear-gradient(135deg, #474b49 0%, #363a38 52%, #252827 100%) !important;
  box-shadow:
    0 4px 8px rgba(45, 48, 47, 0.3),
    0 2px 4px rgba(45, 48, 47, 0.24),
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
  background: linear-gradient(135deg, #2d302f 0%, #202322 54%, #171918 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow:
    0 2px 4px rgba(45, 48, 47, 0.32),
    0 1px 2px rgba(45, 48, 47, 0.24),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.collections-action-btn:active::before {
  opacity: 0.5 !important;
}

.collections-action-btn :deep(.v-btn__content) {
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.collections-action-btn :deep(.v-icon),
.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__append),
.collections-action-btn :deep(.v-btn__prepend-inner),
.collections-action-btn :deep(.v-btn__append-inner) {
  display: none !important;
}

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

.collections-action-btn :deep(.v-btn__overlay) {
  display: none !important;
}

.collection-tabs-container {
  background: #ffffff;
  padding: 6px;
  margin-bottom: 8px;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.collection-tabs :deep(.v-tabs-container) {
  background: transparent;
  padding: 0;
  border-bottom: none !important;
}

.collection-tabs :deep(.v-tabs-list) {
  background: transparent;
  gap: 6px;
  padding-bottom: 0;
  border-bottom: none !important;
}

.collection-tabs :deep(.v-slide-group__wrapper),
.collection-tabs :deep(.v-slide-group__content),
.collection-tabs :deep(.v-slide-group) {
  border-bottom: none !important;
}

.collection-tabs :deep(.v-tabs-slider) {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  height: 0 !important;
  width: 0 !important;
}

.collection-tab {
  font-family: Inter, Helvetica, sans-serif !important;
  color: #2f3437 !important;
  text-transform: none !important;
  padding: 8px 12px !important;
  min-height: 48px !important;
  height: 48px !important;
  border-radius: 6px !important;
  background: transparent !important;
  transition: all 0.2s ease !important;
  margin-right: 0 !important;
  border: 1px solid transparent !important;
  margin-bottom: 0 !important;
  box-shadow: none !important;
}

.collection-tab:hover {
  background: #f8fafc !important;
  border-color: #dfe4ea !important;
  color: #111827 !important;
  box-shadow: none !important;
}

.collection-tab.v-tab--selected {
  color: #111827 !important;
  font-weight: 500 !important;
  background: #eef1f4 !important;
  border-color: #cbd5e1 !important;
  border-radius: 6px !important;
  box-shadow: none !important;
}

.collection-tab :deep(.v-btn__content) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.tab-icon-shell {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid transparent;
}

.tab-icon-shell--synonyms {
  color: #3d463f;
  background: #f3f4f6;
  border-color: #d8ddd9;
}

.tab-icon-shell--stopwords {
  color: #3d463f;
  background: #f3f4f6;
  border-color: #d8ddd9;
}

.collection-tab.v-tab--selected .tab-icon-shell--synonyms {
  color: #ffffff;
  background: #2f3437;
  border-color: #2f3437;
}

.collection-tab.v-tab--selected .tab-icon-shell--stopwords {
  color: #ffffff;
  background: #2f3437;
  border-color: #2f3437;
}

.tab-label-stack {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.1;
  min-width: 72px;
}

.tab-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  color: #2f3437 !important;
}

.collection-tab.v-tab--selected .tab-text {
  color: #111827 !important;
  font-weight: 800 !important;
}

.tab-count {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 700 !important;
  font-size: 11px !important;
  color: #647067 !important;
  opacity: 1 !important;
  margin-left: 0 !important;
  margin-top: 3px !important;
}

.collection-tab.v-tab--selected .tab-count {
  color: #475569 !important;
  font-weight: 800 !important;
  opacity: 1 !important;
}

.globals-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.globals-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 0;
  background: #ffffff;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.globals-panel-heading {
  min-width: 0;
}

.globals-panel-eyebrow {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f766e;
  margin-bottom: 6px;
}

.globals-panel-title {
  font-weight: 750;
  color: #111827;
  font-size: 15px;
  line-height: 1.25;
}

.globals-panel-description {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.globals-panel-actions {
  display: flex;
  gap: 8px;
}

.globals-panel-actions .collections-action-btn,
.globals-empty-state .collections-action-btn,
.globals-inline-submit-btn {
  height: 32px !important;
  border-radius: 6px !important;
  background: #111827 !important;
  box-shadow: none !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
}

.globals-panel-actions .collections-action-btn:hover,
.globals-empty-state .collections-action-btn:hover,
.globals-inline-submit-btn:hover {
  background: #1f2937 !important;
  box-shadow: none !important;
}

.globals-panel-actions .collections-action-btn:hover :deep(.v-btn__content),
.globals-empty-state .collections-action-btn:hover :deep(.v-btn__content),
.globals-inline-submit-btn:hover :deep(.v-btn__content) {
  text-decoration: none !important;
}

.globals-input-card {
  border-radius: 18px !important;
  border: 1px solid rgba(226, 232, 240, 0.92) !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%) !important;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.07) !important;
}

.globals-input-card :deep(.v-card-text) {
  padding: 22px !important;
}

.globals-input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.globals-input-title {
  font-weight: 700;
  color: #0f172a;
  font-size: 18px;
}

.globals-input-subtitle {
  color: #64748b;
  font-size: 13px;
  margin-top: 4px;
}

.globals-input-field :deep(.v-field) {
  background: #f8fafc !important;
  border-radius: 14px !important;
  border: 1px solid #dbe4ef !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.globals-input-field :deep(.v-field--focused) {
  background: #ffffff !important;
  border-color: #5f7f6d !important;
  box-shadow:
    0 0 0 4px rgba(95, 127, 109, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.globals-input-field :deep(.v-field__input) {
  color: #0f172a !important;
  font-weight: 500 !important;
}

.globals-input-actions {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.synonyms-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}

.synonym-pill {
  background: #f1f5f9;
  color: #334155;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 650;
  border: 1px solid #dbe4ef;
}

.synonym-input-row {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(260px, 2fr) minmax(200px, 1fr);
  gap: 14px;
  align-items: start;
}

.synonym-input-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.synonym-preview {
  min-height: 52px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  padding: 10px;
  background: rgba(248, 250, 252, 0.95);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-content: flex-start;
}

.synonym-pill-preview {
  background: linear-gradient(180deg, #f4f6f2 0%, #e7eee7 100%);
  color: #3e5749;
  border-color: rgba(95, 127, 109, 0.38);
}

.synonym-preview-more {
  color: #475569;
  font-size: 12px;
  align-self: center;
}

.stopword-input-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.stopwords-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.globals-table-card {
  overflow: hidden;
  border-radius: 8px !important;
  border: 1px solid #dfe4ea !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
}

.globals-table :deep(.v-table__wrapper) {
  border-radius: 0 0 8px 8px;
}

.globals-table :deep(.v-data-table__thead th) {
  background: #f8fafc !important;
  color: #475569 !important;
  font-weight: 750 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  font-size: 11px !important;
  height: 44px !important;
}

.globals-table :deep(.v-data-table__tbody tr) {
  border-bottom: 1px solid #edf2f7 !important;
}

.globals-table :deep(.v-data-table__tbody tr:nth-child(even)) {
  background: #ffffff !important;
}

.globals-table :deep(.v-data-table__tbody tr:hover),
.globals-table :deep(.v-data-table__tbody tr:hover td) {
  background: #f8fafc !important;
}

.globals-table :deep(.v-data-table__tbody td) {
  color: #1e293b !important;
  height: 60px !important;
  border-bottom: 1px solid #edf2f7 !important;
}

.globals-primary-cell {
  color: #202322 !important;
  font-weight: 700 !important;
}

.globals-table :deep(.v-btn--icon) {
  border-radius: 6px !important;
}

.globals-table :deep(.v-btn--icon:hover) {
  background: #111827 !important;
}

.globals-table :deep(.global-delete-icon-btn) {
  color: #111827 !important;
  background: transparent !important;
  transition: background 0.18s ease, color 0.18s ease !important;
}

.globals-table :deep(.global-delete-icon-btn .v-icon),
.globals-table :deep(.global-delete-icon) {
  display: inline-flex !important;
  opacity: 1 !important;
  color: #111827 !important;
}

.globals-table :deep(.global-delete-icon-btn:hover),
.globals-table :deep(.global-delete-icon-btn:focus-visible),
.globals-table :deep(.global-delete-icon-btn.v-btn--active) {
  background: #111827 !important;
  color: #ffffff !important;
}

.globals-table :deep(.global-delete-icon-btn:hover .v-icon),
.globals-table :deep(.global-delete-icon-btn:focus-visible .v-icon),
.globals-table :deep(.global-delete-icon-btn.v-btn--active .v-icon) {
  color: #ffffff !important;
}

.globals-add-btn-wide {
  min-width: 140px;
}

.globals-input-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.globals-input-hint kbd {
  border: 1px solid #cbd5e1;
  border-bottom-width: 2px;
  border-radius: 4px;
  background: #ffffff;
  color: #334155;
  font-size: 11px;
  padding: 1px 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.globals-empty-card {
  border-radius: 8px !important;
  border: 1px solid #dfe4ea !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
}

.globals-empty-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 28px !important;
}

.globals-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #dbe4ef;
  box-shadow: none;
}

.globals-empty-icon--synonyms {
  color: #334155;
  background: #f1f5f9;
}

.globals-empty-icon--stopwords {
  color: #334155;
  background: #f1f5f9;
  border-color: #dbe4ef;
}

.globals-empty-title {
  font-size: 17px;
  font-weight: 750;
  color: #111827;
  margin-bottom: 8px;
}

.globals-empty-copy {
  max-width: 48ch;
  font-size: 14px;
  line-height: 1.6;
  color: #64748b;
}

.globals-empty-state .collections-action-btn {
  margin-top: 28px !important;
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

.simple-delete-dialog-title-icon {
  color: #ffffff !important;
  opacity: 1 !important;
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
  color: #64748b;
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

.global-delete-confirm-btn {
  min-width: 184px !important;
  height: 34px !important;
  border-radius: 7px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  background: #2f3437 !important;
  box-shadow: none !important;
}

.global-delete-confirm-btn:hover {
  background: #1f2427 !important;
}

.global-delete-confirm-btn :deep(.v-btn__content) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  width: auto !important;
  color: #ffffff !important;
}

.global-delete-confirm-icon {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  flex: 0 0 auto !important;
}

.global-delete-confirm-btn span {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .globals-overview-grid {
    grid-template-columns: 1fr;
  }

  .globals-tabs-shell {
    width: 100%;
    display: block;
    align-self: stretch;
  }

  .globals-tabs {
    width: 100%;
  }

  .globals-tab {
    flex: 1 1 0;
  }

  .synonym-input-row {
    grid-template-columns: 1fr;
  }

  .stopword-input-row {
    flex-direction: column;
  }

  .globals-add-btn-wide {
    width: 100%;
  }

  .globals-input-actions {
    width: 100%;
  }

  .globals-input-actions .globals-add-btn,
  .globals-input-actions .globals-add-btn-wide {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .globals-panel-title {
    font-size: 20px;
  }

  .globals-overview-value {
    font-size: 28px;
  }

  .globals-header-badge {
    width: 100%;
    justify-content: center;
  }
}
</style>
