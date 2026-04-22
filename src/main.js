import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './assets/main.css'
import './assets/components.css'
import './assets/design-system.css'
import './assets/animations.css'
import './assets/accessibility.css'
// FontAwesome is loaded via CDN in index.html
import hanalyzerConfig from '../hanalyzer.conf.js'

// Setup axios interceptor for authentication
import axios from 'axios'
import { authManager } from './composables/useAuth'
import { installUsageRecorder } from './utils/usageRecorder'

// Initialize window global early (before interceptor runs)
if (typeof window !== 'undefined') {
  window.HANALYZER_CONFIG = {
    ...(hanalyzerConfig.runtime || {}),
    ...(window.HANALYZER_CONFIG || {})
  }
  const runtimeDefaultBaseUrl = typeof window.HANALYZER_CONFIG.defaultBaseUrl === 'string'
    ? window.HANALYZER_CONFIG.defaultBaseUrl.trim()
    : ''
  window.__HLQUERY_BASE_URL__ = window.__HLQUERY_BASE_URL__ || runtimeDefaultBaseUrl || '/api'
  // Initialize auth required flag to false - will be set when we check server requirements
  window.__HLQUERY_AUTH_REQUIRED__ = false
}

// Preload all auth credentials from localStorage on startup
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    let loadedCount = 0
    // Load all stored auth credentials
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith('auth_')) {
        const serverUrl = key.replace('auth_', '')
        try {
          const stored = window.localStorage.getItem(key)
          if (stored) {
            const credentials = JSON.parse(stored)
            if (credentials && (credentials.token || credentials.apiKey)) {
              // Normalize URL (same logic as setAuthForServer)
              let normalizedUrl = serverUrl.trim()
              if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
                normalizedUrl = `http://${normalizedUrl}`
              }
              normalizedUrl = normalizedUrl.replace(/\/+$/, '')
              
              // Store with normalized URL format
              authManager.credentials[normalizedUrl] = credentials
              // Also store with variants for faster lookup
              const variants = [
                normalizedUrl.replace(/^https?:\/\//, ''), // Without protocol
                normalizedUrl + '/', // With trailing slash
                serverUrl, // Original format
              ]
              variants.forEach(url => {
                if (url && url !== normalizedUrl) {
                  authManager.credentials[url] = credentials
                }
              })
              
              loadedCount++
            }
          }
        } catch (e) {
          // Silently skip invalid credentials
        }
      }
    }
  } catch (e) {
    // Silently handle preload errors
  }
}

