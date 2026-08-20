import { ref } from 'vue'
import axios from 'axios'
import {
  getBaseUrlValue,
  shouldUseProxy,
  buildApiUrl,
  isDemoDeployment,
  withDemoReplicaProbe
} from '../utils/apiHelpers.js'
import { extractSafeErrorMessage, sanitizeError } from '../utils/sanitize.js'

const DEFAULT_MAYBE_MIN = 5
const DEFAULT_MAYBE_LIMIT = 1
const DEMO_SEARCH_SAMPLE_COUNT = 4
const DEMO_SEARCH_SAMPLE_TIMEOUT_MS = 2000

const getSearchResponseResultCount = (response) => {
  const data = response?.data
  const results = Array.isArray(data?.hits)
    ? data.hits
    : (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []))
  const rawReported = data?.found
  const reported = rawReported === null || rawReported === undefined || rawReported === ''
    ? Number.NaN
    : Number(rawReported)

  return {
    reported: Number.isFinite(reported) && reported >= 0 ? reported : results.length,
    returned: results.length
  }
}

// The public demo can briefly route identical reads to replicas at different
// indexing generations. Prefer the successful response with the largest
// authoritative result set instead of letting a lagging empty replica make a
// populated collection appear empty.
const selectMostCompleteSearchResponse = (responses) => {
  return [...responses].sort((left, right) => {
    const leftCount = getSearchResponseResultCount(left)
    const rightCount = getSearchResponseResultCount(right)
    return (rightCount.reported - leftCount.reported) ||
      (rightCount.returned - leftCount.returned)
  })[0]
}

const sampleDemoSearch = async (url, requestId, postSearch) => {
  const sampleBatchId = `${Date.now()}-${requestId}`
  const samples = Array.from({ length: DEMO_SEARCH_SAMPLE_COUNT }, (_, sampleIndex) => (
    postSearch(
      withDemoReplicaProbe(url, `${sampleBatchId}-${sampleIndex}`),
      { timeout: DEMO_SEARCH_SAMPLE_TIMEOUT_MS }
    )
  ))

  // Return as soon as any replica proves that the query has results. Waiting
  // for every sample made a single unhealthy replica hold the page spinner
  // until the full request timeout even though another replica had answered.
  const firstPopulated = new Promise((resolve) => {
    samples.forEach((sample) => {
      sample.then((response) => {
        const count = getSearchResponseResultCount(response)
        if (count.reported > 0 || count.returned > 0) {
          resolve(response)
        }
      }).catch(() => {})
    })
  })

  const bestSettled = Promise.allSettled(samples).then((settled) => {
    const successful = settled
      .filter((sample) => sample.status === 'fulfilled')
      .map((sample) => sample.value)

    if (successful.length === 0) {
      throw settled.find((sample) => sample.status === 'rejected')?.reason ||
        new Error('Search failed on every demo replica')
    }
    return selectMostCompleteSearchResponse(successful)
  })

  return Promise.race([firstPopulated, bestSettled])
}

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

const normalizeSearchMode = (mode) => {
  const value = String(mode || '').trim().toLowerCase()
  if (value === 'keyword') {
    return 'text'
  }
  return ['text', 'vector', 'geo', 'hybrid'].includes(value) ? value : 'text'
}

const buildModePayload = (query, limit, options = {}) => {
  const source = options.searchPayload || null
  if (!source?.mode) {
    return null
  }

  const mode = normalizeSearchMode(source.mode)
  const payload = {
    mode,
    limit: Number(source.limit || limit || 10)
  }

  const payloadQuery = String(source.query ?? query ?? '').trim()
  if (payloadQuery) {
    payload.query = payloadQuery
  }

  if (Array.isArray(source.vector) && source.vector.length > 0) {
    payload.vector = source.vector
  }

  if (mode === 'vector' || mode === 'hybrid') {
    payload.vector_field = String(source.vector_field || 'embedding').trim() || 'embedding'
    payload.distance = String(source.distance || 'cosine').trim() || 'cosine'
  }

  if (mode === 'hybrid') {
    payload.weights = source.weights || {
      text: 0.4,
      vector: 0.6
    }
  }

  return payload
}

const formatSearchErrorMessage = (err, defaultMessage = 'Search failed') => {
  const data = err?.response?.data
  if (!data || typeof data !== 'object') {
    return extractSafeErrorMessage(err, defaultMessage)
  }

  const message = data.message || data.error || defaultMessage
  const codeParts = []

  if (data.code !== undefined && data.code !== null && data.code !== '') {
    codeParts.push(`code ${data.code}`)
  }

  if (data.code_text) {
    codeParts.push(String(data.code_text))
  }

  const suffix = codeParts.length > 0 ? ` (${codeParts.join(': ')})` : ''
  return sanitizeError(`${message}${suffix}`)
}

