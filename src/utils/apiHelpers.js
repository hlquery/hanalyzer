/**
 * Standardized API helper functions for hanalyzer
 */

/**
 * Get base URL value with validation
 * @param {Ref|string} baseUrl - Base URL ref or string
 * @returns {string} - Validated base URL string
 */
export function getBaseUrlValue(baseUrl) {
  if (typeof baseUrl === 'string') {
    return baseUrl.trim() || '/api'
  }
  if (baseUrl?.value && typeof baseUrl.value === 'string') {
    return baseUrl.value.trim()
  }
  return '/api'
}

/**
 * Determine if proxy should be used
 * @param {string} baseUrlValue - Base URL string
 * @returns {boolean} - True if proxy should be used
 */
export function shouldUseProxy(baseUrlValue) {
  if (typeof window !== 'undefined' && window.HANALYZER_CONFIG) {
    const runtimeOverride = window.HANALYZER_CONFIG.useProxy
    if (typeof runtimeOverride === 'boolean') {
      return runtimeOverride
    }
  }

  if (!baseUrlValue || typeof baseUrlValue !== 'string') {
    return !!import.meta.env.DEV
  }

  if (baseUrlValue === '/api' || baseUrlValue.startsWith('/api?')) {
    return true
  }

  // `/api` proxying is guaranteed in the Vite dev server, but not in static or preview builds
  // unless the runtime config explicitly requests it.
  if (!import.meta.env.DEV) {
    return false
  }

  return baseUrlValue.includes('localhost:9200') || baseUrlValue.includes('127.0.0.1:9200')
}

/**
 * Build API URL with consistent encoding
 * @param {string} baseUrlValue - Base URL string
 * @param {boolean} useProxy - Whether to use proxy
 * @param {string} path - API path (will be encoded)
 * @param {Object} params - URL parameters to encode
 * @returns {string} - Complete API URL
 */
export function buildApiUrl(baseUrlValue, useProxy, path, params = {}) {
  const finalParams = { ...(params || {}) }

  if (typeof window !== 'undefined' && !Object.prototype.hasOwnProperty.call(finalParams, 'distributed')) {
    const override = (window.__HLQUERY_DISTRIBUTED_OVERRIDE__ || '').toString().trim().toLowerCase()
    if (override === 'on' || override === 'off') {
      finalParams.distributed = override
    }
  }

  // Encode path segments (but don't double-encode already encoded segments)
  const encodedPath = path.split('/').map(segment => {
    if (!segment) return segment
    // Only encode if not already encoded (contains %)
    return segment.includes('%') ? segment : encodeURIComponent(segment)
  }).join('/')
  
  if (useProxy) {
    // Build query string if params provided
    let queryString = ''
    if (Object.keys(finalParams).length > 0) {
      const queryParams = Object.entries(finalParams)
        .filter(([_, value]) => value != null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
      if (queryParams) {
        queryString = `?${queryParams}`
      }
    }
    return `/api${encodedPath}${queryString}`
  }
  
  // Build query string if params provided
  let queryString = ''
  if (Object.keys(finalParams).length > 0) {
    const queryParams = Object.entries(finalParams)
      .filter(([_, value]) => value != null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
    if (queryParams) {
      queryString = `?${queryParams}`
    }
  }
  
  // Ensure baseUrl doesn't have trailing slash
  const cleanBaseUrl = baseUrlValue.replace(/\/+$/, '')
  return `${cleanBaseUrl}${encodedPath}${queryString}`
}

/**
 * Standardized error message extraction
 * @param {Error} err - Error object
 * @param {string} defaultMessage - Default error message
 * @returns {string} - Safe error message
 */
export function getErrorMessage(err, defaultMessage = 'An error occurred') {
  if (!err) return defaultMessage

  const normalizedDemoModeMessage = getDemoModeErrorMessage(err)
  if (normalizedDemoModeMessage) {
    return normalizedDemoModeMessage
  }
  
  // Try response data first
  if (err.response?.data) {
    const data = err.response.data
    // Prefer message, then error, then code_text for protocol codes
    return data.message || data.error || data.code_text || defaultMessage
  }
  
  // Fall back to error message
  return err.message || defaultMessage
}

/**
 * Get protocol code from error response
 * @param {Error} err - Error object
 * @returns {number|null} - Protocol code or null
 */
export function getProtocolCode(err) {
  if (!err?.response?.data?.code) return null
  return err.response.data.code
}

/**
 * Get protocol code text from error response
 * @param {Error} err - Error object
 * @returns {string|null} - Protocol code text or null
 */
export function getProtocolCodeText(err) {
  if (!err?.response?.data?.code_text) return null
  return err.response.data.code_text
}

/**
 * Normalize demo mode API errors so UI surfaces one consistent message.
 * @param {Error} err - Error object
 * @returns {string|null} - Normalized demo mode message or null
 */
export function getDemoModeErrorMessage(err) {
  if (!err) return null

  const data = err.response?.data || {}
  const protocolCode = data.code
  const message = typeof data.message === 'string' ? data.message.trim() : ''
  const error = typeof data.error === 'string' ? data.error.trim() : ''
  const details = typeof data.details === 'string' ? data.details.trim() : ''
  const fallbackMessage = typeof err.message === 'string' ? err.message.trim() : ''

  const looksLikeDemoMode =
    protocolCode === 26004 ||
    [message, error, details, fallbackMessage].some(value => /demo mode is enabled/i.test(value))

  if (!looksLikeDemoMode) {
    return null
  }

  if (details) {
    return `Demo mode is enabled. ${details}`
  }

  if (message && !/^demo mode is enabled$/i.test(message)) {
    return `Demo mode is enabled. ${message}`
  }

  return 'Demo mode is enabled. Search and browsing are enabled. Write and admin actions are blocked in demo mode.'
}

/**
 * Detect whether SAM+ is available from a stats or status payload.
 * @param {Object} payload - API payload that may contain SAM+ metadata
 * @returns {boolean} - True when SAM+ is reported as available/enabled
 */
export function isSamAvailable(payload) {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const samInfo = payload.sam && typeof payload.sam === 'object' ? payload.sam : {}
  const enabledValue = samInfo.available ?? samInfo.enabled ?? payload.sam_available ?? payload.sam_enabled
  return enabledValue === true
}

/**
 * Extract a list payload from common API response shapes.
 * @param {unknown} payload - API response data
 * @param {string} key - Preferred list key, such as "synonyms" or "stopwords"
 * @returns {Array} - Extracted list or an empty array
 */
export function extractApiList(payload, key) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!payload || typeof payload !== 'object') {
    return []
  }

  const candidates = [
    payload[key],
    payload.data,
    payload.items,
    payload.results,
    payload.result,
    payload.data?.[key],
    payload.items?.[key],
    payload.result?.[key]
  ]

  const list = candidates.find(Array.isArray)
  return list || []
}

