import { ref } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

export function useAliases(baseUrl) {
  const aliases = ref([])
  const loading = ref(false)
  const error = ref(null)
  const currentCollectionFilter = ref('')

  const loadAliases = async (showLoading = true, collectionName = currentCollectionFilter.value) => {
    if (showLoading) loading.value = true
    error.value = null
    currentCollectionFilter.value = collectionName || ''
    
    try {
      const baseUrlValue = getBaseUrlValue(baseUrl)
      const useProxy = shouldUseProxy(baseUrlValue)
      const trimmedCollectionName = String(currentCollectionFilter.value || '').trim()
      const url = trimmedCollectionName
        ? buildApiUrl(baseUrlValue, useProxy, `/aliases?collection=${encodeURIComponent(trimmedCollectionName)}`)
        : buildApiUrl(baseUrlValue, useProxy, '/aliases')
      
      const response = await axios.get(url, { timeout: 5000 })
      aliases.value = response.data?.aliases || []
    } catch (err) {
      console.error('useAliases: Error loading aliases:', err)
      error.value = extractSafeErrorMessage(err, 'Failed to load aliases')
      aliases.value = []
    } finally {
      loading.value = false
    }
  }

  const createAlias = async (name, collectionName) => {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedAliasName = encodeURIComponent(name.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/aliases/${encodedAliasName}`)
    
    try {
      await axios.post(url, {
        collection_name: collectionName.trim()
      }, { timeout: 5000 })
      await loadAliases(false, currentCollectionFilter.value)
    } catch (err) {
      throw new Error(extractSafeErrorMessage(err, 'Failed to create alias'))
    }
  }

  const deleteAlias = async (name) => {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const encodedAliasName = encodeURIComponent(name.trim())
    const url = buildApiUrl(baseUrlValue, useProxy, `/aliases/${encodedAliasName}`)
    
    try {
      await axios.delete(url, { timeout: 5000 })
      await loadAliases(false, currentCollectionFilter.value)
    } catch (err) {
      throw new Error(extractSafeErrorMessage(err, 'Failed to delete alias'))
    }
  }

  return {
    aliases,
    loading,
    error,
    loadAliases,
    createAlias,
    deleteAlias
  }
}
