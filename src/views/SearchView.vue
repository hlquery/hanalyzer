<template>
  <div>
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <h1 class="collections-title-text">Search Documents</h1>
      </div>
    </div>

    <v-card class="mb-card search-form-card">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-magnify" size="20" color="#1976d2" class="mr-3"></v-icon>
        <span class="font-weight-bold">Search Form</span>
      </v-card-title>
      <v-card-text>
        <v-row class="search-form-row">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedCollection"
              :items="collectionItems"
              label="Collection"
              prepend-inner-icon="mdi-folder"
              variant="outlined"
              density="comfortable"
              @update:model-value="loadCollections"
              class="search-form-field"
              hint="Select a collection to search, or leave empty to search all"
              persistent-hint
              aria-label="Collection selector"
            ></v-select>
          </v-col>
          
          <v-col cols="12" md="8">
            <v-autocomplete
              v-model="searchQuery"
              :items="getRecentSearches(5).map(s => s.query)"
              label="Search Query"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              @keyup.enter="handleSearch"
              clearable
              placeholder='Enter search terms... Use quotes for exact phrase: "Document 95"'
              hint='Tip: Use quotes for exact phrase search, e.g., "Document 95". Press Enter to search.'
              persistent-hint
              aria-label="Search query input"
              class="search-form-field"
              :menu-props="{ maxHeight: 200 }"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon size="18" color="grey">mdi-history</v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-combobox
              v-model="queryBy"
              :items="queryableFieldItems"
              label="Query By Fields"
              prepend-inner-icon="mdi-code-tags"
              variant="outlined"
              density="comfortable"
              placeholder="All searchable fields"
              hint="Choose searchable fields from the schema, or type custom ones"
              persistent-hint
              class="search-form-field"
              aria-label="Query by fields"
              multiple
              chips
              closable-chips
              clearable
            >
              <template v-slot:append-inner>
                <TooltipHelp text="Limit the query to specific fields. Leave empty to use the collection defaults." location="left" />
              </template>
            </v-combobox>
          </v-col>
          
          <v-col cols="12" md="3">
            <v-text-field
              v-model.number="searchLimit"
              label="Limit"
              type="number"
              min="1"
              max="100"
              variant="outlined"
              density="comfortable"
              class="search-form-field"
              hint="Maximum number of results (1-100)"
              persistent-hint
              aria-label="Result limit"
            >
              <template v-slot:append-inner>
                <TooltipHelp text="Maximum number of search results to return. Lower limits are faster." location="left" />
              </template>
            </v-text-field>
          </v-col>
          
          <v-col cols="12" md="5">
            <v-select
              v-model="sortBy"
              :items="sortOptions"
              label="Sort By"
              prepend-inner-icon="mdi-sort"
              variant="outlined"
              density="comfortable"
              clearable
              hint="Order results by field (ascending or descending)"
              persistent-hint
              class="search-form-field"
              aria-label="Sort order"
            >
              <template v-slot:append-inner>
                <TooltipHelp text="Sort results by a specific field. Format: field:asc or field:desc" location="left" />
              </template>
            </v-select>
          </v-col>
        </v-row>

        <!-- Advanced Filters Section -->
        <v-expand-transition>
          <div v-if="showAdvancedFilters" class="mt-4 advanced-query-surface">
            <v-divider class="mb-4"></v-divider>
            <div class="d-flex align-center justify-space-between mb-3">
              <h3 class="text-subtitle-1 font-weight-bold">Advanced Filters</h3>
              <v-btn
                size="small"
                color="primary"
                variant="flat"
                @click="addFilter"
                prepend-icon="mdi-plus"
              >
                Add Filter
              </v-btn>
            </div>
            
            <div v-for="(filter, index) in filters" :key="`filter-${index}-${filter.field}-${filter.value}`" class="mb-3">
              <v-card variant="outlined" class="pa-3">
                <v-row align="center">
                  <v-col cols="12" md="1" v-if="index > 0">
                    <v-select
                      v-model="filter.connector"
                      :items="['AND', 'OR']"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-select>
                  </v-col>
                  <v-col cols="12" :md="index > 0 ? 3 : 4">
                    <v-combobox
                      v-model="filter.field"
                      :items="filterableFieldItems"
                      label="Field Name"
                      variant="outlined"
                      density="compact"
                      hide-details
                      placeholder="Select or type a field"
                      clearable
                    ></v-combobox>
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-select
                      v-model="filter.operator"
                      :items="filterOperators"
                      item-title="label"
                      item-value="value"
                      label="Operator"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="filter.value"
                      :label="getFilterValueLabel(filter.operator)"
                      :type="isNumericFilter(filter.operator) ? 'number' : 'text'"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="1">
                    <v-btn
                      icon
                      variant="text"
                      color="error"
                      size="small"
                      @click="removeFilter(index)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </div>
            
            <v-alert
              v-if="filters.length === 0"
              type="info"
              variant="tonal"
              density="compact"
            >
              No filters added. Click "Add Filter" to add filter conditions.
            </v-alert>

            <v-card variant="outlined" class="pa-4 mb-4 query-assistant-card">
              <div class="d-flex align-center justify-space-between mb-3 flex-wrap" style="gap: 12px;">
                <div>
                  <div class="text-subtitle-2 font-weight-bold">Query Assistant</div>
                  <div class="text-caption text-medium-emphasis">Build boolean queries faster with field and operator shortcuts.</div>
                </div>
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  prepend-icon="mdi-backspace-outline"
                  @click="clearSearchQuery"
                >
                  Clear Query
                </v-btn>
              </div>

              <div class="mb-3">
                <div class="text-caption assistant-section-label mb-2">Boolean operators</div>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="operator in booleanOperatorChips"
                    :key="operator.value"
                    color="primary"
                    variant="outlined"
                    size="small"
                    @click="appendQueryToken(operator.value)"
                  >
                    {{ operator.label }}
                  </v-chip>
                </div>
              </div>

              <div class="mb-3">
                <div class="text-caption assistant-section-label mb-2">Field shortcuts</div>
                <div v-if="availableFieldNames.length > 0" class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="fieldName in availableFieldNames"
                    :key="fieldName"
                    color="secondary"
                    variant="tonal"
                    size="small"
                    @click="appendFieldToken(fieldName)"
                  >
                    {{ fieldName }}
                  </v-chip>
                </div>
                <div v-else class="text-caption text-medium-emphasis">
                  Select a collection to load schema field suggestions.
                </div>
              </div>

              <v-textarea
                v-model="searchQuery"
                label="Interactive Query Editor"
                variant="outlined"
                density="comfortable"
                rows="3"
                auto-grow
                hide-details="auto"
                placeholder='Examples: title:"apretar la tuerca" OR content:mecánica'
              ></v-textarea>
            </v-card>

            <v-text-field
              :model-value="filterPreview"
              :error-messages="filterValidation.error ? [filterValidation.error] : []"
              label="Filter Preview"
              prepend-inner-icon="mdi-filter-check-outline"
              variant="outlined"
              density="comfortable"
              readonly
              hide-details="auto"
              class="mb-2"
            ></v-text-field>

            <v-divider class="my-4"></v-divider>
            <h3 class="text-subtitle-1 font-weight-bold mb-3">Advanced Query Options</h3>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="facetBy"
                  label="Facet By"
                  placeholder="category,brand"
                  prepend-inner-icon="mdi-view-grid-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="maxFacetValues"
                  label="Max Facet Values"
                  type="number"
                  min="1"
                  max="1000"
                  prepend-inner-icon="mdi-counter"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="highlightFields"
                  label="Highlight Fields"
                  placeholder="name,title,content"
                  prepend-inner-icon="mdi-marker"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="includeFields"
                  label="Include Fields"
                  placeholder="id,title,price"
                  prepend-inner-icon="mdi-filter-plus-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="excludeFields"
                  label="Exclude Fields"
                  placeholder="internal_notes,debug"
                  prepend-inner-icon="mdi-filter-remove-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="groupBy"
                  label="Group By"
                  placeholder="category"
                  prepend-inner-icon="mdi-group"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model.number="groupLimit"
                  label="Group Limit"
                  type="number"
                  min="1"
                  max="1000"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model.number="numTypos"
                  label="Num Typos (0 = exact)"
                  type="number"
                  min="0"
                  max="4"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="hybridAlpha"
                  label="Hybrid Alpha"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="prefixMatch"
                  color="primary"
                  density="compact"
                  label="Prefix Matching"
                  hide-details
                ></v-switch>
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="prioritizeExactMatch"
                  color="primary"
                  density="compact"
                  label="Prioritize Exact Match"
                  hide-details
                ></v-switch>
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="exhaustiveSearch"
                  color="primary"
                  density="compact"
                  label="Exhaustive Search"
                  hide-details
                ></v-switch>
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="includeCreatedAt"
                  color="primary"
                  density="compact"
                  label="Include Created At"
                  hide-details
                ></v-switch>
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="includeMaybe"
                  color="primary"
                  density="compact"
                  label="Maybe Suggestions"
                  hide-details
                ></v-switch>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="maybeMin"
                  label="Maybe Min (threshold)"
                  type="number"
                  min="0"
                  max="1000"
                  :disabled="!includeMaybe"
                  prepend-inner-icon="mdi-tune"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="maybeLimit"
                  label="Maybe Limit"
                  type="number"
                  min="1"
                  max="20"
                  :disabled="!includeMaybe"
                  prepend-inner-icon="mdi-format-list-numbered"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                ></v-text-field>
              </v-col>
            </v-row>
          </div>
        </v-expand-transition>
        
        <div class="d-flex align-center justify-space-between mt-4 search-form-toggle-row">
          <v-btn
            variant="text"
            size="small"
            @click="showAdvancedFilters = !showAdvancedFilters"
            :prepend-icon="showAdvancedFilters ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          >
            {{ showAdvancedFilters ? 'Hide' : 'Show' }} Advanced Filters
          </v-btn>
        </div>
        
        <div class="search-form-actions">
          <v-tooltip text="Run search (Enter key)" location="top">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                color="primary"
                variant="flat"
                @click="handleSearch"
                :disabled="(!searchQuery && filters.length === 0) || Boolean(filterValidation.error)"
                size="small"
                prepend-icon="mdi-magnify"
                class="search-submit-btn"
              >
                Search
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mb-card search-usage-card" variant="outlined">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-book-open-page-variant-outline" size="20" color="#1976d2" class="mr-3"></v-icon>
        <span class="font-weight-bold">How to use</span>
      </v-card-title>
      <v-card-text>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Use these query patterns in the search box to build more precise searches.
        </div>

        <div class="search-usage-grid">
          <div v-for="example in searchUsageExamples" :key="example.label" class="search-usage-item">
            <div class="search-usage-label">{{ example.label }}</div>
            <code class="search-usage-code">{{ example.query }}</code>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      <div class="font-weight-bold mb-2">Search Error</div>
      <div class="mb-2">{{ error }}</div>
      <div class="text-caption" style="opacity: 0.8;">
        <strong>Tip:</strong> Verify the collection exists, your search query is valid, and you're connected to the server. Try refreshing the page or checking your connection status.
      </div>
    </v-alert>

    <v-alert
      v-if="!loading && maybeResult && Array.isArray(maybeResult.suggestions) && maybeResult.suggestions.length > 0"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      <div class="font-weight-bold mb-2">Maybe suggestions</div>
      <div class="d-flex flex-wrap ga-2">
        <v-chip
          v-for="(item, idx) in maybeResult.suggestions"
          :key="`maybe-suggestion-${idx}`"
          size="small"
          color="primary"
          variant="outlined"
          @click="searchQuery = item.text || item.name || searchQuery; handleSearch()"
        >
          {{ item.text || item.name }}
        </v-chip>
      </div>
    </v-alert>

    <v-card v-if="searchResults.length > 0" elevation="2" class="search-results-card">
      <v-card-title class="search-results-header">
        <div class="d-flex align-center flex-wrap results-header-main">
          <div class="d-flex align-center">
            <v-icon icon="mdi-file-document-multiple" class="mr-2" color="primary" size="24"></v-icon>
            <span class="text-h6 font-weight-bold">Search Results</span>
          </div>
          <v-chip color="primary" variant="tonal" size="small" class="results-count-chip">
            {{ totalFound || searchResults.length }} found
          </v-chip>
          <span v-if="(searchQuery || '').trim()" class="text-caption text-harmony-muted">
            Showing {{ searchResults.length }} of {{ totalFound || searchResults.length }} results for <strong>{{ searchQuery.trim() }}</strong><span v-if="searchTime"> ({{ searchTime }}s)</span>
          </span>
        </div>
        <v-spacer></v-spacer>
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          label="Sort"
          prepend-inner-icon="mdi-sort"
          variant="outlined"
          density="compact"
          class="results-sort-select"
          clearable
          @update:model-value="handleSortChange"
        ></v-select>
      </v-card-title>
      <v-card-text class="pa-4">
        <v-expansion-panels variant="accordion" class="mt-2">
          <v-expansion-panel
            v-for="(doc, index) in searchResults"
            :key="doc.id || index"
            elevation="1"
            class="mb-2"
          >
            <v-expansion-panel-title class="font-weight-medium">
              <div class="d-flex align-center justify-space-between w-100 pr-4 result-panel-head">
                <div class="d-flex flex-column result-panel-main">
                  <div class="d-flex align-center mb-1">
                    <code class="document-id-text">{{ doc.id || 'N/A' }}</code>
                  </div>
                  <div class="document-title-google">
                    {{ getBestTitle(doc) }}
                  </div>
                </div>
                <div class="d-flex align-center gap-2 result-score-wrap">
                  <v-chip
                    v-if="doc._text_match !== undefined"
                    color="success"
                    size="small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    Score: {{ typeof doc._text_match === 'number' ? doc._text_match.toFixed(2) : doc._text_match }}
                  </v-chip>
                </div>
              </div>
            </v-expansion-panel-title>
            
            <v-expansion-panel-text>
              <!-- Highlights if available -->
              <v-alert
                v-if="doc.highlights && Object.keys(doc.highlights).length > 0"
                type="info"
                variant="tonal"
                class="mb-3"
              >
                <div class="text-subtitle-2 font-weight-bold mb-2">Highlights:</div>
                <div v-for="(highlight, field) in doc.highlights" :key="field" class="mb-1">
                  <strong>{{ field }}:</strong>
                  <span v-html="formatServerHighlights(highlight)"></span>
                </div>
              </v-alert>
              
              <v-list class="bg-grey-lighten-5">
                <v-list-item
                  v-for="(value, key) in doc"
                  :key="key"
                  v-if="key !== 'id' && key !== '_text_match' && key !== 'highlights' && key !== 'text_match'"
                  class="mb-2"
                >
                  <v-list-item-title class="font-weight-medium text-primary mb-1">{{ key }}</v-list-item-title>
                  <v-list-item-subtitle class="text-body-2">
                    {{ typeof value === 'object' ? JSON.stringify(value, null, 2) : value }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>

    <v-card v-else-if="!loading && searchQuery && indexingInProgress" elevation="2">
      <v-card-text class="text-center py-12">
        <v-icon icon="mdi-database-sync" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <div class="text-h6 text-grey-darken-1 font-weight-medium">Indexing in progress</div>
        <div class="text-body-2 text-grey-darken-1 mt-2">Results may be incomplete. Try the search again in a few seconds.</div>
      </v-card-text>
    </v-card>

    <v-card v-else-if="!loading && searchQuery" elevation="2">
      <v-card-text class="text-center py-12">
        <v-icon icon="mdi-magnify" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <div class="text-h6 text-grey-darken-1 font-weight-medium">No search results</div>
        <div class="text-body-2 text-grey-darken-1 mt-2">Try adjusting your search terms or selecting a different collection</div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useSearch } from '../composables/useSearch'
