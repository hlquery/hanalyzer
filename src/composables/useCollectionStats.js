import { ref, onUnmounted } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

export function useCollectionStats(baseUrl) {
  const stats = ref({})
  const loading = ref(false)
  const error = ref(null)
  const activeTimeouts = ref([])
  const isMounted = ref(true)

  const loadCollectionStats = async (collectionName, showLoading = false) => {
    if (!collectionName?.trim()) return null
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      if (showLoading) {
        error.value = 'Invalid server URL configuration'
        loading.value = false
      }
      return null
    }
    
    // Standardized loading: set before try if needed
    if (showLoading) {
      loading.value = true
    }
    error.value = null
    
    try {
      const useProxy = shouldUseProxy(baseUrlValue)
      const encodedCollection = encodeURIComponent(collectionName.trim())
      const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}`)
      
      // Quick timeout
      const response = await axios.get(url, { timeout: 2000 })
      
      // Check if still mounted before updating state
      if (!isMounted.value) return null
      
      if (response.data) {
        stats.value[collectionName] = {
          num_documents: response.data.num_documents || 0,
          ...response.data
        }
        return stats.value[collectionName]
      }
    } catch (err) {
      // Silent fail for background loads
      if (showLoading && isMounted.value) {
        const errorMsg = extractSafeErrorMessage(err, 'Failed to load stats')
        error.value = `Failed to load stats for ${collectionName}: ${errorMsg}`
      }
    } finally {
      // Standardized: always reset loading in finally if it was set
      if (showLoading && isMounted.value) {
        loading.value = false
      }
    }
    
    return null
  }

  const loadAllCollectionStats = async (collections, showLoading = false) => {
    // Clear any existing timeouts
    activeTimeouts.value.forEach(timeoutId => clearTimeout(timeoutId))
    activeTimeouts.value = []
    
    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return
    }
    
    // Load stats in parallel but don't wait - fire and forget
    collections.forEach((col, index) => {
      if (!col?.name) return
      
      // Stagger requests slightly to avoid overwhelming server
      const timeoutId = setTimeout(() => {
        // Remove timeout ID from active list
        const idx = activeTimeouts.value.indexOf(timeoutId)
        if (idx > -1) {
          activeTimeouts.value.splice(idx, 1)
        }
        
        // Only load if still mounted
        if (isMounted.value) {
          loadCollectionStats(col.name, false).catch(() => {
            // Silent fail - stats will load eventually
          })
        }
      }, index * 50) // 50ms between each request
      
      activeTimeouts.value.push(timeoutId)
    })
  }

  // Cleanup function
  const cleanup = () => {
    isMounted.value = false
    activeTimeouts.value.forEach(timeoutId => clearTimeout(timeoutId))
    activeTimeouts.value = []
  }

  return {
    stats,
    loading,
    error,
    loadCollectionStats,
    loadAllCollectionStats,
    cleanup
  }
}
