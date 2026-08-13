<template>
  <v-app>
    <a href="#main-content" class="skip-to-main">Skip to main content</a>
    <AppHeader @open-command-palette="openCommandPalette" />

    <v-main
      id="main-content"
      :class="['fullscreen-main', { 'fullscreen-main-collections': isCollectionsRoute }]"
      role="main"
      tabindex="-1"
    >
      <div class="fullscreen-content">
        <v-alert
          v-if="connectionStatus"
          :type="connectionStatus.type"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="connectionStatus = null"
          elevation="1"
        >
          <div class="text-subtitle-2 mb-1 font-weight-bold">{{ connectionStatus.message }}</div>
          <div class="text-caption">{{ connectionStatus.details }}</div>
        </v-alert>
        
        <!-- Authentication Error Banner -->
        <v-alert
          v-if="authError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="dismissAuthError"
          elevation="2"
          icon="mdi-alert-circle"
        >
          <div class="text-subtitle-2 mb-2 font-weight-bold">{{ authError.title }}</div>
          <div class="text-body-2 mb-2">{{ authError.message }}</div>
          <div class="d-flex align-center gap-2 mt-3">
            <v-btn
              variant="flat"
              size="small"
              color="error"
              @click="openServerSettings"
              class="auth-error-btn"
            >
              <v-icon start>mdi-cog</v-icon>
              Configure Authentication
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              @click="dismissAuthError"
            >
              Dismiss
            </v-btn>
          </div>
        </v-alert>
        
        <div v-if="showConnectingState" class="not-connected-wrapper" aria-live="polite">
          <v-card class="not-connected-card" elevation="0">
            <v-card-text class="not-connected-panel">
              <div class="not-connected-body">
                <v-progress-circular indeterminate color="primary" class="mb-4" />
                <h1 class="not-connected-title">Connecting to hlquery</h1>
                <p class="not-connected-subtitle">Waiting for the server and its collections to be ready.</p>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <div v-else-if="showDisconnectedState" class="not-connected-wrapper">
          <v-card class="not-connected-card" elevation="0">
            <v-card-text class="not-connected-panel">
              <div class="not-connected-body">
                <h1 class="not-connected-title">Unable to connect</h1>
                <p class="not-connected-description">
                  Hanalyzer cannot reach the hlquery server.
                </p>
                <p class="not-connected-subtitle">
                  Make sure the server is running, then retry the connection.
                </p>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <router-view v-else v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="getRouteViewKey(route)" />
          </Transition>
        </router-view>
      </div>
    </v-main>

    <!-- Toast Notifications -->
    <ToastContainer />

    <!-- Command Palette -->
    <CommandPalette
      v-model="commandPaletteOpen"
      @select="handleCommandPaletteSelect"
    />
  </v-app>
</template>

<script setup>
import { ref, computed, provide, watch, onUnmounted, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommandPalette from './components/CommandPalette.vue'
import AppHeader from './components/AppHeader.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useToast } from './composables/useToast'
import { shouldShowConnectingState, useConnectionStatus } from './composables/useConnectionStatus'

const router = useRouter()
const route = useRoute()
const baseUrl = ref('/api')
const deploymentDemoMode = ref(false)
const connectionState = useConnectionStatus(baseUrl)
const { isConnected, isChecking, hasChecked } = connectionState
const commandPaletteOpen = ref(false)
const connectionStatus = ref(null)
const authError = ref(null)
const isCollectionsRoute = computed(() => route.path === '/collections' || route.path.startsWith('/collections/'))
const collectionWorkspaceRouteNames = new Set([
  'collection-documents',
  'collection-documents-page',
  'collection-synonyms',
  'collection-stopwords'
])
const getRouteViewKey = (currentRoute) => {
  if (collectionWorkspaceRouteNames.has(currentRoute.name)) {
    return `collection-workspace:${String(currentRoute.params.name || '')}`
  }
  return currentRoute.path
}
const showDisconnectedState = computed(() => {
  return hasChecked.value && !isChecking.value && !isConnected.value
})
const showConnectingState = computed(() => {
  return shouldShowConnectingState(isChecking.value, isConnected.value)
})

// Expose baseUrl globally for axios interceptor
watch(baseUrl, (newUrl) => {
  if (typeof window !== 'undefined') {
    window.__HLQUERY_BASE_URL__ = newUrl
  }
}, { immediate: true })

watch(isConnected, (connected, previous) => {
  if (previous === true && connected === false && route.path !== '/status') {
    router.push('/status').catch(() => {})
  }
}, { immediate: false })

const { success, error, warning, info } = useToast()

const applyRuntimeConfig = (config) => {
  if (!config || typeof config !== 'object') return

  if (config.deploymentDemoMode === true) {
    deploymentDemoMode.value = true
  }

  const configuredBaseUrl = typeof config.defaultBaseUrl === 'string'
    ? config.defaultBaseUrl.trim()
    : ''

  if (deploymentDemoMode.value) {
    baseUrl.value = '/api'
    return
  }

  if (configuredBaseUrl) {
    baseUrl.value = configuredBaseUrl
  }
}

// Handle auth errors from axios interceptor
const handleAuthRequired = (event) => {
  const serverUrl = event.detail?.serverUrl || baseUrl.value || 'the server'
  authError.value = {
    title: 'Authentication Required',
    message: `The server requires authentication, but no credentials are configured. Please configure authentication in server settings to access this server.`,
    type: 'required',
    serverUrl
  }
  console.warn('[APP] Authentication required:', serverUrl)
}

const handleAuthFailed = (event) => {
  const serverUrl = event.detail?.serverUrl || baseUrl.value || 'the server'
  const status = event.detail?.status || null
  const detailMessage = event.detail?.message || ''
  
  let title = 'Authentication Failed'
  let message = `The provided authentication token is invalid or does not have sufficient permissions.`
  
  if (status === 403) {
    title = 'Access Forbidden'
    message = `The authentication token is being sent but does not have permission to access this resource. Please check that your token has the correct permissions.`
  } else if (status === 401) {
    title = 'Authentication Required'
    message = `The authentication token is invalid or expired. Please check your credentials in server settings and update them if necessary.`
  }
  
  if (detailMessage) {
    message = `${message} ${detailMessage}`
  }
  
  authError.value = {
    title,
    message,
    type: 'failed',
    serverUrl
  }
  console.warn('[APP] Authentication failed:', { serverUrl, status, detailMessage })
}

const dismissAuthError = () => {
  authError.value = null
}

const openServerSettings = () => {
  // Dispatch event that AppHeader can listen to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hlquery-open-server-settings'))
  }
  dismissAuthError()
}