import { useCollections } from '../composables/useCollections'
import { useSearchHistory } from '../composables/useSearchHistory'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useRoute, useRouter } from 'vue-router'
import { inject } from 'vue'
import TooltipHelp from '../components/TooltipHelp.vue'

import { getBestTitle, formatServerHighlights, getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { buildFilterExpression, resolveSearchTarget } from '../utils/queryHelpers'

const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })
const route = useRoute()
const router = useRouter()
const { collections, loadCollections } = useCollections(baseUrl)
const { searchResults, loading, error, totalFound, searchTime, indexingInProgress, maybeResult, performSearch } = useSearch(baseUrl)
const { addSearch, getRecentSearches } = useSearchHistory()

const searchPerformed = ref(false)

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'ctrl+k',
    handler: () => {
      // Focus search input
      const input = document.querySelector('.search-form-field input')
      if (input) input.focus()
    }
  },
  {
    key: 'ctrl+/',
    handler: () => {
      showAdvancedFilters.value = !showAdvancedFilters.value
      toast.info(showAdvancedFilters.value ? 'Advanced filters shown' : 'Advanced filters hidden', 'Filters')
    }
  },
  {
    key: 'escape',
    handler: () => {
      if (searchQuery.value) {
        searchQuery.value = ''
        searchResults.value = []
        searchPerformed.value = false
        toast.info('Search cleared', 'Cleared')
      }
    }
  }
])

