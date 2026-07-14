import { ref, reactive } from 'vue'

// Store auth credentials per server URL
const authCredentials = reactive({})
const runtimeConfigRevision = ref(0)

const normalizeServerUrl = (serverUrl) => {
  if (!serverUrl) return ''

  let normalizedUrl = serverUrl.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `http://${normalizedUrl}`
  }

  return normalizedUrl.replace(/\/+$/, '')
}

const getRuntimeConfig = () => {
  if (typeof window === 'undefined') return {}
  return window.HANALYZER_CONFIG || {}
}

const normalizeAuthMethod = (method, credentials = {}) => {
  if (method === 'api-key') return 'api-key'
  if (method === 'basic') return 'basic'
  if (credentials.username || credentials.password) return 'basic'
  return 'bearer'
}

const hasCredentialMaterial = (credentials) => {
  if (!credentials) return false
  if (credentials.token || credentials.apiKey) return true
  return !!(credentials.username && credentials.password)
}

const encodeBasicCredentials = (username, password) => {
  const raw = `${username}:${password}`
  if (typeof btoa !== 'function') {
    return ''
  }

  const bytes = new TextEncoder().encode(raw)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const getRuntimeConfigAuth = (serverUrl) => {
  const runtimeConfig = getRuntimeConfig()
  const normalizedUrl = normalizeServerUrl(serverUrl)

  const byServer = runtimeConfig.defaultAuthByServer || {}
  if (normalizedUrl && byServer && typeof byServer === 'object') {
    const candidates = [
      normalizedUrl,
      normalizedUrl.replace(/^https?:\/\//, ''),
      serverUrl,
    ].filter(Boolean)

    for (const candidate of [...new Set(candidates)]) {
      const configured = byServer[candidate]
      if (configured && typeof configured === 'object') {
        const token = (configured.token || configured.apiKey || '').trim()
        const username = typeof configured.username === 'string' ? configured.username.trim() : ''
        const password = typeof configured.password === 'string' ? configured.password : ''
        if (token) {
          return {
            method: normalizeAuthMethod(configured.method, configured),
            token,
          }
        }
        if (username && password) {
          return {
            method: 'basic',
            username,
            password,
          }
        }
      }
    }
  }

  const defaultToken = typeof runtimeConfig.defaultAuthToken === 'string'
    ? runtimeConfig.defaultAuthToken.trim()
    : ''

  if (defaultToken) {
    return {
      method: normalizeAuthMethod(runtimeConfig.defaultAuthMethod, { token: defaultToken }),
      token: defaultToken,
    }
  }

  const defaultUsername = typeof runtimeConfig.defaultAuthUsername === 'string'
    ? runtimeConfig.defaultAuthUsername.trim()
    : ''
  const defaultPassword = typeof runtimeConfig.defaultAuthPassword === 'string'
    ? runtimeConfig.defaultAuthPassword
    : ''

  if (!defaultUsername || !defaultPassword) {
    return null
  }

  return {
    method: 'basic',
    username: defaultUsername,
    password: defaultPassword,
  }
}

export const notifyRuntimeAuthConfigChanged = () => {
  runtimeConfigRevision.value += 1
}

if (typeof window !== 'undefined' && !window.__hanalyzer_runtime_auth_listener__) {
  window.__hanalyzer_runtime_auth_listener__ = () => {
    notifyRuntimeAuthConfigChanged()
  }
  window.addEventListener('hanalyzer-config-loaded', window.__hanalyzer_runtime_auth_listener__)
}

// Global auth manager (can be used outside Vue components)
export const authManager = {
  credentials: authCredentials,

  hasCredentials(credentials) {
    return hasCredentialMaterial(credentials)
  },

  resolveCredentials(serverUrl) {
    if (!serverUrl) return null

    const inMemory = this.getAuthForServer(serverUrl)
    if (hasCredentialMaterial(inMemory)) {
      return inMemory
    }

    const stored = this.loadFromStorage(serverUrl)
    if (hasCredentialMaterial(stored)) {
      return stored
    }

    return getRuntimeConfigAuth(serverUrl)
  },
  
  getAuthForServer(serverUrl) {
    if (!serverUrl) return null
    return this.credentials[serverUrl] || null
  },
  
  getAuthHeaders(serverUrl) {
    if (!serverUrl) {
      return {}
    }
    
    // Normalize URL first (same as when saving)
    let normalizedUrl = normalizeServerUrl(serverUrl)
    
    // Try multiple URL formats to find stored credentials
    const urlVariants = [
      normalizedUrl, // Normalized format (how we save it)
      normalizedUrl.replace(/^https?:\/\//, ''), // Without protocol
      normalizedUrl + '/', // With trailing slash
      serverUrl, // Original format
      serverUrl.replace(/^https?:\/\//, ''), // Original without protocol
    ]
    
    // Remove duplicates
    const uniqueUrls = [...new Set(urlVariants.filter(Boolean))]
    
    let credentials = null
    
    // First check memory (faster)
    for (const url of uniqueUrls) {
      credentials = this.getAuthForServer(url)
      if (hasCredentialMaterial(credentials)) {
        break
      }
    }
    
    // If not in memory, check localStorage
    if (!hasCredentialMaterial(credentials)) {
      for (const url of uniqueUrls) {
        credentials = this.loadFromStorage(url)
        if (hasCredentialMaterial(credentials)) {
          // Store in memory for faster lookup next time
          this.credentials[normalizedUrl] = credentials
          this.credentials[serverUrl] = credentials
          break
        }
      }
    }
    
    if (!hasCredentialMaterial(credentials)) {
      credentials = getRuntimeConfigAuth(normalizedUrl)
    }

    if (!hasCredentialMaterial(credentials)) return {}
    
    const method = normalizeAuthMethod(credentials.method, credentials)

    if (method === 'basic') {
      const username = typeof credentials.username === 'string' ? credentials.username.trim() : ''
      const password = typeof credentials.password === 'string' ? credentials.password : ''
      const encoded = username && password ? encodeBasicCredentials(username, password) : ''
      if (!encoded) return {}
      return {
        'Authorization': `Basic ${encoded}`
      }
    }
    
    const token = credentials.token || credentials.apiKey
    
    // Validate token is not empty
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return {}
    }
    
    if (method === 'api-key') {
      return {
        'X-API-Key': token
      }
    } else {
      return {
        'Authorization': `Bearer ${token}`
      }
    }
  },
  
  loadFromStorage(serverUrl) {
    if (!serverUrl) return null
    
    try {
      // Normalize URL first (same as when saving)
      let normalizedUrl = normalizeServerUrl(serverUrl)
      
      // Try multiple key formats (matching how we save)
      const keyVariants = [
        `auth_${normalizedUrl}`, // Normalized format (how we save it)
        `auth_${normalizedUrl.replace(/^https?:\/\//, '')}`, // Without protocol
        `auth_${normalizedUrl}/`, // With trailing slash
        `auth_${serverUrl}`, // Original format
        `auth_${serverUrl.replace(/^https?:\/\//, '')}`, // Original without protocol
      ]
      
      // Remove duplicates
      const uniqueKeys = [...new Set(keyVariants.filter(Boolean))]
      
      for (const key of uniqueKeys) {
        const stored = localStorage.getItem(key)
        if (stored) {
          try {
            const credentials = JSON.parse(stored)
            if (hasCredentialMaterial(credentials)) {
              // Store in memory with normalized URL for faster lookup
              this.credentials[normalizedUrl] = credentials
              this.credentials[serverUrl] = credentials
              return credentials
            }
          } catch (parseError) {
            // Silently skip invalid JSON
          }
        }
      }
    } catch (e) {
      // Silently handle errors
    }
    
    return null
  }
}

// Default auth method
const defaultAuthMethod = ref('bearer') // 'bearer', 'api-key', or 'basic'

export function useAuth() {
  /**
   * Get auth credentials for a server URL
   */
  const getAuthForServer = (serverUrl) => {
    if (!serverUrl) return null
    return authCredentials[serverUrl] || null
  }

  /**
   * Set auth credentials for a server URL
   */
  const setAuthForServer = (serverUrl, credentials) => {
    if (!serverUrl) return
    
    // Normalize server URL (ensure consistent format)
    let normalizedUrl = normalizeServerUrl(serverUrl)
    
    /* Store credentials (in production, you might want to encrypt these). */
    if (hasCredentialMaterial(credentials)) {
      const credsToStore = {
        method: normalizeAuthMethod(credentials.method || defaultAuthMethod.value, credentials),
        token: credentials.token || credentials.apiKey || '',
        username: credentials.username || '',
        password: credentials.password || ''
      }
      
      authCredentials[normalizedUrl] = credsToStore
      
      // Also store in localStorage for persistence with normalized URL
      try {
        const storageKey = `auth_${normalizedUrl}`
        const storageValue = JSON.stringify(credsToStore)
        localStorage.setItem(storageKey, storageValue)
        
        // Also store with variants for easier lookup
        const variants = [
          normalizedUrl.replace(/^https?:\/\//, ''), // Without protocol
          normalizedUrl + '/', // With trailing slash
        ]
        variants.forEach(variant => {
          if (variant && variant !== normalizedUrl) {
            const variantKey = `auth_${variant}`
            localStorage.setItem(variantKey, storageValue)
            authCredentials[variant] = credsToStore
          }
        })
      } catch (e) {
        // Silently handle storage errors
      }
    } else {
      // Clear credentials - try all variants
      const variantsToRemove = [
        normalizedUrl,
        normalizedUrl.replace(/^https?:\/\//, ''),
        normalizedUrl + '/',
      ]
      variantsToRemove.forEach(url => {
        delete authCredentials[url]
        try {
          localStorage.removeItem(`auth_${url}`)
        } catch (e) {
          // Ignore errors
        }
      })
    }
  }

  /**
   * Load auth credentials from localStorage
   */
  const loadAuthFromStorage = (serverUrl) => {
    if (!serverUrl) return null
    
    try {
      const stored = localStorage.getItem(`auth_${serverUrl}`)
      if (stored) {
        const credentials = JSON.parse(stored)
        authCredentials[serverUrl] = credentials
        return credentials
      }
    } catch (e) {
      console.warn('Failed to load auth credentials:', e)
    }
    
    return null
  }

  /**
   * Get auth headers for axios requests
   */
  const getAuthHeaders = (serverUrl) => {
    return authManager.getAuthHeaders(serverUrl)
  }

  /**
   * Clear all auth credentials
   */
  const clearAllAuth = () => {
    Object.keys(authCredentials).forEach(serverUrl => {
      delete authCredentials[serverUrl]
      try {
        localStorage.removeItem(`auth_${serverUrl}`)
      } catch (e) {
        // Ignore errors
      }
    })
  }

  return {
    getAuthForServer,
    hasCredentials: hasCredentialMaterial,
    runtimeConfigRevision,
    setAuthForServer,
    loadAuthFromStorage,
    getAuthHeaders,
    clearAllAuth,
    defaultAuthMethod
  }
}