// Listen for auth events from axios interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('hlquery-auth-required', handleAuthRequired)
  window.addEventListener('hlquery-auth-failed', handleAuthFailed)
  
  // Listen for successful auth - clear error after successful requests
  // This is a custom event that can be dispatched when auth succeeds
  const handleAuthSuccess = () => {
    // Clear auth error after a short delay to allow successful requests
    setTimeout(() => {
      if (authError.value) {
        authError.value = null
        console.log('[APP] Authentication successful, clearing error')
      }
    }, 1000)
  }
  window.addEventListener('hlquery-auth-success', handleAuthSuccess)
  
  // Store handler for cleanup
  window.__hlquery_auth_success_handler__ = handleAuthSuccess
}

// Cleanup on unmount
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('hlquery-auth-required', handleAuthRequired)
    window.removeEventListener('hlquery-auth-failed', handleAuthFailed)
    if (window.__hlquery_auth_success_handler__) {
      window.removeEventListener('hlquery-auth-success', window.__hlquery_auth_success_handler__)
      delete window.__hlquery_auth_success_handler__
    }
  }
})

onMounted(() => {
  if (typeof window === 'undefined') return

  const handleRuntimeConfigLoaded = (event) => {
    applyRuntimeConfig(event.detail)
  }

  window.addEventListener('hanalyzer-config-loaded', handleRuntimeConfigLoaded)
  window.__hlquery_runtime_config_handler__ = handleRuntimeConfigLoaded
  applyRuntimeConfig(window.HANALYZER_CONFIG)
})

onUnmounted(() => {
  if (typeof window !== 'undefined' && window.__hlquery_runtime_config_handler__) {
    window.removeEventListener('hanalyzer-config-loaded', window.__hlquery_runtime_config_handler__)
    delete window.__hlquery_runtime_config_handler__
  }
})

const openCommandPalette = () => {
  commandPaletteOpen.value = true
}

const handleCommandPaletteSelect = (item) => {
  switch (item.action) {
    case 'view-collection':
      const encodedName = encodeURIComponent(item.data)
      const path = `/collections/${encodedName}`
      router.push({ path: path })
      break
    case 'create-collection':
      // TODO: Open create collection dialog
      break
    case 'view-aliases':
      router.push({ path: '/aliases' })
      break
  }
}

// Provide toast functions to all components
provide('baseUrl', baseUrl)
provide('deploymentDemoMode', deploymentDemoMode)
provide('connectionState', connectionState)
provide('toast', { success, error, warning, info })
</script>

<style>
/* hlquery design system */

/* Typography - Sohne Var font */
@font-face {
  font-family: "sohne-var";
  font-style: normal;
  font-weight: 300;
  src: local("Sohne"), local("Sohne Var"), local("sohne-var"), local("Sohne Variable"), local("Sohne-Variable");
  font-display: swap;
}

:root {
  --hl-bg: #f3f6fb;
  --hl-bg-card: #ffffff;
  --hl-border: rgba(148, 163, 184, 0.3);
  --hl-shadow-soft: 0 20px 50px rgba(15, 23, 42, 0.09);
  --hl-shadow-card: 0 10px 30px rgba(15, 23, 42, 0.12);
  --hl-radius-xl: 20px;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  max-width: 100%;
  margin: 0;
  overflow-x: hidden;
}

body,
.v-application,
html {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
  color: #1e293b !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  background: linear-gradient(180deg, #eef1f4 0%, #e7ebf0 100%);
}

/* Don't apply color to all elements - causes button text issues */
.v-application * {
  font-family: Inter, Helvetica, sans-serif !important;
}

/* FORCE white text on blue buttons */
.v-btn.bg-primary,
.v-btn[style*="background: #1976d2"],
.v-btn.v-btn--variant-flat:not(.v-btn--variant-text):not(.header-action-btn--light):not(.connection-status-btn),
.action-btn-blue {
  color: #ffffff !important;
}

