<template>
  <div class="app-header-shell">
    <div
      v-if="showDemoModeBanner"
      class="demo-mode-banner"
      role="status"
      aria-live="polite"
    >
      <div class="demo-mode-banner__inner">
        <v-icon icon="mdi-flask-outline" size="18" class="demo-mode-banner__icon" />
        <div class="demo-mode-banner__content">
          <span class="demo-mode-banner__title">Demo mode enabled.</span>
          <span class="demo-mode-banner__message">
            <template
              v-for="(segment, index) in demoModeMessageParts"
              :key="`demo-message-${index}`"
            >
              <a
                v-if="segment.type === 'link'"
                :href="segment.value"
                target="_blank"
                rel="noopener noreferrer"
                class="demo-mode-banner__link"
              >
                {{ segment.value }}
              </a>
              <span v-else>{{ segment.value }}</span>
            </template>
          </span>
        </div>
      </div>
    </div>

    <v-app-bar 
      color="#111827"
      elevation="0"
      :class="['app-navbar', { 'app-navbar--scrolled': isScrolled }]"
      height="62"
      @contextmenu="handleHeaderContextMenu"
    >
    <!-- Logo - Left -->
    <v-app-bar-title class="hlquery-nav-logo">
      <router-link to="/collections" class="hlquery-logo-container">
        <img 
          :src="logoSrc"
          alt="hlquery logo" 
          class="logo-image"
        />
        <span class="hlquery-nav-title mobile-hide-text" @mouseenter="isHovered = true" @mouseleave="isHovered = false" :class="{ 'hlquery-nav-title--hovered': isHovered }">hlquery</span>
      </router-link>
    </v-app-bar-title>
    
    <v-spacer class="mobile-hide-spacer"></v-spacer>
    
    <div class="header-right-actions">
      <!-- Navigation Dropdown -->
      <v-menu
        v-if="isEffectivelyConnected"
        v-model="showNavMenu"
        location="bottom"
        :offset="8"
        class="nav-menu"
        @update:modelValue="handleNavMenuToggle"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            size="default"
            class="hlquery-nav-button header-action-btn header-action-btn--light nav-menu-btn"
            title="Manage"
            :aria-label="display.xs.value ? 'Open navigation menu' : 'Manage'"
            :prepend-icon="display.xs.value ? undefined : 'mdi-menu'"
          >
            <v-icon v-if="display.xs.value" icon="mdi-menu" />
            <span v-else class="nav-button-text">Manage</span>
          </v-btn>
        </template>
        <v-list class="nav-menu-list">
          <router-link to="/collections" custom v-slot="{ navigate, href }">
            <v-list-item
              :href="href"
              @click="navigate"
              :class="['nav-menu-item', { 'nav-menu-item--active': isCollectionsActive }]"
              prepend-icon="mdi-folder-multiple"
            >
              <v-list-item-title>Collections</v-list-item-title>
            </v-list-item>
          </router-link>
          <router-link to="/aliases" custom v-slot="{ navigate, href }">
            <v-list-item
              :href="href"
              @click="navigate"
              :class="['nav-menu-item', { 'nav-menu-item--active': isAliasesActive }]"
              prepend-icon="mdi-link-variant"
            >
              <v-list-item-title>Aliases</v-list-item-title>
            </v-list-item>
          </router-link>
          <router-link to="/sql" custom v-slot="{ navigate, href }">
            <v-list-item
              :href="href"
              @click="navigate"
              :class="['nav-menu-item', { 'nav-menu-item--active': isSqlActive }]"
              prepend-icon="mdi-database"
            >
              <v-list-item-title>SQL</v-list-item-title>
            </v-list-item>
          </router-link>
          <router-link to="/access" custom v-slot="{ navigate, href }">
            <v-list-item
              :href="href"
              @click="navigate"
              :class="['nav-menu-item', { 'nav-menu-item--active': isAccessActive }]"
              prepend-icon="mdi-key-chain"
            >
              <v-list-item-title>Access</v-list-item-title>
            </v-list-item>
          </router-link>
          <router-link to="/globals" custom v-slot="{ navigate, href }">
            <v-list-item
              :href="href"
              @click="navigate"
              :class="['nav-menu-item', { 'nav-menu-item--active': isGlobalsActive }]"
              prepend-icon="mdi-earth"
            >
              <v-list-item-title>Globals</v-list-item-title>
            </v-list-item>
          </router-link>
          <router-link to="/links" custom v-slot="{ navigate, href }">
            <v-list-item
              :href="href"
              @click="navigate"
              :class="['nav-menu-item', { 'nav-menu-item--active': isLinksActive }]"
              prepend-icon="mdi-lan"
            >
              <v-list-item-title>Links</v-list-item-title>
            </v-list-item>
          </router-link>
          <router-link to="/dashboard" custom v-slot="{ navigate, href }">
            <v-list-item
              :href="href"
              @click="navigate"
              :class="['nav-menu-item', { 'nav-menu-item--active': isDashboardActive }]"
              prepend-icon="mdi-view-dashboard"
            >
              <v-list-item-title>Dashboard</v-list-item-title>
            </v-list-item>
          </router-link>
        </v-list>
      </v-menu>

      <!-- Connection Status - Far Right -->
      <div class="d-flex align-center connection-buttons-container">
        <v-btn
          v-if="deploymentDemoMode"
          variant="flat"
          size="default"
          prepend-icon="mdi-server-network"
          :title="`Demo server: ${serverHost}`"
          :aria-label="`Demo server ${serverHost}`"
          class="connection-status-btn header-action-btn header-action-btn--light"
          :class="{ disconnected: !isEffectivelyConnected }"
          @click="attemptReconnect"
        >
          <span v-if="!isCompactHostButton" class="connection-host-text">{{ serverHost }}</span>
        </v-btn>
        <!-- Connection Status Button - Opens server settings menu -->
        <v-menu 
          v-else
          v-model="showServerMenu" 
          location="bottom end"
          :close-on-content-click="false"
          :offset="8"
          persistent
          @update:modelValue="handleServerMenuToggle"
        >
        <template v-slot:activator="{ props }">
          <v-btn
            v-if="isEffectivelyConnected"
            v-bind="props"
            variant="flat"
            size="default"
            prepend-icon="mdi-cog"
            :title="`Server: ${serverHost}`"
            :aria-label="`Server settings for ${serverHost}`"
            class="connection-status-btn header-action-btn header-action-btn--light"
          >
            <span v-if="!isCompactHostButton" class="connection-host-text">{{ serverHost }}</span>
          </v-btn>
          <div v-else class="d-flex align-center" style="gap: 8px;">
            <v-btn
              v-bind="props"
              variant="text"
              size="small"
              color="error"
              class="connection-status-btn disconnected connection-action-btn"
            >
              <v-icon size="16" left icon="mdi-server-off" />
              Connect
            </v-btn>
          </div>
        </template>
        <v-card class="connection-menu-card" @click.stop @mousedown.stop>
          <v-card-title class="connection-info-title pa-4 pb-3">
            <div class="d-flex flex-column w-100">
              <div class="connection-menu-header-row">
                <div class="connection-menu-host-group">
                  <v-icon icon="mdi-server-network" class="mr-2" size="20" color="primary"></v-icon>
                  <div class="connection-host-display">{{ serverHost }}</div>
                </div>
              </div>
            </div>
          </v-card-title>
          <v-card-text class="pa-4">


            <!-- Disconnected Message -->
            <div v-if="!isEffectivelyConnected" class="mb-4">
              <v-alert type="error" variant="tonal" density="compact" class="mb-0">
                <div class="text-body-2">Unable to connect to server. Check your connection and server URL.</div>
              </v-alert>
            </div>

            <!-- Server Settings Section -->
            <div class="text-body-2 font-weight-bold mb-3 d-flex align-center">
              <v-icon icon="mdi-cog" class="mr-2" size="18"></v-icon>
              <span>Server Settings</span>
            </div>

            <!-- Auth Status Banner - Show prominently at top - ALWAYS VISIBLE -->
            <v-alert
              v-if="authRequired"
              type="error"
              variant="flat"
              density="comfortable"
              class="mb-4 auth-status-banner-required"
              icon="mdi-alert-circle"
              border="start"
              prominent
            >
              <div class="text-body-1 font-weight-bold mb-1">
                🔒 Authentication REQUIRED
              </div>
              <div class="text-body-2">
                This server requires authentication. Auth headers will be sent automatically with all requests.
              </div>
            </v-alert>
            <v-alert
              v-else-if="hasAuthConfigured"
              type="success"
              variant="flat"
              density="comfortable"
              class="mb-4 auth-status-banner-not-required"
              icon="mdi-check-circle"
              border="start"
              prominent
            >
              <div class="text-body-1 font-weight-bold mb-1">
                ✅ Authentication NOT Required
              </div>
              <div class="text-body-2">
                This server does not require authentication. Auth headers will <strong>NOT</strong> be sent to avoid unnecessary requests.
              </div>
            </v-alert>
            <v-alert
              v-else
              type="info"
              variant="flat"
              density="comfortable"
              class="mb-4 auth-status-banner-optional"
              icon="mdi-information"
              border="start"
              prominent
            >
              <div class="text-body-1 font-weight-bold mb-1">
                ℹ️ No Authentication Required
              </div>
              <div class="text-body-2">
                This server does not require authentication. Token is optional and will only be sent if the server requests it.
              </div>
            </v-alert>
            
            <div class="mb-3">
              <div class="text-caption text-grey-darken-1 mb-2 font-weight-medium">Server URL</div>
              <v-text-field
                v-model="serverUrl"
                placeholder="http://localhost:9200"
                prepend-inner-icon="mdi-server-network"
                variant="outlined"
                hide-details
                density="compact"
                @keyup.enter="updateBaseUrl"
                @click.stop
                @mousedown.stop
                class="server-url-input-modern"
              ></v-text-field>
              <a
                v-if="clickableServerUrl"
                :href="clickableServerUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="server-url-link"
                @click.stop
                @mousedown.stop
              >
                {{ clickableServerUrl }}
              </a>
              <label
                class="mt-2 ssl-checkbox"
                @click.stop
                @mousedown.stop
              >
                <input
                  v-model="sslEnabled"
                  type="checkbox"
                  class="ssl-checkbox__input"
                  @click.stop
                  @mousedown.stop
                />
                <span class="ssl-checkbox__label">Use SSL (HTTPS)</span>
              </label>
            </div>
            
            <!-- Authentication Section -->
            <v-expansion-panels v-model="authPanelExpanded" variant="accordion" class="mb-3">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100">
                    <div class="d-flex align-center">
                      <v-icon :icon="authRequired ? 'mdi-lock-alert' : 'mdi-lock'" :color="authRequired ? 'error' : 'default'" class="mr-2" size="18"></v-icon>
                      <span class="text-body-2 font-weight-medium">Authentication {{ authRequired ? '(Required)' : '(Optional)' }}</span>
                    </div>
                    <v-chip 
                      v-if="authRequired"
                      color="error" 
                      size="x-small" 
                      variant="flat"
                      class="ml-2"
                    >
                      Required
                    </v-chip>
                    <v-chip 
                      v-else-if="hasAuthConfigured"
                      color="success" 
                      size="x-small" 
                      variant="flat"
                      class="ml-2"
                    >
                      Configured
                    </v-chip>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div class="mb-3">
                    <div class="text-caption text-grey-darken-1 font-weight-medium mb-2">Token</div>
                    <v-text-field
                      :key="tokenKey"
                      v-model="authToken"
                      placeholder="Enter token"
                      prepend-inner-icon="mdi-key"
                      variant="outlined"
                      :type="showToken ? 'text' : 'password'"
                      :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="showToken = !showToken"
                      hide-details
                      density="compact"
                      @click.stop
                      @mousedown.stop
                      class="auth-token-input-modern"
                      ref="authTokenInputRef"
                    ></v-text-field>
                    <div v-if="activeSessionToken" class="d-flex align-center justify-space-between mt-2">
                      <div class="text-caption text-grey-darken-1">
                        Active token: {{ activeTokenMasked }}
                      </div>
                      <v-btn
                        size="x-small"
                        variant="text"
                        class="auth-token-use-btn"
                        @click.stop="useActiveToken"
                      >
                        Use
                      </v-btn>
                    </div>
                  </div>
                  
                  <v-alert
                    v-if="authRequired"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mb-2"
                    icon="mdi-alert"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      ⚠️ This server REQUIRES authentication
                    </div>
                    <div class="text-caption">
                      You must provide a valid token. Requests will fail without authentication. Auth headers will be sent automatically.
                    </div>
                  </v-alert>
                  <v-alert
                    v-else-if="hasAuthConfigured"
                    type="info"
                    variant="tonal"
                    density="compact"
                    class="mb-2"
                    icon="mdi-information"
                  >
                    <div class="text-caption font-weight-medium mb-1">
                      ℹ️ Authentication is configured but NOT required
                    </div>
                    <div class="text-caption">
                      This server does not require authentication. Auth headers will NOT be sent to avoid unnecessary requests.
                    </div>
                  </v-alert>
                  <v-alert
                    v-else
                    type="info"
                    variant="tonal"
                    density="compact"
                    class="mb-0"
                    icon="mdi-information"
                  >
                    <div class="text-caption">
                      ℹ️ This server does not require authentication. Token is optional and will only be sent if the server requests it.
                    </div>
                  </v-alert>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
            
            <div class="d-flex justify-end mt-4">
              <v-btn
                @click="updateBaseUrl"
                variant="flat"
                size="small"
                class="collections-action-btn"
              >
                Connect
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-menu>
    </div>
    </div>
    </v-app-bar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject, nextTick } from 'vue'
import { useTheme, useDisplay } from 'vuetify'
import { useRouter, useRoute } from 'vue-router'
import { useConnectionStatus } from '../composables/useConnectionStatus'
import { useCollections } from '../composables/useCollections'
import { useAuth, authManager } from '../composables/useAuth'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'

const theme = useTheme()
const display = useDisplay()
const router = useRouter()
const route = useRoute()
const baseUrl = inject('baseUrl')
const deploymentDemoMode = inject('deploymentDemoMode', ref(false))
const logoSrc = `${import.meta.env.BASE_URL || './'}logo.png`
const emit = defineEmits(['open-command-palette'])

// Check if navigation items are active
const isCollectionsActive = computed(() => {
  return route.path === '/collections' || route.path.startsWith('/collections/')
})

const isDashboardActive = computed(() => {
  return route.path === '/dashboard' || route.path.startsWith('/dashboard/')
})

const isAliasesActive = computed(() => {
  return route.path === '/aliases' || route.path.startsWith('/aliases/')
})

const isSqlActive = computed(() => {
  return route.path === '/sql' || route.path.startsWith('/sql/')
})

