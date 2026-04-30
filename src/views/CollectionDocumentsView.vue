<template>
  <div>
    <!-- Action Buttons Header - Same style as CollectionsView -->
    <div class="collections-header">
      <div class="collections-title-section">
        <h1 class="collections-title-text">
          <v-icon icon="mdi-folder" size="20" class="collection-dir-icon"></v-icon>
          <span class="collection-name-label">{{ collectionName || '' }}</span>
        </h1>
      </div>
      <!-- Action Buttons - Top Right -->
      <div class="collections-header-actions">
        <v-btn
          @click="goToAddDocument"
          variant="flat"
          size="small"
          prepend-icon="mdi-plus"
          class="collections-action-btn add-document-header-btn"
        >
          Add Document
        </v-btn>
        <v-btn
          @click="goToSchema"
          variant="flat"
          size="small"
          prepend-icon="mdi-code-braces"
          class="collections-action-btn schema-header-btn"
        >
          Schema
        </v-btn>
        <v-btn
          @click="openDeleteDialog"
          variant="flat"
          size="small"
          prepend-icon="mdi-delete"
          class="collections-action-btn delete-header-btn"
        >
          Delete
        </v-btn>
      </div>
    </div>


    <!-- Tabs for Collection Management - Light gray professional style -->
    <div class="collection-tabs-container mb-2">
      <div class="collection-tabs-bar">
        <v-tabs v-model="activeTab" class="collection-tabs" bg-color="transparent">
          <v-tab value="documents" class="collection-tab" :to="collectionTabRoute('documents')">
            <v-icon size="16" class="mr-2">mdi-file-document-outline</v-icon>
            <span class="tab-text">Documents</span>
            <span class="tab-count" v-if="totalDocuments > 0 || documents.length > 0">({{ totalDocuments > 0 ? totalDocuments : documents.length }})</span>
          </v-tab>
          <v-tab value="synonyms" class="collection-tab" :to="collectionTabRoute('synonyms')">
            <v-icon size="16" class="mr-2">mdi-swap-horizontal</v-icon>
            <span class="tab-text">Synonyms</span>
            <span class="tab-count">({{ synonyms.length }})</span>
          </v-tab>
          <v-tab value="stopwords" class="collection-tab" :to="collectionTabRoute('stopwords')">
            <v-icon size="16" class="mr-2">mdi-cancel</v-icon>
            <span class="tab-text">Stopwords</span>
            <span class="tab-count">({{ stopwords.length }})</span>
          </v-tab>
        </v-tabs>

        <router-link
          class="collection-search-help-link collection-search-help-link--tabs"
          :to="searchSyntaxRoute"
          aria-label="Open internal search syntax examples"
        >
          How to use
        </router-link>
      </div>
    </div>

    <!-- Documents Tab -->
    <div v-if="activeTab === 'documents'">
      <!-- Error Alert -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="error = null"
        elevation="1"
        icon="mdi-alert-circle"
      >
        <div class="text-h6 mb-2 font-weight-bold">Error Loading Documents</div>
        <div class="mb-2">{{ error }}</div>
      </v-alert>

      <!-- Collection Name Missing Alert -->
      <v-alert
        v-if="!collectionName || !collectionName.trim()"
        type="warning"
        variant="tonal"
        class="mb-4"
        elevation="1"
        icon="mdi-alert"
      >
        <div class="text-h6 mb-2 font-weight-bold">Collection Name Missing</div>
        <div class="mb-2">Unable to load documents. Please navigate to a valid collection.</div>
        <v-btn
          variant="outlined"
          size="default"
          prepend-icon="mdi-folder-multiple"
          @click="router.push('/collections')"
          class="unified-btn unified-btn-primary mt-3 white-bg-button"
        >
          Go to Collections
        </v-btn>
      </v-alert>

    <!-- Two Segmented Layout -->
    <!-- Show content if: not loading, OR has documents, OR has search results, OR has collection name (to show search/empty state) -->
    <div v-if="true" class="documents-layout-container" style="margin-top: 0 !important; padding-top: 0 !important;">
      <!-- Segment 1: Search Section -->
      <div v-if="documents.length > 0 || searchPerformed || collectionName" class="collection-search-shell">
        <div class="collection-search-card">
          <div class="collection-search-row">
            <div class="compact-search-wrapper collection-search-input">
              <v-icon class="compact-search-icon">mdi-magnify</v-icon>
              <input
                v-model="searchQuery"
                type="text"
                class="compact-search-input"
                placeholder="Search this collection"
                @keyup.enter="handleSearch"
                @input="handleSearchInput"
              />
              <i
                v-if="searchQuery"
                class="compact-search-clear mdi mdi-close-circle"
                @click="clearSearchInput"
              ></i>
            </div>
          </div>
        </div>

        <div v-if="showPageSpinner" class="search-centered-loading" aria-live="polite" :aria-label="loading ? 'Loading collection' : 'Searching'">
          <v-progress-circular
            indeterminate
            size="56"
            width="3"
            color="primary"
            class="search-mini-spinner"
          />
        </div>
        
        
        <div class="google-toolbar collection-results-toolbar" v-if="documents.length > 0 || searchPerformed">
          <div class="google-toolbar-left" style="gap: 16px;">
            <span class="google-results-count" v-if="searchPerformed && searchResults.length > 0" style="font-weight: 500; color: #3c4043; margin-left: 0;">
              {{ searchResults.length }} results ({{ searchTime }}s)
            </span>
            <span class="google-results-count" v-else-if="!searchPerformed && documents.length > 0" style="font-weight: 500; color: #3c4043; margin-left: 0;">
              {{ totalDocuments || documents.length }} documents
            </span>
          </div>

          <div class="google-toolbar-center"></div>

          <div class="google-toolbar-right" style="gap: 12px;">
            <v-menu
              v-model="showDateRangeMenu"
              attach="body"
              location="bottom end"
              location-strategy="connected"
              scroll-strategy="close"
              :close-on-content-click="false"
              offset="10"
              @update:model-value="(val) => { if (val) { showItemsPerPageMenu = false; showQuickSortMenu = false } }"
            >
              <template v-slot:activator="{ props }">
                <button
                  v-bind="props"
                  class="google-toolbar-btn items-per-page-btn collection-date-toolbar-btn collection-toolbar-segment-btn"
                  :class="{ 'active': showDateRangeMenu || hasDateRange }"
                  :aria-label="hasDateRange ? `Date filter ${dateRangeSummary}` : 'Open date filter'"
                  style="height: 40px; border-radius: 8px; padding: 0 16px; font-weight: 500; display: flex; align-items: center; gap: 8px;"
                >
                  <v-icon size="18">mdi-calendar-range</v-icon>
                  <span class="collection-toolbar-label collection-toolbar-label--desktop">{{ dateRangeButtonLabel }}</span>
                  <span class="collection-toolbar-label collection-toolbar-label--mobile">Date</span>
                  <i
                    v-if="hasDateRange"
                    class="mdi mdi-close-circle collection-date-trigger-clear"
                    @click.stop="clearDateRange"
                  ></i>
                </button>
              </template>

              <div class="collection-date-menu">
                <div class="collection-date-menu-header">
                  <div class="collection-date-menu-title">Filter by date</div>
                  <div class="collection-date-menu-subtitle">Use a simple range on `created_at`.</div>
                </div>

                <div class="collection-date-menu-grid">
                  <label class="collection-date-field">
                    <span class="collection-date-label">From</span>
                    <input
                      v-model="dateFrom"
                      type="date"
                      class="collection-date-input"
                      :max="dateTo || undefined"
                      @click="openNativeDatePicker"
                      @focus="openNativeDatePicker"
                    />
                  </label>

                  <label class="collection-date-field">
                    <span class="collection-date-label">To</span>
                    <input
                      v-model="dateTo"
                      type="date"
                      class="collection-date-input"
                      :min="dateFrom || undefined"
                      @click="openNativeDatePicker"
                      @focus="openNativeDatePicker"
                    />
                  </label>
                </div>

                <div class="collection-date-menu-actions">
                  <button
                    type="button"
                    class="collection-date-action ghost"
                    @click="clearDateRange"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    class="collection-date-action primary"
                    @click="applyDateRange"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </v-menu>

            <v-menu
              v-model="showItemsPerPageMenu"
              attach="body"
              location="bottom end"
              location-strategy="connected"
              scroll-strategy="close"
              :close-on-content-click="true"
              @update:model-value="(val) => { if (val) showQuickSortMenu = false }"
            >
              <template v-slot:activator="{ props }">
                <button
                  v-bind="props"
                  class="google-toolbar-btn items-per-page-btn collection-toolbar-segment-btn"
                  :class="{ 'active': showItemsPerPageMenu }"
                  style="height: 40px; border-radius: 8px; padding: 0 16px; font-weight: 500; display: flex; align-items: center; gap: 8px;"
                >
                  <v-icon size="18">mdi-format-list-numbered</v-icon>
                  <span class="collection-toolbar-label collection-toolbar-label--desktop">{{ itemsPerPage }} per page</span>
                  <span class="collection-toolbar-label collection-toolbar-label--mobile">Per page</span>
                </button>
              </template>
              <v-list class="google-menu">
                <v-list-subheader>Results per page</v-list-subheader>
                <v-list-item
                  v-for="option in itemsPerPageOptions"
                  :key="option"
                  @click="itemsPerPage = option; onItemsPerPageChange(option); showItemsPerPageMenu = false"
                  :class="['google-menu-item', { 'active': itemsPerPage === option }]"
                >
                  <v-list-item-title>{{ option }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
            
            <v-menu
              v-model="showQuickSortMenu"
              attach="body"
              location="bottom start"
              location-strategy="connected"
              scroll-strategy="close"
              :close-on-content-click="true"
              @update:model-value="(val) => { if (val) showItemsPerPageMenu = false }"
            >
              <template v-slot:activator="{ props }">
                <button
                  v-bind="props"
                  class="google-toolbar-btn quick-sort-btn collection-toolbar-segment-btn"
                  :class="{ 'active': showQuickSortMenu }"
                  :aria-label="`Sort: ${getQuickSortLabel()}`"
                  style="height: 40px; border-radius: 8px;"
                >
                  <v-icon size="16">mdi-sort-variant</v-icon>
                  <span class="collection-toolbar-label collection-toolbar-label--desktop">{{ getQuickSortLabel() }}</span>
                  <span class="collection-toolbar-label collection-toolbar-label--mobile">Sort</span>
                </button>
              </template>
              <v-list class="google-menu">
                <v-list-subheader>Sort by</v-list-subheader>
                <v-list-item
                  @click="setQuickSort('title:asc')"
                  :class="['google-menu-item', { 'active': quickSortBy === 'title:asc' }]"
                >
                  <v-list-item-title>Alphabetical (A-Z)</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="setQuickSort('title:desc')"
                  :class="['google-menu-item', { 'active': quickSortBy === 'title:desc' }]"
                >
                  <v-list-item-title>Alphabetical (Z-A)</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="setQuickSort('created_at:desc')"
                  :class="['google-menu-item', { 'active': quickSortBy === 'created_at:desc' }]"
                >
                  <v-list-item-title>Date (Newest First)</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="setQuickSort('created_at:asc')"
                  :class="['google-menu-item', { 'active': quickSortBy === 'created_at:asc' }]"
                >
                  <v-list-item-title>Date (Oldest First)</v-list-item-title>
                </v-list-item>
                <v-divider class="my-1"></v-divider>
                <v-list-item
                  @click="setQuickSort(null)"
                  class="google-menu-item"
                >
                  <v-list-item-title>Relevance (Default)</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>

        <!-- Advanced Filters - OLD PANEL (hidden, replaced by compact version above) -->
        <v-expand-transition>
          <div v-if="false" class="advanced-filters-panel mt-4">
            <v-card variant="elevated" elevation="2" class="filters-card-modern">
              <v-card-text class="pa-6">
                <div class="filters-header mb-4">
                  <div class="d-flex align-center">
                    <v-icon size="20" color="primary" class="mr-2">mdi-tune</v-icon>
                    <span class="text-h6 font-weight-medium">Advanced Search Options</span>
                  </div>
                  <v-chip
                    v-if="hasActiveFilters"
                    size="small"
                    color="primary"
                    variant="flat"
                    class="ml-auto"
                  >
                    {{ activeFiltersCount }} active
                  </v-chip>
                </div>
                <v-divider class="mb-6"></v-divider>
                
                <!-- Query By Fields -->
                <div class="mb-6">
                  <div class="filter-field-label mb-3">
                    <v-icon size="18" color="primary" class="mr-2">mdi-text-search</v-icon>
                    <span class="text-subtitle-1 font-weight-medium">Search in Specific Fields</span>
                    <v-chip
                      v-if="queryByFields && queryByFields.length > 0"
                      size="x-small"
                      color="primary"
                      variant="flat"
                      class="ml-2"
                    >
                      {{ queryByFields.length }} field{{ queryByFields.length !== 1 ? 's' : '' }}
                    </v-chip>
                  </div>
                  <v-select
                    v-model="queryByFields"
                    :items="availableFields"
                    item-title="name"
                    item-value="name"
                    placeholder="Select fields to search (or leave empty to search all)"
                    variant="outlined"
                    density="comfortable"
                    class="filter-input-modern search-fields-select"
                    multiple
                    chips
                    clearable
                    hide-details
                    closable-chips
                    prepend-inner-icon="mdi-tag-multiple"
                  >
                    <template v-slot:selection="{ item, index }">
                      <v-chip
                        v-if="index < 2"
                        size="small"
                        color="primary"
                        variant="flat"
                        closable
                        @click:close="queryByFields = queryByFields.filter(f => f !== item.value)"
                        class="ma-1"
                      >
                        <v-icon start size="14">mdi-tag</v-icon>
                        {{ item.title }}
                      </v-chip>
                      <span
                        v-if="index === 2"
                        class="text-grey-darken-1 text-caption align-self-center ml-2"
                        style="font-weight: 500;"
                      >
                        +{{ queryByFields.length - 2 }} more field{{ queryByFields.length - 2 !== 1 ? 's' : '' }}
                      </span>
                    </template>
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props" class="filter-field-item">
                        <template v-slot:prepend>
                          <v-icon size="18" color="primary" class="mr-3">mdi-tag-outline</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-medium">{{ item.title }}</v-list-item-title>
                        <template v-slot:append>
                          <v-chip
                            v-if="queryByFields && queryByFields.includes(item.value)"
                            size="x-small"
                            color="primary"
                            variant="flat"
                            class="font-weight-bold"
                          >
                            ✓
                          </v-chip>
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>
                  <div class="filter-hint-modern mt-2">
                    <v-icon size="14" class="mr-1" color="info">mdi-information</v-icon>
                    <span>Leave empty to search across all {{ availableFields.length }} available fields, or select specific ones</span>
                  </div>
                </div>

                <!-- Filters Section -->
                <div>
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div class="filter-field-label">
                      <v-icon size="18" color="primary" class="mr-2">mdi-filter-variant</v-icon>
                      <span class="text-subtitle-1 font-weight-medium">Filter Results</span>
                      <v-chip
                        v-if="filters.length > 0"
                        size="x-small"
                        color="secondary"
                        variant="flat"
                        class="ml-2"
                      >
                        {{ filters.filter(f => f.field && f.operator && f.value).length }} active
                      </v-chip>
                    </div>
                    <v-btn
                      size="default"
                      variant="flat"
                      color="primary"
                      @click="addFilter"
                      class="add-filter-btn-modern"
                      prepend-icon="mdi-plus"
                    >
                      Add Filter
                    </v-btn>
                  </div>
                  
                  <div v-if="filters.length === 0" class="no-filters-message-modern">
                    <v-icon size="24" class="mr-3" color="grey-lighten-1">mdi-filter-off</v-icon>
                    <div>
                      <div class="text-body-1 font-weight-medium mb-1">No filters applied</div>
                      <div class="text-caption text-grey-darken-1">Add filters to narrow down your search results by specific field values</div>
                    </div>
                  </div>
                  
                  <div v-for="(filter, index) in filters" :key="`filter-${index}-${filter.field}-${filter.value}`" class="filter-row-modern mb-4">
                    <v-card variant="elevated" elevation="1" class="filter-card-modern-item">
                      <v-card-text class="pa-4">
                        <div class="d-flex align-center justify-space-between mb-3">
                          <div class="d-flex align-center">
                            <v-chip
                              v-if="index > 0"
                              size="small"
                              variant="flat"
                              color="secondary"
                              class="filter-connector-chip-modern mr-3"
                            >
                              <v-icon start size="14">mdi-link</v-icon>
                              {{ filter.connector }}
                            </v-chip>
                            <span class="text-caption text-grey-darken-1 font-weight-medium">Filter {{ index + 1 }}</span>
                          </div>
                          <v-btn
                            icon
                            variant="text"
                            size="small"
                            @click="removeFilter(index)"
                            class="remove-filter-btn-modern"
                            color="error"
                          >
                            <v-icon size="20">mdi-close</v-icon>
                          </v-btn>
                        </div>
                        <div class="d-flex align-center flex-wrap gap-3">
                          <div style="flex: 1; min-width: 180px;">
                            <label class="filter-field-label-small mb-2">Field Name</label>
                            <v-select
                              v-model="filter.field"
                              :items="filterableFields"
                              item-title="name"
                              item-value="name"
                              placeholder="Select field..."
                              variant="outlined"
                              density="comfortable"
                              hide-details
                              class="filter-field-select-modern"
                              @update:model-value="updateFilterField(index)"
                              prepend-inner-icon="mdi-tag"
                            ></v-select>
                          </div>
                          <div style="min-width: 140px;">
                            <label class="filter-field-label-small mb-2">Operator</label>
                            <v-select
                              v-model="filter.operator"
                              :items="getOperatorsForField(filter.field)"
                              item-title="label"
                              item-value="value"
                              placeholder="Operator"
                              variant="outlined"
                              density="comfortable"
                              hide-details
                              class="filter-operator-select-modern"
                            ></v-select>
                          </div>
                          <div style="flex: 1; min-width: 200px;">
                            <label class="filter-field-label-small mb-2">{{ getValueLabel(filter.operator) }}</label>
                            <v-text-field
                              v-model="filter.value"
                              :type="isNumericOperator(filter.operator) ? 'number' : 'text'"
                              variant="outlined"
                              density="comfortable"
                              hide-details
                              class="filter-value-input-modern"
                              :placeholder="getValuePlaceholder(filter.operator)"
                            ></v-text-field>
                          </div>
                        </div>
                        <div v-if="index > 0" class="mt-3 pt-3" style="border-top: 1px solid #e2e8f0;">
                          <label class="filter-field-label-small mb-2">Combine with previous filter</label>
                          <v-select
                            v-model="filter.connector"
                            :items="[
                              { title: 'AND - Must match both', value: 'AND' },
                              { title: 'OR - Match either one', value: 'OR' }
                            ]"
                            item-title="title"
                            item-value="value"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            class="filter-connector-select-modern"
                            style="max-width: 250px;"
                          ></v-select>
                        </div>
                      </v-card-text>
                    </v-card>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </v-expand-transition>

        <v-alert
          v-if="searchError"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="searchError = null"
        >
          <div class="font-weight-bold mb-1">Search Error</div>
          {{ searchError }}
        </v-alert>

        <v-alert
          v-if="searchPerformed && searchResults.length === 0 && indexingInProgress && !searchLoading && !searchInputPending && !searchError"
          type="info"
          variant="tonal"
          class="mt-4"
          icon="mdi-database-sync"
        >
          <div class="font-weight-bold mb-1">Indexing in progress</div>
          <div>Results may be incomplete. Try the search again in a few seconds.</div>
        </v-alert>

        <div
          v-if="searchPerformed && searchResults.length === 0 && !searchLoading && !searchInputPending && !indexingInProgress"
          class="collection-search-empty"
        >
          <div class="collection-search-empty-hero">
            <div class="collection-search-empty-icon">
              <v-icon size="22" color="#043061">mdi-magnify-close</v-icon>
            </div>
            <div class="collection-search-empty-copyblock">
              <div class="collection-search-empty-title">
                No matches for <span>{{ searchQuery }}</span>
              </div>
              <div class="collection-search-empty-copy">
                Try adjusting your search terms or filters.
              </div>
            </div>
            <div class="collection-search-empty-count">0 results found</div>
          </div>

          <div
            v-if="showMaybeSuggestions"
            class="collection-maybe-shell collection-maybe-shell-inline collection-maybe-shell-empty"
          >
            <div class="collection-maybe-card collection-maybe-card-inline collection-maybe-card-empty">
              <div class="collection-maybe-header collection-maybe-header-inline">
                <div class="collection-maybe-title-row">
                  <v-icon size="16" color="#64748b">mdi-lightbulb-outline</v-icon>
                  <span class="collection-maybe-title">Suggestions</span>
                </div>
                <div class="collection-maybe-meta">
                  Try one of these nearby terms
                </div>
              </div>

              <div class="collection-maybe-grid">
                <button
                  v-for="(item, idx) in filteredMaybeSuggestions"
                  :key="`collection-maybe-${idx}`"
                  type="button"
                  class="collection-maybe-chip"
                  @click="applyMaybeSuggestion(item)"
                >
                  <span class="collection-maybe-chip-text">{{ item.text || item.name }}</span>
                  <span v-if="item.score !== undefined" class="collection-maybe-chip-score">{{ Number(item.score).toFixed(2) }}</span>
                </button>
              </div>

              <div v-if="showMaybeMessage" class="collection-maybe-caption">
                {{ maybeResult.message }}
              </div>
            </div>
          </div>

          <div v-else class="collection-search-empty-tips">
            <span class="collection-search-empty-tip">Check spelling</span>
            <span class="collection-search-empty-tip">Try a shorter term</span>
            <span class="collection-search-empty-tip">Remove restrictive filters</span>
          </div>
        </div>
      </div>

      <!-- Segment 2: Documents Results -->
      <div class="documents-results-container" style="margin-top: 0 !important; padding-top: 0 !important;">
        <!-- Search Results -->
        <div v-if="searchPerformed && searchResults.length > 0">
          <div style="display: flex; flex-direction: column; gap: 0; padding: 0; margin: 0; border-top: none !important;">
            <div 
              v-for="(doc, index) in paginatedSearchResults" 
              :key="doc.id || index"
              class="document-result-item"
              style="background: transparent; border: none; border-radius: 0; padding: 40px 0 4px 0; margin: 0 0 40px 0; box-shadow: none; transition: background-color 0.2s; user-select: text; -webkit-user-select: text;"
            >
              <router-link
                :to="getDocumentRoute(doc)"
                class="document-result-link document-result-link-card"
                @click="handleDocumentClick(doc, $event)"
              >
                <h3 class="document-title-link">
                  {{ getBestTitle(doc) }}
                </h3>
                <div
                  class="document-meta-link"
                  style="display: flex; align-items: flex-start; gap: 2px; cursor: pointer; user-select: text; -webkit-user-select: text; padding: 0; margin: 0;"
                >
                  <span v-if="formatDocumentDate(doc)" style="color: #4a5568; font-weight: normal; font-size: 14px;">{{ formatDocumentDate(doc) }}</span>
                  <span v-if="formatDocumentDate(doc)" style="color: #4a5568; font-size: 14px;">-</span>
                  <span class="doc-name-link" style="color: #006621; font-size: 14px; font-weight: normal;">{{ doc.name || doc.id || 'No name' }}</span>
                  <span v-if="doc._text_match !== undefined" style="color: #70757a; font-size: 12px; margin-left: 8px;">Score: {{ typeof doc._text_match === 'number' ? doc._text_match.toFixed(2) : doc._text_match }}</span>
                </div>

                <div class="document-snippet">
                  <span v-if="doc.highlights && doc.highlights.content" v-html="formatServerHighlights(String(doc.highlights.content))"></span>
                  <span v-else-if="getBestContent(doc)">
                    <span v-if="searchQuery && searchQuery.trim()" v-html="makeSearchedWordsBold(String(getBestContent(doc)))"></span>
                    <span v-else>{{ getBestContent(doc) }}</span>
                  </span>
                  <span v-else-if="doc.highlights && Object.keys(doc.highlights).length > 0">
                    <span v-for="(highlight, field) in doc.highlights" :key="field">
                      <span v-if="field !== 'title' && field !== 'name' && field !== 'id'" v-html="formatServerHighlights(String(Array.isArray(highlight) ? highlight.join(' ... ') : highlight))"></span>
                    </span>
                  </span>
                  <span v-else style="color: #70757a;">No preview available</span>
                </div>
              </router-link>
            </div>
          </div>
          
          <!-- Pagination Controls - BOTTOM ONLY for search results -->
          <div v-if="searchResults.length > 0" style="display: flex; justify-content: center; padding: 20px 0; margin-top: 20px; border-top: none !important;">
            <v-pagination
              v-model="currentPage"
              :length="paginationInfo.totalPages"
              :total-visible="7"
              @update:model-value="onPageChange"
              class="table-pagination pagination-centered"
            ></v-pagination>
          </div>
        </div>

        <!-- FORCE RENDER: Always show, bypass all conditions - MOVED TO TOP -->
        <!-- All Documents (when no search) -->
        <div v-if="!searchPerformed && documents.length === 0 && !loading" class="empty-state-container">
          <div class="text-center pa-8">
            <div class="text-h6 text-grey-darken-1">No documents here</div>
          </div>
        </div>

        <!-- All Documents (when no search) -->
        <div v-if="!searchPerformed">
          <div v-if="documents && documents.length > 0" style="display: flex; flex-direction: column; gap: 0; padding: 0; margin: 0; border-top: none !important;">
            <div 
              v-for="(doc, index) in paginatedDocuments" 
              :key="doc.id || index"
              class="document-result-item"
              style="background: transparent; border: none; border-radius: 0; padding: 40px 0 4px 0; margin: 0 0 40px 0; box-shadow: none; transition: background-color 0.2s; user-select: text; -webkit-user-select: text;"
            >
              <router-link
                :to="getDocumentRoute(doc)"
                class="document-result-link document-result-link-card"
                @click="handleDocumentClick(doc, $event)"
              >
                <h3 class="document-title-link">
                  {{ getBestTitle(doc) }}
                </h3>
                <div
                  class="document-meta-link"
                  style="display: flex; align-items: flex-start; gap: 2px; cursor: pointer; user-select: text; -webkit-user-select: text; padding: 0; margin: 0;"
                >
                  <span v-if="formatDocumentDate(doc)" style="color: #4a5568; font-weight: normal; font-size: 14px;">{{ formatDocumentDate(doc) }}</span>
                  <span v-if="formatDocumentDate(doc)" style="color: #4a5568; font-size: 14px;">-</span>
                  <span class="doc-name-link" style="color: #006621; font-size: 14px; font-weight: normal;">{{ doc.name || doc.id || 'No name' }}</span>
                </div>

                <div class="document-snippet">
                  <template v-if="doc.highlights && Object.keys(doc.highlights).length > 0">
                    <div v-for="(highlight, field) in doc.highlights" :key="field">
                      <span v-if="field !== 'title' && field !== 'name'" v-html="formatServerHighlights(Array.isArray(highlight) ? highlight.join(' ... ') : (highlight || ''))"></span>
                    </div>
                  </template>
                  <span v-else-if="getBestContent(doc)" v-html="makeSearchedWordsBold(cleanHighlightText(getBestContent(doc)))"></span>
                  <span v-else style="color: #70757a;">No preview available</span>
                </div>
              </router-link>
            </div>
          </div>
          
          <!-- Pagination Controls - BOTTOM ONLY -->
          <div v-if="documents.length > 0" style="display: flex; justify-content: center; padding: 20px 0; margin-top: 20px; border-top: none !important;">
            <v-pagination
              v-model="currentPage"
              :length="paginationInfo.totalPages"
              :total-visible="7"
              @update:model-value="onPageChange"
              class="table-pagination pagination-centered"
            ></v-pagination>
          </div>
          
          <!-- ORIGINAL CARDS (hidden for now) -->
          <div v-if="false && documents && documents.length > 0" class="documents-cards-container" style="display: flex !important; flex-direction: column !important; gap: 24px !important;">
            <router-link
              v-for="(doc, index) in paginatedDocuments"
              :key="doc.id || `doc-${index}`"
              :to="getDocumentRoute(doc)"
              style="text-decoration: none !important; display: block !important; visibility: visible !important; opacity: 1 !important; cursor: text !important; user-select: text !important; pointer-events: auto !important; margin-bottom: 14px !important;"
              @click.stop
              class="no-tooltip document-link"
            >
            <v-card
              class="mb-3 document-card-clickable no-tooltip-card"
              style="cursor: text !important; pointer-events: auto !important; display: block !important; visibility: visible !important; opacity: 1 !important; background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; padding: 9px 14px 12px !important;"
              :title="null"
              :hover="false"
              :ripple="false"
              :elevation="0"
            >
              <v-card-text class="google-result-card">
                <div class="google-result-content">
                  <!-- Title (Google style - blue, clickable) -->
                  <h3 class="google-result-title">
                    <span>{{ getBestTitle(doc) }}</span>
                  </h3>
                  <!-- URL/ID (Google style - green, smaller) - right below title -->
                  <div class="google-result-url">
                    <span class="google-result-url-text">{{ doc.id }}</span>
                  </div>
                  
                  <!-- Snippet/Description (Google style) -->
                  <div class="google-result-snippet">
                    <div v-if="getGoogleResultDate(doc)" class="google-result-meta">
                      <span class="google-result-date">{{ getGoogleResultDate(doc) }}</span>
                    </div>
                    <!-- Highlights Preview -->
                    <template v-if="doc.highlights && Object.keys(doc.highlights).length > 0">
                      <div v-for="(highlight, field) in doc.highlights" :key="field" class="google-highlight-field">
                        <span v-if="field !== 'title'" v-html="formatServerHighlights(Array.isArray(highlight) ? highlight.join(' ... ') : (highlight || ''))"></span>
                      </div>
                    </template>
                    <!-- Content Preview -->
                    <div v-else-if="getContentPreview(doc)" v-html="cleanHighlightText(getContentPreview(doc))"></div>
                    <!-- Fallback if no highlights or preview -->
                    <div v-else class="google-result-fallback">
                      <span v-if="!getGoogleResultDate(doc) && getDocumentDate(doc)" class="google-result-date">{{ formatDocumentDate(doc) }}</span>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
            </router-link>
          </div>
          
        </div>
      </div> <!-- End documents-results-container -->
    </div> <!-- End documents-layout-container -->

    </div> <!-- End Documents Tab -->

    <!-- Synonyms Tab -->
    <div v-if="activeTab === 'synonyms'">
      <div class="collections-header mb-3" style="padding: 12px 0;">
        <div class="collections-title-section">
          <h2 class="collections-title-text" style="font-size: 18px; font-weight: 600; margin: 0;">Synonyms</h2>
          <div class="collections-pagination-info-top" v-if="synonyms.length > 0" style="font-size: 12px; margin-top: 4px;">
            <v-icon size="12" class="mr-1" style="opacity: 0.7;">mdi-swap-horizontal</v-icon>
            {{ synonyms.length }} {{ synonyms.length === 1 ? 'synonym' : 'synonyms' }}
          </div>
        </div>
        <div class="collections-header-actions">
          <v-btn
            @click="toggleInlineSynonymForm"
            variant="flat"
            size="small"
            prepend-icon="mdi-plus"
            class="collections-action-btn add-synonym-btn"
            style="font-weight: 500; min-width: 120px;"
          >
            {{ showInlineAddSynonym ? 'Close Form' : 'Add Synonym' }}
          </v-btn>
        </div>
      </div>

      <v-expand-transition>
        <v-card v-if="showInlineAddSynonym" class="mb-4 documents-table-card synonyms-table-card collection-inline-form-card">
          <v-card-text class="collection-inline-form-body">
            <div class="collection-inline-form-grid">
              <v-text-field
                v-model="inlineSynonymForm.root"
                label="Root term"
                variant="outlined"
                density="compact"
                hide-details="auto"
                prepend-inner-icon="mdi-label"
                class="collection-inline-input"
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
                class="collection-inline-input"
              />
            </div>
            <v-alert
              v-if="inlineSynonymError"
              type="error"
              variant="tonal"
              class="mt-4"
              closable
              @click:close="inlineSynonymError = null"
            >
              {{ inlineSynonymError }}
            </v-alert>
          </v-card-text>
          <v-card-actions class="collection-inline-form-actions">
            <v-spacer></v-spacer>
            <v-btn variant="flat" size="small" class="collection-inline-cancel-btn collections-action-btn collection-inline-cancel-btn--danger" @click="closeInlineSynonymForm" :disabled="addingInlineSynonym">Cancel</v-btn>
            <v-btn color="primary" variant="flat" size="small" class="collection-inline-submit-btn collections-action-btn add-synonym-btn" @click="submitInlineSynonym" :loading="addingInlineSynonym">Add Synonym</v-btn>
          </v-card-actions>
        </v-card>
      </v-expand-transition>
      
      <v-alert
        v-if="synonymsError"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        elevation="1"
        icon="mdi-alert-circle"
        @click:close="synonymsError = null"
      >
        <div class="text-h6 mb-2 font-weight-bold">Error Loading Synonyms</div>
        <div>{{ synonymsError }}</div>
      </v-alert>

      <v-card v-if="synonymsLoading" class="loading-state mb-card">
        <v-card-text class="text-center py-12">
          <div class="text-h6 text-grey-darken-1 font-weight-medium">Loading synonyms...</div>
          <div class="text-body-2 text-grey-darken-1 mt-2">Please wait while we fetch your data</div>
        </v-card-text>
      </v-card>

      <v-card v-if="!synonymsLoading && synonyms.length === 0 && !synonymsError" class="mb-card">
        <v-card-text class="text-center py-12 empty-state">
          <v-icon size="64" color="#cbd5e1" class="empty-icon-animated mb-6">mdi-swap-horizontal</v-icon>
          <div class="text-h6 text-grey-darken-1 mb-2 font-weight-medium empty-state-title">No synonyms found</div>
          <div class="text-body-2 text-grey-darken-1 empty-state-subtitle">
            Add synonyms to improve search results
          </div>
        </v-card-text>
      </v-card>

      <!-- Synonyms Table -->
      <div v-if="!synonymsLoading && synonyms.length > 0" class="documents-table-card synonyms-table-card">
        <v-table class="documents-table synonyms-table">
          <thead>
            <tr class="table-header-row">
              <th class="table-header-cell" style="width: 60px;">#</th>
              <th class="table-header-cell" style="min-width: 200px;">Root Term</th>
              <th class="table-header-cell" style="min-width: 400px;">Synonyms</th>
              <th class="table-header-cell" style="width: 120px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(synonym, index) in synonyms"
              :key="`synonym-${index}-${synonym.id || synonym.root || ''}`"
              class="table-row"
            >
              <td class="table-cell" style="color: #64748b; font-weight: 500;">
                {{ index + 1 }}
              </td>
              <td class="table-cell" style="font-size: 14px;">
                {{ synonym.root || 'N/A' }}
              </td>
              <td class="table-cell">
                <div class="d-flex flex-wrap" style="gap: 6px;">
                  <v-chip
                    v-for="(term, termIndex) in synonym.synonyms"
                    :key="`synonym-term-${termIndex}-${term || ''}-${synonym.root || ''}`"
                    color="primary"
                    variant="flat"
                    size="small"
                    class="font-weight-medium"
                    style="font-size: 12px;"
                  >
                    {{ term }}
                  </v-chip>
                  <span v-if="!synonym.synonyms || synonym.synonyms.length === 0" style="color: #94a3b8; font-style: italic;">
                    No synonyms
                  </span>
                </div>
              </td>
              <td class="table-cell" style="text-align: center; vertical-align: middle; padding: 16px 20px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    @click="openDeleteSynonymDialog(synonym)"
                    class="professional-delete-btn"
                  >
                    <v-icon size="18">mdi-delete-outline</v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </div>

    <!-- Stopwords Tab -->
    <div v-if="activeTab === 'stopwords'">
      <div class="collections-header mb-4">
        <div class="collections-title-section">
          <h1 class="collections-title-text">Stopwords</h1>
          <div class="collections-pagination-info-top" v-if="stopwords.length > 0">
            <v-icon size="14" class="mr-2" style="opacity: 0.7;">mdi-cancel</v-icon>
            {{ stopwords.length }} {{ stopwords.length === 1 ? 'stopword' : 'stopwords' }}
          </div>
        </div>
        <div class="collections-header-actions">
          <v-btn
            @click="toggleInlineStopwordForm"
            variant="flat"
            size="default"
            prepend-icon="mdi-plus"
            class="collections-action-btn add-stopword-btn"
            style="font-weight: 600; min-width: 140px;"
          >
            {{ showInlineAddStopword ? 'Close Form' : 'Add Stopword' }}
          </v-btn>
        </div>
      </div>

      <v-expand-transition>
        <v-card v-if="showInlineAddStopword" class="mb-4 documents-table-card stopwords-table-card collection-inline-form-card">
          <v-card-text class="collection-inline-form-body">
            <div class="collection-inline-form-grid">
              <v-text-field
                v-model="inlineStopwordForm.word"
                label="Stopword"
                variant="outlined"
                density="compact"
                hide-details="auto"
                prepend-inner-icon="mdi-text-box-outline"
                class="collection-inline-input"
              />
            </div>
            <v-alert
              v-if="inlineStopwordError"
              type="error"
              variant="tonal"
              class="mt-4"
              closable
              @click:close="inlineStopwordError = null"
            >
              {{ inlineStopwordError }}
            </v-alert>
          </v-card-text>
          <v-card-actions class="collection-inline-form-actions">
            <v-spacer></v-spacer>
            <v-btn variant="flat" size="small" class="collection-inline-cancel-btn collections-action-btn collection-inline-cancel-btn--danger" @click="closeInlineStopwordForm" :disabled="addingInlineStopword">Cancel</v-btn>
            <v-btn color="primary" variant="flat" size="small" class="collection-inline-submit-btn collections-action-btn add-stopword-btn" @click="submitInlineStopword" :loading="addingInlineStopword">Add Stopword</v-btn>
          </v-card-actions>
        </v-card>
      </v-expand-transition>
      
      <v-alert
        v-if="stopwordsError"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        elevation="1"
        icon="mdi-alert-circle"
        @click:close="stopwordsError = null"
      >
        <div class="text-h6 mb-2 font-weight-bold">Error Loading Stopwords</div>
        <div>{{ stopwordsError }}</div>
      </v-alert>

      <v-card v-if="stopwordsLoading" class="loading-state mb-card">
        <v-card-text class="text-center py-12">
          <div class="text-h6 text-grey-darken-1 font-weight-medium">Loading stopwords...</div>
          <div class="text-body-2 text-grey-darken-1 mt-2">Please wait while we fetch your data</div>
        </v-card-text>
      </v-card>

      <v-card v-if="!stopwordsLoading && stopwords.length === 0 && !stopwordsError" class="mb-card">
        <v-card-text class="text-center py-12 empty-state">
          <v-icon size="64" color="#cbd5e1" class="empty-icon-animated mb-6">mdi-cancel</v-icon>
          <div class="text-h6 text-grey-darken-1 mb-2 font-weight-medium empty-state-title">No stopwords found</div>
          <div class="text-body-2 text-grey-darken-1 empty-state-subtitle">
            Click 'Add Stopword' to create one
          </div>
        </v-card-text>
      </v-card>

      <!-- Stopwords Table -->
      <div v-if="!stopwordsLoading && stopwords.length > 0" class="documents-table-card stopwords-table-card">
        <v-table class="documents-table stopwords-table">
          <thead>
            <tr class="table-header-row">
              <th class="table-header-cell" style="width: 60px;">#</th>
              <th class="table-header-cell" style="min-width: 300px;">Stopword</th>
              <th class="table-header-cell" style="width: 120px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(stopword, index) in stopwords"
              :key="`stopword-${index}-${typeof stopword === 'string' ? stopword : (stopword.word || stopword.text || '')}`"
              class="table-row"
            >
              <td class="table-cell" style="color: #64748b; font-weight: 500;">
                {{ index + 1 }}
              </td>
              <td class="table-cell">
                <span style="font-weight: 500; color: #1e293b;">
                  {{ typeof stopword === 'string' ? stopword : (stopword.word || stopword.text || JSON.stringify(stopword)) }}
                </span>
              </td>
              <td class="table-cell" style="text-align: center; vertical-align: middle; padding: 16px 20px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    @click="openDeleteStopwordDialog(stopword)"
                    class="professional-delete-btn"
                  >
                    <v-icon size="18">mdi-delete-outline</v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </div>

    <!-- Bulk Delete Confirmation Dialog -->
    <ConfirmationDialog
      v-model="showBulkDeleteDialog"
      title="Confirm Bulk Delete"
      :message="`Are you sure you want to delete ${selectedDocuments.length} document(s)?`"
      :details="`Collection: ${collectionName}\nThis action cannot be undone.`"
      type="error"
      confirm-text="Delete"
      :loading="bulkDeleting"
      @confirm="handleBulkDelete"
      @cancel="showBulkDeleteDialog = false"
    />

    <!-- Delete Document Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDocumentDialog"
      max-width="500" 
      persistent
      @keydown.esc="showDeleteDocumentDialog = false"
      aria-labelledby="delete-document-title"
      class="delete-document-dialog"
    >
      <v-card class="delete-dialog-card">
        <v-card-title class="delete-dialog-header-modern">
          <div class="delete-dialog-icon-wrapper-modern">
            <v-icon icon="mdi-alert-circle" size="32" color="#ef4444"></v-icon>
          </div>
          <div class="delete-dialog-title-content-modern">
            <span class="delete-dialog-title-modern">Delete Document</span>
            <span class="delete-dialog-subtitle-modern">This action cannot be undone</span>
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
              <div class="delete-info-value-modern">{{ collectionName }}</div>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="delete-info-row-modern">
              <div class="delete-info-label-modern">
                <v-icon size="16" class="mr-1">mdi-file-document</v-icon>
                Document ID
              </div>
              <div class="delete-info-value-modern">{{ documentToDelete }}</div>
            </div>
          </v-card>
          <v-alert
            v-if="deleteDocumentError"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
            @click:close="deleteDocumentError = null"
            density="compact"
          >
            <div class="font-weight-bold mb-1">Delete Failed</div>
            <div>{{ deleteDocumentError }}</div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="delete-dialog-actions-modern">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="showDeleteDocumentDialog = false"
            :disabled="deletingDocument"
            size="default"
            class="delete-cancel-btn-modern"
          >
            Cancel
          </v-btn>
          <v-btn
            variant="flat"
            @click="handleDeleteDocument"
            :loading="deletingDocument"
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

    <!-- Document Detail Dialog -->
    <v-dialog v-model="showDocumentDialog" max-width="900" persistent>
      <v-card class="mb-card">
        <v-card-title class="d-flex justify-space-between align-center pa-5" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 16px 16px 0 0;">
          <div class="d-flex align-center">
            <v-icon icon="mdi-file-document" color="white" class="mr-3"></v-icon>
            <span class="text-white font-weight-bold">Document Details</span>
          </div>
          <v-btn icon variant="text" @click="showDocumentDialog = false" color="#425466">
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <pre class="document-json">{{ documentJson }}</pre>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-5">
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" @click="showDocumentDialog = false" size="small">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Synonym Confirmation Dialog -->
    <v-dialog v-model="showDeleteSynonymDialog" max-width="480" persistent>
      <v-card class="simple-delete-dialog-card" elevation="0">
        <v-card-title class="simple-delete-dialog-header">
          <div class="simple-delete-dialog-header-copy">
            <div class="simple-delete-dialog-kicker">Confirm removal</div>
            <div class="simple-delete-dialog-title-row">
              <v-icon icon="mdi-swap-horizontal" size="18" color="white" class="mr-2"></v-icon>
              <span class="simple-delete-dialog-title">Delete Synonym</span>
            </div>
          </div>
          <v-btn icon variant="text" @click="closeDeleteSynonymDialog" color="white">
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="simple-delete-dialog-body">
          <p class="simple-delete-dialog-copy">Remove this synonym group from the collection?</p>
          <div v-if="synonymToDelete" class="simple-delete-dialog-preview">
            <div class="simple-delete-dialog-label">Root term</div>
            <div class="simple-delete-dialog-value">{{ synonymToDelete.root }}</div>
          </div>
          <v-alert
            v-if="deleteSynonymError"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
            @click:close="deleteSynonymError = null"
          >
            {{ deleteSynonymError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="simple-delete-dialog-actions">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDeleteSynonymDialog" :disabled="deletingSynonym" size="small" class="mr-2">
            Cancel
          </v-btn>
          <v-btn color="primary" variant="flat" @click="confirmDeleteSynonym" :loading="deletingSynonym" size="small">
            Delete Synonym
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Stopword Dialog -->
    <v-dialog v-model="showAddStopwordDialog" max-width="500" persistent>
      <v-card class="mb-card">
        <v-card-title class="d-flex justify-space-between align-center pa-5" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 16px 16px 0 0;">
          <div class="d-flex align-center">
            <v-icon icon="mdi-text-box-remove" color="white" class="mr-3"></v-icon>
            <span class="text-white font-weight-bold">Add Stopword</span>
          </div>
          <v-btn icon variant="text" @click="showAddStopwordDialog = false" color="#425466">
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text style="padding: 24px;">
          <v-alert
            v-if="stopwordsError"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="stopwordsError = null"
          >
            {{ stopwordsError }}
          </v-alert>

          <v-text-field
            v-model="newStopword"
            label="Stopword *"
            prepend-inner-icon="mdi-text"
            variant="outlined"
            required
            @keyup.enter="addStopword"
            hint="Word to exclude from search indexing"
            persistent-hint
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAddStopwordDialog = false" size="small" class="mr-2">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="addStopword"
            :disabled="!newStopword.trim()"
            size="small"
          >
            Add Stopword
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Stopword Confirmation Dialog -->
    <v-dialog v-model="showDeleteStopwordDialog" max-width="480" persistent>
      <v-card class="simple-delete-dialog-card" elevation="0">
        <v-card-title class="simple-delete-dialog-header">
          <div class="simple-delete-dialog-header-copy">
            <div class="simple-delete-dialog-kicker">Confirm removal</div>
            <div class="simple-delete-dialog-title-row">
              <v-icon icon="mdi-text-box-remove" size="18" color="white" class="mr-2"></v-icon>
              <span class="simple-delete-dialog-title">Delete Stopword</span>
            </div>
          </div>
          <v-btn icon variant="text" @click="closeDeleteStopwordDialog" color="white">
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="simple-delete-dialog-body">
          <p class="simple-delete-dialog-copy">Remove this stopword from the collection?</p>
          <div v-if="stopwordToDelete" class="simple-delete-dialog-preview">
            <div class="simple-delete-dialog-label">Stopword</div>
            <div class="simple-delete-dialog-value">{{ getStopwordText(stopwordToDelete) }}</div>
          </div>
          <v-alert
            v-if="deleteStopwordError"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
            @click:close="deleteStopwordError = null"
          >
            {{ deleteStopwordError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="simple-delete-dialog-actions">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDeleteStopwordDialog" :disabled="deletingStopword" size="small" class="mr-2">
            Cancel
          </v-btn>
          <v-btn color="primary" variant="flat" @click="confirmDeleteStopword" :loading="deletingStopword" size="small">
            Delete Stopword
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Collection Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="560"
      persistent
      class="delete-collection-dialog"
    >
      <v-card class="delete-dialog-card" elevation="0">
        <v-card-title class="delete-dialog-header">
          <div class="delete-dialog-icon-wrapper">
            <v-icon icon="mdi-alert-circle" size="28" class="delete-dialog-icon"></v-icon>
          </div>
          <div class="delete-dialog-title-content">
            <span class="delete-dialog-title">Delete Collection</span>
            <span class="delete-dialog-subtitle">This action cannot be undone</span>
          </div>
        </v-card-title>
        <v-card-text class="delete-dialog-content">
          <div class="delete-warning-text">
            You are about to permanently delete this collection and all of its documents. This action cannot be reversed.
          </div>
          <v-card variant="outlined" class="delete-collection-info-card">
            <div class="delete-info-row">
              <div class="delete-info-label">
                <v-icon icon="mdi-folder" size="18" class="mr-1"></v-icon>
                Collection Name
              </div>
              <div class="delete-info-value">{{ collectionName || 'N/A' }}</div>
            </div>
            <v-divider class="my-3" v-if="documents.length > 0"></v-divider>
            <div class="delete-info-row" v-if="totalDocuments > 0 || documents.length > 0">
              <div class="delete-info-label">
                <v-icon icon="mdi-file-document-multiple" size="18" class="mr-1"></v-icon>
                Documents
              </div>
              <div class="delete-info-value">{{ (totalDocuments > 0 ? totalDocuments : documents.length) }} document{{ (totalDocuments > 0 ? totalDocuments : documents.length) !== 1 ? 's' : '' }}</div>
            </div>
          </v-card>
          <v-alert
            v-if="deleteError"
            type="error"
            variant="tonal"
            class="delete-error-alert mt-4"
            closable
            @click:close="deleteError = null"
            density="compact"
          >
            <div class="delete-error-title">Delete Failed</div>
            <div class="delete-error-message">{{ deleteError }}</div>
            <div class="delete-error-help">Please check your connection and try again. If the problem persists, contact support.</div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="delete-dialog-actions">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="closeDeleteDialog"
            :disabled="deleting"
            class="unified-btn unified-btn-secondary"
            size="default"
          >
            Cancel
          </v-btn>
          <v-btn
            variant="flat"
            @click="handleDeleteCollection"
            :loading="deleting"
            :disabled="deleting"
            class="collections-action-btn delete-popup-btn"
            size="default"
          >
            Delete Collection
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDocuments } from '../composables/useDocuments'
import { useSearch } from '../composables/useSearch'
import { useValidation } from '../composables/useValidation'
import { useExport } from '../composables/useExport'
import { useCopy } from '../composables/useCopy'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useCollections } from '../composables/useCollections'
import ConfirmationDialog from '../components/ConfirmationDialog.vue'
import StopwordChip from '../components/StopwordChip.vue'
import { extractSafeErrorMessage } from '../utils/sanitize'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl, getBestTitle, getBestContent, formatServerHighlights } from '../utils/apiHelpers'
import axios from 'axios'

const props = defineProps({
  name: {
    type: String,
    required: true
  }
})

const router = useRouter()
const route = useRoute()
const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })
const { validateDocument, validateJSON, checkConnection, sanitizeInput } = useValidation()
const { copyToClipboard, copyJSON } = useCopy()
const { deleteCollection } = useCollections(baseUrl)
const { searchResults, loading: searchLoading, error: searchError, searchTime, indexingInProgress, maybeResult, performSearch } = useSearch(baseUrl)
const showMaybeMessage = computed(() => {
  const message = maybeResult?.message
  if (!message) return false
  const normalized = String(message).trim().toLowerCase()
  if (!normalized || normalized === 'ok') return false
  return true
})
const { documents, loading, error, total: totalDocuments, loadDocuments: loadDocumentsBase, getDocument, addDocument, deleteDocument } = useDocuments(baseUrl)

