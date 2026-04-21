<template>
  <div>
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
          <h1 class="collections-title-text">Connections</h1>
        </div>
      </div>
      <div class="collections-header-actions">
        <v-btn
          @click="loadConnections"
          :loading="loading"
          variant="flat"
          size="small"
          class="collections-action-btn"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      elevation="1"
    >
      <div class="font-weight-bold mb-1">Error Loading Connections</div>
      {{ error }}
    </v-alert>

    <v-card v-if="!loading && connections" class="mb-card">
      <v-card-title class="d-flex align-center pa-5" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 16px 16px 0 0;">
        <v-icon icon="mdi-network" class="mr-2" color="white"></v-icon>
        <span class="text-white font-weight-bold">Active Connections</span>
        <v-spacer></v-spacer>
        <v-chip color="white" variant="flat" size="small">
          {{ connections.active_connections || 0 }} active
        </v-chip>
      </v-card-title>
      <v-card-text class="pa-4">
        <!-- Summary Cards -->
        <v-row class="mb-4">
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-caption text-grey-darken-1 mb-1">Active Connections</div>
                  <div class="text-h4 font-weight-bold text-primary">{{ connections.active_connections || 0 }}</div>
                </div>
                <v-avatar size="64" color="primary" variant="flat">
                  <v-icon icon="mdi-account-network" size="32" color="white"></v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-caption text-grey-darken-1 mb-1">Total Requests</div>
                  <div class="text-h4 font-weight-bold text-success">{{ formatNumber(connections.total_requests || 0) }}</div>
                </div>
                <v-avatar size="64" color="success" variant="flat">
                  <v-icon icon="mdi-chart-line" size="32" color="white"></v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-caption text-grey-darken-1 mb-1">Bytes Processed</div>
                  <div class="text-h4 font-weight-bold text-info">{{ formatBytes(connections.total_bytes_processed || 0) }}</div>
                </div>
                <v-avatar size="64" color="info" variant="flat">
                  <v-icon icon="mdi-database" size="32" color="white"></v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Connection Details Table -->
        <v-card v-if="connections.connections && connections.connections.length > 0" variant="outlined" class="mt-4">
          <v-card-title class="pa-4">
            <v-icon icon="mdi-table" class="mr-2"></v-icon>
            Connection Details
          </v-card-title>
          <v-table class="connections-table">
            <thead>
              <tr>
                <th class="text-left">IP Address</th>
                <th class="text-left">Port</th>
                <th class="text-left">Connected At</th>
                <th class="text-left">Duration</th>
                <th class="text-left">Requests</th>
                <th class="text-left">Bytes</th>
                <th class="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(conn, index) in connections.connections" :key="conn.server_id || `conn-${index}`">
                <td>{{ conn.ip_address || 'N/A' }}</td>
                <td>{{ conn.port || 'N/A' }}</td>
                <td>{{ formatTime(conn.connected_at) }}</td>
                <td>{{ formatDuration(conn.duration_seconds) }}</td>
                <td>{{ formatNumber(conn.request_count || 0) }}</td>
                <td>{{ formatBytes(conn.bytes_sent || 0) }}</td>
                <td>
                  <v-chip size="small" color="success" variant="flat">Active</v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <v-alert
          v-if="connections.active_connections === 0"
          type="info"
          variant="tonal"
          class="mt-4"
        >
          <div class="font-weight-bold mb-1">No Active Connections</div>
          There are currently no active connections to the server.
        </v-alert>
      </v-card-text>
    </v-card>

    <v-card v-if="loading" elevation="2">
      <v-card-text class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <div class="mt-4 text-body-1">Loading connections...</div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const router = useRouter()
const baseUrl = inject('baseUrl')

const connections = ref(null)
const loading = ref(false)
const error = ref(null)
const refreshInterval = ref(null)

const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return num.toLocaleString()
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString()
  } catch (e) {
    return String(timestamp)
  }
}

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return 'N/A'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

const goBack = () => {
  router.push('/collections')
}

const loadConnections = async () => {
  loading.value = true
  error.value = null
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      error.value = 'Invalid server URL configuration'
      loading.value = false
      return
    }
    
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/connections')
    
    const response = await axios.get(url, { timeout: 5000 })
    connections.value = response.data
  } catch (err) {
    error.value = extractSafeErrorMessage(err, 'Failed to load connections')
    console.error('Error loading connections:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadConnections()
  // Auto-refresh every 3 seconds
  refreshInterval.value = setInterval(() => {
    loadConnections()
  }, 3000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.connections-view {
  width: 100%;
}

.connections-header-card {
  border: 1px solid #e2e8f0 !important;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
}

.connections-content-card {
  border: 1px solid #e2e8f0 !important;
}

/* Ensure connections table uses consistent hover effects */
.connections-table :deep(tbody tr:hover),
.connections-table tbody tr:hover {
  background: var(--gray-50) !important;
  background-color: var(--gray-50) !important;
  cursor: pointer !important;
  transform: translateX(2px) !important;
  box-shadow: -2px 0 0 0 var(--primary-light) !important;
}

.connections-table :deep(tbody tr:hover td),
.connections-table tbody tr:hover td {
  background: var(--gray-50) !important;
  background-color: var(--gray-50) !important;
  color: var(--gray-900) !important;
}

.connections-table :deep(tbody tr:nth-child(even)),
.connections-table tbody tr:nth-child(even) {
  background: var(--gray-50) !important;
}

.connections-table :deep(tbody tr:nth-child(even):hover),
.connections-table tbody tr:nth-child(even):hover {
  background: var(--gray-100) !important;
  background-color: var(--gray-100) !important;
}

.connections-table :deep(tbody tr:nth-child(even):hover td),
.connections-table tbody tr:nth-child(even):hover td {
  background: var(--gray-100) !important;
  background-color: var(--gray-100) !important;
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
  font-size: 18px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-header-actions {
  display: flex !important;
  gap: 16px !important;
  align-items: center !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

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
