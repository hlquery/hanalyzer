<template>
  <v-dialog
    v-model="isOpen"
    max-width="700"
    persistent
    @click:outside="close"
    @keydown.esc="close"
  >
    <v-card class="command-palette" elevation="8">
      <v-card-text class="pa-0">
        <!-- Search Input -->
        <div class="search-header pa-4">
          <v-text-field
            ref="searchInput"
            v-model="searchQuery"
            autofocus
            placeholder="Type to search collections, documents, fields, indices..."
            prepend-inner-icon="mdi-magnify"
            variant="solo"
            hide-details
            density="comfortable"
            class="command-input"
            @input="onSearch"
            @keydown.down.prevent="navigateDown"
            @keydown.up.prevent="navigateUp"
            @keydown.enter.prevent="selectItem"
          >
            <template v-slot:append-inner>
              <kbd class="kbd-hint">ESC</kbd>
            </template>
          </v-text-field>
        </div>

        <!-- Results -->
        <v-divider></v-divider>
        <div class="results-container">
          <div v-if="filteredResults.length === 0 && searchQuery" class="no-results pa-8 text-center">
            <v-icon icon="mdi-magnify" size="48" color="grey-lighten-1" class="mb-4"></v-icon>
            <div class="text-h6 text-grey-darken-1 mb-2">No results found</div>
            <div class="text-body-2 text-grey-darken-2">Try a different search term</div>
          </div>

          <v-list v-else density="compact" class="results-list">
            <template v-for="(result, index) in filteredResults" :key="result.id">
              <v-list-item
                :class="{ 'selected': index === selectedIndex }"
                @click="selectItem(result)"
                @mouseenter="selectedIndex = index"
              >
                <template v-slot:prepend>
                  <v-icon :icon="result.icon" :color="result.color" class="mr-3"></v-icon>
                </template>
                
                <v-list-item-title class="font-weight-medium">
                  {{ result.title }}
                </v-list-item-title>
                
                <v-list-item-subtitle v-if="result.subtitle">
                  {{ result.subtitle }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-chip
                    v-if="result.category"
                    size="x-small"
                    :color="result.color"
                    variant="flat"
                    class="ml-2"
                  >
                    {{ result.category }}
                  </v-chip>
                  <kbd v-if="index === selectedIndex" class="kbd-enter ml-2">↵</kbd>
                </template>
              </v-list-item>
              
              <v-divider v-if="index < filteredResults.length - 1"></v-divider>
            </template>
          </v-list>

          <!-- Quick Actions -->
          <v-divider></v-divider>
          <div class="quick-actions pa-2">
            <div class="text-caption text-grey-darken-1 px-4 py-2">
              <kbd>↑</kbd> <kbd>↓</kbd> Navigate • <kbd>↵</kbd> Select • <kbd>ESC</kbd> Close
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useCollections } from '../composables/useCollections'
import { useDocuments } from '../composables/useDocuments'
import { inject } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const baseUrl = inject('baseUrl')
const { collections, loadCollections } = useCollections(baseUrl)
const { documents } = useDocuments(baseUrl)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const searchQuery = ref('')
const searchInput = ref(null)
const selectedIndex = ref(0)
const allResults = ref([])

const filteredResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return allResults.value.slice(0, 10) // Show top 10 when empty
  }

  const query = searchQuery.value.toLowerCase().trim()
  return allResults.value.filter(result => {
    const titleMatch = result.title.toLowerCase().includes(query)
    const subtitleMatch = result.subtitle?.toLowerCase().includes(query)
    const categoryMatch = result.category?.toLowerCase().includes(query)
    return titleMatch || subtitleMatch || categoryMatch
  }).slice(0, 20)
})

const buildSearchResults = () => {
  const results = []

  // Collections
  collections.value.forEach(collection => {
    results.push({
      id: `collection-${collection.name}`,
      type: 'collection',
      title: collection.name,
      subtitle: `${collection.num_documents || 0} documents`,
      category: 'Collection',
      icon: 'mdi-folder',
      color: 'primary',
      action: 'view-collection',
      data: collection.name
    })
  })

  // Quick actions
  results.push({
    id: 'action-new-collection',
    type: 'action',
    title: 'Create New Collection',
    subtitle: 'Create a new collection',
    category: 'Action',
    icon: 'mdi-plus-circle',
    color: 'success',
    action: 'create-collection'
  })

  results.push({
    id: 'action-search',
    type: 'action',
    title: 'Search Documents',
    subtitle: 'Search across all collections',
    category: 'Action',
    icon: 'mdi-magnify',
    color: 'info',
    action: 'search'
  })

  results.push({
    id: 'action-aliases',
    type: 'action',
    title: 'Manage Aliases',
    subtitle: 'View and manage collection aliases',
    category: 'Action',
    icon: 'mdi-link-variant',
    color: 'primary',
    action: 'view-aliases'
  })

  results.push({
    id: 'action-rocksdb-dashboard',
    type: 'action',
    title: 'RocksDB 3D Dashboard',
    subtitle: 'View RocksDB Tree visualization',
    category: 'Action',
    icon: 'mdi-cube-outline',
    color: 'purple',
    action: 'view-rocksdb'
  })


  allResults.value = results
}

const onSearch = () => {
  selectedIndex.value = 0
}

const navigateDown = () => {
  if (selectedIndex.value < filteredResults.value.length - 1) {
    selectedIndex.value++
  } else {
    selectedIndex.value = 0
  }
}

const navigateUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else {
    selectedIndex.value = filteredResults.value.length - 1
  }
}

const selectItem = (item = null) => {
  const selected = item || filteredResults.value[selectedIndex.value]
  if (selected) {
    emit('select', selected)
    close()
  }
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
  selectedIndex.value = 0
}

const handleKeyDown = (event) => {
  // Open with Ctrl+K or Cmd+K
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    isOpen.value = true
    nextTick(() => {
      if (searchInput.value) {
        searchInput.value.focus()
      }
    })
  }
}

watch(isOpen, (newVal) => {
  if (newVal) {
    loadCollections().then(() => {
      buildSearchResults()
    })
    nextTick(() => {
      if (searchInput.value) {
        searchInput.value.focus()
        // Animate open
        gsap.fromTo('.command-palette',
          { opacity: 0, scale: 0.95, y: -20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power2.out' }
        )
      }
    })
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.command-palette {
  border-radius: 8px;
  overflow: hidden;
}

.search-header {
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
}

.command-input :deep(.v-field) {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.results-container {
  max-height: 500px;
  overflow-y: auto;
}

.results-list {
  padding: 0;
}

.results-list :deep(.v-list-item) {
  cursor: pointer;
  transition: all 0.15s ease;
}

.results-list :deep(.v-list-item:hover),
.results-list :deep(.v-list-item.selected) {
  background: rgba(25, 118, 210, 0.08);
}

.results-list :deep(.v-list-item.selected) {
  border-left: 3px solid #1976D2;
}

.no-results {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.quick-actions {
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
}

.kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  line-height: 1.4;
  color: #666;
  background-color: #f7f7f7;
  border: 1px solid #ccc;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2), inset 0 0 0 2px #fff;
  font-family: monospace;
}

.kbd-hint {
  margin-left: 8px;
}

.kbd-enter {
  color: #1976D2;
  border-color: #1976D2;
}
</style>
