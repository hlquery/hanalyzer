<template>
  <div class="collections-view">
    <div class="collections-header" v-if="!loading && collections.length > 0">
      <div class="collections-title-section">
        <div>
          <h1 class="collections-title-text">Collections</h1>
          <div class="collections-total-text">
            <v-icon icon="mdi-folder" size="16" class="collections-dir-icon"></v-icon>
            Showing {{ filteredCollections.length }} out of {{ collections.length }}
          </div>
        </div>
      </div>
      <!-- Action Buttons - Top Right -->
      <div class="collections-header-actions">
        <v-menu
          v-model="showItemsPerPageMenu"
          location="bottom start"
          :close-on-content-click="true"
        >
          <template v-slot:activator="{ props }">
            <button
              v-bind="props"
              class="google-toolbar-btn items-per-page-btn"
              :class="{ 'active': showItemsPerPageMenu }"
              :aria-label="`${itemsPerPage} results per page`"
            >
              <v-icon size="16">mdi-format-list-numbered</v-icon>
              <span>{{ itemsPerPage }} per page</span>
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
        <v-btn
          @click.stop="goToCreateCollection"
          variant="flat"
          size="small"
          prepend-icon="mdi-plus"
          class="collections-action-btn create-collection-header-btn"
          style="pointer-events: auto !important; z-index: 10 !important;"
        >
          Create Collection
        </v-btn>
      </div>
    </div>

    <!-- Collections View -->
    <div>
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        elevation="1"
        icon="mdi-alert-circle"
      >
        <div class="text-h6 mb-2 font-weight-bold">Connection Issue</div>
        <div class="mb-2">We are having trouble connecting to the hlquery server.</div>
        <div class="mt-2 text-caption">
          <v-icon icon="mdi-information" size="16" class="mr-1"></v-icon>
          Make sure the hlquery server is running on <code class="text-primary font-weight-bold">{{ baseUrl.value }}</code>. If it just started, it might take a few seconds to be ready.
        </div>
        <v-btn
          variant="flat"
          size="default"
          prepend-icon="mdi-refresh"
          @click="loadCollections"
          class="unified-btn unified-btn-primary mt-3"
        >
          Retry Connection
        </v-btn>
      </v-alert>

      <LoadingSkeleton v-if="loading" variant="list" :items="8" />

      <div v-if="loading" class="d-flex flex-column align-center justify-center py-10">
        <v-progress-circular indeterminate color="primary" size="64" width="6" class="mb-4"></v-progress-circular>
        <div class="text-h6 text-grey-darken-1">Connecting to Server...</div>
        <div class="text-caption text-grey">Please wait while we establish a connection to hlquery</div>
      </div>

      <div v-if="!loading && collections.length === 0 && !error" class="empty-state-wrapper">
        <v-card class="mb-card card-premium empty-collections-card">
          <v-card-text class="empty-state-premium empty-collections-content">
            <div class="empty-collections-text">
              <h2 class="empty-collections-title">Create a New Collection</h2>
              <p class="empty-collections-description">
                Start by creating your first collection to organize documents and power search.
              </p>
            </div>
            <div class="empty-collections-action">
              <v-btn
                variant="flat"
                size="large"
                prepend-icon="mdi-plus-box"
                @click="goToCreateCollection"
                class="collections-action-btn empty-collections-btn create-collection-header-btn"
              >
                Create Collection
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Collections Table -->
      <v-card v-if="!loading && collections.length > 0" class="collections-card collections-card-top card-premium animate-fade-in">
        <!-- Debug info -->
        <div v-if="false" style="padding: 10px; background: #f0f0f0; font-size: 12px;">
          Debug: loading={{ loading }}, collections.length={{ collections.length }}, 
          filteredCollections.length={{ filteredCollections ? filteredCollections.length : 'null' }}, 
          error={{ error }}
        </div>
        <v-data-table
          v-if="filteredCollections && filteredCollections.length > 0"
          :headers="headers"
          :items="filteredCollections"
          :loading="false"
          item-value="name"
          class="collections-table"
          :items-per-page="itemsPerPage"
          v-model:page="currentPage"
          v-model:items-per-page="itemsPerPage"
          v-model:sort-by="sortBy"
          v-model:sort-desc="sortDesc"
          :footer-props="{
            'items-per-page-options': [],
            'items-per-page-text': '',
            'items-per-page-options-text': '',
            'show-current-page': false
          }"
          hide-default-footer
        >
          <template v-slot:header.index="{ column }">
            <div class="d-flex align-center">
              <v-icon icon="mdi-pound" size="18" class="mr-2 header-icon"></v-icon>
              <span>{{ column.title }}</span>
            </div>
          </template>
          
          <template v-slot:header.name="{ column }">
            <div class="d-flex align-center column-header-clickable" @click.stop="toggleSort('name')" :title="nameSortDirection ? ('Sorted ' + (nameSortDirection === 'asc' ? 'A-Z' : 'Z-A') + '. Click to change.') : 'Click to sort'">
              <v-icon icon="mdi-folder" size="18" class="mr-2 header-icon"></v-icon>
              <span>{{ column.title }}</span>
              <div class="ml-2 sort-icon-container">
                <v-icon 
                  v-if="nameSortDirection === 'asc'"
                  icon="mdi-arrow-up" 
                  size="14" 
                  class="sort-icon sort-icon-active"
                ></v-icon>
                <v-icon 
                  v-else-if="nameSortDirection === 'desc'"
                  icon="mdi-arrow-down" 
                  size="14" 
                  class="sort-icon sort-icon-active"
                ></v-icon>
                <v-icon 
                  v-else
                  icon="mdi-swap-vertical" 
                  size="14" 
                  class="sort-icon sort-icon-inactive"
                ></v-icon>
              </div>
            </div>
          </template>
          
          <template v-slot:header.num_documents="{ column }">
            <div class="d-flex align-center column-header-clickable" @click.stop="toggleSort('num_documents')" :title="docsSortDirection ? ('Sorted ' + (docsSortDirection === 'asc' ? 'Low to High' : 'High to Low') + '. Click to change.') : 'Click to sort'">
              <v-icon icon="mdi-file-document" size="18" class="mr-2 header-icon"></v-icon>
              <span>{{ column.title }}</span>
              <div class="ml-2 sort-icon-container">
                <v-icon 
                  v-if="docsSortDirection === 'asc'"
                  icon="mdi-arrow-up" 
                  size="14" 
                  class="sort-icon sort-icon-active"
                ></v-icon>
                <v-icon 
                  v-else-if="docsSortDirection === 'desc'"
                  icon="mdi-arrow-down" 
                  size="14" 
                  class="sort-icon sort-icon-active"
                ></v-icon>
                <v-icon 
                  v-else
                  icon="mdi-swap-vertical" 
                  size="14" 
                  class="sort-icon sort-icon-inactive"
                ></v-icon>
              </div>
            </div>
          </template>
          
          <template v-slot:header.created_at="{ column }">
            <div class="d-flex align-center column-header-clickable" @click.stop="toggleSort('created_at')" :title="createdSortDirection ? ('Sorted ' + (createdSortDirection === 'asc' ? 'Oldest First' : 'Newest First') + '. Click to change.') : 'Click to sort'">
              <v-icon icon="mdi-calendar" size="18" class="mr-2 header-icon"></v-icon>
              <span>{{ column.title }}</span>
              <div class="ml-2 sort-icon-container">
                <v-icon 
                  v-if="createdSortDirection === 'asc'"
                  icon="mdi-arrow-up" 
                  size="14" 
                  class="sort-icon sort-icon-active"
                ></v-icon>
                <v-icon 
                  v-else-if="createdSortDirection === 'desc'"
                  icon="mdi-arrow-down" 
                  size="14" 
                  class="sort-icon sort-icon-active"
                ></v-icon>
                <v-icon 
                  v-else
                  icon="mdi-swap-vertical" 
                  size="14" 
                  class="sort-icon sort-icon-inactive"
                ></v-icon>
              </div>
            </div>
          </template>
          
      <template v-slot:item.index="{ index, item }">
        <router-link
          :to="{ name: 'collection-documents', params: { name: item.name } }"
          class="index-cell"
          style="text-decoration: none; display: block; cursor: pointer;"
        >
          <span class="index-number">{{ index + 1 }}</span>
        </router-link>
      </template>

      <template v-slot:item.name="{ item }">
        <router-link
          :to="item.type === 'alias' ? '/aliases' : getCollectionRoute(item.name)"
          class="collection-name-wrapper cursor-pointer"
          style="text-decoration: none; display: block;"
          @click="handleCollectionClick(item.name, $event)"
        >
          <v-icon v-if="item.type === 'alias'" size="18" color="primary" class="mr-1">mdi-link-variant</v-icon>
          <span class="text-body-1 text-primary collection-title collection-name-link">{{ item.name }}</span>
          <span v-if="item.type === 'alias'" class="text-caption ml-2 text-grey-darken-1">
            → {{ item.collection_name }}
          </span>
        </router-link>
      </template>
      
      <template v-slot:item.num_documents="{ item }">
        <router-link
          :to="{ name: 'collection-documents', params: { name: item.name } }"
          class="d-flex align-center document-count-link"
          style="text-decoration: none; cursor: pointer; display: block; background: transparent !important; background-color: transparent !important;"
        >
          <span class="document-count-text">
            {{ formatNumber(item.num_documents || 0) }}
          </span>
        </router-link>
      </template>
      
      <template v-slot:item.created_at="{ item }">
        <router-link
          :to="{ name: 'collection-documents', params: { name: item.name } }"
          class="d-flex align-center created-at-link"
          style="text-decoration: none; cursor: pointer; display: block; background: transparent !important; background-color: transparent !important;"
        >
          <span class="created-at-text">
            {{ formatDate(item.created_at) }}
          </span>
        </router-link>
      </template>
      
      <template v-slot:footer.page-text="{ page, startItem, stopItem, itemsLength }">
        Showing {{ startItem }}-{{ stopItem }} of {{ itemsLength }}
      </template>
      
    </v-data-table>
    
    <!-- Bottom Pagination -->
    <div v-if="!loading && filteredCollections.length > 0" class="pagination-wrapper-bottom mt-4 mb-4">
      <v-pagination
        v-model="currentPage"
        :length="totalPages"
        :total-visible="7"
        @update:model-value="onPageChange"
        class="table-pagination pagination-centered"
      ></v-pagination>
    </div>
    
    <!-- No collections match search -->
    <v-card v-else-if="!loading && headerSearchQuery && headerSearchQuery.trim() !== ''" class="mb-card mt-4 card-premium">
      <v-card-text class="empty-state-premium">
        <div class="empty-state-premium-icon">
          <v-icon icon="mdi-magnify" size="40" color="#94a3b8"></v-icon>
        </div>
        <div class="empty-state-premium-title">No Matching Collections</div>
        <div class="empty-state-premium-subtitle">
          No collections match "<strong>{{ headerSearchQuery }}</strong>". Try adjusting your search terms or create a new collection.
        </div>
      </v-card-text>
    </v-card>
    </v-card>

    <!-- Search Bar for Selected Collection - Always show if collection is selected -->
    <div v-if="selectedCollection" class="search-header-container">
      <div class="search-header d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-magnify" class="mr-3 search-title-icon"></v-icon>
          <span class="search-title-text">Search in "{{ selectedCollection }}"</span>
        </div>
        <div class="d-flex align-center" style="gap: 12px;">
          <v-btn
            variant="text"
            @click="viewDocuments"
            size="default"
            class="unified-btn unified-btn-secondary"
            prepend-icon="mdi-file-document-multiple"
          >
            View Documents
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="default"
            @click="closeSearch"
            class="unified-btn unified-btn-icon"
          >
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </div>
      </div>
      <v-card class="mb-card mt-2 search-card">
      <v-card-text class="pa-4">
        <div class="collections-search-bar-container">
          <div class="collections-search-input-wrapper">
            <div class="collections-search-box-wrapper">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="comfortable"
                hide-details
                class="collections-document-search-input"
                @keyup.enter="handleCollectionSearch"
                @input="onSearchQueryChange"
                @keydown.esc="clearSearch"
                clearable
                placeholder="Search documents in this collection... (Press Enter or wait for auto-search)"
                :loading="searchLoading"
                autofocus
                ref="searchInputRef"
              >
                <template v-slot:append-inner>
                  <div class="collections-search-append-inner">
                    <v-progress-circular
                      v-if="searchLoading"
                      size="20"
                      width="2"
                      indeterminate
                      color="primary"
                      class="mr-2"
                    ></v-progress-circular>
                    <v-chip
                      v-if="searchPerformed && searchResults.length > 0"
                      size="small"
                      color="success"
                      variant="flat"
                      class="mr-2"
                    >
                      {{ searchResults.length }} found
                    </v-chip>
                    <v-tooltip text="Press Enter to search, Esc to clear" location="top">
                      <template v-slot:activator="{ props }">
                        <v-icon
                          v-bind="props"
                          size="18"
                          color="grey"
                          class="collections-search-hint-icon"
                        >mdi-information-outline</v-icon>
                      </template>
                    </v-tooltip>
                  </div>
                </template>
              </v-text-field>
            </div>
            <div class="collections-search-actions">
              <v-select
                v-model="searchSortBy"
                :items="searchSortOptions"
                item-title="label"
                item-value="value"
                label="Sort by"
                variant="outlined"
                density="compact"
                hide-details
                class="search-sort-select mr-2"
                prepend-inner-icon="mdi-sort"
                @update:model-value="onSearchSortChange"
              ></v-select>
              <v-btn
                variant="flat"
                @click="handleCollectionSearch"
                :disabled="searchLoading || !searchQuery?.trim()"
                :loading="searchLoading"
                size="default"
                class="unified-btn unified-btn-primary"
                prepend-icon="mdi-magnify"
              >
                Search
              </v-btn>
              <v-menu location="bottom end">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    variant="text"
                    size="default"
                    class="unified-btn unified-btn-icon"
                  >
                    <v-icon size="20">mdi-tune</v-icon>
                  </v-btn>
                </template>
                <v-card min-width="200">
                  <v-card-text>
                    <div class="text-subtitle-2 mb-2">Search Options</div>
                    <v-text-field
                      v-model.number="searchLimit"
                      label="Result Limit"
                      type="number"
                      min="1"
                      max="1000"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="mb-3"
                    ></v-text-field>
                    <v-switch
                      v-model="autoSearchEnabled"
                      label="Auto-search (instant)"
                      density="compact"
                      hide-details
                      color="primary"
                    ></v-switch>
                  </v-card-text>
                </v-card>
              </v-menu>
            </div>
          </div>
          <div v-if="searchQuery && !searchLoading" class="collections-search-suggestions">
            <v-chip
              size="small"
              variant="outlined"
              @click="searchQuery = searchQuery + ' AND '"
              class="mr-1 mb-1"
            >
              Add AND
            </v-chip>
            <v-chip
              size="small"
              variant="outlined"
              @click="searchQuery = searchQuery + ' OR '"
              class="mr-1 mb-1"
            >
              Add OR
            </v-chip>
            <v-chip
              size="small"
              variant="outlined"
              @click="wrapInQuotes"
              class="mr-1 mb-1"
            >
              Exact phrase
            </v-chip>
          </div>
        </div>

        <v-alert
          v-if="searchError"
          type="error"
          variant="tonal"
          class="mt-4"
          elevation="1"
          closable
          icon="mdi-alert-circle"
          @click:close="searchError = null"
        >
          <div class="font-weight-bold mb-1">Search Error</div>
          <div>{{ searchError }}</div>
          <v-btn
            variant="flat"
            size="default"
            prepend-icon="mdi-refresh"
            @click="handleCollectionSearch"
            class="unified-btn unified-btn-primary mt-2"
          >
            Try Again
          </v-btn>
        </v-alert>

        <v-alert
          v-if="searchPerformed && searchResults.length === 0 && indexingInProgress && !searchError"
          type="info"
          variant="tonal"
          class="mt-4"
          elevation="1"
          icon="mdi-database-sync"
        >
          <div class="font-weight-bold mb-1">Indexing in progress</div>
          <div>Results may be incomplete. Try the search again in a few seconds.</div>
        </v-alert>

        <div v-if="searchResults.length > 0" class="mt-4 search-results-container">
          <div class="search-results-header d-flex align-center justify-space-between mb-3">
            <span class="text-subtitle-1 font-weight-bold">Search Results ({{ searchResults.length }})</span>
            <div class="search-results-sort-container d-flex align-center">
              <v-icon size="18" color="grey-darken-1" class="mr-2">mdi-sort</v-icon>
              <v-select
                v-model="searchSortBy"
                :items="searchSortOptions"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                hide-details
                class="search-results-sort-select"
                @update:model-value="onSearchSortChange"
              ></v-select>
            </div>
          </div>
          <v-expansion-panels variant="accordion" class="search-results-panels">
            <v-expansion-panel
              v-for="(doc, index) in paginatedSearchResults"
              :key="`search-result-${index}-${doc.id || ''}`"
              elevation="0"
              class="search-result-panel"
            >
              <v-expansion-panel-title class="font-weight-medium">
                <div class="d-flex align-center justify-space-between w-100 pr-4">
                  <div class="d-flex align-center">
                    <span class="search-result-title">Document: {{ doc.id }}</span>
                  </div>
                  <v-chip
                    v-if="doc._text_match"
                    color="success"
                    size="small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    Score: {{ doc._text_match }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              
              <v-expansion-panel-text class="search-result-panel-text">
                <div class="document-content-expanded">
                  <div
                    v-for="(value, key) in doc"
                    :key="key"
                    v-if="key !== 'id' && key !== '_text_match'"
                    class="document-field-expanded"
                  >
                    <div class="field-label-expanded">{{ key }}</div>
                    <div class="field-value-expanded">
                      {{ typeof value === 'object' ? JSON.stringify(value, null, 2) : value }}
                    </div>
                  </div>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
          
          <!-- Google-style Pagination for Search Results -->
          <div v-if="searchResultsTotalPages > 1" class="search-results-pagination mt-4">
            <div class="collections-pagination-footer-google">
              <div class="d-flex align-center justify-center w-100 pa-4" style="flex-wrap: wrap; gap: 16px;">
                <div class="custom-pagination">
                  <button
                    class="pagination-nav-btn-google"
                    :disabled="searchResultsPage === 1"
                    @click="searchResultsPage = searchResultsPage - 1"
                    aria-label="Previous page"
                  >
                    <span class="pagination-nav-text">Previous</span>
                  </button>
                  
                  <div class="pagination-numbers">
                    <template v-for="(item, index) in searchResultsVisiblePages" :key="`page-${item.value || index}`">
                      <button
                        v-if="item.type === 'page'"
                        @click="searchResultsPage = item.value"
                        :class="['pagination-number-google', { 'active': item.value === searchResultsPage }]"
                        :aria-label="`Go to page ${item.value}`"
                        :aria-current="item.value === searchResultsPage ? 'page' : undefined"
                      >
                        {{ item.value }}
                      </button>
                      <span
                        v-else-if="item.type === 'ellipsis'"
                        class="pagination-ellipsis"
                        aria-hidden="true"
                      >
                        ...
                      </span>
                    </template>
                  </div>
                  
                  <button
                    class="pagination-nav-btn-google"
                    :disabled="searchResultsPage === searchResultsTotalPages || searchResultsTotalPages === 0"
                    @click="searchResultsPage = searchResultsPage + 1"
                    aria-label="Next page"
                  >
                    <span class="pagination-nav-text">Next</span>
                  </button>
                </div>
                
                <div class="d-flex align-center gap-4" style="margin-left: auto;">
                  <div class="pagination-info-google">
                    Showing {{ Math.min((searchResultsPage - 1) * searchResultsPerPage + 1, searchResults.length) }}-{{ Math.min(searchResultsPage * searchResultsPerPage, searchResults.length) }} of {{ searchResults.length }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!searchLoading && searchQuery && searchPerformed" class="mt-4 search-results-container">
          <v-card class="card-premium">
            <v-card-text class="empty-state-premium">
              <div class="empty-state-premium-icon">
                <v-icon icon="mdi-magnify" size="40" color="#94a3b8"></v-icon>
              </div>
              <div class="empty-state-premium-title">No Search Results</div>
              <div class="empty-state-premium-subtitle">
                No documents match your search query. Try adjusting your search terms or browse all documents in this collection.
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>
      </v-card>
      </div>
    </div>

    <!-- Delete Collection Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="560"
      persistent
      class="delete-collection-dialog"
    >
      <v-card class="delete-dialog-card" elevation="8">
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
            <div class="delete-info-value">{{ collectionToDelete?.name || 'N/A' }}</div>
          </div>
          <v-divider class="my-3" v-if="collectionToDelete && collectionToDelete.num_documents !== undefined && collectionToDelete.num_documents !== null"></v-divider>
          <div class="delete-info-row" v-if="collectionToDelete && collectionToDelete.num_documents !== undefined && collectionToDelete.num_documents !== null">
              <div class="delete-info-label">
                <v-icon icon="mdi-file-document-multiple" size="18" class="mr-1"></v-icon>
                Documents
              </div>
              <div class="delete-info-value">{{ formatNumber(collectionToDelete.num_documents || 0) }} document{{ (collectionToDelete.num_documents || 0) !== 1 ? 's' : '' }}</div>
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
            prepend-icon="mdi-delete"
            class="unified-btn unified-btn-danger delete-btn-centered"
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
import { onMounted, onUnmounted, ref, computed, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCollections } from '../composables/useCollections'
import { useAliases } from '../composables/useAliases'
import { useSearch } from '../composables/useSearch'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useCopy } from '../composables/useCopy'
import { extractSafeErrorMessage } from '../utils/sanitize'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import PaginationInfo from '../components/PaginationInfo.vue'

