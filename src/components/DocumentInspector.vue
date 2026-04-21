<template>
  <div class="document-inspector">
    <v-card elevation="2" class="inspector-card">
      <!-- Header -->
      <v-card-title class="d-flex justify-space-between align-center pa-5" style="background: #fafbfc; border-bottom: 1px solid #e6ebf1;">
        <div class="d-flex align-center">
          <v-icon icon="mdi-file-document" color="#635bff" size="20" class="mr-2"></v-icon>
          <span class="font-weight-bold" style="color: #0a2540;">Document Inspector</span>
        </div>
        <div class="d-flex gap-2">
          <v-select
            v-model="selectedCollection"
            :items="collectionItems"
            label="Collection"
            prepend-inner-icon="mdi-folder"
            variant="outlined"
            style="min-width: 200px;"
            bg-color="white"
            density="compact"
            @update:model-value="loadDocuments"
            aria-label="Select collection to inspect"
          ></v-select>
          <v-tooltip text="Toggle dark mode for JSON view" location="bottom">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                variant="text"
                color="#425466"
                @click="toggleDarkMode"
                aria-label="Toggle dark mode"
              >
                <v-icon size="20">{{ darkMode ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-row no-gutters>
          <!-- Document Viewer - Full Width -->
          <v-col cols="12" class="document-viewer-panel">
            <div v-if="!selectedDocument" class="empty-state">
              <v-icon icon="mdi-file-document-outline" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
              <div class="text-h6 text-grey-darken-1 mb-2">Select a document</div>
              <div class="text-body-2 text-grey-darken-2">Choose a document from the list to view its details</div>
            </div>

            <div v-else class="document-viewer">
              <!-- Document Header with Collection Selector -->
              <div class="document-header pa-4 bg-grey-lighten-4">
                <div class="d-flex justify-space-between align-center mb-3">
                  <div>
                    <div class="text-h6 font-weight-bold mb-1">{{ selectedDocument.id }}</div>
                    <div class="text-caption text-grey-darken-1">
                      {{ Object.keys(selectedDocument).length - 1 }} fields
                    </div>
                  </div>
                  <div class="d-flex gap-2">
                    <v-btn
                      color="success"
                      size="small"
                      variant="elevated"
                      prepend-icon="mdi-database-plus"
                      @click="indexDocument"
                    >
                      Index
                    </v-btn>
                    <v-btn
                      color="info"
                      size="small"
                      variant="elevated"
                      prepend-icon="mdi-content-copy"
                      @click="duplicateDocument"
                    >
                      Duplicate
                    </v-btn>
                    <v-btn
                      color="error"
                      size="small"
                      variant="elevated"
                      prepend-icon="mdi-delete"
                      @click="deleteDocument"
                    >
                      Delete
                    </v-btn>
                  </div>
                </div>
                <!-- Document Search and List -->
                <div class="mb-3">
                  <v-text-field
                    v-model="searchQuery"
                    placeholder="Search documents..."
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    hide-details
                    bg-color="white"
                    @input="filterDocuments"
                    class="mb-2"
                  ></v-text-field>
                  <v-list density="compact" class="document-list-inline" style="max-height: 200px; overflow-y: auto;">
                    <v-list-item
                      v-for="doc in filteredDocuments"
                      :key="doc.id"
                      :class="{ 'selected': selectedDocument?.id === doc.id }"
                      @click="selectDocument(doc)"
                    >
                      <template v-slot:prepend>
                        <v-icon icon="mdi-file-document-outline" color="primary" size="18"></v-icon>
                      </template>
                      <v-list-item-title class="font-weight-medium text-body-2">
                        {{ doc.id }}
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="filteredDocuments.length === 0">
                      <v-list-item-title class="text-grey-darken-1 text-center py-2 text-caption">
                        No matching documents
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </div>
              </div>

              <!-- Document Content -->
              <div class="document-content pa-4">
                <!-- JSON Tree View -->
                <div class="json-viewer">
                  <div class="d-flex justify-space-between align-center mb-3">
                    <div class="text-subtitle-1 font-weight-bold">Document Structure</div>
                    <div class="d-flex gap-2">
                      <v-btn
                        size="x-small"
                        variant="text"
                        @click="viewMode = 'tree'"
                        :color="viewMode === 'tree' ? 'primary' : ''"
                      >
                        Tree
                      </v-btn>
                      <v-btn
                        size="x-small"
                        variant="text"
                        @click="viewMode = 'json'"
                        :color="viewMode === 'json' ? 'success' : ''"
                      >
                        JSON
                      </v-btn>
                    </div>
                  </div>

                  <!-- Tree View -->
                  <div v-if="viewMode === 'tree'" class="json-tree">
                    <div v-for="(value, key) in selectedDocument" :key="key" class="json-item">
                      <div class="json-key">
                        <span class="key-name">{{ key }}:</span>
                      </div>
                      <div class="json-value">
                        <span :class="getValueClass(value)">{{ formatValue(value) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Raw JSON View -->
                  <div v-else class="json-raw">
                    <pre :class="{ 'dark-mode': darkMode }">{{ formatJSON(selectedDocument) }}</pre>
                  </div>
                </div>

                <!-- Document Statistics -->
                <v-divider class="my-4"></v-divider>
                <div class="document-stats">
                  <div class="text-subtitle-1 font-weight-bold mb-3">Statistics</div>
                  <v-row>
                    <v-col cols="6" md="3">
                      <v-card variant="outlined" class="stat-card">
                        <v-card-text class="text-center pa-2">
                          <div class="text-h6 font-weight-bold">{{ Object.keys(selectedDocument).length }}</div>
                          <div class="text-caption text-grey-darken-1">Fields</div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-card variant="outlined" class="stat-card">
                        <v-card-text class="text-center pa-2">
                          <div class="text-h6 font-weight-bold">{{ getDocumentSize(selectedDocument) }}</div>
                          <div class="text-caption text-grey-darken-1">Size</div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-card variant="outlined" class="stat-card">
                        <v-card-text class="text-center pa-2">
                          <div class="text-h6 font-weight-bold">{{ getFieldTypes(selectedDocument).length }}</div>
                          <div class="text-caption text-grey-darken-1">Types</div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-card variant="outlined" class="stat-card">
                        <v-card-text class="text-center pa-2">
                          <div class="text-h6 font-weight-bold">{{ getNestedDepth(selectedDocument) }}</div>
                          <div class="text-caption text-grey-darken-1">Depth</div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Floating Action Buttons -->
    <div class="fab-container">
      <v-btn
        v-if="selectedDocument"
        icon="mdi-dots-vertical"
        color="primary"
        fab
        size="large"
        class="fab-button"
      >
        <v-icon>mdi-dots-vertical</v-icon>
        <v-menu activator="parent">
          <v-list density="compact">
            <v-list-item @click="indexDocument">
              <template v-slot:prepend>
                <v-icon icon="mdi-database-plus"></v-icon>
              </template>
              <v-list-item-title>Index Document</v-list-item-title>
            </v-list-item>
            <v-list-item @click="duplicateDocument">
              <template v-slot:prepend>
                <v-icon icon="mdi-content-copy"></v-icon>
              </template>
              <v-list-item-title>Duplicate</v-list-item-title>
            </v-list-item>
            <v-list-item @click="deleteDocument">
              <template v-slot:prepend>
                <v-icon icon="mdi-delete" color="error"></v-icon>
              </template>
              <v-list-item-title>Delete</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDocuments } from '../composables/useDocuments'
import { useCollections } from '../composables/useCollections'
import { inject } from 'vue'
import { gsap } from 'gsap'

const baseUrl = inject('baseUrl')
const { documents, loading, loadDocuments, getDocument, deleteDocument: deleteDoc } = useDocuments(baseUrl)
const { collections, loadCollections } = useCollections(baseUrl)

const selectedCollection = ref('')
const selectedDocument = ref(null)
const searchQuery = ref('')
const viewMode = ref('tree')
const darkMode = ref(false)

const collectionItems = computed(() => {
  return collections.value.map(col => ({
    title: col.name,
    value: col.name
  }))
})

const filteredDocuments = computed(() => {
  if (!searchQuery.value) return documents.value
  
  const query = searchQuery.value.toLowerCase()
  return documents.value.filter(doc => {
    const docString = JSON.stringify(doc).toLowerCase()
    return docString.includes(query) || doc.id?.toLowerCase().includes(query)
  })
})

const selectDocument = (doc) => {
  selectedDocument.value = doc
  
  // Animate selection
  gsap.fromTo('.document-viewer',
    { opacity: 0, x: 20 },
    { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
  )
}

const filterDocuments = () => {
  // Filter is handled by computed property
}

const formatJSON = (obj) => {
  return JSON.stringify(obj, null, 2)
}

const getDocumentSize = (doc) => {
  const size = JSON.stringify(doc).length
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

const getFieldTypes = (doc) => {
  const types = new Set()
  const traverse = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key]
        if (value !== null && value !== undefined) {
          types.add(typeof value)
          if (typeof value === 'object' && !Array.isArray(value)) {
            traverse(value)
          }
        }
      }
    }
  }
  traverse(doc)
  return Array.from(types)
}

const getNestedDepth = (obj, depth = 0) => {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return depth
  }
  let maxDepth = depth
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      maxDepth = Math.max(maxDepth, getNestedDepth(obj[key], depth + 1))
    }
  }
  return maxDepth
}