const selectedCollection = ref('')
const searchQuery = ref('')
const searchLimit = ref(10)
const queryBy = ref([])
const sortBy = ref('_relevance')
const showAdvancedFilters = ref(false)
const filters = ref([])
const collectionSchema = ref(null)
const schemaLoading = ref(false)
const facetBy = ref('')
const maxFacetValues = ref(10)
const highlightFields = ref('')
const includeFields = ref('')
const excludeFields = ref('')
const groupBy = ref('')
const groupLimit = ref(3)
const numTypos = ref(0)
const hybridAlpha = ref(0.5)
const prefixMatch = ref(false)
const prioritizeExactMatch = ref(true)
const exhaustiveSearch = ref(false)
const includeCreatedAt = ref(true)
const includeMaybe = ref(true)
const maybeMin = ref(5)
const maybeLimit = ref(1)
const booleanOperatorChips = [
  { label: 'AND', value: 'AND' },
  { label: 'OR', value: 'OR' },
  { label: 'NOT', value: 'NOT' },
  { label: '(', value: '(' },
  { label: ')', value: ')' }
]

const filterOperators = [
  { label: 'Equals', value: '=' },
  { label: 'Not Equals', value: '!=' },
  { label: 'Greater Than', value: '>' },
  { label: 'Less Than', value: '<' },
  { label: 'Greater or Equal', value: '>=' },
  { label: 'Less or Equal', value: '<=' },
  { label: 'Contains', value: 'contains' },
  { label: 'Starts With', value: 'starts_with' }
]