.v-btn.bg-primary *,
.v-btn.v-btn--variant-flat:not(.v-btn--variant-text):not(.header-action-btn--light):not(.connection-status-btn) *,
.action-btn-blue * {
  color: #ffffff !important;
}

/* Fullscreen main background - Harmonious soft gray */
.fullscreen-main {
  background: #eceff3 !important;
  min-height: calc(100vh - 72px);
  padding: 0 !important;
}

.fullscreen-main.fullscreen-main-collections {
  background: #ffffff !important;
}

/* Fullscreen content with margins - Better spacing */
.fullscreen-content {
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding: 28px 24px 40px;
  padding-top: 120px !important;
  min-width: 0;
  overflow-x: clip;
}

@media (max-width: 960px) {
  .fullscreen-content {
    padding-top: 108px !important;
  }
}

/* Font Awesome Icons - Modern styling */
.fa, .fas, .far, .fal, .fab {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Icon animations */
@keyframes iconPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.3; }
}

.empty-icon-animated {
  animation: iconPulse 2s ease-in-out infinite;
}

.not-connected-wrapper {
  min-height: calc(100vh - 160px);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 40px 24px;
  background: transparent;
}

.v-card.not-connected-card {
  width: min(600px, 100%);
  border-radius: 20px !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  background: #edf1f5 !important;
  box-shadow:
    0 20px 48px rgba(15, 23, 42, 0.12),
    0 10px 22px rgba(15, 23, 42, 0.08) !important;
  overflow: hidden;
  position: relative;
  transform: translateY(-48px);
}

.v-card.not-connected-card:hover {
  transform: translateY(-48px) !important;
}

.not-connected-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 260px;
  padding: 48px 56px !important;
  background: #edf1f5;
  text-align: center;
}

.not-connected-title {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.12;
  color: #0f172a;
  margin: 0;
}

.not-connected-description {
  font-size: 16px;
  line-height: 1.5;
  color: #334155;
  margin: 0;
  max-width: 480px;
}

.not-connected-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  align-items: center;
}

.not-connected-subtitle {
  font-size: 15px;
  line-height: 1.5;
  color: #0f172a;
  margin: 0;
  max-width: 440px;
}

