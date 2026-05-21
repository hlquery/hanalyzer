<template>
  <div class="add-alias-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <div>
          <h1 class="collections-title-text">Create New Alias</h1>
          <p class="collections-subtitle-text">Set an alias and choose the target collection.</p>
        </div>
      </div>
    </div>

    <!-- Form -->
    <v-row justify="center">
      <v-col cols="12" lg="10" xl="9">
        <v-card class="form-card card-premium">
          <v-card-text class="form-card-content">
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-6"
              closable
              icon="mdi-alert-circle"
              @click:close="error = null"
            >
              <div class="font-weight-bold mb-1">Creation Failed</div>
              {{ error }}
            </v-alert>

            <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
              <!-- Alias Name Section -->
              <div class="form-section">
                <div class="d-flex align-center mb-4">
                  <div class="section-icon-wrapper mr-4">
                    <v-icon color="primary" size="24">mdi-link-variant</v-icon>
                  </div>
                  <div>
                    <h3 class="section-title">Alias Identity</h3>
                    <p class="section-description">Name your alias the way your app will use it.</p>
                  </div>
                </div>
                
                <span class="input-caption">Alias name</span>
                <v-text-field
                  v-model="aliasName"
                  placeholder="e.g. production_v1, current_search_index"
                  variant="outlined"
                  density="comfortable"
                  class="form-input-modern alias-name-input"
                  :rules="[rules.required, rules.aliasName]"
                  :disabled="loading"
                  prepend-inner-icon="mdi-tag-outline"
                  hide-details="auto"
                  persistent-placeholder
                ></v-text-field>
                <div class="field-helper-row">
                  <span class="field-helper-text">Allowed: letters, numbers, `_` and `-`</span>
                  <v-btn
                    v-if="aliasSuggestion && aliasSuggestion !== aliasName.trim()"
                    size="x-small"
                    variant="text"
                    color="primary"
                    class="text-none"
                    @click="applyAliasSuggestion"
                  >
                    Use "{{ aliasSuggestion }}"
                  </v-btn>
                </div>
                <v-alert
                  v-if="aliasConflict"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mt-3"
                  icon="mdi-alert-outline"
                >
                  Alias "{{ aliasName.trim() }}" already exists. Pick another name.
                </v-alert>
              </div>

              <v-divider class="my-8"></v-divider>

              <!-- Target Collection Section -->
              <div class="form-section">
                <div class="d-flex align-center mb-4">
                  <div class="section-icon-wrapper mr-4">
                    <v-icon color="primary" size="24">mdi-database-search</v-icon>
                  </div>
                  <div>
                    <h3 class="section-title">Target Collection</h3>
                    <p class="section-description">Pick the collection this alias should point to.</p>
                  </div>
                </div>
                
                <div class="collection-picker-shell">
                  <div class="collection-picker-toolbar">
                    <span class="input-caption collection-search-caption">Search collection</span>
                    <v-text-field
                      v-model="collectionSearch"
                      placeholder="Type a collection name"
                      variant="outlined"
                      density="comfortable"
                      class="form-input-modern collection-filter-input"
                      :disabled="loading"
                      :loading="collectionsLoading"
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      hide-details
                      persistent-placeholder
                    ></v-text-field>
                    <div class="collection-picker-count">
                      {{ collectionSearch.trim() ? filteredCollections.length : 0 }} / {{ collections.length }}
                    </div>
                  </div>

                  <div class="collection-picker-list" :class="{ 'is-loading': collectionsLoading }">
                    <div v-if="collectionsLoading && collections.length === 0" class="collection-picker-state">
                      <v-progress-circular indeterminate size="22" width="2" color="primary" class="mr-3"></v-progress-circular>
                      <span>Loading collections…</span>
                    </div>

                    <div v-else-if="!collectionSearch.trim()" class="collection-picker-state">
                      <v-icon size="18" color="grey-darken-1" class="mr-2">mdi-magnify</v-icon>
                      <span>Start typing to see up to 5 suggestions.</span>
                    </div>

                    <div v-else-if="filteredCollections.length === 0" class="collection-picker-state">
                      <v-icon size="18" color="grey-darken-1" class="mr-2">mdi-folder-search-outline</v-icon>
                      <span>No collections match this filter.</span>
                    </div>

                    <button
                      v-for="collection in filteredCollections"
                      :key="collection.name"
                      type="button"
                      class="collection-option"
                      :class="{ 'is-selected': targetCollection === collection.name }"
                      :disabled="loading"
                      @click="selectTargetCollection(collection.name)"
                    >
                      <div class="collection-option-main">
                        <v-icon size="18" color="grey-darken-1">mdi-folder</v-icon>
                        <div class="collection-option-copy">
                          <span class="collection-option-name">{{ collection.name }}</span>
                          <span class="collection-option-meta">{{ collection.num_documents || 0 }} documents</span>
                        </div>
                      </div>
                      <v-icon
                        v-if="targetCollection === collection.name"
                        size="18"
                        color="blue-grey-darken-3"
                      >
                        mdi-check-circle
                      </v-icon>
                    </button>
                  </div>

                  <div
                    class="collection-selection-summary"
                    :class="{ 'has-selection': !!targetCollection }"
                  >
                    <v-icon size="18" :color="targetCollection ? 'blue-grey-darken-3' : 'grey-darken-1'">
                      {{ targetCollection ? 'mdi-check-circle' : 'mdi-information-outline' }}
                    </v-icon>
                    <span>
                      {{ targetCollection ? `Selected target: ${targetCollection}` : 'Search and select one collection.' }}
                    </span>
                  </div>
                </div>
                <div class="field-helper-row collection-action-row">
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="primary"
                    class="text-none"
                    :disabled="!targetCollection || loading"
                    @click="useCollectionAsAlias"
                  >
                    Use collection name as alias
                  </v-btn>
                </div>
              </div>

              <div class="form-actions">
                <div class="form-action-buttons">
                  <v-btn
                    variant="outlined"
                    @click="goBack"
                    :disabled="loading"
                    class="alias-cancel-btn text-none"
                    prepend-icon="mdi-arrow-left"
                  >
                    Cancel
                  </v-btn>
                  <v-btn
                    type="submit"
                    variant="flat"
                    :loading="loading"
                    :disabled="!formValid || !aliasName || !targetCollection || aliasConflict"
                    class="alias-submit-btn text-none"
                    prepend-icon="mdi-plus"
                  >
                    Add Alias
                  </v-btn>
                </div>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCollections } from '../composables/useCollections'