const router = useRouter()
const emit = defineEmits(['view-collection', 'view-documents'])

const baseUrl = inject('baseUrl')
const toast = inject('toast', { success: () => {}, error: () => {} })
const { collections, loading: collectionsLoading, error: collectionsError, loadCollections: fetchCollections, loadCollectionsAsync, deleteCollection } = useCollections(baseUrl)
const { aliases, loading: aliasesLoading, error: aliasesError, loadAliases, deleteAlias: removeAlias } = useAliases(baseUrl)

const loading = computed(() => collectionsLoading.value || aliasesLoading.value)
const error = computed(() => collectionsError.value || aliasesError.value)

const loadCollections = async (showLoading = true) => {
  await Promise.all([
    fetchCollections(showLoading),
    loadAliases(showLoading)
  ])
}

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'ctrl+n',
    handler: () => {
      if (!loading.value) {
        goToCreateCollection()
        toast.success('Opening create collection form...', 'Keyboard Shortcut')
      }
    }
  },
  {
    key: 'f5',
    handler: () => {
      if (!loading.value) {
        loadCollections()
      }
    }
  },
  {
    key: 'ctrl+r',
    handler: (e) => {
      if (!loading.value) {
        e.preventDefault()
        loadCollections()
      }
    }
  },
  {
    key: '/',
    handler: (e) => {
      // Only focus search if not already in an input
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
        if (searchInputRef.value) {
          searchInputRef.value.focus()
        }
      }
    }
  }
])

const goToCreateCollection = () => {
  router.push('/collections/create').catch(() => {})
}

const getCollectionRoute = (collectionName) => {
  if (!collectionName || collectionName === null || collectionName === undefined) {
    return '/collections'
  }
  try {
    const encoded = encodeURIComponent(String(collectionName))
    return '/collections/' + encoded
  } catch (error) {
    return '/collections'
  }
}

const openCollectionInNewTab = (collectionName, event) => {
  if (!collectionName) {
    return
  }
  
  const name = String(collectionName).trim()
  if (!name) {
    return
  }
  
  try {
    const encodedName = encodeURIComponent(name)
    const path = `/collections/${encodedName}`
    const route = router.resolve({ path: path })
    if (route && route.href) {
      window.open(route.href, '_blank')
    } else {
      window.open(path, '_blank')
    }
  } catch (err) {
    console.error('Error opening collection in new tab:', err, 'Collection name:', name)
    const encodedName = encodeURIComponent(name)
    window.open(`/collections/${encodedName}`, '_blank')
  }
}

const handleCollectionClick = (collectionName, event) => {
  // Only handle left clicks - right clicks should show browser context menu
  if (event) {
    // Right click (button 2) - let the browser fully handle the event.
    // Stopping propagation here can interfere with the native context menu,
    // especially when the row is wrapped by router-link/Vuetify table markup.
    if (event.button === 2) {
      return
    }
    // Ctrl/Cmd + click - let browser handle it (open in new tab)
    if (event.ctrlKey || event.metaKey) {
      return // Let browser handle it
    }
    // Middle mouse button - let browser handle it
    if (event.button === 1) {
      return // Let browser handle it
    }
  }
  
  // Let router-link handle the navigation
}

const viewCollection = (collectionName, event = null) => {
  if (!collectionName) {
    return
  }
  
  // Ensure collectionName is a string
  const name = String(collectionName).trim()
  if (!name) {
    return
  }
  
  // Handle modifier keys for new tab/window
  if (event) {
    // Ctrl/Cmd + click or middle mouse button -> open in new tab
    if (event.ctrlKey || event.metaKey || event.button === 1) {
      openCollectionInNewTab(name, event)
      return
    }
    // Right click -> handled by contextmenu event
    if (event.button === 2) {
      return
    }
  }
  
  // Navigate to collection - use window.location directly for maximum reliability
  // This avoids all router template string parsing issues
  try {
    const encodedName = encodeURIComponent(name)
    const path = `/collections/${encodedName}`
    // Use window.location directly to avoid router issues
    window.location.href = path
  } catch (err) {
    // Last resort: use window.location with fallback encoding
    const encodedName = encodeURIComponent(name)
    window.location.href = `/collections/${encodedName}`
  }
}

const viewCollectionDetails = (collectionName) => {
  if (!collectionName) {
    return
  }
  
  const name = String(collectionName).trim()
  if (!name) {
    return
  }
  
  try {
    const encodedName = encodeURIComponent(name)
    const path = `/collections/${encodedName}/details`
    
    // Try router.push first, fallback to window.location if it fails
    try {
      router.push({ path: path }).catch(err => {
        if (err && (err.message?.includes('Unexpected template string') || 
                    err.message?.includes('template string') ||
                    err.name === 'NavigationDuplicated')) {
          return
        }
        window.location.href = path
      })
    } catch (routerErr) {
      window.location.href = path
    }
  } catch (err) {
    const encodedName = encodeURIComponent(name)
    window.location.href = `/collections/${encodedName}/details`
  }
}

const confirmDeleteCollection = (item) => {
  // Handle both item object and collection name string
  let collectionName = null
  if (typeof item === 'string') {
    collectionName = item
  } else if (item && item.name) {
    collectionName = item.name
  } else {
    return
  }
  
  if (!collectionName || collectionName.trim() === '') {
    return
  }
  
  collectionToDelete.value = collections.value.find(c => c && c.name === collectionName) || { name: collectionName }
  showDeleteDialog.value = true
  deleteError.value = null
}