// Core state
const searchQuery = ref('')
const searchPerformed = ref(false)
const searchInputPending = ref(false)
const viewMode = ref('list')
const showDocumentDialog = ref(false)
const documentJson = ref('')
const showAdvancedFilters = ref(false)
const showItemsPerPageMenu = ref(false)
const showQuickSortMenu = ref(false)
const showDateRangeMenu = ref(false)
const quickSortBy = ref(null)
const filters = ref([])
const queryByFields = ref([])
const searchScopeMode = ref('all')
const queryByMode = ref('OR')
const quickFilterField = ref(null)
const quickFilterOperator = ref(null)
const quickFilterValue = ref('')
const dateFrom = ref(null)
const dateTo = ref(null)
const currentPage = ref(1)
const itemsPerPage = ref(100)
const expandedRows = ref([])
const itemsPerPageOptions = [10, 25, 50, 100]
const collectionSchema = ref(null)
const hasHandledInitialMount = ref(false)
const isLoadingDocuments = ref(false)
const searchFieldItems = computed(() => {
  const names = (availableFields.value || [])
    .map(f => (typeof f === 'string' ? f : f?.name))
    .filter(Boolean)
  // Always expose `name` as a first-class search field in the UI.
  return [...new Set(['name', ...names])]
})
const hasDateRange = computed(() => Boolean(dateFrom.value || dateTo.value))
const formatDateLabel = (value) => {
  if (!value) return ''
  const [year, month, day] = String(value).split('-')
  if (!year || !month || !day) return String(value)
  return `${month}/${day}/${year}`
}
const dateRangeSummary = computed(() => {
  if (dateFrom.value && dateTo.value) {
    return `${formatDateLabel(dateFrom.value)} to ${formatDateLabel(dateTo.value)}`
  }
  if (dateFrom.value) {
    return `from ${formatDateLabel(dateFrom.value)}`
  }
  if (dateTo.value) {
    return `until ${formatDateLabel(dateTo.value)}`
  }
  return ''
})
const dateRangeButtonLabel = computed(() => {
  return hasDateRange.value ? dateRangeSummary.value : 'Date'
})

const closeToolbarMenus = () => {
  showItemsPerPageMenu.value = false
  showQuickSortMenu.value = false
  showDateRangeMenu.value = false
}
const normalizeCollectionTab = (value) => {
  if (value === 'synonyms' || value === 'stopwords' || value === 'documents') {
    return value
  }
  return 'documents'
}

const getTabFromRoute = () => {
  if (route.path.endsWith('/synonyms')) {
    return 'synonyms'
  }
  if (route.path.endsWith('/stopwords')) {
    return 'stopwords'
  }
  return normalizeCollectionTab(route.query.tab)
}

const parseRoutePage = (value) => {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

const getDocumentsRoutePath = (page = currentPage.value) => {
  const encodedName = encodeURIComponent(collectionName.value || route.params.name || '')
  const normalizedPage = parseRoutePage(page)
  return normalizedPage <= 1
    ? `/collections/${encodedName}`
    : `/collections/${encodedName}/${normalizedPage}`
}

const syncDocumentsPageRoute = (page = currentPage.value, navigationMode = 'replace') => {
  if (activeTab.value !== 'documents') {
    return
  }

  const targetPath = getDocumentsRoutePath(page)

  if (route.path === targetPath) {
    return
  }

  const navigate = navigationMode === 'push' ? router.push : router.replace
  navigate({
    path: targetPath,
    query: route.query
  }).catch((err) => {
    if (err?.name !== 'NavigationDuplicated' && !err?.message?.includes('Avoided redundant navigation')) {
      console.error('Pagination navigation error:', err)
    }
  })
}

const collectionTabRoute = (tab) => {
  const encodedName = encodeURIComponent(collectionName.value || route.params.name || '')
  const nextQuery = { ...route.query }
  delete nextQuery.tab

  if (tab === 'synonyms') {
    return { path: `/collections/${encodedName}/synonyms`, query: nextQuery }
  }
  if (tab === 'stopwords') {
    return { path: `/collections/${encodedName}/stopwords`, query: nextQuery }
  }
  return { path: getDocumentsRoutePath(currentPage.value), query: nextQuery }
}
const searchSyntaxRoute = computed(() => {
  const encodedName = encodeURIComponent(collectionName.value || route.params.name || '')
  return { path: `/collections/${encodedName}/search-syntax` }
})
const titleScopeFields = computed(() =>
  searchFieldItems.value.filter((field) => ['name', 'title'].includes(String(field).toLowerCase()))
)
const contentScopeFields = computed(() =>
  searchFieldItems.value.filter((field) => ['content', 'description', 'text', 'body', 'summary'].includes(String(field).toLowerCase()))
)
const searchScopeOptions = computed(() => {
  const options = [
    { value: 'all', title: 'All searchable fields', description: 'Broad search across every searchable field.' }
  ]

  if (titleScopeFields.value.length > 0) {
    options.push({
      value: 'identity',
      title: 'Names and titles',
      description: `Search only ${titleScopeFields.value.join(', ')}.`
    })
  }

  if (contentScopeFields.value.length > 0) {
    options.push({
      value: 'content',
      title: 'Content and description',
      description: `Search only ${contentScopeFields.value.join(', ')}.`
    })
  }

  options.push(
    { value: 'custom', title: 'Custom fields', description: 'Pick one or more fields yourself.' }
  )

  return options
})
const getScopeFields = () => {
  const hasLoadedSearchFields = Array.isArray(availableFields.value) && availableFields.value.length > 0

  if (!hasLoadedSearchFields && searchScopeMode.value !== 'custom') {
    return []
  }

  if (searchScopeMode.value === 'identity') {
    return [...titleScopeFields.value]
  }

  if (searchScopeMode.value === 'content') {
    return [...contentScopeFields.value]
  }

  if (searchScopeMode.value === 'custom') {
    return Array.isArray(queryByFields.value)
      ? [...new Set(queryByFields.value.filter(Boolean).map((field) => String(field).trim()).filter(Boolean))]
      : []
  }

  if (searchScopeMode.value === 'all') {
    return [...searchFieldItems.value]
  }

  return []
}
const getExplicitQueryFields = () => {
  return getScopeFields()
}

const ensureSearchSchemaReady = async () => {
  if (searchScopeMode.value === 'all') {
    return
  }

  if (Array.isArray(availableFields.value) && availableFields.value.length > 0) {
    return
  }

  await loadCollectionSchema(false)
}

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildWildcardMatcher = (rawQuery) => {
  const normalized = String(rawQuery || '').trim().toLowerCase()
  if (!normalized) return null

  const hasWildcard = normalized.includes('*') || normalized.includes('?')
  if (!hasWildcard) {
    return (value) => String(value || '').toLowerCase().includes(normalized)
  }

  const pattern = normalized
    .split('*')
    .map(part => part.split('?').map(escapeRegex).join('.'))
    .join('.*')

  const regex = new RegExp(pattern)
  return (value) => regex.test(String(value || '').toLowerCase())
}

const buildFieldScopedQuery = (query, fields, mode = 'OR') => {
  const trimmedQuery = String(query || '').trim()
  if (!trimmedQuery || !Array.isArray(fields) || fields.length === 0) {
    return trimmedQuery
  }

  const joiner = mode === 'AND' ? ' AND ' : ' OR '
  return fields.map((field) => `${field}:(${trimmedQuery})`).join(joiner)
}

const collectionName = computed(() => {
  // Try multiple sources in order of preference
  let name = props.name || route.params.name || route.query.name
  
  // Fallback: extract from route path if not in params
  if (!name && route.path) {
    const pathMatch = route.path.match(/\/collections\/([^\/]+)/)
    if (pathMatch && pathMatch[1]) {
      name = pathMatch[1]
    }
  }
  
  // Also try fullPath as fallback
  if (!name && route.fullPath) {
    const pathMatch = route.fullPath.match(/\/collections\/([^\/]+)/)
    if (pathMatch && pathMatch[1]) {
      name = pathMatch[1]
    }
  }
  
  // Last resort: try window.location if route is not available
  if (!name && typeof window !== 'undefined' && window.location) {
    const pathMatch = window.location.pathname.match(/\/collections\/([^\/]+)/)
    if (pathMatch && pathMatch[1]) {
      name = pathMatch[1]
    }
  }
  
  if (!name) {
    return ''
  }
  
  try {
    const decoded = decodeURIComponent(String(name))
    return decoded.trim()
  } catch (err) {
    return String(name).trim()
  }
})

// Detect if documents are unorganized (no title/content)
const isUnorganized = computed(() => {
  // Check schema first if available - if it explicitly lacks title and content, it's unorganized
  if (collectionSchema.value && collectionSchema.value.searchable_fields) {
    const fields = collectionSchema.value.searchable_fields
    const hasStandardFields = fields.includes('title') || fields.includes('content')
    if (!hasStandardFields) return true
  }

  const docsToCheck = searchPerformed.value ? searchResults.value : documents.value
  if (!docsToCheck || !Array.isArray(docsToCheck) || docsToCheck.length === 0) {
    // If we have a schema and it DOES have title/content, it's not unorganized
    if (collectionSchema.value && collectionSchema.value.searchable_fields) {
      return false
    }
    return false
  }
  
  // Check first few documents
  const sample = docsToCheck.slice(0, 10) // Check up to 10 docs for more accuracy
  const isUnorganizedByData = sample.every(doc => {
    if (!doc) return true
    // A document is considered "organized" if it has title OR content with actual value
    const hasTitle = doc.title !== undefined && doc.title !== null && String(doc.title).trim() !== ''
    const hasContent = doc.content !== undefined && doc.content !== null && String(doc.content).trim() !== ''
    return !hasTitle && !hasContent
  })
  
  return isUnorganizedByData
})

// Auto-switch to table mode for unorganized data
watch([searchResults, documents, isUnorganized, loading, searchLoading], ([newSearchResults, newDocuments, unorganized, isLoading, isSearchLoading]) => {
  const currentDocs = searchPerformed.value ? newSearchResults : newDocuments
  const isAnyLoading = searchPerformed.value ? isSearchLoading : isLoading
  
  if (currentDocs && currentDocs.length > 0 && !isAnyLoading) {
    if (unorganized) {
      viewMode.value = 'table'
    } else if (!searchPerformed.value && viewMode.value === 'table' && !hasHandledInitialMount.value) {
      // Default to list view for organized collections on first load
      viewMode.value = 'list'
      hasHandledInitialMount.value = true
    }
  }
  
  // Reset pagination when data changes
  currentPage.value = 1
  expandedRows.value = []
  
  // Clean up any remaining tooltips
  // Removed call to removeTooltips here to avoid initialization order issues
}, { immediate: true })

// Generate table headers dynamically based on document fields
const tableHeaders = computed(() => {
  const currentDocs = searchPerformed.value ? searchResults.value : documents.value
  if (!currentDocs || !Array.isArray(currentDocs) || currentDocs.length === 0) return []
  
  const allKeys = new Set()
  // Collect keys from a sample of documents to be efficient
  currentDocs.slice(0, 20).forEach(doc => {
    if (doc && typeof doc === 'object') {
      Object.keys(doc).forEach(key => {
        // Skip internal fields and highlights, and also standard fields we handle specifically
        if (!key.startsWith('_') && key !== 'highlights' && key !== 'id' && key !== 'title' && key !== 'name' && key !== 'content') {
          allKeys.add(key)
        }
      })
    }
  })
  
  // Define priority fields that should always come first
  const headers = [
    { title: 'ID', key: 'id', sortable: true, width: '100px' },
    { title: 'Title', key: 'title', sortable: true },
    { title: 'Name', key: 'name', sortable: true },
    { title: 'Content', key: 'content', sortable: true }
  ]
  
  // Add other fields discovered in the documents
  Array.from(allKeys).sort().forEach(key => {
    headers.push({
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      key: key,
      sortable: true
    })
  })
  
  // Add score if present (for search results)
  if (currentDocs.some(doc => doc._text_match !== undefined)) {
    headers.push({ title: 'Score', key: '_text_match', sortable: true, align: 'end' })
  }
  
  return headers
})

useKeyboardShortcuts([
  {
    key: 'ctrl+n',
    handler: () => {
      if (!loading.value) {
        goToAddDocument()
        toast.info('Opening add document form...', 'Keyboard Shortcut')
      }
    }
  },
  {
    key: 'f5',
    handler: () => {
      if (!loading.value && collectionName.value) {
        loadDocuments(collectionName.value)
        // Removed: toast.info('Refreshing documents...', 'Refreshing')
      }
    }
  },
  {
    key: 'ctrl+r',
    handler: (e) => {
      if (!loading.value && collectionName.value) {
        e.preventDefault()
        loadDocuments(collectionName.value)
        // Removed: toast.info('Refreshing documents...', 'Refreshing')
      }
    }
  },
  {
    key: '/',
    handler: (e) => {
      // Focus search if not already in an input
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
        const searchInput = document.querySelector('.collection-search-input input')
        if (searchInput) {
          searchInput.focus()
        }
      }
    }
  }
])