const searchUsageExamples = [
  { label: 'Field-specific search', query: 'title:laptop' },
  { label: 'Range query', query: 'price:[100 TO 500]' },
  { label: 'Fuzzy search', query: 'laptop~2' },
  { label: 'Wildcard search', query: 'laptop*' },
  { label: 'Case-sensitive search', query: 'is:casesensitive Laptop' },
  { label: 'Boost term importance', query: 'laptop^2.0 computer' },
  { label: 'NOT operator', query: '!apple' },
  { label: 'Combined queries', query: 'title:laptop AND price:[100 TO 500]' }
]

const addFilter = () => {
  filters.value.push({
    field: '',
    operator: '=',
    value: '',
    connector: 'AND'
  })
}

const removeFilter = (index) => {
  filters.value.splice(index, 1)
}

const getFilterValueLabel = (operator) => {
  if (['>', '<', '>=', '<='].includes(operator)) return 'Numeric Value'
  return 'Value'
}

const isNumericFilter = (operator) => {
  return ['>', '<', '>=', '<='].includes(operator)
}

const baseSortOptions = [
  { title: 'Relevance', value: '_relevance' },
  { title: 'Score (Lowest First)', value: '_text_match:asc' },
  { title: 'Document ID (A-Z)', value: 'id:asc' },
  { title: 'Document ID (Z-A)', value: 'id:desc' },
  { title: 'Title (A-Z)', value: 'title:asc' },
  { title: 'Title (Z-A)', value: 'title:desc' }
]

