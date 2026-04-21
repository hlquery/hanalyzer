import { ref } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'

export function useRocksDBStats(baseUrl) {
  const rocksdbData = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const loadRocksDBStats = async () => {
    loading.value = true
    error.value = null
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      error.value = 'Invalid server URL configuration'
      loading.value = false
      return null
    }
    
    const useProxy = shouldUseProxy(baseUrlValue)
    
    try {
      const url = buildApiUrl(baseUrlValue, useProxy, '/rocksdb')
      
      const response = await axios.get(url, { timeout: 10000 })
      
      if (response.data) {
        rocksdbData.value = response.data
        return rocksdbData.value
      }
    } catch (err) {
      /* Fallback to stats endpoint if /rocksdb doesn't exist */
      try {
        const statsUrl = buildApiUrl(baseUrlValue, useProxy, '/stats')
        const statsResponse = await axios.get(statsUrl, { timeout: 10000 })
        
        /* Transform stats data to RocksDB format */
        if (statsResponse.data) {
          rocksdbData.value = {
            memory: {
              memtable_size_bytes: statsResponse.data.memory_usage || 0,
              memtable_size_kb: (statsResponse.data.memory_usage || 0) / 1024,
              memtable_size_mb: (statsResponse.data.memory_usage || 0) / (1024 * 1024)
            },
            disk: {
              sstable_count: 0,
              sstable_size_bytes: 0,
              sstable_size_kb: 0,
              sstable_size_mb: 0
            }
          }
          return rocksdbData.value
        }
      } catch (fallbackErr) {
        /* Use fallbackErr instead of err */
        const errorMsg = fallbackErr.response?.data?.error || fallbackErr.message || 'Unknown error'
        error.value = `Failed to load RocksDB stats: ${errorMsg}`
        console.error('Error loading RocksDB stats:', fallbackErr)
      }
    } finally {
      loading.value = false
    }
    
    return null
  }

  return {
    rocksdbData,
    loading,
    error,
    loadRocksDBStats
  }
}