const isAccessActive = computed(() => {
  return route.path === '/access' || route.path.startsWith('/access/')
})

const isGlobalsActive = computed(() => {
  return route.path === '/globals' || route.path.startsWith('/globals/')
})

const isLinksActive = computed(() => {
  return route.path === '/links' || route.path.startsWith('/links/')
})

const serverUrl = ref('http://localhost:9200')
const sslEnabled = ref(false)
const showServerMenu = ref(false)
const showNavMenu = ref(false)
const showPingMenu = ref(false)
const isScrolled = ref(false)
const isHovered = ref(false)
const distributedMode = ref('auto')
const demoModeEnabled = ref(false)
const demoModeMessage = ref('')
const defaultDemoModeMessage = 'Search and browsing are enabled. Write and admin actions are blocked in demo mode.'
const distributedModeOptions = [
  { title: 'Auto (Server Default)', value: 'auto' },
  { title: 'Force On (distributed=on)', value: 'on' },
  { title: 'Force Off (distributed=off)', value: 'off' }
]

const demoModeMessageParts = computed(() => {
  const message = (demoModeMessage.value || defaultDemoModeMessage).trim()
  const parts = []
  const urlPattern = /(https?:\/\/[^\s]+)/g
  let lastIndex = 0
  let match

  while ((match = urlPattern.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: message.slice(lastIndex, match.index)
      })
    }

    parts.push({
      type: 'link',
      value: match[0]
    })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < message.length) {
    parts.push({
      type: 'text',
      value: message.slice(lastIndex)
    })
  }

  return parts.length > 0
    ? parts
    : [{ type: 'text', value: message }]
})

const canShowDemoModeNotice = computed(() => {
  return hasChecked.value && isConnected.value && !isChecking.value
})

const showDemoModeBanner = computed(() => {
  return canShowDemoModeNotice.value && demoModeEnabled.value
})

const handleNavMenuToggle = (isOpen) => {
  showNavMenu.value = isOpen
  if (isOpen) {
    showServerMenu.value = false
    showPingMenu.value = false
  }
}

const handleServerMenuToggle = (isOpen) => {
  showServerMenu.value = isOpen
  if (isOpen) {
    showNavMenu.value = false
    showPingMenu.value = false
  }
}

const handlePingMenuToggle = (isOpen) => {
  showPingMenu.value = isOpen
  if (isOpen) {
    showNavMenu.value = false
    showServerMenu.value = false
  }
}

// Authentication state
const { setAuthForServer, getAuthForServer, loadAuthFromStorage, clearAllAuth, runtimeConfigRevision } = useAuth()
const authPanelExpanded = ref(false)
const authToken = ref('')
const showToken = ref(false)
const authTokenInputRef = ref(null)
const tokenKey = ref(0) // Key to force re-render when token is loaded
let authSaveTimer = null

const applyDistributedMode = () => {
  if (typeof window === 'undefined') return
  if (distributedMode.value === 'on' || distributedMode.value === 'off') {
    window.__HLQUERY_DISTRIBUTED_OVERRIDE__ = distributedMode.value
  } else {
    window.__HLQUERY_DISTRIBUTED_OVERRIDE__ = ''
  }
}

// NOTE: tokenKey is used only for programmatic token injection (openServerMenu).
// Do not re-render the input on every keystroke, as it can interrupt typing.

// Check if auth is configured for current server (use serverUrl for modal, baseUrl for current)
const hasAuthConfigured = computed(() => {
  runtimeConfigRevision.value
  // When modal is open, check serverUrl, otherwise check baseUrl
  const url = showServerMenu.value ? (serverUrl.value || baseUrl?.value || baseUrl) : (baseUrl?.value || baseUrl)
  const auth = authManager.resolveCredentials(url)
  return authManager.hasCredentials(auth)
})

const injectedConnectionState = inject('connectionState', null)
const connectionState = injectedConnectionState || useConnectionStatus(baseUrl)
const { isConnected, lastPingTime, latencyHistory, isChecking, hasChecked, checkConnection } = connectionState
const isEffectivelyConnected = computed(() => {
  runtimeConfigRevision.value
  const url = baseUrl?.value || baseUrl
  const auth = authManager.resolveCredentials(url)
  const hasAuthForBase = authManager.hasCredentials(auth)
  return isConnected.value && !(authRequired.value && !hasAuthForBase)
})
const { collections, loading: collectionsLoading, loadCollectionsAsync } = useCollections(baseUrl)