import { useAliases } from '../composables/useAliases'

const router = useRouter()
const baseUrl = inject('baseUrl', ref('http://localhost:9200'))
const toast = inject('toast', { success: () => {}, error: () => {} })

const { collections, loading: collectionsLoading, loadCollectionsAsync } = useCollections(baseUrl)
const { createAlias: apiCreateAlias, aliases, loadAliases } = useAliases(baseUrl)

const form = ref(null)
const formValid = ref(false)
const aliasName = ref('')
const targetCollection = ref(null)
const collectionSearch = ref('')
const loading = ref(false)
const error = ref(null)

const aliasSuggestion = computed(() => {
  const source = aliasName.value || targetCollection.value || ''
  if (!source) return ''
  return source
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/-+/g, '-')
    .slice(0, 64)
})

const existingAliasNames = computed(() => {
  return new Set((aliases.value || []).map(a => String(a.name || '').toLowerCase()))
})

const aliasConflict = computed(() => {
  const current = aliasName.value ? aliasName.value.trim().toLowerCase() : ''
  if (!current) return false
  return existingAliasNames.value.has(current)
})

const filteredCollections = computed(() => {
  const query = collectionSearch.value.trim().toLowerCase()
  const items = Array.isArray(collections.value) ? collections.value : []

  if (!query) {
    return []
  }

  return items.filter((collection) => {
    const name = String(collection?.name || '').toLowerCase()
    return name.includes(query)
  }).slice(0, 5)
})

const rules = {
  required: v => !!v || 'This field is required',
  aliasName: v => {
    if (!v) return true
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) return 'Use only letters, numbers, underscores, and hyphens'
    if (v.length > 64) return 'Alias name cannot exceed 64 characters'
    if (existingAliasNames.value.has(v.trim().toLowerCase())) return 'Alias already exists'
    return true
  }
}

const applyAliasSuggestion = () => {
  if (!aliasSuggestion.value) return
  aliasName.value = aliasSuggestion.value
}

const useCollectionAsAlias = () => {
  if (!targetCollection.value) return
  aliasName.value = String(targetCollection.value)
  applyAliasSuggestion()
}

const selectTargetCollection = (name) => {
  targetCollection.value = name
  collectionSearch.value = String(name)
}

const goBack = () => {
  router.push('/aliases')
}

const handleSubmit = async () => {
  if (!formValid.value) return
  if (!targetCollection.value) {
    error.value = 'Select a target collection before creating the alias.'
    return
  }
  if (aliasConflict.value) {
    error.value = 'This alias name already exists. Choose a unique alias name.'
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    await apiCreateAlias(aliasName.value.trim(), targetCollection.value)
    toast.success(`Alias "${aliasName.value}" created successfully`)
    router.push('/aliases')
  } catch (err) {
    console.error('Failed to create alias:', err)
    error.value = err.message || 'Failed to create alias. Please check your connection and try again.'
  } finally {
    loading.value = false
  }
}

const scrollPageToTop = () => {
  if (typeof window === 'undefined') return

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0

  const main = document.getElementById('main-content')
  if (main) {
    main.scrollTop = 0
  }
}