/* Premium Button Style - Global (Modern, Clean) - Enhanced 3D Effect */
.premium-button {
  border: none !important;
  display: flex !important;
  padding: 12px 28px !important;
  background: linear-gradient(135deg, #488aec 0%, #3b7bd8 50%, #2d6bc7 100%) !important;
  color: #ffffff !important;
  font-size: 14px !important;
  line-height: 20px !important;
  font-weight: 600 !important;
  text-align: center !important;
  cursor: pointer !important;
  text-transform: none !important;
  vertical-align: middle !important;
  align-items: center !important;
  border-radius: 10px !important;
  user-select: none !important;
  gap: 8px !important;
  box-shadow:
    0 6px 20px rgba(72, 138, 236, 0.4),
    0 4px 12px rgba(72, 138, 236, 0.35),
    0 2px 6px rgba(72, 138, 236, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  min-height: 44px !important;
  height: auto !important;
  position: relative !important;
  overflow: visible !important;
  letter-spacing: -0.01em !important;
}

.premium-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* Button content styling - Force white text */
.premium-button :is(.v-btn__content) {
  color: #ffffff !important;
  font-weight: 600 !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  position: relative !important;
  z-index: 2 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

/* Show icons in premium buttons */
.premium-button :is(.v-btn__append),
.premium-button :is(.v-btn__prepend) {
  display: flex !important;
  align-items: center !important;
}

.premium-button :is(.v-btn__append .v-icon),
.premium-button :is(.v-btn__prepend .v-icon) {
  display: block !important;
  color: #ffffff !important;
  font-size: 18px !important;
  position: relative !important;
  z-index: 2 !important;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1)) !important;
}

/* Premium button for error/destructive actions */
.premium-button[class*="error"],
.premium-button.color-error {
  background-color: #ef4444 !important;
  box-shadow:
    0 2px 4px rgba(239, 68, 68, 0.2),
    0 1px 2px rgba(239, 68, 68, 0.15) !important;
}

.premium-button[class*="error"]:hover,
.premium-button.color-error:hover {
  background-color: #dc2626 !important;
  box-shadow:
    0 4px 8px rgba(239, 68, 68, 0.3),
    0 2px 4px rgba(239, 68, 68, 0.2) !important;
  transform: translateY(-1px) !important;
}

.premium-button[class*="error"]:active,
.premium-button.color-error:active {
  background-color: #b91c1c !important;
  box-shadow:
    0 1px 2px rgba(239, 68, 68, 0.2) !important;
  transform: translateY(0) !important;
}

/* Hover state - Enhanced 3D */
.premium-button:hover {
  background: linear-gradient(135deg, #3b7bd8 0%, #2d6bc7 50%, #2563eb 100%) !important;
  box-shadow:
    0 10px 28px rgba(72, 138, 236, 0.5),
    0 6px 20px rgba(72, 138, 236, 0.4),
    0 4px 12px rgba(72, 138, 236, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: translateY(-3px) scale(1.02) !important;
}

.premium-button:hover::before {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%);
}

/* Active state - Enhanced 3D */
.premium-button:active,
.premium-button:focus {
  background: linear-gradient(135deg, #2d6bc7 0%, #2563eb 50%, #1e40af 100%) !important;
  box-shadow:
    0 2px 8px rgba(72, 138, 236, 0.4),
    inset 0 3px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 3px rgba(0, 0, 0, 0.2) !important;
  transform: translateY(0) scale(0.98) !important;
}

.premium-button:active::before {
  opacity: 0.4;
}

/* Disabled state */
.premium-button:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  background-color: #9ca3af !important;
}

/* Simple Action Buttons - Delicate and clean */
.simple-action-btn {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  text-transform: none !important;
  padding: 6px 12px !important;
  min-width: auto !important;
  height: auto !important;
  border-radius: 6px !important;
  background: transparent !important;
  color: #64748b !important;
  box-shadow: none !important;
  border: none !important;
  transition: all 0.2s ease !important;
}

.simple-action-btn :is(.v-btn__content) {
  color: #64748b !important;
  font-weight: 500 !important;
  gap: 6px !important;
}

.simple-action-btn :is(.v-icon) {
  color: #64748b !important;
  font-size: 18px !important;
}

.simple-action-btn:hover {
  background: #f1f5f9 !important;
  color: #0f172a !important;
  box-shadow: none !important;
  transform: none !important;
}

.simple-action-btn:hover :is(.v-btn__content),
.simple-action-btn:hover :is(.v-icon) {
  color: #0f172a !important;
}

.simple-action-btn:active {
  background: #e2e8f0 !important;
  color: #0f172a !important;
  transform: none !important;
}

/* Floating Action Bar - Top Right - Simple and clean */
.floating-action-bar {
  position: fixed !important;
  top: 88px !important;
  right: 40px !important;
  z-index: 1000 !important;
  display: flex !important;
  gap: 8px !important;
  align-items: center !important;
  background: transparent !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

.floating-action-bar:hover {
  box-shadow: none !important;
  transform: none !important;
}

/* First box margin-top for better spacing */
.fullscreen-content > *:first-child {
  margin-top: 0 !important;
}

/* Card text padding - Balanced spacing */
.v-card-text {
  padding: 0 32px 24px 32px !important;
}

@media (max-width: 1280px) {
  .fullscreen-content {
    padding: 40px 48px 40px 48px;
    max-width: 100%;
  }
  
  .v-card-title {
    padding: 20px 28px 12px 28px !important;
  }
  
  .v-card-text {
    padding: 0 28px 20px 28px !important;
  }
  
  .floating-action-bar {
    right: 32px !important;
    top: 88px !important;
  }
}

@media (max-width: 960px) {
  .fullscreen-content {
    padding: 32px 32px 32px 32px;
  }
  
  .v-card-title {
    padding: 20px 24px 12px 24px !important;
    font-size: 16px !important;
  }
  
  .v-card-text {
    padding: 0 24px 20px 24px !important;
  }
  
  .floating-action-bar {
    right: 24px !important;
    top: 88px !important;
    gap: 8px !important;
  }
}

@media (max-width: 600px) {
  .fullscreen-content {
    padding: 16px 12px 16px 12px;
    padding-top: 76px !important;
    overflow-x: hidden;
  }
  
  .v-card-title {
    padding: 16px 20px 12px 20px !important;
    font-size: 16px !important;
  }
  
  .v-card-text {
    padding: 0 20px 16px 20px !important;
  }
  
  .floating-action-bar {
    right: 16px !important;
    top: 72px !important; /* Adjusted for smaller mobile header */
    gap: 6px !important;
  }
}

@media (max-width: 768px) {
  .fullscreen-main,
  .fullscreen-content {
    width: 100vw !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
  }

  .fullscreen-content {
    padding: 24px 18px 40px !important;
    padding-top: 76px !important;
    overflow-x: hidden !important;
  }
}

/* Professional responsive enhancements */
@media (max-width: 960px) {
  .page-title {
    font-size: 28px !important;
  }
  
  .page-subtitle {
    font-size: 15px !important;
  }
}

@media (max-width: 600px) {
  .page-title {
    font-size: 24px !important;
  }
  
  .page-subtitle {
    font-size: 14px !important;
  }
  
  .empty-state-premium {
    padding: 48px 24px;
  }
  
  .empty-state-premium-icon {
    width: 64px;
    height: 64px;
    font-size: 32px;
  }
  
  .empty-state-premium-title {
    font-size: 18px;
  }
  
  .empty-state-premium-subtitle {
    font-size: 14px;
  }
}

/* Navbar - Floating Header (styles defined in AppHeader.vue scoped styles) */
.app-navbar {
  /* Styles are in AppHeader.vue scoped section */
}

.app-navbar .v-app-bar-title {
  padding: 0 !important;
  margin: 0 !important;
  min-width: auto !important;
  flex: 0 0 auto !important;
}

@media (max-width: 1280px) {
  .app-navbar {
    padding: 0 64px !important;
  }
}

@media (max-width: 960px) {
  .app-navbar {
    padding: 0 48px !important;
  }
}

@media (max-width: 600px) {
  .app-navbar {
    padding: 0 32px !important;
  }
}

.app-navbar--scrolled {
  box-shadow: 
    0 3px 10px rgba(0, 0, 0, 0.1),
    0 2px 6px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -2px 0 rgba(0, 0, 0, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
}

/* Navbar logo - Logo y texto lado a lado, profesional */
.hlquery-nav-logo {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 !important;
}

.hlquery-logo-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  height: 100%;
  transition: opacity 0.2s ease;
  padding: 4px 8px;
  border-radius: 8px;
  margin: -4px -8px;
}

.hlquery-logo-container:hover {
  background-color: transparent !important;
  opacity: 1 !important;
}

.hlquery-logo-container:active {
  background-color: transparent !important;
  opacity: 1 !important;
}

.hlquery-logo-container .logo-image {
  height: 20px;
  width: auto;
  display: block;
  object-fit: contain;
  pointer-events: none;
}

.hlquery-nav-title {
  color: rgb(66, 84, 102) !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 18px !important;
  line-height: 26px !important;
  letter-spacing: -0.02em;
  margin: 0;
  padding: 0;
  white-space: nowrap;
  pointer-events: none;
}

/* Navbar links - Clean, modern, with more space */
.hlquery-nav-link {
  color: rgb(66, 84, 102) !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  text-transform: none !important;
  padding: 10px 20px !important;
  border-radius: 8px !important;
  transition: all 0.15s ease !important;
  letter-spacing: -0.01em !important;
  min-width: auto !important;
  margin: 0 4px !important;
}

.hlquery-nav-link :is(.v-icon) {
  color: #4b5563 !important;
  font-size: 15px !important;
}

.hlquery-nav-link:hover {
  background-color: #f8fafc !important;
  color: #0f172a !important;
}

.hlquery-nav-link:active {
  background-color: #f1f5f9 !important;
}

.hlquery-nav-icon {
  color: #64748b !important;
  border-radius: 8px !important;
  transition: all 0.15s ease !important;
  margin: 0 4px !important;
}

.hlquery-nav-icon:hover {
  background-color: #f8fafc !important;
  color: #0f172a !important;
}

.hlquery-nav-icon:active {
  background-color: #f1f5f9 !important;
}

/* Connection badge - Pill style */
.connection-badge {
  border-radius: 999px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  color: #ffffff !important;
  height: 26px !important;
  padding: 0 12px !important;
  text-transform: none !important;
  box-shadow: none !important;
}

.connection-badge :is(.v-chip__content),
.connection-badge :is(.v-chip__prepend) {
  color: #ffffff !important;
}

.connection-badge :is(.v-icon) {
  color: #ffffff !important;
}

/* Global text colors */
.v-application {
  color: rgb(66, 84, 102) !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
}

/* Cards - Harmonious rounded corners, consistent shadows - Enhanced */
.v-card {
  border-radius: 8px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06) !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
  margin-bottom: 16px !important;
  overflow: hidden !important;
}

.v-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06) !important;
  transform: translateY(-1px) !important;
  border-color: #cbd5e1 !important;
}

