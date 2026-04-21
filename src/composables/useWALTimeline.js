import { ref } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

export function useWALTimeline(baseUrl) {
  const timeline = ref([])
  const loading = ref(false)
  const error = ref(null)
  const lastUpdateTime = ref(null)
  let retryTimeout = null
  let refreshInterval = null

  // Retry with exponential backoff
  const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (err) {
        if (i === maxRetries - 1) throw err
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }

  const loadWALTimeline = async (collectionName = null, incremental = false) => {
    // Don't block UI - set loading only if we don't have data yet
    if (!incremental && timeline.value.length === 0) {
      loading.value = true
    }
    error.value = null
    
    try {
      const baseUrlValue = getBaseUrlValue(baseUrl)
      if (!baseUrlValue) {
        if (!incremental) {
          loading.value = false
        }
        return null
      }
      
      // This would need a WAL endpoint - for now we'll simulate with stats
      const useProxy = shouldUseProxy(baseUrlValue)
      const url = buildApiUrl(baseUrlValue, useProxy, '/stats')
      
      // Quick timeout for responsiveness
      const response = await retryWithBackoff(
        () => axios.get(url, { timeout: 2000 }),
        2, // Only 2 retries
        500 // Start with 500ms delay
      )
      
      // Simulate timeline events from stats
      // In a real implementation, this would come from a WAL endpoint
      const now = Date.now()
      const newEvents = [
        {
          id: Date.now() + Math.random(),
          type: 'insert',
          timestamp: now - 5000,
          collection: collectionName || 'all',
          count: Math.floor(Math.random() * 100) + 10,
          status: 'success'
        },
        {
          id: Date.now() + Math.random() + 1,
          type: 'flush',
          timestamp: now - 3000,
          collection: collectionName || 'all',
          count: Math.floor(Math.random() * 200) + 50,
          status: 'success'
        },
        {
          id: Date.now() + Math.random() + 2,
          type: 'merge',
          timestamp: now - 1000,
          collection: collectionName || 'all',
          count: Math.floor(Math.random() * 100) + 25,
          status: 'success'
        }
      ]

      if (incremental && lastUpdateTime.value) {
        // Only add new events since last update
        const newEventsOnly = newEvents.filter(e => e.timestamp > lastUpdateTime.value)
        timeline.value = [...newEventsOnly, ...timeline.value].slice(0, 100) // Keep last 100
      } else {
        timeline.value = newEvents
      }
      
      lastUpdateTime.value = now
      return timeline.value
    } catch (err) {
      // Don't show error if we already have data (incremental update failed)
      if (!incremental || timeline.value.length === 0) {
        error.value = `Failed to load WAL timeline: ${err.message}`
        console.warn('Error loading WAL timeline:', err)
      }
      // Keep existing timeline data if incremental update fails
      if (!incremental) {
        timeline.value = []
      }
    } finally {
      loading.value = false
    }
    
    return timeline.value
  }

  // Start background refresh
  const startAutoRefresh = (collectionName = null, interval = 10000) => {
    stopAutoRefresh()
    refreshInterval = setInterval(() => {
      loadWALTimeline(collectionName, true) // Incremental updates
    }, interval)
  }

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  // Initial load with retry in background
  const loadWithRetry = async (collectionName = null) => {
    // Try immediate load
    try {
      await loadWALTimeline(collectionName, false)
    } catch (err) {
      // If fails, retry in background after a delay
      if (retryTimeout) clearTimeout(retryTimeout)
      retryTimeout = setTimeout(() => {
        loadWALTimeline(collectionName, false).catch(() => {
          // Silent fail - will retry on next manual refresh
        })
      }, 2000)
    }
  }

  return {
    timeline,
    loading,
    error,
    loadWALTimeline,
    loadWithRetry,
    startAutoRefresh,
    stopAutoRefresh
  }
}
