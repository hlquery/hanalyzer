const nativeFetch = typeof window !== 'undefined' && typeof window.fetch === 'function'
  ? window.fetch.bind(window)
  : null

const USAGE_SKIP_HEADER = 'X-Hanalyzer-Usage-Skip'

const normalizeMethod = (method) => (method || 'GET').toUpperCase()

const sanitizeUrl = (value) => {
  if (!value) return ''

  try {
    const parsed = new URL(value, typeof window !== 'undefined' ? window.location.origin : undefined)
    return parsed.toString()
  } catch (_) {
    return String(value)
  }
}

const getUsageConfig = () => {
  if (typeof window === 'undefined') return null

  const config = window.HANALYZER_CONFIG || {}
  const usageConfig = config.usageOutput || {}
  const endpoint = typeof usageConfig.endpoint === 'string' ? usageConfig.endpoint.trim() : ''

  if (!endpoint) {
    return null
  }

  return {
    endpoint,
    token: typeof usageConfig.token === 'string' ? usageConfig.token.trim() : '',
    authScheme: usageConfig.authScheme === 'api-key' ? 'api-key' : 'bearer',
    includeHeaders: usageConfig.includeHeaders === true,
  }
}

const shouldSkipUsageForUrl = (url) => {
  const usageConfig = getUsageConfig()
  if (!usageConfig) return false

  return sanitizeUrl(url) === sanitizeUrl(usageConfig.endpoint)
}

const buildAuthHeaders = (usageConfig) => {
  if (!usageConfig?.token) {
    return {}
  }

  if (usageConfig.authScheme === 'api-key') {
    return {
      'X-API-Key': usageConfig.token,
    }
  }

  return {
    Authorization: `Bearer ${usageConfig.token}`,
  }
}

const sanitizeHeaders = (headersLike) => {
  if (!headersLike) return {}

  const output = {}

  if (headersLike instanceof Headers) {
    headersLike.forEach((value, key) => {
      output[key] = value
    })
    return output
  }

  Object.entries(headersLike).forEach(([key, value]) => {
    if (value == null) return
    output[key] = Array.isArray(value) ? value.join(', ') : String(value)
  })

  return output
}

export const recordUsageEvent = async (event) => {
  if (!nativeFetch) return

  const usageConfig = getUsageConfig()
  if (!usageConfig) return

  try {
    await nativeFetch(usageConfig.endpoint, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        [USAGE_SKIP_HEADER]: '1',
        ...buildAuthHeaders(usageConfig),
      },
      body: JSON.stringify({
        source: 'hanalyzer',
        emitted_at: new Date().toISOString(),
        event,
      }),
    })
  } catch (_) {
    // Fire-and-forget by design. Delivery failures must not affect the UI.
  }
}

export const installUsageRecorder = (axiosInstance) => {
  if (typeof window === 'undefined') return
  if (window.__HANALYZER_USAGE_RECORDER_INSTALLED__) return

  window.__HANALYZER_USAGE_RECORDER_INSTALLED__ = true

  axiosInstance.interceptors.request.use((config) => {
    if (config?.headers?.[USAGE_SKIP_HEADER]) {
      return config
    }

    const startedAt = Date.now()
    config.__hanalyzerUsageMeta = {
      startedAt,
      method: normalizeMethod(config.method),
      url: sanitizeUrl(config.url || ''),
      baseURL: sanitizeUrl(config.baseURL || ''),
    }

    return config
  })

  axiosInstance.interceptors.response.use(
    (response) => {
      const meta = response.config?.__hanalyzerUsageMeta
      const requestUrl = response.config?.url || ''

      if (meta && !shouldSkipUsageForUrl(requestUrl)) {
        const usageConfig = getUsageConfig()
        recordUsageEvent({
          kind: 'http',
          transport: 'axios',
          method: meta.method,
          url: meta.url,
          base_url: meta.baseURL,
          status: response.status,
          ok: response.status >= 200 && response.status < 400,
          duration_ms: Date.now() - meta.startedAt,
          request_headers: usageConfig?.includeHeaders ? sanitizeHeaders(response.config?.headers) : undefined,
        })
      }

      return response
    },
    (error) => {
      const meta = error.config?.__hanalyzerUsageMeta
      const requestUrl = error.config?.url || ''

      if (meta && !shouldSkipUsageForUrl(requestUrl)) {
        const usageConfig = getUsageConfig()
        recordUsageEvent({
          kind: 'http',
          transport: 'axios',
          method: meta.method,
          url: meta.url,
          base_url: meta.baseURL,
          status: error.response?.status || null,
          ok: false,
          duration_ms: Date.now() - meta.startedAt,
          error_message: error.message || 'request failed',
          request_headers: usageConfig?.includeHeaders ? sanitizeHeaders(error.config?.headers) : undefined,
        })
      }

      return Promise.reject(error)
    }
  )

  if (nativeFetch && !window.__HANALYZER_USAGE_FETCH_PATCHED__) {
    window.__HANALYZER_USAGE_FETCH_PATCHED__ = true

    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url || ''
      const method = normalizeMethod(init.method || (typeof input !== 'string' ? input?.method : 'GET'))
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {})

      if (headers.get(USAGE_SKIP_HEADER) === '1' || shouldSkipUsageForUrl(url)) {
        return nativeFetch(input, init)
      }

      const startedAt = Date.now()

      try {
        const response = await nativeFetch(input, init)
        const usageConfig = getUsageConfig()
        recordUsageEvent({
          kind: 'http',
          transport: 'fetch',
          method,
          url: sanitizeUrl(url),
          status: response.status,
          ok: response.ok,
          duration_ms: Date.now() - startedAt,
          request_headers: usageConfig?.includeHeaders ? sanitizeHeaders(headers) : undefined,
        })
        return response
      } catch (error) {
        const usageConfig = getUsageConfig()
        recordUsageEvent({
          kind: 'http',
          transport: 'fetch',
          method,
          url: sanitizeUrl(url),
          status: null,
          ok: false,
          duration_ms: Date.now() - startedAt,
          error_message: error?.message || 'fetch failed',
          request_headers: usageConfig?.includeHeaders ? sanitizeHeaders(headers) : undefined,
        })
        throw error
      }
    }
  }
}