// Format date for display - improved version with better handling
const formatDate = (dateString) => {
  if (!dateString && dateString !== 0) return 'N/A'
  try {
    let date
    
    // Handle different input types
    if (typeof dateString === 'number') {
      // Unix timestamp: check if seconds (< year 2286) or milliseconds
      date = dateString < 10000000000 
        ? new Date(dateString * 1000) // seconds since epoch
        : new Date(dateString) // milliseconds since epoch
    } else if (typeof dateString === 'string') {
      // Try ISO string first (most common)
      date = new Date(dateString)
      
      // If ISO parsing failed, try Unix timestamp string
      if (isNaN(date.getTime())) {
        const timestamp = parseFloat(dateString)
        if (!isNaN(timestamp) && isFinite(timestamp)) {
          date = timestamp < 10000000000 
            ? new Date(timestamp * 1000) // seconds
            : new Date(timestamp) // milliseconds
        }
      }
    } else {
      date = new Date(dateString)
    }
    
    // Validate the date
    if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
      return String(dateString) // Return original if invalid
    }
    
    // Format: "Jan 15, 2024 at 3:45:12 PM" - clean and readable
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

// Format number with commas
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const { searchResults, loading: searchLoading, error: searchError, searchTime, indexingInProgress, performSearch } = useSearch(baseUrl)
const selectedCollection = ref(null)
const searchQuery = ref('')
const searchLimit = ref(10)
const searchPerformed = ref(false)
const autoSearchEnabled = ref(true)
const searchInputRef = ref(null)
const currentPage = ref(1)
const itemsPerPage = ref(50)
const itemsPerPageOptions = [10, 25, 50, 100]
const showItemsPerPageMenu = ref(false)
const searchResultsPage = ref(1)
const searchResultsPerPage = ref(10)
const sortBy = ref([])
const sortDesc = ref([])

// Search result sorting - intuitive options
const searchSortBy = ref('_text_match:desc')
const searchSortOptions = [
  { label: '⭐ Relevance (Best Match)', value: '_text_match:desc' },
  { label: '📉 Relevance (Worst Match)', value: '_text_match:asc' },
  { label: '🔤 Title (A-Z)', value: 'title:asc' },
  { label: '🔤 Title (Z-A)', value: 'title:desc' },
  { label: '🆔 Document ID (A-Z)', value: 'id:asc' },
  { label: '🆔 Document ID (Z-A)', value: 'id:desc' },
  { label: '📅 Date (Newest First)', value: 'created_at:desc' },
  { label: '📅 Date (Oldest First)', value: 'created_at:asc' }
]

// Delete collection state
const showDeleteDialog = ref(false)
const collectionToDelete = ref(null)
const deleting = ref(false)
const deleteError = ref(null)

const { copyToClipboard } = useCopy()

// Computed properties for sort direction (reactive) - User-friendly sorting
const nameSortDirection = computed(() => {
  if (!sortBy.value || sortBy.value.length === 0) return null
  const index = sortBy.value.findIndex(key => key === 'name')
  if (index === -1) return null
  // sortBy is array of strings, sortDesc is array of booleans
  const isDesc = sortDesc.value && sortDesc.value.length > index && sortDesc.value[index]
  return isDesc ? 'desc' : 'asc'
})

const docsSortDirection = computed(() => {
  if (!sortBy.value || sortBy.value.length === 0) return null
  const index = sortBy.value.findIndex(key => key === 'num_documents')
  if (index === -1) return null
  // sortBy is array of strings, sortDesc is array of booleans
  const isDesc = sortDesc.value && sortDesc.value.length > index && sortDesc.value[index]
  return isDesc ? 'desc' : 'asc'
})

const createdSortDirection = computed(() => {
  if (!sortBy.value || sortBy.value.length === 0) return null
  const index = sortBy.value.findIndex(key => key === 'created_at')
  if (index === -1) return null
  // sortBy is array of strings, sortDesc is array of booleans
  const isDesc = sortDesc.value && sortDesc.value.length > index && sortDesc.value[index]
  return isDesc ? 'desc' : 'asc'
})

// Get search query from header (injected)
const headerSearchQuery = inject('headerSearchQuery', ref(''))

// Current sort state for server-side sorting
const currentSortBy = ref(null)
const currentSortOrder = ref(null)

// Helper to get current sort column and order
const getCurrentSort = () => {
  if (sortBy.value && sortBy.value.length > 0) {
    const col = sortBy.value[0]
    const isDesc = sortDesc.value && sortDesc.value.length > 0 && sortDesc.value[0]
    return { sortBy: col, sortOrder: isDesc ? 'desc' : 'asc' }
  }
  return { sortBy: null, sortOrder: null }
}

// Filter collections by search query from header
// NOTE: Server-side search is now used, so this is mainly for display
const mergedCollections = computed(() => {
  const all = [
    ...collections.value.map(c => ({ ...c, type: 'collection' })),
    ...aliases.value.map(a => ({ 
      ...a, 
      type: 'alias', 
      num_documents: collections.value.find(c => c.name === a.collection_name)?.num_documents || 0 
    }))
  ]
  return all
})

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getWildcardRegex = (pattern) => {
  const escaped = escapeRegex(pattern)
  const regexBody = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.')
  return new RegExp(`^${regexBody}$`, 'i')
}

const filteredCollections = computed(() => {
  const all = mergedCollections.value
  
  if (!headerSearchQuery.value || !headerSearchQuery.value.trim()) {
    return all
  }
  
  const queryRaw = headerSearchQuery.value.trim()
  const query = queryRaw.toLowerCase()
  const hasWildcard = /[\*\?]/.test(queryRaw)
  const wildcardRegex = hasWildcard ? getWildcardRegex(queryRaw) : null
  
  return all.filter(c => {
    const name = (c.name || '').toLowerCase()
    const target = c.type === 'alias' ? (c.collection_name || '').toLowerCase() : ''
    if (hasWildcard && wildcardRegex) {
      return wildcardRegex.test(name) || wildcardRegex.test(target)
    }
    return name.includes(query) || target.includes(query)
  })
})

// Calculate total pages for pagination
const totalPages = computed(() => {
  const pages = Math.ceil(filteredCollections.value.length / itemsPerPage.value)
  return Math.max(1, pages) // Always return at least 1 page
})

// Pagination info computed property (similar to CollectionDocumentsView)
const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredCollections.value.length)
  return {
    start,
    end,
    total: filteredCollections.value.length,
    totalPages: totalPages.value
  }
})

// Handle page change
const onPageChange = (page) => {
  currentPage.value = page
  // Scroll to top of table
  const tableCard = document.querySelector('.collections-card')
  if (tableCard) {
    tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Handle items per page change
const onItemsPerPageChange = (newValue) => {
  itemsPerPage.value = newValue
  currentPage.value = 1
}

// Search results pagination
const paginatedSearchResults = computed(() => {
  const start = (searchResultsPage.value - 1) * searchResultsPerPage.value
  const end = start + searchResultsPerPage.value
  return searchResults.value.slice(start, end)
})

const searchResultsTotalPages = computed(() => {
  return Math.ceil(searchResults.value.length / searchResultsPerPage.value)
})

const searchResultsVisiblePages = computed(() => {
  const total = searchResultsTotalPages.value
  if (total === 0) return []
  
  const current = searchResultsPage.value
  const pages = []
  
  // Show up to 7 consecutive page numbers (centered around current)
  const maxVisiblePages = 7
  const pagesOnEachSide = Math.floor(maxVisiblePages / 2) // 3 pages on each side
  
  if (total <= maxVisiblePages) {
    // Show all pages if total is 7 or fewer
    for (let i = 1; i <= total; i++) {
      pages.push({ type: 'page', value: i })
    }
  } else {
    // Calculate centered range around current page
    let startPage = Math.max(1, current - pagesOnEachSide)
    let endPage = Math.min(total, current + pagesOnEachSide)
    
    // Adjust if we're near the start
    if (startPage === 1) {
      endPage = Math.min(total, maxVisiblePages)
    }
    
    // Adjust if we're near the end
    if (endPage === total) {
      startPage = Math.max(1, total - maxVisiblePages + 1)
    }
    
    // Always show first page if not in range
    if (startPage > 1) {
      pages.push({ type: 'page', value: 1 })
      if (startPage > 2) {
        pages.push({ type: 'ellipsis' })
      }
    }
    
    // Show consecutive page numbers (centered around current)
    for (let i = startPage; i <= endPage; i++) {
      pages.push({ type: 'page', value: i })
    }
    
    // Always show last page if not in range
    if (endPage < total) {
      if (endPage < total - 1) {
        pages.push({ type: 'ellipsis' })
      }
      pages.push({ type: 'page', value: total })
    }
  }
  
  return pages
})

// Calculate visible page numbers for pagination (Google-style with ellipsis)
// Improved algorithm that centers current page and adjusts smoothly
const visiblePages = computed(() => {
  const total = totalPages.value
  if (total === 0) return []
  
  const current = currentPage.value
  const pages = []
  
  // Show up to 7 consecutive page numbers (centered around current)
  const maxVisiblePages = 7
  const pagesOnEachSide = Math.floor(maxVisiblePages / 2) // 3 pages on each side
  
  if (total <= maxVisiblePages) {
    // Show all pages if total is 7 or fewer
    for (let i = 1; i <= total; i++) {
      pages.push({ type: 'page', value: i })
    }
  } else {
    // Calculate centered range around current page
    let startPage = Math.max(1, current - pagesOnEachSide)
    let endPage = Math.min(total, current + pagesOnEachSide)
    
    // Adjust if we're near the start
    if (startPage === 1) {
      endPage = Math.min(total, maxVisiblePages)
    }
    
    // Adjust if we're near the end
    if (endPage === total) {
      startPage = Math.max(1, total - maxVisiblePages + 1)
    }
    
    // Always show first page if not in range
    if (startPage > 1) {
      pages.push({ type: 'page', value: 1 })
      if (startPage > 2) {
        pages.push({ type: 'ellipsis' })
      }
    }
    
    // Show consecutive page numbers (centered around current)
    for (let i = startPage; i <= endPage; i++) {
      pages.push({ type: 'page', value: i })
    }
    
    // Always show last page if not in range
    if (endPage < total) {
      if (endPage < total - 1) {
        pages.push({ type: 'ellipsis' })
      }
      pages.push({ type: 'page', value: total })
    }
  }
  
  return pages
})

// Stats computed properties
const totalDocuments = computed(() => {
  return collections.value.reduce((sum, col) => sum + (col.num_documents || 0), 0)
})

const averageDocuments = computed(() => {
  if (collections.value.length === 0) return 0
  return Math.round(totalDocuments.value / collections.value.length)
})

const largestCollectionName = computed(() => {
  if (collections.value.length === 0) return 'N/A'
  const largest = collections.value.reduce((max, col) => 
    (col.num_documents || 0) > (max.num_documents || 0) ? col : max
  )
  return largest.name || 'N/A'
})

const headers = [
  { title: '', key: 'index', sortable: false, width: '60px' },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Documents', key: 'num_documents', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
]


const handleItemClick = (item) => {
  if (item.type === 'alias') {
    router.push('/aliases')
    // We could potentially open the dialog directly if we pass state, 
    // but for now navigating to Aliases is consistent with user request
  } else {
    viewCollection(item.name)
  }
}

const selectCollection = (item) => {
  if (!item) {
    return
  }
  
  // Get collection name - handle different item structures
  let collectionName = null
  if (typeof item === 'string') {
    collectionName = item
  } else if (item && item.name) {
    collectionName = item.name
  } else {
    return
  }
  
  // Ensure collectionName is a valid string
  const name = String(collectionName || '').trim()
  if (!name) {
    return
  }
  
  // Try to find in filtered collections first, then in all collections
  let collection = filteredCollections.value.find(c => c && c.name === name)
  if (!collection) {
    collection = collections.value.find(c => c && c.name === name)
  }
  
  // Still allow selection even if not found in list - might be a new collection.
  
  // Navigate to the collection documents page - use window.location as fallback
  try {
    const encodedName = encodeURIComponent(name)
    const path = `/collections/${encodedName}`
    
    // Try router.push first, fallback to window.location if it fails
    try {
      router.push({ path: path }).catch(err => {
        if (err && (err.message?.includes('Unexpected template string') || 
                    err.message?.includes('template string') ||
                    err.name === 'NavigationDuplicated')) {
          return
        }
        window.location.href = path
      })
    } catch (routerErr) {
      window.location.href = path
    }
  } catch (err) {
    const encodedName = encodeURIComponent(name)
    window.location.href = `/collections/${encodedName}`
  }
}

const handleRowClick = (event, row) => {
  // Handle Vuetify row click event: { item: {...}, index: ... }
  if (row?.item) {
    selectCollection(row.item)
  } else if (row?.name) {
    // Fallback if item structure is different
    selectCollection(row)
  } else {
    // Try to find from DOM
    if (event?.target) {
      const rowElement = event.target.closest('tr')
      if (rowElement) {
        const nameCell = rowElement.querySelector('.collection-title')
        if (nameCell) {
          const collectionName = nameCell.textContent.trim()
          const collection = filteredCollections.value.find(c => c.name === collectionName)
          if (collection) {
            selectCollection(collection)
          }
        }
      }
    }
  }
}

const wrapInQuotes = () => {
  searchQuery.value = '"' + searchQuery.value + '"'
}

const handleCollectionSearch = async () => {
  if (!selectedCollection.value || !searchQuery.value?.trim()) {
    return
  }
  
  // Reset to first page when performing new search
  searchResultsPage.value = 1
  
  // Keep selectedCollection set - don't clear it during search
  searchPerformed.value = true
  searchError.value = null
  
  try {
    // Pass sort_by option to search
    await performSearch(selectedCollection.value, searchQuery.value, searchLimit.value, {
      sortBy: searchSortBy.value
    })
  } catch (err) {
    // Don't clear selectedCollection on error - keep search bar visible
    searchError.value = err.message || 'Search failed'
    console.error('Search error:', err)
  }
  
  // Ensure selectedCollection stays set after search
  if (!selectedCollection.value) {
    console.warn('selectedCollection was cleared during search - this should not happen')
  }
}

const onSearchSortChange = () => {
  // If we already have search results, re-search with new sort order
  if (searchPerformed.value && searchResults.value.length > 0 && selectedCollection.value && searchQuery.value?.trim()) {
    handleCollectionSearch()
  }
}

// Reset page when search results change
watch(() => searchResults.value.length, () => {
  searchResultsPage.value = 1
})


const closeSearch = () => {
  // Clear selected collection
  selectedCollection.value = null
  // Clear all search related data
  searchQuery.value = ''
  searchResults.value = []
  searchPerformed.value = false
  searchError.value = null
  searchLimit.value = 10
  // Search is now handled by header
  // Reset to original state - reload all collections to show original list
  const { sortBy: sb, sortOrder: so } = getCurrentSort()
  loadCollectionsAsync(null, sb, so)
  // Force reload to ensure we get all results back
  // Clear any existing timer first
  if (reloadTimer) {
    clearTimeout(reloadTimer)
  }
  reloadTimer = setTimeout(() => {
    const { sortBy: sb, sortOrder: so } = getCurrentSort()
    loadCollections(true, searchQuery.value || headerSearchQuery.value, sb, so)
    reloadTimer = null
  }, 100)
}

// Debounced search timer
let searchDebounceTimer = null
// Store setTimeout for cleanup
let reloadTimer = null

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  searchPerformed.value = false
  searchError.value = null
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
}

const onSearchQueryChange = (value) => {
  // If query is cleared, reset search
  if (!value || value.trim() === '') {
    // Clear any pending searches
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
    searchResults.value = []
    searchPerformed.value = false
    searchError.value = null
    return
  }
  
  // Clear existing timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  // Only auto-search if enabled
  if (!autoSearchEnabled.value) {
    return
  }
  
  // Improved debouncing: faster for short queries, longer for complex ones
  const queryLength = value.trim().length
  const debounceDelay = queryLength < 3 ? 800 : queryLength < 10 ? 400 : 300
  
  // Auto-search after debounce delay
  searchDebounceTimer = setTimeout(() => {
    if (selectedCollection.value && searchQuery.value?.trim()) {
      handleCollectionSearch()
    }
    searchDebounceTimer = null
  }, debounceDelay)
}

// Watch for sort changes and re-search if needed
watch(() => searchSortBy.value, () => {
  // Reset pagination when sort changes
  searchResultsPage.value = 1
  
  if (searchPerformed.value && searchResults.value.length > 0 && selectedCollection.value && searchQuery.value?.trim()) {
    // Debounce sort changes to avoid too many requests
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
    searchDebounceTimer = setTimeout(() => {
      handleCollectionSearch()
      searchDebounceTimer = null
    }, 300)
  }
})

const viewDocuments = () => {
  if (selectedCollection.value) {
    emit('view-documents', selectedCollection.value)
  }
}

// Toggle sort for a column - server-side sorting
const toggleSort = (columnKey) => {
  const currentIndex = sortBy.value.findIndex(key => key === columnKey)
  
  // Map column keys to API sort_by values
  const sortByMap = {
    'name': 'name',
    'num_documents': 'num_documents',
    'created_at': 'created_at'
  }
  
  // Get API sort_by value (default to columnKey if not in map)
  const apiSortBy = sortByMap[columnKey] || columnKey
  let newSortOrder = 'asc'
  
  if (currentIndex !== -1) {
    // Column is sorted - toggle direction
    const isDesc = sortDesc.value[currentIndex]
    newSortOrder = isDesc ? 'asc' : 'desc'
  }
  
  // Update local state for Vuetify table
  if (currentIndex === -1) {
    sortBy.value = [columnKey]
    sortDesc.value = [false]
  } else {
    sortDesc.value[currentIndex] = (newSortOrder === 'desc')
  }
  
  // Update current sort state
  currentSortBy.value = apiSortBy
  currentSortOrder.value = newSortOrder
  
  // Reload collections with new sort parameters (server-side sorting)
  loadCollections(true, searchQuery.value || headerSearchQuery.value, apiSortBy, newSortOrder)
}


const openDeleteDialog = (item) => {
  if (!item) {
    return
  }
  
  // Ensure we have a proper collection object
  let collection = item
  if (typeof item === 'string') {
    collection = collections.value.find(c => c && c.name === item) || { name: item }
  } else if (!item.name) {
    return
  }
  
  collectionToDelete.value = collection
  deleteError.value = null
  showDeleteDialog.value = true
}

const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  collectionToDelete.value = null
  deleteError.value = null
  deleting.value = false
}