export function extractSynonyms(payload) {
  return extractApiList(payload, 'synonyms')
}

export function getStopwordText(stopword) {
  if (typeof stopword === 'string') {
    return stopword
  }

  if (stopword && typeof stopword === 'object') {
    return String(stopword.word ?? stopword.text ?? stopword.value ?? '')
  }

  return stopword == null ? '' : String(stopword)
}

export function normalizeStopwords(payload) {
  return extractApiList(payload, 'stopwords')
    .map(item => {
      if (typeof item === 'string') {
        return { word: item }
      }

      if (item && typeof item === 'object') {
        const word = getStopwordText(item).trim()
        return word ? { ...item, word } : null
      }

      const word = getStopwordText(item).trim()
      return word ? { word } : null
    })
    .filter(Boolean)
}

/**
 * Get best title for a document
 * @param {Object} doc - Document object
 * @returns {string} - Best title found
 */
export function getBestTitle(doc) {
  if (!doc) return 'Untitled Document'
  
  // User explicitly requested to use doc name as it is "always present"
  // Prioritize doc.name if doc.title is missing
  if (doc.title && String(doc.title).trim()) return String(doc.title).trim()
  if (doc.name && String(doc.name).trim()) return String(doc.name).trim()
  
  // Other fallbacks
  if (doc.headline) return String(doc.headline).trim()
  if (doc.subject) return String(doc.subject).trim()
  
  // If no common title fields found, try any short string field that isn't ID
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'id' || key.startsWith('_')) continue
    if (typeof value === 'string' && value.length > 0 && value.length < 150) {
      return value.trim()
    }
  }
  
  // Final fallback: Always show ID if present, otherwise default text
  return doc.id ? `Document ${doc.id}` : 'Untitled Document'
}

/**
 * Get best content preview for a document
 * @param {Object} doc - Document object
 * @returns {string|null} - Best content preview found
 */
export function getBestContent(doc) {
  if (!doc) return null
  
  // Prioritize common content fields
  if (doc.content && String(doc.content).trim()) return String(doc.content).trim()
  if (doc.description && String(doc.description).trim()) return String(doc.description).trim()
  if (doc.text && String(doc.text).trim()) return String(doc.text).trim()
  if (doc.body && String(doc.body).trim()) return String(doc.body).trim()
  if (doc.message && String(doc.message).trim()) return String(doc.message).trim()
  if (doc.data && String(doc.data).trim()) return String(doc.data).trim()
  if (doc.info && String(doc.info).trim()) return String(doc.info).trim()
  
  // Find longest string field that isn't already used as title
  const currentTitle = getBestTitle(doc)
  let longest = ''
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'id' || key.startsWith('_') || key === 'title' || key === 'name') continue
    if (typeof value === 'string' && value !== currentTitle && value.length > longest.length) {
      longest = value
    }
  }
  
  return longest || null
}

/**
 * Format server highlights (em tags) for display
 * @param {string} text - Highlighted text from server
 * @returns {string} - HTML formatted text
 */
export function formatServerHighlights(text) {
  if (!text) return ''
  
  // Sanitize to prevent XSS: remove script tags and event handlers
  let cleaned = String(text)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
  
  // Convert server <em> tags to highlighted strong for display
  cleaned = cleaned
    .replace(/<em>/gi, '<strong class="hlq-highlight">')
    .replace(/<\/em>/gi, '</strong>')
  
  return cleaned
}
