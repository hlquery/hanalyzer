<template>
  <div class="links-view">
    <div class="links-toolbar">
      <div class="links-title-block">
        <h1 class="links-page-title">Links</h1>
        <div class="links-page-subtitle">Configured cluster endpoints and current connection status.</div>
      </div>
      <div class="links-actions">
        <div class="links-last-check">Last check: {{ lastCheckLabel }}</div>
      </div>
    </div>

    <div v-if="displayLinks.length > 0" class="links-summary-row">
      <div class="links-summary-card">
        <div class="links-summary-label">Total Links</div>
        <div class="links-summary-value">{{ displayLinks.length }}</div>
      </div>
      <div class="links-summary-card">
        <div class="links-summary-label">Connected</div>
        <div class="links-summary-value links-summary-value--ok">{{ connectedCount }}</div>
      </div>
      <div class="links-summary-card">
        <div class="links-summary-label">Disconnected</div>
        <div class="links-summary-value links-summary-value--bad">{{ disconnectedCount }}</div>
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <v-card v-if="loading" class="mb-card">
      <v-card-text class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
        <div>Loading cluster links...</div>
      </v-card-text>
    </v-card>

    <v-card v-else-if="displayLinks.length === 0" class="mb-card card-premium links-empty-card">
      <v-card-text class="links-empty-state">
        <div class="links-empty-icon">
          <v-icon icon="mdi-lan-disconnect" size="30" />
        </div>
        <div class="links-empty-title">No cluster links configured</div>
        <div class="links-empty-copy">Add peers in `links.conf` to see their connection status here.</div>
      </v-card-text>
    </v-card>

    <v-card v-else class="collections-card card-premium animate-fade-in links-table-card">
      <v-card-text class="links-table-shell">
      <v-data-table
        :headers="nodeHeaders"
        :items="linkItems"
        item-value="key"
        class="collections-table links-nodes-table"
        hide-default-footer
        :sort-by="nodeSortBy"
        @update:sort-by="nodeSortBy = $event"
      >
        <template v-slot:item.endpoint="{ item }">
          <div class="node-endpoint-lines">
            <div class="node-endpoint-main">{{ getEndpointParts(getItemRow(item)).host }}</div>
            <div class="node-endpoint-sub">Port {{ getEndpointParts(getItemRow(item)).port }}</div>
          </div>
        </template>

        <template v-slot:item.normalized_endpoint="{ item }">
          <span class="links-mono">{{ getItemRow(item).normalized_endpoint || getItemRow(item).endpoint || '-' }}</span>
        </template>

        <template v-slot:item.status_code="{ item }">
          <span>{{ getItemRow(item).status_code || '-' }}</span>
        </template>

        <template v-slot:item.latency_ms="{ item }">
          <span class="links-mono">{{ formatLatency(getItemRow(item).latency_ms, getItemRow(item).reachable) }}</span>
        </template>

        <template v-slot:item.ping_action="{ item }">
          <div class="links-ping-action">
            <button
              type="button"
              class="links-ping-link"
              :title="`Ping from this hlquery server to ${getItemRow(item).normalized_endpoint || getItemRow(item).endpoint || 'the selected node'}, not from your web client.`"
              :disabled="isPingingRow(getItemRow(item))"
              @click="pingNode(getItemRow(item))"
            >
              Ping
            </button>
          </div>
        </template>

        <template v-slot:item.last_message="{ item }">
          <span class="links-message-cell">{{ getLastMessage(getItemRow(item)) }}</span>
        </template>

        <template v-slot:item.last_attempt="{ item }">
          <span class="links-time-cell">{{ formatAttemptTime(getItemRow(item).last_attempt) }}</span>
        </template>

        <template v-slot:item.status="{ item }">
          <v-chip
            size="small"
            :color="getItemRow(item).reachable ? 'success' : 'error'"
            :class="['links-status-chip', { 'links-status-chip--down': !getItemRow(item).reachable }]"
            variant="flat"
          >
            {{ getItemRow(item).reachable ? 'Connected' : 'Disconnected' }}
          </v-chip>
        </template>

        <template v-slot:item.link_type="{ item }">
          <v-chip
            size="small"
            :color="getItemRow(item).link_type === 'Slave' ? 'secondary' : 'default'"
            class="links-type-chip"
            variant="tonal"
          >
            {{ getItemRow(item).link_type }}
          </v-chip>
        </template>
      </v-data-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import axios from 'axios'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { authManager } from '../composables/useAuth'

