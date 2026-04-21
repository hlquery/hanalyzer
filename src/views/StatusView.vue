<template>
  <div class="status-view">
    <div class="status-container">
      <!-- Hero Status Card -->
      <v-card 
        class="status-hero-card"
        :class="{ 'status-hero-card--connected': isConnected, 'status-hero-card--disconnected': !isConnected }"
        elevation="0"
      >
        <v-card-text class="status-hero-content">
          <!-- Ping Display Top Right -->
          <v-tooltip location="bottom" v-if="isConnected && lastPingTime !== null">
            <template v-slot:activator="{ props }">
              <div v-bind="props" class="status-ping">
                <span>{{ Math.round(lastPingTime) }}ms</span>
              </div>
            </template>
            <span>Ping time, last check: {{ formatTime(lastCheckTime) }}</span>
          </v-tooltip>
          
          <div class="status-indicator">
            <div class="status-icon-wrapper">
              <v-icon 
                :color="isConnected ? 'success' : 'error'" 
                size="80"
                class="status-icon"
              >
                {{ isConnected ? 'mdi-check-circle' : 'mdi-alert-circle' }}
              </v-icon>
            </div>
            <div class="status-text">
              <h1 class="status-title">
                {{ isConnected ? 'Server is Online' : 'Server is Offline' }}
              </h1>
              <p class="status-description">
                {{ isConnected 
                  ? 'Your hlquery server is running and responding to requests.' 
                  : 'Unable to connect to the server. Please check if the server is running.' 
                }}
              </p>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useConnectionStatus } from '../composables/useConnectionStatus'

const router = useRouter()
const baseUrl = inject('baseUrl', ref('http://localhost:9200'))

const { isConnected, lastPingTime, isChecking, checkConnection } = useConnectionStatus(baseUrl)
const lastCheckTime = ref(null)
const serverStats = ref(null)
const isLoadingStats = ref(false)

const checkStatus = async () => {
  await checkConnection()
  lastCheckTime.value = new Date()
  
  // Fetch server stats if connected
  if (isConnected.value) {
    await fetchServerStats()
  } else {
    serverStats.value = null
  }
}

const fetchServerStats = async () => {
  if (isLoadingStats.value) return
  
  isLoadingStats.value = true
  try {
    const baseUrlValue = baseUrl?.value || baseUrl
    const useProxy = baseUrlValue.includes('localhost:9200') || baseUrlValue.includes('127.0.0.1:9200')
    const url = useProxy ? '/api/status' : `${baseUrlValue}/status`
    
    const response = await axios.get(url, { timeout: 3000 })
    if (response.status === 200 && response.data) {
      serverStats.value = response.data
    }
  } catch (err) {
    // Silently fail - stats are optional
    serverStats.value = null
  } finally {
    isLoadingStats.value = false
  }
}

const formatTime = (date) => {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}

const goToCollections = () => {
  router.push('/collections')
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const formatBytes = (bytes) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return bytes + ' B'
}

const getCacheColor = (rate) => {
  if (rate >= 80) return 'success'
  if (rate >= 50) return 'warning'
  return 'error'
}

onMounted(() => {
  checkStatus()
  // Auto-refresh every 5 seconds
  const interval = setInterval(() => {
    checkStatus()
  }, 5000)
  
  // Cleanup on unmount
  return () => clearInterval(interval)
})
</script>

<style scoped>
.status-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.status-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Hero Status Card */
.status-hero-card {
  border-radius: 16px !important;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border: 1px solid #e2e8f0 !important;
  position: relative !important;
  max-width: 600px !important;
  margin: 0 auto !important;
  
  /* 3D Popup Effect */
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
}

.status-hero-card::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  border-radius: 16px !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%) !important;
  pointer-events: none !important;
  opacity: 1 !important;
  z-index: 1 !important;
}


.status-hero-card--connected {
  background: #ffffff !important;
  border-color: #e2e8f0 !important;
}

.status-hero-card--disconnected {
  background: #ffffff !important;
  border-color: #e2e8f0 !important;
}

.status-hero-content {
  padding: 40px 32px !important;
  position: relative !important;
  z-index: 2 !important;
}

.status-ping {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500;
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  cursor: help;
}

.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
}

.status-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon {
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.status-text {
  flex: 1;
}

.status-title {
  font-size: 32px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  letter-spacing: -0.02em;
}

.status-description {
  font-size: 16px;
  color: #64748b;
  margin: 0 0 24px 0;
  line-height: 1.6;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

/* Server Info Inside Hero Card */
.status-hero-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

.status-hero-info-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  width: 100%;
}

.status-hero-chip {
  font-size: 12px !important;
  height: 26px !important;
  font-weight: 600 !important;
}


.status-hero-uptime {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500;
  padding: 4px 12px;
  background: #f8fafc;
  border-radius: 6px;
}



/* Responsive */
@media (max-width: 960px) {
  .status-view {
    padding: 16px;
  }
  
  .status-hero-content {
    padding: 32px 24px !important;
  }
  
  .status-title {
    font-size: 28px;
  }
  
  .status-description {
    font-size: 16px;
  }
}

@media (max-width: 600px) {
  .status-hero-content {
    padding: 24px 16px !important;
  }
  
  .status-title {
    font-size: 24px;
  }
  
  .status-description {
    font-size: 15px;
  }
  
  .status-hero-info {
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
  }
}
</style>