onMounted(async () => {
  await nextTick()
  scrollPageToTop()
  requestAnimationFrame(scrollPageToTop)

  loadCollectionsAsync()
  loadAliases(false)
})
</script>

<script>
export default {
  name: 'AddAliasView'
}
</script>

<style scoped>
.add-alias-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 60px;
}

.collections-header {
  margin-bottom: 32px;
}

.collections-title-section {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  gap: 12px;
}

.collections-title-text {
  font-size: 24px !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  line-height: 1.2;
}

.collections-subtitle-text {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.form-card {
  border: 1px solid #e2e8f0 !important;
  overflow: visible !important;
}

.form-card-content {
  padding: 40px !important;
  background: #ffffff;
}

.section-icon-wrapper {
  width: 42px;
  height: 42px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.section-description {
  font-size: 14px;
  color: #64748b;
}

.input-caption {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.field-helper-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.collection-action-row {
  justify-content: flex-end;
}

.field-helper-text {
  font-size: 12px;
  color: #64748b;
}

.collection-picker-shell {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 16px;
}

.collection-picker-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.collection-search-caption {
  width: 100%;
  margin-bottom: 0;
}

.collection-filter-input {
  flex: 1;
}

.collection-picker-count {
  min-width: 72px;
  text-align: center;
  border-radius: 999px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.collection-picker-list {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  min-height: 180px;
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.collection-picker-list.is-loading {
  opacity: 0.9;
}

.collection-picker-state {
  min-height: 162px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 14px;
  text-align: center;
  padding: 16px;
}

.collection-option {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
}

.collection-option:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.collection-option.is-selected {
  background: #f1f5f9;
  border-color: #94a3b8;
  box-shadow: none;
}

.collection-option:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.collection-option-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.collection-option-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.collection-option-name {
  color: #0f172a;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  word-break: break-word;
}

.collection-option-meta {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.collection-selection-summary {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
}

.collection-selection-summary.has-selection {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

.form-input-modern :deep(.v-field) {
  border-radius: 10px !important;
  background-color: #f8fafc !important;
  transition: all 0.2s ease !important;
  min-height: 56px !important;
}

.form-input-modern :deep(.v-field--focused) {
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1) !important;
}

.form-input-modern :deep(.v-field__input) {
  padding-top: 16px !important;
  padding-bottom: 16px !important;
}

.form-input-modern :deep(.v-field__prepend-inner) {
  padding-top: 16px !important;
}

.alias-name-input :deep(.v-field),
.collection-filter-input :deep(.v-field) {
  min-height: 46px !important;
  border-radius: 8px !important;
  background-color: #fbfdff !important;
  border: 1px solid #d7dee8 !important;
  box-shadow: none !important;
  --v-field-border-opacity: 1 !important;
  --v-field-border-width: 1px !important;
}

.alias-name-input :deep(.v-field__outline),
.collection-filter-input :deep(.v-field__outline) {
  color: #d7dee8 !important;
}

.alias-name-input :deep(.v-field:hover .v-field__outline),
.collection-filter-input :deep(.v-field:hover .v-field__outline) {
  color: #cbd5e1 !important;
}

.alias-name-input :deep(.v-field--focused),
.collection-filter-input :deep(.v-field--focused) {
  background-color: #ffffff !important;
  border-color: #d7dee8 !important;
  box-shadow: none !important;
}

.alias-name-input :deep(.v-field--error),
.alias-name-input :deep(.v-field--focused.v-field--error),
.alias-name-input.v-input--error :deep(.v-field),
.collection-filter-input :deep(.v-field--error),
.collection-filter-input :deep(.v-field--focused.v-field--error),
.collection-filter-input.v-input--error :deep(.v-field) {
  border-color: #d7dee8 !important;
  box-shadow: none !important;
}

.alias-name-input :deep(.v-field--focused .v-field__outline),
.collection-filter-input :deep(.v-field--focused .v-field__outline) {
  color: #cbd5e1 !important;
}

.alias-name-input :deep(.v-field--error .v-field__outline),
.alias-name-input :deep(.v-field--focused.v-field--error .v-field__outline),
.collection-filter-input :deep(.v-field--error .v-field__outline),
.collection-filter-input :deep(.v-field--focused.v-field--error .v-field__outline) {
  color: #d7dee8 !important;
}

.alias-name-input :deep(.v-field--focused:not(.v-field--error) .v-field__outline),
.collection-filter-input :deep(.v-field--focused:not(.v-field--error) .v-field__outline) {
  color: #cbd5e1 !important;
}

.alias-name-input :deep(.v-field--error .v-field__outline__start),
.alias-name-input :deep(.v-field--error .v-field__outline__notch),
.alias-name-input :deep(.v-field--error .v-field__outline__end),
.alias-name-input :deep(.v-field--focused.v-field--error .v-field__outline__start),
.alias-name-input :deep(.v-field--focused.v-field--error .v-field__outline__notch),
.alias-name-input :deep(.v-field--focused.v-field--error .v-field__outline__end),
.collection-filter-input :deep(.v-field--error .v-field__outline__start),
.collection-filter-input :deep(.v-field--error .v-field__outline__notch),
.collection-filter-input :deep(.v-field--error .v-field__outline__end),
.collection-filter-input :deep(.v-field--focused.v-field--error .v-field__outline__start),
.collection-filter-input :deep(.v-field--focused.v-field--error .v-field__outline__notch),
.collection-filter-input :deep(.v-field--focused.v-field--error .v-field__outline__end) {
  border-color: #d7dee8 !important;
  border-width: 1px !important;
}

.alias-name-input :deep(.v-field--focused:not(.v-field--error) .v-field__outline__start),
.alias-name-input :deep(.v-field--focused:not(.v-field--error) .v-field__outline__notch),
.alias-name-input :deep(.v-field--focused:not(.v-field--error) .v-field__outline__end),
.collection-filter-input :deep(.v-field--focused .v-field__outline__start),
.collection-filter-input :deep(.v-field--focused .v-field__outline__notch),
.collection-filter-input :deep(.v-field--focused .v-field__outline__end),
.collection-filter-input :deep(.v-field--focused:not(.v-field--error) .v-field__outline__start),
.collection-filter-input :deep(.v-field--focused:not(.v-field--error) .v-field__outline__notch),
.collection-filter-input :deep(.v-field--focused:not(.v-field--error) .v-field__outline__end) {
  border-color: #cbd5e1 !important;
  border-width: 1px !important;
}

.alias-name-input :deep(.v-field--focused:not(.v-field--error) .v-label.v-field-label),
.collection-filter-input :deep(.v-field--focused:not(.v-field--error) .v-label.v-field-label) {
  color: #64748b !important;
}

.alias-name-input :deep(.v-field__input),
.collection-filter-input :deep(.v-field__input) {
  min-height: 46px !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  color: #475569 !important;
  font-size: 13px !important;
  font-weight: 400 !important;
}

.alias-name-input :deep(input::placeholder),
.collection-filter-input :deep(input::placeholder) {
  color: #94a3b8 !important;
  opacity: 1 !important;
  font-size: 13px !important;
  font-weight: 400 !important;
}

.alias-name-input :deep(.v-field__prepend-inner),
.collection-filter-input :deep(.v-field__prepend-inner) {
  padding-top: 10px !important;
  color: #94a3b8 !important;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 40px;
  padding-top: 22px;
  border-top: 1px solid #e2e8f0;
}

.form-actions-info {
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
}

.form-action-buttons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.alias-cancel-btn,
.alias-submit-btn {
  min-width: 118px !important;
  height: 42px !important;
  border-radius: 8px !important;
  padding: 0 18px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  box-shadow: none !important;
}

.alias-cancel-btn {
  color: #334155 !important;
  background: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
}

.alias-cancel-btn:hover {
  background: #f8fafc !important;
  border-color: #94a3b8 !important;
}

.alias-cancel-btn :deep(.v-btn__content),
.alias-cancel-btn :deep(.v-icon) {
  color: #334155 !important;
}

.alias-cancel-btn:focus,
.alias-cancel-btn:focus-visible,
.alias-submit-btn:focus,
.alias-submit-btn:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.alias-submit-btn {
  color: #ffffff !important;
  background: #0f172a !important;
  border: 1px solid #0f172a !important;
}

.alias-submit-btn :deep(.v-btn__overlay) {
  pointer-events: none !important;
}

.alias-submit-btn :deep(.v-btn__content) {
  position: relative !important;
  z-index: 1 !important;
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.alias-submit-btn :deep(.v-icon) {
  color: #ffffff !important;
}

.alias-submit-btn:hover {
  background: #1e293b !important;
  border-color: #1e293b !important;
  box-shadow: none !important;
}

.alias-submit-btn:active {
  background: #020617 !important;
  border-color: #020617 !important;
  box-shadow: none !important;
}

.alias-submit-btn.v-btn--disabled,
.alias-cancel-btn.v-btn--disabled {
  opacity: 0.55 !important;
}

.card-premium {
  border-radius: 16px !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
}

@media (max-width: 960px) {
  .form-card-content {
    padding: 24px !important;
  }

  .collection-picker-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .collection-picker-count {
    min-width: 0;
  }

  .field-helper-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-actions {
    align-items: stretch;
  }

  .form-action-buttons {
    width: 100%;
    justify-content: stretch;
  }

  .alias-cancel-btn,
  .alias-submit-btn {
    flex: 1 1 0;
  }
}
</style>