const baseUrl = inject('baseUrl')

const loading = ref(false)
const error = ref(null)
const links = ref([])
const lastLinksCheck = ref(null)
const nodeSortBy = ref([{ key: 'status', order: 'desc' }])
const pingingRows = ref({})
const pingOverrides = ref({})

const getItemRow = (item) => {
  if (!item) return {}
  return item.raw || item
}

const canonicalizeHost = (host) => {
  if (!host) return ''
  const lowered = String(host).trim().toLowerCase()
  if (lowered === 'localhost') return '127.0.0.1'
  return lowered
}

const getEndpointParts = (node) => {
  const row = getItemRow(node)
  const host = canonicalizeHost(row.host)
  const port = String(row.port || '').trim()
  if (host || port) {
    return { host: host || '-', port: port || '-' }
  }

  const endpoint = String(row.endpoint || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (endpoint.includes(':')) {
    const parts = endpoint.split(':')
    return { host: parts[0] || '-', port: parts.slice(1).join(':') || '-' }
  }

  return { host: endpoint || '-', port: '-' }
}

const buildEndpointKey = (node) => {
  const row = getItemRow(node)
  const normalized = String(row.normalized_endpoint || '').trim().toLowerCase()
  if (normalized) return normalized

  const endpoint = String(row.endpoint || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (endpoint) return endpoint

  const parts = getEndpointParts(row)
  return `${parts.host}:${parts.port}`.toLowerCase()
}

const mergeLinkRows = (current, incoming) => {
  const roles = new Set([
    ...String(current.link_type || '').split(',').map(value => value.trim()).filter(Boolean),
    ...String(incoming.link_type || '').split(',').map(value => value.trim()).filter(Boolean)
  ])

  return {
    ...current,
    ...incoming,
    endpoint: current.endpoint || incoming.endpoint,
    normalized_endpoint: current.normalized_endpoint || incoming.normalized_endpoint,
    host: current.host || incoming.host,
    port: current.port || incoming.port,
    reachable: Boolean(current.reachable || incoming.reachable),
    status_code: current.status_code || incoming.status_code,
    latency_ms: Math.max(Number(current.latency_ms || 0), Number(incoming.latency_ms || 0)),
    error: current.error || incoming.error,
    link_type: Array.from(roles).join(', ')
  }
}

const displayLinks = computed(() => {
  const merged = new Map()

  for (const link of links.value) {
    const row = getItemRow(link)
    const key = buildEndpointKey(row)
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, { ...row })
      continue
    }

    merged.set(key, mergeLinkRows(existing, row))
  }

  return Array.from(merged.values())
    .map((row) => {
      const key = buildEndpointKey(row)
      const override = pingOverrides.value[key]
      if (!override) {
        return row
      }

      return {
        ...row,
        reachable: typeof override.reachable === 'boolean' ? override.reachable : row.reachable,
        latency_ms: override.latency_ms ?? row.latency_ms,
        status_code: override.status_code ?? row.status_code,
        error: override.error ?? null
      }
    })
})

const linkItems = computed(() => {
  return displayLinks.value.map((link, index) => {
    const row = getItemRow(link)
    return {
      ...row,
      key: `${buildEndpointKey(row)}:${index}`,
      status: row.reachable ? 'Connected' : 'Disconnected',
      last_message: getLastMessage(row),
      last_attempt: lastLinksCheck.value
    }
  })
})

