<template>
  <div class="access-view">
    <!-- Access Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <div>
          <h1 class="collections-title-text">Access Management</h1>
          <div class="collections-total-text" v-if="keys.length > 0">
            <v-icon icon="mdi-key-chain" size="16" class="collections-dir-icon"></v-icon>
            Showing {{ keys.length }} out of {{ keys.length }}
          </div>
        </div>
      </div>
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
          @click="openCreateDialog"
          variant="flat"
          size="small"
          prepend-icon="mdi-plus"
          class="collections-action-btn create-collection-header-btn"
          style="pointer-events: auto !important; z-index: 10 !important;"
        >
          Create API Key
        </v-btn>
      </div>
    </div>

    <!-- Info Alert -->
    <v-alert
      v-if="!isAdmin"
      type="info"
      variant="tonal"
      class="mb-6 animate-fade-in"
      icon="mdi-information"
    >
      Listing API keys requires administrative privileges. Some actions may be restricted if you're not using the master token.
    </v-alert>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6 animate-fade-in"
      closable
      icon="mdi-alert-circle"
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Empty State -->
    <div v-if="!loading && keys.length === 0 && !error" class="empty-state-wrapper">
      <v-card class="mb-card card-premium empty-collections-card">
        <v-card-text class="empty-state-premium empty-collections-content">
          <div class="empty-collections-text">
            <h2 class="empty-collections-title">Create API Key</h2>
            <p class="empty-collections-description">
              Create your first API key to manage access permissions and secure your collections.
            </p>
          </div>
          <div class="empty-collections-action">
            <v-btn
              variant="flat"
              size="large"
              prepend-icon="mdi-key-plus"
              @click="openCreateDialog"
              class="collections-action-btn empty-collections-btn create-collection-header-btn"
            >
              Create API Key
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Keys Table -->
    <v-card v-else-if="!loading && keys.length > 0" class="collections-card card-premium animate-fade-in">
      <v-data-table
        :headers="headers"
        :items="keys"
        v-model:page="currentPage"
        v-model:items-per-page="itemsPerPage"
        :items-per-page="itemsPerPage"
        :loading="loading"
        item-value="id"
        class="collections-table"
        hide-default-footer
      >
        <template v-slot:item.id="{ item }">
          <div class="d-flex align-center">
            <v-icon icon="mdi-key-variant" size="18" class="mr-2 text-grey"></v-icon>
            <span class="text-caption font-weight-bold text-primary mr-2">{{ item.id }}</span>
            <v-btn
              icon="mdi-content-copy"
              variant="text"
              size="x-small"
              color="grey"
              @click.stop="copyToClipboard(item.id)"
              title="Copy ID"
            ></v-btn>
          </div>
        </template>

        <template v-slot:item.description="{ item }">
          <span class="text-body-2">{{ item.description || 'No description' }}</span>
        </template>

        <template v-slot:item.scopes="{ item }">
          <div class="d-flex flex-wrap pt-2 pb-1" style="gap: 4px;">
            <template v-if="Object.keys(item.scopes || {}).length > 0">
              <v-tooltip
                v-for="(scope, name) in item.scopes"
                :key="name"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <v-chip
                    v-bind="props"
                    size="x-small"
                    :color="name === '*' ? 'warning' : 'primary'"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ name }}: {{ scope.actions?.length || 0 }} actions
                  </v-chip>
                </template>
                <div>
                  <strong>{{ name === '*' ? 'All Collections' : name }}</strong>
                  <div v-for="action in scope.actions" :key="action" class="text-caption">• {{ action }}</div>
                  <div v-if="scope.embedded_filters" class="text-caption mt-1">
                    <em>Filter: {{ scope.embedded_filters }}</em>
                  </div>
                </div>
              </v-tooltip>
            </template>
            <v-chip v-else size="x-small" color="grey" variant="tonal">No Scopes</v-chip>
          </div>
        </template>

        <template v-slot:item.usage="{ item }">
          <div class="d-flex flex-column">
            <span class="text-caption font-weight-bold">{{ formatNumber(item.use_count) }} uses</span>
            <v-tooltip location="top">
              <template v-slot:activator="{ props }">
                <span v-bind="props" class="text-tiny text-grey cursor-help">Last: {{ timeAgo(item.last_used_at) }}</span>
              </template>
              <span>{{ formatDate(item.last_used_at) }}</span>
            </v-tooltip>
          </div>
        </template>

        <template v-slot:item.actions="{ item }">
          <div class="d-flex align-center justify-end">
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="small"
              color="primary"
              @click="openEditDialog(item)"
              class="mr-1"
            ></v-btn>
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="confirmDelete(item)"
            ></v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <LoadingSkeleton v-else variant="list" :items="5" />

    <!-- Create/Edit Key Dialog -->
    <v-dialog v-model="dialog" max-width="700px" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-header pa-4">
          <div class="d-flex align-center">
            <v-icon :icon="isEdit ? 'mdi-pencil' : 'mdi-plus'" class="mr-2" color="primary"></v-icon>
            <span class="text-h6 font-weight-bold">{{ isEdit ? 'Edit API Key' : 'Create API Key' }}</span>
          </div>
        </v-card-title>

        <v-card-text class="pa-6">
          <div class="key-builder-intro mb-4">
            <div class="d-flex align-center justify-space-between flex-wrap" style="gap: 8px;">
              <div class="text-subtitle-2 font-weight-bold">Access Key Builder</div>
              <v-chip size="x-small" color="primary" variant="tonal">3 steps</v-chip>
            </div>
            <div class="text-caption text-grey-darken-1 mt-1">
              Add a description, configure permissions, then create and copy your key.
            </div>
          </div>

          <div v-if="!isEdit" class="mb-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-subtitle-2 font-weight-bold">Quick Presets</span>
            </div>
            <div class="preset-row">
              <v-btn size="small" variant="tonal" color="primary" @click="applyPreset('read_only')">Read-only</v-btn>
              <v-btn size="small" variant="tonal" color="primary" @click="applyPreset('writer')">Writer</v-btn>
              <v-btn size="small" variant="tonal" color="warning" @click="applyPreset('admin')">Admin</v-btn>
            </div>
          </div>

          <v-form ref="keyForm" v-model="valid">
            <v-text-field
              v-model="editedKey.description"
              label="Description"
              placeholder="e.g. Read-only key for web search"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              :rules="[v => !!v || 'Description is required']"
            ></v-text-field>

            <v-text-field
              v-model.number="editedKey.rate_limit_per_minute"
              label="Rate Limit (req/min)"
              type="number"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              :rules="[v => v >= 0 || 'Limit must be positive']"
            ></v-text-field>
            <div class="rate-presets mb-4">
              <span class="text-caption text-grey-darken-1">Quick limits:</span>
              <v-btn size="x-small" variant="text" color="primary" @click="editedKey.rate_limit_per_minute = 60">60</v-btn>
              <v-btn size="x-small" variant="text" color="primary" @click="editedKey.rate_limit_per_minute = 120">120</v-btn>
              <v-btn size="x-small" variant="text" color="primary" @click="editedKey.rate_limit_per_minute = 300">300</v-btn>
              <v-btn size="x-small" variant="text" color="primary" @click="editedKey.rate_limit_per_minute = 1000">1000</v-btn>
            </div>

            <!-- Scopes Section -->
            <div class="mb-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-bold">Permissions (Scopes)</span>
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-plus"
                  @click="addScope"
                >Add Scope</v-btn>
              </div>

              <v-divider class="mb-4"></v-divider>

              <v-alert
                v-if="hasDuplicateScopeCollections"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-3"
                icon="mdi-alert-outline"
              >
                Duplicate collections detected in scopes. Keep one scope per collection.
              </v-alert>

              <v-alert
                v-if="hasScopeWithoutActions"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-3"
                icon="mdi-alert-circle-outline"
              >
                One or more scopes has no actions selected.
              </v-alert>

              <div v-for="(scope, index) in localScopes" :key="index" class="scope-row pa-3 mb-3">
                <div class="d-flex align-start">
                  <div class="flex-grow-1">
                    <div class="scope-row-header mb-2">Scope {{ index + 1 }}</div>
                    <v-row dense>
                      <v-col cols="12" md="5">
                        <v-combobox
                          v-model="scope.collection"
                          :items="collectionOptions"
                          label="Collection"
                          placeholder="Collection name or *"
                          variant="outlined"
                          density="compact"
                          hide-details
                          class="mb-2"
                          @blur="normalizeScopeCollection(index)"
                        ></v-combobox>
                      </v-col>
                      <v-col cols="12" md="7">
                        <v-select
                          v-model="scope.actions"
                          :items="actionOptions"
                          label="Actions"
                          multiple
                          chips
                          variant="outlined"
                          density="compact"
                          hide-details
                          class="mb-2"
                          @update:model-value="handleScopeActionsChange(index, $event)"
                        ></v-select>
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model="scope.embedded_filters"
                          label="Embedded Filters (optional)"
                          placeholder="e.g. status:public"
                          variant="outlined"
                          density="compact"
                          hide-details
                        ></v-text-field>
                      </v-col>
                    </v-row>
                  </div>
                  <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="small"
                    color="grey"
                    class="ml-2 mt-1"
                    @click="removeScope(index)"
                  ></v-btn>
                </div>
              </div>
              <div v-if="localScopes.length === 0" class="text-caption text-center py-4 text-grey">
                No scopes added. This key will have no permissions.
              </div>
              <div class="text-caption text-grey-darken-1 mt-2">
                Tip: include collection <code>*</code> when this key needs system endpoints like <code>/stats</code>.
              </div>
            </div>
          </v-form>

          <v-card class="scope-summary-card mb-2" variant="outlined">
            <v-card-text class="py-3 px-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-bold">Live Summary</span>
                <v-chip size="x-small" :color="hasValidScopes ? 'success' : 'warning'" variant="tonal">
                  {{ hasValidScopes ? 'Ready' : 'Needs fixes' }}
                </v-chip>
              </div>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Scopes</span>
                  <span class="summary-value">{{ localScopes.length }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Actions</span>
                  <span class="summary-value">{{ totalSelectedActions }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Rate limit</span>
                  <span class="summary-value">{{ editedKey.rate_limit_per_minute || 0 }}/min</span>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- New Key Display -->
          <v-alert
            v-if="createdRawKey"
            type="success"
            variant="flat"
            class="mt-4"
            icon="mdi-check-decagram"
          >
            <div class="font-weight-bold mb-1">Key Created Successfully!</div>
            <div class="text-caption mb-2">Copy this key now. You won't be able to see it again.</div>
            <div class="d-flex align-center bg-white rounded pa-2">
              <code class="text-primary font-weight-bold flex-grow-1">{{ createdRawKey }}</code>
              <v-btn
                icon="mdi-content-copy"
                size="x-small"
                variant="text"
                color="primary"
                @click="copyToClipboard(createdRawKey)"
              ></v-btn>
            </div>
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <span v-if="!createdRawKey" class="dialog-readiness-text">
            {{ hasValidScopes ? 'Ready to create key' : 'Complete required scope fields to continue' }}
          </span>
          <v-spacer></v-spacer>
          <v-btn
            v-if="!createdRawKey"
            variant="text"
            @click="closeDialog"
            :disabled="saving"
          >Cancel</v-btn>
          <v-btn
            v-if="createdRawKey"
            color="primary"
            variant="flat"
            @click="closeDialog"
          >Done</v-btn>
          <v-btn
            v-else
            color="primary"
            variant="flat"
            @click="saveKey"
            :loading="saving"
            :disabled="!valid || !hasValidScopes || hasDuplicateScopeCollections"
          >{{ isEdit ? 'Update Key' : 'Create Access Key' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="450px">
      <v-card class="dialog-card">
        <v-card-title class="dialog-header pa-4 bg-error text-white">
          <v-icon icon="mdi-alert" class="mr-2"></v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pa-6 text-center">
          <p class="text-body-1">Are you sure you want to delete this API key?</p>
          <p class="text-caption text-grey mt-2">ID: {{ keyToDelete?.id }}</p>
          <p class="text-body-2 mt-4 font-weight-bold">This action cannot be undone.</p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="deleteKey" :loading="deleting">Delete Key</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, buildApiUrl, shouldUseProxy } from '../utils/apiHelpers'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'

const baseUrl = inject('baseUrl', ref('http://localhost:9200'))
const toast = inject('toast', { success: () => {}, error: () => {} })

const keys = ref([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const error = ref(null)
const dialog = ref(false)
const deleteDialog = ref(false)
const createdRawKey = ref(null)
const isEdit = ref(false)
const valid = ref(true)
const keyForm = ref(null)
const editedKey = ref({
  description: '',
  rate_limit_per_minute: 1000,
  scopes: {}
})

const localScopes = ref([]) // Array of { collection, actions, embedded_filters }
const keyToDelete = ref(null)

const headers = [
  { title: 'Key ID', key: 'id', align: 'start', sortable: true },
  { title: 'Description', key: 'description', align: 'start', sortable: true },
  { title: 'Permissions', key: 'scopes', align: 'start', sortable: false },
  { title: 'Usage', key: 'usage', align: 'start', sortable: true },
  { title: '', key: 'actions', align: 'end', sortable: false }
]

const itemsPerPageOptions = [10, 25, 50, 100]
const itemsPerPage = ref(50)
const currentPage = ref(1)
const showItemsPerPageMenu = ref(false)

const onItemsPerPageChange = () => {
  currentPage.value = 1
}

const actionOptions = [
  { type: 'subheader', title: 'General' },
  { title: 'Full Access (*)', value: '*' },
  { type: 'subheader', title: 'Documents' },
  { title: 'Search', value: 'search' },
  { title: 'Create Document', value: 'create' },
  { title: 'Update Document', value: 'update' },
  { title: 'Delete Document', value: 'delete' },
  { title: 'Import Documents', value: 'import' },
  { type: 'subheader', title: 'Collections' },
  { title: 'List Collections', value: 'collections_list' },
  { title: 'Create Collection', value: 'collections_create' },
  { title: 'Delete Collection', value: 'collections_delete' }
]

const collections = ref([])
const collectionOptions = computed(() => {
  const options = collections.value.map(c => c.name)
  if (!options.includes('*')) options.unshift('*')
  return options
})

const isAdmin = ref(true) // We'll assume admin for now as listing keys requires it

const hasDuplicateScopeCollections = computed(() => {
  const names = localScopes.value
    .map(s => (s.collection || '').trim().toLowerCase())
    .filter(Boolean)
  return new Set(names).size !== names.length
})

const hasScopeWithoutActions = computed(() => {
  return localScopes.value.some(s => !Array.isArray(s.actions) || s.actions.length === 0)
})

const hasValidScopes = computed(() => {
  if (localScopes.value.length === 0) return false
  if (hasDuplicateScopeCollections.value) return false
  return localScopes.value.every(s => (s.collection || '').trim() && Array.isArray(s.actions) && s.actions.length > 0)
})

const totalSelectedActions = computed(() => {
  return localScopes.value.reduce((acc, s) => acc + (Array.isArray(s.actions) ? s.actions.length : 0), 0)
})

const loadKeys = async () => {
  loading.value = true
  error.value = null
  try {
    const url = buildApiUrl(getBaseUrlValue(baseUrl), shouldUseProxy(getBaseUrlValue(baseUrl)), '/keys')
    const response = await axios.get(url)
    keys.value = response.data.keys || []
  } catch (err) {
    console.error('Failed to load keys:', err)
    error.value = 'Failed to load API keys. Ensure you are using an admin token.'
  } finally {
    loading.value = false
  }
}

const loadCollections = async () => {
  try {
    const url = buildApiUrl(getBaseUrlValue(baseUrl), shouldUseProxy(getBaseUrlValue(baseUrl)), '/collections')
    const response = await axios.get(url)
    collections.value = response.data.collections || []
  } catch (err) {
    console.error('Failed to load collections:', err)
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  createdRawKey.value = null
  editedKey.value = {
    description: '',
    rate_limit_per_minute: 1000,
    scopes: {}
  }
  localScopes.value = [
    { collection: '*', actions: ['search'], embedded_filters: '' }
  ]
  dialog.value = true
}

const openEditDialog = (item) => {
  isEdit.value = true
  createdRawKey.value = null
  editedKey.value = { ...item }
  
  // Convert object scopes to array for editing
  localScopes.value = Object.entries(item.scopes || {}).map(([col, scope]) => ({
    collection: col,
    actions: [...(scope.actions || [])],
    embedded_filters: scope.embedded_filters || ''
  }))
  
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  createdRawKey.value = null
}

const addScope = () => {
  localScopes.value.push({
    collection: '',
    actions: ['search'],
    embedded_filters: ''
  })
}

const normalizeScopeCollection = (index) => {
  const scope = localScopes.value[index]
  if (!scope) return
  scope.collection = String(scope.collection || '').trim()
}

const handleScopeActionsChange = (index, selectedActions) => {
  const scope = localScopes.value[index]
  if (!scope) return
  const unique = [...new Set(Array.isArray(selectedActions) ? selectedActions : [])]
  scope.actions = unique.includes('*') ? ['*'] : unique
}

const applyPreset = (preset) => {
  if (preset === 'read_only') {
    editedKey.value.description = editedKey.value.description || 'Read-only key'
    editedKey.value.rate_limit_per_minute = 120
    localScopes.value = [{ collection: '*', actions: ['search', 'collections_list'], embedded_filters: '' }]
    return
  }

  if (preset === 'writer') {
    editedKey.value.description = editedKey.value.description || 'Writer key'
    editedKey.value.rate_limit_per_minute = 300
    localScopes.value = [{ collection: '*', actions: ['search', 'create', 'update', 'delete', 'collections_list'], embedded_filters: '' }]
    return
  }

  if (preset === 'admin') {
    editedKey.value.description = editedKey.value.description || 'Admin key'
    editedKey.value.rate_limit_per_minute = 1000
    localScopes.value = [{ collection: '*', actions: ['*'], embedded_filters: '' }]
  }
}

const removeScope = (index) => {
  localScopes.value.splice(index, 1)
}

const saveKey = async () => {
  if (!keyForm.value.validate()) return
  if (!hasValidScopes.value) {
    toast.error('Please fix scope settings before saving.')
    return
  }
  
  saving.value = true
  
  // Convert localScopes array back to object
  const scopesObj = {}
  localScopes.value.forEach(s => {
    const collectionName = String(s.collection || '').trim()
    const rawActions = Array.isArray(s.actions) ? s.actions : []
    const deduped = [...new Set(rawActions)]
    const finalActions = deduped.includes('*') ? ['*'] : deduped

    if (collectionName) {
      scopesObj[collectionName] = {
        actions: finalActions,
        embedded_filters: s.embedded_filters
      }
    }
  })
  
  const payload = {
    description: editedKey.value.description,
    rate_limit_per_minute: editedKey.value.rate_limit_per_minute,
    scopes: scopesObj
  }
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const proxy = shouldUseProxy(baseUrlValue)
    
    if (isEdit.value) {
      const url = buildApiUrl(baseUrlValue, proxy, `/keys/${editedKey.value.id}`)
      await axios.put(url, payload)
      toast.success('API key updated successfully')
      loadKeys()
      closeDialog()
    } else {
      const url = buildApiUrl(baseUrlValue, proxy, '/keys')
      const response = await axios.post(url, payload)
      createdRawKey.value = response.data.key
      toast.success('API key created successfully')
      loadKeys()
    }
  } catch (err) {
    console.error('Failed to save key:', err)
    toast.error(err.response?.data?.error || 'Failed to save API key')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (item) => {
  keyToDelete.value = item
  deleteDialog.value = true
}

const deleteKey = async () => {
  if (!keyToDelete.value) return
  
  deleting.value = true
  try {
    const url = buildApiUrl(getBaseUrlValue(baseUrl), shouldUseProxy(getBaseUrlValue(baseUrl)), `/keys/${keyToDelete.value.id}`)
    await axios.delete(url)
    toast.success('API key deleted successfully')
    loadKeys()
    deleteDialog.value = false
  } catch (err) {
    console.error('Failed to delete key:', err)
    toast.error('Failed to delete API key')
  } finally {
    deleting.value = false
  }
}

const formatActions = (actions) => {
  if (!actions || actions.length === 0) return 'None'
  if (actions.includes('*')) return 'Full'
  return actions.length
}

const formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat().format(num)
}

const formatDate = (timestamp) => {
  if (!timestamp || timestamp === 0) return 'Never'
  // Server returns unix timestamp in seconds
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

const timeAgo = (timestamp) => {
  if (!timestamp || timestamp === 0) return 'Never'
  const diff = Math.floor((new Date() - new Date(timestamp * 1000)) / 1000)
  const absDiff = Math.abs(diff)
  const isFuture = diff < 0
  
  let value
  let unit
  
  if (absDiff < 60) {
    value = absDiff
    unit = 'second'
  } else if (absDiff < 3600) {
    value = Math.floor(absDiff / 60)
    unit = 'minute'
  } else if (absDiff < 86400) {
    value = Math.floor(absDiff / 3600)
    unit = 'hour'
  } else if (absDiff < 2592000) {
    value = Math.floor(absDiff / 86400)
    unit = 'day'
  } else if (absDiff < 31536000) {
    value = Math.floor(absDiff / 2592000)
    unit = 'month'
  } else {
    value = Math.floor(absDiff / 31536000)
    unit = 'year'
  }
  
  const result = `${value} ${unit}${value !== 1 ? 's' : ''}`
  return isFuture ? result : `${result} ago`
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Copied to clipboard')
  })
}

onMounted(() => {
  loadKeys()
  loadCollections()
})
</script>

<style scoped>
.access-view {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 0 60px 0;
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

.collections-table {
  width: 100% !important;
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

.collections-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
}

.collections-title-section {
  display: flex;
  align-items: center;
}

.collections-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.scope-row {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.scope-row-header {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.key-builder-intro {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.preset-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rate-presets {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.scope-summary-card {
  border-color: #dbeafe !important;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%) !important;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.summary-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  background: #ffffff;
}

.summary-label {
  display: block;
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.summary-value {
  display: block;
  color: #1e293b;
  font-size: 14px;
  font-weight: 700;
  margin-top: 2px;
}

.dialog-readiness-text {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.text-tiny {
  font-size: 10px;
}

.dialog-header {
  border-bottom: 1px solid #e2e8f0;
}

.dialog-card {
  border-radius: 12px !important;
  overflow: hidden;
}

.collections-dir-icon {
  margin-right: 4px;
}

.collections-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
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
  color: #64748b !important;
  margin: 2px 0 0 0 !important;
  padding: 0 !important;
}

.collections-total-text .collections-dir-icon {
  color: #94a3b8 !important;
  margin-right: 6px;
  vertical-align: middle;
}

.cursor-help {
  cursor: help;
}

.google-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.header-search-input-improved :deep(.v-field) {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
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
  background: #e8f0fe;
}

.google-toolbar-btn :deep(.v-icon) {
  color: inherit;
  font-size: 18px;
}

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

.items-per-page-btn :deep([role="tooltip"]),
.items-per-page-btn :deep(.v-tooltip),
.items-per-page-btn :deep(.v-overlay__content) {
  display: none !important;
  visibility: hidden !important;
}

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

.google-menu-item :deep(.v-list-item__append) {
  display: none !important;
}

.google-menu-item :deep(.v-list-item__prepend) {
  display: none !important;
}

.google-menu-item :deep(.v-list-item__append > .v-icon) {
  display: none !important;
}

@media (max-width: 768px) {
  .collections-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .collections-header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}

/* Collections action buttons - Same style as CollectionsView */
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
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow:
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
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
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
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

/* Empty state - match CollectionsView */
.empty-collections-card {
  border-radius: 16px !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  max-width: 600px !important;
  margin: 0 auto !important;
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

.empty-collections-content {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 80px 40px !important;
  text-align: center !important;
  min-height: 320px !important;
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
    width: 100% !important;
    max-width: 280px !important;
  }
}
</style>