.v-card-title {
  font-weight: 600 !important;
  font-size: 18px !important;
  color: #1e293b !important;
  padding: 24px 32px 16px 32px !important;
  line-height: 1.5 !important;
  letter-spacing: -0.01em !important;
}

/* Buttons - Modern, Clean Style */
.v-btn {
  border: none !important;
  display: flex !important;
  padding: 10px 20px !important;
  background: #1976d2 !important;
  color: #ffffff !important;
  font-size: 14px !important;
  line-height: 20px !important;
  font-weight: 500 !important;
  text-align: center !important;
  cursor: pointer !important;
  text-transform: none !important;
  vertical-align: middle !important;
  align-items: center !important;
  border-radius: 6px !important;
  user-select: none !important;
  gap: 8px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06) !important;
  transition: all 0.2s ease !important;
  margin: 0 !important;
  text-decoration: none !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  min-height: 40px !important;
  position: relative !important;
}

.v-btn::before {
  display: none !important;
}

.v-btn:hover {
  background: #1565c0 !important;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06) !important;
  transform: translateY(-1px) !important;
}

.v-btn:focus,
.v-btn:active {
  background: #1565c0 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  transform: translateY(0) !important;
}

/* Force white text on all button content (except text variant buttons) */
.v-btn:not(.v-btn--variant-text) .v-btn__content,
.v-btn:not(.v-btn--variant-text) .v-btn__content *,
.v-btn:not(.v-btn--variant-text) span,
.v-btn--variant-flat .v-btn__content,
.v-btn--variant-flat .v-btn__content *,
.v-btn--variant-flat span {
  color: #ffffff !important;
  position: relative !important;
  z-index: 1 !important;
}

.v-btn :is(.v-btn__prepend),
.v-btn :is(.v-btn__append) {
  display: flex !important;
  align-items: center !important;
  position: relative !important;
  z-index: 1 !important;
}

.v-btn:not(.v-btn--variant-text) :is(.v-btn__prepend .v-icon),
.v-btn:not(.v-btn--variant-text) :is(.v-btn__append .v-icon) {
  display: block !important;
  color: #ffffff !important;
  font-size: 18px !important;
}