const connectedCount = computed(() => displayLinks.value.filter((node) => getItemRow(node).reachable).length)
const disconnectedCount = computed(() => Math.max(displayLinks.value.length - connectedCount.value, 0))

const lastCheckLabel = computed(() => formatAttemptTime(lastLinksCheck.value))

const nodeHeaders = [
  { title: 'Endpoint', key: 'endpoint', sortable: true },
  { title: 'Normalized', key: 'normalized_endpoint', sortable: true },
  { title: 'Role', key: 'link_type', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'HTTP', key: 'status_code', sortable: true },
  { title: 'Ping', key: 'latency_ms', sortable: true },
  { title: 'Action', key: 'ping_action', sortable: false },
  { title: 'Message', key: 'last_message', sortable: true },
  { title: 'Last Check', key: 'last_attempt', sortable: true }
]

const formatLatency = (latency, reachable = true) => {
  if (reachable === false) return '-'
  if (latency === null || latency === undefined) return '-'
  const value = Number(latency)
  if (Number.isNaN(value)) return '-'
  return `${Math.round(value)} ms`
}

const formatAttemptTime = (ts) => {
  if (!ts) return 'Never'
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleString()
}

const getLastMessage = (node) => {
  if (!node) return '-'
  if (node.error) return node.error
  if (node.status_code && Number(node.status_code) >= 400) return `HTTP ${node.status_code}`
  if (node.reachable === true) return 'Connected'
  if (node.reachable === false) return 'Disconnected'
  return '-'
}

const getNodeBaseUrl = (node) => {
  const row = getItemRow(node)
  const rawEndpoint = String(row.endpoint || row.normalized_endpoint || '').trim()
  if (rawEndpoint) {
    const withProtocol = rawEndpoint.startsWith('http://') || rawEndpoint.startsWith('https://')
      ? rawEndpoint
      : `http://${rawEndpoint}`
    return withProtocol.replace(/\/+$/, '')
  }

  const parts = getEndpointParts(row)
  const host = String(parts.host || '').trim()
  const port = String(parts.port || '').trim()
  if (!host || host === '-') {
    return ''
  }
  return `http://${host}${port && port !== '-' ? `:${port}` : ''}`
}

const isPingingRow = (node) => {
  return Boolean(pingingRows.value[buildEndpointKey(node)])
}

const pingNode = async (node) => {
  const key = buildEndpointKey(node)
  const targetBaseUrl = getNodeBaseUrl(node)

  if (!key || !targetBaseUrl || isPingingRow(node)) {
    return
  }

  pingingRows.value = {
    ...pingingRows.value,
    [key]: true
  }

  const startedAt = performance.now()
  const requestUrl = `${targetBaseUrl}/health`
  const authHeaders = {
    ...authManager.getAuthHeaders(targetBaseUrl),
    ...authManager.getAuthHeaders(getBaseUrlValue(baseUrl))
  }

  try {
    const response = await axios.get(requestUrl, {
      timeout: 5000,
      headers: authHeaders
    })

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt))
    pingOverrides.value = {
      ...pingOverrides.value,
      [key]: {
        reachable: true,
        latency_ms: latencyMs,
        status_code: response.status,
        error: null
      }
    }
    lastLinksCheck.value = Date.now()
  } catch (err) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt))
    pingOverrides.value = {
      ...pingOverrides.value,
      [key]: {
        reachable: false,
        latency_ms: null,
        status_code: err.response?.status || null,
        error: err.response?.data?.error || err.message || 'Ping failed'
      }
    }
    lastLinksCheck.value = Date.now()
  } finally {
    pingingRows.value = {
      ...pingingRows.value,
      [key]: false
    }
  }
}

