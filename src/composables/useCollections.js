import { ref } from 'vue'
import axios from 'axios'
import {
  getBaseUrlValue,
  shouldUseProxy,
  buildApiUrl,
  isDemoDeployment,
  withDemoReplicaProbe
} from '../utils/apiHelpers.js'
import { extractSafeErrorMessage } from '../utils/sanitize.js'

const normalizeCount = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback
}

const normalizeCollection = (collection) => {
  if (typeof collection === 'string') {
    return collection.trim()
      ? { name: collection, num_documents: 0, created_at: '' }
      : null
  }

  if (!collection || typeof collection !== 'object') return null

  const rawName = typeof collection.name === 'string'
    ? collection.name
    : (typeof collection.collection_name === 'string' ? collection.collection_name : '')

  if (!rawName.trim()) return null

  return {
    ...collection,
    name: rawName,
    num_documents: normalizeCount(
      collection.num_documents ?? collection.document_count ?? collection.documents_count
    ),
    created_at: typeof collection.created_at === 'string' ? collection.created_at : ''
  }
}

const normalizeCollectionList = (items) => {
  if (!Array.isArray(items)) return []
  return items.map(normalizeCollection).filter(Boolean)
}

const DEMO_COLLECTION_CACHE_KEY = 'hlquery.demo.collections.v1'

const getCollectionResponseItems = (response) => {
  const payload = response?.data
  return normalizeCollectionList(Array.isArray(payload) ? payload : payload?.collections)
}

const getCollectionResponseFingerprint = (response) => {
  return getCollectionResponseItems(response)
    .map(collection => collection.name)
    .sort((left, right) => left.localeCompare(right))
    .join('\u0000')
}

const readDemoCollectionSnapshot = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null

  try {
    const snapshot = JSON.parse(window.sessionStorage.getItem(DEMO_COLLECTION_CACHE_KEY) || 'null')
    if (!snapshot || !Array.isArray(snapshot.collections)) return null

    return {
      status: 200,
      data: snapshot
    }
  } catch (_) {
    return null
  }
}

const writeDemoCollectionSnapshot = (payload) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return

  try {
    window.sessionStorage.setItem(DEMO_COLLECTION_CACHE_KEY, JSON.stringify(payload))
  } catch (_) {
    // Storage can be disabled or full; sampling still provides recovery.
  }
}

const mergeDemoCollectionResponses = (responses) => {
  const successful = responses.filter(response => response?.status === 200)
  if (successful.length === 0) return responses[0]

  const ranked = successful
    .map(response => ({ response, collections: getCollectionResponseItems(response) }))
    .sort((left, right) => right.collections.length - left.collections.length)
  const authoritative = ranked[0]
  const byName = new Map()

  authoritative.collections.forEach(collection => byName.set(collection.name, collection))
  ranked.slice(1).forEach(({ collections }) => {
    collections.forEach((collection) => {
      const existing = byName.get(collection.name)
      if (!existing) return

      byName.set(collection.name, {
        ...collection,
        ...existing,
        num_documents: Math.max(existing.num_documents || 0, collection.num_documents || 0),
        created_at: existing.created_at || collection.created_at || ''
      })
    })
  })

  const collections = Array.from(byName.values())
    .sort((left, right) => left.name.localeCompare(right.name))
  const authoritativePayload = authoritative.response.data || {}
  const payload = {
    collections,
    total: Math.max(normalizeCount(authoritativePayload.total, collections.length), collections.length),
    found: Math.max(normalizeCount(authoritativePayload.found, collections.length), collections.length)
  }

  return {
    ...authoritative.response,
    status: 200,
    data: payload
  }
}