// Get server host from baseUrl
const serverHost = computed(() => {
  if (deploymentDemoMode.value) {
    return 'localhost:9200'
  }

  const rawBaseUrl = (baseUrl.value || '').trim()
  if (!rawBaseUrl) return 'localhost:9200'

  if (rawBaseUrl.startsWith('/')) {
    return window.location.host || rawBaseUrl
  }

  try {
    const url = new URL(rawBaseUrl)
    return url.host || url.hostname + (url.port ? ':' + url.port : '')
  } catch {
    // If it's not a valid URL, try to extract host manually
    const match = rawBaseUrl.match(/https?:\/\/([^\/]+)/)
    const fallbackHost = match ? match[1] : rawBaseUrl.replace(/https?:\/\//, '').split('/')[0]
    return fallbackHost || window.location.host || 'localhost:9200'
  }
})

const isCompactHostButton = computed(() => display.xs.value)

// Get last ping value in ms (rounded to integer)
const lastPingMs = computed(() => {
  if (!isEffectivelyConnected.value || !lastPingTime.value) return null
  return Math.round(lastPingTime.value)
})

// Get last ping timestamp
const lastPingTimestamp = computed(() => {
  if (!latencyHistory.value || latencyHistory.value.length === 0) return null
  const lastEntry = latencyHistory.value[latencyHistory.value.length - 1]
  if (!lastEntry || !lastEntry.time) return null
  const date = new Date(lastEntry.time)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

// Get color class based on latency
const getLatencyColorClass = (latency) => {
  if (latency === null) return 'text-grey-darken-1'
  if (latency < 50) return 'text-success'
  if (latency < 100) return 'text-warning'
  return 'text-error'
}

// Check if auth is required on the server
const authRequired = ref(false)
let authCheckTimer = null
let demoModeCheckTimer = null

// Watch authRequired to update global flag so interceptor knows whether to send auth headers
watch(authRequired, (isRequired) => {
  if (typeof window !== 'undefined') {
    window.__HLQUERY_AUTH_REQUIRED__ = isRequired
  }
}, { immediate: true })

const checkAuthRequired = async () => {
  const baseUrlValue = getBaseUrlValue(baseUrl)
  if (!baseUrlValue) {
    authRequired.value = false
    console.warn('[AUTH CHECK] No baseUrl configured, cannot check auth requirement')
    return
  }
  
  if (!isConnected.value) {
    authRequired.value = false
    // Clear global flag so interceptor doesn't send auth headers when not connected
    if (typeof window !== 'undefined') {
      window.__HLQUERY_AUTH_REQUIRED__ = false
    }
    console.warn('[AUTH CHECK] Server is not connected, cannot check auth requirement. Please check your server connection.')
    return
  }
  
  try {
    const useProxy = shouldUseProxy(baseUrlValue)
    const testUrl = buildApiUrl(baseUrlValue, useProxy, '/collections')
    
    // Make a request WITHOUT auth headers to check if auth is required
    // Use fetch instead of axios to bypass the interceptor
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    let response
    try {
      response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
          // Explicitly NO Authorization header - we want to check if server requires it
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw fetchError
    }
    
    const status = response.status
    
    // If we get 401, auth is required
    if (status === 401) {
      authRequired.value = true
      // Set global flag so interceptor knows to send auth headers
      if (typeof window !== 'undefined') {
        window.__HLQUERY_AUTH_REQUIRED__ = true
      }
      
      // Check if auth is configured
      const serverUrl = baseUrl?.value || baseUrl
      const auth = authManager.resolveCredentials(serverUrl)
      const hasAuth = authManager.hasCredentials(auth)
      
      // If auth is required but not configured, show server menu to configure
      if (!hasAuth && !showServerMenu.value) {
        console.warn('[AUTH CHECK] Authentication is required but not configured. Opening server settings...')
        // Open server menu so user can configure auth instead of redirecting
        openServerMenu()
      }
    } else if (status === 200) {
      // If we get 200, auth is not required
      authRequired.value = false
      // Clear global flag so interceptor doesn't send auth headers
      if (typeof window !== 'undefined') {
        window.__HLQUERY_AUTH_REQUIRED__ = false
      }
    } else {
      // For other statuses, assume auth is not required but log for debugging
      authRequired.value = false
      if (typeof window !== 'undefined') {
        window.__HLQUERY_AUTH_REQUIRED__ = false
      }
    }
  } catch (err) {
    // Network error or connection failure
    authRequired.value = false
    // Clear global flag so interceptor doesn't send auth headers when server is unreachable
    if (typeof window !== 'undefined') {
      window.__HLQUERY_AUTH_REQUIRED__ = false
    }
    const errorMsg = err.message || 'Unknown error'
    const isNetworkError = err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ERR_NETWORK' || !err.response
    if (isNetworkError) {
      console.warn('[AUTH CHECK] Cannot check auth requirement - server is not reachable:', errorMsg)
    } else {
      console.warn('[AUTH CHECK] Error checking auth requirement:', errorMsg, err)
    }
  }
}

const checkDemoMode = async () => {
  const baseUrlValue = getBaseUrlValue(baseUrl)
  if (!baseUrlValue || !isConnected.value) {
    demoModeEnabled.value = false
    demoModeMessage.value = ''
    if (typeof window !== 'undefined') {
      window.__HLQUERY_DEMO_MODE__ = false
      window.__HLQUERY_DEMO_MESSAGE__ = ''
    }
    return
  }

  try {
    const useProxy = shouldUseProxy(baseUrlValue)
    const healthUrl = buildApiUrl(baseUrlValue, useProxy, '/health')
    const response = await axios.get(healthUrl, {
      timeout: 4000,
      validateStatus: () => true
    })

    if (response.status !== 200 || !response.data || typeof response.data !== 'object') {
      demoModeEnabled.value = false
      demoModeMessage.value = ''
      if (typeof window !== 'undefined') {
        window.__HLQUERY_DEMO_MODE__ = false
        window.__HLQUERY_DEMO_MESSAGE__ = ''
      }
      return
    }

    demoModeEnabled.value = response.data.demo_mode === true
    demoModeMessage.value = typeof response.data.demo_message === 'string'
      ? response.data.demo_message.trim()
      : ''
    if (typeof window !== 'undefined') {
      window.__HLQUERY_DEMO_MODE__ = demoModeEnabled.value
      window.__HLQUERY_DEMO_MESSAGE__ = demoModeMessage.value
    }
  } catch (err) {
    demoModeEnabled.value = false
    demoModeMessage.value = ''
    if (typeof window !== 'undefined') {
      window.__HLQUERY_DEMO_MODE__ = false
      window.__HLQUERY_DEMO_MESSAGE__ = ''
    }
  }
}

// Check auth requirement periodically when connected
watch([isConnected, baseUrl], () => {
  if (authCheckTimer) {
    clearTimeout(authCheckTimer)
  }
  
  if (isConnected.value) {
    // Check immediately
    checkAuthRequired()
    // Then check every 30 seconds
    authCheckTimer = setInterval(() => {
      checkAuthRequired()
    }, 30000)
  } else {
    authRequired.value = false
  }
}, { immediate: true })

watch([isConnected, baseUrl], () => {
  if (demoModeCheckTimer) {
    clearInterval(demoModeCheckTimer)
    demoModeCheckTimer = null
  }

  if (isConnected.value) {
    checkDemoMode()
    demoModeCheckTimer = setInterval(() => {
      checkDemoMode()
    }, 30000)
  } else {
    demoModeEnabled.value = false
    demoModeMessage.value = ''
  }
}, { immediate: true })

// Load collections on mount and when baseUrl changes
watch(baseUrl, (newUrl) => {
  // Update window global for axios interceptor
  if (newUrl) {
    window.__HLQUERY_BASE_URL__ = newUrl
  }
  loadCollectionsAsync()
}, { immediate: true })

watch(distributedMode, (newMode) => {
  applyDistributedMode()
  if (typeof window !== 'undefined' && window.localStorage) {
    if (newMode === 'on' || newMode === 'off' || newMode === 'auto') {
      window.localStorage.setItem('hlquery_distributed_mode', newMode)
    } else {
      window.localStorage.removeItem('hlquery_distributed_mode')
    }
  }
})

// Function to force left alignment - EXTREMELY aggressive
// Removed forceLeftAlignment function - CSS handles alignment

// Removed complex alignment code - CSS handles alignment now

// Handle scroll for navbar
let handleScroll = null

// Keyboard shortcut handler for "/" to focus search
const searchInputRef = ref(null)
const handleKeyboardShortcut = (event) => {
  // Only trigger if not typing in an input/textarea
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
    return
  }
  
  // Focus search on "/" key
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault()
    if (searchInputRef.value && isEffectivelyConnected.value) {
      searchInputRef.value.focus()
    } else {
      const searchInput = document.querySelector('.collections-list-search-input input')
      if (searchInput) {
        searchInput.focus()
      }
    }
  }
}

onMounted(() => {
  // Initialize window global with current baseUrl
  const currentUrl = baseUrl?.value || baseUrl || 'http://localhost:9200'
  window.__HLQUERY_BASE_URL__ = currentUrl

  if (typeof window !== 'undefined' && window.localStorage) {
    const storedMode = window.localStorage.getItem('hlquery_distributed_mode')
    if (storedMode === 'on' || storedMode === 'off' || storedMode === 'auto') {
      distributedMode.value = storedMode
    }
  }
  applyDistributedMode()
  
  // Load collections immediately on mount
  loadCollectionsAsync().then(() => {
    console.log('Collections loaded:', collections.value.length)
  })
  
  // Handle scroll for navbar
  handleScroll = () => {
    isScrolled.value = window.scrollY > 10
  }
  window.addEventListener('scroll', handleScroll)
  
  // Add keyboard shortcut listener
  window.addEventListener('keydown', handleKeyboardShortcut)
  
  // Listen for auth-required events from axios interceptor
  const handleAuthRequired = (event) => {
    const serverUrl = event.detail?.serverUrl || currentUrl
    authRequired.value = true
    
    // Check if auth is configured
    const url = baseUrl?.value || baseUrl
    const auth = authManager.resolveCredentials(url)
    const hasAuth = authManager.hasCredentials(auth)
    
    // If auth is required but not configured, show server menu to configure auth
    if (!hasAuth) {
      console.warn('Authentication required but not configured. Please configure authentication in server settings.')
      // Open server menu so user can configure auth
      openServerMenu()
    }
  }
  
  const handleAuthFailed = (event) => {
    console.warn('Authentication failed - token may be invalid for server:', event.detail?.serverUrl)
  }

  const handleRuntimeConfigLoaded = () => {
    checkAuthRequired()
    checkDemoMode()
    checkConnection()
    loadCollectionsAsync()
  }
  
  window.addEventListener('hlquery-auth-required', handleAuthRequired)
  window.addEventListener('hlquery-auth-failed', handleAuthFailed)
  window.addEventListener('hanalyzer-config-loaded', handleRuntimeConfigLoaded)
  
  // Store handlers for cleanup
  window.__hlquery_auth_handlers__ = { handleAuthRequired, handleAuthFailed, handleRuntimeConfigLoaded }
})

onUnmounted(() => {
  // Cleanup event listeners
  if (handleScroll) {
    window.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('keydown', handleKeyboardShortcut)
  if (window.__hlquery_auth_handlers__) {
    window.removeEventListener('hlquery-auth-required', window.__hlquery_auth_handlers__.handleAuthRequired)
    window.removeEventListener('hlquery-auth-failed', window.__hlquery_auth_handlers__.handleAuthFailed)
    window.removeEventListener('hanalyzer-config-loaded', window.__hlquery_auth_handlers__.handleRuntimeConfigLoaded)
    delete window.__hlquery_auth_handlers__
  }
  
  // Cleanup auth check timer
  if (authCheckTimer) {
    clearInterval(authCheckTimer)
    authCheckTimer = null
  }

  if (demoModeCheckTimer) {
    clearInterval(demoModeCheckTimer)
    demoModeCheckTimer = null
  }

  // Remove server settings open event listener
  if (window.__hlquery_open_server_settings_handler__) {
    window.removeEventListener('hlquery-open-server-settings', window.__hlquery_open_server_settings_handler__)
    delete window.__hlquery_open_server_settings_handler__
  }
  window.__HLQUERY_DISTRIBUTED_OVERRIDE__ = ''
})


const handleLogoClick = (event) => {
  // Only handle left clicks - @click in Vue typically only fires on left clicks
  // Right clicks will automatically show the browser's default context menu
  // Don't prevent default or stop propagation to allow right-click menu
  if (event && event.button !== undefined && event.button !== 0) {
    // Not a left click, let browser handle it
    return
  }
  goToHome()
}

const goToHome = () => {
  router.push('/collections').catch(err => {
    // Ignore navigation errors (e.g., navigating to same route)
    if (err.name !== 'NavigationDuplicated') {
      console.error('Navigation error:', err)
    }
  })
}

const goToHealth = () => {
  try {
    const url = baseUrl?.value || baseUrl
    if (!url) {
      console.warn('No baseUrl available for health check')
      return
    }
    const useProxy = url.includes('localhost:9200') || url.includes('127.0.0.1:9200')
    const healthUrl = useProxy ? '/api/health' : `${url}/health`
    window.open(healthUrl, '_blank')
  } catch (err) {
    console.error('Error opening health endpoint:', err)
  }
}

const openCommandPalette = () => {
  emit('open-command-palette')
}

const normalizeServerUrl = (url) => {
  let normalizedUrl = (url || '').trim()
  if (!normalizedUrl) return ''
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `http://${normalizedUrl}`
  }
  return normalizedUrl.replace(/\/+$/, '')
}

const applyProtocolToUrl = (url, useSsl = false) => {
  const trimmedUrl = (url || '').trim()
  if (!trimmedUrl) return ''

  const targetProtocol = useSsl ? 'https://' : 'http://'
  let normalizedUrl = trimmedUrl

  if (normalizedUrl.startsWith('http://')) {
    normalizedUrl = `${targetProtocol}${normalizedUrl.slice('http://'.length)}`
  } else if (normalizedUrl.startsWith('https://')) {
    normalizedUrl = `${targetProtocol}${normalizedUrl.slice('https://'.length)}`
  } else {
    normalizedUrl = `${targetProtocol}${normalizedUrl}`
  }

  return normalizedUrl.replace(/\/+$/, '')
}

const resolveTokenForUrl = (url) => {
  const targetUrl = url || ''
  // FIRST: Check getAuthHeaders - if it returns headers, auth exists and is being used
  const authHeaders = authManager.getAuthHeaders(targetUrl)
  let foundToken = null

  if (authHeaders && authHeaders.Authorization && authHeaders.Authorization.startsWith('Bearer ')) {
    foundToken = authHeaders.Authorization.replace('Bearer ', '')
  } else if (authHeaders && authHeaders['X-API-Key']) {
    foundToken = authHeaders['X-API-Key']
  }

  if (!foundToken) {
    const normalizedUrl = normalizeServerUrl(targetUrl)
    const urlVariants = [
      normalizedUrl,
      normalizedUrl.replace(/^https?:\/\//, ''),
      normalizedUrl + '/',
      targetUrl,
      targetUrl.replace(/^https?:\/\//, ''),
    ]

    const uniqueUrls = [...new Set(urlVariants.filter(Boolean))]

    for (const variant of uniqueUrls) {
      if (authManager.credentials[variant]) {
        const creds = authManager.credentials[variant]
        if (creds && (creds.token || creds.apiKey)) {
          foundToken = creds.token || creds.apiKey
          break
        }
      }
    }

    if (!foundToken && typeof window !== 'undefined' && window.localStorage) {
      for (const variant of uniqueUrls) {
        const keysToTry = [
          `auth_${variant}`,
          `auth_${variant.replace(/^https?:\/\//, '')}`,
          `auth_${variant}/`,
        ]

        for (const key of keysToTry) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const parsed = JSON.parse(stored)
              if (parsed && (parsed.token || parsed.apiKey)) {
                foundToken = parsed.token || parsed.apiKey
                break
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
        if (foundToken) break
      }
    }
  }

  if ((!foundToken || !foundToken.trim()) && (!authToken.value || !authToken.value.trim())) {
    const uniqueTokens = new Set()

    Object.values(authManager.credentials || {}).forEach((creds) => {
      if (creds && (creds.token || creds.apiKey)) {
        const tokenVal = (creds.token || creds.apiKey || '').trim()
        if (tokenVal) uniqueTokens.add(tokenVal)
      }
    })

    if (typeof window !== 'undefined' && window.localStorage) {
      const allKeys = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i))
        .filter((k) => k && k.startsWith('auth_'))

      for (const key of allKeys) {
        try {
          const stored = localStorage.getItem(key)
          if (!stored) continue
          const parsed = JSON.parse(stored)
          if (parsed && (parsed.token || parsed.apiKey)) {
            const tokenVal = (parsed.token || parsed.apiKey || '').trim()
            if (tokenVal) uniqueTokens.add(tokenVal)
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    if (uniqueTokens.size === 1) {
      foundToken = [...uniqueTokens][0]
    }
  }

  return foundToken && foundToken.trim() ? foundToken.trim() : null
}

const applyTokenToInput = (token) => {
  const tokenToSet = token.trim()
  authPanelExpanded.value = [0]
  authToken.value = tokenToSet
  tokenKey.value = Date.now()

  nextTick(() => {
    authPanelExpanded.value = [0]
    if (authToken.value !== tokenToSet) {
      authToken.value = tokenToSet
      tokenKey.value = Date.now()
    }
    setTimeout(() => {
      if (authToken.value !== tokenToSet) {
        authToken.value = tokenToSet
        tokenKey.value = Date.now()
      }
    }, 700)
  })
}

const maskToken = (token) => {
  if (!token) return ''
  const trimmed = token.trim()
  if (trimmed.length <= 6) {
    return `${'*'.repeat(Math.max(0, trimmed.length - 2))}${trimmed.slice(-2)}`
  }
  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`
}

const activeSessionToken = computed(() => {
  const url = baseUrl?.value || baseUrl || serverUrl.value || 'http://localhost:9200'
  return resolveTokenForUrl(url)
})

const activeTokenMasked = computed(() => maskToken(activeSessionToken.value))

const clickableServerUrl = computed(() => {
  const normalizedUrl = applyProtocolToUrl(serverUrl.value, sslEnabled.value)
  return normalizedUrl || ''
})

const useActiveToken = () => {
  if (activeSessionToken.value) {
    applyTokenToInput(activeSessionToken.value)
  }
}

const openServerMenu = () => {
  if (deploymentDemoMode.value) {
    return
  }

  // Sync serverUrl with current baseUrl when opening menu
  serverUrl.value = baseUrl.value
  sslEnabled.value = serverUrl.value.startsWith('https://')
  showServerMenu.value = true
  
  // Immediately check if the current server requires authentication
  // This ensures the flag and UI are up-to-date when modal opens
  if (isConnected.value) {
    checkAuthRequired()
  } else {
    // If not connected, reset to false - don't send auth headers
    authRequired.value = false
    if (typeof window !== 'undefined') {
      window.__HLQUERY_AUTH_REQUIRED__ = false
    }
  }
  
  // Use the same URL that getAuthHeaders uses
  const url = serverUrl.value || baseUrl.value || baseUrl || 'http://localhost:9200'
  const foundToken = resolveTokenForUrl(url)

  // Set the token value if found
  if (foundToken) {
    applyTokenToInput(foundToken)
  } else {
    // Do not clear any in-progress user input when no token is found.
    // Only reset the panel state if nothing is typed yet.
    if (!authToken.value || !authToken.value.trim()) {
      authToken.value = ''
      authPanelExpanded.value = []
      tokenKey.value = 0
    }
    // Nothing found; keep UI clean.
  }
}

// Allow context menu on collections button (right-click)
const handleCollectionsRightClick = (event) => {
  // Allow browser's default context menu on right-click
  // Don't prevent default to allow right-click menu
  return true
}

// Allow context menu on dashboard button (right-click)
const handleDashboardRightClick = (event) => {
  // Allow browser's default context menu on right-click
  // Don't prevent default to allow right-click menu
  return true
}

// Allow context menu on aliases button (right-click)
const handleAliasesRightClick = (event) => {
  // Allow browser's default context menu on right-click
  // Don't prevent default to allow right-click menu
  return true
}

// Allow context menu on header (right-click)
const handleHeaderContextMenu = (event) => {
  // Explicitly allow the default browser context menu
  // Don't prevent default - let the browser show its native context menu
  // Only exception: if clicking on the connection button, we might want custom behavior
  const target = event.target
  const isConnectionButton = target.closest('.connection-status-btn, button[prepend-icon="mdi-cog"]')
  
  // For connection button, we could add custom behavior, but for now allow default
  // For all other elements, definitely allow default context menu
  // Do NOT call event.preventDefault() - this allows the browser's native context menu
}

// También abrir el menú desde el botón de conexión si se hace clic derecho
// But allow browser context menu on the header itself
const handleConnectionClick = (event) => {
  // Only prevent default on the connection button itself, not on the header
  const target = event.target
  const isConnectionButton = target.closest('.connection-status-btn, button[prepend-icon="mdi-cog"]')
  if (isConnectionButton && (event.button === 2 || event.ctrlKey)) {
    event.preventDefault()
    openServerMenu()
  }
  // For other header areas, allow default browser context menu
}

const attemptReconnect = async () => {
  if (isChecking.value) return
  await checkConnection()
}

const updateBaseUrl = () => {
  if (deploymentDemoMode.value) {
    baseUrl.value = '/api'
    serverUrl.value = '/api'
    showServerMenu.value = false
    checkConnection()
    return
  }

  console.log('[UPDATE BASE URL] Starting...', { serverUrl: serverUrl.value, authToken: authToken.value ? `[${authToken.value.length} chars]` : 'EMPTY' })
  
  if (!serverUrl.value || serverUrl.value.trim() === '') {
    serverUrl.value = sslEnabled.value ? 'https://localhost:9200' : 'http://localhost:9200'
  }
  
  const normalizedUrl = applyProtocolToUrl(serverUrl.value, sslEnabled.value)
  serverUrl.value = normalizedUrl
  const existingAuthForTarget = getAuthForServer(normalizedUrl) || loadAuthFromStorage(normalizedUrl)
  const hadStoredTokenForTarget = !!(existingAuthForTarget && (existingAuthForTarget.token || existingAuthForTarget.apiKey))
  
  // Save authentication credentials if provided
  if (authToken.value && authToken.value.trim() !== '') {
    const token = authToken.value.trim()
    console.error('[SAVE AUTH] ----------------------------------------------------------------==')
    console.error('[SAVE AUTH] Saving token for URL:', normalizedUrl)
    console.error('[SAVE AUTH] Token length:', token.length)
    console.error('[SAVE AUTH] Token preview:', token.substring(0, Math.min(10, token.length)) + '...' + (token.length > 4 ? token.substring(token.length - 4) : ''))
    console.error('[SAVE AUTH] ----------------------------------------------------------------==')
    
    setAuthForServer(normalizedUrl, {
      method: 'bearer',
      token: token
    })
    
    // Verify it was saved immediately
    nextTick(() => {
      const saved = getAuthForServer(normalizedUrl) || loadAuthFromStorage(normalizedUrl)
      if (saved && saved.token) {
        console.error('[SAVE AUTH] ✓ VERIFIED: Token saved successfully! Length:', saved.token.length)
        console.error('[SAVE AUTH] Saved token matches:', saved.token === token)
      } else {
        console.error('[SAVE AUTH] ✗ ERROR: Token was NOT saved! saved:', saved)
        console.error('[SAVE AUTH] Memory keys:', Object.keys(authManager.credentials))
        console.error('[SAVE AUTH] localStorage keys:', Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(k => k && k.startsWith('auth_')))
      }
    })
  } else {
    // Clear auth if token is empty
    console.error('[SAVE AUTH] Token is empty, clearing auth for URL:', normalizedUrl)
    setAuthForServer(normalizedUrl, null)
  }
  
  // Update window global for axios interceptor IMMEDIATELY
  window.__HLQUERY_BASE_URL__ = normalizedUrl
  console.error('[UPDATE BASE URL] Set window.__HLQUERY_BASE_URL__ to:', normalizedUrl)
  
  baseUrl.value = normalizedUrl
  showServerMenu.value = false
  
  // Reset auth required flag when server changes (will be checked by checkAuthRequired)
  authRequired.value = false
  if (typeof window !== 'undefined') {
    window.__HLQUERY_AUTH_REQUIRED__ = false
  }
  
  // Check auth requirement for new server after a short delay
  setTimeout(() => {
    checkAuthRequired()
  }, 500)
  
  // Refresh after token changes (set or remove) so all views sync auth state immediately.
  const hasTokenInput = !!(authToken.value && authToken.value.trim() !== '')
  const removedStoredToken = !hasTokenInput && hadStoredTokenForTarget
  if (hasTokenInput || removedStoredToken) {
    console.error('[UPDATE BASE URL] Auth changed, refreshing page...', { hasTokenInput, removedStoredToken })
    // Small delay to ensure token is saved
    setTimeout(() => {
      window.location.reload()
    }, 100)
    return
  }
  
  // Force reload collections after auth change
  nextTick(() => {
    console.error('[UPDATE BASE URL] Reloading collections...')
    loadCollectionsAsync()
  })
  
  // Trigger connection check
  checkConnection()
}

// Auto-save token while server menu is open so it persists across reloads.
watch([authToken, serverUrl, showServerMenu], () => {
  if (!showServerMenu.value) return
  if (authSaveTimer) {
    clearTimeout(authSaveTimer)
  }
  authSaveTimer = setTimeout(() => {
    const token = authToken.value ? authToken.value.trim() : ''
    const url = serverUrl.value || baseUrl.value || baseUrl || 'http://localhost:9200'
    if (!url || !token) return
    const normalizedUrl = applyProtocolToUrl(url, sslEnabled.value)
    setAuthForServer(normalizedUrl, {
      method: 'bearer',
      token
    })
  }, 400)
})

watch(serverUrl, (newUrl) => {
  const trimmedUrl = (newUrl || '').trim()
  if (trimmedUrl.startsWith('https://')) {
    sslEnabled.value = true
  } else if (trimmedUrl.startsWith('http://')) {
    sslEnabled.value = false
  }
})

watch(sslEnabled, (enabled) => {
  if (!showServerMenu.value) return
  const currentUrl = serverUrl.value || ''
  if (!currentUrl.trim()) return
  serverUrl.value = applyProtocolToUrl(currentUrl, enabled)
})

const handlePingMenuClick = (event) => {
  try {
    // Only navigate to health endpoint if clicking on the card itself, not on interactive elements
    // Check if the click target is the card or a non-interactive element
    if (!event || !event.target) {
      return
    }
    
    const target = event.target
    const isInteractiveElement = target.closest('button, a, input, select, textarea, [role="button"], .v-chip, .v-icon, .v-card-title, .v-card-text')
    
    // Don't trigger if clicking on interactive elements or card sections
    if (isInteractiveElement) {
      return
    }
    
    // Only navigate if menu is open and we're clicking on the card background
    if (showPingMenu.value) {
      // Small delay to ensure menu doesn't close immediately
      setTimeout(() => {
        try {
          goToHealth()
        } catch (err) {
          console.error('Error opening health endpoint:', err)
        }
      }, 100)
    }
  } catch (err) {
    console.error('Error handling ping menu click:', err)
  }
}



// Watch for disconnection and redirect to status page
watch(isEffectivelyConnected, (newValue, oldValue) => {
  // Only redirect if we transition from connected to disconnected
  // Don't redirect if we're already on the status page
  // Also don't redirect on initial mount (oldValue will be undefined)
  if (oldValue === true && newValue === false && route.path !== '/status') {
    router.push('/status').catch(() => {
      // Ignore navigation errors (e.g., navigating to same route)
    })
  }
}, { immediate: false })
</script>

<style scoped>
.app-header-shell {
  position: sticky;
  top: 0;
  z-index: 100;
}

.demo-mode-banner {
  position: relative;
  z-index: 101;
  width: 100%;
  background:
    linear-gradient(90deg, rgba(180, 83, 9, 0.98) 0%, rgba(217, 119, 6, 0.98) 52%, rgba(245, 158, 11, 0.98) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 10px 24px rgba(120, 53, 15, 0.2);
}

.demo-mode-banner__inner {
  min-height: 40px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.demo-mode-banner__icon {
  color: #fff7ed;
  flex: 0 0 auto;
}

.demo-mode-banner__content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  text-align: center;
  color: #fffaf0;
}

.demo-mode-banner__title {
  font-family: Inter, Helvetica, sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.demo-mode-banner__message {
  font-family: Inter, Helvetica, sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.demo-mode-banner__link {
  color: #ffffff !important;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.88);
  text-underline-offset: 2px;
}

.demo-mode-banner__link:hover,
.demo-mode-banner__link:focus-visible {
  color: #fff7ed !important;
  text-decoration-color: #fff7ed;
  outline: none;
}

/* Floating Header - Dark with Soft Shadow */
.app-navbar {
  background: rgba(15, 23, 42, 0.94) !important;
  padding: 0 80px !important;
  transition: box-shadow 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease !important;
  display: flex;
  align-items: center;
  /* Ensure browser context menu works on right-click */
  -webkit-user-select: auto;
  -moz-user-select: auto;
  user-select: auto;
  pointer-events: auto !important;
  position: relative;
  border: none !important;
  z-index: 100 !important;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 10px 28px rgba(2, 8, 23, 0.2) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  overflow: visible !important;
}

/* Remove all border pseudo-elements */
.app-navbar::before,
.app-navbar::after {
  display: none !important;
}

.app-navbar :deep(.v-app-bar__content) {
  overflow: visible !important;
  position: relative !important;
  z-index: 100 !important;
  display: flex !important;
  align-items: center !important;
  height: 62px !important;
}

.app-navbar .v-app-bar-title {
  padding: 0 !important;
  margin: 0 !important;
  margin-right: 0 !important;
  min-width: auto !important;
  flex: 0 0 auto !important;
  overflow: visible !important;
}

.hlquery-logo-container {
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  text-decoration: none;
  color: inherit;
  padding: 4px 6px 4px 8px;
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  transform: translateY(-1px);
}

.hlquery-logo-container::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(25, 118, 211, 0.08), rgba(100, 181, 246, 0.06));
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.hlquery-logo-container:hover {
  background: transparent !important;
}

.hlquery-logo-container:hover::before {
  opacity: 0;
  display: none;
}

.hlquery-logo-container:focus,
.hlquery-logo-container:focus-visible {
  outline: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.hlquery-logo-container:active {
  background: rgba(255, 255, 255, 0.15) !important;
}

.logo-image {
  height: 27px;
  width: auto;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 0 0 transparent);
  pointer-events: auto;
  -webkit-user-select: none;
  user-select: none;
}

.hlquery-logo-container:hover .logo-image {
  filter: drop-shadow(0 0 8px rgba(25, 118, 211, 0.4)) 
          drop-shadow(0 0 12px rgba(25, 118, 211, 0.3))
          drop-shadow(0 0 16px rgba(25, 118, 211, 0.2));
}

.hlquery-nav-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 17px !important;
  line-height: 24px !important;
  color: #ffffff !important;
  letter-spacing: -0.02em;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 3px 4px;
  border-radius: 6px;
  position: relative;
}

.hlquery-nav-title:hover,
.hlquery-nav-title--hovered {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.1) !important;
  text-shadow: 
    0 0 8px rgba(255, 255, 255, 0.4),
    0 0 12px rgba(255, 255, 255, 0.3),
    0 0 16px rgba(255, 255, 255, 0.2) !important;
}

/* Header Search Bar - Clean and Simple */
.header-search-container {
  width: 300px !important;
  min-width: 300px !important;
  max-width: 300px !important;
  margin-left: 18px !important;
  margin-right: 0 !important;
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
  display: flex !important;
  align-items: center !important;
  position: relative !important;
  transform: translateY(-2px);
}

.header-search-container--reduced {
  width: 300px !important;
  min-width: 300px !important;
  max-width: 300px !important;
}

.header-search-input {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  position: relative !important;
  z-index: 10 !important;
  isolation: isolate !important;
  overflow: visible !important;
  top: 0 !important;
  left: 0 !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
  transition: none !important;
}

/* Prevent any position/transform transitions on input-related elements */
.header-search-input :deep(.v-field),
.header-search-input :deep(.v-field__wrapper),
.header-search-input :deep(.v-field__input),
.header-search-input :deep(.v-field__prepend-inner),
.header-search-input :deep(.v-input),
.header-search-input :deep(.v-autocomplete__wrapper) {
  transition-property: background-color, color, opacity !important;
  transition-duration: 0.2s !important;
  transition-timing-function: ease !important;
}

.header-search-input :deep(.v-autocomplete__wrapper),
.header-search-input :deep(.v-input) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  flex: 1 1 auto !important;
  transform: none !important;
  transition: none !important;
  position: relative !important;
  z-index: 10 !important;
  isolation: isolate !important;
  margin: 0 !important;
  padding: 0 !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
}

/* Clean white search input - Small and minimal */
.header-search-input-improved :deep(.v-field),
.header-search-input :deep(.v-field) {
  background: #ffffff !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 14px !important;
  box-shadow: none !important;
  transition: all 0.2s ease !important;
  min-height: 36px !important;
  max-height: 36px !important;
  height: 36px !important;
}

.header-search-input-improved :deep(.v-field:hover),
.header-search-input :deep(.v-field:hover) {
  background: #ffffff !important;
  border-color: #d1d5db !important;
  box-shadow: none !important;
}

.header-search-input-improved :deep(.v-field--focused),
.header-search-input :deep(.v-field--focused) {
  background: #ffffff !important;
  border-color: #e5e7eb !important;
  box-shadow: none !important;
}

.header-search-input-improved :deep(.v-field--focused .v-field__outline),
.header-search-input :deep(.v-field--focused .v-field__outline),
.header-search-input-improved :deep(.v-field--variant-plain .v-field__outline),
.header-search-input :deep(.v-field--variant-plain .v-field__outline) {
  --v-field-border-opacity: 0 !important;
  opacity: 0 !important;
  box-shadow: none !important;
}

.header-search-container :deep(input:focus),
.header-search-container :deep(input:focus-visible),
.header-search-input-improved :deep(input:focus),
.header-search-input-improved :deep(input:focus-visible) {
  outline: none !important;
  box-shadow: none !important;
}

/* Input wrapper - clean */
.header-search-input-improved :deep(.v-field__wrapper),
.header-search-input :deep(.v-field__wrapper) {
  min-height: 36px !important;
  max-height: 36px !important;
  height: 36px !important;
}

.header-search-input :deep(.v-field--focused .v-field__wrapper),
.header-search-input :deep(.v-field:hover .v-field__wrapper),
.header-search-input :deep(.v-field:active .v-field__wrapper) {
  padding: 0 !important;
  margin: 0 !important;
  position: relative !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  transform: none !important;
  transition: none !important;
  will-change: auto !important;
}

.header-search-input :deep(.v-field--focused .v-field__input),
.header-search-input :deep(.v-field--focused .v-field__input input),
.header-search-input :deep(.v-field__input),
.header-search-input :deep(.v-field__input input) {
  color: #0f172a !important;
}

.header-search-input-improved :deep(.v-field__input),
.header-search-input :deep(.v-field__input),
.header-search-container :deep(.v-field__input),
.header-search-container :deep(.v-autocomplete .v-field__input) {
  padding: 0 12px !important;
  padding-left: 10px !important;
  font-size: 13px !important;
  line-height: 18px !important;
  min-height: 36px !important;
  max-height: 36px !important;
  height: 36px !important;
  color: #0f172a !important;
  text-align: left !important;
  text-align-last: left !important;
  font-weight: 500 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  justify-content: flex-start !important;
  align-items: center !important;
  direction: ltr !important;
}

/* Override any center alignment that Vuetify might apply */
.header-search-container :deep(.v-field__input),
.header-search-container :deep(.v-field__input *),
.header-search-container :deep(input),
.header-search-container :deep(.v-autocomplete__selection),
.header-search-container :deep(.v-autocomplete__selection *),
.header-search-autocomplete :deep(.v-field__input),
.header-search-autocomplete :deep(.v-field__input *),
.header-search-autocomplete :deep(input),
.header-search-autocomplete :deep(.v-autocomplete__selection),
.header-search-autocomplete :deep(.v-autocomplete__selection *),
.header-search-autocomplete :deep(.v-autocomplete--has-selection),
.header-search-autocomplete :deep(.v-autocomplete--has-selection *),
.header-search-autocomplete :deep(.v-autocomplete--has-selection .v-field__input),
.header-search-autocomplete :deep(.v-autocomplete--has-selection .v-field__input *),
.header-search-autocomplete :deep(.v-autocomplete--has-selection input) {
  text-align: left !important;
  justify-content: flex-start !important;
  margin-left: 0 !important;
  margin-right: auto !important;
  align-items: center !important;
}

/* Force left alignment on the autocomplete wrapper itself */
.header-search-autocomplete :deep(.v-autocomplete__wrapper),
.header-search-autocomplete :deep(.v-input),
.header-search-autocomplete :deep(.v-input__control) {
  text-align: left !important;
  justify-content: flex-start !important;
}

.header-search-input-improved :deep(.v-field--focused .v-field__input),
.header-search-input :deep(.v-field--focused .v-field__input) {
  color: #0f172a !important;
}

.header-search-input :deep(.v-field__input:focus),
.header-search-input :deep(.v-field--focused .v-field__input),
.header-search-input :deep(.v-field:hover .v-field__input),
.header-search-input :deep(.v-field:active .v-field__input) {
  padding: 0 12px !important;
  padding-left: 10px !important;
  padding-right: 12px !important;
  position: relative !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  transform: none !important;
  margin: 0 !important;
  justify-content: flex-start !important;
  text-align: left !important;
  text-align-last: left !important;
  direction: ltr !important;
  transition: none !important;
  will-change: auto !important;
}

/* Input element - smaller */
.header-search-input-improved :deep(.v-field__input input),
.header-search-input :deep(.v-field__input input),
.header-search-input-improved :deep(.v-field__input input[type="text"]),
.header-search-input :deep(.v-field__input input[type="text"]) {
  height: 36px !important;
  line-height: 18px !important;
  padding: 0 !important;
  margin: 0 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
  font-size: 13px !important;
  color: #0f172a !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  width: 100% !important;
  text-align: left !important;
  text-align-last: left !important;
  direction: ltr !important;
  display: block !important;
}

.header-search-input-improved :deep(.v-field--focused .v-field__input input),
.header-search-input :deep(.v-field--focused .v-field__input input),
.header-search-input-improved :deep(.v-field--focused .v-field__input input[type="text"]),
.header-search-input :deep(.v-field--focused .v-field__input input[type="text"]) {
  color: #0f172a !important;
}

.header-search-input :deep(.v-field__input input:focus),
.header-search-input :deep(.v-field__input input[type="text"]:focus),
.header-search-input :deep(.v-field__input input:hover),
.header-search-input :deep(.v-field__input input[type="text"]:hover),
.header-search-input :deep(.v-field__input input:active),
.header-search-input :deep(.v-field__input input[type="text"]:active) {
  height: 36px !important;
  line-height: 18px !important;
  padding: 0 !important;
  margin: 0 !important;
  position: relative !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  transform: none !important;
  outline: none !important;
  border: none !important;
  text-align: left !important;
  text-align-last: left !important;
  direction: ltr !important;
  transition: none !important;
  will-change: auto !important;
}

/* Force left alignment for autocomplete selected value display */
.header-search-input-improved :deep(.v-field__input),
.header-search-input :deep(.v-field__input) {
  text-align: left !important;
  justify-content: flex-start !important;
  align-items: center !important;
  direction: ltr !important;
  font-weight: 400 !important;
  display: flex !important;
}

.header-search-input-improved :deep(.v-field__input input) {
  text-align: left !important;
  text-align-last: left !important;
  direction: ltr !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
}

.header-search-input-improved :deep(.v-autocomplete__selection) {
  margin-left: 0 !important;
  justify-content: flex-start !important;
  text-align: left !important;
}

/* Force left alignment - override everything */
.header-search-input-improved :deep(.v-field__input),
.header-search-input-improved :deep(.v-field__input *),
.header-search-input-improved :deep(input),
.header-search-input-improved :deep(.v-autocomplete__selection) {
  text-align: left !important;
  text-align-last: left !important;
  direction: ltr !important;
  justify-content: flex-start !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
}

/* Force left alignment when autocomplete has a selected value */
.header-search-input-improved :deep(.v-autocomplete--has-selection .v-field__input),
.header-search-input :deep(.v-autocomplete--has-selection .v-field__input),
.header-search-input-improved :deep(.v-field--has-value .v-field__input),
.header-search-input :deep(.v-field--has-value .v-field__input),
.header-search-input-improved :deep(.v-autocomplete--has-selection),
.header-search-input :deep(.v-autocomplete--has-selection) {
  text-align: left !important;
  justify-content: flex-start !important;
  align-items: center !important;
}

.header-search-input-improved :deep(.v-autocomplete--has-selection .v-field__input *),
.header-search-input :deep(.v-autocomplete--has-selection .v-field__input *) {
  text-align: left !important;
}

/* Force left alignment for the input wrapper when value is selected */
.header-search-input-improved :deep(.v-autocomplete--has-selection .v-field__input input),
.header-search-input :deep(.v-autocomplete--has-selection .v-field__input input),
.header-search-input-improved :deep(.v-field--has-value .v-field__input input),
.header-search-input :deep(.v-field--has-value .v-field__input input),
.header-search-input-improved :deep(.v-autocomplete--has-selection input),
.header-search-input :deep(.v-autocomplete--has-selection input) {
  text-align: left !important;
  text-align-last: left !important;
  direction: ltr !important;
  margin-left: 0 !important;
  margin-right: auto !important;
}

/* Ensure the selection slot (chip/display) stays left-aligned */
.header-search-input-improved :deep(.v-field__input .v-autocomplete__selection),
.header-search-input :deep(.v-field__input .v-autocomplete__selection),
.header-search-input-improved :deep(.v-autocomplete__selection),
.header-search-input :deep(.v-autocomplete__selection) {
  margin-left: 0 !important;
  margin-right: auto !important;
  justify-content: flex-start !important;
  align-items: center !important;
  text-align: left !important;
  display: flex !important;
  width: auto !important;
  max-width: 100% !important;
}

/* Force left alignment on all children of selection */
.header-search-input-improved :deep(.v-autocomplete__selection *),
.header-search-input :deep(.v-autocomplete__selection *),
.header-search-input-improved :deep(.v-field__input .v-autocomplete__selection *),
.header-search-input :deep(.v-field__input .v-autocomplete__selection *) {
  text-align: left !important;
  justify-content: flex-start !important;
  margin-left: 0 !important;
  margin-right: auto !important;
}

/* Force left alignment for any chips or selected value displays */
.header-search-input-improved :deep(.v-field__input .v-chip),
.header-search-input :deep(.v-field__input .v-chip),
.header-search-input-improved :deep(.v-field__input .v-autocomplete__selection__comma),
.header-search-input :deep(.v-field__input .v-autocomplete__selection__comma),
.header-search-input-improved :deep(.v-autocomplete__selection .v-chip),
.header-search-input :deep(.v-autocomplete__selection .v-chip) {
  margin-left: 0 !important;
  margin-right: auto !important;
  text-align: left !important;
}

/* Force left alignment on ALL possible autocomplete states */
.header-search-input-improved :deep(.v-autocomplete),
.header-search-input :deep(.v-autocomplete),
.header-search-input-improved :deep(.v-autocomplete *),
.header-search-input :deep(.v-autocomplete *),
.header-search-input-improved :deep(.v-autocomplete--has-selection *),
.header-search-input :deep(.v-autocomplete--has-selection *),
.header-search-input-improved :deep(.v-autocomplete--has-selection .v-field__input *),
.header-search-input :deep(.v-autocomplete--has-selection .v-field__input *) {
  text-align: left !important;
  justify-content: flex-start !important;
  margin-left: 0 !important;
  margin-right: auto !important;
}

/* EXTRA Prevent any centering when selection is displayed */
.header-search-input-improved :deep(.v-autocomplete--has-selection .v-field__input),
.header-search-input :deep(.v-autocomplete--has-selection .v-field__input),
.header-search-input-improved :deep(.v-field--has-value .v-field__input),
.header-search-input :deep(.v-field--has-value .v-field__input) {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: center !important;
  text-align: left !important;
  flex-direction: row !important;
}

/* Force the input wrapper to not center its content */
.header-search-input-improved :deep(.v-field__input),
.header-search-input :deep(.v-field__input) {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: center !important;
  text-align: left !important;
}

.header-search-input-improved :deep(.v-field__input::placeholder),
.header-search-input :deep(.v-field__input::placeholder),
.header-search-input-improved :deep(.v-field__input input::placeholder),
.header-search-input :deep(.v-field__input input::placeholder),
.header-search-input-improved :deep(.v-field__input input::placeholder) {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 13px !important;
  color: #64748b !important;
  text-align: left !important;
  direction: ltr !important;
  opacity: 1 !important;
}

.header-search-input-improved :deep(.v-field--focused .v-field__input::placeholder),
.header-search-input :deep(.v-field--focused .v-field__input::placeholder),
.header-search-input-improved :deep(.v-field--focused .v-field__input input::placeholder),
.header-search-input :deep(.v-field--focused .v-field__input input::placeholder) {
  color: #9ca3af !important;
}

.header-search-input-improved :deep(.v-field__prepend-inner),
.header-search-input :deep(.v-field__prepend-inner) {
  padding-left: 10px !important;
  padding-right: 2px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  display: flex !important;
  height: 36px !important;
  width: auto !important;
  flex-shrink: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.header-search-input-improved :deep(.v-field__prepend-inner .v-icon),
.header-search-input :deep(.v-field__prepend-inner .v-icon) {
  color: #64748b !important;
  font-size: 18px !important;
  font-weight: 700 !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
  transition: color 0.2s ease !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.header-search-input-improved :deep(.v-field:hover .v-field__prepend-inner),
.header-search-input :deep(.v-field:hover .v-field__prepend-inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.header-search-input-improved :deep(.v-field:hover .v-field__prepend-inner .v-icon),
.header-search-input :deep(.v-field:hover .v-field__prepend-inner .v-icon) {
  color: #0f172a !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.header-search-input-improved :deep(.v-field--focused .v-field__prepend-inner),
.header-search-input :deep(.v-field--focused .v-field__prepend-inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.header-search-input-improved :deep(.v-field--focused .v-field__prepend-inner .v-icon),
.header-search-input :deep(.v-field--focused .v-field__prepend-inner .v-icon) {
  color: #64748b !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Remove dropdown icon and all append icons - ensure they don't take space */
.header-search-input :deep(.v-field__append-inner) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

.header-search-input-improved :deep(.v-field__append-inner) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

.header-search-input :deep(.v-autocomplete__menu-icon) {
  display: none !important;
}

.header-search-input-improved :deep(.v-autocomplete__menu-icon) {
  display: none !important;
}

/* Hide any dropdown arrow icons in autocomplete */
.header-search-input :deep([class*="menu-down"]),
.header-search-input :deep([class*="chevron-down"]),
.header-search-input-improved :deep([class*="menu-down"]),
.header-search-input-improved :deep([class*="chevron-down"]) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

.header-search-input :deep(.v-field__append) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

.header-search-input :deep(.v-input__append) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Clear button - properly aligned */
.header-search-input-improved :deep(.v-field__clearable),
.header-search-input :deep(.v-field__clearable) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 24px !important;
  min-width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  margin: 0 !important;
  margin-right: 8px !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
  cursor: pointer !important;
  opacity: 0.6 !important;
  flex-shrink: 0 !important;
  align-self: center !important;
}

.header-search-input-improved :deep(.v-field__clearable:hover),
.header-search-input :deep(.v-field__clearable:hover) {
  opacity: 1 !important;
  background: rgba(0, 0, 0, 0.05) !important;
}

.header-search-input-improved :deep(.v-field__clearable .v-icon),
.header-search-input :deep(.v-field__clearable .v-icon) {
  color: #64748b !important;
  font-size: 18px !important;
  width: 18px !important;
  height: 18px !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1 !important;
}

.header-search-input-improved :deep(.v-input__append-inner),
.header-search-input :deep(.v-input__append-inner) {
  display: flex !important;
  align-items: center !important;
  padding-right: 8px !important;
  width: auto !important;
  min-width: auto !important;
}

/* Hide any chevron/dropdown indicators */
.header-search-input :deep(.mdi-menu-down),
.header-search-input :deep(.mdi-chevron-down),
.header-search-input-improved :deep(.mdi-menu-down),
.header-search-input-improved :deep(.mdi-chevron-down),
.header-search-input :deep(.v-field__append-inner .mdi-menu-down),
.header-search-input-improved :deep(.v-field__append-inner .mdi-menu-down),
.header-search-input :deep(.v-field__append-inner .mdi-chevron-down),
.header-search-input-improved :deep(.v-field__append-inner .mdi-chevron-down) {
  display: none !important;
}

/* Hide checkboxes and selection controls in autocomplete items */
.header-search-input :deep(.v-selection-control-group) {
  display: none !important;
}

.header-search-input :deep(.v-checkbox) {
  display: none !important;
}

.header-search-input :deep(.v-list-item__prepend > .v-selection-control) {
  display: none !important;
}

.header-search-input :deep(.v-list-item__prepend > .v-checkbox-btn) {
  display: none !important;
}

/* Collection suggestion items - clean text only - IMPROVED */
.header-search-input :deep(.collection-suggestion-item) {
  min-height: 56px !important;
  padding: 14px 24px !important;
  cursor: pointer !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border-radius: 12px !important;
  margin: 6px 12px !important;
  background: transparent !important;
  border: none !important;
  border-bottom: none !important;
  border-top: none !important;
}

.header-search-input :deep(.collection-suggestion-item::before),
.header-search-input :deep(.collection-suggestion-item::after) {
  display: none !important;
}

.header-search-input :deep(.collection-suggestion-item:hover) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
  border: none !important;
  border-bottom: none !important;
  border-top: none !important;
  transform: translateX(4px) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

.header-search-input :deep(.collection-suggestion-item:active) {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%) !important;
  border: none !important;
  border-bottom: none !important;
  border-top: none !important;
  transform: translateX(2px) scale(0.98) !important;
}

.header-search-input :deep(.collection-suggestion-item .v-list-item-title) {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  line-height: 24px !important;
  color: #1e293b !important;
  padding: 0 !important;
  transition: color 0.2s ease !important;
}

.header-search-input :deep(.collection-suggestion-item:hover .v-list-item-title) {
  color: #1976d2 !important;
}

.collection-suggestion-name {
  font-weight: 600 !important;
  flex: 1 !important;
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.collection-suggestion-count {
  font-weight: 600 !important;
  font-size: 11px !important;
  height: 20px !important;
  flex-shrink: 0 !important;
}

.collection-suggestion-subtitle {
  font-size: 12px !important;
  color: #64748b !important;
  margin-top: 2px !important;
  font-weight: 400 !important;
}


/* Ensure list items are clean */
.header-search-input :deep(.v-list-item) {
  min-height: 40px !important;
  padding: 0 !important;
  border: none !important;
  border-bottom: none !important;
  border-top: none !important;
}

.header-search-input :deep(.v-list-item::before),
.header-search-input :deep(.v-list-item::after) {
  display: none !important;
}

/* Better spacing for dropdown */
.header-search-input :deep(.v-overlay__content) {
  border-radius: 12px !important;
  overflow: hidden !important;
  z-index: 9999 !important;
  position: fixed !important;
}

/* Overlay backdrop */
.header-search-input :deep(.v-overlay__scrim) {
  z-index: 9998 !important;
}

/* Menu dropdown styling - closer to input - IMPROVED */
.header-search-input-improved :deep(.v-menu__content),
.header-search-input :deep(.v-menu__content),
.header-search-input-improved :deep(.v-overlay__content .v-menu__content),
.header-search-input :deep(.v-overlay__content .v-menu__content) {
  border-radius: 16px !important;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.2),
    0 10px 20px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border: 2px solid rgba(25, 118, 211, 0.25) !important;
  overflow: hidden !important;
  margin-top: 10px !important;
  background: #ffffff !important;
  backdrop-filter: blur(24px) !important;
  min-width: 440px !important;
  max-width: 640px !important;
  max-height: 520px !important;
  z-index: 9999 !important;
  position: fixed !important;
  animation: slideDownImproved 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Hide menu completely when there's no search query to prevent flash */
.header-search-autocomplete:not(.has-query) :deep(.v-menu__content),
.header-search-autocomplete:not(.has-query) :deep(.v-overlay__content .v-menu__content) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Hide menu overlay when no query */
.header-search-container:has(.header-search-autocomplete:not(.has-query)) ~ .v-overlay,
.v-overlay:has(.v-menu__content) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideDownImproved {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Ensure overlay is above everything */
.header-search-input :deep(.v-overlay) {
  z-index: 9999 !important;
}

.header-search-input :deep(.v-overlay__content) {
  z-index: 9999 !important;
  position: fixed !important;
}

.header-search-input :deep(.v-list) {
  background: #ffffff !important;
  padding: 16px 0 !important;
  border-radius: 16px !important;
}

/* Remove any prepend icons from list items */
.header-search-input :deep(.v-list-item__prepend) {
  display: none !important;
}

.hlquery-nav-link {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  color: rgb(66, 84, 102) !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.hlquery-nav-link :deep(.v-btn__prepend) {
  margin-right: 8px !important;
}

.hlquery-nav-link :deep(.v-icon) {
  color: #4b5563 !important;
  font-size: 15px !important;
}

.hlquery-nav-link-dark {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  color: rgb(66, 84, 102) !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.hlquery-nav-link-dark :deep(.v-btn__prepend) {
  margin-right: 8px !important;
}

.hlquery-nav-link-dark :deep(.v-icon) {
  color: #1f2937 !important;
  font-size: 15px !important;
}

.hlquery-nav-link-dark:hover {
  background-color: #f3f4f6 !important;
  color: #111827 !important;
}

/* Navigation Buttons Container */
.nav-buttons-container {
  gap: 4px !important;
  margin-left: 16px;
}

/* Clean Navigation Button Style - White Text */
.hlquery-nav-button {
  color: #ffffff !important;
  text-transform: none !important;
  font-weight: 400 !important;
  letter-spacing: normal !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 6px !important;
  transition: background-color 0.2s ease !important;
  padding: 8px 12px !important;
  min-width: auto !important;
  height: auto !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.hlquery-nav-button:hover,
.hlquery-nav-button:active,
.hlquery-nav-button:focus,
.hlquery-nav-button:focus-visible {
  background: rgba(255, 255, 255, 0.1) !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
  box-shadow: none !important;
  outline: none !important;
  color: #ffffff !important;
  transform: none !important;
}

/* Active state - keep same white color as default */
.hlquery-nav-button--active {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.hlquery-nav-button--active:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

/* Button content */
.hlquery-nav-button :deep(.v-btn__content) {
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 0 !important;
}

.hlquery-nav-button--active :deep(.v-btn__content) {
  color: #ffffff !important;
}

/* Icon styling - White */
.nav-button-icon {
  color: #ffffff !important;
  font-size: 20px !important;
  margin: 0 !important;
}

.hlquery-nav-button :deep(.v-icon) {
  color: #ffffff !important;
  font-size: 20px !important;
}

.hlquery-nav-button:hover :deep(.v-icon),
.hlquery-nav-button--active :deep(.v-icon) {
  color: #ffffff !important;
}

/* Text styling - White */
.nav-button-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  color: #ffffff !important;
  line-height: 20px !important;
  margin: 0 !important;
  padding: 0 !important;
}

.hlquery-nav-button--active .nav-button-text {
  color: #ffffff !important;
  font-weight: 500 !important;
}

.header-action-btn,
.header-action-btn.v-btn,
.header-action-btn.v-btn--variant-flat,
.header-action-btn.v-btn--variant-text {
  min-width: 0 !important;
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 11px !important;
  border-radius: 7px !important;
  text-transform: none !important;
  letter-spacing: -0.01em !important;
  border: 1px solid rgba(148, 163, 184, 0.22) !important;
  box-shadow: none !important;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease !important;
}

.header-action-btn:hover,
.header-action-btn.v-btn:hover,
.header-action-btn:focus-visible,
.header-action-btn.v-btn:focus-visible {
  transform: none !important;
  box-shadow: none !important;
}

.header-action-btn:active,
.header-action-btn.v-btn:active {
  transform: translateY(0) !important;
  box-shadow: none !important;
}

.header-action-btn::before,
.header-action-btn :deep(.v-btn__overlay) {
  display: none !important;
}

.header-action-btn--light,
.header-action-btn--light.v-btn,
.header-action-btn--light.v-btn--variant-flat,
.header-action-btn--light.v-btn--variant-text {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  color: #0f172a !important;
  border-radius: 10px !important;
  min-height: 32px !important;
  height: 32px !important;
  padding-inline: 11px !important;
  border: 1px solid rgba(148, 163, 184, 0.22) !important;
}

.header-action-btn--light:hover,
.header-action-btn--light.v-btn:hover,
.header-action-btn--light:focus-visible,
.header-action-btn--light.v-btn:focus-visible {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  border-color: #e5e7eb !important;
  color: #0f172a !important;
}

.header-action-btn--light:active,
.header-action-btn--light.v-btn:active {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  border-color: #e5e7eb !important;
  color: #0f172a !important;
}

.header-action-btn--light :deep(.v-btn__content),
.header-action-btn--light :deep(.v-btn__content *),
.header-action-btn--light :deep(.v-icon),
.header-action-btn--light :deep(span) {
  color: #0f172a !important;
}

.app-navbar .connection-status-btn.header-action-btn--light,
.app-navbar .connection-status-btn.header-action-btn--light.v-btn,
.app-navbar .connection-status-btn.header-action-btn--light.v-btn--variant-flat,
.app-navbar .connection-status-btn.header-action-btn--light :deep(.v-btn__content),
.app-navbar .connection-status-btn.header-action-btn--light :deep(.v-btn__content *),
.app-navbar .connection-status-btn.header-action-btn--light :deep(.v-btn__prepend .v-icon),
.app-navbar .connection-status-btn.header-action-btn--light :deep(.v-btn__prepend-inner .v-icon),
.app-navbar .connection-status-btn.header-action-btn--light :deep(span),
.app-navbar .connection-status-btn.header-action-btn--light .connection-host-text {
  color: #0f172a !important;
}

.app-navbar .connection-status-btn.header-action-btn--light,
.app-navbar .connection-status-btn.header-action-btn--light.v-btn,
.app-navbar .connection-status-btn.header-action-btn--light.v-btn--variant-flat {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  background-color: #ffffff !important;
  border: 1px solid rgba(148, 163, 184, 0.22) !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
  transform: translateY(0) !important;
}

.app-navbar .connection-status-btn.header-action-btn--light:hover,
.app-navbar .connection-status-btn.header-action-btn--light.v-btn:hover,
.app-navbar .connection-status-btn.header-action-btn--light:focus-visible,
.app-navbar .connection-status-btn.header-action-btn--light.v-btn:focus-visible {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  background-color: #ffffff !important;
  border-color: rgba(100, 116, 139, 0.28) !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06) !important;
  transform: translateY(0) !important;
}

.app-navbar .connection-status-btn.header-action-btn--light:active,
.app-navbar .connection-status-btn.header-action-btn--light.v-btn:active {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  background-color: #f8fafc !important;
  border-color: #e5e7eb !important;
}

.nav-menu-btn {
  min-width: 132px !important;
  justify-content: center !important;
  margin-right: 6px !important;
  height: 32px !important;
  min-height: 32px !important;
  padding-inline: 11px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(148, 163, 184, 0.22) !important;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
  transform: translateY(0) !important;
}

.nav-menu-btn:hover,
.nav-menu-btn:active,
.nav-menu-btn:focus,
.nav-menu-btn:focus-visible {
  color: #0f172a !important;
  transform: translateY(0) !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06) !important;
}

.nav-menu-btn:hover :deep(.v-icon),
.nav-menu-btn:active :deep(.v-icon),
.nav-menu-btn:focus :deep(.v-icon),
.nav-menu-btn:focus-visible :deep(.v-icon),
.nav-menu-btn:hover :deep(.v-btn__prepend .v-icon),
.nav-menu-btn:active :deep(.v-btn__prepend .v-icon),
.nav-menu-btn:focus :deep(.v-btn__prepend .v-icon),
.nav-menu-btn:focus-visible :deep(.v-btn__prepend .v-icon),
.nav-menu-btn:hover :deep(.v-btn__prepend-inner .v-icon),
.nav-menu-btn:active :deep(.v-btn__prepend-inner .v-icon),
.nav-menu-btn:focus :deep(.v-btn__prepend-inner .v-icon),
.nav-menu-btn:focus-visible :deep(.v-btn__prepend-inner .v-icon) {
  color: #0f172a !important;
  opacity: 1 !important;
}

.nav-menu-btn .nav-button-text {
  margin-left: 0 !important;
  color: #0f172a !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  letter-spacing: -0.01em !important;
}

.nav-menu-btn :deep(.v-btn__content) {
  width: 100% !important;
  justify-content: center !important;
  gap: 8px !important;
}

.nav-menu-btn :deep(.v-icon) {
  color: #0f172a !important;
  font-size: 18px !important;
  opacity: 1 !important;
}

.nav-menu-list {
  min-width: 260px;
  padding: 8px 6px !important;
  border-radius: 12px !important;
  border: 1px solid #e5e7eb !important;
  background: #ffffff !important;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.08) !important;
}

.nav-menu-item {
  min-height: 38px !important;
  border-radius: 8px !important;
  margin: 2px 0 !important;
  padding-inline: 8px 10px !important;
}

.nav-menu-item :deep(.v-list-item-title) {
  font-weight: 600;
  font-size: 13.5px !important;
  letter-spacing: 0.01em;
  color: #111827 !important;
  margin-left: 0 !important;
  line-height: 1.15 !important;
}

.nav-menu-item :deep(.v-list-item-subtitle) {
  margin-top: 2px !important;
  font-size: 11.5px !important;
  font-weight: 500;
  color: #64748b !important;
  opacity: 1 !important;
  line-height: 1.1 !important;
}

.nav-menu-item :deep(.v-list-item__prepend) {
  margin-right: 6px !important;
  min-width: 16px !important;
  width: 16px !important;
  flex: 0 0 16px !important;
  justify-content: center !important;
}

.nav-menu-item :deep(.v-list-item__content) {
  padding-left: 0 !important;
}

.nav-menu-item :deep(.v-list-item__prepend .v-icon) {
  margin-inline-end: 0 !important;
}

.nav-menu-item.nav-menu-item--active {
  background: linear-gradient(180deg, #184a88 0%, #0b2f63 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 10px 22px rgba(11, 47, 99, 0.26) !important;
  --v-hover-opacity: 0 !important;
  --v-activated-opacity: 0 !important;
  --v-theme-overlay-multiplier: 0 !important;
}

.nav-menu-item.nav-menu-item--active:hover,
.nav-menu-item.nav-menu-item--active:active,
.nav-menu-item.nav-menu-item--active:focus,
.nav-menu-item.nav-menu-item--active:focus-visible {
  background: linear-gradient(180deg, #184a88 0%, #0b2f63 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 10px 22px rgba(11, 47, 99, 0.26) !important;
}

.nav-menu-item :deep(.v-icon) {
  color: #334155 !important;
  font-size: 16px !important;
}

.nav-menu-item:hover {
  background: #f8fafc !important;
}

.nav-menu-item:active,
.nav-menu-item:focus,
.nav-menu-item:focus-visible,
.nav-menu-item.v-list-item--active,
.nav-menu-item.v-list-item--active:focus,
.nav-menu-item.v-list-item--active:focus-visible,
.nav-menu-item :deep(.v-list-item--active),
.nav-menu-item :deep(.v-list-item--active:focus),
.nav-menu-item :deep(.v-list-item--active:focus-visible) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.nav-menu-item :deep(.v-list-item__overlay),
.nav-menu-item :deep(.v-list-item__underlay) {
  border: none !important;
}

.nav-menu-item.nav-menu-item--active :deep(.v-list-item__overlay),
.nav-menu-item.nav-menu-item--active :deep(.v-list-item__underlay),
.nav-menu-item.nav-menu-item--active:hover :deep(.v-list-item__overlay),
.nav-menu-item.nav-menu-item--active:hover :deep(.v-list-item__underlay),
.nav-menu-item.nav-menu-item--active:focus :deep(.v-list-item__overlay),
.nav-menu-item.nav-menu-item--active:focus :deep(.v-list-item__underlay) {
  background: transparent !important;
  background-color: transparent !important;
  opacity: 0 !important;
}

.nav-menu-item.nav-menu-item--active :deep(.v-list-item-title) {
  color: #ffffff !important;
}

.nav-menu-item.nav-menu-item--active :deep(.v-list-item-subtitle) {
  color: rgba(255, 255, 255, 0.82) !important;
}

.nav-menu-item.nav-menu-item--active :deep(.v-icon) {
  color: #ffffff !important;
}

.hlquery-nav-button :deep(.v-btn__content span) {
  color: inherit !important;
  font-weight: inherit !important;
}

/* Override any global button styles */
.hlquery-nav-button::before {
  display: none !important;
}

.hlquery-nav-button :deep(.v-btn__overlay) {
  display: none !important;
}

/* Icon-only navigation button (for server settings) - White */
.hlquery-nav-button-icon {
  color: #ffffff !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 6px !important;
  transition: background-color 0.2s ease !important;
  min-width: 40px !important;
  width: 40px !important;
  height: 40px !important;
}

.hlquery-nav-button-icon:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
}

.hlquery-nav-button-icon:active,
.hlquery-nav-button-icon:focus {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
}

.hlquery-nav-button-icon :deep(.v-icon) {
  color: #ffffff !important;
  font-size: 20px !important;
}

.hlquery-nav-button-icon :deep(.v-btn__content) {
  color: #ffffff !important;
}

.settings-btn {
  color: #ffffff !important;
}

.settings-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
}

.settings-btn:hover :deep(.v-icon) {
  color: #ffffff !important;
  opacity: 1 !important;
}

.settings-btn :deep(.v-icon) {
  color: #ffffff !important;
  opacity: 1 !important;
  transition: color 0.2s ease !important;
}

.settings-btn :deep(.v-btn__content) {
  color: #ffffff !important;
}

.settings-btn :deep(.v-btn__overlay) {
  display: none !important;
}

/* Enhanced Tooltip Styles */
:deep(.v-tooltip .v-overlay__content) {
  background: #1e293b !important;
  color: #ffffff !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(8px) !important;
  letter-spacing: 0.01em !important;
}

.hlquery-nav-button-icon::before {
  display: none !important;
}

.hlquery-nav-button-icon :deep(.v-btn__overlay) {
  display: none !important;
}

/* Connection status button - Simple color with 3D top effect */
.connection-status-btn,
.connection-status-btn.v-btn,
.connection-status-btn.v-btn--variant-flat,
.connection-status-btn.v-btn--size-small,
.connection-status-btn.v-btn--variant-flat.v-btn--size-small {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  line-height: 1 !important;
  height: 32px !important;
  min-height: 32px !important;
  max-height: 32px !important;
  min-width: 140px !important;
  padding: 0 12px !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  position: relative !important;
  gap: 0 !important;
}

.connection-status-btn::before {
  display: none !important;
}

.connection-status-btn:hover,
.connection-status-btn.v-btn:hover,
.connection-status-btn.v-btn--variant-flat:hover {
  color: #0f172a !important;
}

.connection-status-btn:hover::before {
  display: none !important;
}

.connection-status-btn:hover :deep(.v-btn__content) {
  text-decoration: none !important;
}

.connection-status-btn:active,
.connection-status-btn.v-btn:active,
.connection-status-btn.v-btn--variant-flat:active {
  color: #0f172a !important;
}

.connection-status-btn:active::before {
  display: none !important;
}

.connection-status-btn :deep(.v-btn__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  gap: 8px !important;
  width: 100% !important;
  text-align: left !important;
}

.connection-host-text {
  color: #0f172a !important;
  font-weight: 600 !important;
  font-family: Inter, Helvetica, sans-serif !important;
}

.connection-status-btn :deep(.v-btn__content *),
.connection-status-btn :deep(span) {
  color: #0f172a !important;
  font-weight: 600 !important;
}

/* Allow prepend icon (cog) for connection status button */
.connection-status-btn :deep(.v-btn__prepend),
.connection-status-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  margin-right: 6px !important;
  margin-left: 0 !important;
  justify-content: flex-start !important;
  flex: 0 0 auto !important;
}

.connection-status-btn :deep(.v-btn__prepend .v-icon),
.connection-status-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #0f172a !important;
  opacity: 1 !important;
  font-size: 17px !important;
}

/* Hide append icons */
.connection-status-btn :deep(.v-btn__append),
.connection-status-btn :deep(.v-btn__append-inner) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Remove any spacing from prepend/append slots - same as collections-action-btn */
.connection-status-btn :deep(.v-btn__prepend) ~ .v-btn__content,
.connection-status-btn :deep(.v-btn__append) ~ .v-btn__content {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.connection-status-btn :deep(.v-btn__overlay) {
  display: none !important;
}

/* Ensure button wrapper has no extra spacing - same as collections-action-btn */
.connection-status-btn :deep(.v-btn__wrapper) {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
}

.connection-status-btn {
  min-height: 32px !important;
  padding: 0 12px !important;
}

.connection-status-btn :deep(.v-btn__prepend) ~ .v-btn__content {
  justify-content: flex-start !important;
  text-align: left !important;
}

.reconnect-btn :deep(.v-btn__content),
.reconnect-btn :deep(.v-btn__content *),
.reconnect-btn :deep(.v-icon),
.reconnect-btn :deep(span),
.connection-status-btn.disconnected :deep(.v-btn__content),
.connection-status-btn.disconnected :deep(.v-btn__content *),
.connection-status-btn.disconnected :deep(.v-icon),
.connection-status-btn.disconnected :deep(span) {
  color: #0f172a !important;
}

/* Disconnected state - Red with minimal glow */
.connection-status-btn.disconnected,
.connection-status-btn.disconnected.v-btn,
.connection-status-btn.disconnected.v-btn--variant-flat {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border-color: #e5e7eb !important;
  color: #0f172a !important;
  box-shadow: none !important;
}

.connection-status-btn.disconnected:hover,
.connection-status-btn.disconnected.v-btn:hover {
  background: #f8fafc !important;
  background-color: #ffffff !important;
  border-color: #d1d5db !important;
  box-shadow: none !important;
  transform: none !important;
}

.connection-status-btn.disconnected:active,
.connection-status-btn.disconnected.v-btn:active {
  background: #f8fafc !important;
  background-color: #f8fafc !important;
  border-color: #d1d5db !important;
  box-shadow: none !important;
  transform: translateY(0) !important;
}

.connection-status-btn.disconnected :deep(.v-btn__content),
.connection-status-btn.disconnected :deep(.v-btn__content *),
.connection-status-btn.disconnected :deep(.v-icon),
.connection-status-btn.disconnected :deep(span) {
  color: #0f172a !important;
}

.reconnect-btn,
.reconnect-btn.v-btn,
.reconnect-btn.v-btn--variant-flat {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  background-color: #ffffff !important;
  color: #0f172a !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
  transform: none !important;
}

.reconnect-btn :deep(.v-btn__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: 100% !important;
  text-align: left !important;
}

.reconnect-btn :deep(.v-btn__prepend) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  margin-inline-end: 6px !important;
  margin-inline-start: 0 !important;
}

.reconnect-btn :deep(.v-btn__loader),
.reconnect-btn :deep(.v-progress-circular),
.reconnect-btn :deep(.v-progress-circular__content),
.reconnect-btn :deep(.v-progress-circular svg),
.reconnect-btn :deep(.v-progress-circular circle),
.reconnect-btn :deep(.v-btn__content),
.reconnect-btn :deep(.v-btn__content *),
.reconnect-btn :deep(.v-icon),
.reconnect-btn :deep(span) {
  color: #0f172a !important;
}

.reconnect-btn .reconnect-btn-label,
.reconnect-btn .reconnect-btn-icon {
  color: #0f172a !important;
}

.reconnect-btn:hover,
.reconnect-btn.v-btn:hover,
.reconnect-btn:active,
.reconnect-btn.v-btn:active {
  background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%) !important;
  background-color: #ffffff !important;
  border-color: rgba(100, 116, 139, 0.38) !important;
  box-shadow:
    0 12px 24px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.98) !important;
  transform: translateY(-1px) !important;
}

.reconnect-btn :deep(.v-icon),
.reconnect-btn :deep(.v-btn__content) {
  color: #0f172a !important;
}

/* Connection Menu Card */
.connection-menu-card {
  border-radius: 18px !important;
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.2),
    0 6px 20px rgba(15, 23, 42, 0.12) !important;
  border: none !important;
  background: #ffffff !important;
  overflow: hidden;
  padding: 0 !important;
  width: min(580px, calc(100vw - 24px)) !important;
  min-width: 0 !important;
  max-width: calc(100vw - 24px) !important;
}

.connection-menu-card .v-card-title,
.connection-menu-card .v-card-text {
  padding-left: 32px !important;
  padding-right: 32px !important;
}

.connection-menu-card .v-card-title {
  padding-top: 28px !important;
  padding-bottom: 16px !important;
  padding-right: 12px !important;
}

.connection-menu-card .v-card-text {
  padding-top: 12px !important;
  padding-bottom: 28px !important;
}

.connection-menu-title {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

/* Modern Server URL Input - Matching filter-input-modern style */
.server-url-input-modern :deep(.v-field) {
  background: #f1f5f9 !important;
  border: none !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  padding-left: 8px !important;
  padding-right: 8px !important;
}

.server-url-input-modern :deep(.v-field--variant-outlined),
.server-url-input-modern :deep(.v-field--variant-outlined:hover),
.server-url-input-modern :deep(.v-field--variant-outlined.v-field--focused) {
  border-color: transparent !important;
  box-shadow: none !important;
  outline: none !important;
}

.server-url-input-modern :deep(.v-field--focused) {
  background: #e2e8f0 !important;
  box-shadow: none !important;
  outline: none !important;
}

.server-url-input-modern :deep(.v-field__input) {
  color: #1e293b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
  padding-inline: 12px !important;
}

.server-url-input-modern :deep(.v-field__prepend-inner) {
  color: #64748b !important;
  padding-inline-start: 12px !important;
}

.server-url-input-modern :deep(.v-field--focused .v-field__prepend-inner) {
  color: #475569 !important;
}

.server-url-input-modern :deep(input) {
  outline: none !important;
}

.server-url-input-modern :deep(.v-field__outline) {
  border: none !important;
}

.server-url-input-modern :deep(.v-field--variant-outlined .v-field__outline__start),
.server-url-input-modern :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.server-url-input-modern :deep(.v-field--variant-outlined .v-field__outline__notch::after),
.server-url-input-modern :deep(.v-field--variant-outlined .v-field__outline__end) {
  border: none !important;
}

.server-url-link {
  display: inline-flex;
  align-items: center;
  margin-top: 10px;
  color: #2563eb;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
  text-decoration: none;
  word-break: break-all;
}

.server-url-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.ssl-checkbox {
  display: inline-flex !important;
  align-items: center !important;
  gap: 12px !important;
  margin-inline-start: 0 !important;
  margin-top: 14px !important;
  margin-bottom: 14px !important;
  cursor: pointer !important;
  user-select: none !important;
}

.ssl-checkbox__input {
  appearance: auto !important;
  -webkit-appearance: checkbox !important;
  width: 15px !important;
  height: 15px !important;
  min-width: 15px !important;
  min-height: 15px !important;
  margin: 0 !important;
  accent-color: #10b981 !important;
  cursor: pointer !important;
  flex: 0 0 15px !important;
  outline: none !important;
  box-shadow: none !important;
  border-color: currentColor !important;
}

.ssl-checkbox__input:focus,
.ssl-checkbox__input:focus-visible,
.ssl-checkbox__input:active {
  outline: none !important;
  box-shadow: none !important;
}

.ssl-checkbox__label {
  display: inline-block !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: unset !important;
  line-height: 1.3 !important;
  word-break: normal !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  opacity: 1 !important;
}

/* Modern Auth Method Select - Matching filter-input-modern style */
.auth-method-select-modern :deep(.v-field) {
  background: #f1f5f9 !important;
  border: none !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

.auth-method-select-modern :deep(.v-field--focused) {
  background: #e2e8f0 !important;
  box-shadow: none !important;
}

.auth-method-select-modern :deep(.v-field__input) {
  color: #1e293b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.auth-method-select-modern :deep(.v-field__prepend-inner) {
  color: #64748b !important;
}

.auth-method-select-modern :deep(.v-field--focused .v-field__prepend-inner) {
  color: #475569 !important;
}

.auth-method-select-modern :deep(.v-field__outline) {
  border: none !important;
}

.auth-method-select-modern :deep(.v-field--variant-outlined .v-field__outline__start),
.auth-method-select-modern :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.auth-method-select-modern :deep(.v-field--variant-outlined .v-field__outline__notch::after),
.auth-method-select-modern :deep(.v-field--variant-outlined .v-field__outline__end) {
  border: none !important;
}

/* Modern Auth Token Input - Matching filter-input-modern style */
.auth-token-input-modern :deep(.v-field) {
  background: #f1f5f9 !important;
  border: none !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
  padding-left: 8px !important;
  padding-right: 8px !important;
}

.auth-token-input-modern :deep(.v-field--variant-outlined),
.auth-token-input-modern :deep(.v-field--variant-outlined:hover),
.auth-token-input-modern :deep(.v-field--variant-outlined.v-field--focused) {
  border-color: transparent !important;
  box-shadow: none !important;
  outline: none !important;
}

.auth-token-input-modern :deep(.v-field__field),
.auth-token-input-modern :deep(.v-field__input),
.auth-token-input-modern :deep(.v-field__input input) {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  background: transparent !important;
}

.auth-token-input-modern :deep(.v-field--focused) {
  background: #e2e8f0 !important;
  box-shadow: none !important;
  outline: none !important;
}

.auth-token-input-modern :deep(.v-field__input) {
  color: #1e293b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 400 !important;
  padding-inline: 10px !important;
  min-height: 46px !important;
}

.auth-token-input-modern :deep(.v-field__prepend-inner) {
  color: #64748b !important;
  padding-inline-start: 10px !important;
  padding-inline-end: 6px !important;
}

.auth-token-input-modern :deep(.v-field--focused .v-field__prepend-inner) {
  color: #475569 !important;
}

.auth-token-input-modern :deep(.v-field__append-inner) {
  color: #64748b !important;
  padding-inline-start: 6px !important;
  padding-inline-end: 10px !important;
}

.auth-token-input-modern :deep(.v-field--focused .v-field__append-inner) {
  color: #475569 !important;
}

.auth-token-input-modern :deep(.v-field__prepend-inner .v-icon),
.auth-token-input-modern :deep(.v-field__append-inner .v-icon) {
  opacity: 0.9 !important;
}

.auth-token-input-modern :deep(input::placeholder) {
  color: #7c8aa0 !important;
  opacity: 1 !important;
}

.auth-token-input-modern :deep(input) {
  font-size: 15px !important;
}

.auth-token-input-modern :deep(input),
.auth-token-input-modern :deep(input:focus),
.auth-token-input-modern :deep(input:focus-visible) {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

.auth-token-input-modern :deep(.v-field__outline) {
  border: none !important;
}

.auth-token-input-modern :deep(.v-field--variant-outlined .v-field__outline__start),
.auth-token-input-modern :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.auth-token-input-modern :deep(.v-field--variant-outlined .v-field__outline__notch::after),
.auth-token-input-modern :deep(.v-field--variant-outlined .v-field__outline__end) {
  border: none !important;
}

.auth-token-use-btn {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
}

.connection-menu-card :deep(.v-expansion-panel) {
  border-radius: 12px !important;
  overflow: hidden !important;
}

.connection-menu-card :deep(.v-expansion-panel-title) {
  min-height: 64px !important;
  padding: 0 20px !important;
  outline: none !important;
}

.connection-menu-card :deep(.v-expansion-panel-title:focus),
.connection-menu-card :deep(.v-expansion-panel-title:focus-visible),
.connection-menu-card :deep(.v-expansion-panel-title--active),
.connection-menu-card :deep(.v-expansion-panel-title--active:focus),
.connection-menu-card :deep(.v-expansion-panel-title--active:focus-visible) {
  outline: none !important;
  box-shadow: none !important;
}

.connection-menu-card :deep(.v-expansion-panel-title__overlay) {
  background: transparent !important;
}

.connection-connect-btn {
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: -0.01em !important;
}

/* Fix menu position to prevent shifting on click */
.ping-menu-card {
  position: relative !important;
}

/* Prevent menu from repositioning when clicking inside */
.app-navbar :deep(.v-overlay__content) {
  pointer-events: auto !important;
}

.app-navbar :deep(.v-menu__content) {
  transform-origin: top right !important;
}

.ping-menu-card {
  width: 420px !important;
  max-width: 420px !important;
  min-width: 420px !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08) !important;
  border: 1px solid #e2e8f0 !important;
  overflow: hidden !important;
  position: relative !important;
}

.clickable-health-card {
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.clickable-health-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.1) !important;
}

.connection-info-title {
  background: #f8fafc !important;
  border-bottom: none !important;
  display: block !important;
  width: 100% !important;
}

.connection-menu-header-row {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  gap: 0 !important;
}

.connection-menu-host-group {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  min-width: 0 !important;
}

.connection-host-display {
  font-family: Inter, Helvetica, sans-serif !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  letter-spacing: -0.01em !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.connect-btn-right {
  margin-left: auto !important;
}

.connection-info-section {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.connection-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.server-config-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.config-item {
  text-align: center;
  padding: 6px 8px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.stat-item {
  text-align: center;
  padding: 6px 8px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.stat-item .text-caption {
  margin-bottom: 2px !important;
  font-size: 11px !important;
}

.stat-item .text-h6 {
  font-size: 16px !important;
  line-height: 1.2 !important;
}

.connection-buttons-container {
  margin-left: auto !important;
  gap: 20px !important;
  padding-right: 24px !important;
  align-items: center !important;
  position: relative;
}

.header-right-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 12px;
  min-width: 0;
  flex: 0 0 auto;
  transform: translateY(-2px);
}

/* Connection Ping Display */
.connection-ping-display {
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

/* Collections action buttons style for Connect button */
.collections-action-btn.v-btn,
.collections-action-btn.v-btn--variant-flat,
.collections-action-btn.v-btn--size-small,
.collections-action-btn.v-btn--variant-flat.v-btn--size-small {
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow:
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
}

.collections-action-btn {
  border-radius: 6px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  line-height: 29px !important;
  height: 29px !important;
  padding: 0 12px !important;
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

/* Allow icon for connect button - same style as create-collection-header-btn */
.collections-action-btn.connect-btn-right {
  justify-content: flex-start !important;
  text-align: left !important;
  display: flex !important;
}

.collections-action-btn.connect-btn-right :deep(.v-btn__prepend),
.collections-action-btn.connect-btn-right :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  margin-right: 6px !important;
  margin-left: 0 !important;
  order: -1 !important;
}

.collections-action-btn.connect-btn-right :deep(.v-btn__prepend .v-icon),
.collections-action-btn.connect-btn-right :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
}

.collections-action-btn.connect-btn-right :deep(.v-btn__content) {
  justify-content: flex-start !important;
  align-items: center !important;
  text-align: left !important;
  width: 100% !important;
  padding-left: 0 !important;
  gap: 6px !important;
}

.collections-action-btn.connect-btn-right :deep(.v-btn__wrapper) {
  justify-content: flex-start !important;
  align-items: center !important;
  width: 100% !important;
  display: flex !important;
}

.collections-action-btn.connect-btn-right :deep(.v-btn__prepend) {
  order: 1 !important;
  margin-right: 6px !important;
  margin-left: 0 !important;
}

.collections-action-btn.connect-btn-right :deep(.v-btn__content) {
  order: 2 !important;
  flex: 0 0 auto !important;
}

.collections-action-btn :deep(.v-btn__overlay) {
  display: none !important;
}

@media (max-width: 1280px) {
  .app-navbar {
    padding: 0 64px !important;
  }
  
  .header-search-container {
    width: 280px !important;
    min-width: 280px !important;
    max-width: 280px !important;
    left: 200px !important;
  }
}

@media (max-width: 960px) {
  .app-navbar {
    padding: 0 48px !important;
  }
  
  .header-search-container {
    width: 240px !important;
    min-width: 240px !important;
    max-width: 240px !important;
    left: 180px !important;
  }
}

@media (max-width: 600px) {
  .demo-mode-banner__inner {
    min-height: 0;
    padding: 10px 12px;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .demo-mode-banner__content {
    justify-content: flex-start;
    text-align: left;
    gap: 4px;
  }

  .demo-mode-banner__title,
  .demo-mode-banner__message {
    font-size: 12px;
  }

  .app-navbar {
    padding: 0 8px !important;
    height: 50px !important;
    min-height: 50px !important;
  }

  .mobile-hide {
    display: none !important;
  }

  .mobile-hide-spacer {
    display: none !important;
  }

  .mobile-hide-text {
    display: none !important;
  }

  .header-search-container {
    display: none !important;
  }

  .v-app-bar {
    justify-content: space-between !important;
    align-items: center !important;
    padding: 0 8px !important;
    height: 50px !important;
    min-height: 50px !important;
  }

  .app-navbar :deep(.v-app-bar__content) {
    justify-content: space-between !important;
    align-items: center !important;
    padding: 0 8px !important;
    width: 100% !important;
    display: flex !important;
    flex-direction: row !important;
    gap: 8px !important;
    flex-wrap: nowrap !important;
    height: 50px !important;
    min-height: 50px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }

  .hlquery-nav-logo {
    display: flex !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    height: 100% !important;
    align-items: center !important;
  }

  .app-navbar .v-app-bar-title {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    overflow: hidden !important;
    height: 100% !important;
    display: flex !important;
    align-items: center !important;
  }

  .hlquery-logo-container {
    display: flex !important;
    padding: 4px 6px !important;
    min-height: 36px !important;
    height: 36px !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    align-self: center !important;
    transform: none !important;
  }

  .logo-image {
    height: 26px;
    display: block !important;
    margin: 0 !important;
  }

  .header-right-actions {
    margin-left: auto !important;
    gap: 6px !important;
    flex: 0 0 auto !important;
    height: 100% !important;
    align-items: center !important;
    justify-content: flex-end !important;
    min-width: fit-content !important;
  }

  .connection-buttons-container {
    position: static !important;
    left: auto !important;
    right: auto !important;
    transform: none !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    z-index: 10 !important;
    gap: 0 !important;
    width: auto !important;
    height: auto !important;
    min-height: 36px !important;
    align-items: center !important;
    justify-content: flex-end !important;
    padding-right: 0 !important;
    flex: 0 0 auto !important;
    display: flex !important;
  }

  .nav-menu-btn {
    display: inline-flex !important;
    flex: 0 0 44px !important;
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
    height: 44px !important;
    min-height: 44px !important;
    padding: 0 !important;
    border-radius: 12px !important;
    margin-right: 0 !important;
    align-self: center !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
    transform: none !important;
  }

  .app-navbar .nav-menu-btn,
  .app-navbar .connection-status-btn.header-action-btn--light {
    background: #ffffff !important;
    border: 1px solid rgba(148, 163, 184, 0.18) !important;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12) !important;
  }

  .nav-menu-btn .nav-button-text {
    display: none !important;
  }

  .nav-menu-btn :deep(.v-btn__content),
  .nav-menu-btn :deep(.v-btn__prepend),
  .nav-menu-btn :deep(.v-btn__prepend-inner) {
    display: inline-flex !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    justify-content: center !important;
    align-items: center !important;
  }

  .nav-menu-btn :deep(.v-btn__content) {
    width: 100% !important;
    height: 100% !important;
  }

  .nav-menu-btn :deep(.v-btn__prepend),
  .nav-menu-btn :deep(.v-btn__prepend-inner) {
    width: auto !important;
    height: auto !important;
    flex: 0 0 auto !important;
  }

  .nav-menu-btn :deep(.v-btn__prepend) {
    margin-inline-end: 0 !important;
  }

  .nav-menu-btn :deep(.v-btn__append),
  .nav-menu-btn :deep(.v-btn__append-inner),
  .nav-menu-btn :deep(.v-btn__wrapper) {
    display: none !important;
  }

  .nav-menu-btn :deep(.v-icon) {
    margin: 0 !important;
    font-size: 16px !important;
  }

  .connection-status-btn {
    display: flex !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    justify-content: center !important;
    align-items: center !important;
    flex: 0 0 44px !important;
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
    height: 44px !important;
    min-height: 44px !important;
    padding: 0 !important;
    border-radius: 12px !important;
    align-self: center !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
    transform: none !important;
  }

  .app-navbar .connection-status-btn,
  .app-navbar .connection-status-btn.v-btn,
  .app-navbar .connection-status-btn.v-btn--variant-flat,
  .app-navbar .connection-status-btn.header-action-btn--light,
  .app-navbar .connection-status-btn.header-action-btn--light.v-btn,
  .app-navbar .connection-status-btn.header-action-btn--light.v-btn--variant-flat {
    flex: 0 0 44px !important;
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
    padding: 0 !important;
  }

  .connection-status-btn :deep(.v-btn__content) {
    display: flex !important;
    width: 100% !important;
    height: 100% !important;
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
    margin: 0 !important;
    padding: 0 !important;
    gap: 0 !important;
    min-width: 0 !important;
  }

  .connection-status-btn :deep(.v-btn__prepend),
  .connection-status-btn :deep(.v-btn__prepend-inner) {
    display: inline-flex !important;
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
    height: auto !important;
    flex: 0 0 auto !important;
    justify-content: center !important;
    align-items: center !important;
  }

  .connection-status-btn :deep(.v-btn__prepend) {
    margin-inline-end: 0 !important;
  }

  .connection-status-btn :deep(.v-btn__append),
  .connection-status-btn :deep(.v-btn__append-inner),
  .connection-status-btn :deep(.v-btn__wrapper) {
    display: none !important;
  }

  .connection-status-btn :deep(.v-icon) {
    margin: 0 !important;
    font-size: 18px !important;
    flex: 0 0 auto !important;
  }

  .connection-status-btn.disconnected {
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
    height: 44px !important;
    min-height: 44px !important;
    padding: 0 !important;
  }

  .connection-status-btn.disconnected :deep(.v-btn__content) {
    justify-content: center !important;
    align-items: center !important;
    gap: 0 !important;
    text-indent: 0 !important;
    font-size: 0 !important;
    line-height: 0 !important;
  }

  .connection-status-btn.disconnected :deep(.v-btn__content)::after {
    content: '' !important;
  }

  .connection-status-btn.disconnected :deep(.v-btn__prepend),
  .connection-status-btn.disconnected :deep(.v-btn__prepend-inner) {
    width: auto !important;
    height: auto !important;
    margin: 0 !important;
    justify-content: center !important;
    align-items: center !important;
  }

  .connection-status-btn.disconnected :deep(.v-btn__prepend) {
    margin-inline-end: 0 !important;
  }

  .connection-status-btn.disconnected :deep(.v-btn__prepend .v-icon),
  .connection-status-btn.disconnected :deep(.v-btn__prepend-inner .v-icon),
  .connection-status-btn.disconnected :deep(.v-icon) {
    font-size: 16px !important;
    margin: 0 !important;
  }

  .reconnect-btn :deep(.v-btn__content) {
    justify-content: flex-start !important;
    text-align: left !important;
  }

  .reconnect-btn :deep(.v-btn__prepend) {
    margin-inline-end: 6px !important;
  }
  .connection-host-text {
    display: none !important;
  }

  .app-navbar .connection-status-btn :deep(.v-btn__content),
  .app-navbar .connection-status-btn :deep(.v-btn__wrapper),
  .app-navbar .connection-status-btn :deep(.v-btn__prepend) ~ .v-btn__content {
    justify-content: center !important;
    text-align: center !important;
    gap: 0 !important;
    min-width: 0 !important;
  }

  .app-navbar .connection-status-btn :deep(.v-btn__prepend),
  .app-navbar .connection-status-btn :deep(.v-btn__prepend-inner) {
    width: 100% !important;
    height: 100% !important;
    margin-right: 0 !important;
    justify-content: center !important;
    align-items: center !important;
  }

  .app-navbar .connection-status-btn :deep(.v-btn__wrapper) {
    width: 100% !important;
    justify-content: center !important;
  }

  .header-right-actions > *,
  .connection-buttons-container > * {
    flex: 0 0 auto !important;
  }

  .connection-menu-card {
    width: min(calc(100vw - 16px), 580px) !important;
    max-width: calc(100vw - 16px) !important;
    border-radius: 14px !important;
  }

  .connection-menu-card .v-card-title,
  .connection-menu-card .v-card-text {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }

  .connection-menu-card .v-card-title {
    padding-top: 18px !important;
    padding-bottom: 12px !important;
  }

  .connection-menu-card .v-card-text {
    padding-bottom: 18px !important;
  }
}

@media (max-width: 768px) {
  .app-header-shell,
  .app-navbar,
  .app-navbar :deep(.v-app-bar__content) {
    width: 100vw !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
  }

  .app-navbar {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .header-search-container,
  .header-right-actions,
  .connection-buttons-container {
    min-width: 0 !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    left: auto !important;
    right: auto !important;
    transform: none !important;
  }

  .app-navbar,
  .v-app-bar,
  .app-navbar :deep(.v-app-bar__content) {
    height: 58px !important;
    min-height: 58px !important;
    padding: 0 16px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
  }

  .app-navbar :deep(.v-app-bar__content) {
    flex-wrap: nowrap !important;
    gap: 12px !important;
  }

  .hlquery-nav-logo,
  .app-navbar .v-app-bar-title,
  .header-right-actions,
  .connection-buttons-container {
    display: flex !important;
    align-items: center !important;
  }

  .hlquery-logo-container {
    padding: 0 !important;
    min-height: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    justify-content: flex-start !important;
    align-items: center !important;
  }

  .logo-image {
    width: 28px !important;
    height: 28px !important;
    display: block !important;
    margin: 0 !important;
  }

  .header-right-actions {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
  }

  .nav-menu-btn,
  .connection-status-btn,
  .app-navbar .nav-menu-btn,
  .app-navbar .connection-status-btn,
  .app-navbar .connection-status-btn.v-btn,
  .app-navbar .connection-status-btn.v-btn--variant-flat,
  .app-navbar .connection-status-btn.header-action-btn--light,
  .app-navbar .connection-status-btn.header-action-btn--light.v-btn,
  .app-navbar .connection-status-btn.header-action-btn--light.v-btn--variant-flat {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
    min-height: 44px !important;
    border-radius: 12px !important;
    padding: 0 !important;
    margin-top: 0 !important;
    top: 0 !important;
    position: relative !important;
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.10) !important;
  }

  .nav-menu-btn :deep(.v-icon),
  .connection-status-btn :deep(.v-icon) {
    font-size: 20px !important;
  }
}

/* Auth Status Banner Styles - Make them very prominent */
.auth-status-banner-required {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%) !important;
  border-left: 4px solid #d32f2f !important;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.2) !important;
}

.auth-status-banner-not-required {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%) !important;
  border-left: 4px solid #388e3c !important;
  box-shadow: 0 2px 8px rgba(56, 142, 60, 0.2) !important;
}

.auth-status-banner-optional {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
  border-left: 4px solid #1976d2 !important;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2) !important;
}

.app-navbar--scrolled {
  background: rgba(15, 23, 42, 0.98) !important;
  box-shadow: 0 14px 34px rgba(2, 8, 23, 0.24) !important;
  border: none !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.app-navbar--scrolled::before,
.app-navbar--scrolled::after {
  display: none !important;
}

/* Demo Mode Chip - Prominent but not intrusive */
.demo-mode-chip {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 11px !important;
  line-height: 20px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 4px 12px !important;
  height: 28px !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%) !important;
  color: #ffffff !important;
  box-shadow: 
    0 2px 4px rgba(245, 158, 11, 0.3),
    0 1px 2px rgba(245, 158, 11, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  animation: demo-pulse 2s ease-in-out infinite !important;
  position: relative !important;
}

.demo-mode-chip::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%) !important;
  pointer-events: none !important;
}

.demo-mode-chip :deep(.v-chip__prepend) {
  margin-right: 6px !important;
}

.demo-mode-chip :deep(.v-icon) {
  color: #ffffff !important;
  font-size: 16px !important;
  opacity: 0.95 !important;
}

.demo-mode-chip :deep(.v-chip__content) {
  color: #ffffff !important;
  font-weight: 600 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
}

@keyframes demo-pulse {
  0%, 100% {
    box-shadow: 
      0 2px 4px rgba(245, 158, 11, 0.3),
      0 1px 2px rgba(245, 158, 11, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 4px 8px rgba(245, 158, 11, 0.4),
      0 2px 4px rgba(245, 158, 11, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
}
</style>