const goToSchema = () => {
  if (!collectionName.value) {
    console.warn('Cannot navigate to schema: collection name is missing')
    return
  }
  
  try {
    const encodedName = encodeURIComponent(collectionName.value)
    const path = `/collections/${encodedName}/schema`
    router.push({ path: path }).catch(err => {
      if (err.name !== 'NavigationDuplicated' && !err.message?.includes('Avoided redundant navigation')) {
        console.error('Navigation error:', err)
      }
    })
  } catch (err) {
    console.error('Error navigating to schema:', err, 'Collection name:', collectionName.value)
  }
}

const goToAddDocument = () => {
  const name = collectionName.value
  if (name && name.trim()) {
    router.push(`/collections/${encodeURIComponent(name.trim())}/documents/add`)
  } else {
    toast.error('Collection name is required', 'Error')
  }
}

const showInlineAddSynonym = ref(false)
const showInlineAddStopword = ref(false)
const addingInlineSynonym = ref(false)
const addingInlineStopword = ref(false)
const inlineSynonymError = ref(null)
const inlineStopwordError = ref(null)
const inlineSynonymForm = ref({ root: '', synonyms: '' })
const inlineStopwordForm = ref({ word: '' })

const slugifySynonymId = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '_')
  .replace(/^_+|_+$/g, '')

const toggleInlineSynonymForm = () => {
  showInlineAddSynonym.value = !showInlineAddSynonym.value
  inlineSynonymError.value = null
}

const closeInlineSynonymForm = () => {
  showInlineAddSynonym.value = false
  inlineSynonymError.value = null
  inlineSynonymForm.value = { root: '', synonyms: '' }
}

const toggleInlineStopwordForm = () => {
  showInlineAddStopword.value = !showInlineAddStopword.value
  inlineStopwordError.value = null
}

const closeInlineStopwordForm = () => {
  showInlineAddStopword.value = false
  inlineStopwordError.value = null
  inlineStopwordForm.value = { word: '' }
}

const openDeleteDialog = () => {
  if (!collectionName.value) {
    toast.error('Collection name is missing', 'Error')
    return
  }
  
  deleteError.value = null
  showDeleteDialog.value = true
}

const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  deleteError.value = null
  deleting.value = false
}

const handleDeleteCollection = async () => {
  if (!collectionName.value) {
    deleteError.value = 'Collection name is missing'
    return
  }
  
  deleting.value = true
  deleteError.value = null
  
  try {
    const name = collectionName.value.trim()
    if (!name) {
      deleteError.value = 'Invalid collection name'
      deleting.value = false
      return
    }
    
    await deleteCollection(name)
    toast.success(`Collection "${name}" deleted successfully`, 'Collection Deleted')
    closeDeleteDialog()
    
    // Navigate back to collections page
    router.push('/collections').catch(err => {
      if (err.name !== 'NavigationDuplicated') {
        console.error('Navigation error:', err)
      }
    })
  } catch (err) {
    console.error('Delete collection error:', err)
    const errorMsg = extractSafeErrorMessage(err, 'Failed to delete collection')
    deleteError.value = errorMsg
    deleting.value = false
  }
}

// Wrapper to pass sortBy option
const loadDocuments = async (collectionName, options = {}) => {
  const effectiveSort = Object.prototype.hasOwnProperty.call(options, 'sortBy')
    ? options.sortBy
    : (sortBy.value || 'id:asc')
  const page = Math.max(1, Number(options.page) || currentPage.value || 1)
  const perPage = Math.max(1, Number(options.perPage) || itemsPerPage.value || 100)

  await loadDocumentsBase(collectionName, {
    page,
    perPage,
    sortBy: effectiveSort
  })
}

// Make searched words bold in text
const makeSearchedWordsBold = (text) => {
  if (!text || !searchQuery.value || !searchQuery.value.trim()) {
    return text
  }
  
  const query = searchQuery.value.trim()
  
  if (!query) {
    return text
  }
  
  const source = String(text)
  
  // Handle quoted phrases and individual words
  let wordsToHighlight = []
  const normalizedQuery = query.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  const quotedPhrases = []
  const doubleQuoteRegex = /"([^"]+)"/g
  const singleQuoteRegex = /'([^']+)'/g
  let match
  
  while ((match = doubleQuoteRegex.exec(normalizedQuery)) !== null) {
    if (match[1]) quotedPhrases.push(match[1])
  }
  while ((match = singleQuoteRegex.exec(normalizedQuery)) !== null) {
    if (match[1]) quotedPhrases.push(match[1])
  }
  
  if (quotedPhrases.length > 0) {
    wordsToHighlight.push(...quotedPhrases)
    const withoutQuotes = normalizedQuery
      .replace(doubleQuoteRegex, ' ')
      .replace(singleQuoteRegex, ' ')
      .trim()
    if (withoutQuotes) {
      wordsToHighlight.push(...withoutQuotes.split(/\s+/).filter(w => w.length > 0))
    }
  } else {
    wordsToHighlight = normalizedQuery.split(/\s+/).filter(w => w.length > 0)
  }
  
  const stopwords = new Set(['on', 'in', 'at', 'by', 'to', 'of', 'and', 'or', 'the', 'a', 'an'])
  wordsToHighlight = wordsToHighlight.filter(word => {
    const lowered = word.toLowerCase()
    if (lowered.length < 3 && !/^\d+$/.test(lowered)) return false
    if (stopwords.has(lowered)) return false
    return true
  })
  
  // Remove duplicates and sort by length (longer first to avoid conflicts)
  wordsToHighlight = [...new Set(wordsToHighlight)].sort((a, b) => b.length - a.length)

  if (!wordsToHighlight.length) {
    return source
  }

  const pattern = wordsToHighlight
    .filter(word => word.length > 0)
    .map(word => escapeRegex(word))
    .join('|')

  if (!pattern) {
    return source
  }

  const regex = new RegExp(`(${pattern})`, 'gi')

  // Highlight only text nodes so existing HTML structure and numeric content remain intact.
  if (/<[^>]+>/.test(source) && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(`<div>${source}</div>`, 'text/html')
      const container = doc.body.firstElementChild

      if (!container) {
        return source
      }

      const highlightTextNode = (node) => {
        const parent = node.parentNode
        const value = node.textContent || ''

        regex.lastIndex = 0
        if (!parent || !value || !regex.test(value)) {
          return
        }

        regex.lastIndex = 0
        const fragment = doc.createDocumentFragment()
        let lastIndex = 0
        let match

        while ((match = regex.exec(value)) !== null) {
          const [matched] = match
          const index = match.index

          if (index > lastIndex) {
            fragment.appendChild(doc.createTextNode(value.slice(lastIndex, index)))
          }

          const strong = doc.createElement('strong')
          strong.className = 'hlq-highlight'
          strong.textContent = matched
          fragment.appendChild(strong)

          lastIndex = index + matched.length
        }

        if (lastIndex < value.length) {
          fragment.appendChild(doc.createTextNode(value.slice(lastIndex)))
        }

        parent.replaceChild(fragment, node)
      }

      const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
      const textNodes = []
      let currentNode = walker.nextNode()

      while (currentNode) {
        textNodes.push(currentNode)
        currentNode = walker.nextNode()
      }

      textNodes.forEach(highlightTextNode)
      return container.innerHTML
    } catch (error) {
      console.warn('makeSearchedWordsBold DOM highlight fallback triggered:', error)
    }
  }

  return source.replace(regex, '<strong class="hlq-highlight">$1</strong>')
}

// Computed properties for filter counts
const activeFiltersCount = computed(() => {
  let count = 0
  if (queryByFields.value && queryByFields.value.length > 0) {
    count += 1
  }
  if (filters.value && filters.value.length > 0) {
    count += filters.value.filter(f => f.field && f.operator && f.value).length
  }
  // Count date filters
  if (dateFrom.value || dateTo.value) {
    count += 1
  }
  return count
})

const hasActiveFilters = computed(() => {
  return activeFiltersCount.value > 0
})

const activeFiltersList = computed(() => {
  return filters.value.filter(f => f.field && f.operator && f.value)
})
const sortBy = ref(null) // Start with null to default to relevance
const availableFields = ref([])
const filterableFields = ref([])
const sortableFields = ref([])


// Tab management
const activeTab = ref(getTabFromRoute())

// Synonyms state
const synonyms = ref([])
const synonymsLoading = ref(false)
const synonymsError = ref(null)

// Stopwords state
const stopwords = ref([])
const stopwordsLoading = ref(false)
const stopwordsError = ref(null)

// Delete collection state
const showDeleteDialog = ref(false)
const deleting = ref(false)
const deleteError = ref(null)
const showAddStopwordDialog = ref(false)
const newStopword = ref('')
const showDeleteStopwordDialog = ref(false)
const stopwordToDelete = ref(null)
const showBulkActionsMenu = ref(false)
const deletingStopword = ref(false)
const deleteStopwordError = ref(null)

const schemaLoading = ref(false)
const schemaError = ref(null)

// Breadcrumb state
const isArrowRotated = ref(false)
const isCollectionsHovered = ref(false)

const goToCollections = () => {
  router.push('/collections').catch(err => {
    // Ignore navigation errors (e.g., navigating to same route)
    if (err.name !== 'NavigationDuplicated') {
      console.error('Navigation error:', err)
    }
  })
}

const goToDetails = () => {
  if (!collectionName.value) {
    console.warn('goToDetails called with empty collection name')
    return
  }
  
  try {
    const encodedName = encodeURIComponent(collectionName.value)
    const path = `/collections/${encodedName}/details`
    router.push({ path: path }).catch(err => {
      // Ignore navigation errors (e.g., navigating to same route)
      if (err.name !== 'NavigationDuplicated' && !err.message?.includes('Avoided redundant navigation')) {
        console.error('Navigation error:', err)
      }
    })
  } catch (err) {
    console.error('Error navigating to collection details:', err, 'Collection name:', collectionName.value)
  }
}

const toggleArrow = () => {
  isArrowRotated.value = !isArrowRotated.value
}

const goBack = () => {
  router.push('/').catch(err => {
    // Ignore navigation errors (e.g., navigating to same route)
    if (err.name !== 'NavigationDuplicated') {
      console.error('Navigation error:', err)
    }
  })
}

// Fetch collection schema to get available fields
const loadCollectionSchema = async (showLoading = false) => {
  try {
    if (showLoading) {
      schemaLoading.value = true
      schemaError.value = null
    }
    if (!collectionName.value || !collectionName.value.trim()) {
      if (showLoading) {
        schemaError.value = 'Collection name is required'
        schemaLoading.value = false
      }
      return null
    }
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}`)
    
    const response = await axios.get(url, { timeout: 5000 })
    collectionSchema.value = response.data
    if (showLoading) {
      schemaLoading.value = false
    }
    
    // Extract fields from schema
    if (response.data.searchable_fields) {
      availableFields.value = response.data.searchable_fields.map(name => ({ name, type: 'searchable' }))
    }
    if (response.data.filterable_fields) {
      filterableFields.value = response.data.filterable_fields.map(name => ({ name, type: 'filterable' }))
    }
    // Always include score sorting options
    // Build intuitive sort options
    const baseSortOptions = [
      { label: '⭐ Relevance (Best Match)', value: '_text_match:desc' },
      { label: '📉 Relevance (Worst Match)', value: '_text_match:asc' },
      { label: '🆔 Document ID (A-Z)', value: 'id:asc' },
      { label: '🆔 Document ID (Z-A)', value: 'id:desc' }
    ]
    
    // Add common field options if available
    const commonFields = ['title', 'name', 'created_at', 'updated_at', 'date']
    const commonFieldOptions = []
    
    if (response.data.fields) {
      const schemaFields = Array.isArray(response.data.fields)
        ? response.data.fields
        : Object.keys(response.data.fields)

      schemaFields.forEach(field => {
        const fieldName = typeof field === 'string' ? field : field?.name
        if (!fieldName) {
          return
        }
        if (commonFields.includes(fieldName.toLowerCase()) || fieldName.toLowerCase().includes('title') || fieldName.toLowerCase().includes('name')) {
          commonFieldOptions.push(
            { label: `🔤 ${fieldName} (A-Z)`, value: `${fieldName}:asc` },
            { label: `🔤 ${fieldName} (Z-A)`, value: `${fieldName}:desc` }
          )
        } else if (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('created') || fieldName.toLowerCase().includes('updated')) {
          commonFieldOptions.push(
            { label: `📅 ${fieldName} (Newest First)`, value: `${fieldName}:desc` },
            { label: `📅 ${fieldName} (Oldest First)`, value: `${fieldName}:asc` }
          )
        }
      })
    }
    
    // Add schema sortable fields
    if (response.data.sortable_fields && response.data.sortable_fields.length > 0) {
      const schemaFieldOptions = response.data.sortable_fields.flatMap(name => {
        // Skip if already in common fields
        if (commonFieldOptions.some(opt => opt.value.includes(name))) {
          return []
        }
        return [
          { label: `${name} (A-Z)`, value: `${name}:asc` },
          { label: `${name} (Z-A)`, value: `${name}:desc` }
        ]
      })
      sortableFields.value = [...baseSortOptions, ...commonFieldOptions, ...schemaFieldOptions]
    } else {
      sortableFields.value = [...baseSortOptions, ...commonFieldOptions]
    }
    
    // If we have fields array, use that
    if (response.data.fields && Array.isArray(response.data.fields)) {
      const fieldMap = new Map()
      response.data.fields.forEach(field => {
        if (typeof field === 'string') {
          fieldMap.set(field, { name: field, type: 'string' })
        } else if (field.name) {
          fieldMap.set(field.name, field)
        }
      })
      
      // Update available fields
      availableFields.value = Array.from(fieldMap.values())
      
      // Update filterable fields (numeric fields are typically filterable)
      const numericFields = Array.from(fieldMap.values()).filter(f => 
        f.type === 'float' || f.type === 'int32' || f.type === 'int64' || f.facet
      )
      if (numericFields.length > 0) {
        filterableFields.value = [...filterableFields.value, ...numericFields]
      }
    }
  } catch (err) {
    console.warn('Failed to load collection schema:', err)
    if (showLoading) {
      schemaError.value = err.response?.data?.error || err.message || 'Failed to load schema'
      schemaLoading.value = false
    }
    // Use default fields if schema load fails
    availableFields.value = [
      { name: 'title', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'description', type: 'string' }
    ]
  }
}

// Watch for advanced filters opening to load schema if not already loaded
watch(showAdvancedFilters, (newValue) => {
  if (newValue && collectionName.value && filterableFields.value.length === 0) {
    // Load schema when opening advanced filters if fields are not loaded
    loadCollectionSchema(true)
  }
})

watch(searchScopeMode, (newValue) => {
  if (newValue === 'custom' && collectionName.value && searchFieldItems.value.length === 0) {
    loadCollectionSchema(true)
  }

  if (newValue !== 'custom') {
    queryByMode.value = 'OR'
  }

  if (newValue === 'custom' && (!Array.isArray(queryByFields.value) || queryByFields.value.length === 0)) {
    const defaultField = titleScopeFields.value[0] || searchFieldItems.value[0] || null
    queryByFields.value = defaultField ? [defaultField] : []
  }
})

watch(searchFieldItems, (newFields) => {
  if (searchScopeMode.value !== 'custom') {
    return
  }

  if (!Array.isArray(newFields) || newFields.length === 0) {
    return
  }

  if (!Array.isArray(queryByFields.value) || queryByFields.value.length === 0) {
    queryByFields.value = [newFields[0]]
  }
})

watch(queryByFields, (newFields) => {
  if (searchScopeMode.value !== 'custom') {
    return
  }

  if (!Array.isArray(newFields) || newFields.length === 0) {
    return
  }

  const normalized = [...new Set(newFields.map((field) => String(field).trim()).filter(Boolean))]
  if (normalized.length !== newFields.length || normalized.some((field, index) => field !== newFields[index])) {
    queryByFields.value = normalized
  }
})

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

// Filter operators
const allOperators = [
  { label: 'Equals (=)', value: '=' },
  { label: 'Not Equals (!=)', value: '!=' },
  { label: 'Greater Than (>)', value: '>' },
  { label: 'Greater or Equal (>=)', value: '>=' },
  { label: 'Less Than (<)', value: '<' },
  { label: 'Less or Equal (<=)', value: '<=' },
  { label: 'In List (IN)', value: 'IN' },
  { label: 'Not In List (NOT IN)', value: 'NOT IN' }
]

const stringOperators = [
  { label: 'Equals (=)', value: '=' },
  { label: 'Not Equals (!=)', value: '!=' },
  { label: 'In List (IN)', value: 'IN' },
  { label: 'Not In List (NOT IN)', value: 'NOT IN' }
]

const numericOperators = [
  { label: 'Equals (=)', value: '=' },
  { label: 'Not Equals (!=)', value: '!=' },
  { label: 'Greater Than (>)', value: '>' },
  { label: 'Greater or Equal (>=)', value: '>=' },
  { label: 'Less Than (<)', value: '<' },
  { label: 'Less or Equal (<=)', value: '<=' }
]

const getOperatorsForField = (fieldName) => {
  if (!fieldName) return allOperators
  
  // Try to determine if field is numeric from schema
  const field = collectionSchema.value?.fields?.find(f => 
    (typeof f === 'object' && f.name === fieldName) || f === fieldName
  )
  
  if (field && typeof field === 'object') {
    const fieldType = field.type?.toLowerCase() || ''
    if (fieldType.includes('int') || fieldType.includes('float') || fieldType.includes('number')) {
      return numericOperators
    }
  }
  
  // Default to all operators (server will handle type conversion)
  return allOperators
}

const isNumericOperator = (operator) => {
  return ['>', '>=', '<', '<='].includes(operator)
}

const getValueLabel = (operator) => {
  if (operator === 'IN' || operator === 'NOT IN') {
    return 'Values (comma-separated)'
  }
  return 'Value'
}

const getValuePlaceholder = (operator) => {
  if (operator === 'IN' || operator === 'NOT IN') {
    return 'e.g., value1, value2, value3'
  }
  return 'Enter value...'
}

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
  handleSearch()
}

const removeFilterByIndex = (activeIndex) => {
  // Find the actual index in filters array
  const activeFilter = activeFiltersList.value[activeIndex]
  if (!activeFilter) return
  
  const actualIndex = filters.value.findIndex(f => 
    f.field === activeFilter.field && 
    f.operator === activeFilter.operator && 
    f.value === activeFilter.value
  )
  
  if (actualIndex !== -1) {
    filters.value.splice(actualIndex, 1)
    handleSearch()
  }
}

const addQuickFilter = () => {
  if (!quickFilterField.value || !quickFilterOperator.value || !quickFilterValue.value) {
    return
  }
  
  filters.value.push({
    field: quickFilterField.value,
    operator: quickFilterOperator.value,
    value: quickFilterValue.value,
    connector: filters.value.length > 0 ? 'AND' : ''
  })
  
  // Reset quick filter form
  quickFilterField.value = null
  quickFilterOperator.value = null
  quickFilterValue.value = ''
  
  // Trigger search
  handleSearch()
}

const normalizeDateRange = () => {
  if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
    const previousFrom = dateFrom.value
    dateFrom.value = dateTo.value
    dateTo.value = previousFrom
  }
}

const applyDateRange = async () => {
  normalizeDateRange()
  showDateRangeMenu.value = false
  await handleSearch()
}

const clearDateRange = async () => {
  const hadDateRange = hasDateRange.value
  dateFrom.value = null
  dateTo.value = null
  showDateRangeMenu.value = false

  if (hadDateRange) {
    await handleSearch()
  }
}

const clearAllFilters = () => {
  filters.value = []
  queryByFields.value = []
  searchScopeMode.value = 'all'
  dateFrom.value = null
  dateTo.value = null
  handleSearch()
}

const openNativeDatePicker = (event) => {
  const input = event?.target
  if (typeof input?.showPicker === 'function') {
    try {
      input.showPicker()
    } catch (err) {
      // Ignore browsers that block programmatic picker opening.
    }
  }
}

const updateFilterField = (index) => {
  // Reset operator to first available when field changes
  const field = filters.value[index].field
  const operators = getOperatorsForField(field)
  if (operators.length > 0) {
    filters.value[index].operator = operators[0].value
  }
}

const toUtcDayStart = (date) => `${date}T00:00:00.000Z`
const toUtcDayEnd = (date) => `${date}T23:59:59.999Z`

const buildFilterString = () => {
  const filterParts = []
  
  // Add date range filter if dates are provided
  if (dateFrom.value || dateTo.value) {
    let dateFilter = ''
    if (dateFrom.value && dateTo.value) {
      // Expand date-only input to a full UTC day window for timestamp fields.
      dateFilter = `created_at:[${toUtcDayStart(dateFrom.value)} TO ${toUtcDayEnd(dateTo.value)}]`
    } else if (dateFrom.value) {
      dateFilter = `created_at:>=${toUtcDayStart(dateFrom.value)}`
    } else if (dateTo.value) {
      dateFilter = `created_at:<=${toUtcDayEnd(dateTo.value)}`
    }
    if (dateFilter) {
      filterParts.push(dateFilter)
    }
  }
  
  // Add other filters
  const otherFilters = filters.value
    .filter(f => f.field && f.operator && f.value)
    .map((filter, index) => {
      let filterStr = ''
      
      if (filter.operator === 'IN' || filter.operator === 'NOT IN') {
        // Format: field:IN[value1,value2] or field:NOT IN[value1,value2]
        const values = filter.value.split(',').map(v => v.trim()).join(',')
        filterStr = `${filter.field}:${filter.operator}[${values}]`
      } else {
        // Format: field:operator:value (e.g., price:>100, category:=electronics)
        // Server accepts both := and =, but := is more explicit
        const op = filter.operator === '=' ? ':=' : `:${filter.operator}`
        filterStr = `${filter.field}${op}${filter.value}`
      }
      
      if (index > 0 && filter.connector) {
        return ` ${filter.connector} ${filterStr}`
      }
      return filterStr
    })
    .join('')
  
  if (otherFilters) {
    if (filterParts.length > 0) {
      filterParts.push(` AND ${otherFilters}`)
    } else {
      filterParts.push(otherFilters)
    }
  }
  
  return filterParts.length > 0 ? filterParts.join('') : null
}

// Debounce timer for search input
const searchDebounceTimer = ref(null)
const suppressRouteQuerySearch = ref(false)
const showSearchSpinner = computed(() => searchLoading.value || searchInputPending.value)
const showPageSpinner = computed(() => loading.value || showSearchSpinner.value)
const filteredMaybeSuggestions = computed(() => {
  const suggestions = Array.isArray(maybeResult.value?.suggestions) ? maybeResult.value.suggestions : []

  return suggestions.filter((item) => {
    const text = String(item?.text || item?.name || '').trim()
    if (!text) return false

    // Hide noisy timestamp/id-like suggestions that come from the loose maybe probe.
    if (/^\d{6,}$/.test(text)) return false

    return true
  })
})

const showMaybeSuggestions = computed(() => {
  return (
    searchPerformed.value &&
    !showPageSpinner.value &&
    !hasActiveFilters.value &&
    filteredMaybeSuggestions.value.length > 0
  )
})

const handleSearchInput = () => {
  searchInputPending.value = true

  // Clear existing timer
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
    searchDebounceTimer.value = null
  }
  
  // If search is empty, clear results immediately
  if (!searchQuery.value?.trim()) {
    const hasFilter = Boolean(buildFilterString()?.trim())
    if (hasFilter) {
      searchDebounceTimer.value = setTimeout(() => {
        handleSearch()
        searchDebounceTimer.value = null
      }, 150)
      return
    }

    searchInputPending.value = false
    searchPerformed.value = false
    searchResults.value = []
    searchError.value = null
    suppressRouteQuerySearch.value = true
    router.replace({
      path: route.path,
      query: buildSearchRouteQuery()
    }).finally(() => {
      suppressRouteQuerySearch.value = false
    })
    return
  }
  
  // Debounce search for faster perceived response while typing
  searchDebounceTimer.value = setTimeout(() => {
    handleSearch()
    searchDebounceTimer.value = null
  }, 150)
}

const buildSearchRouteQuery = () => {
  const nextQuery = {}

  if (route.query.tab) {
    nextQuery.tab = route.query.tab
  }

  if (searchQuery.value && searchQuery.value.trim()) {
    nextQuery.q = searchQuery.value
  }

  if (dateFrom.value) {
    nextQuery.from = dateFrom.value
  }

  if (dateTo.value) {
    nextQuery.to = dateTo.value
  }

  return nextQuery
}

const handleSearch = async () => {
  // Clear any pending debounced search
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
    searchDebounceTimer.value = null
  }
  
  // Validate collection name
  if (!collectionName.value || !collectionName.value.trim()) {
    searchInputPending.value = false
    searchError.value = 'Collection name is missing. Please navigate to a valid collection.'
    searchPerformed.value = false
    searchResults.value = []
    return
  }

  normalizeDateRange()
  
  // Allow empty query if filters are provided (filter-only search)
  const filterString = buildFilterString()
  const hasFilter = filterString && filterString.trim()
  const hasQuery = searchQuery.value?.trim()

  if (!hasQuery && !hasFilter) {
    searchInputPending.value = false
    // No query and no filters - show all documents (default behavior)
    searchPerformed.value = false
    searchResults.value = []
    searchError.value = null
    // Update URL to remove query param
    suppressRouteQuerySearch.value = true
    router.replace({
      path: route.path,
      query: buildSearchRouteQuery()
    }).finally(() => {
      suppressRouteQuerySearch.value = false
    })
    return
  }
  
  searchPerformed.value = true
  searchError.value = null
  await ensureSearchSchemaReady()
  
  const options = {}
  const explicitQueryFields = getExplicitQueryFields()
  let effectiveQuery = searchQuery.value || ''
  
  // Add query_by (only if we have a query)
  // Scope presets define how text search is constrained.
  if (hasQuery) {
    if (searchScopeMode.value === 'custom' && explicitQueryFields.length > 1 && queryByMode.value === 'AND') {
      effectiveQuery = buildFieldScopedQuery(searchQuery.value, explicitQueryFields, 'AND')
    } else if (searchScopeMode.value !== 'all' && explicitQueryFields.length > 0) {
      options.queryBy = explicitQueryFields.join(',')
    }
  }
  
  // Add filter_by
  if (hasFilter) {
    options.filterBy = filterString
  }

  if ((searchQuery.value || '').toLowerCase().includes('do:casesensitive') ||
      (searchQuery.value || '').toLowerCase().includes('do:case_sensitive') ||
      (searchQuery.value || '').toLowerCase().includes('do:case-sensitive') ||
      (searchQuery.value || '').toLowerCase().includes('is:casesensitive') ||
      (searchQuery.value || '').toLowerCase().includes('is:case_sensitive') ||
      (searchQuery.value || '').toLowerCase().includes('is:case-sensitive')) {
    options.caseSensitive = true
    options.includeMaybe = false
    options.numTypos = 0
    options.prefix = false
  }
  
  // Add sort_by - prioritize relevance for search queries
  // When there's a search query, always use relevance sorting to show most relevant results first
  if (hasQuery) {
    // For search queries, always use relevance to show most relevant results
    options.sortBy = '_text_match:desc'
  } else if (sortBy.value) {
    // For non-search views (filter-only or list view), use the selected sort
    options.sortBy = sortBy.value
  } else {
    // Default to relevance if nothing is set
    options.sortBy = '_text_match:desc'
  }
  
  // Fast default: request only near-page-size results.
  const resultLimit = Math.min(Math.max(Number(itemsPerPage.value) || 20, 10), 40)
  options.highlight = false
  options.includeMaybe = options.caseSensitive ? false : true
  options.maybeMin = 3
  options.maybeLimit = 1
  try {
    await performSearch(collectionName.value, effectiveQuery, resultLimit, options)
    // Enforce scoped field behavior in the UI so the results reflect the chosen scope.
    if (hasQuery && explicitQueryFields.length > 0 && searchScopeMode.value !== 'all') {
      const matcher = buildWildcardMatcher(searchQuery.value)
      if (matcher) {
        searchResults.value = (searchResults.value || []).filter((doc) => {
          const fieldMatches = explicitQueryFields.map((field) => {
            const value = doc?.[field]
            if (value === null || value === undefined) return false
            const text = typeof value === 'string' ? value : JSON.stringify(value)
            return matcher(text)
          })

          if (searchScopeMode.value === 'custom' && explicitQueryFields.length > 1) {
            return queryByMode.value === 'AND'
              ? fieldMatches.every(Boolean)
              : fieldMatches.some(Boolean)
          }

          return fieldMatches.some(Boolean)
        })
      }
    }
  } finally {
    searchInputPending.value = false
  }
  
  // Update URL with query param
  // Prevent route watcher from re-triggering this same search.
  const nextQuery = buildSearchRouteQuery()
  const routeQ = typeof route.query.q === 'string' ? route.query.q : ''
  const routeFrom = typeof route.query.from === 'string' ? route.query.from : ''
  const routeTo = typeof route.query.to === 'string' ? route.query.to : ''

  if (routeQ !== (nextQuery.q || '') || routeFrom !== (nextQuery.from || '') || routeTo !== (nextQuery.to || '')) {
    suppressRouteQuerySearch.value = true
    router.replace({
      path: route.path,
      query: nextQuery
    }).finally(() => {
      suppressRouteQuerySearch.value = false
    })
  }
}

const applyMaybeSuggestion = async (item) => {
  const suggestedQuery = (item?.text || item?.name || '').trim()
  if (!suggestedQuery) {
    return
  }

  searchQuery.value = suggestedQuery
  await handleSearch()
}

const getQuickSortLabel = () => {
  if (!quickSortBy.value) return 'Relevance'
  if (quickSortBy.value === 'title:asc') return 'A-Z'
  if (quickSortBy.value === 'title:desc') return 'Z-A'
  if (quickSortBy.value === 'created_at:desc') return 'Newest'
  if (quickSortBy.value === 'created_at:asc') return 'Oldest'
  return 'Relevance'
}

const setQuickSort = async (sortValue) => {
  quickSortBy.value = sortValue
  sortBy.value = sortValue
  showQuickSortMenu.value = false
  currentPage.value = 1
  
  // Reload documents with new sort
  if (searchPerformed.value && searchQuery.value && searchQuery.value.trim()) {
    // If there's an active search, reset to show all documents with the new sort
    // Don't apply sort to search results - they should be sorted by relevance
    searchPerformed.value = false
    searchQuery.value = ''
    searchResults.value = []
    if (collectionName.value) {
      await loadDocuments(collectionName.value, { sortBy: sortValue })
    }
  } else if (searchPerformed.value) {
    // Filter-only search, can apply sort
    await handleSearch()
  } else {
    const effectiveSort = sortValue || 'id:asc'
    if (collectionName.value) {
      await loadDocuments(collectionName.value, { page: 1, perPage: itemsPerPage.value, sortBy: effectiveSort })
    }
  }
}

const setSort = async (sortValue) => {
  sortBy.value = sortValue
  // Update quickSortBy if it matches one of our quick sort options
  if (sortValue === 'title:asc' || sortValue === 'title:desc' || 
      sortValue === 'created_at:asc' || sortValue === 'created_at:desc' ||
      sortValue === null) {
    quickSortBy.value = sortValue
  } else {
    quickSortBy.value = null
  }
  // Reset pagination when sort changes
  currentPage.value = 1
  
  // Re-search with new sort order if we already have results
  if (collectionName.value && searchQuery.value && searchResults.value.length > 0) {
    await handleSearch()
  } else if (collectionName.value && searchQuery.value && searchQuery.value.trim()) {
    // If we have a query but no results yet, trigger search
    await handleSearch()
  }
}

const handleSortChange = async () => {
  await setSort(sortBy.value)
}

const clearSearchInput = () => {
  searchInputPending.value = false
  searchQuery.value = ''
  searchResults.value = []
  searchPerformed.value = false
  searchError.value = null
  expandedRows.value = []
  // Update URL to remove query param
  suppressRouteQuerySearch.value = true
  router.replace({
    path: route.path,
    query: buildSearchRouteQuery()
  }).finally(() => {
    suppressRouteQuerySearch.value = false
  })
}

// Table helper functions
const toggleRowExpansion = (rowId) => {
  const index = expandedRows.value.indexOf(rowId)
  if (index > -1) {
    expandedRows.value.splice(index, 1)
  } else {
    expandedRows.value.push(rowId)
  }
}

const getContentPreview = (doc) => {
  if (!doc) return null
  
  // CRITICAL FIX: Use server highlights when available, otherwise use plain content
  // Try to get content from common fields (prioritize meaningful content fields)
  const contentFields = ['content', 'text', 'body', 'description', 'summary', 'abstract', 'excerpt']
  
  // Helper function to clean content - removes "em", "topic about" artifacts, and broken HTML tags
  const cleanContent = (text) => {
    if (!text || typeof text !== 'string') return text
    return text
      .replace(/\btopic about\b/gi, '')
      .replace(/([a-zA-Z])em\b/gi, '$1') // Remove "em" at end of words
      .replace(/\bem([a-zA-Z])/gi, '$1') // Remove "em" at start of words
      .replace(/\bem\b/gi, '') // Remove standalone "em"
      .replace(/\s+em\s+/gi, ' ') // Remove "em" surrounded by spaces
      .replace(/^em\s+/gi, '') // Remove "em" at start
      .replace(/\s+em$/gi, '') // Remove "em" at end
      .replace(/em,/gi, ',') // Remove "em" before comma
      .replace(/,em/gi, ',') // Remove "em" after comma
      .replace(/em\./gi, '.') // Remove "em" before period
      .replace(/\.em/gi, '.') // Remove "em" after period
      .replace(/<>/g, '') // Remove empty tag pairs like <>
      .replace(/([a-zA-Z0-9\s])<([^\/!a-zA-Z])/g, '$1 $2') // Remove < not part of valid tag
      .replace(/([^>])>([a-zA-Z0-9\s])/g, '$1 $2') // Remove > not part of valid tag
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }
  
  // First check if there's a highlight for content fields (server-generated highlights)
  if (doc.highlights && Object.keys(doc.highlights).length > 0) {
    for (const field of contentFields) {
      if (doc.highlights[field]) {
        const highlighted = doc.highlights[field]
        let result = Array.isArray(highlighted) ? highlighted.join(' ... ') : (typeof highlighted === 'string' ? highlighted : JSON.stringify(highlighted))
        result = cleanContent(result)
        if (result && result.trim()) {
          // Show full content - no truncation
          return result
        }
      }
    }
    // Check any other highlight fields (excluding title/name)
    for (const field in doc.highlights) {
      if (field !== 'title' && field !== 'name' && !contentFields.includes(field)) {
        const highlight = doc.highlights[field]
        if (highlight) {
          let result = Array.isArray(highlight) ? highlight.join(' ... ') : (typeof highlight === 'string' ? highlight : JSON.stringify(highlight))
          result = cleanContent(result)
          if (result && result.trim()) {
            // Show full content - no truncation
            return result
          }
        }
      }
    }
  }
  
  // Otherwise use the plain content from fields
  for (const field of contentFields) {
    if (doc[field] !== undefined && doc[field] !== null && doc[field] !== '') {
      let content = typeof doc[field] === 'string' ? doc[field] : JSON.stringify(doc[field])
      if (content && content.trim()) {
        // Clean content using helper function
        content = cleanContent(content)
        if (content && content.length > 0) {
          // Show full content - no truncation
          return content
        }
      }
    }
  }
  
  // If no content field, show first meaningful field (skip metadata fields only)
  const excludedKeys = ['id', '_text_match', 'highlights', 'text_match', 'title', 'name', 'created_at', 'created', 'updated_at', 'updated', 'date', 'timestamp', 'score']
  const keys = Object.keys(doc).filter(k => !excludedKeys.includes(k) && !k.startsWith('_'))
  
  // Try to find a meaningful text field - show any string field with content
  for (const key of keys) {
    const value = doc[key]
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'string' && value.trim()) {
        // Clean content
        let cleaned = cleanContent(value)
        if (cleaned && cleaned.length > 0) {
          // Show full content - no truncation
          return cleaned
        }
      } else if (typeof value === 'object') {
        // Try to stringify objects
        try {
          const str = JSON.stringify(value, null, 2)
          if (str && str.length > 2) { // More than just "{}" or "[]"
            let cleaned = cleanContent(str)
            if (cleaned && cleaned.length > 2) {
              // Show full content - no truncation
              return cleaned
            }
          }
        } catch (e) {
          // Skip if can't stringify
        }
      } else {
        // Show other types as string
        const str = String(value)
        if (str && str.trim()) {
          let cleaned = cleanContent(str)
          if (cleaned && cleaned.length > 0) {
            // Show full content - no truncation
            return cleaned
          }
        }
      }
    }
  }
  
  // Last resort: if document has content field but it's empty, show a message
  // Or show all fields as JSON (excluding metadata)
  if (keys.length > 0) {
    try {
      const docPreview = {}
      for (const key of keys) {
        if (doc[key] !== undefined && doc[key] !== null) {
          docPreview[key] = doc[key]
        }
      }
      if (Object.keys(docPreview).length > 0) {
        const str = JSON.stringify(docPreview, null, 2)
        // Show full content - no truncation
        return str
      }
    } catch (e) {
      // Skip if can't stringify
    }
  }
  
  return null
}

const getScoreColor = (score) => {
  if (typeof score !== 'number') return 'primary'
  if (score >= 0.8) return 'success'
  if (score >= 0.5) return 'info'
  if (score >= 0.3) return 'warning'
  return 'error'
}

// Pagination computed properties
const paginatedSearchResults = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return searchResults.value.slice(start, end)
})

const paginatedDocuments = computed(() => {
  return Array.isArray(documents.value) ? documents.value : []
})

const totalPagesSearch = computed(() => {
  return Math.ceil(searchResults.value.length / itemsPerPage.value)
})

const totalPagesDocuments = computed(() => {
  const total = totalDocuments.value > 0 ? totalDocuments.value : documents.value.length
  return Math.ceil(total / itemsPerPage.value)
})

const paginationInfo = computed(() => {
  if (searchPerformed.value) {
    const start = (currentPage.value - 1) * itemsPerPage.value + 1
    const end = Math.min(currentPage.value * itemsPerPage.value, searchResults.value.length)
    return {
      start,
      end,
      total: searchResults.value.length,
      totalPages: totalPagesSearch.value
    }
  } else {
    const start = (currentPage.value - 1) * itemsPerPage.value + 1
    const total = totalDocuments.value > 0 ? totalDocuments.value : documents.value.length
    const end = Math.min(((currentPage.value - 1) * itemsPerPage.value) + documents.value.length, total)
    return {
      start,
      end,
      total,
      totalPages: totalPagesDocuments.value
    }
  }
})

// Watch for DOM changes and remove tooltips
watch([paginatedSearchResults, paginatedDocuments], () => {
  nextTick(() => {
    removeTooltips()
  })
}, { flush: 'post' })

// Handle page change
const onPageChange = (page) => {
  currentPage.value = page
  expandedRows.value = [] // Close expanded rows when changing pages
  // Scroll to top of table
  const tableCard = document.querySelector('.documents-table-card')
  if (tableCard) {
    tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Handle items per page change
const onItemsPerPageChange = (newValue) => {
  itemsPerPage.value = newValue
  currentPage.value = 1
  expandedRows.value = []

  if (!searchPerformed.value && collectionName.value) {
    loadDocuments(collectionName.value, { page: 1, perPage: newValue })
  }
}

// Bulk operations
const selectedDocuments = ref([])
const showBulkDeleteDialog = ref(false)
const bulkDeleting = ref(false)
const { exportToCSV, exportToJSON } = useExport()

const isDocumentSelected = (docId) => {
  return selectedDocuments.value.includes(docId)
}

const toggleDocumentSelection = (docId) => {
  const index = selectedDocuments.value.indexOf(docId)
  if (index > -1) {
    selectedDocuments.value.splice(index, 1)
  } else {
    selectedDocuments.value.push(docId)
  }
}

const clearSelection = () => {
  selectedDocuments.value = []
}

const exportDocument = (doc) => {
  exportToJSON([doc], `${collectionName.value}_document_${doc.id}.json`)
}

const exportSelectedDocuments = () => {
  if (selectedDocuments.value.length === 0) {
    toast.warning('No documents selected', 'Export')
    return
  }
  
  try {
    const allDocs = searchPerformed.value ? searchResults.value : documents.value
    const docsToExport = allDocs.filter(doc => selectedDocuments.value.includes(doc.id))
    
    if (docsToExport.length === 0) {
      toast.warning('Selected documents not found', 'Export')
      return
    }
    
    const filename = `${collectionName.value}_documents_${new Date().toISOString().split('T')[0]}.json`
    exportToJSON(docsToExport, filename)
    toast.success(`Exported ${docsToExport.length} document(s)`, 'Export')
  } catch (err) {
    toast.error('Failed to export documents', 'Export Error')
  }
}

const confirmBulkDelete = () => {
  if (selectedDocuments.value.length === 0) return
  showBulkDeleteDialog.value = true
}

const handleBulkDelete = async () => {
  bulkDeleting.value = true
  try {
    const docsToDelete = [...selectedDocuments.value]
    for (const docId of docsToDelete) {
      try {
        await deleteDocument(collectionName.value, docId)
      } catch (err) {
        console.error(`Failed to delete document ${docId}:`, err)
      }
    }
    selectedDocuments.value = []
    showBulkDeleteDialog.value = false
    if (collectionName.value) {
      await loadDocuments(collectionName.value)
    }
    toast.success(`Deleted ${docsToDelete.length} document(s)`, 'Bulk Delete')
  } catch (err) {
    console.error('Bulk delete error:', err)
    toast.error('Failed to delete some documents', 'Error')
  } finally {
    bulkDeleting.value = false
  }
}

const navigateToDocument = (docId, event = null) => {
  // Handle modifier keys for new tab/window
  if (event) {
    // Ctrl/Cmd + click or middle mouse button -> open in new tab
    if (event.ctrlKey || event.metaKey || event.button === 1) {
      const encodedName = encodeURIComponent(collectionName.value)
      const encodedDocId = encodeURIComponent(docId)
      const path = `/collections/${encodedName}/documents/${encodedDocId}`
      const route = router.resolve({ path: path })
      if (route && route.href) {
        window.open(route.href, '_blank')
      } else {
        window.open(path, '_blank')
      }
      return
    }
    // Right click -> allow default context menu
    if (event.button === 2) {
      return
    }
  }
  
  const encodedName = encodeURIComponent(collectionName.value)
  const encodedDocId = encodeURIComponent(docId)
  const path = `/collections/${encodedName}/documents/${encodedDocId}`
  router.push({ path: path }).catch(err => {
    // Ignore navigation errors (e.g., navigating to same route)
    if (err.name !== 'NavigationDuplicated') {
      console.error('Navigation error:', err)
    }
  })
}

const getDocumentRoute = (doc) => {
  if (!doc || !doc.id) return { name: 'collections' }
  const encodedName = encodeURIComponent(collectionName.value || '')
  const encodedId = encodeURIComponent(String(doc.id))
  return {
    name: 'document-detail',
    params: {
      name: encodedName,
      docId: encodedId
    }
  }
}

const handleDocumentClick = (doc, event) => {
  // Check if user is selecting text
  const selection = window.getSelection()
  if (selection && selection.toString().trim().length > 0) {
    event?.preventDefault?.()
    return
  }

  // Let the browser handle right click, middle click, and modifier-assisted navigation.
  if (
    !event ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }
}

// Delete document functionality
const showDeleteDocumentDialog = ref(false)
const documentToDelete = ref(null)
const deletingDocument = ref(false)

const deleteDocumentError = ref(null)

const confirmDeleteDocument = (docId) => {
  documentToDelete.value = docId
  showDeleteDocumentDialog.value = true
  deleteDocumentError.value = null
}

const handleDeleteDocument = async () => {
  if (!documentToDelete.value) return
  
  deletingDocument.value = true
  deleteDocumentError.value = null
  
  try {
    await deleteDocument(collectionName.value, documentToDelete.value)
    const docId = documentToDelete.value
    toast.success(`Document "${docId}" deleted successfully`, 'Document Deleted')
    showDeleteDocumentDialog.value = false
    documentToDelete.value = null
    // Reload documents
    await loadDocuments(collectionName.value)
  } catch (err) {
    const errorMsg = extractSafeErrorMessage(err, 'Failed to delete document')
    deleteDocumentError.value = errorMsg
    toast.error(errorMsg, 'Delete Failed')
  } finally {
    deletingDocument.value = false
  }
}

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'escape',
    handler: () => {
      if (showDeleteDocumentDialog.value) {
        showDeleteDocumentDialog.value = false
      }
      if (showBulkDeleteDialog.value) {
        showBulkDeleteDialog.value = false
      }
    }
  },
  {
    key: 'ctrl+f',
    handler: (e) => {
      e.preventDefault()
      const searchInput = document.querySelector('.modern-search-input-improved')
      if (searchInput) searchInput.focus()
    }
  }
])

const viewDocument = async (docId) => {
  try {
    const doc = await getDocument(collectionName.value, docId)
    documentJson.value = JSON.stringify(doc, null, 2)
    showDocumentDialog.value = true
  } catch (err) {
    alert(`Failed to load document: ${err.message}`)
  }
}

// Highlight search query in text - resalta todas las palabras individuales (como Google)
const highlightSearchQuery = (text) => {
  if (!text || !searchQuery.value || !searchQuery.value.trim()) {
    return text || ''
  }
  
  const query = searchQuery.value.trim()
  
  // Si el texto ya tiene HTML (de highlights del servidor), extraer el texto primero
  let hasHtml = /<[^>]+>/.test(text)
  let plainText = text
  
  if (hasHtml) {
    // Extract only text, preserving basic structure
    // Use DOMParser for safer HTML parsing to prevent XSS
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/html')
      plainText = doc.body.textContent || doc.body.innerText || text
    } catch (e) {
      // Fallback: create temporary div but sanitize first
      const tempDiv = document.createElement('div')
      // Remove script tags and event handlers before setting innerHTML
      const sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
      tempDiv.innerHTML = sanitized
      plainText = tempDiv.textContent || tempDiv.innerText || text
    }
  }
  
  // Dividir el query en palabras individuales (ignorar comillas para frases exactas)
  // Si el query tiene comillas, tratar la parte entre comillas como una frase
  let wordsToHighlight = []
  const quotedMatch = query.match(/"([^"]+)"/g)
  
  if (quotedMatch) {
    // Hay frases entre comillas
    quotedMatch.forEach(quoted => {
      const phrase = quoted.replace(/"/g, '')
      wordsToHighlight.push(phrase)
    })
    // Agregar palabras individuales fuera de comillas
    const withoutQuotes = query.replace(/"([^"]+)"/g, '').trim()
    if (withoutQuotes) {
      wordsToHighlight.push(...withoutQuotes.split(/\s+/).filter(w => w.length > 0))
    }
  } else {
    // No hay comillas, dividir en palabras individuales
    wordsToHighlight = query.split(/\s+/).filter(w => w.length > 0)
  }
  
  // Remover duplicados y ordenar por longitud (más largas primero para evitar conflictos)
  wordsToHighlight = [...new Set(wordsToHighlight)].sort((a, b) => b.length - a.length)
  
  // Resaltar cada palabra en el texto
  let highlightedText = plainText
  wordsToHighlight.forEach(word => {
    if (word.length > 0) {
      // Escapar caracteres especiales de regex
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Resaltar la palabra (case-insensitive) con el mismo estilo que los highlights del servidor
      const regex = new RegExp(`(${escapedWord})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<strong style="background-color: #fef08a; font-weight: normal; padding: 2px 4px; border-radius: 3px;">$1</strong>')
    }
  })
  
  // Si el texto original tenía HTML, intentar preservar la estructura básica
  if (hasHtml) {
    // Reemplazar el texto en el HTML original
    return text.replace(plainText, highlightedText)
  }
  
  return highlightedText
}