export function useCollections(baseUrl) {
  const collections = ref([])
  const total = ref(0)
  const found = ref(0)
  const loading = ref(false)
  const error = ref(null)
  let latestLoadRequestId = 0
  let activeLoadController = null

  const loadCollections = async (showLoading = true, searchQuery = null, sortBy = null, sortOrder = null, retryCount = 0) => {
    const requestId = ++latestLoadRequestId
    activeLoadController?.abort()
    activeLoadController = new AbortController()
    const { signal } = activeLoadController

    // Only show loading spinner if explicitly requested or if we have no data
    if (showLoading || collections.value.length === 0) {
      loading.value = true
    }
    error.value = null
    
    // Use proxy if:
    // 1. baseUrl is localhost:9200 (backend default) - proxy forwards to backend
    // 2. OR we're accessing via localhost:8080 (dev server) - always use proxy in dev
    // 3. OR baseUrl is not set/empty (fallback to proxy)
    // 4. OR if the URL path starts with /api (already using proxy path)
    const isDevServer = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      (window.location.port === '8080' || window.location.port === '4173' || window.location.port === '')
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    
    try {
      // Build query parameters
      const queryParams = {}
      
      // Add search query if provided (server-side search)
      if (searchQuery?.trim()) {
        const trimmedQuery = searchQuery.trim()
        const hasWildcard = /[\*\?]/.test(trimmedQuery)
        if (hasWildcard) {
          queryParams.pattern = trimmedQuery
        } else {
          queryParams.search = trimmedQuery
        }
      }
      
      // Add sorting parameters if provided
      if (sortBy) {
        queryParams.sort_by = sortBy
      }
      if (sortOrder) {
        queryParams.sort_order = sortOrder
      }
      
      // Use reasonable limit (backend max is 1000)
      queryParams.limit = 1000
      
      const url = buildApiUrl(baseUrlValue, useProxy, '/collections', queryParams)
      
      // Validate URL before making request (only for absolute URLs)
      if (!useProxy) {
        try {
          new URL(url)
        } catch (urlError) {
          throw new Error(`Invalid URL: ${url}. baseUrl: ${baseUrl.value}`)
        }
      }
      
      // Quick timeout for responsiveness
      const requestConfig = {
        signal,
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        validateStatus: (status) => status < 500 || status === 503
      }

      let response
      if (isDemoDeployment()) {
        const sampleBatchId = `${Date.now()}-${requestId}`
        const completedResponses = []
        const failedSamples = []
        const catalogFingerprints = new Set()

        for (let round = 0; round < 3 && catalogFingerprints.size < 2; round += 1) {
          const samples = await Promise.allSettled(
            Array.from({ length: 4 }, (_, sampleIndex) => {
              const probeId = `${sampleBatchId}-${round}-${sampleIndex}`
              return axios.get(withDemoReplicaProbe(url, probeId), requestConfig)
            })
          )

          samples.forEach((result) => {
            if (result.status === 'fulfilled') {
              completedResponses.push(result.value)
              if (result.value?.status === 200) {
                catalogFingerprints.add(getCollectionResponseFingerprint(result.value))
              }
            } else {
              failedSamples.push(result.reason)
            }
          })
        }

        const isUnfilteredCatalog = !searchQuery?.trim()
        if (isUnfilteredCatalog) {
          const cachedSnapshot = readDemoCollectionSnapshot()
          if (cachedSnapshot) completedResponses.push(cachedSnapshot)
        }

        if (completedResponses.length === 0) {
          throw failedSamples[0] || new Error('Failed to load collections')
        }

        response = mergeDemoCollectionResponses(completedResponses)
        if (isUnfilteredCatalog && response?.status === 200) {
          writeDemoCollectionSnapshot(response.data)
        }
      } else {
        response = await axios.get(url, requestConfig)
      }
      
      // Retry on 503 (Service Unavailable) - server may still be starting up
      if (response.status === 503 && retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
        if (requestId !== latestLoadRequestId) return
        return loadCollections(showLoading, searchQuery, sortBy, sortOrder, retryCount + 1)
      }

      if (requestId !== latestLoadRequestId) return
      
      if (response.status === 200) {
        if (response.data && Array.isArray(response.data.collections)) {
          collections.value = normalizeCollectionList(response.data.collections)
          total.value = Math.max(
            normalizeCount(response.data.total, collections.value.length),
            collections.value.length
          )
          found.value = Math.max(
            normalizeCount(response.data.found, collections.value.length),
            collections.value.length
          )
        } else if (Array.isArray(response.data)) {
          collections.value = normalizeCollectionList(response.data)
          total.value = collections.value.length
          found.value = collections.value.length
        } else {
          collections.value = []
          total.value = 0
          found.value = 0
        }
      } else if (response.status === 400) {
        // Handle 400 Bad Request specifically
        const errorData = response.data || {}
        const errorMsg = errorData.error || errorData.message || `Bad Request (400): ${response.statusText || 'Invalid request'}`
        throw new Error(errorMsg)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`)
      }
    } catch (err) {
      if (requestId !== latestLoadRequestId || axios.isCancel(err)) {
        return
      }

      // Don't show error if we already have data (background refresh failed)
      if (collections.value.length === 0) {
        const errorMsg = extractSafeErrorMessage(err, 'Failed to load collections')
        error.value = errorMsg
      }
      // Keep existing collections if refresh fails
      if (collections.value.length === 0) {
        collections.value = []
        total.value = 0
        found.value = 0
      }
    } finally {
      if (requestId === latestLoadRequestId) {
        loading.value = false
        activeLoadController = null
      }
    }
  }

  // Non-blocking load with retry
  const loadCollectionsAsync = async (searchQuery = null, sortBy = null, sortOrder = null) => {
    try {
      await loadCollections(false, searchQuery, sortBy, sortOrder) // Don't show loading
    } catch (err) {
      // Retry in background after delay
      setTimeout(() => {
        loadCollections(false, searchQuery, sortBy, sortOrder).catch(() => {
          // Silent fail - will retry on next manual refresh
        })
      }, 2000)
    }
  }

  const deleteCollection = async (collectionName) => {
    if (!collectionName?.trim()) {
      throw new Error('Collection name is required')
    }
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      throw new Error('Invalid server URL configuration')
    }
    
    try {
      const useProxy = shouldUseProxy(baseUrlValue)
      const encodedCollection = encodeURIComponent(collectionName.trim())
      const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}`)
      
      const response = await axios.delete(url, {
        timeout: 10000, // Longer timeout for deletion
        headers: {
          'Accept': 'application/json'
        }
      })
      
      // Reload collections after deleting
      await loadCollections(false)
      
      return response.data
    } catch (err) {
      const errorMsg = extractSafeErrorMessage(err, 'Failed to delete collection')
      throw new Error(errorMsg)
    }
  }

  return {
    collections,
    total,
    found,
    loading,
    error,
    loadCollections,
    loadCollectionsAsync,
    deleteCollection
  }
}