const formatValue = (value) => {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[${value.length} items]`
    }
    return `{${Object.keys(value).length} keys}`
  }
  return String(value)
}

const getValueClass = (value) => {
  const type = typeof value
  return `value-${type}`
}

const toggleDarkMode = () => {
  darkMode.value = !darkMode.value
}

const indexDocument = async () => {
  if (!selectedDocument.value || !selectedCollection.value) return
  // Implementation would call API to index document
  alert('Indexing document...')
}

const duplicateDocument = async () => {
  if (!selectedDocument.value || !selectedCollection.value) return
  // Implementation would duplicate document
  alert('Duplicating document...')
}

const deleteDocument = async () => {
  if (!selectedDocument.value || !selectedCollection.value) return
  if (confirm('Are you sure you want to delete this document?')) {
    try {
      await deleteDoc(selectedCollection.value, selectedDocument.value.id)
      selectedDocument.value = null
      loadDocuments(selectedCollection.value)
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`)
    }
  }
}

onMounted(async () => {
  await loadCollections()
  if (collections.value.length > 0) {
    selectedCollection.value = collections.value[0].name
    await loadDocuments(selectedCollection.value)
  }
})
</script>


<style scoped>
.document-inspector {
  position: relative;
}

.inspector-card {
  min-height: 700px;
}