const handleDeleteCollection = async () => {
  if (!collectionToDelete.value) return
  
  deleting.value = true
  deleteError.value = null
  
  try {
    // Get collection name safely
    const collectionName = collectionToDelete.value?.name || collectionToDelete.value
    
    if (!collectionName || (typeof collectionName === 'string' && collectionName.trim() === '')) {
      deleteError.value = 'Invalid collection name'
      deleting.value = false
      return
    }
    
    await deleteCollection(collectionName)
    toast.success(`Collection "${collectionName}" deleted successfully`, 'Collection Deleted')
    closeDeleteDialog()
    
    // Clear search if we deleted the selected collection
    if (selectedCollection.value === collectionName) {
      closeSearch()
    }
    
    // Reload collections
    const { sortBy: sb, sortOrder: so } = getCurrentSort()
    await loadCollections(true, searchQuery.value || headerSearchQuery.value, sb, so)
  } catch (err) {
    const errorMsg = extractSafeErrorMessage(err, 'Failed to delete collection')
    deleteError.value = errorMsg
    toast.error(errorMsg, 'Delete Failed')
  } finally {
    deleting.value = false
  }
}

// Watch collections to debug reactivity
onMounted(() => {
  // Load in background without blocking
  const { sortBy: sb, sortOrder: so } = getCurrentSort()
  loadCollectionsAsync(null, sb, so).catch((err) => {
    console.error('CollectionsView: Error loading collections:', err)
  })
})

// Cleanup on unmount
onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  if (reloadTimer) {
    clearTimeout(reloadTimer)
    reloadTimer = null
  }
})
</script>

<style scoped>
.collections-view {
  padding: 0;
  pointer-events: auto !important;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  user-select: auto !important;
}

.collections-card {
  overflow: hidden;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  outline: none !important;
  transition: all 0.2s ease !important;
  position: relative;
  width: 100%;
}

.collections-card :deep(.v-card) {
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.collections-card-top {
  margin-top: 0 !important;
}

.collections-table {
  width: 100% !important;
}

/* Force hover background on table rows - highest specificity */
.collections-table.v-data-table :deep(tbody tr:hover),
.collections-table.v-data-table :deep(tbody tr:hover td),
.collections-table.v-data-table :deep(.v-data-table__tbody tr:hover),
.collections-table.v-data-table :deep(.v-data-table__tbody tr:hover td),
.collections-table :deep(.v-table__wrapper tbody tr:hover),
.collections-table :deep(.v-table__wrapper tbody tr:hover td),
.collections-card .collections-table :deep(tbody tr:hover),
.collections-card .collections-table :deep(tbody tr:hover td),
.collections-card.collections-card-top .collections-table :deep(tbody tr:hover),
.collections-card.collections-card-top .collections-table :deep(tbody tr:hover td) {
  background: #f1f5f9 !important;
  background-color: #f1f5f9 !important;
}

/* Even more specific - target all possible Vuetify table structures */
.collections-view .collections-card .collections-table :deep(.v-data-table__wrapper tbody tr:hover),
.collections-view .collections-card .collections-table :deep(.v-data-table__wrapper tbody tr:hover td),
.collections-view .collections-card .collections-table :deep(.v-table tbody tr:hover),
.collections-view .collections-card .collections-table :deep(.v-table tbody tr:hover td) {
  background: #f1f5f9 !important;
  background-color: #f1f5f9 !important;
}

.collections-table :deep(.v-data-table),
.collections-card :deep(.v-data-table) {
  width: 100% !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
}

.collections-card :deep(.v-card-text) {
  padding: 0 !important;
  margin: 0 !important;
}

.collections-table :deep(.v-table__wrapper),
.collections-table :deep(.v-data-table__wrapper) {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
}

.collections-card :deep(.v-card),
.collections-card :deep(.v-data-table),
.collections-card :deep(.v-data-table__wrapper),
.collections-card :deep(.v-table__wrapper) {
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.collections-card {
  box-shadow: none !important;
}

/* Ensure wrapper doesn't add any background that could show through */
.collections-table :deep(.v-data-table__wrapper .v-data-table__thead),
.collections-table :deep(.v-table__wrapper .v-data-table__thead) {
  background: #032548 !important;
  background-color: #032548 !important;
  border-top: 1px solid #032548 !important;
}

.collections-card::before {
  display: none;
}

.collections-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
}

/* Override global design-system.css styles - ensure #1e293b background */
.collections-table :deep(.v-data-table__thead),
.collections-view .collections-table :deep(.v-data-table__thead),
.collections-card .collections-table :deep(.v-data-table__thead) {
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  background-color: #032a4f !important;
  border-radius: 0 !important;
  margin-bottom: 0 !important;
  border: none !important;
  border-top: none !important;
}

.collections-table :deep(.v-data-table__thead tr),
.collections-view .collections-table :deep(.v-data-table__thead tr),
.collections-card .collections-table :deep(.v-data-table__thead tr) {
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  background-color: #032a4f !important;
}

.collections-table :deep(.v-data-table__thead th),
.collections-view .collections-table :deep(.v-data-table__thead th),
.collections-card .collections-table :deep(.v-data-table__thead th),
.collections-view .collections-card .collections-table :deep(.v-data-table__thead th),
.collections-table.v-data-table :deep(.v-data-table__thead th),
.collections-view .collections-card .collections-table.v-data-table :deep(.v-data-table__thead th) {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  font-size: 13px !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  padding: 16px !important;
  border-bottom: none !important;
  cursor: pointer !important;
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  background-color: #032a4f !important;
  transition: all 0.2s ease !important;
}

.collections-table :deep(.v-data-table__thead th),
.collections-view .collections-table :deep(.v-data-table__thead th),
.collections-card .collections-table :deep(.v-data-table__thead th),
.collections-view .collections-card .collections-table :deep(.v-data-table__thead th),
.collections-table.v-data-table :deep(.v-data-table__thead th),
.collections-view .collections-card .collections-table.v-data-table :deep(.v-data-table__thead th),
.collections-table :deep(.v-data-table__thead th span),
.collections-view .collections-table :deep(.v-data-table__thead th span),
.collections-card .collections-table :deep(.v-data-table__thead th span),
.collections-table :deep(.v-data-table__thead th .column-header-clickable),
.collections-view .collections-table :deep(.v-data-table__thead th .column-header-clickable),
.collections-card .collections-table :deep(.v-data-table__thead th .column-header-clickable),
.collections-table :deep(.v-data-table__thead th .column-header-clickable span),
.collections-view .collections-table :deep(.v-data-table__thead th .column-header-clickable span),
.collections-card .collections-table :deep(.v-data-table__thead th .column-header-clickable span),
.collections-table :deep(.v-data-table__thead th *),
.collections-view .collections-table :deep(.v-data-table__thead th *),
.collections-card .collections-table :deep(.v-data-table__thead th *),
.collections-table :deep(.v-data-table__thead th) *,
.collections-view .collections-table :deep(.v-data-table__thead th) *,
.collections-card .collections-table :deep(.v-data-table__thead th) * {
  text-transform: none !important;
  color: #ffffff !important;
  background: transparent !important;
  background-color: transparent !important;
}

.column-header-clickable {
  cursor: pointer !important;
  user-select: none !important;
  transition: all 0.2s ease !important;
  width: 100% !important;
}

.column-header-clickable:hover {
  opacity: 0.8 !important;
}

.collections-table :deep(.v-data-table__thead th .header-icon) {
  color: #ffffff !important;
  opacity: 1 !important;
}

.collections-table :deep(.v-data-table__thead th .v-icon) {
  color: #ffffff !important;
  opacity: 1 !important;
}

.collections-table :deep(.v-data-table__thead th .sort-icon) {
  color: #ffffff !important;
  opacity: 1 !important;
  margin-left: 4px !important;
}

/* Override global hover styles - ensure consistent #334155 on hover */
.collections-table :deep(.v-data-table__thead th:hover),
.collections-view .collections-table :deep(.v-data-table__thead th:hover),
.collections-card .collections-table :deep(.v-data-table__thead th:hover) {
  background: #135893 !important;
  background-color: #135893 !important;
}

.collections-table :deep(.v-data-table__thead th.column-header-clickable:hover),
.collections-view .collections-table :deep(.v-data-table__thead th.column-header-clickable:hover),
.collections-card .collections-table :deep(.v-data-table__thead th.column-header-clickable:hover) {
  background: #135893 !important;
  background-color: #135893 !important;
}

/* Sort icon container - User-friendly sorting indicators */
.sort-icon-container {
  display: flex !important;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  min-width: 24px;
  opacity: 1 !important;
}

.sort-icon {
  transition: all 0.2s ease !important;
  opacity: 1 !important;
}

.sort-icon-active {
  color: #ffffff !important;
  opacity: 1 !important;
  font-weight: bold !important;
}

.sort-icon-inactive {
  color: #ffffff !important;
  opacity: 0.6 !important;
  transition: all 0.2s ease !important;
}

.column-header-clickable:hover .sort-icon-inactive {
  color: #ffffff !important;
  opacity: 0.9 !important;
  transform: scale(1.1) !important;
}

.column-header-clickable:active .sort-icon {
  transform: scale(0.95) !important;
}

/* Sort icons container for Created column - Legacy support */
.sort-icons-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin-left: 4px;
  opacity: 1;
}

.collections-table :deep(.v-data-table__thead th:hover .sort-icons-container) {
  opacity: 1 !important;
}

.sort-icon-up,
.sort-icon-down {
  color: #ffffff !important;
  opacity: 1 !important;
}

.collections-table :deep(.v-data-table__thead th:first-child) {
  padding-left: 16px !important;
}

.collections-table :deep(.v-data-table__thead th:last-child) {
  padding-right: 16px !important;
}

.collections-table :deep(.v-data-table__tbody) {
  background: #ffffff !important;
  padding: 0 !important;
}

/* Global hover rule for all table rows - highest priority */
.collections-table :deep(tbody tr:hover),
.collections-table :deep(tbody tr:hover td),
.collections-table :deep(.v-data-table__tbody tr:hover),
.collections-table :deep(.v-data-table__tbody tr:hover td),
.collections-table :deep(.v-table__wrapper tbody tr:hover),
.collections-table :deep(.v-table__wrapper tbody tr:hover td) {
  background: #f1f5f9 !important;
  background-color: #f1f5f9 !important;
}

.collections-table :deep(.v-data-table__tbody tr) {
  cursor: pointer !important;
  transition: background-color var(--transition-fast) !important;
  border: none !important;
  border-radius: 0 !important;
  transform: none !important;
  margin-bottom: 0 !important;
  background: #ffffff !important;
  box-shadow: none !important;
  border-top: none !important;
  border-bottom: none !important;
  position: relative !important;
  outline: none !important;
}