const buildSortOptionPair = (fieldName) => {
  const lowerName = String(fieldName || '').toLowerCase()

  if (lowerName === 'rank' || lowerName.endsWith('_rank') || lowerName.includes('ranking')) {
    return [
      { title: `${fieldName} (Best First)`, value: `${fieldName}:asc` },
      { title: `${fieldName} (Worst First)`, value: `${fieldName}:desc` }
    ]
  }

  if (lowerName.includes('score') || lowerName.includes('rating') || lowerName.includes('count')) {
    return [
      { title: `${fieldName} (High to Low)`, value: `${fieldName}:desc` },
      { title: `${fieldName} (Low to High)`, value: `${fieldName}:asc` }
    ]
  }

  if (lowerName.includes('date') || lowerName.includes('created') || lowerName.includes('updated')) {
    return [
      { title: `${fieldName} (Newest First)`, value: `${fieldName}:desc` },
      { title: `${fieldName} (Oldest First)`, value: `${fieldName}:asc` }
    ]
  }

  return [
    { title: `${fieldName} (A-Z)`, value: `${fieldName}:asc` },
    { title: `${fieldName} (Z-A)`, value: `${fieldName}:desc` }
  ]
}

const sortOptions = computed(() => {
  const options = [...baseSortOptions]
  const seen = new Set(options.map((option) => option.value))
  const schema = collectionSchema.value

  if (schema && Array.isArray(schema.sortable_fields)) {
    schema.sortable_fields.forEach((field) => {
      const fieldName = typeof field === 'string' ? field : field?.name
      if (!fieldName) return

      buildSortOptionPair(fieldName).forEach((option) => {
        if (!seen.has(option.value)) {
          seen.add(option.value)
          options.push(option)
        }
      })
    })
  }

  return options
})

