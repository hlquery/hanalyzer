import { ref } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const DEBUG_SEARCH = false
const DEFAULT_MAYBE_MIN = 5
const DEFAULT_MAYBE_LIMIT = 1

const hasCaseSensitiveDirective = (query) => {
  return /\b(?:do|is):case[-_]?sensitive\b/i.test(String(query || ''))
}

const normalizeQueryBy = (queryBy) => {
  if (Array.isArray(queryBy)) {
    return queryBy.map((field) => String(field || '').trim()).filter(Boolean).join(',')
  }

  return String(queryBy || '').trim()
}

const normalizeSortBy = (sortBy) => {
  const value = String(sortBy || '').trim()
  if (!value || value === '_relevance' || value === '_text_match:desc') {
    return ''
  }
  return value
}

const normalizeSearchDocument = (doc, score = 0) => {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      _text_match: Number(score) || 0,
      highlights: {}
    }
  }

  return {
    id: doc.id || '',
    title: doc.title || doc.name,
    content: doc.content || doc.description || doc.text,
    ...doc,
    _text_match: Number(score) || 0,
    highlights: doc.highlights || {},
    created_at: doc.created_at || doc.timestamp
  }
}

export function useSearch(baseUrl) {
  const searchResults = ref([])
  const loading = ref(false)
  const error = ref(null)
  const totalFound = ref(0)
  const searchTime = ref(null) // Time in seconds
  const indexingInProgress = ref(false)
  const directSearchExecuted = ref(false)
  const samSearchStatus = ref(null)
  const maybeResult = ref(null)

  const performSearch = async (collectionName, query, limit = 10, options = {}) => {
    indexingInProgress.value = false
    directSearchExecuted.value = false
    samSearchStatus.value = null
    maybeResult.value = null

    // Validate inputs
    if (!collectionName || !collectionName.trim()) {
      error.value = 'Collection name is required for search'
      searchResults.value = []
      searchTime.value = null
      return
    }
    
    // Allow empty query if filter_by is provided (filter-only search)
    const hasFilter = options.filterBy && options.filterBy.trim()
    const hasVectorQuery = options.vectorQuery || options.embedding
    const trimmedQuery = query ? query.trim() : ''
    
    if (!trimmedQuery && !hasFilter && !hasVectorQuery) {
      searchResults.value = []
      searchTime.value = null
      error.value = null
      return
    }
    
    // Standardized loading state: always set before try
    loading.value = true
    error.value = null
    
    // Start timing
    const startTime = performance.now()
    
    try {
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
      
      // Validate collection name
      if (!collectionName?.trim()) {
        throw new Error('Invalid collection name')
      }
      
      const encodedCollection = encodeURIComponent(collectionName.trim())
      
      // Use POST method like in tests - more reliable for complex queries
      // Always include query_by when explicitly requested by the caller.
      // Preserve quotes in query for exact phrase search
      
      const url = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/documents/search`)
      const canUseSam = !!options.useSam && !!trimmedQuery && !hasFilter && !hasVectorQuery
      let samIndexingActive = false

      const fetchDocumentById = async (documentId) => {
        const encodedDocumentId = encodeURIComponent(String(documentId || '').trim())
        const documentUrl = buildApiUrl(baseUrlValue, useProxy, `/collections/${encodedCollection}/documents/${encodedDocumentId}`)
        return axios.get(documentUrl, { timeout: 10000 })
      }

      if (canUseSam) {
        const samUrl = buildApiUrl(baseUrlValue, useProxy, '/sam/search')

        try {
          const samResponse = await axios.get(samUrl, {
            params: {
              collection: collectionName.trim(),
              q: trimmedQuery,
              limit: limit
            },
            timeout: 10000
          })

          const samHits = Array.isArray(samResponse?.data?.hits) ? samResponse.data.hits : []
          samIndexingActive = samResponse?.data?.indexing_in_progress === true ||
            samResponse?.data?.sam_indexing?.running === true ||
            samResponse?.data?.sam_indexing?.retry_scheduled === true
          indexingInProgress.value = samIndexingActive
          samSearchStatus.value = samResponse?.data?.sam_indexing || null

          if (samIndexingActive || samHits.length === 0) {
            directSearchExecuted.value = true
            if (DEBUG_SEARCH) {
              console.warn('SAM+ search is indexing or empty, falling back to standard search:', samResponse?.data)
            }
          } else {
            const hydratedResults = await Promise.all(samHits.map(async (hit) => {
              const fallbackDoc = {
                id: hit?.id || '',
                title: hit?.title || '',
                collection: hit?.collection || collectionName.trim(),
                _sam_term: hit?.term || '',
                _sam_kind: hit?.kind || '',
                _sam_source: hit?.source || '',
                _sam_matched_path: hit?.matched_path || '',
                _sam_signal: hit?.signal ?? 0,
                _sam_evidence_count: hit?.evidence_count ?? 0
              }

              try {
                const documentResponse = await fetchDocumentById(hit?.id)
                return normalizeSearchDocument(documentResponse?.data, hit?.score)
              } catch (documentError) {
                return normalizeSearchDocument(fallbackDoc, hit?.score)
              }
            }))

            searchResults.value = hydratedResults
            totalFound.value = samResponse?.data?.count !== undefined
              ? Number(samResponse.data.count) || hydratedResults.length
              : hydratedResults.length
            searchTime.value = ((performance.now() - startTime) / 1000).toFixed(3)
            return
          }
        } catch (samError) {
          if (DEBUG_SEARCH) {
            console.warn('SAM+ search failed, falling back to standard search:', samError)
          }
        }
      }
      
      const params = {
        limit: limit,
        highlight: true,  // Enable server-side highlighting
        include_created_at: true  // Default: true - include created_at in search results
      }

      const sortBy = normalizeSortBy(options.sortBy)
      if (sortBy) {
        params.sort_by = sortBy
      }
      
      // Add query if provided (required unless filter_by or vector_query is provided)
      if (trimmedQuery) {
        params.q = trimmedQuery  // Preserve quotes - don't remove them!
        // Only add query_by when explicitly set to real field names.
        // If user selected '*', omit query_by so backend uses its default all-fields behavior.
        const queryBy = normalizeQueryBy(options.queryBy)
        if (queryBy && queryBy !== '*') {
          params.query_by = queryBy
        }
      } else if (options.filterBy && options.filterBy.trim()) {
        // The search endpoint expects a wildcard query for filter-only requests.
        params.q = '*'
      }
      
      // Add filter_by if provided (allows filter-only searches)
      if (options.filterBy && options.filterBy.trim()) {
        params.filter_by = options.filterBy.trim()
      }
      
      // Add vector_query if provided
      if (options.vectorQuery) {
        params.vector_query = options.vectorQuery
      }
      
      // Add embedding if provided
      if (options.embedding) {
        params.embedding = options.embedding
      }
      
      // Add facet_by if provided
      if (options.facetBy) {
        params.facet_by = Array.isArray(options.facetBy) ? options.facetBy.join(',') : options.facetBy
      }

      if (options.maxFacetValues !== undefined && options.maxFacetValues !== null && options.maxFacetValues !== '') {
        params.max_facet_values = Number(options.maxFacetValues)
      }

      if (options.facetQuery && typeof options.facetQuery === 'string' && options.facetQuery.trim()) {
        params.facet_query = options.facetQuery.trim()
      }
      
      // Always enable highlighting for search results
      // This ensures that matching terms are highlighted with <em> tags
      params.highlight = options.highlight !== undefined ? options.highlight : true
      
      // Add highlight_fields if provided
      if (options.highlightFields) {
        params.highlight_fields = Array.isArray(options.highlightFields) 
          ? options.highlightFields.join(',') 
          : options.highlightFields
      }

      if (options.highlightFullFields && String(options.highlightFullFields).trim()) {
        params.highlight_full_fields = String(options.highlightFullFields).trim()
      }

      if (options.includeFields && String(options.includeFields).trim()) {
        params.include_fields = String(options.includeFields).trim()
      }

      if (options.excludeFields && String(options.excludeFields).trim()) {
        params.exclude_fields = String(options.excludeFields).trim()
      }

      if (options.groupBy && String(options.groupBy).trim()) {
        params.group_by = String(options.groupBy).trim()
      }

      if (options.groupLimit !== undefined && options.groupLimit !== null && options.groupLimit !== '') {
        params.group_limit = Number(options.groupLimit)
      }

      if (options.numTypos !== undefined && options.numTypos !== null && options.numTypos !== '') {
        params.num_typos = Number(options.numTypos)
      }

      if (options.prefix !== undefined) {
        params.prefix = !!options.prefix
      }

      if (options.caseSensitive !== undefined) {
        params.case_sensitive = !!options.caseSensitive
      }

      if (options.dropTokensThreshold !== undefined && options.dropTokensThreshold !== null && options.dropTokensThreshold !== '') {
        params.drop_tokens_threshold = Number(options.dropTokensThreshold)
      }

      if (options.typoTokensThreshold !== undefined && options.typoTokensThreshold !== null && options.typoTokensThreshold !== '') {
        params.typo_tokens_threshold = Number(options.typoTokensThreshold)
      }

      if (options.prioritizeExactMatch !== undefined) {
        params.prioritize_exact_match = !!options.prioritizeExactMatch
      }

      if (options.exhaustiveSearch !== undefined) {
        params.exhaustive_search = !!options.exhaustiveSearch
      }

      if (options.hybridAlpha !== undefined && options.hybridAlpha !== null && options.hybridAlpha !== '') {
        params.hybrid_alpha = Number(options.hybridAlpha)
      }

      if (options.aggregations && String(options.aggregations).trim()) {
        params.aggregations = String(options.aggregations).trim()
      }

      if (options.includeCreatedAt !== undefined) {
        params.include_created_at = !!options.includeCreatedAt
      }

      // Maybe suggestions:
      // enabled by default and can be disabled per-search from the UI.
      const maybeEnabled = hasCaseSensitiveDirective(trimmedQuery)
        ? false
        : (options.includeMaybe !== undefined ? !!options.includeMaybe : true)
      params.maybe = maybeEnabled
      if (maybeEnabled) {
        const maybeMin = options.maybeMin !== undefined && options.maybeMin !== null && options.maybeMin !== ''
          ? Number(options.maybeMin)
          : DEFAULT_MAYBE_MIN
        const maybeLimit = options.maybeLimit !== undefined && options.maybeLimit !== null && options.maybeLimit !== ''
          ? Number(options.maybeLimit)
          : DEFAULT_MAYBE_LIMIT

        params.maybe_min = maybeMin
        params.maybe_limit = maybeLimit
      }
      
      let response
      directSearchExecuted.value = true
      try {
        response = await axios.post(url, params, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        })
      } catch (proxyErr) {
        // If proxy fails, try direct URL as fallback (only if we have a valid baseUrl)
        if (useProxy && proxyErr.response?.status !== 200 && baseUrlValue && !baseUrlValue.includes('localhost:8080')) {
          const directUrl = buildApiUrl(baseUrlValue, false, `/collections/${encodedCollection}/documents/search`)
          try {
            response = await axios.post(directUrl, params, {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 10000
            })
          } catch (directErr) {
            throw proxyErr
          }
        } else {
          throw proxyErr
        }
      }
      
      // Handle response structure: { hits: [...], found: number } or { results: [...] }
      if (response.data) {
        indexingInProgress.value = samIndexingActive || response.data.indexing_in_progress === true
        maybeResult.value = response.data.maybe || null
        // Handle standard search response format
        if (response.data.hits && Array.isArray(response.data.hits)) {
          // Store total found count
          totalFound.value = response.data.found !== undefined ? response.data.found : response.data.hits.length
          
          // Transform hits to include document data
          // Sort results by _text_match (relevance) before mapping
          // This ensures most relevant results appear first
          const sortedHits = [...response.data.hits].sort((a, b) => {
            const scoreA = a._text_match || a.text_match || a._textMatch || 0
            const scoreB = b._text_match || b.text_match || b._textMatch || 0
            return scoreB - scoreA // Descending order (highest first)
          })
          
          searchResults.value = sortedHits.map(hit => {
            // Hits have structure: { document: {...}, highlights: {...}, _text_match: ..., created_at: ... }
            if (hit.document) {
              const doc = {
                id: hit.document.id || hit.id,
                title: hit.document.title || hit.document.name,
                content: hit.document.content || hit.document.description || hit.document.text,
                ...hit.document,  // Spread document fields (id, title, content, etc.) - this will override above if they exist
                _text_match: hit._text_match || hit.text_match || hit._textMatch || 0,
                highlights: hit.highlights || {},
                // created_at can be in hit.document OR at hit level
                created_at: hit.document.created_at || hit.created_at || hit.document.timestamp || hit.timestamp
              }
              return doc
            }
            // Fallback if structure is different
            const doc = {
              id: hit.id,
              ...hit,
              _text_match: hit._text_match || hit.text_match || hit._textMatch || 0,
              highlights: hit.highlights || {},
              created_at: hit.created_at || hit.timestamp
            }
            return doc
          })
        } 
        // Handle results array format
        else if (response.data.results && Array.isArray(response.data.results)) {
          searchResults.value = response.data.results
          totalFound.value = response.data.found !== undefined ? response.data.found : response.data.results.length
        }
        // Handle direct array format
        else if (Array.isArray(response.data)) {
          searchResults.value = response.data
          totalFound.value = response.data.length
        }
        // Handle error response
        else if (response.data.error) {
          throw new Error(response.data.message || response.data.error || 'Search failed')
        }
        // Empty or unknown format
        else {
          searchResults.value = []
          totalFound.value = 0
        }
      } else {
        searchResults.value = []
        totalFound.value = 0
        indexingInProgress.value = false
        directSearchExecuted.value = false
        maybeResult.value = null
      }
      
      // Calculate search time
      const endTime = performance.now()
      searchTime.value = ((endTime - startTime) / 1000).toFixed(3) // Convert to seconds with 3 decimals
    } catch (err) {
      // Handle specific error cases
      if (err.response) {
        const status = err.response.status
        const data = err.response.data
        
        // Handle 404 - collection not found
        if (status === 404) {
          error.value = `Collection "${collectionName}" not found`
          return
        }
        
        // Handle 400 - bad request (invalid query, missing parameters, etc.)
        if (status === 400) {
          const serverMessage = data?.message || data?.error || 'Invalid search request'
          error.value = serverMessage
          return
        }
        
        // Handle 500 - server error
        if (status === 500) {
          error.value = 'Server error. Please try again later.'
          return
        }
        
        // Handle timeout
        if (status === 504 || err.code === 'ECONNABORTED') {
          error.value = 'Search request timed out. Please try again with a simpler query.'
          return
        }
      }
      
      // Handle network errors
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('Network Error')) {
        error.value = 'Cannot connect to server. Please check your connection and server status.'
        return
      }
      
      // Generic error handling
      const errorMsg = extractSafeErrorMessage(err, 'Search failed')
      error.value = errorMsg
      indexingInProgress.value = false
      directSearchExecuted.value = false
      maybeResult.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    searchResults,
    loading,
    error,
    totalFound,
    searchTime,
    indexingInProgress,
    directSearchExecuted,
    samSearchStatus,
    maybeResult,
    performSearch
  }
}