// Clean highlight text - use server highlights when available, otherwise show plain text
const cleanHighlightText = (text) => {
  if (!text) return ''
  
  // Always process through formatServerHighlights to fix broken tags
  // This handles cases like "<tdzfu" that should be "<em>tdzfu</em>"
  // formatServerHighlights will detect and fix broken tags
  return formatServerHighlights(text)
}

// Format highlight text - show full content, no truncation
const truncateHighlight = (text) => {
  if (!text) return ''
  
  try {
    // First format the highlights
    let formatted = formatServerHighlights(String(text))
    // Show full content - no truncation
    return formatted
  } catch (e) {
    return String(text || '')
  }
}

// Format ISO 8601 date string to friendly format (e.g., "Jan 15, 2024")
const formatDocumentDateFromISO = (isoString) => {
  if (!isoString) {
    return ''
  }
  
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      return ''
    }
    
    // Format: "Jan 15, 2024 at 3:45:12 PM"
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
  } catch (e) {
    return ''
  }
}

const getGoogleResultDate = (doc) => {
  if (!doc || typeof doc !== 'object') return ''

  if (doc.created_at) {
    const createdDate = formatDocumentDateFromISO(doc.created_at)
    if (createdDate) {
      return createdDate
    }
  }

  return formatDocumentDate(doc)
}

// Get document date from common date fields
const getDocumentDate = (doc) => {
  if (!doc || typeof doc !== 'object') return null
  
  // First, check common date field names
  const dateFields = ['created_at', 'created', 'date', 'timestamp', 'updated_at', 'updated', '_created_at', '_created', '_date', 'creation_date', 'creationDate', 'createdDate']
  for (const field of dateFields) {
    if (doc[field] !== undefined && doc[field] !== null && doc[field] !== '') {
      return doc[field]
    }
  }
  
  // Also check if document has any field that looks like a date (case-insensitive)
  for (const key in doc) {
    if (doc.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase()
      if ((lowerKey.includes('date') || lowerKey.includes('time') || lowerKey.includes('created') || lowerKey.includes('updated')) && 
          doc[key] !== undefined && doc[key] !== null && doc[key] !== '') {
        return doc[key]
      }
    }
  }
  
  return null
}

// Format document date for display - improved version
const formatDocumentDate = (doc) => {
  if (!doc) return ''
  const date = getDocumentDate(doc)
  if (!date && date !== 0) return ''
  
  try {
    let dateObj
    
    if (typeof date === 'number') {
      // Check if it's a Unix timestamp in seconds (10 digits) or milliseconds (13 digits)
      // Timestamps before year 2000 in seconds would be < 946684800 (Jan 1, 2000)
      // Timestamps in milliseconds would be > 946684800000
      if (date < 946684800) {
        // Very old timestamp, likely in seconds
        dateObj = new Date(date * 1000)
      } else if (date < 946684800000) {
        // Timestamp between 2000 and 2000 in milliseconds, likely in seconds
        dateObj = new Date(date * 1000)
      } else {
        // Timestamp >= 2000 in milliseconds, use as-is
        dateObj = new Date(date)
      }
    } else if (typeof date === 'string') {
      // Try parsing as ISO string first
      dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) {
        // If not a valid date string, try parsing as number
        const timestamp = parseFloat(date)
        if (!isNaN(timestamp) && isFinite(timestamp)) {
          if (timestamp < 946684800) {
            dateObj = new Date(timestamp * 1000)
          } else if (timestamp < 946684800000) {
            dateObj = new Date(timestamp * 1000)
          } else {
            dateObj = new Date(timestamp)
          }
        }
      }
    } else {
      dateObj = new Date(date)
    }
    
    if (isNaN(dateObj.getTime()) || !isFinite(dateObj.getTime())) {
      return ''
    }
    
    // Validate the date is reasonable (not before 1970 or too far in future)
    const year = dateObj.getFullYear()
    if (year < 1970 || year > 2100) {
      return ''
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[dateObj.getMonth()]
    const day = dateObj.getDate()
    
    return `${month} ${day}, ${year}`
  } catch (err) {
    console.warn('Document date formatting error:', err, date)
    return ''
  }
}



// Load synonyms
const loadSynonyms = async () => {
  if (!collectionName.value || !collectionName.value.trim()) return
  
  synonymsLoading.value = true
  synonymsError.value = null
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/synonyms`)
    
    const response = await axios.get(url, { timeout: 5000 })
    
    if (response.data && response.data.synonyms) {
      synonyms.value = Array.isArray(response.data.synonyms) ? response.data.synonyms : []
    } else {
      synonyms.value = []
    }
  } catch (err) {
    console.error('Failed to load synonyms:', err)
    synonymsError.value = err.response?.data?.error || err.message || 'Failed to load synonyms'
    synonyms.value = []
  } finally {
    synonymsLoading.value = false
  }
}

// Helper function to extract stopword text (handles both string and object formats)
const getStopwordText = (stopword) => {
  if (typeof stopword === 'string') {
    return stopword
  } else if (stopword && typeof stopword === 'object') {
    // Handle object format like { word: "the" }
    return stopword.word || stopword.text || JSON.stringify(stopword)
  }
  return String(stopword)
}

// Load stopwords
const loadStopwords = async () => {
  if (!collectionName.value || !collectionName.value.trim()) return
  
  stopwordsLoading.value = true
  stopwordsError.value = null
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/stopwords`)
    
    const response = await axios.get(url, { timeout: 5000 })
    
    if (response.data && response.data.stopwords) {
      // Ensure we have an array and preserve full objects with metadata
      const rawStopwords = Array.isArray(response.data.stopwords) ? response.data.stopwords : []
      // Preserve objects, or create objects from strings
      stopwords.value = rawStopwords.map(sw => {
        if (typeof sw === 'string') {
          return { word: sw }
        } else if (sw && typeof sw === 'object' && sw.word) {
          return sw // Preserve full object with created_at/updated_at
        }
        return { word: String(sw) }
      })
    } else {
      stopwords.value = []
    }
  } catch (err) {
    console.error('Failed to load stopwords:', err)
    stopwordsError.value = err.response?.data?.error || err.message || 'Failed to load stopwords'
    stopwords.value = []
  } finally {
    stopwordsLoading.value = false
  }
}

const submitInlineSynonym = async () => {
  const name = collectionName.value
  const root = String(inlineSynonymForm.value.root || '').trim()
  const parsedSynonyms = String(inlineSynonymForm.value.synonyms || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const normalizedStopwords = new Set(stopwords.value.map(item => getStopwordText(item).trim().toLowerCase()).filter(Boolean))
  const conflictingTerms = [root, ...parsedSynonyms]
    .filter(Boolean)
    .filter((value, index, array) => array.findIndex(item => item.toLowerCase() === value.toLowerCase()) === index)
    .filter(value => normalizedStopwords.has(value.toLowerCase()))

  if (!name || !name.trim()) {
    inlineSynonymError.value = 'Collection name is required'
    return
  }
  if (!root || parsedSynonyms.length === 0) {
    inlineSynonymError.value = 'Root term and at least one synonym are required.'
    return
  }
  if (parsedSynonyms.some(value => value.toLowerCase() === root.toLowerCase())) {
    inlineSynonymError.value = 'Root term cannot also appear in synonyms.'
    return
  }
  if (conflictingTerms.length > 0) {
    inlineSynonymError.value = `Synonym terms cannot match configured stopwords: ${conflictingTerms.join(', ')}.`
    return
  }

  addingInlineSynonym.value = true
  inlineSynonymError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(name.trim())
    let synonymId = slugifySynonymId(root) || 'synonym_group'
    const existingIds = new Set(synonyms.value.map(item => String(item?.id || '').trim()).filter(Boolean))
    if (existingIds.has(synonymId)) {
      let suffix = 2
      while (existingIds.has(`${synonymId}_${suffix}`)) suffix += 1
      synonymId = `${synonymId}_${suffix}`
    }
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/synonyms/${encodeURIComponent(synonymId)}`)
    await axios.post(url, { root, synonyms: parsedSynonyms }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })
    await loadSynonyms()
    closeInlineSynonymForm()
  } catch (err) {
    inlineSynonymError.value = extractSafeErrorMessage(err, 'Failed to add synonym')
  } finally {
    addingInlineSynonym.value = false
  }
}

const submitInlineStopword = async () => {
  const name = collectionName.value
  const word = String(inlineStopwordForm.value.word || '').trim()

  if (!name || !name.trim()) {
    inlineStopwordError.value = 'Collection name is required'
    return
  }
  if (!word) {
    inlineStopwordError.value = 'Stopword is required'
    return
  }

  addingInlineStopword.value = true
  inlineStopwordError.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(name.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/stopwords`)
    await axios.post(url, { word }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })
    await loadStopwords()
    closeInlineStopwordForm()
  } catch (err) {
    inlineStopwordError.value = extractSafeErrorMessage(err, 'Failed to add stopword')
  } finally {
    addingInlineStopword.value = false
  }
}

// Delete synonym - open confirmation dialog
const showDeleteSynonymDialog = ref(false)
const synonymToDelete = ref(null)
const deletingSynonym = ref(false)
const deleteSynonymError = ref(null)

const openDeleteSynonymDialog = (synonym) => {
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
  if (!synonymToDelete.value) {
    deleteSynonymError.value = 'Synonym data is missing'
    return
  }
  
  const synonymId = synonymToDelete.value.id || synonymToDelete.value.root
  if (!synonymId) {
    deleteSynonymError.value = 'Synonym ID is required'
    return
  }
  
  deletingSynonym.value = true
  deleteSynonymError.value = null
  
  if (!collectionName.value || !collectionName.value.trim()) {
    deleteSynonymError.value = 'Collection name is required'
    deletingSynonym.value = false
    return
  }
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value.trim())
    const encodedId = encodeURIComponent(synonymId)
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/synonyms/${encodedId}`)
    
    await axios.delete(url, { timeout: 5000 })
    
    // Close dialog
    closeDeleteSynonymDialog()
    
    // Reload synonyms to refresh the list
    await loadSynonyms()
    synonymsError.value = null
  } catch (err) {
    const errorMsg = extractSafeErrorMessage(err, 'Failed to delete synonym')
    deleteSynonymError.value = errorMsg
  } finally {
    deletingSynonym.value = false
  }
}

// Add stopword
const addStopword = async () => {
  if (!newStopword.value.trim()) {
    stopwordsError.value = 'Stopword is required'
    return
  }
  
  if (!collectionName.value || !collectionName.value.trim()) {
    stopwordsError.value = 'Collection name is required'
    return
  }
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/stopwords`)
    
    await axios.post(url, {
      word: newStopword.value.trim()
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    })
    
    showAddStopwordDialog.value = false
    newStopword.value = ''
    await loadStopwords()
  } catch (err) {
    stopwordsError.value = err.response?.data?.error || err.message || 'Failed to add stopword'
  }
}