export function useSearch(baseUrl) {
  const searchResults = ref([])
  const loading = ref(false)
  const error = ref(null)
  const totalFound = ref(0)
  const searchTime = ref(null) // Time in seconds
  const indexingInProgress = ref(false)
  const directSearchExecuted = ref(false)
  const maybeResult = ref(null)
  let latestSearchRequestId = 0
  let activeSearchController = null

  const performSearch = async (collectionName, query, limit = 10, options = {}) => {
    const requestId = ++latestSearchRequestId
    activeSearchController?.abort()
    activeSearchController = null

    indexingInProgress.value = false
    directSearchExecuted.value = false
    maybeResult.value = null

    // Validate inputs
    const searchAllCollections = options.searchAllCollections === true
    if (!searchAllCollections && (!collectionName || !collectionName.trim())) {
      error.value = 'Collection name is required for search'
      searchResults.value = []
      totalFound.value = 0
      searchTime.value = null
      loading.value = false
      return
    }
    
    // Allow empty query if filter_by is provided (filter-only search)
    const hasFilter = options.filterBy && options.filterBy.trim()
    const modePayload = buildModePayload(query, limit, options)
    const hasVectorQuery = options.vectorQuery || options.embedding || Array.isArray(modePayload?.vector)
    const trimmedQuery = query ? query.trim() : ''
    const hasModeTextQuery = Boolean(modePayload?.query)
    
    if (!trimmedQuery && !hasModeTextQuery && !hasFilter && !hasVectorQuery) {
      searchResults.value = []
      totalFound.value = 0
      searchTime.value = null
      error.value = null
      loading.value = false
      return
    }

    activeSearchController = new AbortController()
    const { signal } = activeSearchController
    
    // Standardized loading state: always set before try
    loading.value = true
    error.value = null
    searchResults.value = []
    totalFound.value = 0
    searchTime.value = null
    
    // Start timing
    const startTime = performance.now()
    
    try {
      // Use proxy if:
      // 1. baseUrl is localhost:9200 (backend default) - proxy forwards to backend
      // 2. OR we're accessing via localhost:8080 (dev server) - always use proxy in dev
      // 3. OR baseUrl is not set/empty (fallback to proxy)
      // 4. OR if the URL path starts with /api (already using proxy path)
      const baseUrlValue = getBaseUrlValue(baseUrl)
      const useProxy = shouldUseProxy(baseUrlValue)
      
      // Validate collection name
      if (!searchAllCollections && !collectionName?.trim()) {
        throw new Error('Invalid collection name')
      }
      
      const encodedCollection = searchAllCollections ? '' : encodeURIComponent(collectionName.trim())
      
      // Use POST method like in tests - more reliable for complex queries
      // Always include query_by when explicitly requested by the caller.
      // Preserve quotes in query for exact phrase search
      
      const searchPath = searchAllCollections ? '/search' : `/collections/${encodedCollection}/documents/search`
      const url = buildApiUrl(baseUrlValue, useProxy, searchPath)
      const params = {
        limit: limit,
        highlight: true,  // Enable server-side highlighting
        include_created_at: true  // Default: true - include created_at in search results
      }

      if (modePayload) {
        Object.assign(params, modePayload)
      }

      if (options.offset !== undefined && options.offset !== null && options.offset !== '') {
        params.offset = Math.max(0, Number(options.offset) || 0)
      }

      const sortBy = normalizeSortBy(options.sortBy)
      if (sortBy) {
        params.sort_by = sortBy
      }
      
      // Add query if provided (required unless filter_by or vector_query is provided)
      if (trimmedQuery) {
        params.q = trimmedQuery  // Preserve quotes - don't remove them!
        if (modePayload && !params.query) {
          params.query = trimmedQuery
        }
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
      
      const requestConfig = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        signal
      }
      const postSearch = (requestUrl, configOverrides = {}) => axios.post(
        requestUrl,
        params,
        { ...requestConfig, ...configOverrides }
      )

      let response
      directSearchExecuted.value = true
      try {
        if (isDemoDeployment()) {
          response = await sampleDemoSearch(url, requestId, postSearch)
        } else {
          response = await postSearch(url)
        }
      } catch (proxyErr) {
        if (axios.isCancel(proxyErr) || requestId !== latestSearchRequestId) {
          return
        }

        // Retry directly only when the proxy itself is unavailable. Replaying
        // normal backend 4xx/5xx responses hides the original server error.
        const proxyStatus = proxyErr.response?.status
        const proxyUnavailable = !proxyErr.response || proxyStatus === 502 || proxyStatus === 504
        const hasDirectServerUrl = /^https?:\/\//i.test(baseUrlValue)
        if (useProxy && proxyUnavailable && hasDirectServerUrl && !baseUrlValue.includes('localhost:8080')) {
          const directUrl = buildApiUrl(baseUrlValue, false, searchPath)
          try {
            response = await postSearch(directUrl)
          } catch (directErr) {
            throw proxyErr
          }
        } else {
          throw proxyErr
        }
      }

      if (requestId !== latestSearchRequestId) return
      
      // Handle response structure: { hits: [...], found: number } or { results: [...] }
      if (response.data) {
        indexingInProgress.value = response.data.indexing_in_progress === true
        maybeResult.value = response.data.maybe || null
        // Handle standard search response format
        if (response.data.hits && Array.isArray(response.data.hits)) {
          // Store total found count
          totalFound.value = getSearchResponseResultCount(response).reported
          
          // Preserve backend order. The server already applies explicit
          // sort_by values, relevance order, and collection defaults such as
          // rank:asc for benchmark university collections.
          const sortedHits = [...response.data.hits]
          
          const normalizedResults = sortedHits.map(hit => {
            const displayScore = hit.score ?? hit._score ?? hit._text_match ?? hit.text_match ?? hit._textMatch ?? 0
            const textMatch = hit._text_match ?? hit.text_match ?? hit._textMatch ?? displayScore
            const scoreType = hit.score_type ?? hit.scoreType ?? hit._score_type ?? ''
            // Hits have structure: { document: {...}, highlights: {...}, _text_match: ..., created_at: ... }
            if (hit.document) {
              const doc = {
                id: hit.document.id || hit.id,
                title: hit.document.title || hit.document.name,
                content: hit.document.content || hit.document.description || hit.document.text,
                ...hit.document,  // Spread document fields (id, title, content, etc.) - this will override above if they exist
                _collection: hit._collection || hit.collection || hit.document._collection || hit.document.collection,
                _text_match: displayScore,
                text_match: textMatch,
                score: displayScore,
                score_type: scoreType,
                weight: hit.weight,
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
              _text_match: displayScore,
              text_match: textMatch,
              score: displayScore,
              score_type: scoreType,
              highlights: hit.highlights || {},
              created_at: hit.created_at || hit.timestamp
            }
            return doc
          })
          searchResults.value = normalizedResults
        } 
        // Handle results array format
        else if (response.data.results && Array.isArray(response.data.results)) {
          searchResults.value = response.data.results
          totalFound.value = Number(response.data.found ?? response.data.results.length)
        }
        // Handle direct array format
        else if (Array.isArray(response.data)) {
          searchResults.value = response.data
          totalFound.value = searchResults.value.length
        }
        // Handle error response
        else if (response.data.error) {
          const responseError = new Error(response.data.message || response.data.error || 'Search failed')
          responseError.response = {
            status: response.status,
            data: response.data
          }
          throw responseError
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
      if (requestId !== latestSearchRequestId || axios.isCancel(err)) {
        return
      }

      // Handle specific error cases
      if (err.response) {
        const status = err.response.status
        
        // Handle 404 - collection not found
        if (status === 404) {
          error.value = formatSearchErrorMessage(
            err,
            searchAllCollections ? 'No accessible collections were found' : `Collection "${collectionName}" not found`
          )
          return
        }
        
        // Handle 400 - bad request (invalid query, missing parameters, etc.)
        if (status === 400) {
          error.value = formatSearchErrorMessage(err, 'Invalid search request')
          return
        }
        
        // Handle 500 - server error
        if (status === 500) {
          error.value = formatSearchErrorMessage(err, 'Server error. Please try again later.')
          return
        }
        
        // Handle timeout
        if (status === 504 || err.code === 'ECONNABORTED') {
          error.value = formatSearchErrorMessage(err, 'Search request timed out. Please try again with a simpler query.')
          return
        }
      }
      
      // Handle network errors
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('Network Error')) {
        error.value = 'Cannot connect to server. Please check your connection and server status.'
        return
      }
      
      // Generic error handling
      const errorMsg = formatSearchErrorMessage(err, 'Search failed')
      error.value = errorMsg
      indexingInProgress.value = false
      directSearchExecuted.value = false
      maybeResult.value = null
    } finally {
      if (requestId === latestSearchRequestId) {
        loading.value = false
        activeSearchController = null
      }
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
    maybeResult,
    performSearch
  }
}
