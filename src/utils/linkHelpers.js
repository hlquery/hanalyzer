const DEFAULT_LINK_PORT = '9200'

const canonicalizeHost = (host) => {
  const normalized = String(host || '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .toLowerCase()

  if (['localhost', '0.0.0.0', '::', '::1'].includes(normalized)) {
    return '127.0.0.1'
  }

  return normalized
}

const parseRawEndpoint = (endpoint) => {
  const raw = String(endpoint || '').trim().replace(/\/+$/, '')
  if (!raw) return { host: '', port: '', secure: false }

  const secure = /^https:\/\//i.test(raw)
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`

  try {
    const parsed = new URL(withScheme)
    return {
      host: parsed.hostname,
      port: parsed.port || DEFAULT_LINK_PORT,
      secure
    }
  } catch {
    return { host: raw, port: '', secure }
  }
}

export const getLinkEndpointParts = (node = {}) => {
  const endpoint = node.normalized_endpoint || node.endpoint || ''
  const parsed = parseRawEndpoint(endpoint)
  const host = canonicalizeHost(node.host || parsed.host)
  const port = String(node.port || parsed.port || DEFAULT_LINK_PORT).trim()

  return {
    host: host || '-',
    port: port || '-',
    secure: parsed.secure
  }
}

export const buildLinkEndpointKey = (node = {}) => {
  const parts = getLinkEndpointParts(node)
  if (parts.host === '-') return ''

  const formattedHost = parts.host.includes(':') ? `[${parts.host}]` : parts.host
  return `${parts.secure ? 'https://' : ''}${formattedHost}:${parts.port}`.toLowerCase()
}

export const findLinkPingResult = (responseData, targetKey) => {
  const candidates = [
    ...(Array.isArray(responseData?.nodes) ? responseData.nodes : []),
    ...(Array.isArray(responseData?.slaves) ? responseData.slaves : []),
    ...(responseData?.endpoint && typeof responseData.endpoint === 'object' ? [responseData.endpoint] : [])
  ]

  return candidates.find((candidate) => buildLinkEndpointKey(candidate) === targetKey) || null
}