/* Remove blue border on focus/selection */
.collections-table :deep(.v-data-table__tbody tr:focus),
.collections-table :deep(.v-data-table__tbody tr:focus-visible),
.collections-table :deep(.v-data-table__tbody tr:focus-within),
.collections-table :deep(.v-data-table tbody tr:focus),
.collections-table :deep(.v-data-table tbody tr:focus-visible),
.collections-table :deep(.v-data-table tbody tr:focus-within) {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

.collections-table :deep(.v-data-table__tbody tr:focus td),
.collections-table :deep(.v-data-table__tbody tr:focus-visible td),
.collections-table :deep(.v-data-table__tbody tr:focus-within td),
.collections-table :deep(.v-data-table tbody tr:focus td),
.collections-table :deep(.v-data-table tbody tr:focus-visible td),
.collections-table :deep(.v-data-table tbody tr:focus-within td) {
  outline: none !important;
  border: none !important;
}

/* Remove selected state border - override design-system.css */
.collections-table :deep(.v-data-table__tbody tr.v-data-table__tr--selected),
.collections-table :deep(.v-data-table tbody tr.v-data-table__tr--selected),
.collections-table :deep(.v-data-table__tbody tr[aria-selected="true"]),
.collections-table :deep(.v-data-table tbody tr[aria-selected="true"]),
.collections-table :deep(.v-table tbody tr.selected),
.collections-table :deep(table tbody tr.selected) {
  outline: none !important;
  border: none !important;
  border-left: none !important;
  box-shadow: none !important;
  background: #ffffff !important;
}

.collections-table :deep(.v-data-table__tbody tr.v-data-table__tr--selected:hover),
.collections-table :deep(.v-data-table tbody tr.v-data-table__tr--selected:hover),
.collections-table :deep(.v-data-table__tbody tr[aria-selected="true"]:hover),
.collections-table :deep(.v-data-table tbody tr[aria-selected="true"]:hover),
.collections-table :deep(.v-table tbody tr.selected:hover),
.collections-table :deep(table tbody tr.selected:hover) {
  outline: none !important;
  border: none !important;
  border-left: none !important;
  box-shadow: none !important;
  background: var(--gray-50) !important;
}

.collections-table :deep(.v-data-table__tbody tr.v-data-table__tr--selected td),
.collections-table :deep(.v-data-table tbody tr.v-data-table__tr--selected td),
.collections-table :deep(.v-data-table__tbody tr[aria-selected="true"] td),
.collections-table :deep(.v-data-table tbody tr[aria-selected="true"] td),
.collections-table :deep(.v-table tbody tr.selected td),
.collections-table :deep(table tbody tr.selected td) {
  outline: none !important;
  border: none !important;
  border-left: none !important;
}

.collections-table :deep(.v-data-table__tbody tr td) {
  transition: background-color 0.2s ease !important;
  background: transparent !important;
}

.collections-table :deep(.v-data-table__tbody tr::before) {
  display: none;
}

/* Man-page inspired hover effect - light blue background with bold text - ONLY on row hover, not individual elements */
.collections-table :deep(.v-data-table__tbody tr:hover),
.collections-table :deep(.v-data-table tbody tr:hover) {
  background: #e3f2fd !important;
  background-color: #e3f2fd !important;
  cursor: pointer !important;
  transform: none !important;
  box-shadow: none !important;
}

/* Apply background to cells only when row is hovered, not when individual elements are hovered */
.collections-table :deep(.v-data-table__tbody tr:hover td),
.collections-table :deep(.v-data-table tbody tr:hover td),
.collections-table :deep(.v-data-table__tbody tr:hover .v-data-table__td),
.collections-table :deep(.v-data-table tbody tr:hover .v-data-table__td) {
  background: #e3f2fd !important;
  background-color: #e3f2fd !important;
}

/* Remove any hover background from individual elements - they should be transparent */
.collections-table :deep(.v-data-table__tbody td router-link:hover),
.collections-table :deep(.v-data-table tbody td router-link:hover),
.collections-table :deep(.v-data-table__tbody td a:hover),
.collections-table :deep(.v-data-table tbody td a:hover),
.collections-table :deep(.v-data-table__tbody td span:hover),
.collections-table :deep(.v-data-table tbody td span:hover),
.collections-table :deep(.v-data-table__tbody td .document-count-text:hover),
.collections-table :deep(.v-data-table tbody td .document-count-text:hover),
.collections-table :deep(.v-data-table__tbody td .created-at-text:hover),
.collections-table :deep(.v-data-table tbody td .created-at-text:hover),
.collections-table :deep(.v-data-table__tbody td router-link:hover *),
.collections-table :deep(.v-data-table tbody td router-link:hover *),
.collections-table :deep(.v-data-table__tbody td a:hover *),
.collections-table :deep(.v-data-table tbody td a:hover *),
.collections-table :deep(.v-data-table__tbody td router-link:hover span),
.collections-table :deep(.v-data-table tbody td router-link:hover span),
.collections-table :deep(.v-data-table__tbody td a:hover span),
.collections-table :deep(.v-data-table tbody td a:hover span) {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

/* Override any blue background that might be applied to router-link or a elements on hover */
.collections-table :deep(.v-data-table__tbody td router-link),
.collections-table :deep(.v-data-table tbody td router-link),
.collections-table :deep(.v-data-table__tbody td a),
.collections-table :deep(.v-data-table tbody td a),
.collections-table :deep(.v-data-table__tbody td router-link *),
.collections-table :deep(.v-data-table tbody td router-link *),
.collections-table :deep(.v-data-table__tbody td a *),
.collections-table :deep(.v-data-table tbody td a *) {
  background: transparent !important;
  background-color: transparent !important;
}

.collections-table :deep(.v-data-table__tbody td router-link:hover),
.collections-table :deep(.v-data-table tbody td router-link:hover),
.collections-table :deep(.v-data-table__tbody td a:hover),
.collections-table :deep(.v-data-table tbody td a:hover),
.collections-table :deep(.v-data-table__tbody td router-link:focus),
.collections-table :deep(.v-data-table tbody td router-link:focus),
.collections-table :deep(.v-data-table__tbody td a:focus),
.collections-table :deep(.v-data-table tbody td a:focus),
.collections-table :deep(.v-data-table__tbody td router-link:hover *),
.collections-table :deep(.v-data-table tbody td router-link:hover *),
.collections-table :deep(.v-data-table__tbody td a:hover *),
.collections-table :deep(.v-data-table tbody td a:hover *) {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

/* Prevent any blue box from appearing when hovering over individual elements */
.collections-table :deep(.v-data-table__tbody td router-link),
.collections-table :deep(.v-data-table tbody td router-link),
.collections-table :deep(.v-data-table__tbody td a),
.collections-table :deep(.v-data-table tbody td a),
.collections-table :deep(.v-data-table__tbody td .document-count-link),
.collections-table :deep(.v-data-table tbody td .document-count-link),
.collections-table :deep(.v-data-table__tbody td .created-at-link),
.collections-table :deep(.v-data-table tbody td .created-at-link) {
  position: relative !important;
  background: transparent !important;
  background-color: transparent !important;
}

.collections-table :deep(.v-data-table__tbody td router-link::before),
.collections-table :deep(.v-data-table tbody td router-link::before),
.collections-table :deep(.v-data-table__tbody td a::before),
.collections-table :deep(.v-data-table tbody td a::before),
.collections-table :deep(.v-data-table__tbody td router-link::after),
.collections-table :deep(.v-data-table tbody td router-link::after),
.collections-table :deep(.v-data-table__tbody td a::after),
.collections-table :deep(.v-data-table tbody td a::after) {
  display: none !important;
  background: transparent !important;
  background-color: transparent !important;
}

/* Ensure document-count-link and created-at-link have no background on hover */
.collections-table :deep(.v-data-table__tbody td .document-count-link:hover),
.collections-table :deep(.v-data-table tbody td .document-count-link:hover),
.collections-table :deep(.v-data-table__tbody td .created-at-link:hover),
.collections-table :deep(.v-data-table tbody td .created-at-link:hover),
.collections-table :deep(.v-data-table__tbody td .document-count-link:focus),
.collections-table :deep(.v-data-table tbody td .document-count-link:focus),
.collections-table :deep(.v-data-table__tbody td .created-at-link:focus),
.collections-table :deep(.v-data-table tbody td .created-at-link:focus) {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

/* Ensure each column/cell shows light blue on row hover - stronger selectors */
.collections-table :deep(.v-data-table__tbody tr:hover td),
.collections-table :deep(.v-data-table tbody tr:hover td),
.collections-table :deep(.v-data-table__tbody tr:hover .v-data-table__td),
.collections-table :deep(.v-data-table tbody tr:hover .v-data-table__td) {
  background: #e3f2fd !important;
  background-color: #e3f2fd !important;
  color: var(--gray-900) !important;
  transition: background-color var(--transition-fast), color var(--transition-fast) !important;
  font-weight: bold !important;
  transform: none !important;
}

/* Ensure all child elements inside cells are transparent and bold on row hover */
.collections-table :deep(.v-data-table__tbody tr:hover td *),
.collections-table :deep(.v-data-table tbody tr:hover td *),
.collections-table :deep(.v-data-table__tbody tr:hover td span),
.collections-table :deep(.v-data-table tbody tr:hover td span) {
  background: transparent !important;
  background-color: transparent !important;
  font-weight: bold !important;
}

/* Ensure router-link and wrapper elements are transparent and normal weight on row hover */
.collections-table :deep(.v-data-table__tbody tr:hover td a),
.collections-table :deep(.v-data-table tbody tr:hover td a),
.collections-table :deep(.v-data-table__tbody tr:hover td router-link),
.collections-table :deep(.v-data-table tbody tr:hover td router-link),
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-name),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-name),
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-name-link),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-name-link) {
  background: transparent !important;
  background-color: transparent !important;
  font-weight: normal !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

/* Make all text elements normal weight on row hover - no bold effect */
.collections-table :deep(.v-data-table__tbody tr:hover td span),
.collections-table :deep(.v-data-table tbody tr:hover td span),
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-title),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-title),
.collections-table :deep(.v-data-table__tbody tr:hover td .document-count-text),
.collections-table :deep(.v-data-table tbody tr:hover td .document-count-text),
.collections-table :deep(.v-data-table__tbody tr:hover td .created-at-text),
.collections-table :deep(.v-data-table tbody tr:hover td .created-at-text),
.collections-table :deep(.v-data-table__tbody tr:hover td .index-number),
.collections-table :deep(.v-data-table tbody tr:hover td .index-number),
.collections-table :deep(.v-data-table__tbody tr:hover) .collection-title,
.collections-table :deep(.v-data-table tbody tr:hover) .collection-title,
.collections-table :deep(.v-data-table__tbody tr:hover) .document-count-text,
.collections-table :deep(.v-data-table tbody tr:hover) .document-count-text,
.collections-table :deep(.v-data-table__tbody tr:hover) .created-at-text,
.collections-table :deep(.v-data-table tbody tr:hover) .created-at-text,
.collections-table :deep(.v-data-table__tbody tr:hover) .index-number,
.collections-table :deep(.v-data-table tbody tr:hover) .index-number {
  font-weight: normal !important;
}

/* Keep buttons normal weight on row hover */
.collections-table :deep(.v-data-table__tbody tr:hover td .v-btn),
.collections-table :deep(.v-data-table tbody tr:hover td .v-btn),
.collections-table :deep(.v-data-table__tbody tr:hover td button),
.collections-table :deep(.v-data-table tbody tr:hover td button) {
  font-weight: normal !important;
}

.collections-table :deep(.v-data-table__tbody tr:hover::before) {
  display: none;
}

.collections-table :deep(.v-data-table__tbody tr:nth-child(even)) {
  background: #ffffff !important;
}

/* Even rows hover - light blue background with bold text */
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover .v-data-table__td),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover .v-data-table__td) {
  background: #bbdefb !important;
  background-color: #bbdefb !important;
  transform: none !important;
  box-shadow: none !important;
}

/* Ensure each column in even rows also shows light blue - stronger selectors */
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover .v-data-table__td),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover .v-data-table__td) {
  background: #bbdefb !important;
  background-color: #bbdefb !important;
  color: var(--gray-900) !important;
  transition: background-color var(--transition-fast), color var(--transition-fast) !important;
  font-weight: bold !important;
  transform: none !important;
}

/* Ensure all child elements inside even row cells are transparent and normal weight on hover */
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td *),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td *),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td span),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td span) {
  background: transparent !important;
  background-color: transparent !important;
  font-weight: normal !important;
}

/* Ensure router-link and other wrapper elements are transparent and normal weight on even row hover */
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td a),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td a),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td router-link),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td router-link),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .collection-name),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .collection-name),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .collection-name-link),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .collection-name-link) {
  background: transparent !important;
  background-color: transparent !important;
  font-weight: normal !important;
}

/* Make all text elements bold on even row hover - maximum specificity */
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td span),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td span),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .collection-title),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .collection-title),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .document-count-text),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .document-count-text),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .created-at-text),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .created-at-text),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .index-number),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .index-number),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover) .collection-title,
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover) .collection-title,
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover) .document-count-text,
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover) .document-count-text,
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover) .created-at-text,
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover) .created-at-text,
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover) .index-number,
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover) .index-number {
  font-weight: 700 !important;
  font-weight: bold !important;
}

/* Keep buttons normal weight on even row hover */
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .v-btn),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .v-btn),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td button),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td button) {
  font-weight: normal !important;
}

.collections-table :deep(.v-data-table__tbody tr:last-child) {
  border-bottom: none !important;
}

.collections-table :deep(.v-data-table__tbody td) {
  padding: 16px !important;
  border-bottom: none !important;
  vertical-align: middle !important;
  background: transparent !important;
  background-color: transparent !important;
  transition: background-color 0.15s ease !important;
}

/* Force hover background on all table cells when row is hovered - light blue */
.collections-table :deep(.v-data-table__tbody tr:hover td),
.collections-table :deep(.v-data-table tbody tr:hover td) {
  background: #e3f2fd !important;
  background-color: #e3f2fd !important;
  font-weight: bold !important;
}

/* Ensure all child elements inside cells are transparent and bold on row hover so row background shows */
.collections-table :deep(.v-data-table__tbody tr:hover td *),
.collections-table :deep(.v-data-table tbody tr:hover td *),
.collections-table :deep(.v-data-table__tbody tr:hover td span),
.collections-table :deep(.v-data-table tbody tr:hover td span) {
  background: transparent !important;
  background-color: transparent !important;
  font-weight: bold !important;
}

/* Ensure router-link and other wrapper elements are transparent and normal weight on row hover */
.collections-table :deep(.v-data-table__tbody tr:hover td a),
.collections-table :deep(.v-data-table tbody tr:hover td a),
.collections-table :deep(.v-data-table__tbody tr:hover td router-link),
.collections-table :deep(.v-data-table tbody tr:hover td router-link),
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-name),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-name),
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-name-link),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-name-link) {
  background: transparent !important;
  background-color: transparent !important;
  font-weight: normal !important;
  text-decoration: none !important;
  transform: none !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

.collections-table :deep(.v-data-table__tbody td:first-child) {
  padding-left: 16px !important;
}

.collections-table :deep(.v-data-table__tbody td:last-child) {
  padding-right: 16px !important;
}

.collections-table :deep(.v-data-table__tbody tr:last-child td) {
  border-bottom: none;
}

.index-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.index-number {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 15px;
  font-weight: 400 !important;
  color: #1e293b !important;
}

/* Override font-weight on hover - must be after base styles */
.collections-table :deep(.v-data-table__tbody tr:hover td .index-number),
.collections-table :deep(.v-data-table tbody tr:hover td .index-number),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .index-number),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .index-number) {
  font-weight: 700 !important;
}

.collection-name-wrapper {
  background: transparent !important;
  background-color: transparent !important;
  transform: none !important;
  transition: none !important;
}