// Create axios request interceptor to add auth headers
axios.interceptors.request.use(
  (config) => {
    // Get the base URL from the request
    const requestUrl = config.url || ''
    let serverUrl = config.baseURL || ''
    
    // If using proxy (/api), get server URL from window global
    if (requestUrl.startsWith('/api')) {
      // Get from window global (set by App.vue/AppHeader when baseUrl changes)
      serverUrl = window.__HLQUERY_BASE_URL__ || '/api'
      // Ensure it's set as default if not already
      if (!window.__HLQUERY_BASE_URL__) {
        window.__HLQUERY_BASE_URL__ = '/api'
      }
    } else if (requestUrl.startsWith('http')) {
      // Full URL provided - extract host
      try {
        const url = new URL(requestUrl)
        serverUrl = `${url.protocol}//${url.host}`
      } catch (e) {
        // Invalid URL, skip
      }
    } else if (!serverUrl) {
      // Fallback to window global
      serverUrl = window.__HLQUERY_BASE_URL__ || '/api'
    }
    
    // Normalize serverUrl to match how we store credentials
    let normalizedServerUrl = serverUrl.trim()
    if (!normalizedServerUrl.startsWith('http://') && !normalizedServerUrl.startsWith('https://')) {
      normalizedServerUrl = `http://${normalizedServerUrl}`
    }
    normalizedServerUrl = normalizedServerUrl.replace(/\/+$/, '')
    
    // If auth credentials exist, always attach them. This avoids 401 loops
    // before auth-required probing completes.
    const authHeaders = authManager.getAuthHeaders(normalizedServerUrl)
    
    // Add auth headers to request if headers exist
    if (authHeaders && Object.keys(authHeaders).length > 0) {
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {}
      }
      Object.assign(config.headers, authHeaders)
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

installUsageRecorder(axios)

// Create axios response interceptor to handle 401/403 errors globally
axios.interceptors.response.use(
  (response) => {
    // If we get a successful response (200-299) after auth was required/failed, emit success event
    if (response.status >= 200 && response.status < 300) {
      // Check if there was a previous auth error
      if (window.__HLQUERY_AUTH_REQUIRED__ || window.__HLQUERY_AUTH_FAILED__) {
        // Clear flags and emit success event
        window.__HLQUERY_AUTH_REQUIRED__ = false
        window.__HLQUERY_AUTH_FAILED__ = false
        window.__HLQUERY_AUTH_FAILED_DISPATCHED__ = null
        window.dispatchEvent(new CustomEvent('hlquery-auth-success'))
      }
    }
    return response
  },
  (error) => {
    // Handle 401 Unauthorized and 403 Forbidden errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const requestUrl = error.config?.url || ''
      let serverUrl = error.config?.baseURL || ''
      
      // Get server URL the same way as request interceptor
      if (requestUrl.startsWith('/api')) {
        serverUrl = window.__HLQUERY_BASE_URL__ || '/api'
      } else if (requestUrl.startsWith('http')) {
        try {
          const url = new URL(requestUrl)
          serverUrl = `${url.protocol}//${url.host}`
        } catch (e) {
          // Invalid URL
        }
      }
      
      // Check if auth is configured for this server
      const auth = authManager.getAuthForServer(serverUrl) || authManager.loadFromStorage(serverUrl)
      const hasAuth = !!(auth && (auth.token || auth.apiKey))
      
      if (error.response.status === 401) {
        // If auth is required but not configured, emit event or set flag
        if (!hasAuth) {
          window.__HLQUERY_AUTH_REQUIRED__ = true
          window.__HLQUERY_AUTH_SERVER_URL__ = serverUrl
          window.__HLQUERY_AUTH_FAILED__ = false // Clear failed state
          
          window.dispatchEvent(new CustomEvent('hlquery-auth-required', {
            detail: { serverUrl }
          }))
        } else {
          // Auth is configured but still getting 401 - token might be invalid
          window.__HLQUERY_AUTH_FAILED__ = true
          window.__HLQUERY_AUTH_SERVER_URL__ = serverUrl
          window.__HLQUERY_AUTH_REQUIRED__ = false // Clear required state
          window.dispatchEvent(new CustomEvent('hlquery-auth-failed', {
            detail: { serverUrl }
          }))
        }
      } else if (error.response.status === 403) {
        // 403 Forbidden - token might be invalid or doesn't have permissions
        const authHeaders = error.config?.headers || {}
        const authHeader = authHeaders.Authorization || authHeaders['X-API-Key']
        const hasToken = !!(authHeader && authHeader.trim())
        
        window.__HLQUERY_AUTH_FAILED__ = true
        window.__HLQUERY_AUTH_SERVER_URL__ = serverUrl
        window.__HLQUERY_AUTH_REQUIRED__ = false // Clear required state
        
        let message = 'Token may be invalid or insufficient permissions'
        if (!hasToken) {
          message = 'No authentication token was sent. Please configure authentication in server settings.'
        } else {
          // Log token length for debugging (but not the actual token)
          const tokenLength = authHeader.replace(/^Bearer /, '').replace(/^.+ /, '').length
          if (tokenLength < 10) {
            message = `Token appears to be too short (${tokenLength} characters). Please verify you entered the correct token in server settings.`
          } else {
            message = 'The authentication token does not have permission to access this resource. Please check that your token has the necessary permissions or update it in server settings.'
          }
        }
        
        // Only dispatch event once per server URL to avoid spam
        if (!window.__HLQUERY_AUTH_FAILED_DISPATCHED__ || window.__HLQUERY_AUTH_FAILED_DISPATCHED__ !== serverUrl) {
          window.__HLQUERY_AUTH_FAILED_DISPATCHED__ = serverUrl
          window.dispatchEvent(new CustomEvent('hlquery-auth-failed', {
            detail: { serverUrl, status: 403, message }
          }))
        }
      }
    }
    
    return Promise.reject(error)
  }
)

const app = createApp(App)
app.use(router)
app.use(createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FB8C00'
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  }
}))

app.mount('#app')