/* Loading state for buttons */
.v-btn--loading {
  pointer-events: none !important;
  opacity: 0.8 !important;
}

.v-btn--loading .v-btn__prepend,
.v-btn--loading .v-btn__append {
  opacity: 0.7 !important;
}

/* Flat buttons - Modern style with 3D Effect */
.v-btn--variant-flat:not(.action-btn-dark-blue) {
  border: none !important;
  display: flex !important;
  padding: 10px 24px !important;
  background: linear-gradient(135deg, #488aec 0%, #3b7bd8 50%, #2d6bc7 100%) !important;
  color: #ffffff !important;
  font-size: 14px !important;
  line-height: 20px !important;
  font-weight: 600 !important;
  text-align: center !important;
  cursor: pointer !important;
  text-transform: none !important;
  vertical-align: middle !important;
  align-items: center !important;
  border-radius: 10px !important;
  user-select: none !important;
  gap: 8px !important;
  box-shadow:
    0 6px 16px rgba(72, 138, 236, 0.35),
    0 4px 12px rgba(72, 138, 236, 0.3),
    0 2px 6px rgba(72, 138, 236, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  min-width: auto !important;
  min-height: 44px !important;
  position: relative !important;
}

.v-btn--variant-flat:not(.action-btn-dark-blue)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.v-btn--variant-flat:not(.action-btn-dark-blue):hover {
  background: linear-gradient(135deg, #3b7bd8 0%, #2d6bc7 50%, #2563eb 100%) !important;
  box-shadow:
    0 8px 24px rgba(72, 138, 236, 0.45),
    0 6px 16px rgba(72, 138, 236, 0.35),
    0 4px 8px rgba(72, 138, 236, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-3px) scale(1.02) !important;
}

.v-btn--variant-flat:not(.action-btn-dark-blue):hover::before {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 50%);
}

.v-btn--variant-flat:not(.action-btn-dark-blue):focus,
.v-btn--variant-flat:not(.action-btn-dark-blue):active {
  background: linear-gradient(135deg, #2d6bc7 0%, #2563eb 50%, #1e40af 100%) !important;
  box-shadow:
    0 2px 8px rgba(72, 138, 236, 0.4),
    inset 0 3px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(0) scale(0.98) !important;
}

.v-btn--variant-flat:not(.action-btn-dark-blue):active::before {
  opacity: 0.5;
}

/* Force white text on flat buttons */
.v-btn--variant-flat:not(.action-btn-dark-blue) :is(.v-btn__content) {
  color: #ffffff !important;
  position: relative !important;
  z-index: 1 !important;
}

.v-btn--variant-flat:not(.action-btn-dark-blue) :is(.v-btn__prepend .v-icon),
.v-btn--variant-flat:not(.action-btn-dark-blue) :is(.v-btn__append .v-icon) {
  color: #ffffff !important;
}

/* Primary buttons - Modern style with 3D Effect */
.v-btn--variant-flat.v-btn--density-default[class*="primary"] {
  background: linear-gradient(135deg, #488aec 0%, #3b7bd8 50%, #2d6bc7 100%) !important;
  color: #ffffff !important;
  box-shadow:
    0 6px 16px rgba(72, 138, 236, 0.35),
    0 4px 12px rgba(72, 138, 236, 0.3),
    0 2px 6px rgba(72, 138, 236, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
  border: none !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
}

.v-btn--variant-flat.v-btn--density-default[class*="primary"]:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b7bd8 0%, #2d6bc7 50%, #2563eb 100%) !important;
  box-shadow:
    0 8px 24px rgba(72, 138, 236, 0.45),
    0 6px 16px rgba(72, 138, 236, 0.35),
    0 4px 8px rgba(72, 138, 236, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-3px) scale(1.02) !important;
}

.v-btn--variant-flat.v-btn--density-default[class*="primary"]:active:not(:disabled),
.v-btn--variant-flat.v-btn--density-default[class*="primary"]:focus {
  background: linear-gradient(135deg, #2d6bc7 0%, #2563eb 50%, #1e40af 100%) !important;
  box-shadow:
    0 2px 8px rgba(72, 138, 236, 0.4),
    inset 0 3px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(0) scale(0.98) !important;
}

.v-btn--variant-flat.v-btn--density-default[class*="primary"]:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  background-color: #9ca3af !important;
}

/* Text buttons - Modern style */
.v-btn--variant-text {
  border: none !important;
  display: flex !important;
  padding: 10px 16px !important;
  background-color: transparent !important;
  color: #488aec !important;
  font-size: 14px !important;
  line-height: 20px !important;
  font-weight: 600 !important;
  text-align: center !important;
  cursor: pointer !important;
  text-transform: none !important;
  vertical-align: middle !important;
  align-items: center !important;
  border-radius: 8px !important;
  user-select: none !important;
  gap: 8px !important;
  box-shadow: none !important;
  transition: all 0.2s ease !important;
  min-width: auto !important;
  position: relative !important;
  min-height: 40px !important;
}

/* Force blue text on text variant button content */
.v-btn--variant-text :is(.v-btn__content) {
  color: #488aec !important;
  position: relative !important;
  z-index: 1 !important;
}

.v-btn--variant-text :is(.v-btn__prepend .v-icon),
.v-btn--variant-text :is(.v-btn__append .v-icon) {
  color: #488aec !important;
  font-size: 18px !important;
}

.v-btn--variant-text:hover:not(:disabled) {
  background-color: rgba(72, 138, 236, 0.1) !important;
  color: #3b7bd8 !important;
}

.v-btn--variant-text:hover:not(:disabled) :is(.v-btn__content) {
  color: #3b7bd8 !important;
}

.v-btn--variant-text:hover:not(:disabled) :is(.v-btn__prepend .v-icon),
.v-btn--variant-text:hover:not(:disabled) :is(.v-btn__append .v-icon) {
  color: #3b7bd8 !important;
}

.v-btn--variant-text:active:not(:disabled),
.v-btn--variant-text:focus {
  background-color: rgba(72, 138, 236, 0.15) !important;
  color: #2d6bc7 !important;
}

.v-btn--variant-text:active:not(:disabled) :is(.v-btn__content),
.v-btn--variant-text:focus :is(.v-btn__content) {
  color: #2d6bc7 !important;
}

.v-btn--variant-text:active:not(:disabled) :is(.v-btn__prepend .v-icon),
.v-btn--variant-text:active:not(:disabled) :is(.v-btn__append .v-icon),
.v-btn--variant-text:focus :is(.v-btn__prepend .v-icon),
.v-btn--variant-text:focus :is(.v-btn__append .v-icon) {
  color: #2d6bc7 !important;
}

.v-btn--variant-text:disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
}

/* Icon buttons - Modern style */
.v-btn--icon {
  border: none !important;
  display: flex !important;
  padding: 10px !important;
  background-color: transparent !important;
  color: #64748b !important;
  font-size: 20px !important;
  text-align: center !important;
  cursor: pointer !important;
  vertical-align: middle !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 8px !important;
  user-select: none !important;
  box-shadow: none !important;
  transition: all 0.2s ease !important;
  width: auto !important;
  height: auto !important;
  min-width: 40px !important;
  min-height: 40px !important;
  position: relative !important;
}

.v-btn--icon:hover:not(:disabled) {
  background-color: rgba(100, 116, 139, 0.1) !important;
  color: #0f172a !important;
}

.v-btn--icon:active:not(:disabled),
.v-btn--icon:focus {
  background-color: rgba(100, 116, 139, 0.15) !important;
  color: #0f172a !important;
}

.v-btn--icon:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

/* Text inputs - Harmonious and usable - Enhanced */
.v-field {
  border-radius: 12px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.v-field--variant-outlined {
  border-color: #cbd5e1 !important;
  border-width: 1.5px !important;
  background-color: #ffffff !important;
}

.v-field--variant-outlined:hover {
  border-color: #94a3b8 !important;
  box-shadow: 0 0 0 4px rgba(72, 138, 236, 0.06) !important;
  background-color: #fafbfc !important;
}

.v-field--variant-outlined.v-field--focused {
  border-color: #488aec !important;
  box-shadow: 0 0 0 4px rgba(72, 138, 236, 0.12) !important;
  background-color: #ffffff !important;
}

/* Icons */
.v-icon {
  font-family: "Material Design Icons" !important;
  color: inherit !important;
}

/* Labels */
.v-text-field label,
.v-select label,
.v-textarea label {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  color: rgb(66, 84, 102) !important;
  font-size: 15px !important;
  line-height: 26px !important;
}

/* Alerts - Harmonious and clear - Enhanced */
.v-alert {
  border-radius: 12px !important;
  border: 1.5px solid currentColor;
  padding: 18px 24px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  margin-bottom: 16px !important;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04) !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
}

.v-alert:hover {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.06) !important;
  transform: translateY(-1px) !important;
}

/* Loading states - Better visibility */
.v-progress-circular,
.v-progress-linear {
  transition: opacity 0.3s ease !important;
}

.v-progress-circular--indeterminate {
  animation: rotate 2s linear infinite !important;
}

/* Page Headers - Consistent styling across all views */
.page-header {
  margin-bottom: 32px !important;
  padding: 0 !important;
}

.page-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 32px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 0 8px 0 !important;
  padding: 0 !important;
  line-height: 1.2 !important;
}

.page-subtitle {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  color: #64748b !important;
  font-weight: 400 !important;
  margin: 0 !important;
  padding: 0 !important;
  line-height: 1.5 !important;
}

/* Empty states - Harmonious and clear */
.empty-state {
  padding: 64px 32px !important;
  text-align: center !important;
}

.empty-state-icon {
  opacity: 0.4 !important;
  margin-bottom: 20px !important;
  font-size: 56px !important;
  color: #94a3b8 !important;
}

.empty-state-title {
  font-weight: 600 !important;
  font-size: 18px !important;
  color: #334155 !important;
  margin-bottom: 8px !important;
  line-height: 1.5 !important;
}

.empty-state-subtitle {
  color: #64748b !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
  max-width: 400px;
  margin: 0 auto;
}

/* Override primary color backgrounds in cards */
.v-card-title.bg-primary {
  background: linear-gradient(135deg, #488aec 0%, #3b7bd8 100%) !important;
  color: #ffffff !important;
}

.v-card-title.bg-primary * {
  color: #ffffff !important;
}

/* Tabs - Harmonious and usable - Enhanced */
.v-tabs {
  border-bottom: 2px solid #e2e8f0;
  gap: 4px !important;
  margin-bottom: 24px !important;
}

.v-tab {
  color: #64748b !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 24px !important;
  text-transform: none !important;
  letter-spacing: -0.01em !important;
  padding: 14px 24px !important;
  min-width: auto !important;
  border-radius: 10px 10px 0 0 !important;
  margin-right: 4px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.v-tab:hover {
  color: #1e293b !important;
  background: #f8fafc !important;
  transform: translateY(-1px);
}

.v-tab--selected {
  color: #488aec !important;
  font-weight: 600 !important;
  background: transparent !important;
}

.v-tabs-slider {
  height: 3px !important;
  border-radius: 3px 3px 0 0 !important;
  background: linear-gradient(90deg, #488aec 0%, #3b7bd8 100%) !important;
  box-shadow: 0 2px 4px rgba(72, 138, 236, 0.3) !important;
}

/* Chips - Harmonious rounded pills - Enhanced */
.v-chip {
  border-radius: 999px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  color: #475569 !important;
  padding: 8px 14px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}

.v-chip:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.06) !important;
  border-color: #cbd5e1 !important;
}

/* Code blocks - Harmonious dark theme */
.document-json,
pre,
code {
  background: #1e293b !important;
  color: #e2e8f0 !important;
  border-radius: 12px !important;
  border: 1px solid #334155 !important;
  padding: 16px !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  overflow-x: auto !important;
}

/* Cluster - Harmonious primary color */
a {
  color: #488aec !important;
  text-decoration: none;
  font-weight: 500 !important;
  transition: all 0.15s ease;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
}

a:hover {
  color: #3b7bd8 !important;
  background: rgba(72, 138, 236, 0.1);
  text-decoration: none;
}

a:active {
  color: #2d6bc7 !important;
}

/* Latency Chart Styles */
.latency-chart-container {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e2e8f0;
}

.latency-chart {
  display: block;
  width: 100%;
  height: auto;
}

.latency-area {
  opacity: 0.6;
}

.latency-line {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.latency-point {
  cursor: pointer;
  transition: r 0.2s ease;
}

.latency-point:hover {
  r: 5;
  filter: brightness(1.2);
}

.latency-label {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px;
  line-height: 26px;
  color: rgb(66, 84, 102);
}

/* Header Search Bar Styles - Pill-shaped with 3D effect */
.header-search-container {
  min-width: 350px;
  max-width: 450px;
  margin-left: 40px;
  margin-right: 0;
}

.header-search-input :is(.v-field) {
  background: #f2f2f2 !important;
  border-radius: 999px !important;
  border: none !important;
  box-shadow: 
    0 1px 1px rgba(0, 0, 0, 0.04),
    0 0 0 0.5px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
  transition: all 0.2s ease !important;
}

.header-search-input :is(.v-field:hover) {
  background: #f2f2f2 !important;
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.06),
    0 0 0 0.5px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
}

.header-search-input :is(.v-field--focused) {
  background: #f2f2f2 !important;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 0 0 0.5px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.7) !important;
}

.header-search-input :is(.v-field__input) {
  padding: 10px 20px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  min-height: 44px !important;
  background: transparent !important;
  color: rgb(66, 84, 102) !important;
}

.header-search-input :is(.v-field__input::placeholder) {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  line-height: 26px !important;
  color: rgb(66, 84, 102) !important;
  opacity: 0.8 !important;
}

.header-search-input :is(.v-field__prepend-inner) {
  padding-left: 20px !important;
  padding-top: 2px !important;
  align-items: center !important;
}

.header-search-input :is(.v-field__prepend-inner .v-icon) {
  color: rgb(66, 84, 102) !important;
  font-size: 20px !important;
  transform: translateY(1px) !important;
}

/* Remove dropdown icon and all append icons */
.header-search-input :is(.v-field__append-inner) {
  display: none !important;
}

.header-search-input :is(.v-autocomplete__menu-icon) {
  display: none !important;
}

.header-search-input :is(.v-field__append) {
  display: none !important;
}

.header-search-input :is(.v-input__append) {
  display: none !important;
}

/* Hide any chevron/dropdown indicators */
.header-search-input :is(.mdi-menu-down),
.header-search-input :is(.mdi-chevron-down) {
  display: none !important;
}

/* Search highlight styling */
.hlq-highlight {
  font-weight: 700;
  color: #111;
  background: transparent;
}

/* Page Transitions - Smooth and professional */
.page-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Smooth scroll behavior */
html {
  scroll-behavior: smooth;
}

/* Focus visible for accessibility */
*:focus-visible {
  outline: 2px solid #488aec;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Selection styling */
::selection {
  background: rgba(72, 138, 236, 0.2);
  color: #1e293b;
}

::-moz-selection {
  background: rgba(72, 138, 236, 0.2);
  color: #1e293b;
}

/* Auth error button styling */
.auth-error-btn {
  margin-right: 8px;
}
</style>