/* Remove individual hover effects from internal elements - only row hover should work */
.collections-table :deep(.v-data-table__tbody td router-link:hover),
.collections-table :deep(.v-data-table tbody td router-link:hover),
.collections-table :deep(.v-data-table__tbody td a:hover),
.collections-table :deep(.v-data-table tbody td a:hover),
.collections-table :deep(.v-data-table__tbody td .document-count-text:hover),
.collections-table :deep(.v-data-table tbody td .document-count-text:hover),
.collections-table :deep(.v-data-table__tbody td .created-at-text:hover),
.collections-table :deep(.v-data-table tbody td .created-at-text:hover),
.collections-table :deep(.v-data-table__tbody td .index-cell:hover),
.collections-table :deep(.v-data-table tbody td .index-cell:hover),
.collections-table :deep(.v-data-table__tbody td .collection-name-wrapper:hover),
.collections-table :deep(.v-data-table tbody td .collection-name-wrapper:hover) {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

/* Ensure router-link and spans don't create their own hover boxes */
.collections-table :deep(.v-data-table__tbody td router-link),
.collections-table :deep(.v-data-table tbody td router-link),
.collections-table :deep(.v-data-table__tbody td a),
.collections-table :deep(.v-data-table tbody td a),
.collections-table :deep(.v-data-table__tbody td router-link *),
.collections-table :deep(.v-data-table tbody td router-link *),
.collections-table :deep(.v-data-table__tbody td a *),
.collections-table :deep(.v-data-table tbody td a *) {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
  display: block !important;
}

.collections-table :deep(.v-data-table__tbody td router-link:hover),
.collections-table :deep(.v-data-table tbody td router-link:hover),
.collections-table :deep(.v-data-table__tbody td a:hover),
.collections-table :deep(.v-data-table tbody td a:hover),
.collections-table :deep(.v-data-table__tbody td router-link:hover *),
.collections-table :deep(.v-data-table tbody td router-link:hover *),
.collections-table :deep(.v-data-table__tbody td a:hover *),
.collections-table :deep(.v-data-table tbody td a:hover *) {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Remove any blue background from router-link on hover - override all possible styles */
.collections-table :deep(.v-data-table__tbody td router-link),
.collections-table :deep(.v-data-table tbody td router-link),
.collections-table :deep(.v-data-table__tbody td a),
.collections-table :deep(.v-data-table tbody td a) {
  background: transparent !important;
  background-color: transparent !important;
}

.collections-table :deep(.v-data-table__tbody td router-link:hover),
.collections-table :deep(.v-data-table tbody td router-link:hover),
.collections-table :deep(.v-data-table__tbody td a:hover),
.collections-table :deep(.v-data-table tbody td a:hover),
.collections-table :deep(.v-data-table__tbody td router-link:focus),
.collections-table :deep(.v-data-table tbody td router-link:focus),
.collections-table :deep(.v-data-table__tbody td a:focus),
.collections-table :deep(.v-data-table tbody td a:focus),
.collections-table :deep(.v-data-table__tbody td router-link:active),
.collections-table :deep(.v-data-table tbody td router-link:active),
.collections-table :deep(.v-data-table__tbody td a:active),
.collections-table :deep(.v-data-table tbody td a:active) {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  transform: none !important;
}

/* Allow router-link (rendered as <a>) to handle pointer events naturally */
.collection-name-wrapper,
.collection-name-wrapper a,
.collections-table :deep(.collection-name-wrapper),
.collections-table :deep(.collection-name-wrapper a),
.collections-table :deep(router-link),
.collections-table :deep(router-link a) {
  pointer-events: auto !important;
  display: block;
  text-decoration: none;
  cursor: pointer;
  outline: none !important;
  border: none !important;
  transform: none !important;
  box-shadow: none !important;
  transition: none !important;
}

/* Remove focus/active outlines and borders - comprehensive coverage */
.collections-table :deep(router-link a:focus),
.collections-table :deep(router-link a:active),
.collections-table :deep(router-link a:focus-visible),
.collections-table :deep(.collection-name-wrapper a:focus),
.collections-table :deep(.collection-name-wrapper a:active),
.collections-table :deep(.collection-name-wrapper a:focus-visible),
.collections-table :deep(router-link:focus),
.collections-table :deep(router-link:active),
.collections-table :deep(router-link:focus-visible),
.collections-table :deep(td:has(router-link a:focus)),
.collections-table :deep(td:has(.collection-name-wrapper a:focus)),
.collections-table :deep(.collection-name-wrapper:focus),
.collections-table :deep(.collection-name-wrapper:focus-visible),
.collections-table :deep(.collection-name-wrapper:active) {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  transform: none !important;
}

/* Remove blue border from link elements when right-clicked/focused */
.collections-table :deep(a:focus),
.collections-table :deep(a:active),
.collections-table :deep(a:focus-visible),
.collections-table :deep(router-link a),
.collections-table :deep(.collection-name-wrapper a) {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  transform: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

/* Remove borders from table cells when router-link is focused */
.collections-table :deep(.v-data-table__tbody td:has(router-link a:focus)),
.collections-table :deep(.v-data-table tbody td:has(router-link a:focus)),
.collections-table :deep(.v-data-table__tbody td:has(.collection-name-wrapper a:focus)),
.collections-table :deep(.v-data-table tbody td:has(.collection-name-wrapper a:focus)),
.collections-table :deep(.v-data-table__tbody tr:has(router-link a:focus)),
.collections-table :deep(.v-data-table tbody tr:has(router-link a:focus)),
.collections-table :deep(.v-data-table__tbody tr:has(.collection-name-wrapper a:focus)),
.collections-table :deep(.v-data-table tbody tr:has(.collection-name-wrapper a:focus)) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Remove Vuetify default focus styles on table rows/cells - comprehensive */
.collections-table :deep(.v-data-table__tbody tr:focus),
.collections-table :deep(.v-data-table__tbody tr:focus-visible),
.collections-table :deep(.v-data-table__tbody tr:focus-within),
.collections-table :deep(.v-data-table tbody tr:focus),
.collections-table :deep(.v-data-table tbody tr:focus-visible),
.collections-table :deep(.v-data-table tbody tr:focus-within),
.collections-table :deep(.v-data-table__tbody td:focus),
.collections-table :deep(.v-data-table__tbody td:focus-visible),
.collections-table :deep(.v-data-table tbody td:focus),
.collections-table :deep(.v-data-table tbody td:focus-visible),
.collections-table :deep(.v-data-table__tbody tr:focus td),
.collections-table :deep(.v-data-table__tbody tr:focus-visible td),
.collections-table :deep(.v-data-table__tbody tr:focus-within td),
.collections-table :deep(.v-data-table tbody tr:focus td),
.collections-table :deep(.v-data-table tbody tr:focus-visible td),
.collections-table :deep(.v-data-table tbody tr:focus-within td) {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* Ensure router-link <a> tags can receive all browser events */
.collections-table :deep(router-link a),
.collections-table :deep(.collection-name-wrapper a) {
  pointer-events: auto !important;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
}

.collection-name,
.collection-name-link {
  transition: color 0.2s ease !important;
  position: relative;
  z-index: 1;
  cursor: pointer !important;
  background: transparent !important;
  background-color: transparent !important;
  transform: none !important;
}

.collection-name:hover .collection-title,
.collection-name-link:hover .collection-title {
  font-weight: normal !important;
  text-decoration: none !important;
  transform: none !important;
}

.collection-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
  color: #1e293b !important;
  transition: all 0.2s ease;
  background: transparent !important;
  background-color: transparent !important;
}

/* Override font-weight on hover - normal weight, no effects */
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-title),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-title),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .collection-title),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .collection-title) {
  font-weight: normal !important;
  background: transparent !important;
  background-color: transparent !important;
  text-decoration: none !important;
  transform: none !important;
}

/* Ensure collection-title is always transparent and normal on row hover - no effects */
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-title),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-title),
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-name-link),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-name-link),
.collections-table :deep(.v-data-table__tbody tr:hover td .collection-name-wrapper),
.collections-table :deep(.v-data-table tbody tr:hover td .collection-name-wrapper),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .collection-title),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .collection-title),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .collection-name-link),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .collection-name-link),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .collection-name-wrapper),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .collection-name-wrapper) {
  background: transparent !important;
  background-color: transparent !important;
  font-weight: normal !important;
  text-decoration: none !important;
  transform: none !important;
}

.document-count-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px;
  font-weight: 400 !important;
  color: #1e293b !important;
  padding: 0;
  background: transparent;
}

/* Override font-weight on hover - must be after base styles */
.collections-table :deep(.v-data-table__tbody tr:hover td .document-count-text),
.collections-table :deep(.v-data-table tbody tr:hover td .document-count-text),
.collections-table :deep(.v-data-table__tbody tr:nth-child(even):hover td .document-count-text),
.collections-table :deep(.v-data-table tbody tr:nth-child(even):hover td .document-count-text) {
  font-weight: 700 !important;
}

.created-at-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px;
  font-weight: 400 !important;
  color: #1e293b !important;
  padding: 0;
  background: transparent;
}

.action-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
}


.collections-table :deep(.v-data-table__loading) {
  background-color: rgba(255, 255, 255, 0.9);
}

/* Empty state styling */
.collections-table :deep(.v-data-table__empty-wrapper) {
  padding: 60px 20px;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .collections-table :deep(.v-data-table__thead th),
  .collections-table :deep(.v-data-table__tbody td) {
    padding: 12px 8px !important;
    font-size: 12px;
  }
}

/* Suggested JSON styling */
.suggested-json {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  margin: 8px 0;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
  color: #333;
}

/* Collections Actions Bar - Clean with title on left */
.collections-header {
  margin-top: 0 !important;
  margin-bottom: 32px !important;
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
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  flex-direction: column;
}

.collections-title-section > div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.collections-header-actions {
  display: flex !important;
  gap: 8px !important;
  align-items: center !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

/* Collections action buttons - Same style as CollectionDocumentsView */
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
  
  /* 3D gradient background with #043061 */
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  
  /* Multi-layer 3D shadow effect - raised appearance */
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  
  /* Slight 3D transform */
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

.collections-action-btn:active {
  background: linear-gradient(135deg, #032a4f 0%, #021d3a 50%, #011528 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow: 
    0 2px 4px rgba(4, 48, 97, 0.4),
    0 1px 2px rgba(4, 48, 97, 0.3),
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

/* Allow prepend icon for Create Collection button in header */
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

.collections-pagination-info-top .v-icon {
  color: #64748b !important;
  opacity: 0.7 !important;
}

/* ----------------------------------------------------------------====
   UNIFIED BUTTON SYSTEM - Modern & Consistent
   ----------------------------------------------------------------==== */

/* Base unified button styles */
.unified-btn {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  border-radius: 8px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  min-width: auto !important;
}

/* Primary buttons - Main actions */
.unified-btn-primary {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2) !important;
  padding: 10px 20px !important;
  height: 40px !important;
  font-size: 14px !important;
}

.unified-btn-primary:hover {
  background: linear-gradient(135deg, #1e88e5 0%, #1976d2 100%) !important;
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.3) !important;
  transform: translateY(-1px) !important;
}

.unified-btn-primary:active {
  transform: translateY(0) !important;
  box-shadow: 0 1px 2px rgba(25, 118, 210, 0.2) !important;
}

.unified-btn-primary:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
}

/* Secondary buttons - Text style */
.unified-btn-secondary {
  color: #1976d2 !important;
  background: transparent !important;
  padding: 10px 16px !important;
  height: 40px !important;
  font-size: 14px !important;
}

.unified-btn-secondary:hover {
  background: rgba(25, 118, 210, 0.08) !important;
  color: #1565c0 !important;
}

.unified-btn-secondary:active {
  background: rgba(25, 118, 210, 0.12) !important;
}

/* Danger buttons - Delete actions */
.unified-btn-danger {
  background: #850f0f !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(133, 15, 15, 0.2) !important;
  padding: 10px 20px !important;
  height: 40px !important;
  font-size: 14px !important;
}

.unified-btn-danger:hover {
  background: #6d0c0c !important;
  box-shadow: 0 4px 8px rgba(133, 15, 15, 0.3) !important;
  transform: none !important;
}

.unified-btn-danger:active {
  transform: none !important;
  box-shadow: 0 1px 2px rgba(133, 15, 15, 0.2) !important;
}

/* Icon buttons - Consistent icon style */
.unified-btn-icon {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  padding: 0 !important;
  color: #64748b !important;
  background: transparent !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.unified-btn-icon:hover:not(.unified-btn-icon-danger) {
  background: #f1f5f9 !important;
  color: #1976d2 !important;
}

.unified-btn-icon:active:not(.unified-btn-icon-danger) {
  background: #e2e8f0 !important;
}

/* Icon button with danger state */
.unified-btn-icon-danger {
  color: #64748b !important;
}

.unified-btn-icon.unified-btn-icon-danger:hover,
.unified-btn-icon-danger:hover {
  background: #fee2e2 !important;
  color: #850f0f !important;
}

.unified-btn-icon.unified-btn-icon-danger:active,
.unified-btn-icon-danger:active {
  background: #fecaca !important;
}

/* Button content and icon spacing */
.unified-btn :deep(.v-btn__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  width: 100% !important;
  height: 100% !important;
}

.unified-btn :deep(.v-btn__prepend-inner),
.unified-btn :deep(.v-btn__append-inner) {
  margin: 0 !important;
}

.unified-btn :deep(.v-icon) {
  font-size: 20px !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Ensure icon buttons are perfectly centered */
.unified-btn-icon :deep(.v-btn__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.unified-btn-icon :deep(.v-icon) {
  margin: 0 auto !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Tooltip is now outside button, so no special handling needed */

/* Legacy button classes - use unified-btn-primary instead */
.action-btn-green,
.action-btn-dark-blue {
  /* Handled by unified-btn classes */
}

/* Header actions container */
.collections-header-actions {
  display: flex !important;
  gap: 12px !important;
  align-items: center !important;
}

/* Responsive adjustments for header actions */

@media (max-width: 960px) {
  .collections-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 16px !important;
  }
  
  .collections-header-actions {
    margin-left: 0 !important;
    width: 100% !important;
    justify-content: flex-end !important;
  }
  
  .header-action-btn {
    font-size: 13px !important;
    padding: 8px 16px !important;
    min-height: 40px !important;
  }
}

@media (max-width: 600px) {
  .collections-header-actions {
    flex-direction: column !important;
    width: 100% !important;
  }
  
  .header-action-btn {
    width: 100% !important;
  }
}

.collections-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 700 !important;
  font-size: 18px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-total-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 13px !important;
  line-height: 1.2 !important;
  color: #000000 !important;
  margin: 2px 0 0 0 !important;
  padding: 0 !important;
}

.collections-total-text .collections-dir-icon {
  color: #94a3b8 !important;
  margin-right: 6px;
  vertical-align: middle;
}


.collections-count-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  color: #64748b !important;
  letter-spacing: -0.01em !important;
}

/* Collections Pagination Info Top */
.collections-pagination-info-top {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  color: #64748b !important;
  margin: 0 !important;
  padding: 0 !important;
  margin-top: 0 !important;
  margin-left: 0 !important;
}

/* Collections Pagination Footer - Google Style */
.collections-pagination-footer-google {
  display: flex;
  justify-content: center;
  align-items: center;
  border-top: none !important;
  background: #ffffff;
}

.pagination-info-google {
  font-family: arial, sans-serif;
  font-weight: 400;
  font-size: 14px;
  color: #70757a;
  white-space: nowrap;
}

/* Google-style pagination */
.custom-pagination {
  display: flex;
  align-items: center;
  gap: 0;
}

.pagination-numbers {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0 8px;
}

/* Google-style page number buttons */
.pagination-number-google {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-family: arial, sans-serif;
  font-weight: 400;
  font-size: 14px;
  color: #1a0dab;
  cursor: pointer;
  transition: background-color 0.1s ease;
  padding: 0 8px;
  margin: 0 2px;
  text-decoration: none;
  user-select: none;
}

.pagination-number-google:hover {
  background-color: #f1f3f4;
  text-decoration: underline;
}

.pagination-number-google.active {
  background-color: #1976d3;
  color: #ffffff;
  font-weight: 500;
  cursor: default;
  text-decoration: none;
}

.pagination-number-google.active:hover {
  background-color: #1976d3;
  text-decoration: none;
}

/* Ellipsis styling */
.pagination-ellipsis {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: arial, sans-serif;
  font-size: 14px;
  color: #70757a;
  padding: 0 4px;
  margin: 0 2px;
  user-select: none;
}

/* Google-style Previous/Next buttons */
.pagination-nav-btn-google {
  min-width: 70px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-family: arial, sans-serif;
  font-weight: 400;
  font-size: 14px;
  color: #1a0dab;
  cursor: pointer;
  transition: background-color 0.1s ease;
  padding: 0 12px;
  margin: 0 2px;
  user-select: none;
}

.pagination-nav-btn-google:hover:not(:disabled) {
  background-color: #f1f3f4;
}

.pagination-nav-btn-google:disabled {
  color: #dadce0;
  cursor: default;
  pointer-events: none;
}

.pagination-nav-text {
  display: inline-block;
}

/* Buttons container - positioned far right */
.collections-buttons-container {
  display: flex !important;
  gap: 20px !important;
  margin-left: auto !important;
  align-items: center !important;
}

/* Legacy 3D button - use unified-btn-primary instead */
.action-button-3d {
  /* Handled by unified-btn-primary */
}

/* Legacy button classes - now use unified-btn */
.view-action-button,
.delete-action-button {
  /* These are now handled by unified-btn-icon classes */
}

/* Collection Icon */
.collection-icon-avatar {
  flex-shrink: 0;
}

/* Navigation tabs spacing - Much more space */
.navigation-tabs {
  gap: 32px !important;
}

.nav-tab-btn {
  margin-right: 0 !important;
  padding: 12px 24px !important;
  min-width: auto !important;
  font-size: 15px !important;
}

/* Google-style search bar */
.google-search-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 0;
}

.google-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  background: #f1f3f4;
  border: 1px solid #f1f3f4;
  border-radius: 24px;
  padding: 8px 16px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.google-search-wrapper:hover {
  background: #e8eaed;
  border-color: #e8eaed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.google-search-wrapper:focus-within {
  background: #ffffff;
  border-color: #dfe1e5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.google-search-icon {
  margin-right: 12px;
  opacity: 0.6;
  flex-shrink: 0;
}

.google-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: #202124;
  padding: 4px 0;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
}

