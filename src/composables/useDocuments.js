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
      
      // Fetch all documents by paginating through all pages
      // API max limit is 1000, so we'll fetch in batches of 1000
      const allDocuments = []
      let offset = 0
      const limit = 1000 // Max allowed by API
      let hasMore = true
      
      // Reset total before loading
      total.value = 0
      
      // Get sort_by from options if provided
      const sortBy = options?.sortBy || null
      
      while (hasMore) {
        const params = {
          include_created_at: true,
          offset: offset,
          limit: limit
        }
        
        // Add sort_by if provided
        if (sortBy) {
          params.sort_by = sortBy
        }
        
        const response = await axios.get(url, { params })
        
        // Server always returns {documents: [...], total: N} format
        if (response.data && response.data.documents && Array.isArray(response.data.documents)) {
          // Get total count from first response
          if (total.value === 0 && response.data.total !== undefined) {
            total.value = response.data.total
          }
          
          // Add documents from this batch
          allDocuments.push(...response.data.documents)

          // Check if we need to fetch more
          if (response.data.documents.length < limit) {
            // Got fewer documents than requested, we're done
            hasMore = false
          } else if (total.value > 0 && allDocuments.length >= total.value) {
            // We've fetched all documents according to total count
            hasMore = false
          } else {
            // Continue to next batch
            offset += limit
          }
        } else if (Array.isArray(response.data)) {
          // Fallback: if server ever returns array directly (shouldn't happen)
          allDocuments.push(...response.data)
          hasMore = false
        } else {
          hasMore = false
        }
      }
      
      // Assign all collected documents
      documents.value = allDocuments
      
      // Force Vue to recognize the change
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
