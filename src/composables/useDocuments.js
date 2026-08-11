import { ref } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers.js'

const normalizeTotal = (value, fallback, minimum = 0) => {
  if (value === null || value === undefined || value === '') return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= minimum ? numeric : fallback
}

export function useDocuments(baseUrl) {
  const documents = ref([])
  const loading = ref(false)
  const error = ref(null)
  const total = ref(0)
  let latestLoadRequestId = 0
  let activeLoadController = null

  const loadDocuments = async (collectionName, options = {}) => {
    const requestId = ++latestLoadRequestId
    activeLoadController?.abort()
    activeLoadController = new AbortController()
    const { signal } = activeLoadController

    if (!collectionName) {
      documents.value = []
      total.value = 0
      error.value = null
      loading.value = false
      activeLoadController = null
      return
    }
    
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      error.value = 'Invalid server URL configuration'
      documents.value = []
      total.value = 0
      loading.value = false
      activeLoadController = null
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

        const response = await axios.get(url, { params, signal })

        if (requestId !== latestLoadRequestId) return

        if (response.data && response.data.documents && Array.isArray(response.data.documents)) {
          documents.value = response.data.documents
          const returnedThrough = response.data.documents.length > 0
            ? params.offset + response.data.documents.length
            : 0
          total.value = normalizeTotal(response.data.total, returnedThrough, returnedThrough)
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
      let fetchedTotal = null

      while (hasMore) {
        const params = {
          include_created_at: true,
          offset,
          limit: pageLimit
        }

        if (sortBy) {
          params.sort_by = sortBy
        }

        const response = await axios.get(url, { params, signal })

        if (requestId !== latestLoadRequestId) return

        if (response.data && response.data.documents && Array.isArray(response.data.documents)) {
          if (response.data.total !== undefined) {
            const responseTotal = Number(response.data.total)
            fetchedTotal = Number.isFinite(responseTotal) && responseTotal >= 0
              ? responseTotal
              : fetchedTotal
          }

          allDocuments.push(...response.data.documents)
          if (fetchedTotal !== null && fetchedTotal < allDocuments.length) {
            fetchedTotal = allDocuments.length
          }

          if (response.data.documents.length < pageLimit) {
            hasMore = false
          } else if (fetchedTotal !== null && allDocuments.length >= fetchedTotal) {
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

      if (requestId !== latestLoadRequestId) return

      documents.value = allDocuments
      total.value = fetchedTotal ?? allDocuments.length
      await new Promise(resolve => setTimeout(resolve, 0))
      
    } catch (err) {
      if (requestId !== latestLoadRequestId || axios.isCancel(err)) {
        return
      }

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
      if (requestId === latestLoadRequestId) {
        loading.value = false
        activeLoadController = null
      }
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