.google-search-input::placeholder {
  color: #9aa0a6;
}

.google-search-clear {
  margin-left: 12px;
  opacity: 0.6;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}

.google-search-clear:hover {
  opacity: 1;
}

.google-search-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  color: #70757a;
  font-size: 14px;
}

.search-result-count {
  color: #70757a;
  font-size: 14px;
}

/* Improved pagination - Clean, shows all pages */
.collections-table :deep(.v-data-table-footer) {
  padding: 20px 24px;
  border-top: none !important;
  background: #ffffff;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page) {
  display: flex !important;
  align-items: center !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  color: #64748b !important;
  font-size: 14px !important;
  min-width: 200px;
  gap: 8px;
  position: relative;
}

.collections-table :deep(.v-data-table-footer__items-per-page::before) {
  display: none;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-select) {
  margin-left: 0;
  min-width: 100px;
  max-width: 120px;
}

/* Sophisticated items per page selector styling */
.collections-table :deep(.v-data-table-footer__items-per-page .v-field) {
  background: #ffffff !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  padding: 0 12px !important;
  min-height: 36px !important;
  height: 36px !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-field:hover) {
  border-color: #cbd5e1 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-1px);
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-field--focused) {
  border-color: #1976d2 !important;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1), 0 4px 12px rgba(0, 0, 0, 0.12) !important;
  transform: translateY(-1px);
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-field__input) {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #1e293b !important;
  padding: 0 !important;
  min-height: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-field__append-inner) {
  padding: 0 !important;
  margin: 0 !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-field__append-inner .v-icon) {
  color: #64748b !important;
  transition: all 0.2s ease !important;
  font-size: 20px !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-field:hover .v-field__append-inner .v-icon) {
  color: #1976d2 !important;
  transform: scale(1.1);
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-field--focused .v-field__append-inner .v-icon) {
  color: #1976d2 !important;
  transform: rotate(180deg);
}

/* Menu/dropdown styling */
.collections-table :deep(.v-data-table-footer__items-per-page .v-menu__content) {
  border-radius: 8px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  border: 1px solid #e2e8f0 !important;
  margin-top: 4px !important;
  overflow: hidden !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-list) {
  padding: 4px !important;
  background: #ffffff !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-list-item) {
  border-radius: 6px !important;
  margin: 2px 0 !important;
  padding: 8px 16px !important;
  min-height: 36px !important;
  transition: all 0.2s ease !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  color: #1e293b !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-list-item:hover) {
  background: #f1f5f9 !important;
  color: #1976d2 !important;
  transform: translateX(4px);
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-list-item--active) {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3) !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-list-item--active:hover) {
  background: linear-gradient(135deg, #1e88e5 0%, #1976d2 100%) !important;
  transform: translateX(4px);
}

/* Add subtle pulse animation on focus */
@keyframes items-per-page-pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1), 0 4px 12px rgba(0, 0, 0, 0.12);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.15), 0 6px 16px rgba(0, 0, 0, 0.15);
  }
}

.collections-table :deep(.v-data-table-footer__items-per-page .v-field--focused) {
  animation: items-per-page-pulse 2s ease-in-out infinite;
}

/* Enhanced text label styling */
.collections-table :deep(.v-data-table-footer__items-per-page > span) {
  font-weight: 600 !important;
  letter-spacing: 0.01em !important;
  color: #475569 !important;
  transition: color 0.2s ease !important;
}

.collections-table :deep(.v-data-table-footer__items-per-page:hover > span) {
  color: #1e293b !important;
}

.collections-table :deep(.v-data-table-footer__pagination) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px;
  flex: 1;
}

.collections-table :deep(.v-data-table-footer__info) {
  display: flex !important;
  align-items: center !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  color: #64748b !important;
  font-size: 14px !important;
}

.collections-table :deep(.v-btn--icon) {
  border-radius: 8px;
  width: 40px;
  height: 40px;
  color: #64748b;
  background: transparent !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  transition: all 0.2s ease;
}

.collections-table :deep(.v-btn--icon:hover) {
  background: #f1f5f9 !important;
  color: #1976d3 !important;
}

.collections-table :deep(.v-btn--icon:disabled) {
  opacity: 0.3 !important;
  cursor: not-allowed !important;
}

.collections-table :deep(.v-pagination) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px;
  flex-wrap: wrap;
  width: 100%;
}

/* Force pagination to show all pages */
.collections-table :deep(.v-pagination__list) {
  display: flex !important;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 100%;
}

/* Ensure pagination items are visible */
.collections-table :deep(.v-pagination__item) {
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  min-width: 40px;
  height: 40px;
  border-radius: 8px;
  color: #64748b;
  font-size: 14px;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  background: transparent !important;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.collections-table :deep(.v-pagination__item:hover) {
  background: #f1f5f9 !important;
  color: #1976d3 !important;
  border-color: #e2e8f0;
}

.collections-table :deep(.v-pagination__item--is-active) {
  background: #1976d3 !important;
  color: #ffffff !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  border: 1px solid #1976d3 !important;
  box-shadow: 0 2px 4px rgba(25, 118, 211, 0.2) !important;
}

.collections-table :deep(.v-pagination__prev),
.collections-table :deep(.v-pagination__next) {
  border-radius: 8px;
  min-width: 40px;
  height: 40px;
  color: #64748b;
  background: transparent !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  transition: all 0.2s ease;
}

.collections-table :deep(.v-pagination__prev:hover),
.collections-table :deep(.v-pagination__next:hover) {
  background: #f1f5f9 !important;
  color: #1976d3 !important;
}

.collections-table :deep(.v-pagination__prev:disabled),
.collections-table :deep(.v-pagination__next:disabled) {
  opacity: 0.3 !important;
  cursor: not-allowed !important;
}

/* Search results container - matches search bar width */
.search-results-container {
  width: 100%;
  margin-left: 0;
  margin-right: 0;
  padding: 0;
  max-width: 100%;
  box-sizing: border-box;
}

/* Search Results Header - Improved layout */
.search-results-header {
  padding: 16px 0;
  margin-bottom: 16px;
  color: #374151;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

/* Search results expansion panels - no boxes, just expand content, part of container */
.search-results-panels {
  width: 100%;
  margin: 0;
  padding: 0;
}

.search-results-panels :deep(.v-expansion-panel) {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  border-radius: 0 !important;
  margin-bottom: 4px !important;
  padding: 0 !important;
}

.search-results-panels :deep(.v-expansion-panel-title) {
  background: transparent !important;
  border-radius: 0 !important;
  padding: 12px 0 !important;
  border: none !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04) !important;
  min-height: auto !important;
}

.search-results-panels :deep(.v-expansion-panel--active .v-expansion-panel-title) {
  background: transparent !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
}

.search-results-panels :deep(.v-expansion-panel-text) {
  background: transparent !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  margin: 0 !important;
}

.search-result-panel-text {
  background: transparent !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

/* Expanded document content - no subboxes, all content visible, part of container */
.document-content-expanded {
  padding: 16px 0;
  background: transparent;
  border: none;
}

.document-field-expanded {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.document-field-expanded:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.field-label-expanded {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px;
  color: #0e2438;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-value-expanded {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  background: transparent;
  padding: 0;
}

/* Harmonious search result titles */
.search-result-title {
  color: #1e293b !important;
  font-size: 18px !important;
  font-weight: 500 !important;
  line-height: 1.5 !important;
  text-decoration: none !important;
  cursor: pointer;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  transition: color 0.2s ease !important;
}

.search-result-title:hover {
  color: #488aec !important;
  text-decoration: none !important;
}

.search-results-panels :deep(.v-expansion-panel-title) {
  color: #1e293b !important;
}

/* Search Header - Basic app header style */
.search-header-container {
  margin-top: 24px;
  margin-bottom: 0;
}

.search-header {
  padding: 16px 0;
  background: transparent;
  border: none;
}

.search-title-icon {
  color: #64748b !important;
  opacity: 0.7;
}

.search-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 16px !important;
  color: #1e293b !important;
}

/* Search Card - Clean minimal style */
.search-card {
  border-radius: 8px !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
  border: none !important;
}

/* Collections Search Bar - Isolated and Improved */
.collections-search-bar-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
}

.collections-search-input-wrapper {
  display: flex;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  flex-wrap: nowrap;
  margin: 0;
  padding: 0;
}

.collections-search-box-wrapper {
  flex: 1;
  min-width: 0;
  position: relative;
  margin: 0;
  padding: 0;
}

.collections-search-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}

/* Search Sort Select - Well positioned and styled */
.search-sort-select {
  min-width: 200px !important;
  max-width: 240px !important;
  flex-shrink: 0;
  order: 1; /* Sort comes before search button */
}

.search-sort-select :deep(.v-field) {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  height: 40px;
  min-height: 40px;
}

.search-sort-select :deep(.v-field:hover) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  border-color: #cbd5e1;
}

.search-sort-select :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(72, 138, 236, 0.15);
  border-color: #488aec;
}

.search-sort-select :deep(.v-field__input) {
  padding: 10px 12px;
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.search-sort-select :deep(.v-field__prepend-inner) {
  padding-right: 10px;
  color: #64748b;
}

.search-sort-select :deep(.v-field__label) {
  color: #64748b;
  font-size: 13px;
  top: 50%;
  transform: translateY(-50%);
}

.search-sort-select :deep(.v-field--focused .v-field__label),
.search-sort-select :deep(.v-field--active .v-field__label) {
  color: #488aec;
}

/* Search Results Header Sort Container */
.search-results-sort-container {
  gap: 10px;
  flex-shrink: 0;
  align-items: center;
}

.search-results-sort-container .v-icon {
  flex-shrink: 0;
}

.search-results-sort-select {
  min-width: 220px !important;
  max-width: 280px !important;
  flex-shrink: 0;
}

.search-results-sort-select :deep(.v-field) {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  height: 40px;
  min-height: 40px;
}

.search-results-sort-select :deep(.v-field:hover) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  border-color: #cbd5e1;
}

.search-results-sort-select :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(72, 138, 236, 0.15);
  border-color: #488aec;
}

.search-results-sort-select :deep(.v-field__input) {
  padding: 10px 12px;
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

/* Responsive adjustments for sort selects */
@media (max-width: 960px) {
  .collections-search-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .search-sort-select {
    min-width: 100% !important;
    max-width: 100% !important;
    order: 0; /* Sort comes first on mobile */
  }
  
  .search-results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .search-results-sort-container {
    width: 100%;
  }
  
  .search-results-sort-select {
    min-width: 100% !important;
    max-width: 100% !important;
  }
}

.collections-search-append-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 4px;
  flex-shrink: 0;
  min-width: auto;
  width: auto;
}

