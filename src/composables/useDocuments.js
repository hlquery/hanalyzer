import { ref } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'

export function useDocuments(baseUrl) {
  const documents = ref([])
  const loading = ref(false)
  const error = ref(null)
  const total = ref(0)

  const loadDocuments = async (collectionName, options = {}) => {
    if (!collectionName) {
      documents.value = []
      total.value = 0
      return
    }
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      error.value = 'Invalid server URL configuration'
      documents.value = []
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      const useProxy = shouldUseProxy(baseUrlValue)
      const encodedCollection = encodeURIComponent(collectionName.trim())
      const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/documents`)

      const sortBy = options?.sortBy || null
      const page = Math.max(1, Number(options?.page) || 1)
      const requestedLimit = Number(options?.limit ?? options?.perPage)
      const pageLimit = Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.trunc(requestedLimit), 1000)
        : 1000
      const fetchAll = options?.fetchAll === true

      if (!fetchAll) {
        const params = {
          include_created_at: true,
          offset: (page - 1) * pageLimit,
          limit: pageLimit
        }

        if (sortBy) {
          params.sort_by = sortBy
        }

        const response = await axios.get(url, { params })

        if (response.data && response.data.documents && Array.isArray(response.data.documents)) {
          documents.value = response.data.documents
          total.value = Number(response.data.total ?? response.data.documents.length ?? 0)
        } else if (Array.isArray(response.data)) {
          documents.value = response.data
          total.value = response.data.length
        } else {
          documents.value = []
          total.value = 0
        }

        return
      }

      const allDocuments = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const params = {
          include_created_at: true,
          offset,
          limit: pageLimit
        }

        if (sortBy) {
          params.sort_by = sortBy
        }

        const response = await axios.get(url, { params })

        if (response.data && response.data.documents && Array.isArray(response.data.documents)) {
          if (total.value === 0 && response.data.total !== undefined) {
            total.value = response.data.total
          }

          allDocuments.push(...response.data.documents)

          if (response.data.documents.length < pageLimit) {
            hasMore = false
          } else if (total.value > 0 && allDocuments.length >= total.value) {
            hasMore = false
          } else {
            offset += pageLimit
          }
        } else if (Array.isArray(response.data)) {
          allDocuments.push(...response.data)
          hasMore = false
        } else {
          hasMore = false
        }
      }

      documents.value = allDocuments
      await new Promise(resolve => setTimeout(resolve, 0))
      
    } catch (err) {
      if (err.response?.status === 404) {
        error.value = `Collection "${collectionName}" not found`
        documents.value = []
        total.value = 0
      } else {
        error.value = `Failed to load documents: ${err.response?.data?.error || err.response?.data?.message || err.message}`
        documents.value = []
        total.value = 0
      }
    } finally {
      loading.value = false
    }
  }

  const getDocument = async (collectionName, docId) => {
    if (!collectionName?.trim() || !docId?.trim()) {
      throw new Error('Collection name and document ID are required')
    }
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      throw new Error('Invalid server URL configuration')
    }
    
    try {
      const useProxy = shouldUseProxy(baseUrlValue)
      const encodedCollection = encodeURIComponent(collectionName.trim())
      const encodedDocId = encodeURIComponent(docId.trim())
      const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/documents/${encodedDocId}`)
      // Always include created_at field when getting a single document
      const response = await axios.get(url, {
        params: {
          include_created_at: true
        }
      })
      return response.data
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error'
      throw new Error(`Failed to load document: ${errorMsg}`)
    }
  }

  const addDocument = async (collectionName, document) => {
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
      const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/documents`)
      
      const response = await axios.post(url, document, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      // Reload documents after adding
      await loadDocuments(collectionName)
      
      return response.data
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error'
      throw new Error(`Failed to add document: ${errorMsg}`)
    }
  }

  const deleteDocument = async (collectionName, docId) => {
    if (!collectionName?.trim() || !docId?.trim()) {
      throw new Error('Collection name and document ID are required')
    }
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      throw new Error('Invalid server URL configuration')
    }
    
    try {
      const useProxy = shouldUseProxy(baseUrlValue)
      const encodedCollection = encodeURIComponent(collectionName.trim())
      const encodedDocId = encodeURIComponent(docId.trim())
      const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/documents/${encodedDocId}`)
      
      const response = await axios.delete(url)
      
      // Reload documents after deleting
      await loadDocuments(collectionName)
      
      return response.data
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error'
      throw new Error(`Failed to delete document: ${errorMsg}`)
    }
  }

  return {
    documents,
    loading,
    error,
    total,
    loadDocuments,
    getDocument,
    addDocument,
    deleteDocument
  }
}