const availableFieldNames = computed(() => {
  const schema = collectionSchema.value
  if (!schema) return []

  const names = new Set()

  if (Array.isArray(schema.fields)) {
    schema.fields.forEach((field) => {
      const name = typeof field === 'string' ? field : field?.name
      if (name) names.add(String(name))
    })
  }

  if (Array.isArray(schema.searchable_fields)) {
    schema.searchable_fields.forEach((field) => {
      const name = typeof field === 'string' ? field : field?.name
      if (name) names.add(String(name))
    })
  }

  return Array.from(names)
})

const queryableFieldItems = computed(() => availableFieldNames.value)

const filterableFieldItems = computed(() => {
  const names = new Set(availableFieldNames.value)
  const schema = collectionSchema.value

  if (schema && Array.isArray(schema.filterable_fields)) {
    schema.filterable_fields.forEach((field) => {
      const name = typeof field === 'string' ? field : field?.name
      if (name) names.add(String(name))
    })
  }

  return Array.from(names)
})

const filterValidation = computed(() => buildFilterExpression(filters.value))
const filterPreview = computed(() => filterValidation.value.expression)

const collectionItems = computed(() => {
  return collections.value.map(col => ({
    title: col.name,
    value: col.name
  }))
})

const loadCollectionSchema = async () => {
  collectionSchema.value = null

  if (!selectedCollection.value?.trim()) {
    return
  }

  schemaLoading.value = true

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(selectedCollection.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}`)
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { Accept: 'application/json' }
    })

    if (response.status === 200 && response.data) {
      collectionSchema.value = response.data
    }
  } catch (err) {
    console.warn('SearchView: failed to load collection schema', err)
    collectionSchema.value = null
  } finally {
    schemaLoading.value = false
  }
}

// Read query parameters from URL on mount
onMounted(async () => {
  await loadCollections()
  
  // Read search parameters from URL (Vue Router already decodes them)
  if (route.query.q) {
    searchQuery.value = route.query.q
  }
  if (route.query.collection) {
    selectedCollection.value = route.query.collection
  }
  if (route.query.query_by) {
    queryBy.value = String(route.query.query_by)
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  }
  if (route.query.limit) {
    const limit = parseInt(route.query.limit)
    if (!isNaN(limit) && limit > 0) {
      searchLimit.value = limit
    }
  }
  if (route.query.sort_by) {
    sortBy.value = route.query.sort_by
  }
  if (route.query.maybe !== undefined) {
    const maybeRaw = String(route.query.maybe).trim().toLowerCase()
    includeMaybe.value = !(maybeRaw === 'false' || maybeRaw === '0' || maybeRaw === 'off' || maybeRaw === 'no')
  }
  if (route.query.maybe_min !== undefined) {
    const parsed = parseInt(route.query.maybe_min)
    if (!isNaN(parsed) && parsed >= 0) {
      maybeMin.value = parsed
    }
  }
  if (route.query.maybe_limit !== undefined) {
    const parsed = parseInt(route.query.maybe_limit)
    if (!isNaN(parsed) && parsed > 0) {
      maybeLimit.value = parsed
    }
  }
  
  // Auto-search if query is in URL
  if (searchQuery.value) {
    handleSearch()
  }
})

// Update URL when search is performed
const updateURL = () => {
  const query = {}
  if (searchQuery.value) {
    query.q = searchQuery.value  // Vue Router will encode automatically
  }
  if (selectedCollection.value) {
    query.collection = selectedCollection.value
  }
  if (Array.isArray(queryBy.value) && queryBy.value.length > 0) {
    query.query_by = queryBy.value.join(',')
  }
  if (searchLimit.value && searchLimit.value !== 10) {
    query.limit = searchLimit.value.toString()
  }
  if (sortBy.value && sortBy.value !== '_relevance' && sortBy.value !== '_text_match:desc') {
    query.sort_by = sortBy.value
  }
  if (!includeMaybe.value) {
    query.maybe = 'false'
  } else {
    if (maybeMin.value !== 5) {
      query.maybe_min = maybeMin.value.toString()
    }
    if (maybeLimit.value !== 1) {
      query.maybe_limit = maybeLimit.value.toString()
    }
  }
  
  // Update URL without reloading page
  router.push({ 
    path: '/search',
    query: Object.keys(query).length > 0 ? query : undefined
  }).catch(() => {
    // Ignore navigation errors (e.g., navigating to same route)
  })
}

const hasCaseSensitiveDirective = (query) => {
  return /\b(?:do|is):case[-_]?sensitive\b/i.test(String(query || ''))
}

const handleSearch = async () => {
  if (searchQuery.value || filters.value.length > 0) {
    const { collectionName, searchAllCollections } = resolveSearchTarget(selectedCollection.value)
    const { expression: filterBy, error: filterError } = buildFilterExpression(filters.value)

    if (filterError) {
      toast.error(filterError, 'Invalid filter')
      return
    }

    // Update URL with search parameters
    updateURL()
    
    const options = { searchAllCollections }
    // Set query_by only when explicit fields are provided.
    // If query_by is '*' or empty, omit it and let backend use default all-fields behavior.
    if (Array.isArray(queryBy.value) && queryBy.value.length > 0) {
      options.queryBy = queryBy.value.join(',')
    }
    
    // Add sort_by if specified
    if (sortBy.value && sortBy.value !== '_relevance') {
      options.sortBy = sortBy.value
    }
    
    // Add filter_by if filters are specified
    if (filterBy) {
      options.filterBy = filterBy
    }

    if (facetBy.value?.trim()) options.facetBy = facetBy.value.trim()
    if (maxFacetValues.value) options.maxFacetValues = maxFacetValues.value
    if (highlightFields.value?.trim()) options.highlightFields = highlightFields.value.trim()
    if (includeFields.value?.trim()) options.includeFields = includeFields.value.trim()
    if (excludeFields.value?.trim()) options.excludeFields = excludeFields.value.trim()
    if (groupBy.value?.trim()) options.groupBy = groupBy.value.trim()
    if (groupLimit.value) options.groupLimit = groupLimit.value
    if (numTypos.value !== null && numTypos.value !== undefined) options.numTypos = numTypos.value
    if (hybridAlpha.value !== null && hybridAlpha.value !== undefined && hybridAlpha.value !== '') options.hybridAlpha = hybridAlpha.value
    options.prefix = prefixMatch.value
    options.prioritizeExactMatch = prioritizeExactMatch.value
    options.exhaustiveSearch = exhaustiveSearch.value
    options.includeCreatedAt = includeCreatedAt.value
    if (hasCaseSensitiveDirective(searchQuery.value)) {
      options.caseSensitive = true
      options.numTypos = 0
      options.prefix = false
      options.includeMaybe = false
    } else {
      options.includeMaybe = includeMaybe.value
    }
    if (options.includeMaybe) {
      options.maybeMin = maybeMin.value
      options.maybeLimit = maybeLimit.value
    }
    
    await performSearch(
      collectionName,
      searchQuery.value || '', 
      searchLimit.value,
      options
    )
    
    // Save to search history
    if (searchQuery.value) {
      addSearch(searchQuery.value, collectionName, {
        filters: filters.value,
        queryBy: queryBy.value,
        sortBy: sortBy.value
      })
    }
  }
}

const appendQueryToken = (token) => {
  const current = (searchQuery.value || '').trim()

  if (!current) {
    searchQuery.value = token === ')' ? '' : token
    return
  }

  const needsSpace = !current.endsWith('(')
  searchQuery.value = `${current}${needsSpace ? ' ' : ''}${token}`.trim()
}

const appendFieldToken = (fieldName) => {
  const current = searchQuery.value || ''
  const snippet = `${fieldName}:`
  searchQuery.value = current && !/\s$/.test(current) ? `${current} ${snippet}` : `${current}${snippet}`
}

const clearSearchQuery = () => {
  searchQuery.value = ''
}

const handleSortChange = async () => {
  // Re-search with new sort order if we already have results
  if (searchQuery.value && searchResults.value.length > 0) {
    await handleSearch()
  }
}

watch(selectedCollection, async (nextValue, previousValue) => {
  if (previousValue && nextValue !== previousValue) {
    queryBy.value = []
  }
  await loadCollectionSchema()
})
</script>

<style scoped>
/* Search form card */
.search-form-card {
  margin-bottom: 24px !important;
  border: 1px solid #e2e8f0 !important;
}

.search-form-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
  border-bottom: 1.5px solid #e2e8f0 !important;
  padding: 24px 32px !important;
}

/* Search form improvements */
.search-form-row {
  margin: 0 -8px !important;
}

.search-form-field {
  margin-bottom: 0 !important;
}

.search-form-field :deep(.v-field) {
  background: #ffffff !important;
}

.search-form-actions {
  margin-top: 24px !important;
  padding-top: 16px !important;
  border-top: 1px solid #e2e8f0 !important;
  display: flex;
  justify-content: flex-end;
}

.advanced-query-surface {
  background: linear-gradient(180deg, #f8fbff 0%, #f3f8ff 100%);
  border: 1px solid #dbeafe;
  border-radius: 14px;
  padding: 16px;
}

.query-assistant-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  border-color: #cbd5e1 !important;
}

.assistant-section-label {
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.search-button {
  min-width: 160px !important;
}

/* Search results card */
.search-results-card {
  margin-top: 24px !important;
  border: 1px solid #e2e8f0 !important;
}

.search-results-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
  border-bottom: 1.5px solid #e2e8f0 !important;
  padding: 24px 32px !important;
}

.results-header-main {
  gap: 16px;
}

.results-count-chip {
  font-weight: 600 !important;
  font-size: 13px !important;
}

.results-sort-select {
  max-width: 220px !important;
  min-width: 180px !important;
}

.results-sort-select :deep(.v-field) {
  background: #ffffff !important;
}

/* Document title - harmonious styling */
.document-title-google {
  color: #1e293b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  line-height: 1.5 !important;
  margin-top: 6px !important;
  transition: color 0.2s ease !important;
}

.document-title-google:hover {
  color: #488aec !important;
}

/* Document ID - cleaner styling */
.document-id-text {
  font-size: 12px !important;
  color: #64748b !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  background: #f1f5f9 !important;
  padding: 4px 8px !important;
  border-radius: 6px !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px !important;
}

@media (max-width: 960px) {
  .search-form-card :deep(.v-card-title) {
    padding: 16px 20px !important;
  }

  .search-form-card :deep(.v-card-text) {
    padding: 0 20px 16px 20px !important;
  }

  .advanced-query-surface {
    padding: 12px;
  }

  .search-form-toggle-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .search-submit-btn {
    width: 100%;
  }

  .search-form-actions {
    justify-content: stretch;
  }

  .search-results-header {
    padding: 16px 24px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 12px !important;
  }

  .results-header-main {
    width: 100%;
    gap: 10px;
  }

  .results-sort-select {
    width: 100% !important;
    max-width: 100% !important;
  }

  .result-panel-head {
    align-items: flex-start !important;
    gap: 10px;
    padding-right: 0 !important;
  }

  .result-panel-main {
    width: 100%;
    min-width: 0;
  }

  .result-score-wrap {
    margin-left: 0 !important;
  }
}

@media (max-width: 600px) {
  .collections-header {
    margin-bottom: 12px !important;
  }

  .collections-title-text {
    font-size: 16px !important;
  }

  .search-form-card {
    margin-bottom: 12px !important;
  }

  .search-form-row {
    margin: 0 -4px !important;
  }

  .search-form-row :deep(.v-col) {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
  }

  .search-form-card :deep(.v-card-title) {
    padding: 14px 14px !important;
  }

  .search-form-card :deep(.v-card-text) {
    padding: 0 14px 14px 14px !important;
  }

  .advanced-query-surface {
    border-radius: 10px;
    padding: 10px;
  }

  .search-results-header {
    padding: 12px 14px !important;
  }

  .search-results-card :deep(.v-card-text) {
    padding: 10px !important;
  }

  .results-count-chip {
    font-size: 12px !important;
  }

  .document-title-google {
    font-size: 14px !important;
    line-height: 1.35 !important;
  }

  .document-id-text {
    font-size: 11px !important;
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

.search-usage-card {
  border-radius: 16px;
}

.search-usage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.search-usage-item {
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: #f8fafc;
}

.search-usage-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 8px;
}

.search-usage-code {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 10px 12px;
  border-radius: 10px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.82rem;
}
</style>