.collections-search-hint-icon {
  opacity: 0.6;
  cursor: help;
  transition: opacity 0.2s ease;
}

.collections-search-hint-icon:hover {
  opacity: 1;
}

.collections-search-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 0 0 0;
  border-top: 1px solid #e2e8f0;
  margin-top: 4px;
}

.collections-search-suggestions .v-chip {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-color: #cbd5e1;
}

.collections-search-suggestions .v-chip:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

/* Legacy support */
.search-bar-container {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.search-input-wrapper {
  flex: 1;
  min-width: 300px;
}

.search-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.search-limit-input {
  flex-shrink: 0;
}

/* Legacy search button - use unified-btn-primary */
.search-button {
  /* Handled by unified-btn-primary */
}

/* Collections Document Search Input - Clean, Isolated Styles */
.collections-document-search-input {
  isolation: isolate;
  position: relative;
  z-index: 1;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-document-search-input :deep(.v-input) {
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-document-search-input :deep(.v-field) {
  background: #ffffff !important;
  border-radius: 12px !important;
  border: 2px solid #e2e8f0 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  padding: 0 !important;
  margin: 0 !important;
  min-height: 52px !important;
  height: 52px !important;
  max-height: 52px !important;
  display: flex !important;
  align-items: center !important;
  position: relative !important;
  width: 100% !important;
}

.collections-document-search-input :deep(.v-field:hover) {
  border-color: #cbd5e1 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

.collections-document-search-input :deep(.v-field--focused) {
  background: #ffffff !important;
  border-color: #1976d2 !important;
  box-shadow: 0 0 0 3px rgba(25, 118, 211, 0.1), 0 4px 12px rgba(0, 0, 0, 0.12) !important;
  transform: translateY(-1px);
}

.collections-document-search-input :deep(.v-field__wrapper) {
  display: flex !important;
  align-items: center !important;
  min-height: 52px !important;
  height: 52px !important;
  max-height: 52px !important;
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
}

.collections-document-search-input :deep(.v-field__input) {
  padding: 0 18px !important;
  margin: 0 !important;
  font-size: 15px !important;
  font-weight: 400 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  min-height: 52px !important;
  height: 52px !important;
  max-height: 52px !important;
  line-height: 20px !important;
  color: #1e293b !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.collections-document-search-input :deep(.v-field__input input) {
  font-size: 15px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  padding: 0 !important;
  margin: 0 !important;
  height: 52px !important;
  max-height: 52px !important;
  line-height: 20px !important;
  color: #1e293b !important;
  width: 100% !important;
  box-sizing: border-box !important;
  border: none !important;
  outline: none !important;
  background: transparent !important;
}

.collections-document-search-input :deep(.v-field__input::placeholder),
.collections-document-search-input :deep(.v-field__input input::placeholder) {
  color: #94a3b8 !important;
  font-size: 15px !important;
  opacity: 1 !important;
}

.collections-document-search-input :deep(.v-field__prepend-inner) {
  padding-left: 18px !important;
  padding-right: 10px !important;
  height: 52px !important;
  display: flex !important;
  align-items: center !important;
}

.collections-document-search-input :deep(.v-field__prepend-inner .v-icon) {
  font-size: 20px !important;
  color: #64748b !important;
  transition: color 0.2s ease !important;
}

.collections-document-search-input :deep(.v-field:hover .v-field__prepend-inner .v-icon) {
  color: #475569 !important;
}

.collections-document-search-input :deep(.v-field--focused .v-field__prepend-inner .v-icon) {
  color: #1976d2 !important;
}

.collections-document-search-input :deep(.v-field__append-inner) {
  padding-right: 18px !important;
  padding-left: 8px !important;
  height: 52px !important;
  max-height: 52px !important;
  display: flex !important;
  align-items: center !important;
  flex-shrink: 0 !important;
  min-width: auto !important;
  width: auto !important;
}

.collections-document-search-input :deep(.v-field__clearable) {
  margin-right: 4px !important;
  opacity: 0.6 !important;
  transition: opacity 0.2s ease !important;
}

.collections-document-search-input :deep(.v-field__clearable:hover) {
  opacity: 1 !important;
}

/* Responsive adjustments for collections search */
@media (max-width: 960px) {
  .collections-search-input-wrapper {
    flex-direction: column;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .collections-search-box-wrapper {
    width: 100%;
    min-width: 100%;
    flex: 1 1 100%;
  }
  
  .collections-search-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  
  .collections-search-actions .unified-btn {
    flex: 1;
    min-width: 120px;
    max-width: 200px;
  }
  
  .collections-document-search-input {
    width: 100% !important;
  }
  
  .collections-document-search-input :deep(.v-field) {
    width: 100% !important;
  }
}

/* Legacy collection-search-input class - deprecated, use collections-document-search-input */

/* Legacy classes - now use unified-btn-secondary and unified-btn-icon */
.view-docs-btn,
.close-search-btn {
  /* Handled by unified-btn classes */
}

/* Items per page selector - raised position */
.pagination-items-per-page {
  margin-top: -4px !important;
}

.items-per-page-select :deep(.v-field) {
  margin-top: 0 !important;
}

/* Pagination Wrapper Bottom - Centered (same as CollectionDocumentsView) */
.pagination-wrapper-bottom {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
  width: 100%;
}

.pagination-info-bottom {
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  color: #64748b;
  font-size: 13px;
  margin-top: 8px;
}

.pagination-centered {
  display: flex;
  justify-content: center;
  width: 100%;
}

/* Table Pagination Styles (same as CollectionDocumentsView) */
.table-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}

.table-pagination :deep(.v-pagination__list) {
  display: flex;
  align-items: center;
  gap: 4px;
}

.table-pagination :deep(.v-btn) {
  min-width: 36px !important;
  height: 36px !important;
  border-radius: 8px !important;
  color: #64748b !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  transition: all 0.2s ease !important;
}

.table-pagination :deep(.v-btn:hover) {
  background: #f1f5f9 !important;
  color: #0e2438 !important;
  border-color: #e2e8f0 !important;
}

.table-pagination :deep(.v-btn--active) {
  background: #1976d3 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  border-color: #1976d3 !important;
  box-shadow: 0 2px 4px rgba(25, 118, 211, 0.2) !important;
}

.table-pagination :deep(.v-btn--disabled) {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

.table-pagination :deep(.v-pagination__prev),
.table-pagination :deep(.v-pagination__next) {
  min-width: 36px !important;
  height: 36px !important;
  border-radius: 8px !important;
  color: #64748b !important;
  background: transparent !important;
  transition: all 0.2s ease !important;
}

.table-pagination :deep(.v-pagination__prev:hover:not(.v-btn--disabled)),
.table-pagination :deep(.v-pagination__next:hover:not(.v-btn--disabled)) {
  background: #f1f5f9 !important;
  color: #0e2438 !important;
}

/* Delete Collection Dialog - Modern Styling */
.delete-collection-dialog :deep(.v-overlay__content) {
  border-radius: 16px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: none !important;
}

.delete-collection-dialog :deep(.v-card) {
  border: none !important;
}

.delete-collection-dialog :deep(.v-card-title),
.delete-collection-dialog :deep(.v-card-text),
.delete-collection-dialog :deep(.v-card-actions) {
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  outline: none !important;
}

.delete-collection-dialog :deep(.v-card)::before,
.delete-collection-dialog :deep(.v-card)::after {
  display: none !important;
}

.delete-collection-dialog :deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.5) !important;
}

.delete-dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border: none !important;
}

.delete-dialog-header {
  background: #850f0f !important;
  padding: 24px 28px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 16px !important;
  border-bottom: none !important;
  border: none !important;
}

.delete-dialog-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.delete-dialog-icon {
  color: #ffffff !important;
}

.delete-dialog-title-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  text-align: center;
}

.delete-dialog-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 700 !important;
  font-size: 22px !important;
  line-height: 1.3 !important;
  color: #ffffff !important;
  letter-spacing: -0.01em !important;
  text-align: center !important;
}

.delete-dialog-subtitle {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  line-height: 1.4 !important;
  color: rgba(255, 255, 255, 0.9) !important;
  text-align: center !important;
}

.delete-dialog-content {
  padding: 28px !important;
  background: #ffffff !important;
}

.delete-warning-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
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
  font-weight: 600 !important;
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
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #850f0f !important;
  margin-bottom: 6px;
}

.delete-error-message {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  color: #850f0f !important;
  margin-bottom: 4px;
}

.delete-error-help {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
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
  border: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  justify-content: flex-end !important;
}

.delete-btn-centered {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
}

.delete-btn-centered.unified-btn :deep(.v-btn__content),
.delete-btn-centered :deep(.v-btn__content) {
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
  width: 100% !important;
  display: flex !important;
  margin: 0 auto !important;
  padding: 0 !important;
}

.delete-btn-centered.unified-btn :deep(.v-btn__content span),
.delete-btn-centered :deep(.v-btn__content span) {
  text-align: center !important;
  display: inline-block !important;
  margin: 0 !important;
}

.unified-btn-danger.delete-btn-centered :deep(.v-btn__content) {
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
  width: 100% !important;
  display: flex !important;
  gap: 6px !important;
  margin: 0 auto !important;
}

.unified-btn-danger.delete-btn-centered :deep(.v-btn__content span) {
  text-align: center !important;
  display: inline-block !important;
  margin: 0 !important;
}

.unified-btn-danger.delete-btn-centered :deep(.v-btn__prepend) {
  margin: 0 !important;
  margin-right: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.unified-btn-danger.delete-btn-centered :deep(.v-btn__prepend) {
  margin: 0 !important;
  margin-right: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Legacy classes - now use unified-btn classes */
.delete-cancel-btn,
.delete-confirm-btn {
  /* Handled by unified-btn classes */
}

/* Professional Empty Collections State */
.empty-collections-card {
  border-radius: 16px !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  max-width: 600px !important;
  margin: 0 auto !important;
  
  /* 3D Popup Effect */
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08) !important;
  
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
}

.empty-state-wrapper {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-top: 40px;
}

.empty-collections-card::before {
  content: none !important;
  display: none !important;
}

.empty-collections-card {
  background: #ffffff !important;
  border: 1px solid rgba(148, 163, 184, 0.16) !important;
  box-shadow:
    0 18px 48px rgba(15, 23, 42, 0.08),
    0 6px 18px rgba(15, 23, 42, 0.05) !important;
}

.empty-collections-card:hover {
  /* No shadow effect on hover */
}

.empty-collections-content {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 80px 40px !important;
  text-align: center !important;
  min-height: 320px !important;
  background: transparent !important;
}

.empty-collections-text {
  max-width: 480px;
  margin: 0 auto 32px auto;
}

.empty-collections-title {
  font-size: 28px !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  margin: 0 0 12px 0 !important;
  letter-spacing: -0.02em !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  line-height: 1.2 !important;
}

.empty-collections-description {
  font-size: 16px !important;
  color: #64748b !important;
  line-height: 1.6 !important;
  margin: 0 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
}

.empty-collections-action {
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-collections-btn {
  height: auto !important;
  padding: 14px 32px !important;
  font-size: 15px !important;
  border-radius: 8px !important;
}

.empty-collections-btn:active :deep(.v-btn__content),
.empty-collections-btn.v-btn--active :deep(.v-btn__content),
.empty-collections-btn:focus-visible :deep(.v-btn__content),
.empty-collections-btn:active :deep(.v-icon),
.empty-collections-btn.v-btn--active :deep(.v-icon),
.empty-collections-btn:focus-visible :deep(.v-icon) {
  color: #ffffff !important;
}

@media (max-width: 600px) {
  .empty-collections-card {
    max-width: 100% !important;
  }
  
  .empty-collections-content {
    padding: 60px 24px !important;
    min-height: 280px !important;
  }
  
  .empty-collections-title {
    font-size: 24px !important;
  }
  
  .empty-collections-description {
    font-size: 15px !important;
  }
  
  .empty-collections-btn {
    width: 100%;
    max-width: 280px;
  }
}
/* Google-style Toolbar for Items Per Page */
.google-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: none !important;
  margin-bottom: 16px;
  max-width: 100%;
}

.google-toolbar-left {
  display: flex;
  align-items: center;
}

.google-results-count {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px;
  color: #70757a;
  line-height: 43px;
}

.google-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}




.google-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  position: relative;
  border-radius: 999px;
  background: #ffffff;
  color: #1e293b;
  font-family: arial, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.google-toolbar-btn:hover {
  border-color: rgba(72, 138, 236, 0.4);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
  transform: translateY(-1px);
}

.google-toolbar-btn.active {
  border-color: rgba(72, 138, 236, 0.6);
  box-shadow: 0 10px 25px rgba(33, 54, 125, 0.18);
}

.items-per-page-btn {
  background: #ffffff;
  color: #111111 !important;
  border: none;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  min-height: 44px;
  height: 44px;
  padding: 10px 20px;
  gap: 10px;
}

.items-per-page-btn:hover,
.items-per-page-btn:focus-visible {
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
}

.items-per-page-btn :deep(.v-icon),
.items-per-page-btn span {
  color: #111111 !important;
}

.google-toolbar-btn :deep(.v-icon) {

  color: inherit;
  font-size: 18px;
}

/* Remove tooltip/ticket from items per page button */
.items-per-page-btn {
  position: relative;
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

.collections-header-actions .items-per-page-btn,
.collections-header-actions .items-per-page-btn:hover,
.collections-header-actions .items-per-page-btn:focus,
.collections-header-actions .items-per-page-btn:focus-visible,
.collections-header-actions .items-per-page-btn:active,
.collections-header-actions .items-per-page-btn.active {
  background: #f3f4f6 !important;
  background-color: #f3f4f6 !important;
  border: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.collections-header-actions .items-per-page-btn:hover,
.collections-header-actions .items-per-page-btn:focus,
.collections-header-actions .items-per-page-btn:focus-visible {
  background: #e5e7eb !important;
  background-color: #e5e7eb !important;
}

.collections-header-actions .items-per-page-btn,
.collections-header-actions .items-per-page-btn span,
.collections-header-actions .items-per-page-btn :deep(.v-icon) {
  color: #1f2937 !important;
  font-weight: 700 !important;
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
  margin: 0 2px !important;
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

</style>