.document-viewer-panel {
  min-height: 700px;
  overflow-y: auto;
  background: #fafafa;
}

.document-list-inline :deep(.v-list-item) {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  margin-bottom: 4px;
}

.document-list-inline :deep(.v-list-item:hover) {
  background: rgba(99, 91, 255, 0.08);
}

.document-list-inline :deep(.v-list-item.selected) {
  background: rgba(99, 91, 255, 0.12);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.document-viewer {
  background: white;
  min-height: 100%;
}

.document-header {
  border-bottom: 2px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
}

.document-content {
  background: white;
}

.json-viewer {
  margin-bottom: 24px;
}

.json-tree {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  max-height: 400px;
  overflow-y: auto;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.json-raw pre {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  max-height: 400px;
  overflow: auto;
  margin: 0;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.json-raw pre.dark-mode {
  background: #1e1e1e;
  color: #d4d4d4;
}

.document-stats {
  margin-top: 16px;
}

.stat-card {
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.fab-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.fab-button {
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
  transition: all 0.3s ease;
}

.fab-button:hover {
  box-shadow: 0 6px 16px rgba(25, 118, 210, 0.4);
  transform: scale(1.1);
}

.json-item {
  margin: 8px 0;
  padding: 4px 0;
  border-bottom: 1px solid #e0e0e0;
}

.json-key {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}

.json-key:hover {
  background: rgba(0, 0, 0, 0.05);
}

.key-name {
  font-weight: bold;
  color: #1976D2;
  margin-left: 4px;
}

.json-value {
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  margin-left: 24px;
  padding: 2px 0;
}

.value-string {
  color: #4caf50;
}

.value-number {
  color: #2196f3;
}

.value-boolean {
  color: #ff9800;
}

.value-null {
  color: #9e9e9e;
  font-style: italic;
}
</style>
