import { ref, onMounted, onUnmounted, watch } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers.js'
import { authManager } from './useAuth.js'

export const shouldShowConnectingState = (isChecking, isConnected) => {
  return Boolean(isChecking && !isConnected)
}

export function useConnectionStatus(baseUrl) {
  const isConnected = ref(false)
  const isChecking = ref(false)
  const hasChecked = ref(false)
  const lastPingTime = ref(null)
  const latencyHistory = ref([]) // Array of { time: timestamp, latency: ms }
  const authRequiredLocal = ref(false)
  const REQUEST_TIMEOUT_MS = 5000
  const FAILURE_THRESHOLD = 2
  let pingInterval = null
  let consecutiveFailures = 0
  let latestCheckRequestId = 0
  let activeCheckController = null

  const markSuccess = () => {
    consecutiveFailures = 0
  }

  const markFailure = () => {
    consecutiveFailures += 1
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      isConnected.value = false
      lastPingTime.value = null
    }
  }

  const checkConnection = async () => {
    const requestId = ++latestCheckRequestId
    activeCheckController?.abort()
    activeCheckController = new AbortController()
    const { signal } = activeCheckController

    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      isConnected.value = false
      hasChecked.value = true
      isChecking.value = false
      activeCheckController = null
      return
    }
    
    isChecking.value = true
    try {
      const useProxy = shouldUseProxy(baseUrlValue)
      const readyUrl = buildApiUrl(baseUrlValue, useProxy, '/ready')
      const pingUrl = buildApiUrl(baseUrlValue, useProxy, '/ping')
      const statsUrl = buildApiUrl(baseUrlValue, useProxy, '/stats')

      let startTime = Date.now()
      let response = await axios.get(readyUrl, {
        signal,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true // Don't throw on any status
      })
      let pingTime = Date.now() - startTime

      if (requestId !== latestCheckRequestId) return

      // Older servers may not expose /ready. Keep compatibility without
      // treating /ping as sufficient readiness on current servers.
      if (response.status === 404) {
        startTime = Date.now()
        response = await axios.get(pingUrl, {
          signal,
          timeout: REQUEST_TIMEOUT_MS,
          validateStatus: () => true
        })
        pingTime = Date.now() - startTime

        if (requestId !== latestCheckRequestId) return

        // Fall back to /stats if /ping is also unavailable.
        if (response.status === 404) {
          startTime = Date.now()
          response = await axios.get(statsUrl, {
            signal,
            timeout: REQUEST_TIMEOUT_MS,
            validateStatus: () => true
          })
          pingTime = Date.now() - startTime

          if (requestId !== latestCheckRequestId) return
        }
      }
      
      // 503 means server is not ready yet (still starting up), not necessarily disconnected
      if (response.status === 200) {
        const hasAuth = Object.keys(authManager.getAuthHeaders(baseUrlValue)).length > 0
        const authEnabled = response?.data && typeof response.data.auth_required === 'boolean'
          ? response.data.auth_required
          : (response?.data && typeof response.data.auth_enabled === 'boolean'
            ? response.data.auth_enabled
            : null)

        // If no auth configured, verify whether auth is required.
        if (!hasAuth) {
          if (authEnabled === true) {
            authRequiredLocal.value = true
            if (typeof window !== 'undefined') {
              window.__HLQUERY_AUTH_REQUIRED__ = true
            }
            isConnected.value = false
            lastPingTime.value = null
            consecutiveFailures = FAILURE_THRESHOLD
            return
          }
          if (authEnabled === false) {
            authRequiredLocal.value = false
            if (typeof window !== 'undefined') {
              window.__HLQUERY_AUTH_REQUIRED__ = false
            }
          } else {
            // Backward compatibility: if auth status not provided, probe a protected endpoint.
            const useProxy2 = shouldUseProxy(baseUrlValue)
            const collectionsUrl = buildApiUrl(baseUrlValue, useProxy2, '/collections')
            try {
              const authCheck = await axios.get(collectionsUrl, {
                signal,
                timeout: REQUEST_TIMEOUT_MS,
                validateStatus: () => true
              })
              if (requestId !== latestCheckRequestId) return
              if (authCheck.status === 401) {
                authRequiredLocal.value = true
                if (typeof window !== 'undefined') {
                  window.__HLQUERY_AUTH_REQUIRED__ = true
                }
                isConnected.value = false
                lastPingTime.value = null
                consecutiveFailures = FAILURE_THRESHOLD
                return
              }
              if (authCheck.status === 403) {
                // Treat 403 as not connected for UI purposes (access blocked)
                authRequiredLocal.value = true
                if (typeof window !== 'undefined') {
                  window.__HLQUERY_AUTH_REQUIRED__ = true
                }
                isConnected.value = false
                lastPingTime.value = null
                consecutiveFailures = FAILURE_THRESHOLD
                return
              }
              if (authCheck.status < 200 || authCheck.status >= 300) {
                // /ready can only unlock collection views once the collection
                // API itself is also routable. This prevents direct refreshes
                // from racing storage/route initialization.
                markFailure()
                return
              }
              authRequiredLocal.value = false
              if (typeof window !== 'undefined') {
                window.__HLQUERY_AUTH_REQUIRED__ = false
              }
            } catch (err) {
              // Auth probe can fail transiently while server is busy.
              markFailure()
              return
            }
          }
        }

        markSuccess()
        isConnected.value = true
        lastPingTime.value = pingTime
        
        // Add to latency history
        const now = Date.now()
        latencyHistory.value.push({
          time: now,
          latency: pingTime
        })
        
        // Keep only last minute (60 seconds)
        const oneMinuteAgo = now - 60000
        latencyHistory.value = latencyHistory.value.filter(item => item.time > oneMinuteAgo)
      } else if (response.status === 401 || response.status === 403) {
        authRequiredLocal.value = true
        if (typeof window !== 'undefined') {
          window.__HLQUERY_AUTH_REQUIRED__ = true
        }
        isConnected.value = false
        lastPingTime.value = null
        consecutiveFailures = FAILURE_THRESHOLD
      } else if (response.status === 503) {
        markFailure()
      } else {
        markFailure()
      }
    } catch (err) {
      if (requestId !== latestCheckRequestId || axios.isCancel(err)) {
        return
      }

      // Network errors or timeouts mean server is not reachable
      // Require consecutive failures to avoid online/offline flapping under load.
      markFailure()
    } finally {
      if (requestId === latestCheckRequestId) {
        hasChecked.value = true
        isChecking.value = false
        activeCheckController = null
      }
    }
  }

  const startPing = () => {
    stopPing()
    // Check immediately
    checkConnection()
    // Then check every 10 seconds
    pingInterval = setInterval(() => {
      checkConnection()
    }, 10000)
  }

  const stopPing = () => {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  // Watch baseUrl changes
  watch(baseUrl, () => {
    // Never carry server A's readiness into server B. AppHeader also watches
    // this state and must not load B's collection names until B is verified.
    isConnected.value = false
    hasChecked.value = false
    lastPingTime.value = null
    consecutiveFailures = 0
    checkConnection()
  })

  onMounted(() => {
    startPing()
  })

  onUnmounted(() => {
    stopPing()
    latestCheckRequestId += 1
    activeCheckController?.abort()
    activeCheckController = null
  })

  return {
    isConnected,
    isChecking,
    hasChecked,
    lastPingTime,
    latencyHistory,
    checkConnection,
    startPing,
    stopPing
  }
}
