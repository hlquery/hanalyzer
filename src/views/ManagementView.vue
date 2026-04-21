<template>
  <div class="management-view">
    <!-- Header -->
    <div class="collections-header">
      <div class="collections-title-section">
        <v-btn
          variant="text"
          size="small"
          @click="goBack"
          class="back-button-text"
          prepend-icon="mdi-arrow-left"
        >
          Back
        </v-btn>
        <div>
          <h1 class="collections-title-text">Server Management</h1>
        </div>
      </div>
      <div class="collections-header-actions">
        <v-btn
          @click="refreshAll"
          :loading="loading"
          variant="flat"
          size="small"
          class="collections-action-btn"
        >
          Refresh All
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      <div class="font-weight-bold mb-1">Error</div>
      {{ error }}
    </v-alert>

    <!-- Tabs for different management sections -->
    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="connections">
        <v-icon start>mdi-network</v-icon>
        Connections
      </v-tab>
      <v-tab value="rocksdb">
        <v-icon start>mdi-database</v-icon>
        RocksDB Engine
      </v-tab>
      <v-tab value="system">
        <v-icon start>mdi-cog</v-icon>
        System Info
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- Connections Management -->
      <v-window-item value="connections">
        <v-card>
          <v-card-title class="d-flex align-center pa-4">
            <v-icon class="mr-3">mdi-network</v-icon>
            <span>Active Connections</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <div v-if="connectionsLoading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <div v-else-if="connectionStats" class="stats-list">
              <div class="stats-item">
                <div class="stats-item-label">Active Connections</div>
                <div class="stats-item-value">{{ connectionStats.active_connections || 0 }}</div>
              </div>
              <v-divider class="my-3"></v-divider>
              <div class="stats-item">
                <div class="stats-item-label">Total Bytes Processed</div>
                <div class="stats-item-value">{{ formatBytes(connectionStats.total_bytes_processed || 0) }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- RocksDB Engine Stats -->
      <v-window-item value="rocksdb">
        <v-row>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="d-flex align-center pa-4">
                <v-icon class="mr-3">mdi-database</v-icon>
                <span>RocksDB Storage Statistics</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <div v-if="rocksdbLoading" class="text-center py-8">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                </div>
                <div v-else-if="rocksdbStats" class="stats-list">
                  <div class="stats-item">
                    <div class="stats-item-label">Total Size</div>
                    <div class="stats-item-value">{{ formatBytes(rocksdbStats.total_size) }}</div>
                  </div>
                  <v-divider class="my-3"></v-divider>
                  <div class="stats-item">
                    <div class="stats-item-label">Documents Size</div>
                    <div class="stats-item-value">{{ formatBytes(rocksdbStats.documents_size) }}</div>
                  </div>
                  <v-divider class="my-3"></v-divider>
                  <div class="stats-item">
                    <div class="stats-item-label">SSTable Count</div>
                    <div class="stats-item-value">{{ rocksdbStats.sstable_count || 0 }}</div>
                  </div>
                  <v-divider class="my-3"></v-divider>
                  <div class="stats-item">
                    <div class="stats-item-label">Bytes Written</div>
                    <div class="stats-item-value">{{ formatBytes(rocksdbStats.bytes_written) }}</div>
                  </div>
                  <v-divider class="my-3"></v-divider>
                  <div class="stats-item">
                    <div class="stats-item-label">Memtable Size</div>
                    <div class="stats-item-value">{{ formatBytes(rocksdbStats.memtable_size) }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="d-flex align-center pa-4">
                <v-icon class="mr-3">mdi-chart-pie</v-icon>
                <span>Storage Breakdown</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <div v-if="rocksdbStats" class="storage-breakdown">
                  <div class="breakdown-item">
                    <div class="breakdown-label">Documents</div>
                    <v-progress-linear
                      :model-value="getStoragePercent(rocksdbStats.documents_size, rocksdbStats.total_size)"
                      color="primary"
                      height="20"
                      rounded
                      class="mt-2"
                    >
                      <template v-slot:default>
                        <span class="text-white text-caption font-weight-bold">
                          {{ getStoragePercent(rocksdbStats.documents_size, rocksdbStats.total_size).toFixed(1) }}%
                        </span>
                      </template>
                    </v-progress-linear>
                  </div>
                  <div class="breakdown-item mt-4">
                    <div class="breakdown-label">SSTables</div>
                    <v-progress-linear
                      :model-value="getStoragePercent(rocksdbStats.bytes_written, rocksdbStats.total_size)"
                      color="success"
                      height="20"
                      rounded
                      class="mt-2"
                    >
                      <template v-slot:default>
                        <span class="text-white text-caption font-weight-bold">
                          {{ getStoragePercent(rocksdbStats.bytes_written, rocksdbStats.total_size).toFixed(1) }}%
                        </span>
                      </template>
                    </v-progress-linear>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- System Information -->
      <v-window-item value="system">
        <v-row>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="d-flex align-center pa-4">
                <v-icon class="mr-3">mdi-information</v-icon>
                <span>Server Information</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <div v-if="systemInfo" class="stats-list">
                  <div class="stats-item">
                    <div class="stats-item-label">Server URL</div>
                    <div class="stats-item-value text-truncate" style="max-width: 250px;" :title="baseUrl?.value || baseUrl">
                      {{ baseUrl?.value || baseUrl }}
                    </div>
                  </div>
                  <v-divider class="my-3"></v-divider>
                  <div class="stats-item">
                    <div class="stats-item-label">Version</div>
                    <div class="stats-item-value">{{ systemInfo.version || 'N/A' }}</div>
                  </div>
                  <v-divider class="my-3"></v-divider>
                  <div class="stats-item">
                    <div class="stats-item-label">Engine</div>
                    <div class="stats-item-value">{{ systemInfo.engine || 'hlquery' }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="d-flex align-center pa-4">
                <v-icon class="mr-3">mdi-feature-search</v-icon>
                <span>Available Features</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <div v-if="systemInfo?.features" class="features-list">
                  <v-chip
                    v-for="feature in systemInfo.features"
                    :key="feature"
                    size="small"
                    variant="tonal"
                    color="primary"
                    class="ma-1"
                  >
                    {{ feature }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useCollections } from '../composables/useCollections'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const router = useRouter()
const baseUrl = inject('baseUrl', ref('http://localhost:9200'))
const { collections, loadCollectionsAsync } = useCollections(baseUrl)

const activeTab = ref('connections')
const loading = ref(false)
const error = ref(null)

// Connections
const connectionStats = ref(null)
const connectionsLoading = ref(false)

// System Info
const systemInfo = ref(null)

// RocksDB Stats
const rocksdbStats = ref(null)
const rocksdbLoading = ref(false)

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getStoragePercent = (part, total) => {
  if (!total || total === 0) return 0
  return (part / total) * 100
}

const goBack = () => {
  router.push('/dashboard')
}

const loadConnectionStats = async () => {
  connectionsLoading.value = true
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/connections')
    const response = await axios.get(url, { timeout: 5000 })
    connectionStats.value = response.data
  } catch (err) {
    console.error('Error loading connection stats:', err)
  } finally {
    connectionsLoading.value = false
  }
}

const loadSystemInfo = async () => {
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/')
    const response = await axios.get(url, { timeout: 5000 })
    systemInfo.value = response.data
  } catch (err) {
    console.error('Error loading system info:', err)
  }
}

const loadRocksDBStats = async () => {
  rocksdbLoading.value = true
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/stats')
    const response = await axios.get(url, { timeout: 5000 })
    if (response.data?.rocksdb) {
      rocksdbStats.value = response.data.rocksdb
    }
  } catch (err) {
    console.error('Error loading RocksDB stats:', err)
  } finally {
    rocksdbLoading.value = false
  }
}

const refreshAll = async () => {
  loading.value = true
  error.value = null
  
  await Promise.all([
    loadConnectionStats(),
    loadSystemInfo(),
    loadRocksDBStats(),
    loadCollectionsAsync()
  ])
  
  loading.value = false
}

onMounted(() => {
  loadConnectionStats()
  loadSystemInfo()
  loadRocksDBStats()
  loadCollectionsAsync()
})
</script>

<style scoped>
.management-view {
  width: 100%;
}

.stats-list {
  width: 100%;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-item-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stats-item-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

.features-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.storage-breakdown {
  width: 100%;
}

.breakdown-item {
  width: 100%;
}

.breakdown-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
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

.collections-title-section > div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.collections-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 18px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
}

.collections-header-actions {
  display: flex !important;
  gap: 16px !important;
  align-items: center !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
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

/* Collections action buttons */
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
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
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

.collections-action-btn :deep(.v-btn__content) {
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
</style>