const fetchLinks = async (path, stateRef) => {
  stateRef.value = true
  error.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, path)
    const response = await axios.get(url, { timeout: 10000 })
    const clusterNodes = Array.isArray(response.data?.nodes)
      ? response.data.nodes.map((node) => ({ ...node, link_type: 'Cluster' }))
      : []
    const slaveNodes = Array.isArray(response.data?.slaves)
      ? response.data.slaves.map((node) => ({ ...node, link_type: 'Slave' }))
      : []
    links.value = [...clusterNodes, ...slaveNodes]
    lastLinksCheck.value = Date.now()
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to load cluster links'
    if (path === '/links') {
      links.value = []
    }
  } finally {
    stateRef.value = false
  }
}

const loadLinks = async () => {
  await fetchLinks('/links', loading)
}

onMounted(async () => {
  await loadLinks()
})
</script>

<style scoped>
.links-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.links-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.links-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.links-page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
}

.links-page-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
}

.links-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.links-last-check {
  font-size: 0.92rem;
  color: #6b7280;
}

.links-summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.links-summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 14px 16px;
}

.links-summary-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.links-summary-value {
  margin-top: 6px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.links-summary-value--ok {
  color: #15803d;
}

.links-summary-value--bad {
  color: #b91c1c;
}

.links-empty-card,
.links-table-card {
  overflow: hidden;
  border: 1px solid #e5e7eb !important;
  box-shadow: none !important;
}

.links-empty-card:hover,
.links-table-card:hover {
  transform: none !important;
  box-shadow: none !important;
}

.links-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  gap: 12px;
}

.links-empty-icon {
  width: 58px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: #fef2f2;
  color: #dc2626;
}

.links-empty-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
}

.links-empty-copy {
  max-width: 520px;
  color: #6b7280;
}

.links-table-shell {
  padding: 0 !important;
}

.links-nodes-table :deep(.v-data-table__thead th) {
  background: #f9fafb !important;
  color: #374151 !important;
  font-size: 0.76rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid #e5e7eb !important;
}

.links-nodes-table :deep(.v-data-table__tbody td) {
  border-bottom: 1px solid #f3f4f6 !important;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  vertical-align: middle;
}

.links-nodes-table :deep(.v-data-table__tbody tr:hover) {
  background: #fafafa !important;
  transform: none !important;
  box-shadow: none !important;
  cursor: default !important;
}

.links-nodes-table :deep(.v-data-table__tbody tr:hover td) {
  background: #fafafa !important;
}

.node-endpoint-lines {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.node-endpoint-main {
  font-weight: 600;
  color: #111827;
}

.node-endpoint-sub {
  font-size: 0.82rem;
  color: #6b7280;
}

.links-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
  color: #374151;
}

.links-message-cell,
.links-time-cell {
  color: #4b5563;
}

.links-ping-action {
  display: flex;
  justify-content: center;
}

.links-ping-link {
  min-width: 78px;
  border: none;
  padding: 0.18rem 0.9rem;
  background: #000000;
  color: #ffffff;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.1;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.28),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.18);
  transition: background 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.links-ping-link::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, transparent 52%);
  pointer-events: none;
}

.links-ping-link:hover:not(:disabled) {
  background: #000000;
  box-shadow:
    0 4px 9px rgba(0, 0, 0, 0.34),
    0 2px 4px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}

.links-ping-link:active:not(:disabled) {
  background: #111111;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.26),
    0 1px 2px rgba(0, 0, 0, 0.18),
    inset 0 2px 4px rgba(0, 0, 0, 0.24);
}

.links-ping-link:disabled {
  opacity: 0.6;
  cursor: default;
}

.links-type-chip {
  font-weight: 600;
}

.links-status-chip {
  min-width: 116px;
  justify-content: center;
  font-weight: 700;
}

.links-status-chip--down {
  box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.16);
}

@media (max-width: 900px) {
  .links-summary-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .links-toolbar {
    align-items: flex-start;
  }

  .links-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