// Delete stopword - open confirmation dialog
const openDeleteStopwordDialog = (stopwordData) => {
  stopwordToDelete.value = stopwordData
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
  if (!stopwordToDelete.value) {
    deleteStopwordError.value = 'Stopword data is missing'
    return
  }
  
  const word = getStopwordText(stopwordToDelete.value)
  if (!word) {
    deleteStopwordError.value = 'Stopword text is required'
    return
  }
  
  deletingStopword.value = true
  deleteStopwordError.value = null
  
  if (!collectionName.value || !collectionName.value.trim()) {
    deleteStopwordError.value = 'Collection name is required'
    deletingStopword.value = false
    return
  }
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedCollection = encodeURIComponent(collectionName.value.trim())
    const encodedWord = encodeURIComponent(word)
    const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/stopwords/${encodedWord}`)
    
    await axios.delete(url, { timeout: 5000 })
    
    // Close dialog
    closeDeleteStopwordDialog()
    
    // Reload stopwords to refresh the list
    await loadStopwords()
    stopwordsError.value = null
  } catch (err) {
    console.error('Delete stopword error:', err)
    const errorMsg = extractSafeErrorMessage(err, 'Failed to delete stopword')
    deleteStopwordError.value = errorMsg
  } finally {
    deletingStopword.value = false
  }
}

// Watch for tab changes - load data when switching tabs
watch(activeTab, (newTab) => {
  if (newTab === 'synonyms') {
    if (synonyms.value.length === 0 && !synonymsLoading.value) {
      loadSynonyms()
    }
  } else if (newTab === 'stopwords') {
    if (stopwords.value.length === 0 && !stopwordsLoading.value) {
      loadStopwords()
    }
  } else if (newTab === 'config') {
    if (!collectionSchema.value && !schemaLoading.value) {
      loadCollectionSchema()
    }
  }
}, { immediate: true })

// Watch collection name changes and reload documents
// CRITICAL FIX: Only watch route params, not both route and collectionName to avoid double-loading
// Watch route params to reload when collection name changes in URL
// Flag to prevent concurrent document loads (race condition fix)
watch(() => route.params.name, async (newName, oldName) => {
  if (newName && newName !== oldName && !isLoadingDocuments.value) {
    isLoadingDocuments.value = true
    try {
      currentPage.value = parseRoutePage(route.params.page)
      const decodedName = decodeURIComponent(String(newName))
      await loadDocuments(decodedName)
      loadSynonyms()
      loadStopwords()
      loadCollectionSchema()
      // Clear search when collection changes
      searchQuery.value = ''
      searchPerformed.value = false
      searchResults.value = []
    } catch (err) {
      console.error('CollectionDocumentsView: Error reloading documents for new collection:', err)
    } finally {
      isLoadingDocuments.value = false
    }
  }
}, { immediate: false }) // Changed to false - onMounted will handle initial load

watch(() => route.params.page, (newPage) => {
  const nextPage = parseRoutePage(newPage)
  if (currentPage.value !== nextPage) {
    currentPage.value = nextPage
  }

  if (!searchPerformed.value && collectionName.value && !isLoadingDocuments.value) {
    isLoadingDocuments.value = true
    loadDocuments(collectionName.value, { page: nextPage, perPage: itemsPerPage.value })
      .finally(() => {
        isLoadingDocuments.value = false
      })
  }
}, { immediate: false })

// Watch route query params for search query
// Track if we've already handled initial mount to prevent double-loading

watch(() => [route.query.q, route.query.from, route.query.to], ([newQuery, newFrom, newTo]) => {
  if (suppressRouteQuerySearch.value) {
    return
  }
  // Skip if this is the initial mount (onMounted will handle it)
  if (!hasHandledInitialMount.value) {
    return
  }
  
  if (newQuery && typeof newQuery === 'string') {
    searchQuery.value = newQuery
    dateFrom.value = typeof newFrom === 'string' && newFrom.trim() ? newFrom : null
    dateTo.value = typeof newTo === 'string' && newTo.trim() ? newTo : null
    // Auto-search if we have a query
    if ((newQuery.trim() || dateFrom.value || dateTo.value) && collectionName.value) {
      handleSearch()
    }
  } else if (!newQuery || !String(newQuery).trim()) {
    dateFrom.value = typeof newFrom === 'string' && newFrom.trim() ? newFrom : null
    dateTo.value = typeof newTo === 'string' && newTo.trim() ? newTo : null

    if (dateFrom.value || dateTo.value) {
      if (collectionName.value) {
        handleSearch()
      }
      return
    }

    // Query was removed - clear search and show documents
    searchQuery.value = ''
    searchPerformed.value = false
    searchResults.value = []
    // Reload documents if we have a collection
    if (collectionName.value && collectionName.value.trim()) {
      loadDocuments(collectionName.value)
    }
  }
}, { immediate: false })

watch(() => route.path, () => {
  const normalizedTab = getTabFromRoute()
  if (activeTab.value !== normalizedTab) {
    activeTab.value = normalizedTab
  }
}, { immediate: false })

watch(currentPage, (newPage) => {
  if (activeTab.value === 'documents') {
    syncDocumentsPageRoute(newPage)
  }
})

// Function to remove all tooltips from document cards - VERY AGGRESSIVE
const removeTooltips = () => {
  if (typeof document === 'undefined') return
  
  // Remove title attributes that cause native browser tooltips - target ALL elements
  const allElements = document.querySelectorAll('.documents-cards-container, .documents-cards-container *, .document-link, .document-link *, .document-card-clickable, .document-card-clickable *, .google-result-card, .google-result-card *, .google-result-content, .google-result-content *, .no-tooltip, .no-tooltip *, .no-tooltip-card, .no-tooltip-card *')
  allElements.forEach(el => {
    if (el && el.removeAttribute) {
      el.removeAttribute('title')
      el.removeAttribute('data-title')
      el.removeAttribute('aria-label')
      el.removeAttribute('aria-describedby')
      el.removeAttribute('data-v-tooltip')
      // Set empty title to override any dynamic additions
      el.setAttribute('title', '')
      // Prevent tooltip activation
      if (el.onmouseenter) el.onmouseenter = null
      if (el.onmouseover) el.onmouseover = null
      // Remove any Vuetify tooltip data
      if (el.__vueParentComponent) {
        try {
          delete el.__vueParentComponent.props?.title
        } catch (e) {}
      }
    }
  })
  
  // Hide ANY tooltip overlays - be very aggressive
  const tooltips = document.querySelectorAll('.v-tooltip, [role="tooltip"], .v-overlay__content, .v-overlay, [class*="tooltip"], [class*="Tooltip"], [id*="tooltip"], .v-tooltip__wrapper, .v-tooltip__activator')
  tooltips.forEach(tooltip => {
    if (tooltip) {
      // Check if tooltip is related to documents container
      const container = document.querySelector('.documents-cards-container')
      const isInDocuments = container && (
        container.contains(tooltip) ||
        tooltip.closest('.documents-cards-container') ||
        tooltip.closest('.document-card-clickable') ||
        tooltip.closest('.document-link') ||
        tooltip.closest('.no-tooltip-card')
      )
      
      // Also remove tooltips that are overlays on top of document cards
      const tooltipRect = tooltip.getBoundingClientRect()
      const containerRect = container?.getBoundingClientRect()
      const isOverlapping = containerRect && (
        tooltipRect.top < containerRect.bottom &&
        tooltipRect.bottom > containerRect.top &&
        tooltipRect.left < containerRect.right &&
        tooltipRect.right > containerRect.left
      )
      
      if (isInDocuments || isOverlapping) {
        tooltip.style.cssText = 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; z-index: -9999 !important; position: absolute !important; left: -9999px !important; top: -9999px !important; width: 0 !important; height: 0 !important;'
        try {
          tooltip.remove()
        } catch (e) {
          // Ignore if can't remove
        }
      }
    }
  })
  
  // Also prevent tooltip activation by removing event listeners
  const cards = document.querySelectorAll('.documents-cards-container .v-card, .documents-cards-container router-link')
  cards.forEach(card => {
    if (card) {
      // Remove all mouse event listeners that might trigger tooltips
      const newCard = card.cloneNode(true)
      card.parentNode?.replaceChild(newCard, card)
    }
  })
}

onMounted(async () => {
  // Use computed collectionName which already handles all fallbacks
  const nameToLoad = collectionName.value
  currentPage.value = parseRoutePage(route.params.page)
  
  // Check if there's a search query in URL - if so, perform search instead of loading documents
  const hasSearchQuery = route.query.q && typeof route.query.q === 'string' && route.query.q.trim()
  const hasDateQuery = (typeof route.query.from === 'string' && route.query.from.trim()) || (typeof route.query.to === 'string' && route.query.to.trim())

  dateFrom.value = typeof route.query.from === 'string' && route.query.from.trim() ? route.query.from : null
  dateTo.value = typeof route.query.to === 'string' && route.query.to.trim() ? route.query.to : null
  
  if (hasSearchQuery || hasDateQuery) {
    // Restore search query and perform search
    searchQuery.value = hasSearchQuery ? route.query.q : ''
    if (nameToLoad && nameToLoad.trim()) {
      // Perform search to restore results
      await handleSearch()
    }
  } else {
    // Load initial data if we have a valid collection name and no search query
    // Only load if not already loading to prevent race conditions
    if (nameToLoad && nameToLoad.trim() && !isLoadingDocuments.value) {
      isLoadingDocuments.value = true
      try {
        // Load documents - ensure we call it even if watchers might also call it
        await loadDocuments(nameToLoad)
      } catch (err) {
        console.error('CollectionDocumentsView: Error loading initial data:', err)
        console.error('CollectionDocumentsView: Error details:', {
          message: err.message,
          stack: err.stack,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText
        })
      } finally {
        isLoadingDocuments.value = false
      }
    } else {
      console.error('CollectionDocumentsView: No collection name available on mount', {
        collectionName: collectionName.value,
        propsName: props.name,
        routeParams: route.params.name,
        routePath: route.path,
        routeFullPath: route.fullPath,
        windowPath: typeof window !== 'undefined' ? window.location.pathname : 'N/A'
      })
      // Try one more time after a short delay in case route hasn't updated yet
      setTimeout(async () => {
        const retryName = collectionName.value
        if (retryName && retryName.trim()) {
          try {
            await loadDocuments(retryName)
          } catch (err) {
            console.error('CollectionDocumentsView: Error on retry:', err)
          }
        }
      }, 100)
    }
  }
  
  // Always load synonyms, stopwords, and schema (needed for both search and document listing)
  if (!hasSearchQuery) {
    loadSynonyms()
    loadStopwords()
    loadCollectionSchema()
  } else {
    // Load these in background even when searching
    setTimeout(() => {
      loadSynonyms()
      loadStopwords()
      loadCollectionSchema()
    }, 100)
  }
  
  // Mark that initial mount has been handled
  hasHandledInitialMount.value = true
  
  // Remove tooltips after initial render
  nextTick(() => {
    removeTooltips()
    
    // Set up MutationObserver to watch for tooltip additions
    const observer = new MutationObserver(() => {
      removeTooltips()
    })
    
    const container = document.querySelector('.documents-cards-container')
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['title', 'data-title', 'aria-label']
      })
    }
    
    // Store observer for cleanup
    window._tooltipObserver = observer
  })

  window.addEventListener('scroll', closeToolbarMenus, { passive: true })
})

// Cleanup debounce timer on unmount
onUnmounted(() => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
    searchDebounceTimer.value = null
  }
  // Clean up MutationObserver
  if (window._tooltipObserver) {
    window._tooltipObserver.disconnect()
    window._tooltipObserver = null
  }
  // Final cleanup of tooltips
  removeTooltips()
  window.removeEventListener('scroll', closeToolbarMenus)
})
</script>

<style scoped>
/* hlquery design system */
/* Spacing system: 4 / 8 / 12 / 16 / 24 / 32 px */

/* Header with Favicon */
/* Collection Breadcrumb Header - Same style as AppHeader (no box) */
.collection-breadcrumb-header {
  padding: 16px 0;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.header-favicon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

/* Simple Action Buttons - White, small, no icons */
.simple-action-button {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 300 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  color: rgb(66, 84, 102) !important;
  text-transform: none !important;
  padding: 6px 16px !important;
  min-width: auto !important;
  height: 32px !important;
  border-radius: 6px !important;
  background: transparent !important;
  transition: all 0.2s ease !important;
}

.simple-action-button:hover {
  background: rgba(0, 0, 0, 0.04) !important;
  color: rgb(66, 84, 102) !important;
}

.simple-action-button:active {
  background: rgba(0, 0, 0, 0.06) !important;
}

/* Collection Action Buttons - #1976d3 blue style */
.collection-action-button {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 20px !important;
  text-transform: none !important;
  padding: 12px 24px !important;
  min-width: auto !important;
  height: auto !important;
  border-radius: 8px !important;
  background: #1976d3 !important;
  background-color: #1976d3 !important;
  color: #ffffff !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04) !important;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
  letter-spacing: -0.01em !important;
  border: none !important;
}

.collection-action-button:hover {
  background: #1565c0 !important;
  background-color: #1565c0 !important;
  box-shadow: 0 4px 12px rgba(25, 118, 211, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.04) !important;
  transform: translateY(-1px) !important;
}

.collection-action-button:active {
  background: #0d47a1 !important;
  background-color: #0d47a1 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04) !important;
  transform: translateY(0) !important;
}

.collection-action-button:focus-visible {
  outline: 2px solid #1976d3 !important;
  outline-offset: 2px !important;
  box-shadow: 0 4px 12px rgba(25, 118, 211, 0.2), 0 0 0 3px rgba(25, 118, 211, 0.1) !important;
}

.collection-action-button :deep(.v-btn__prepend) {
  margin-inline-end: 8px !important;
}

/* Professional Breadcrumb Navigation */
.collection-breadcrumb {
  gap: 4px;
  align-items: center;
}

.breadcrumb-back-btn {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  color: #1976d2 !important;
  padding: 4px 12px !important;
  border-radius: 8px !important;
  min-width: auto !important;
  height: 32px !important;
  transition: all 0.2s ease !important;
}

.breadcrumb-back-btn:hover {
  background: #f1f5f9 !important;
  color: #1565c0 !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
}

.breadcrumb-back-btn:active {
  background: #e2e8f0 !important;
  transform: translateY(0) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06) !important;
}

.breadcrumb-back-btn :deep(.v-icon) {
  color: inherit !important;
}

.breadcrumb-home-btn {
  padding: 4px 12px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  border-radius: 8px !important;
  min-height: 32px !important;
  height: 32px !important;
  transition: all 0.2s ease !important;
  color: #64748b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  background: transparent !important;
}

.breadcrumb-home-btn:hover,
.breadcrumb-home-btn--active {
  background: #f1f5f9 !important;
  color: #1e293b !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
}

.breadcrumb-home-btn:active {
  background: #e2e8f0 !important;
  transform: translateY(0) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06) !important;
}

.breadcrumb-arrow {
  color: #64748b !important;
  cursor: pointer !important;
  transition: transform 0.3s ease, color 0.2s ease !important;
  margin: 0 4px !important;
  opacity: 0.7 !important;
}

.breadcrumb-arrow:hover {
  color: #475569 !important;
  opacity: 1 !important;
  background: rgba(100, 116, 139, 0.1) !important;
  border-radius: 4px !important;
  padding: 2px !important;
}

.breadcrumb-arrow--rotated {
  transform: rotate(90deg) !important;
}

.breadcrumb-collection-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.breadcrumb-collection-name:hover {
  background: #f8fafc;
  color: #1976d2;
  transform: none !important;
}

/* Two Segmented Layout */
.documents-layout-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0;
  background: #ffffff !important;
  background-color: #ffffff !important;
}

.search-segment-card {
  background: #ffffff !important;
  border-radius: 12px !important;
}

/* Documents Results Container - No card, just content */
.documents-results-container {
  width: 100%;
  padding: 0;
  border-top: none !important;
}

/* Results Count Header */
.results-count-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #e2e8f0;
}

.results-count-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  line-height: 24px !important;
  color: #0f172a !important;
}

.search-time-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  color: #64748b !important;
}

/* Results Count Simple - Google Style (above first document) */
.results-count-simple {
  padding: 8px 0;
  color: #70757a;
  font-size: 14px;
  font-family: arial, sans-serif;
}

.results-count-simple-text {
  color: #70757a;
  font-size: 14px;
  line-height: 1.5;
}

.results-count-simple-time {
  color: #70757a;
  font-size: 14px;
}

/* Results Count Badge - Bottom Styled */
.results-count-bottom {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.results-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.results-count-badge:hover {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.results-count-number {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 700 !important;
  font-size: 18px !important;
  line-height: 24px !important;
  color: #0e2438 !important;
  background: linear-gradient(135deg, #0e2438 0%, #1e40af 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.results-count-label {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  color: #64748b !important;
}

.results-count-time {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
  font-size: 12px !important;
  line-height: 16px !important;
  color: #94a3b8 !important;
  font-style: italic;
}

/* Pagination Info Top */
.pagination-info-top {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  color: #64748b !important;
}

/* Pagination Wrapper Bottom - Centered */
.pagination-wrapper-bottom {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
  width: 100%;
}

.pagination-centered {
  display: flex;
  justify-content: center;
  width: 100%;
}

/* Primary action buttons - 3D professional style */
.primary-action-btn {
  border-radius: 8px !important;
  padding: 12px 24px !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  text-transform: none !important;
  letter-spacing: -0.01em !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  overflow: hidden !important;
  margin: 0 6px !important;
  background: linear-gradient(135deg, #0e2438 0%, #1a365d 100%) !important;
  color: #ffffff !important;
  box-shadow: 
    0 4px 8px rgba(14, 36, 56, 0.25),
    0 2px 4px rgba(14, 36, 56, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(14, 36, 56, 0.3) !important;
}

.primary-action-btn:hover {
  background: linear-gradient(135deg, #1a365d 0%, #2d4a7d 100%) !important;
  box-shadow: 
    0 6px 12px rgba(14, 36, 56, 0.35),
    0 3px 6px rgba(14, 36, 56, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  transform: translateY(-2px) !important;
  border-color: rgba(14, 36, 56, 0.4) !important;
}

.primary-action-btn:active {
  background: linear-gradient(135deg, #0a1e35 0%, #0e2438 100%) !important;
  box-shadow: 
    0 2px 4px rgba(14, 36, 56, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  transform: translateY(0) !important;
}

/* Stopwords grid - hlquery layout */
.stopwords-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 960px;
  margin-inline: auto;
}

/* Empty State Container - Professional card style like disconnected message */
.empty-state-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 24px;
  min-height: 400px;
}

.empty-state-card {
  border-radius: 16px !important;
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  max-width: 500px !important;
  width: 100% !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.empty-state-content {
  padding: 48px 32px !important;
  text-align: center !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

.empty-state-icon {
  opacity: 0.6 !important;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1)) !important;
}

.empty-state-title {
  font-size: 24px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  margin-bottom: 12px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.empty-state-subtitle {
  font-size: 15px !important;
  color: #64748b !important;
  line-height: 1.6 !important;
  margin-bottom: 8px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.empty-state-subtitle strong {
  color: #1e293b !important;
  font-weight: 600 !important;
}

.empty-state-button {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: -0.01em !important;
  border-radius: 8px !important;
  padding: 12px 24px !important;
  box-shadow: 
    0 4px 8px rgba(25, 118, 210, 0.2),
    0 2px 4px rgba(25, 118, 210, 0.15) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.empty-state-button:hover {
  box-shadow: 
    0 6px 12px rgba(25, 118, 210, 0.3),
    0 3px 6px rgba(25, 118, 210, 0.2) !important;
  transform: translateY(-2px) !important;
}

/* Stopwords empty state - Clean, centered */
.stopwords-empty-state {
  text-align: center;
  padding: 64px 24px;
  color: #425466;
}

.stopwords-empty-state .v-icon {
  opacity: 0.5;
}

/* Code/JSON blocks - Well rounded dark theme */
.document-json {
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  background: #1e293b !important;
  color: #f1f5f9 !important;
  padding: 24px;
  margin: 0;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.8;
  max-height: 600px;
  overflow-y: auto;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', 'Courier New', monospace;
  border-radius: 12px;
  border: 1px solid #334155;
}

/* Delete Synonym Modal - Beautiful and modern design */
.delete-modal-card {
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
  background: #ffffff !important;
}

.delete-modal-header {
  text-align: center;
  padding: 40px 32px 32px 32px;
  background: linear-gradient(135deg, #fee2e2 0%, #fef3c7 50%, #fee2e2 100%);
  position: relative;
  overflow: hidden;
}

.delete-modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.delete-modal-icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px auto;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4), 0 0 0 4px rgba(239, 68, 68, 0.1);
  position: relative;
  z-index: 1;
  animation: pulse-icon 2s ease-in-out infinite;
}

@keyframes pulse-icon {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4), 0 0 0 4px rgba(239, 68, 68, 0.1);
  }
  50% {
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.5), 0 0 0 8px rgba(239, 68, 68, 0.15);
  }
}

.delete-modal-icon-inner {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.delete-modal-title {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
}

.delete-modal-subtitle {
  font-size: 15px;
  color: #64748b;
  margin: 0;
  line-height: 1.7;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  z-index: 1;
}

.delete-modal-content {
  padding: 28px 32px;
  background: #ffffff;
}

.delete-modal-preview {
  border-radius: 16px;
  border: 2px solid #fee2e2;
  background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.08);
}

.delete-modal-preview:hover {
  border-color: #fecaca;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.12);
  transform: translateY(-2px);
}

.delete-preview-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.delete-preview-label-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.delete-preview-label {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.delete-preview-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  word-break: break-word;
  letter-spacing: -0.01em;
  line-height: 1.4;
}

.delete-preview-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.delete-preview-chip {
  font-weight: 600 !important;
  font-size: 14px !important;
  padding: 8px 16px !important;
  border-radius: 20px !important;
  box-shadow: 0 2px 4px rgba(14, 36, 56, 0.1) !important;
  transition: all 0.2s ease !important;
}

.delete-preview-chip:hover {
  box-shadow: 0 4px 8px rgba(14, 36, 56, 0.15) !important;
  transform: translateY(-1px);
}

.delete-modal-actions {
  background: #fafafa;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px !important;
}

.delete-modal-cancel-btn {
  padding: 12px 24px !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  text-transform: none !important;
  color: #6b7280 !important;
  border-radius: 10px !important;
  transition: all 0.2s ease !important;
  min-width: 100px !important;
}

.delete-modal-cancel-btn:hover {
  background: #f3f4f6 !important;
  color: #1f2937 !important;
  transform: translateY(-1px);
}

.delete-modal-confirm-btn {
  padding: 12px 28px !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  text-transform: none !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3), 0 2px 4px rgba(239, 68, 68, 0.2) !important;
  transition: all 0.2s ease !important;
  min-width: 160px !important;
  letter-spacing: -0.01em !important;
}

.delete-modal-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4), 0 4px 8px rgba(239, 68, 68, 0.25) !important;
  transform: translateY(-2px);
  background: #dc2626 !important;
}

.delete-modal-confirm-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3) !important;
}

.delete-modal-confirm-btn:disabled {
  opacity: 0.6;
  transform: none !important;
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

/* Compact Search Bar - Small and white */
.collection-search-shell {
  margin-bottom: 4px;
  background: #ffffff !important;
  background-color: #ffffff !important;
}

.collection-search-card {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: #ffffff !important;
  box-shadow: none;
}

.collection-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.collection-search-help-link {
  align-items: center;
  background: transparent !important;
  border: none !important;
  border-color: transparent !important;
  border-radius: 8px;
  box-shadow: none !important;
  color: #475569;
  display: inline-flex;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1;
  min-height: 40px;
  outline: none !important;
  padding: 0 4px;
  text-decoration: none;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.collection-search-help-link:hover {
  color: #0f172a;
  text-decoration: underline;
}

.collection-search-help-link:focus,
.collection-search-help-link:focus-visible,
.collection-search-help-link:active,
.collection-search-help-link:visited {
  background: transparent !important;
  border: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
  color: #475569;
  outline: none !important;
}

.collection-search-help-link--tabs {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 8px;
  margin-right: 12px;
  position: relative;
  top: -6px;
}

.collection-search-usage-card {
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.collection-search-usage-header {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12px;
}

.collection-search-usage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.collection-search-usage-item {
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: #ffffff;
}

.collection-search-usage-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 6px;
}

.collection-search-usage-code {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 8px 10px;
  border-radius: 10px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.8rem;
}

.collection-date-toolbar-btn.active {
  border-color: #b9d1ee !important;
  background: #f5f9ff !important;
  color: #0a2540 !important;
}

.collection-date-trigger-clear {
  font-size: 16px;
  color: #64748b;
  transition: color 0.18s ease;
  margin-left: 2px;
}

.collection-date-trigger-clear:hover {
  color: #0f172a;
}

.collection-date-menu {
  width: min(340px, calc(100vw - 32px));
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #dadce0;
  background: #ffffff;
  box-shadow: 0 2px 10px 1px rgba(64, 60, 67, 0.28);
}

.collection-date-menu-header {
  margin-bottom: 14px;
}

.collection-date-menu-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.collection-date-menu-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #5f6368;
}

.collection-date-menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.collection-date-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.collection-date-label {
  font-size: 12px;
  font-weight: 700;
  color: #5f6368;
}

.collection-date-input {
  width: 100%;
  min-height: 40px;
  border-radius: 8px;
  border: 1px solid #d7dce3;
  background: #f5f7fa;
  color: #202124;
  font-size: 13px;
  padding: 0 10px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.collection-date-input:focus {
  border-color: #c4ccd6;
  background: #f1f4f8;
  box-shadow: none;
}

.collection-date-menu-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.collection-date-action {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  transition: all 0.18s ease;
}

.collection-date-action.ghost {
  border-color: #dbe3ee;
  background: #ffffff;
  color: #475569;
}

.collection-date-action.primary {
  background: #0a2540;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(10, 37, 64, 0.16);
}

.collection-date-action:hover {
  transform: translateY(-1px);
}

@media (max-width: 720px) {
  .collection-search-row {
    align-items: stretch;
    flex-direction: column;
  }

  .collection-date-toolbar-btn {
    width: 100%;
    justify-content: space-between;
  }

  .collection-date-menu-grid {
    grid-template-columns: 1fr;
  }

  .collection-search-input {
    width: 100%;
    min-width: 0;
  }
}

.collection-search-input {
  flex: 1 1 420px;
  min-width: 280px;
  max-width: none;
}

.collection-search-scope-select {
  flex: 0 0 240px;
  min-width: 220px;
}

.collection-search-scope-select :deep(.v-field) {
  background: #ffffff !important;
  border-radius: 10px !important;
  border: 1px solid #dbe3ee !important;
  box-shadow: none !important;
}

.collection-search-scope-select :deep(.v-field__outline) {
  display: none;
}

.collection-search-scope-select :deep(.v-field__input) {
  min-height: 40px;
}

.collection-search-scope-select :deep(.v-select__selection-text),
.collection-search-scope-value {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.collection-search-custom {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}

.collection-search-custom-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 14px;
  align-items: start;
}

.collection-search-custom-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.collection-search-custom-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

.collection-search-fields-select :deep(.v-field) {
  background: #ffffff !important;
  border-radius: 10px !important;
  border: 1px solid #dbe3ee !important;
  box-shadow: none !important;
}

.collection-search-fields-select :deep(.v-field__outline) {
  display: none;
}

.collection-search-fields-select :deep(.v-field__input) {
  min-height: 40px;
}

.collection-search-logic {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.collection-search-logic-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.collection-search-logic-toggle {
  padding: 4px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px solid #dbe3ee;
}

.collection-search-logic-btn {
  min-width: 58px !important;
  border-radius: 999px !important;
  color: #475569 !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  letter-spacing: 0.03em !important;
  text-transform: none !important;
}

.collection-search-logic-btn.v-btn--selected,
.collection-search-logic-btn.v-btn--active {
  background: #0a2540 !important;
  color: #ffffff !important;
}

.collection-search-custom-note {
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

@media (max-width: 920px) {
  .collection-search-custom-row {
    grid-template-columns: 1fr;
  }

  .collection-search-scope-select {
    flex: 1 1 100%;
    min-width: 0;
  }
}

.compact-search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.compact-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  padding: 4px 10px;
  transition: all 0.2s ease;
  flex: 1;
  max-width: 360px;
  min-height: 32px;
  box-shadow: none;
}

.compact-search-wrapper:hover {
  background: #e5e7eb;
}

.compact-search-wrapper:focus-within {
  background: #e5e7eb;
  box-shadow: none;
}

.compact-search-icon {
  margin-right: 6px;
  color: #1f2937;
  flex-shrink: 0;
  font-size: 14px;
}

.compact-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #1f2937;
  font-family: arial, sans-serif;
  width: 100%;
  padding: 0;
  line-height: 1.25;
  font-weight: 600;
}

.compact-search-input::placeholder {
  color: #374151;
  font-size: 13px;
}

.compact-search-input:focus::placeholder {
  color: transparent;
}

.compact-search-clear {
  cursor: pointer;
  color: #1f2937;
  font-size: 16px;
  transition: color 0.2s ease;
  margin-left: 6px;
  flex-shrink: 0;
}

.compact-search-clear:hover {
  color: #374151;
}

.compact-search-settings-btn {
  color: #757575 !important;
  transition: all 0.2s ease;
  flex-shrink: 0;
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
}

.search-mini-loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  margin-top: 6px;
  margin-left: 10px;
}

.search-mini-spinner {
  opacity: 0.85;
}

.search-centered-loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2100;
}

.compact-search-settings-btn:hover {
  color: #1976d2 !important;
  background: rgba(25, 118, 210, 0.08) !important;
}

.compact-search-settings-btn.active {
  color: #1976d2 !important;
  background: rgba(25, 118, 210, 0.12) !important;
}

.compact-search-settings-btn :deep(.v-icon) {
  font-size: 18px !important;
}

.compact-search-field-btn {
  height: 36px !important;
  border-radius: 6px !important;
  border: 1px solid #e0e0e0 !important;
  background: #ffffff !important;
  color: #5f6368 !important;
  padding: 0 10px !important;
  font-size: 13px !important;
}

.field-picker-card {
  border-radius: 14px !important;
  border: 1px solid #dbe5f3 !important;
  background: #ffffff !important;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.10),
    0 6px 16px rgba(15, 23, 42, 0.06) !important;
}

.inline-search-settings-shell {
  margin-top: 10px;
  margin-bottom: 6px;
  max-width: 760px;
}

.inline-search-settings-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.08),
    0 3px 10px rgba(15, 23, 42, 0.04);
  padding: 20px 22px 18px;
}

.inline-search-settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.inline-search-settings-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 4px;
}

.inline-search-settings-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.inline-search-settings-close {
  color: #64748b !important;
}

.inline-search-settings-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.inline-search-scope-pill {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 170px;
  max-width: 220px;
  min-height: 0;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
  text-align: left;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.inline-search-scope-pill:hover {
  border-color: #cbd5e1;
  background: #ffffff;
}

.inline-search-scope-pill--active {
  border-color: #0a2540;
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px rgba(10, 37, 64, 0.08);
}

.inline-search-scope-pill-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.inline-search-scope-pill-copy {
  font-size: 12px;
  line-height: 1.4;
  color: #64748b;
}

.inline-search-settings-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.inline-search-settings-summary-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.inline-search-settings-summary-value {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.inline-search-settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 14px;
}

.inline-search-settings-grid--single {
  grid-template-columns: 1fr;
  margin-top: 12px;
}

.inline-search-settings-block {
  min-width: 0;
  margin-bottom: 16px;
}

.inline-search-settings-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.inline-search-settings-footer {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  padding-top: 14px;
  border-top: 1px solid #edf2f7;
}

.inline-search-settings-hint {
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

.inline-search-field-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 0;
}

.inline-search-field-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #d8e4f0;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.inline-search-field-chip:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.inline-search-field-chip--active {
  border-color: #0a2540;
  background: #eaf1f8;
  color: #0a2540;
}

.search-field-operator-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.search-field-operator-btn {
  min-width: 56px !important;
  border-radius: 999px !important;
  color: #475569 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
  text-transform: none !important;
}

.search-field-operator-btn--active {
  background: #0a2540 !important;
  color: #ffffff !important;
}

@media (max-width: 840px) {
  .inline-search-scope-pill {
    min-width: calc(50% - 8px);
    max-width: none;
  }

  .inline-search-settings-grid {
    grid-template-columns: 1fr;
  }
}

/* Advanced Filters Panel - Compact */
.advanced-filters-panel-compact {
  margin-bottom: 16px;
}

.filters-card-compact {
  border-radius: 8px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
}

.filters-card-compact :deep(.v-card-text) {
  padding: 16px !important;
  background: #ffffff !important;
}

.filters-header-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.filters-header-compact .text-subtitle-1 {
  color: #1e293b;
  font-weight: 600;
  font-size: 14px;
}

.filters-header-compact .v-icon {
  color: #64748b !important;
  opacity: 0.8;
}

.filters-header-compact .v-chip {
  font-weight: 500;
}

/* Modern Search Bar - Light gray, less rounded, smaller */
.modern-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  max-width: 400px;
  width: 100%;
  background: #e8eaed;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  transition: all 0.2s ease;
}

.modern-search-wrapper:hover {
  background: #dadce0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.modern-search-wrapper:focus-within {
  background: #e8eaed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.modern-search-icon {
  margin-right: 10px;
  opacity: 0.55;
  flex-shrink: 0;
  pointer-events: none;
  font-size: 20px !important;
}

.modern-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #202124;
  padding: 2px 0;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 300 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  color: rgb(66, 84, 102) !important;
}

.modern-search-input::placeholder {
  color: #9aa0a6;
}

.modern-search-clear {
  margin-left: 10px;
  opacity: 0.6;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
  font-size: 15px !important;
  line-height: 26px !important;
}

.modern-search-clear:hover {
  opacity: 1;
}

.advanced-filters-btn {
  white-space: nowrap;
  flex-shrink: 0;
}

.advanced-filters-btn-improved {
  white-space: nowrap;
  flex-shrink: 0;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2) !important;
  transition: all 0.2s ease !important;
  font-weight: 500 !important;
}

.advanced-filters-btn-improved:hover {
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%) !important;
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.3) !important;
  transform: translateY(-1px) !important;
}

.advanced-filters-btn-improved:active {
  transform: translateY(0) !important;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2) !important;
}

.advanced-filters-text-btn {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  color: #64748b !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  min-width: auto !important;
  height: 36px !important;
  transition: all 0.2s ease !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.advanced-filters-text-btn:hover {
  background: #f1f5f9 !important;
  color: #475569 !important;
  transform: translateY(-1px);
}

.advanced-filters-text-btn:active {
  background: #e2e8f0 !important;
  transform: translateY(0) !important;
}

.advanced-filters-text-btn :deep(.v-icon) {
  color: inherit !important;
  font-size: 18px !important;
  margin-right: 6px !important;
}

/* Modern filter inputs - matching search document style */
.filter-input-modern :deep(.v-field) {
  background: #f1f5f9 !important;
  border: none !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

.filter-input-modern :deep(.v-field--focused) {
  background: #e2e8f0 !important;
  box-shadow: none !important;
}

.filter-input-modern :deep(.v-field__input) {
  color: #1e293b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.filter-input-modern :deep(.v-field__prepend-inner) {
  color: #64748b !important;
}

.filter-input-modern :deep(.v-field--focused .v-field__prepend-inner) {
  color: #475569 !important;
}

.filter-input-modern :deep(.v-field__outline) {
  border: none !important;
}

.filter-input-modern :deep(.v-field--variant-outlined .v-field__outline__start),
.filter-input-modern :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.filter-input-modern :deep(.v-field--variant-outlined .v-field__outline__notch::after),
.filter-input-modern :deep(.v-field--variant-outlined .v-field__outline__end) {
  border: none !important;
}

/* Enhanced Search Fields Select Styling */
.search-fields-select :deep(.v-field__input) {
  min-height: 44px !important;
  padding: 8px 12px !important;
}

.search-fields-select :deep(.v-chip) {
  height: 28px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  margin: 2px 4px 2px 0 !important;
}

.search-fields-select :deep(.v-field--variant-outlined) {
  border: 1px solid #e2e8f0 !important;
}

.search-fields-select :deep(.v-field--focused) {
  border-color: #1976d2 !important;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1) !important;
}

.search-fields-select :deep(.v-list-item) {
  min-height: 48px !important;
  padding: 8px 16px !important;
}

.search-fields-select :deep(.v-list-item:hover) {
  background: #f8fafc !important;
}

.search-fields-select :deep(.v-list-item--active) {
  background: #e3f2fd !important;
}

/* Documents Container Card - Combined search and documents */
.documents-container-card {
  border-radius: 16px !important;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.12),
    0 10px 20px rgba(0, 0, 0, 0.1),
    0 5px 10px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(209, 213, 219, 0.8) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Document Expansion Panels - Gray with 3D effect */
.documents-container-card :deep(.v-expansion-panel) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f1f3f5 100%) !important;
  border-radius: 12px !important;
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.06),
    inset 0 2px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(209, 213, 219, 0.7) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  margin-bottom: 12px !important;
  position: relative;
  overflow: hidden;
}

.documents-container-card :deep(.v-expansion-panel::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.documents-container-card :deep(.v-expansion-panel:hover) {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #f1f3f5 100%) !important;
  box-shadow: 
    0 12px 24px rgba(0, 0, 0, 0.14),
    0 6px 12px rgba(0, 0, 0, 0.1),
    0 3px 6px rgba(0, 0, 0, 0.08),
    inset 0 2px 0 rgba(255, 255, 255, 1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-2px);
  border-color: rgba(209, 213, 219, 0.9) !important;
}

.documents-container-card :deep(.v-expansion-panel:hover::before) {
  opacity: 1;
}

.documents-container-card :deep(.v-expansion-panel--active) {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  box-shadow: 
    0 16px 32px rgba(0, 0, 0, 0.16),
    0 8px 16px rgba(0, 0, 0, 0.12),
    0 4px 8px rgba(0, 0, 0, 0.1),
    inset 0 2px 0 rgba(255, 255, 255, 1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
  border-color: rgba(209, 213, 219, 1) !important;
}

.documents-container-card :deep(.v-expansion-panel-title) {
  background: transparent !important;
  padding: 16px 20px !important;
  border-radius: 12px !important;
}

.documents-container-card :deep(.v-expansion-panel-text) {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  padding: 20px !important;
  border-top: 1px solid rgba(209, 213, 219, 0.5) !important;
}

/* Synonyms and Stopwords Container Cards - Same style as CollectionsView */
.synonyms-container-card,
.stopwords-container-card {
  overflow: hidden;
  border-radius: 8px !important;
  background: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid #e2e8f0 !important;
  transition: all 0.2s ease !important;
  position: relative;
  width: 100%;
}

.synonyms-container-card:hover,
.stopwords-container-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
  transform: translateY(-1px);
}

/* Synonyms and Stopwords Expansion Panels - Same 3D gray style as documents */
/* Document Cards - Clickable Cards */
.documents-cards-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 100%;
  padding: 0;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

.document-card-clickable {
  transition: all 0.2s ease;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
  pointer-events: auto !important;
}


.collection-maybe-shell {
  margin: 14px 0;
}

.collection-maybe-card {
  background: #ffffff;
  border: 1px solid #dadce0;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(60, 64, 67, 0.08);
  padding: 16px;
}

.collection-maybe-shell-inline {
  margin: 8px 0 0;
}

.collection-maybe-card-inline {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
}

.collection-maybe-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.collection-maybe-header-inline {
  gap: 10px;
  margin-bottom: 8px;
}

.collection-maybe-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.collection-maybe-title {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.collection-maybe-meta {
  color: #64748b;
  font-size: 13px;
}

.collection-maybe-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.collection-maybe-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  color: #0a2540;
  cursor: pointer;
  transition: all 0.18s ease;
  font: inherit;
}

.collection-maybe-chip:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  box-shadow: none;
  transform: none;
}

.collection-maybe-chip-text {
  font-size: 13px;
  font-weight: 500;
}

.collection-maybe-chip-score {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
}

.collection-maybe-caption {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.collection-search-empty {
  margin-top: 16px;
  padding: 18px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 32%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow:
    0 14px 30px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.collection-search-empty-hero {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.collection-search-empty-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #eaf3ff 0%, #dbeafe 100%);
  border: 1px solid rgba(4, 48, 97, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.collection-search-empty-copyblock {
  min-width: 220px;
  flex: 1 1 280px;
}

.collection-search-empty-title {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
}

.collection-search-empty-title span {
  color: #043061;
}

.collection-search-empty-copy {
  margin-top: 4px;
  color: #64748b;
  font-size: 0.92rem;
  line-height: 1.5;
}

.collection-search-empty-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  color: #1e3a8a;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.collection-maybe-shell-empty {
  margin-top: 16px;
}

.collection-maybe-card-empty {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
}

.collection-search-empty-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.collection-search-empty-tip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 720px) {
  .collection-search-empty {
    padding: 16px;
  }

  .collection-search-empty-hero {
    align-items: flex-start;
  }
}

.document-result-link {
  text-decoration: none;
  outline: none;
  border: none;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
}

.document-result-link-card {
  display: block;
  width: 100%;
  user-select: text;
  -webkit-user-select: text;
}

.document-title-route {
  display: block;
  margin: 0;
  padding: 0;
}

.document-result-link:focus,
.document-result-link:focus-visible,
.document-result-link:active,
.document-result-link:hover {
  text-decoration: none !important;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

.document-title-link {
  color: #1a0dab;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  line-height: 1.08;
  cursor: pointer;
  user-select: text;
  -webkit-user-select: text;
  outline: none;
  border: none;
  -webkit-tap-highlight-color: transparent;
}

.document-title-link:hover,
.document-result-link-card:hover .document-title-link,
.document-result-link-card:focus .document-title-link,
.document-result-link-card:focus-visible .document-title-link {
  text-decoration: underline;
}

.document-title-link:focus,
.document-title-link:focus-visible,
.document-title-link:active,
.document-meta-link:focus,
.document-meta-link:focus-visible,
.document-meta-link:active {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  -webkit-tap-highlight-color: transparent;
}

.document-meta-link {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  margin: 0 !important;
  margin-top: -10px !important;
  padding: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  line-height: 1;
  padding-right: 0 !important;
  outline: none;
  border: none;
  -webkit-tap-highlight-color: transparent;
  text-align: left;
  transform: none !important;
}

.document-result-item,
.document-result-item:hover,
.document-result-item:focus,
.document-result-item:focus-within,
.document-result-link,
.document-result-link:hover,
.document-result-link:focus,
.document-result-link:focus-visible,
.document-result-link:active,
.document-title-route,
.document-title-route:hover,
.document-title-route:focus,
.document-title-route:focus-visible,
.document-meta-link,
.document-meta-link:hover,
.document-meta-link:focus,
.document-meta-link:focus-visible {
  background: transparent !important;
  box-shadow: none !important;
}

.document-result-item::before,
.document-result-item::after,
.document-result-link::before,
.document-result-link::after {
  background: transparent !important;
  box-shadow: none !important;
}

.document-snippet {
  color: #000000;
  font-size: 14px;
  line-height: 1.42;
  margin: -14px 0 0 0;
  cursor: text;
  font-weight: normal !important;
  user-select: text;
  -webkit-user-select: text;
}

/* Disable ALL tooltips on document cards - be VERY aggressive */
.documents-cards-container,
.documents-cards-container *,
.documents-cards-container router-link,
.documents-cards-container router-link *,
.documents-cards-container a,
.documents-cards-container a *,
.documents-cards-container .document-card-clickable,
.documents-cards-container .document-card-clickable *,
.documents-cards-container .google-result-card,
.documents-cards-container .google-result-card *,
.documents-cards-container .google-result-content,
.documents-cards-container .google-result-content *,
.documents-cards-container .google-result-title,
.documents-cards-container .google-result-title *,
.documents-cards-container .google-result-snippet,
.documents-cards-container .google-result-snippet * {
  pointer-events: auto !important;
  /* Disable tooltip via CSS */
  title: none !important;
}

/* Hide ANY tooltip overlays - be EXTREMELY aggressive */
.documents-cards-container :deep(.v-tooltip),
.documents-cards-container :deep([role="tooltip"]),
.documents-cards-container :deep(.v-overlay__content),
.documents-cards-container :deep(.v-overlay__content[role="tooltip"]),
.documents-cards-container :deep(.v-overlay__scrim),
.documents-cards-container :deep([data-v-tooltip]),
.documents-cards-container :deep(.v-tooltip__content),
.documents-cards-container :deep(.v-tooltip__wrapper),
.documents-cards-container :deep(.v-overlay),
.documents-cards-container :deep([class*="tooltip"]),
.documents-cards-container :deep([class*="Tooltip"]),
.documents-cards-container :deep([id*="tooltip"]),
.documents-cards-container :deep([aria-describedby]),
body :deep(.v-tooltip),
body :deep([role="tooltip"]) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
  z-index: -9999 !important;
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* Prevent tooltip activation on ANY interaction */
.documents-cards-container router-link:hover,
.documents-cards-container router-link:focus,
.documents-cards-container router-link:active,
.documents-cards-container a:hover,
.documents-cards-container a:focus,
.documents-cards-container a:active,
.documents-cards-container .document-card-clickable:hover,
.documents-cards-container .document-card-clickable:focus,
.documents-cards-container .document-card-clickable:active {
  pointer-events: auto !important;
  outline: none !important;
  transform: none !important;
  box-shadow: none !important;
}

/* Disable tooltips on all elements with no-tooltip class */
.no-tooltip,
.no-tooltip *,
.no-tooltip-card,
.no-tooltip-card * {
  pointer-events: auto !important;
  title: none !important;
}

.no-tooltip[title],
.no-tooltip *[title],
.no-tooltip-card[title],
.no-tooltip-card *[title] {
  title: '' !important;
}

/* Completely disable Vuetify tooltips on document cards */
.documents-cards-container :deep(.v-card),
.documents-cards-container :deep(.v-card *),
.documents-cards-container :deep(router-link),
.documents-cards-container :deep(router-link *),
.documents-cards-container :deep(.v-card__title),
.documents-cards-container :deep(.v-card__text) {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

/* Force remove all tooltip-related attributes and styles */
.documents-cards-container :deep([data-v-tooltip]),
.documents-cards-container :deep([aria-describedby]),
.documents-cards-container :deep(.v-tooltip__wrapper),
.documents-cards-container :deep(.v-tooltip__activator) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Disable Vuetify's automatic tooltip behavior */
.documents-cards-container :deep(.v-card[title]),
.documents-cards-container :deep(.v-card[title] *) {
  title: '' !important;
}

.document-link,
.document-link * {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
}

/* Force remove title on document links */
.document-link[title],
.document-link *[title] {
  title: '' !important;
}

.document-card-selected {
  border: 2px solid #1976d2 !important;
  background: #f0f7ff !important;
}

.document-checkbox {
  flex-shrink: 0;
}

.bulk-actions-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
}

.document-card-clickable {
  background: transparent !important;
  border-radius: 0 !important;
  border: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  transition: none !important;
  margin-bottom: 0 !important;
  outline: none !important;
}

/* Removed old document-delete-btn styles - using document-delete-btn-subtle now */

.document-card-clickable:hover {
  background: transparent !important;
  border-color: transparent !important;
  border-bottom-color: transparent !important;
  box-shadow: none !important;
  transform: none !important;
  outline: none !important;
}

.document-card-clickable:focus,
.document-card-clickable:focus-visible {
  outline: none !important;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06) !important;
}

.document-card-clickable:active {
  transform: translateY(0);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
}

/* Document Cards - Individual table style (legacy) */
.document-card {
  background: #ffffff !important;
  border-radius: 12px !important;
  border: 1px solid rgba(209, 213, 219, 0.6) !important;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  margin-bottom: 12px !important;
}

.document-card :deep(.v-expansion-panel),
.synonyms-container-card :deep(.v-expansion-panel),
.stopwords-container-card :deep(.v-expansion-panel) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f1f3f5 100%) !important;
  border-radius: 12px !important;
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.06),
    inset 0 2px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(209, 213, 219, 0.7) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  margin-bottom: 12px !important;
  position: relative;
  overflow: hidden;
}

.synonyms-container-card :deep(.v-expansion-panel::before),
.stopwords-container-card :deep(.v-expansion-panel::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.document-card:hover,
.synonyms-container-card :deep(.v-expansion-panel:hover),
.stopwords-container-card :deep(.v-expansion-panel:hover) {
  background: linear-gradient(135deg, #ffffff 0%, #f1f3f5 100%) !important;
  box-shadow: 
    0 12px 24px rgba(0, 0, 0, 0.14),
    0 6px 12px rgba(0, 0, 0, 0.1),
    0 3px 6px rgba(0, 0, 0, 0.08),
    inset 0 2px 0 rgba(255, 255, 255, 1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05) !important;
  transform: translateY(-2px);
  border-color: rgba(209, 213, 219, 0.9) !important;
}

.synonyms-container-card :deep(.v-expansion-panel:hover::before),
.stopwords-container-card :deep(.v-expansion-panel:hover::before) {
  opacity: 1;
}

.document-card.v-expansion-panel--active,
.synonyms-container-card :deep(.v-expansion-panel--active),
.stopwords-container-card :deep(.v-expansion-panel--active) {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  box-shadow: 
    0 16px 32px rgba(0, 0, 0, 0.16),
    0 8px 16px rgba(0, 0, 0, 0.12),
    0 4px 8px rgba(0, 0, 0, 0.1),
    inset 0 2px 0 rgba(255, 255, 255, 1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
  border-color: rgba(209, 213, 219, 1) !important;
}

.document-card :deep(.v-expansion-panel-title),
.synonyms-container-card :deep(.v-expansion-panel-title),
.stopwords-container-card :deep(.v-expansion-panel-title) {
  background: transparent !important;
  padding: 16px 20px !important;
  border-radius: 12px !important;
}

.document-card :deep(.v-expansion-panel-text),
.synonyms-container-card :deep(.v-expansion-panel-text),
.stopwords-container-card :deep(.v-expansion-panel-text) {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  padding: 20px !important;
  border-top: 1px solid rgba(209, 213, 219, 0.5) !important;
}

/* Document Details Content */
.document-details-content {
  padding: 8px 0;
}

.document-details-content .content-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  max-height: 200px;
  overflow-y: auto;
}

/* Document Sort Select - Well positioned and styled */
.document-sort-select {
  min-width: 200px !important;
  width: 100%;
}

.document-sort-select :deep(.v-field) {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  height: 40px;
  min-height: 40px;
}

.document-sort-select :deep(.v-field:hover) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  border-color: #cbd5e1;
}

.document-sort-select :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(72, 138, 236, 0.15);
  border-color: #488aec;
}

.document-sort-select :deep(.v-field__input) {
  padding: 10px 12px;
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.document-sort-select :deep(.v-field__prepend-inner) {
  padding-right: 10px;
  color: #64748b;
}

.document-sort-select :deep(.v-field__label) {
  color: #64748b;
  font-size: 13px;
  top: 50%;
  transform: translateY(-50%);
}

.document-sort-select :deep(.v-field--focused .v-field__label),
.document-sort-select :deep(.v-field--active .v-field__label) {
  color: #488aec;
}

/* Responsive adjustments for document sort select */
@media (max-width: 960px) {
  .document-sort-select {
    min-width: 100% !important;
  }
}

/* Sort Select in Header - Clean and professional */
.sort-select-header {
  background: #ffffff !important;
  border-radius: 8px !important;
}

.sort-select-header :deep(.v-field) {
  background: #ffffff !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12) !important;
  transition: all 0.2s ease !important;
}

.sort-select-header :deep(.v-field:hover) {
  border-color: rgba(255, 255, 255, 0.6) !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18) !important;
}

.sort-select-header :deep(.v-field--focused) {
  border-color: rgba(255, 255, 255, 0.8) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22) !important;
}

.sort-select-header :deep(.v-field__input) {
  color: #0f172a !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  padding: 6px 12px !important;
  min-height: 38px !important;
}

.sort-select-header :deep(.v-field__prepend-inner) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-left: 12px !important;
}

.sort-select-header :deep(.v-field__label) {
  color: rgba(255, 255, 255, 0.95) !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  top: -6px !important;
  background: #0e2438 !important;
  padding: 0 6px !important;
  border-radius: 4px !important;
}

.sort-select-header :deep(.v-field--focused .v-field__label),
.sort-select-header :deep(.v-field--active .v-field__label) {
  color: rgba(255, 255, 255, 1) !important;
}

.sort-select-header :deep(.v-field__append-inner) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-right: 8px !important;
}

.sort-select-header :deep(.v-icon) {
  color: #64748b !important;
  opacity: 0.8 !important;
}

.sort-select-header :deep(.v-field--focused .v-icon) {
  color: #0e2438 !important;
  opacity: 1 !important;
}

/* Simple Collection Tabs - Clean white style */
.collection-tabs-container {
  background: transparent;
  padding: 0;
  margin-bottom: 16px;
}

.collection-tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.collection-tabs {
  flex: 1 1 auto;
  min-width: 0;
}

.collection-tabs :deep(.v-tabs-container) {
  background: transparent;
  padding: 0;
}

.collection-tabs :deep(.v-tabs-list) {
  background: transparent;
  gap: 0;
  padding-bottom: 0;
  border-bottom: none !important;
}

.collection-tab {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 300 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  color: #032548 !important;
  text-transform: none !important;
  padding: 12px 24px !important;
  min-height: auto !important;
  height: auto !important;
  border-radius: 6px !important;
  background: transparent !important;
  transition: all 0.2s ease !important;
  margin-right: 8px !important;
  border: none !important;
  margin-bottom: 0 !important;
}

.collection-tab:hover {
  background: rgba(3, 37, 72, 0.1) !important;
  color: #032548 !important;
}

.collection-tab.v-tab--selected {
  color: #ffffff !important;
  font-weight: 600 !important;
  background: #032548 !important;
  background-color: #032548 !important;
  border-bottom: none !important;
  border-radius: 6px !important;
  margin-bottom: 0 !important;
  outline: none !important;
  box-shadow: none !important;
}

.collection-tab:focus,
.collection-tab:focus-visible,
.collection-tab:active,
.collection-tab.v-btn--active,
.collection-tab.v-tab--selected:focus,
.collection-tab.v-tab--selected:focus-visible,
.collection-tab.v-tab--selected:active {
  outline: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

.collection-tab :deep(.v-btn__overlay),
.collection-tab :deep(.v-ripple__container),
.collection-tab :deep(.v-ripple__animation) {
  opacity: 0 !important;
  display: none !important;
}

.collection-tabs :deep(.v-slide-group__content) {
  gap: 0;
}

.collection-tabs :deep(.v-tabs-slider) {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  height: 0 !important;
  width: 0 !important;
}

.collection-tabs :deep(.v-slide-group__wrapper) {
  border-bottom: none !important;
}

.collection-tabs :deep(.v-slide-group__content) {
  border-bottom: none !important;
}

.collection-tabs :deep(.v-tabs-container) {
  border-bottom: none !important;
}

.collection-tabs :deep(.v-slide-group) {
  border-bottom: none !important;
}

.collection-results-toolbar {
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  position: static !important;
  top: auto !important;
  right: auto !important;
  left: auto !important;
  z-index: auto !important;
  inset: auto !important;
}

.collection-results-toolbar,
.collection-results-toolbar .google-toolbar-left,
.collection-results-toolbar .google-toolbar-center,
.collection-results-toolbar .google-toolbar-right,
.collection-results-toolbar .items-per-page-btn,
.collection-results-toolbar .collection-date-toolbar-btn,
.collection-results-toolbar .quick-sort-btn {
  position: static !important;
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-table-card {
  overflow: hidden;
}

.config-table-title {
  padding: 16px 20px 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

.config-key-cell {
  color: #475569;
  font-weight: 600;
}

.config-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  color: #0f172a;
  font-size: 13px;
}

.collection-tab :deep(.v-icon) {
  color: #032548 !important;
  margin-right: 8px !important;
  font-size: 15px !important;
  line-height: 26px !important;
}

.collection-tab.v-tab--selected :deep(.v-icon) {
  color: #ffffff !important;
}

.tab-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  font-weight: 400 !important;
  color: #032548 !important;
}

.collection-tab.v-tab--selected .tab-text {
  color: #ffffff !important;
  font-weight: 600 !important;
}

.tab-count {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #032548 !important;
  opacity: 0.8 !important;
  margin-left: 6px !important;
}

.collection-tab.v-tab--selected .tab-count {
  color: rgba(255, 255, 255, 0.92) !important;
  font-weight: 700 !important;
  opacity: 1 !important;
}

/* Full content display - prevent truncation */
.full-content {
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: 100% !important;
}

.full-content :deep(*) {
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
  overflow: visible !important;
  text-overflow: clip !important;
}

/* Ensure list items don't truncate content */
.documents-container-card :deep(.v-list-item-subtitle),
.synonyms-container-card :deep(.v-list-item-subtitle),
.stopwords-container-card :deep(.v-list-item-subtitle) {
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: 100% !important;
}

/* Professional Documents Table Styles */
.documents-table-card {
  border-radius: 12px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(209, 213, 219, 0.8) !important;
}

.collection-inline-form-card {
  overflow: visible !important;
  border-radius: 14px !important;
  background: #ffffff !important;
  box-shadow: none !important;
}

.collection-inline-form-body {
  padding: 18px 18px 10px !important;
}

.collection-inline-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
  gap: 12px;
}

.collection-inline-input :deep(.v-field) {
  background: #e9eef4 !important;
  border-radius: 10px !important;
  border: 0 !important;
  box-shadow: none !important;
}

.collection-inline-input :deep(.v-field:hover) {
  background: #e3eaf2 !important;
  border: 0 !important;
}

.collection-inline-input :deep(.v-field--focused) {
  background: #e3eaf2 !important;
  border: 0 !important;
  box-shadow: none !important;
}

.collection-inline-input :deep(.v-field__outline),
.collection-inline-input :deep(.v-field__overlay) {
  --v-field-border-opacity: 0 !important;
  opacity: 0 !important;
  box-shadow: none !important;
}

.collection-inline-input :deep(input:focus),
.collection-inline-input :deep(input:focus-visible),
.collection-inline-input :deep(.v-field:focus-within),
.collection-inline-input :deep(.v-field--variant-outlined),
.collection-inline-input :deep(.v-field--variant-outlined:hover),
.collection-inline-input :deep(.v-field--variant-outlined.v-field--focused) {
  outline: none !important;
  border: 0 !important;
  box-shadow: none !important;
}

.collection-inline-input :deep(.v-field__input) {
  color: #0f172a !important;
  font-size: 14px !important;
  min-height: 44px !important;
  padding-left: 12px !important;
  padding-right: 14px !important;
}

.collection-inline-input :deep(.v-field__prepend-inner) {
  color: #64748b !important;
  opacity: 1 !important;
  padding-inline-start: 14px !important;
  padding-inline-end: 10px !important;
}

.collection-inline-form-actions {
  padding: 10px 18px 18px !important;
  background: transparent !important;
  border-top: 0 !important;
  gap: 8px !important;
}

.collection-inline-submit-btn,
.collection-inline-cancel-btn {
  text-transform: none !important;
  box-shadow: none !important;
}

.collection-inline-cancel-btn--danger {
  background: linear-gradient(135deg, #7a2626 0%, #5a1717 50%, #451010 100%) !important;
  box-shadow:
    0 4px 8px rgba(122, 38, 38, 0.34),
    0 2px 4px rgba(90, 23, 23, 0.28),
    0 1px 2px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
}

.collection-inline-cancel-btn--danger:hover {
  background: linear-gradient(135deg, #8a2d2d 0%, #671b1b 50%, #531313 100%) !important;
}

.collection-inline-cancel-btn--danger:active {
  background: linear-gradient(135deg, #671b1b 0%, #531313 50%, #3f0d0d 100%) !important;
}

.documents-table {
  background: #ffffff !important;
}

.table-header-row {
  background: linear-gradient(135deg, #0e2438 0%, #1a365d 100%) !important;
}

.table-header-cell {
  color: #ffffff !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 16px 20px !important;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2) !important;
  white-space: nowrap !important;
}

.table-row {
  background: #ffffff !important;
  border-bottom: 1px solid #e5e7eb !important;
  transition: all 0.2s ease !important;
}

.table-row:hover {
  background: #f8f9fa !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
}

.table-row-expanded {
  background: #f1f5f9 !important;
  border-bottom: 2px solid #0e2438 !important;
}

.table-cell {
  padding: 16px 20px !important;
  vertical-align: middle !important;
}

.table-cell-id {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace !important;
}

/* Synonyms Table Styles */
.synonyms-table-card {
  border-radius: 12px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(209, 213, 219, 0.8) !important;
}

.synonyms-table {
  background: #ffffff !important;
  width: 100%;
}

.synonyms-table .table-header-row {
  background: #032548 !important;
}

.synonyms-table .table-header-cell {
  color: #ffffff !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 16px 20px !important;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2) !important;
  white-space: nowrap !important;
}

.synonyms-table th.table-header-cell,
.stopwords-table th.table-header-cell {
  background: #032548 !important;
  color: #ffffff !important;
}

.synonyms-table .table-row {
  background: #ffffff !important;
  border-bottom: 1px solid #e5e7eb !important;
  transition: all 0.2s ease !important;
}

.synonyms-table .table-row:hover {
  background: #f8f9fa !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
}

.synonyms-table .table-cell {
  padding: 16px 20px !important;
  vertical-align: middle !important;
}

.delete-synonym-btn,
.delete-stopword-btn {
  transition: all 0.2s ease !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 36px !important;
  height: 36px !important;
  margin: 0 !important;
  padding: 0 !important;
}

.delete-synonym-btn:hover,
.delete-stopword-btn:hover {
  transform: scale(1.1);
  background-color: rgba(239, 68, 68, 0.1) !important;
}

.delete-synonym-btn :deep(.v-btn__content),
.delete-stopword-btn :deep(.v-btn__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Synonyms and Stopwords Table Cards - Remove nested card styling */
.synonyms-table-card,
.stopwords-table-card {
  border-radius: 12px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(209, 213, 219, 0.8) !important;
  background: #ffffff !important;
  padding: 0 !important;
}

.synonyms-table-card :deep(.v-card),
.stopwords-table-card :deep(.v-card) {
  box-shadow: none !important;
  border: none !important;
  background: transparent !important;
}

.document-id-text {
  background: #f1f5f9 !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #0e2438 !important;
  border: 1px solid #e2e8f0 !important;
}

.document-title-text {
  font-weight: 600 !important;
  color: #1f2937 !important;
  font-size: 14px !important;
}

.document-title-modern {
  color: #1e293b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  margin: 0 !important;
  cursor: pointer !important;
  text-decoration: none !important;
  transition: color 0.2s ease !important;
}

.document-title-modern:hover {
  color: #1976d2 !important;
}

.document-content-preview {
  color: #94a3b8 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  line-height: 1.6 !important;
}

.content-field-label {
  font-weight: 600 !important;
  color: #64748b !important;
  font-size: 13px !important;
  margin-right: 6px !important;
}

.document-date {
  font-size: 12px !important;
  color: #1e293b !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
}

.document-delete-btn-subtle {
  opacity: 0.4;
  min-width: 24px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 0;
}

.document-delete-btn-subtle i {
  font-size: 14px;
  color: #64748b;
}

.document-delete-btn-subtle:hover {
  opacity: 0.8;
  background: rgba(239, 68, 68, 0.1);
}

.document-delete-btn-subtle:hover i {
  color: #ef4444;
}

.document-card-clickable:hover .document-delete-btn-subtle {
  opacity: 0.6;
}

.document-id-subtle {
  font-size: 12px !important;
  color: #94a3b8 !important;
  font-family: 'Courier New', monospace !important;
  background: transparent !important;
  padding: 0 !important;
  border: none !important;
  font-weight: 400 !important;
}

.content-preview {
  color: #4b5563 !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  max-width: 400px !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
}

.table-cell-content {
  max-width: 400px !important;
}

.score-chip {
  font-size: 11px !important;
  padding: 2px 8px !important;
  min-width: auto !important;
  justify-content: center !important;
  border-radius: 12px !important;
}

.highlights-container {
  max-width: 300px !important;
}

.highlight-item {
  margin-bottom: 6px !important;
  font-size: 12px !important;
}

.highlight-field {
  font-weight: 700 !important;
  color: #0e2438 !important;
  margin-right: 6px !important;
  text-transform: uppercase !important;
  font-size: 11px !important;
  letter-spacing: 0.5px !important;
}

.highlight-text {
  color: #000000 !important;
  line-height: 1.5 !important;
}

.highlight-text :deep(mark),
.highlight-text :deep(strong) {
  background: #fef3c7 !important;
  color: #000000 !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-weight: 400 !important;
}

/* Clean highlight styles for content preview */
.text-body-2 :deep(strong) {
  background: #fef3c7 !important;
  color: #000000 !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-weight: 400 !important;
}

.text-caption :deep(strong) {
  background: #fef3c7 !important;
  color: #000000 !important;
  padding: 1px 3px !important;
  border-radius: 2px !important;
  font-weight: 400 !important;
}

.action-btn {
  transition: all 0.2s ease !important;
}

.action-btn:hover {
  background: rgba(14, 36, 56, 0.1) !important;
  transform: scale(1.1) !important;
}

/* Expanded Row Details */
.table-row-expanded-details {
  background: #f8f9fa !important;
  border-top: 2px solid #0e2438 !important;
}

.expanded-details-cell {
  padding: 24px !important;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
}

.expanded-details-content {
  max-width: 100% !important;
}

.expanded-section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  color: #0e2438;
  font-size: 16px;
}

.document-fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.document-field-item {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.document-field-item:hover {
  border-color: #0e2438;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.field-label {
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #0e2438;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 2px solid #e5e7eb;
}

.field-value {
  color: #1f2937;
  font-size: 13px;
  line-height: 1.6;
  word-wrap: break-word;
  word-break: break-word;
}

/* Pagination Styles */
.table-pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 0;
  background: transparent;
  border-top: none;
  border-radius: 0;
}

.pagination-info {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.items-per-page-select {
  min-width: 100px !important;
  max-width: 120px !important;
}

.items-per-page-select :deep(.v-field) {
  background: #ffffff !important;
  border-color: #e5e7eb !important;
  border-radius: 8px !important;
  font-size: 13px !important;
}

.items-per-page-select :deep(.v-field:hover) {
  border-color: #0e2438 !important;
}

.items-per-page-select :deep(.v-field--focused) {
  border-color: #0e2438 !important;
  box-shadow: 0 0 0 2px rgba(14, 36, 56, 0.1) !important;
}

.table-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.table-pagination :deep(.v-pagination__list) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-pagination :deep(.v-btn) {
  min-width: 28px !important;
  height: 28px !important;
  border-radius: 0 !important;
  color: #111827 !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  transition: color 0.18s ease !important;
}

.table-pagination :deep(.v-btn:hover) {
  color: #000000 !important;
  background: transparent !important;
  transform: none !important;
}

.table-pagination :deep(.v-btn--active) {
  background: transparent !important;
  color: #111827 !important;
  font-weight: 800 !important;
  border: none !important;
  box-shadow: none !important;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.table-pagination :deep(.v-btn--disabled) {
  opacity: 0.45 !important;
  cursor: not-allowed !important;
  background: transparent !important;
  color: #94a3b8 !important;
  border: none !important;
  box-shadow: none !important;
}

.table-pagination :deep(.v-pagination__prev),
.table-pagination :deep(.v-pagination__next) {
  min-width: 28px !important;
  height: 28px !important;
  border-radius: 0 !important;
  color: #0f172a !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  transition: color 0.18s ease !important;
}

.table-pagination :deep(.v-pagination__prev:hover:not(.v-btn--disabled)),
.table-pagination :deep(.v-pagination__next:hover:not(.v-btn--disabled)) {
  color: #000000 !important;
  background: transparent !important;
  transform: none !important;
}

.table-pagination :deep(.v-pagination__prev .v-icon),
.table-pagination :deep(.v-pagination__next .v-icon) {
  color: #0f172a !important;
  font-size: 18px !important;
  font-weight: 700 !important;
}

.table-pagination :deep(.v-btn__content) {
  color: inherit !important;
  font-weight: inherit !important;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .content-preview {
    max-width: 250px !important;
  }
  
  .table-cell-content {
    max-width: 250px !important;
  }
  
  .highlights-container {
    max-width: 200px !important;
  }
}

@media (max-width: 960px) {
  .documents-table {
    font-size: 12px !important;
  }
  
  .table-cell {
    padding: 12px 16px !important;
  }
  
  .document-fields-grid {
    grid-template-columns: 1fr !important;
  }
  
  .table-pagination-wrapper {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .pagination-controls {
    justify-content: space-between;
    width: 100%;
  }
  
  .pagination-info {
    text-align: center;
  }
}

@media (max-width: 600px) {
  .table-pagination :deep(.v-pagination__list) {
    gap: 4px;
  }
  
  .table-pagination :deep(.v-btn) {
    min-width: 32px !important;
    height: 32px !important;
    font-size: 12px !important;
  }

  .table-pagination {
    gap: 4px;
    padding: 4px 6px;
  }
  
  .items-per-page-select {
    min-width: 80px !important;
    max-width: 100px !important;
  }
}

/* Floating Action Bar - Modern and Clean */
.floating-action-bar {
  position: fixed;
  top: 80px;
  right: 24px;
  display: flex;
  gap: 8px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  padding: 8px;
  border-radius: 12px;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-action-bar:hover {
  box-shadow: 
    0 6px 20px rgba(0, 0, 0, 0.12),
    0 3px 10px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Collections Header - Same style as CollectionsView */
.collections-header {
  margin-top: 0 !important;
  margin-bottom: 24px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  visibility: visible !important;
  opacity: 1 !important;
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
  font-weight: 600 !important;
  line-height: 1.2 !important;
  color: #000000 !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.collections-label {
  color: #000000 !important;
}

.collection-dir-icon {
  color: #1976d2 !important;
  margin-right: 2px;
  vertical-align: middle;
}

.collections-title-text {
  display: flex;
  align-items: center;
  gap: 2px;
}

.collection-name-label {
  color: #000000 !important;
  font-weight: 700 !important;
}

.collections-header-actions {
  display: flex !important;
  gap: 12px !important;
  align-items: center !important;
  margin-left: auto !important;
}

@media (max-width: 760px) {
  .collections-header {
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    gap: 12px !important;
    margin-bottom: 16px !important;
  }

  .collections-title-section {
    width: 100%;
    min-width: 0;
    justify-content: flex-start;
    align-items: center;
    text-align: left;
    order: 1;
  }

  .collections-title-text {
    min-width: 0;
    word-break: break-word;
    justify-content: flex-start;
    text-align: left;
    width: 100%;
    margin-bottom: 0 !important;
    font-size: 20px !important;
    gap: 8px !important;
  }

  .collections-header-actions {
    width: 100%;
    max-width: none;
    margin-left: 0 !important;
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: flex-start !important;
    align-items: center !important;
    gap: 4px 14px !important;
    order: 2;
  }

  .collections-header-actions > * {
    flex: 0 0 auto !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
  }

  .collection-name-label {
    display: inline-block;
    min-width: 0;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .collections-header-actions .collections-action-btn,
  .collections-header-actions .collections-action-btn.v-btn,
  .collections-header-actions .collections-action-btn.v-btn--variant-flat,
  .collections-header-actions .collections-action-btn.v-btn--size-small,
  .collections-header-actions .collections-action-btn.v-btn--variant-flat.v-btn--size-small,
  .collections-header-actions .add-document-header-btn,
  .collections-header-actions .schema-header-btn,
  .collections-header-actions .delete-header-btn {
    width: auto !important;
    min-width: 96px !important;
    max-width: none !important;
    height: 32px !important;
    min-height: 32px !important;
    padding: 0 10px !important;
    border-radius: 999px !important;
    background: linear-gradient(135deg, #043061 0%, #032a4f 100%) !important;
    background-color: #043061 !important;
    box-shadow: 0 6px 14px rgba(4, 48, 97, 0.18) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
    justify-content: center !important;
    transform: none !important;
  }

  .collections-header-actions .delete-header-btn,
  .collections-header-actions .delete-header-btn.v-btn,
  .collections-header-actions .delete-header-btn.v-btn--variant-flat {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
    background-color: #dc2626 !important;
    box-shadow: 0 6px 14px rgba(220, 38, 38, 0.18) !important;
    color: #ffffff !important;
  }

  .collections-header-actions .collections-action-btn::before,
  .collections-header-actions .add-document-header-btn::before,
  .collections-header-actions .schema-header-btn::before,
  .collections-header-actions .delete-header-btn::before {
    display: none !important;
  }

  .collections-header-actions .collections-action-btn :deep(.v-btn__overlay),
  .collections-header-actions .collections-action-btn :deep(.v-btn__underlay),
  .collections-header-actions .add-document-header-btn :deep(.v-btn__overlay),
  .collections-header-actions .schema-header-btn :deep(.v-btn__overlay),
  .collections-header-actions .delete-header-btn :deep(.v-btn__overlay) {
    display: none !important;
    opacity: 0 !important;
  }

  .collections-header-actions .collections-action-btn :deep(.v-btn__content),
  .collections-header-actions .add-document-header-btn :deep(.v-btn__content),
  .collections-header-actions .schema-header-btn :deep(.v-btn__content),
  .collections-header-actions .delete-header-btn :deep(.v-btn__content) {
    display: inline-flex !important;
    width: auto !important;
    height: 100% !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 6px !important;
    font-size: 12px !important;
    line-height: 1 !important;
    text-indent: 0 !important;
    text-align: center !important;
    padding: 0 !important;
    color: inherit !important;
    white-space: nowrap !important;
  }

  .collections-header-actions .collections-action-btn :deep(.v-btn__prepend),
  .collections-header-actions .collections-action-btn :deep(.v-btn__prepend-inner),
  .collections-header-actions .add-document-header-btn :deep(.v-btn__prepend),
  .collections-header-actions .add-document-header-btn :deep(.v-btn__prepend-inner),
  .collections-header-actions .schema-header-btn :deep(.v-btn__prepend),
  .collections-header-actions .schema-header-btn :deep(.v-btn__prepend-inner),
  .collections-header-actions .delete-header-btn :deep(.v-btn__prepend),
  .collections-header-actions .delete-header-btn :deep(.v-btn__prepend-inner) {
    width: auto !important;
    height: 100% !important;
    margin: 0 !important;
    justify-content: center !important;
    align-items: center !important;
    min-width: 0 !important;
  }

  .collections-header-actions .collections-action-btn :deep(.v-btn__prepend .v-icon),
  .collections-header-actions .collections-action-btn :deep(.v-btn__prepend-inner .v-icon),
  .collections-header-actions .add-document-header-btn :deep(.v-btn__prepend .v-icon),
  .collections-header-actions .add-document-header-btn :deep(.v-btn__prepend-inner .v-icon),
  .collections-header-actions .schema-header-btn :deep(.v-btn__prepend .v-icon),
  .collections-header-actions .schema-header-btn :deep(.v-btn__prepend-inner .v-icon),
  .collections-header-actions .delete-header-btn :deep(.v-btn__prepend .v-icon),
  .collections-header-actions .delete-header-btn :deep(.v-btn__prepend-inner .v-icon) {
    margin: 0 !important;
    font-size: 15px !important;
    color: inherit !important;
  }

  .collections-header-actions .collections-action-btn :deep(.v-btn__content > span:last-child),
  .collections-header-actions .add-document-header-btn :deep(.v-btn__content > span:last-child),
  .collections-header-actions .schema-header-btn :deep(.v-btn__content > span:last-child),
  .collections-header-actions .delete-header-btn :deep(.v-btn__content > span:last-child) {
    text-align: left !important;
    font-weight: 700 !important;
    color: inherit !important;
  }

  .collections-header-actions .collections-action-btn:hover,
  .collections-header-actions .collections-action-btn:active,
  .collections-header-actions .add-document-header-btn:hover,
  .collections-header-actions .schema-header-btn:hover,
  .collections-header-actions .delete-header-btn:hover,
  .collections-header-actions .add-document-header-btn:active,
  .collections-header-actions .schema-header-btn:active,
  .collections-header-actions .delete-header-btn:active {
    transform: none !important;
    box-shadow: inherit !important;
    background: inherit !important;
    color: inherit !important;
  }

  .collection-tabs-container {
    margin-bottom: 18px;
  }

  .collection-tabs-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .collection-search-help-link--tabs {
    align-self: flex-end;
    min-height: 36px;
    margin-right: 0;
    top: 0;
  }

  .collection-tabs :deep(.v-slide-group__content) {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    width: 100% !important;
    gap: 8px !important;
  }

  .collection-tab {
    width: 100% !important;
    min-width: 0 !important;
    margin-right: 0 !important;
    padding: 10px 6px !important;
    min-height: 54px !important;
    border-radius: 12px !important;
    justify-content: center !important;
  }

  .collection-tab :deep(.v-btn__content) {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 3px !important;
    min-width: 0 !important;
    text-align: center !important;
  }

  .collection-tab .mr-2 {
    margin-right: 0 !important;
  }

  .collection-tab .tab-text {
    display: block;
    width: 100%;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    font-weight: 700;
  }

  .collection-tab .tab-count {
    display: none !important;
  }

  .collection-tab :deep(.v-icon) {
    font-size: 16px !important;
  }

  .collection-search-usage-grid {
    grid-template-columns: 1fr;
  }
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

/* Blue action buttons - Same style as CollectionsView */
.action-btn-blue {
  border-radius: 6px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  height: 36px !important;
  padding: 8px 16px !important;
  text-transform: none !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
  background: #1976d2 !important;
  border: none !important;
  letter-spacing: normal !important;
  color: #ffffff !important;
}

.action-btn-blue:hover {
  background: #1565c0 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) !important;
  color: #ffffff !important;
}

.action-btn-blue,
.action-btn-blue *,
.action-btn-blue .v-btn__content,
.action-btn-blue .v-btn__content *,
.action-btn-blue span,
.action-btn-blue .v-icon {
  color: #ffffff !important;
}

.action-btn-blue .v-btn__overlay {
  display: none !important;
}

.action-btn-blue::before {
  display: none !important;
}

/* Collections action buttons - base shared layout */
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

.collections-action-btn:active {
  background: linear-gradient(135deg, #032a4f 0%, #021d3a 50%, #011528 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow:
    0 2px 4px rgba(4, 48, 97, 0.4),
    0 1px 2px rgba(4, 48, 97, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
  color: #ffffff !important;
}

.collections-action-btn:active::before {
  opacity: 0.5 !important;
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

.collections-action-btn :deep(.v-icon),
.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__append) {
  display: none !important;
}

/* Allow prepend icons for Add Document, Schema, Add Synonym, Add Stopword, and Delete buttons */
.add-document-header-btn :deep(.v-btn__prepend),
.add-document-header-btn :deep(.v-btn__prepend-inner),
.schema-header-btn :deep(.v-btn__prepend),
.schema-header-btn :deep(.v-btn__prepend-inner),
.add-synonym-btn :deep(.v-btn__prepend),
.add-synonym-btn :deep(.v-btn__prepend-inner),
.add-stopword-btn :deep(.v-btn__prepend),
.add-stopword-btn :deep(.v-btn__prepend-inner),
.delete-header-btn :deep(.v-btn__prepend),
.delete-header-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

.add-document-header-btn :deep(.v-btn__prepend .v-icon),
.add-document-header-btn :deep(.v-btn__prepend-inner .v-icon),
.schema-header-btn :deep(.v-btn__prepend .v-icon),
.schema-header-btn :deep(.v-btn__prepend-inner .v-icon),
.add-synonym-btn :deep(.v-btn__prepend .v-icon),
.add-synonym-btn :deep(.v-btn__prepend-inner .v-icon),
.add-stopword-btn :deep(.v-btn__prepend .v-icon),
.add-stopword-btn :deep(.v-btn__prepend-inner .v-icon),
.delete-header-btn :deep(.v-btn__prepend .v-icon),
.delete-header-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 6px !important;
}

.add-document-header-btn:hover :deep(.v-btn__content) {
  text-decoration: underline !important;
}

/* Delete button in header - same style as Schema but red with 3D effect */
.delete-header-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
  background-color: #dc2626 !important;
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

.delete-header-btn :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
  display: none !important;
  visibility: hidden !important;
}

.delete-header-btn:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%) !important;
  box-shadow: 
    0 4px 8px rgba(220, 38, 38, 0.4),
    0 2px 4px rgba(220, 38, 38, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
}

.delete-header-btn:hover :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
  display: none !important;
  visibility: hidden !important;
}

.delete-header-btn:active {
  background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #6b1a1a 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow: 
    0 2px 4px rgba(220, 38, 38, 0.4),
    0 1px 2px rgba(220, 38, 38, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.delete-header-btn:active :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
  display: none !important;
  visibility: hidden !important;
}

.delete-header-btn:focus {
  box-shadow: none !important;
  outline: none !important;
}

.delete-header-btn:focus :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
  display: none !important;
  visibility: hidden !important;
}

.delete-header-btn:focus-visible {
  box-shadow: none !important;
  outline: none !important;
}

.delete-header-btn:focus-visible :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
  display: none !important;
  visibility: hidden !important;
}

.delete-header-btn:focus-within {
  box-shadow: none !important;
  outline: none !important;
}

.delete-header-btn:focus-within :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
  display: none !important;
  visibility: hidden !important;
}

.delete-header-btn :deep(.v-ripple__container),
.delete-header-btn :deep(.v-ripple__animation),
.delete-header-btn :deep(.v-ripple__animation--enter),
.delete-header-btn :deep(.v-ripple__animation--in) {
  display: none !important;
  opacity: 0 !important;
  background: transparent !important;
  visibility: hidden !important;
}

/* Remove any blue color from button in all states */
.delete-header-btn,
.delete-header-btn:hover,
.delete-header-btn:active,
.delete-header-btn:focus,
.delete-header-btn:focus-visible,
.delete-header-btn:focus-within {
  color: #ffffff !important;
  background-color: #dc2626 !important;
}

.delete-header-btn :deep(.v-btn__content),
.delete-header-btn:hover :deep(.v-btn__content),
.delete-header-btn:active :deep(.v-btn__content),
.delete-header-btn:focus :deep(.v-btn__content) {
  color: #ffffff !important;
}

/* Force remove any blue background that might appear */
.delete-header-btn :deep(.v-btn__wrapper),
.delete-header-btn :deep(.v-btn__wrapper::before),
.delete-header-btn :deep(.v-btn__wrapper::after) {
  background: transparent !important;
  background-color: transparent !important;
}

/* Override collections-action-btn styles for delete button with 3D effect */
.collections-action-btn.delete-header-btn,
.collections-action-btn.delete-header-btn:hover,
.collections-action-btn.delete-header-btn:active,
.collections-action-btn.delete-header-btn:focus {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
  background-color: #dc2626 !important;
  /* Multi-layer 3D shadow effect - raised appearance */
  box-shadow: 
    0 4px 8px rgba(220, 38, 38, 0.4),
    0 2px 4px rgba(220, 38, 38, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
  outline: none !important;
}

.collections-action-btn.delete-header-btn:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%) !important;
  box-shadow: 
    0 4px 8px rgba(220, 38, 38, 0.4),
    0 2px 4px rgba(220, 38, 38, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
}

.collections-action-btn.delete-header-btn:active {
  background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #6b1a1a 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow: 
    0 2px 4px rgba(220, 38, 38, 0.4),
    0 1px 2px rgba(220, 38, 38, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.collections-action-btn.delete-header-btn :deep(.v-btn__overlay),
.collections-action-btn.delete-header-btn:hover :deep(.v-btn__overlay),
.collections-action-btn.delete-header-btn:active :deep(.v-btn__overlay),
.collections-action-btn.delete-header-btn:focus :deep(.v-btn__overlay),
.collections-action-btn.delete-header-btn:focus-visible :deep(.v-btn__overlay) {
  background: transparent !important;
  background-color: transparent !important;
  opacity: 0 !important;
  display: none !important;
  visibility: hidden !important;
}

/* Delete button in popup - same style as Schema button but red */
.delete-popup-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
  background-color: #dc2626 !important;
}

.delete-popup-btn :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}

.delete-popup-btn:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%) !important;
  box-shadow: 
    0 4px 8px rgba(220, 38, 38, 0.4),
    0 2px 4px rgba(220, 38, 38, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
}

.delete-popup-btn:hover :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}

.delete-popup-btn:active {
  background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #6b1a1a 100%) !important;
  box-shadow: 
    0 2px 4px rgba(220, 38, 38, 0.4),
    0 1px 2px rgba(220, 38, 38, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.delete-popup-btn:active :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}

.delete-popup-btn:focus :deep(.v-btn__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}

.collections-action-btn :deep(.v-btn__overlay) {
  display: none !important;
}

/* View Details Button */
.view-details-btn {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  margin-top: -4px;
}

.view-details-btn:hover {
  background: rgba(25, 118, 210, 0.08) !important;
}

/* Improved Search UI */
.search-card-title-modern {
  background: #f8fafc !important;
  border-bottom: 1px solid #e2e8f0 !important;
  border-radius: 8px 8px 0 0 !important;
  background: #f8fafc !important;
  border-bottom: 1px solid #e2e8f0 !important;
  border-radius: 16px 16px 0 0 !important;
}

.modern-search-wrapper-improved {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 250px;
  max-width: 400px;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  padding: 0 12px;
  transition: all 0.2s ease;
  box-shadow: none;
}

.modern-search-wrapper-improved:focus-within {
  background: #e2e8f0;
  box-shadow: none;
}

.modern-search-icon-improved {
  color: #64748b;
  margin-right: 8px;
  flex-shrink: 0;
  font-size: 14px;
  transition: all 0.2s ease;
}

.modern-search-wrapper-improved:focus-within .modern-search-icon-improved {
  color: #475569;
}

.modern-search-input-improved {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px;
  font-weight: 400;
  color: #1e293b;
  padding: 8px 0;
  min-width: 0;
}

.modern-search-input-improved::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.modern-search-clear-improved {
  color: #94a3b8;
  cursor: pointer;
  margin-left: 12px;
  flex-shrink: 0;
  transition: all 0.2s ease;
  font-size: 16px;
}

.modern-search-clear-improved:hover {
  color: #ef4444;
  transform: scale(1.1);
}

/* White Search Bar - No Borders - Más Blanco */
.search-section-simple {
  margin-bottom: 16px;
}

.modern-search-wrapper-dark {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 250px;
  max-width: 600px;
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px;
  padding: 0 12px;
  transition: all 0.2s ease;
  box-shadow: none !important;
}

.modern-search-wrapper-dark:focus-within {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  box-shadow: none !important;
}

/* Items Per Page - Google Style Dropdown - Sofisticado */
.items-per-page-google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  white-space: nowrap;
  height: 36px;
  min-width: 90px;
  position: relative;
}

.items-per-page-google-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.items-per-page-google-btn:active {
  background: #f1f5f9;
  transform: translateY(1px);
}

.items-per-page-label-google {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.items-per-page-value-google {
  font-size: 13px;
  color: #0f172a;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.items-per-page-arrow {
  color: #64748b !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 2px;
  font-size: 18px !important;
}

.items-per-page-google-btn:hover .items-per-page-arrow {
  color: #0f172a !important;
}

/* Show More Gear Button - Clean white style */
/* Gear Buttons Container */
.gear-buttons-container {
  display: flex;
  gap: 8px;
  align-items: center;
}

.gear-btn {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
  color: #64748b !important;
  min-width: 40px !important;
  width: 40px !important;
  height: 36px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.gear-btn:hover {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
  color: #0f172a !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
  transform: scale(1.05) !important;
}

.gear-btn:active {
  background: #f1f5f9 !important;
  transform: scale(0.98) !important;
}

.gear-btn.active {
  background: #e0f2fe !important;
  border-color: #1976d2 !important;
  color: #1976d2 !important;
}

.gear-btn.active:hover {
  background: #bae6fd !important;
  border-color: #1565c0 !important;
  color: #1565c0 !important;
}

.gear-btn :deep(.v-icon) {
  color: inherit !important;
}

/* Gear Menu Styles - Clean white with header */
.gear-menu {
  padding: 8px 0 !important;
  min-width: 240px !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08) !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
}

.gear-menu-header {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #64748b !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 8px 16px !important;
  margin-bottom: 4px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.gear-menu-item {
  padding: 10px 16px !important;
  min-height: 40px !important;
  cursor: pointer !important;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin: 0 4px !important;
  border-radius: 4px !important;
}

.gear-menu-item:hover {
  background: #f8fafc !important;
}

.gear-menu-item.active {
  background: #f1f5f9 !important;
}

.gear-menu-item :deep(.v-list-item-title) {
  font-size: 14px !important;
  font-weight: 400 !important;
  color: #0f172a !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.gear-menu-item.active :deep(.v-list-item-title) {
  font-weight: 600 !important;
}

.items-per-page-menu {
  padding: 8px 0 !important;
  min-width: 180px !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08) !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  margin-top: 4px !important;
}

.items-per-page-header {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #64748b !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 8px 16px !important;
  margin-bottom: 4px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.items-per-page-menu-item {
  padding: 10px 16px !important;
  min-height: 40px !important;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin: 0 4px !important;
  border-radius: 4px !important;
}

.items-per-page-menu-item:hover {
  background: #f8fafc !important;
}

.items-per-page-menu-item.active {
  background: #f1f5f9 !important;
}

.items-per-page-menu-item :deep(.v-list-item-title) {
  font-size: 13px !important;
  color: #0f172a !important;
  font-weight: 400 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  letter-spacing: 0.01em;
}

.items-per-page-menu-item.active :deep(.v-list-item-title) {
  font-weight: 600 !important;
  color: #0f172a !important;
}

.check-icon {
  color: #1976d3 !important;
  margin-left: 12px;
  font-size: 18px !important;
}

/* Google-style Search Section */
.google-search-section {
  margin-bottom: 0;
  max-width: 100%;
}

/* Modern Search Container */
.modern-search-container {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 20px;
}

.modern-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 600px;
  min-height: 40px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  padding: 0 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.modern-search-wrapper:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.modern-search-wrapper:focus-within {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.08), 0 4px 12px rgba(25, 118, 210, 0.15);
  transform: translateY(-1px);
}

.modern-search-icon {
  color: #64748b;
  font-size: 18px;
  margin-right: 10px;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.modern-search-wrapper:focus-within .modern-search-icon {
  color: #1976d2;
}

.modern-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 14px;
  font-weight: 400;
  color: #1e293b;
  padding: 8px 0;
  min-width: 0;
  line-height: 1.4;
}

.modern-search-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.modern-search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.modern-search-clear {
  color: #94a3b8;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  padding: 2px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modern-search-clear:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  transform: scale(1.1);
}

.modern-search-filter-btn {
  color: #64748b !important;
  transition: all 0.2s ease !important;
  border-radius: 8px !important;
}

.modern-search-filter-btn:hover {
  color: #1976d2 !important;
  background: rgba(25, 118, 210, 0.08) !important;
  transform: scale(1.05);
}

.modern-search-filter-btn.active {
  color: #1976d2 !important;
  background: rgba(25, 118, 210, 0.12) !important;
}

.google-search-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.google-search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 584px;
  height: 44px;
  border: 1px solid #dfe1e5;
  border-radius: 24px;
  background: #ffffff;
  padding: 0 16px;
  box-shadow: 0 2px 5px 1px rgba(64, 60, 67, 0.16);
  transition: all 0.2s ease;
}

.google-search-box:hover {
  box-shadow: 0 2px 8px 1px rgba(64, 60, 67, 0.28);
}

.google-search-box:focus-within {
  box-shadow: 0 2px 8px 1px rgba(64, 60, 67, 0.28);
  border-color: transparent;
}

.google-search-icon {
  color: #9aa0a6;
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.google-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: arial, sans-serif;
  font-size: 16px;
  color: #202124;
  padding: 0;
  min-width: 0;
}

.google-search-input::placeholder {
  color: #9aa0a6;
}

.google-search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.google-search-clear {
  color: #9aa0a6;
  cursor: pointer;
  font-size: 20px;
  transition: color 0.2s ease;
}

.google-search-clear:hover {
  color: #202124;
}

/* Advanced Search Toggle Button - Outside Search Bar */
.advanced-search-toggle-btn {
  border-radius: 8px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  transition: all 0.2s ease !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  color: #64748b !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}

.advanced-search-toggle-btn:hover {
  border-color: #cbd5e1 !important;
  background: #f8fafc !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  transform: translateY(-1px) !important;
}

.advanced-search-toggle-btn.active {
  border-color: #1976d2 !important;
  background: #e3f2fd !important;
  color: #1976d2 !important;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2) !important;
}

.advanced-search-toggle-btn.active:hover {
  background: #bbdefb !important;
  border-color: #1565c0 !important;
  color: #1565c0 !important;
}

.advanced-search-toggle-btn .v-icon {
  transition: transform 0.2s ease !important;
}

.advanced-search-toggle-btn.active .v-icon {
  transform: rotate(180deg) !important;
}

/* Google-style Toolbar */
.google-toolbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 8px 0;
  border-bottom: none !important;
  margin-bottom: 0;
  max-width: 100%;
  gap: 12px;
  background: #ffffff !important;
  background-color: #ffffff !important;
}

.google-toolbar-left {
  display: flex;
  align-items: center;
  justify-self: start;
}

.google-toolbar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
}

.google-results-count {
  font-family: arial, sans-serif;
  font-size: 14px;
  color: #70757a;
  line-height: 32px;
}

.google-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
}

.collection-toolbar-label--mobile {
  display: none;
}

@media (max-width: 760px) {
  .collection-results-toolbar {
    grid-template-columns: 1fr !important;
    align-items: stretch !important;
    gap: 12px !important;
  }

  .collection-results-toolbar .google-toolbar-left,
  .collection-results-toolbar .google-toolbar-center,
  .collection-results-toolbar .google-toolbar-right {
    width: 100%;
    justify-self: stretch !important;
    justify-content: flex-start !important;
  }

  .collection-results-toolbar .google-toolbar-center {
    display: none;
  }

  .collection-results-toolbar .google-toolbar-right {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    align-items: stretch;
    gap: 8px !important;
  }

  .collection-results-toolbar .google-toolbar-right > * {
    min-width: 0 !important;
  }

  .collection-results-toolbar .items-per-page-btn,
  .collection-results-toolbar .collection-date-toolbar-btn,
  .collection-results-toolbar .quick-sort-btn {
    width: 100%;
    min-width: 0 !important;
    min-height: 64px !important;
    height: 64px !important;
    padding: 8px 6px !important;
    border-radius: 14px !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
    gap: 4px !important;
  }

  .collection-results-toolbar .collection-toolbar-segment-btn :deep(.v-icon) {
    margin: 0 !important;
  }

  .collection-results-toolbar .collection-toolbar-label {
    display: block;
    width: 100%;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.15;
  }

  .collection-results-toolbar .collection-toolbar-label--desktop {
    display: none;
  }

  .collection-results-toolbar .collection-toolbar-label--mobile {
    display: block;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.01em;
  }

  .collection-results-toolbar .collection-date-trigger-clear {
    display: none !important;
  }
}

.google-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #f8f9fa;
  position: relative;
  border-radius: 4px;
  background: #ffffff;
  color: #5f6368;
  font-family: arial, sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
}

.google-toolbar-btn:hover {
  border-color: #dadce0;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  background: #f8f9fa;
}

.google-toolbar-btn.active {
  border-color: #1a73e8;
  color: #1a73e8;
  background: #ffffff;
}

.google-view-toggle {
  display: flex;
  border: 1px solid #dadce0;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  height: 40px;
}

.google-toggle-btn {
  border-radius: 0 !important;
  border: none !important;
  height: 100% !important;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px !important;
  cursor: pointer;
  transition: all 0.2s;
  background: #ffffff !important;
  color: #5f6368 !important;
}

.google-toggle-btn-right {
  border-left: 1px solid #dadce0 !important;
}

.google-view-toggle .google-toggle-btn:hover {
  background: #f8f9fa !important;
}

.google-view-toggle .google-toggle-btn.active {
  background: #ffffff !important;
  color: #1a73e8 !important;
  font-weight: 600;
}

.google-toolbar-btn :deep(.v-icon) {
  color: inherit;
  font-size: 18px;
}

/* Remove tooltip/ticket from items per page button */
.items-per-page-btn {
  position: relative;
  background: #ffffff !important;
  box-shadow: none !important;
}

.items-per-page-btn:hover,
.items-per-page-btn.active {
  background: #ffffff !important;
  border-color: #1a73e8 !important;
  color: #1a73e8 !important;
}

.items-per-page-btn[title]:hover::after,
.items-per-page-btn[title]:focus::after,
.items-per-page-btn[title]::after {
  display: none !important;
  content: none !important;
  visibility: hidden !important;
}

/* Remove any tooltip that Vuetify might add */
.items-per-page-btn :deep([role="tooltip"]),
.items-per-page-btn :deep(.v-tooltip),
.items-per-page-btn :deep(.v-overlay__content) {
  display: none !important;
  visibility: hidden !important;
}

/* Google-style Menu */
.google-menu {
  padding: 8px 0 !important;
  min-width: 200px !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 10px 1px rgba(64, 60, 67, 0.28) !important;
  border: 1px solid #dadce0 !important;
  background: #ffffff !important;
}

.google-menu :deep(.v-list-subheader) {
  font-family: arial, sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #5f6368;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 16px;
  margin-bottom: 4px;
}

.google-menu-item {
  padding: 10px 16px !important;
  min-height: 40px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin: 0 4px !important;
  border-radius: 4px !important;
}

.google-menu-item:hover {
  background: #f1f3f4 !important;
}

.google-menu-item.active {
  background: #e8f0fe !important;
}

.google-menu-item :deep(.v-list-item-title) {
  font-family: arial, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #202124;
}

.google-menu-item.active :deep(.v-list-item-title) {
  font-weight: 500;
  color: #1a73e8;
}

/* Hide check mark icon in menu items */
.google-menu-item :deep(.v-list-item__append) {
  display: none !important;
}

.google-menu-item :deep(.v-list-item__prepend) {
  display: none !important;
}

.google-menu-item :deep(.v-list-item__append > .v-icon) {
  display: none !important;
}

.google-menu-item :deep(.check-icon) {
  display: none !important;
}

.modern-search-icon-dark {
  color: #64748b;
  margin-right: 8px;
  flex-shrink: 0;
  font-size: 16px;
  transition: all 0.2s ease;
}

.modern-search-wrapper-dark:focus-within .modern-search-icon-dark {
  color: #1976d3;
}

.modern-search-input-dark {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  padding: 10px 0;
  min-width: 0;
}

.modern-search-input-dark::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.modern-search-clear-dark {
  color: #94a3b8;
  cursor: pointer;
  margin-left: 12px;
  flex-shrink: 0;
  transition: all 0.2s ease;
  font-size: 18px;
}

.modern-search-clear-dark:hover {
  color: #ef4444;
  transform: scale(1.1);
}

/* Results Header Top */
.results-header-top {
  display: flex;
  align-items: center;
  margin-top: 0;
}

/* Document Icon */
.document-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.document-card-clickable:hover .document-icon {
  opacity: 1;
  color: #1976d3 !important;
}

/* Remove blue outline/box on router-link hover and focus */
.documents-cards-container router-link,
.documents-cards-container a {
  text-decoration: none !important;
  outline: none !important;
  display: block !important;
  pointer-events: auto !important;
  box-shadow: none !important;
  border: none !important;
  pointer-events: auto !important;
  cursor: text !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

/* Remove focus/active outlines and borders on right-click */
.documents-cards-container :deep(router-link a:focus),
.documents-cards-container :deep(router-link a:active),
.documents-cards-container :deep(router-link a:focus-visible),
.documents-cards-container :deep(a:focus),
.documents-cards-container :deep(a:active),
.documents-cards-container :deep(a:focus-visible),
.documents-cards-container :deep(router-link:focus),
.documents-cards-container :deep(router-link:active),
.documents-cards-container :deep(router-link:focus-visible) {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  transform: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

/* Remove blue border from all link elements */
.documents-cards-container :deep(a),
.documents-cards-container :deep(router-link a) {
  outline: none !important;
  border: none !important;
  transform: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

/* Ensure router-link <a> tags can receive all browser events naturally */
.documents-cards-container :deep(router-link a),
.documents-cards-container :deep(a) {
  transform: none !important;
  transition: none !important;
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

/* Ensure all text in document cards is selectable */
.documents-cards-container * {
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

.documents-cards-container router-link {
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

.documents-cards-container router-link:hover,
.documents-cards-container router-link:focus,
.documents-cards-container router-link:focus-visible,
.documents-cards-container a:hover,
.documents-cards-container a:focus,
.documents-cards-container a:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
  background: transparent !important;
  cursor: text !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

.documents-cards-container router-link:hover .document-card-clickable,
.documents-cards-container router-link:focus .document-card-clickable,
.documents-cards-container router-link:focus-visible .document-card-clickable,
.documents-cards-container a:hover .document-card-clickable,
.documents-cards-container a:focus .document-card-clickable,
.documents-cards-container a:focus-visible .document-card-clickable {
  outline: none !important;
  border: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  cursor: text !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

/* Google-style v-card - no borders, no shadows, transparent background */
.documents-cards-container router-link .v-card,
.documents-cards-container router-link .v-card:hover,
.documents-cards-container router-link .v-card:focus,
.documents-cards-container a .v-card,
.documents-cards-container a .v-card:hover,
.documents-cards-container a .v-card:focus {
  outline: none !important;
  border: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  background: transparent !important;
  border-radius: 0 !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
}

.documents-cards-container router-link:hover .v-card,
.documents-cards-container a:hover .v-card {
  border: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

/* Move results more to top */
.documents-results-container {
  margin-top: 0;
  padding-top: 0 !important;
}

.documents-cards-container {
  margin-top: 0 !important;
  gap: 24px !important;
  padding: 0 !important;
}

/* Schema Dialog Styles */
.schema-dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
}

.schema-dialog-title {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: white !important;
}

.schema-section {
  margin-bottom: 24px;
}

.schema-section-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.schema-info-card {
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
}

.schema-info-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
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
  transition: all 0.2s ease;
}

.schema-field-card:hover {
  border-color: #cbd5e1 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.schema-field-number {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 700;
  font-size: 14px;
}

.schema-field-name {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.schema-field-type {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.schema-field-badges {
  display: flex;
  align-items: center;
  gap: 4px;
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

/* Quick Sort Buttons */
.quick-sort-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.quick-sort-btn {
  background: #ffffff !important;
  border: 1px solid #dadce0 !important;
  color: #5f6368 !important;
  font-weight: 500 !important;
  text-transform: none !important;
  height: 40px !important;
  padding: 8px 16px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  box-shadow: none !important;
}

.quick-sort-btn:hover {
  border-color: #dadce0 !important;
  box-shadow: none !important;
  background: #ffffff !important;
}

.quick-sort-btn.active {
  border-color: #1a73e8 !important;
  color: #1a73e8 !important;
  background: #ffffff !important;
}

.quick-sort-btn.active :deep(.v-icon) {
  color: #1a73e8 !important;
}

/* Sort Menu */
.sort-menu-list {
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
  border: 1px solid #e2e8f0 !important;
  padding: 8px 0 !important;
}

.sort-menu-item {
  padding: 10px 16px !important;
  min-height: 40px !important;
  cursor: pointer;
  transition: all 0.15s ease !important;
}

.sort-menu-item:hover {
  background: #f8fafc !important;
}

.sort-menu-item.active {
  background: #f1f5f9 !important;
}

.sort-menu-item :deep(.v-list-item-title) {
  font-size: 14px !important;
  font-weight: 400 !important;
  color: #0f172a !important;
}

.sort-menu-item.active :deep(.v-list-item-title) {
  font-weight: 600 !important;
}

/* Advanced Filters Panel */
.advanced-filters-panel {
  margin-top: 16px;
}

.filters-card {
  border-radius: 12px !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.filter-section-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 8px;
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
}

.filter-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #cbd5e1;
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.filter-hint .v-icon {
  margin-right: 6px;
  font-size: 16px;
}

.filter-hint-modern {
  font-size: 13px;
  color: #64748b;
  padding: 10px 14px;
  background: #f1f5f9;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  display: flex;
  align-items: center;
  line-height: 1.5;
}

.filter-field-label {
  display: flex;
  align-items: center;
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
}

.filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filters-card-modern {
  border-radius: 12px !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
}

.no-filters-message-modern {
  display: flex;
  align-items: center;
  padding: 24px;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px dashed #cbd5e1;
  text-align: left;
}

.add-filter-btn-modern {
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.filter-field-item {
  min-height: 48px !important;
  padding: 8px 16px !important;
}

.filter-field-item:hover {
  background: #f8fafc !important;
}

.no-filters-message {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  color: #64748b;
  font-size: 14px;
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
}

.filter-row-modern {
  position: relative;
}

.filter-card-modern-item {
  border-radius: 10px !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
}

.filter-card-modern-item:hover {
  border-color: #cbd5e1 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.filter-field-label-small {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  text-transform: none;
  letter-spacing: 0.2px;
  margin-bottom: 6px;
  display: block;
  font-family: Inter, Helvetica, sans-serif;
}

.filter-connector-chip-modern {
  font-weight: 600 !important;
}

/* Advanced Filter Fields - Sophisticated, consistent styling */
.advanced-filter-field :deep(.v-field) {
  background: #f1f5f9 !important;
  border-color: #e2e8f0 !important;
}

.advanced-filter-field :deep(.v-field),
.filter-field-select-modern :deep(.v-field),
.filter-operator-select-modern :deep(.v-field),
.filter-value-input-modern :deep(.v-field),
.filter-connector-select-modern :deep(.v-field) {
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
  min-height: 36px !important;
  font-size: 13px !important;
}

.advanced-filter-field :deep(.v-field__outline),
.filter-field-select-modern :deep(.v-field__outline),
.filter-operator-select-modern :deep(.v-field__outline),
.filter-value-input-modern :deep(.v-field__outline),
.filter-connector-select-modern :deep(.v-field__outline) {
  border-color: #e2e8f0 !important;
  border-width: 1px !important;
}

.advanced-filter-field :deep(.v-field--focused) {
  background: #e2e8f0 !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.1) !important;
}

.filter-field-select-modern :deep(.v-field--focused),
.filter-operator-select-modern :deep(.v-field--focused),
.filter-value-input-modern :deep(.v-field--focused),
.filter-connector-select-modern :deep(.v-field--focused) {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.1) !important;
}

.advanced-filter-field :deep(.v-field--focused .v-field__outline),
.filter-field-select-modern :deep(.v-field--focused .v-field__outline) {
  border-color: #1a73e8 !important;
  border-width: 2px !important;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1) !important;
}

.advanced-filter-field :deep(.v-field__input) {
  color: #1e293b !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  padding: 6px 10px !important;
  font-family: Inter, Helvetica, sans-serif !important;
}

.filter-field-select-modern :deep(.v-field__input) {
  color: #1e293b !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  padding: 10px 14px !important;
  font-family: Inter, Helvetica, sans-serif !important;
}

.advanced-filter-field :deep(.v-field__prepend-inner) {
  color: #64748b !important;
  opacity: 0.7;
  margin-right: 8px !important;
}

.advanced-filter-field :deep(.v-field__prepend-inner .v-icon) {
  font-size: 16px !important;
}

.advanced-filter-field :deep(input::placeholder),
.advanced-filter-field :deep(.v-field__input::placeholder) {
  color: #94a3b8 !important;
  opacity: 1 !important;
}

.advanced-filter-field :deep(.v-select__selection) {
  color: #475569 !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  font-family: Inter, Helvetica, sans-serif !important;
}

.advanced-filter-field :deep(.v-select__selection-text) {
  color: #475569 !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  font-family: Inter, Helvetica, sans-serif !important;
}

.advanced-filter-field :deep(.v-field--disabled) {
  background: #f1f5f9 !important;
  opacity: 0.6 !important;
}

.advanced-filter-add-btn {
  height: 36px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  border-radius: 6px !important;
  padding: 0 16px !important;
}

.advanced-filter-add-btn :deep(.v-btn__prepend) {
  margin-right: 6px !important;
}

.remove-filter-btn-modern {
  transition: all 0.2s ease !important;
}

.remove-filter-btn-modern:hover {
  background: rgba(239, 68, 68, 0.1) !important;
  transform: scale(1.1);
}

.filter-row {
  position: relative;
}

.filter-card {
  border-radius: 8px !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
}

.filter-connector-chip {
  background: #f1f5f9 !important;
  color: #0f172a !important;
  font-weight: 600 !important;
  font-size: 11px !important;
}

.add-filter-btn {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  color: #0f172a !important;
  text-transform: none !important;
  font-weight: 500 !important;
}

.add-filter-btn:hover {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
}

.remove-filter-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.remove-filter-btn:hover {
  opacity: 1;
}

.advanced-filters-btn {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  color: #0f172a !important;
  text-transform: none !important;
  font-weight: 500 !important;
}

.advanced-filters-btn:hover {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
}

.advanced-filters-btn.active {
  background: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
  color: #0f172a !important;
}

/* Document Context Menu */
.context-menu-overlay {
  pointer-events: none !important;
}

.context-menu-overlay :deep(.v-overlay__content) {
  pointer-events: none !important;
}

.document-context-menu-card {
  pointer-events: auto !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px !important;
  border: 1px solid #e2e8f0 !important;
  overflow: hidden !important;
  background: #ffffff !important;
  padding: 0 !important;
}

.document-context-menu {
  padding: 6px 0 !important;
  background: #ffffff !important;
  border-radius: 8px !important;
}

.document-context-menu .v-list-item {
  padding: 12px 16px !important;
  min-height: 44px !important;
  cursor: pointer !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  margin: 2px 6px !important;
  border-radius: 6px !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.document-context-menu .v-list-item:hover {
  background: #f1f5f9 !important;
  transform: translateX(2px) !important;
}

.document-context-menu .v-list-item.text-error:hover {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}

.document-context-menu .v-list-item :deep(.v-list-item-title) {
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #0f172a !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  letter-spacing: 0.01em !important;
  line-height: 1.4 !important;
}

.document-context-menu .v-list-item.text-error :deep(.v-list-item-title) {
  color: #dc2626 !important;
  font-weight: 600 !important;
}

.document-context-menu .v-list-item :deep(.v-list-item__prepend) {
  margin-right: 12px !important;
  margin-inline-end: 12px !important;
}

.document-context-menu .v-list-item :deep(.v-icon) {
  color: #64748b !important;
  font-size: 20px !important;
  opacity: 0.9 !important;
  transition: all 0.2s ease !important;
}

.document-context-menu .v-list-item:hover :deep(.v-icon) {
  color: #0f172a !important;
  opacity: 1 !important;
}

.document-context-menu .v-list-item.text-error :deep(.v-icon) {
  color: #dc2626 !important;
  opacity: 1 !important;
}

.document-context-menu .v-list-item.text-error:hover :deep(.v-icon) {
  color: #b91c1c !important;
}

.document-context-menu :deep(.v-divider) {
  margin: 6px 12px !important;
  opacity: 0.3 !important;
}

/* Google-style Search Results */
.google-result-card {
  background: transparent !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  border-bottom: none !important;
  margin-bottom: 0 !important;
  border-radius: 0 !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  pointer-events: auto !important;
  -ms-user-select: text !important;
  cursor: text !important;
}

.google-result-card:hover {
  background: transparent !important;
  box-shadow: none !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
}

.google-result-content {
  max-width: 100%;
  padding: 0;
  margin-top: -1px;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  pointer-events: auto !important;
}

/* Google-style Title */
.google-result-title {
  font-size: 20px !important;
  line-height: 1.25 !important;
  font-weight: 700 !important;
  color: #1a0dab !important;
  margin: 0 0 1px 0 !important;
  padding: 0 !important;
  cursor: pointer !important;
  font-family: arial, sans-serif !important;
  text-decoration: none !important;
  display: block !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

.document-created-date {
  color: #006621 !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  font-family: arial, sans-serif !important;
  margin-left: 4px !important;
  white-space: nowrap !important;
}

.google-result-title:hover {
  text-decoration: underline !important;
}

.google-result-title :deep(a),
.google-result-title :deep(span) {
  color: #1a0dab !important;
  text-decoration: none !important;
}

.google-result-title :deep(em),
.google-result-title :deep(strong) {
  font-style: normal !important;
  font-weight: bold !important;
  background-color: #fef08a !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  display: inline !important;
}


/* Google-style URL */
.google-result-url {
  display: flex !important;
  align-items: center !important;
  margin-bottom: 3px !important;
  margin-top: 0 !important;
  padding-top: 0 !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
}

.google-result-url-text {
  font-size: 14px !important;
  line-height: 1.3 !important;
  color: #006621 !important;
  font-family: arial, sans-serif !important;
  font-style: normal !important;
  display: inline !important;
  white-space: nowrap !important;
}

.google-score-chip {
  font-size: 11px !important;
  height: 18px !important;
  padding: 0 6px !important;
}

/* Google-style Snippet */
.google-result-snippet {
  font-size: 14px !important;
  line-height: 1.45 !important;
  color: #000000 !important;
  margin-top: 0 !important;
  font-family: arial, sans-serif !important;
  display: block !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
}

.google-result-meta {
  margin-bottom: 1px !important;
  line-height: 1.25 !important;
}

.google-result-snippet :deep(em),
.google-result-snippet :deep(strong),
.google-result-content :deep(em),
.google-result-content :deep(strong),
.google-result-title :deep(em),
.google-result-title :deep(strong) {
  font-style: normal !important;
  font-weight: 400 !important;
  color: #000000 !important;
  background-color: #fef08a !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  display: inline !important;
}

.google-highlight-field {
  margin-bottom: 2px !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
}

.google-highlight-field:last-child {
  margin-bottom: 0 !important;
}

.google-highlight-field span {
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
}

.google-result-fallback {
  font-size: 14px !important;
  color: #000000 !important;
}

.google-result-date {
  color: #5f6368 !important;
  font-size: 13px !important;
  line-height: 1.2 !important;
}

/* Remove icon styles */
.document-icon {
  display: none !important;
}

/* Ensure v-card-text is also transparent */
.documents-cards-container .v-card-text {
  background: transparent !important;
  padding: 0 !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
}

/* Professional Delete Button - Modern, Clean Design like GitHub/GitLab */
.professional-delete-btn {
  color: #dc2626 !important;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border-radius: 6px !important;
  padding: 8px !important;
  min-width: 36px !important;
  height: 36px !important;
  background: transparent !important;
  border: none !important;
  opacity: 0.7 !important;
}

.professional-delete-btn:hover {
  background: #fee2e2 !important;
  color: #b91c1c !important;
  opacity: 1 !important;
  box-shadow: 0 1px 3px rgba(220, 38, 38, 0.12) !important;
}

.professional-delete-btn:active {
  background: #fecaca !important;
  color: #991b1b !important;
  box-shadow: inset 0 1px 2px rgba(220, 38, 38, 0.2) !important;
}

.professional-delete-btn :deep(.v-icon) {
  color: inherit !important;
  transition: all 0.15s ease !important;
  opacity: inherit !important;
}

.professional-delete-btn:hover :deep(.v-icon) {
  transform: scale(1.05) !important;
}

/* Delete Document Dialog - Consistent Styling */
.delete-document-dialog :deep(.v-overlay__content) {
  border-radius: 16px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.delete-document-dialog :deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(4px) !important;
}

.delete-dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.delete-dialog-card::after {
  display: none !important;
  content: none !important;
}

.delete-collection-dialog .delete-dialog-card {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.delete-collection-dialog .delete-dialog-card::after {
  display: none !important;
  content: none !important;
}

.delete-btn-centered {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
  box-shadow: none !important;
}

.delete-btn-centered :deep(.v-btn__overlay) {
  box-shadow: none !important;
}

.delete-btn-centered:hover {
  box-shadow: none !important;
}

.delete-btn-centered:active {
  box-shadow: none !important;
}

.delete-btn-centered:focus {
  box-shadow: none !important;
}

.delete-btn-centered :deep(.v-btn__content) {
  justify-content: center !important;
  align-items: center !important;
  width: 100% !important;
  display: flex !important;
  gap: 6px !important;
  text-align: center !important;
}

.delete-action-btn.delete-btn-centered {
  box-shadow: none !important;
}

.delete-action-btn.delete-btn-centered:hover {
  box-shadow: none !important;
}

.delete-action-btn.delete-btn-centered:active {
  box-shadow: none !important;
}

.delete-action-btn.delete-btn-centered:focus {
  box-shadow: none !important;
}

.delete-action-btn.delete-btn-centered :deep(.v-btn__content) {
  justify-content: center !important;
  align-items: center !important;
  gap: 6px !important;
  text-align: center !important;
}

.delete-action-btn.delete-btn-centered :deep(.v-btn__overlay) {
  box-shadow: none !important;
}

/* Cancel button with no hover effect */
.cancel-btn-no-hover {
  pointer-events: auto !important;
}
.cancel-btn-no-hover:hover {
  background-color: transparent !important;
  background: transparent !important;
  color: inherit !important;
}
.cancel-btn-no-hover:hover :deep(.v-btn__overlay) {
  opacity: 0 !important;
  background: transparent !important;
}
.cancel-btn-no-hover :deep(.v-btn__overlay) {
  opacity: 0 !important;
}

/* Delete Synonym Dialog */
.delete-synonym-dialog :deep(.v-overlay__content) {
  border-radius: 20px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
}

.delete-synonym-dialog :deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(4px) !important;
}

/* Delete Collection Dialog Styles */
.delete-collection-dialog :deep(.v-overlay__content) {
  border-radius: 16px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.delete-collection-dialog :deep(.v-overlay__content)::after,
.delete-collection-dialog :deep(.v-overlay__content)::before {
  display: none !important;
  content: none !important;
  box-shadow: none !important;
}

.delete-collection-dialog :deep(.v-card) {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.delete-collection-dialog :deep(.v-card)::after,
.delete-collection-dialog :deep(.v-card)::before {
  display: none !important;
  content: none !important;
  box-shadow: none !important;
}

.delete-collection-dialog :deep(.v-card-actions) {
  box-shadow: none !important;
}

.delete-collection-dialog :deep(.v-card-actions)::after,
.delete-collection-dialog :deep(.v-card-actions)::before {
  display: none !important;
  content: none !important;
  box-shadow: none !important;
}

.delete-collection-dialog :deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(4px) !important;
}

.delete-dialog-header {
  background: #850f0f !important;
  padding: 16px 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 12px !important;
  border-bottom: none !important;
  border: none !important;
}

.delete-dialog-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.delete-dialog-icon {
  color: #ffffff !important;
}

.delete-dialog-title-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  text-align: left;
}

.delete-dialog-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  line-height: 1.3 !important;
  color: #ffffff !important;
  letter-spacing: -0.01em !important;
  text-align: left !important;
}

.delete-dialog-subtitle {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  color: rgba(255, 255, 255, 0.9) !important;
  text-align: left !important;
  text-align: right !important;
  text-align: center !important;
}

.delete-dialog-content {
  padding: 28px !important;
  background: #ffffff !important;
}

.delete-warning-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
  color: #1e293b !important;
  margin-bottom: 20px;
}

.delete-collection-info-card {
  background: #f8fafc !important;
  border: none !important;
  border-radius: 12px !important;
  padding: 20px !important;
  margin-bottom: 0 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.delete-info-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delete-info-label {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 500 !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  color: #64748b !important;
  display: flex;
  align-items: center;
}

.delete-info-value {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  line-height: 1.5 !important;
  color: #1e293b !important;
  word-break: break-word;
}

.delete-error-alert {
  border-radius: 8px !important;
  border: 1px solid #850f0f !important;
}

.delete-error-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #850f0f !important;
  margin-bottom: 6px;
}

.delete-error-message {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  color: #850f0f !important;
  margin-bottom: 4px;
}

.delete-error-help {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 12px !important;
  color: #850f0f !important;
  opacity: 0.8;
  margin-top: 8px;
}

.delete-dialog-actions {
  padding: 20px 28px !important;
  background: #f8fafc !important;
  border-top: none !important;
  box-shadow: none !important;
  border: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  justify-content: flex-end !important;
}

.delete-dialog-actions::after {
  display: none !important;
  content: none !important;
}

/* Delete Action Button - Red 3D version like DocumentDetailView */
.delete-action-btn {
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
  transition: all 0.2s ease !important;
  gap: 6px !important;
  
  /* Red background - no glow effects */
  background: #dc2626 !important;
  background-color: #dc2626 !important;
  box-shadow: none !important;
}

.delete-action-btn :deep(.v-btn__overlay) {
  background: transparent !important;
}

.delete-action-btn :deep(.v-btn__loader) {
  color: #ffffff !important;
  box-shadow: none !important;
  transform: none !important;
}

.delete-action-btn::before {
  display: none !important;
}

.delete-action-btn:hover {
  background: #b91c1c !important;
  background-color: #b91c1c !important;
  box-shadow: none !important;
  transform: none !important;
  color: #ffffff !important;
}

.delete-action-btn:hover::before {
  display: none !important;
}

.delete-action-btn:hover :deep(.v-btn__content) {
  text-decoration: none !important;
}

.delete-action-btn:active {
  background: #991b1b !important;
  background-color: #991b1b !important;
  box-shadow: none !important;
  transform: none !important;
}

.delete-action-btn:active::before {
  display: none !important;
}

.delete-action-btn :deep(.v-btn__content) {
  position: relative !important;
  z-index: 1 !important;
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  width: 100% !important;
  text-align: center !important;
  margin: 0 auto !important;
}

.delete-action-btn :deep(.v-btn__prepend),
.delete-action-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  margin-right: 4px !important;
  flex-shrink: 0 !important;
  vertical-align: middle !important;
}


/* Modern Delete Dialog Styles */
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
  border-radius: 8px;
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
  font-weight: 600 !important;
  font-size: 18px !important;
  line-height: 1.4 !important;
  color: #111827 !important;
  letter-spacing: -0.01em !important;
}

.delete-dialog-subtitle-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
  color: #6b7280 !important;
  margin-top: 2px !important;
}

.delete-dialog-content-modern {
  padding: 20px 24px !important;
  background: #ffffff !important;
}

.delete-warning-text-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  color: #4b5563 !important;
  margin-bottom: 16px;
}

.delete-info-card-modern {
  background: #f9fafb !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  padding: 16px !important;
  margin-bottom: 0 !important;
}

.delete-info-row-modern {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delete-info-label-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 500 !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  color: #6b7280 !important;
  display: flex;
  align-items: center;
}

.delete-info-value-modern {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
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
  font-weight: 500 !important;
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
  font-weight: 600 !important;
  text-transform: none !important;
  padding: 0 24px !important;
  border-radius: 8px !important;
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
  box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2) !important;
  color: #ffffff !important;
}

.delete-confirm-btn-modern:hover :deep(.v-btn__prepend .v-icon),
.delete-confirm-btn-modern:hover :deep(.v-btn__prepend-inner .v-icon) {
  color: #ffffff !important;
}

.delete-confirm-btn-modern:active {
  background: #b91c1c !important;
  box-shadow: 0 1px 2px rgba(239, 68, 68, 0.3) !important;
  color: #ffffff !important;
}

.delete-confirm-btn-modern:active :deep(.v-btn__prepend .v-icon),
.delete-confirm-btn-modern:active :deep(.v-btn__prepend-inner .v-icon) {
  color: #ffffff !important;
}

/* Table styles */
.documents-table :deep(.v-data-table),
.search-results-table :deep(.v-data-table) {
  background: white !important;
}

.documents-table :deep(th),
.search-results-table :deep(th) {
  background-color: #f8f9fa !important;
  color: #5f6368 !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 11px !important;
  letter-spacing: 0.5px;
  height: 48px !important;
}

.documents-table :deep(tr:hover),
.search-results-table :deep(tr:hover) {
  background-color: #f8f9fa !important;
  cursor: pointer;
}

.google-view-toggle .google-toolbar-btn:hover {
  background-color: #f1f3f4 !important;
}

.google-view-toggle .google-toolbar-btn.active {
  background-color: #e8f0fe !important;
  color: #1a73e8 !important;
}

.google-toolbar-right .items-per-page-btn,
.google-toolbar-right .collection-date-toolbar-btn,
.google-toolbar-right .quick-sort-btn,
.google-toolbar-right .items-per-page-btn:hover,
.google-toolbar-right .items-per-page-btn:focus,
.google-toolbar-right .items-per-page-btn:active,
.google-toolbar-right .items-per-page-btn.active,
.google-toolbar-right .collection-date-toolbar-btn:hover,
.google-toolbar-right .collection-date-toolbar-btn:focus,
.google-toolbar-right .collection-date-toolbar-btn:active,
.google-toolbar-right .collection-date-toolbar-btn.active,
.google-toolbar-right .quick-sort-btn:hover,
.google-toolbar-right .quick-sort-btn:focus,
.google-toolbar-right .quick-sort-btn:active,
.google-toolbar-right .quick-sort-btn.active {
  background: #f3f4f6 !important;
  background-color: #f3f4f6 !important;
  border: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.google-toolbar-right .items-per-page-btn:hover,
.google-toolbar-right .items-per-page-btn:focus,
.google-toolbar-right .items-per-page-btn:focus-visible,
.google-toolbar-right .collection-date-toolbar-btn:hover,
.google-toolbar-right .collection-date-toolbar-btn:focus,
.google-toolbar-right .collection-date-toolbar-btn:focus-visible,
.google-toolbar-right .quick-sort-btn:hover,
.google-toolbar-right .quick-sort-btn:focus,
.google-toolbar-right .quick-sort-btn:focus-visible {
  background: #e5e7eb !important;
  background-color: #e5e7eb !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.google-toolbar-right .items-per-page-btn *,
.google-toolbar-right .collection-date-toolbar-btn *,
.google-toolbar-right .quick-sort-btn * {
  background: transparent !important;
  background-color: transparent !important;
}

.google-toolbar-right .items-per-page-btn,
.google-toolbar-right .collection-date-toolbar-btn,
.google-toolbar-right .quick-sort-btn,
.google-toolbar-right .items-per-page-btn span,
.google-toolbar-right .collection-date-toolbar-btn span,
.google-toolbar-right .quick-sort-btn span,
.google-toolbar-right .items-per-page-btn :deep(.v-icon),
.google-toolbar-right .collection-date-toolbar-btn :deep(.v-icon),
.google-toolbar-right .quick-sort-btn :deep(.v-icon) {
  color: #1f2937 !important;
  font-weight: 700 !important;
}

.disabled-btn {
  opacity: 0.5;
  cursor: not-allowed !important;
  background-color: #f8f9fa !important;
  color: #9aa0a6 !important;
}

@media (max-width: 760px) {
  .collection-inline-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
