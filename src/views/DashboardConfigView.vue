<template>
  <div class="dashboard-conf-view">
    <LoadingSkeleton v-if="loading" variant="card" :lines="6" />

    <div v-else class="dashboard-conf-content">
      <div class="content-inner">
        <div class="collections-header">
          <div class="collections-title-section">
              <h1 class="collections-title-text dashboard-conf-title">HLQuery Config</h1>
          </div>
          <div class="dashboard-conf-actions">
            <router-link to="/dashboard" class="dashboard-conf-back">Dashboard</router-link>
          </div>
        </div>

        <v-alert
          v-if="error"
          type="warning"
          variant="tonal"
          class="mb-4"
          density="comfortable"
        >
          {{ error }}
        </v-alert>

        <section class="dashboard-settings-section metric-card">
          <div class="dashboard-settings-header">
            <div class="dashboard-settings-heading">
              <v-icon class="detail-card-icon">mdi-graph-outline</v-icon>
              <span class="detail-card-title">Configuration Topology</span>
            </div>
            <span class="dashboard-conf-count">{{ configFiles.length }} files</span>
          </div>

          <div class="dashboard-conf-topology">
            <svg
              class="dashboard-conf-links"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                v-for="link in topologyLinks"
                :key="link.key"
                :x1="link.x1"
                :y1="link.y1"
                :x2="link.x2"
                :y2="link.y2"
              />
            </svg>
            <button
              v-for="node in topologyNodes"
              :key="node.name"
              type="button"
              class="dashboard-conf-node"
              :class="{ 'dashboard-conf-node--active': node.name === activeFileName }"
              :style="{ left: `${node.x}%`, top: `${node.y}%` }"
              @click="activeFileName = node.name"
            >
              <v-icon :icon="node.icon" size="20" />
              <span>{{ node.label }}</span>
              <small>{{ node.meta }}</small>
            </button>
          </div>
        </section>

        <section class="dashboard-settings-section metric-card dashboard-conf-details-section">
          <div class="dashboard-settings-header">
            <div class="dashboard-settings-heading">
              <v-icon class="detail-card-icon">mdi-tag-multiple-outline</v-icon>
              <span class="detail-card-title">{{ selectedFile?.name || 'Configuration' }}</span>
            </div>
            <span class="dashboard-conf-count">sanitized tags</span>
          </div>

          <div v-if="configFiles.length > 1" class="dashboard-conf-file-tabs">
            <button
              v-for="file in configFiles"
              :key="file.name"
              type="button"
              class="dashboard-conf-file-tab"
              :class="{ 'dashboard-conf-file-tab--active': file.name === activeFileName }"
              @click="activeFileName = file.name"
            >
              {{ file.name }}
            </button>
          </div>

          <div v-if="tagSummaryRows.length" class="dashboard-conf-tag-grid">
            <div v-for="tag in tagSummaryRows" :key="tag.name" class="dashboard-conf-tag-card">
              <div class="dashboard-conf-tag-name">&lt;{{ tag.name }}&gt;</div>
              <div class="dashboard-conf-tag-meta">{{ tag.count }} {{ tag.count === 1 ? 'node' : 'nodes' }} &middot; {{ tag.attributeCount }} attrs</div>
            </div>
          </div>

          <div class="dashboard-settings-table-wrap">
            <v-table class="dashboard-settings-table">
              <tbody>
                <tr v-for="row in selectedRows" :key="`${row.key}:${row.line || ''}`">
                  <td class="dashboard-conf-key">
                    <span>{{ row.key }}</span>
                    <span v-if="row.line" class="dashboard-conf-line">line {{ row.line }}</span>
                  </td>
                  <td class="text-right dashboard-conf-value">{{ row.value }}</td>
                </tr>
                <tr v-if="!selectedRows.length">
                  <td class="dashboard-conf-key">No entries</td>
                  <td class="text-right dashboard-conf-value">This file has no parsed configuration tags.</td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import axios from 'axios'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import { buildApiUrl, getBaseUrlValue, shouldUseProxy } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'

const baseUrl = inject('baseUrl', ref('http://localhost:9200'))
const loading = ref(false)
const error = ref(null)
const configFiles = ref([])
const activeFileName = ref('')

const getDefaultSearchConfig = () => ({
  algorithm: 'bm25+',
  k1: '1.2',
  b: '0.75',
  delta: '1.0',
  max_query_length: '1000',
  max_query_terms: '50',
  enable_stemming: true,
  enable_synonyms: true,
  enable_fuzzy: false,
  default_limit: 0,
  max_limit: '1000',
  min_limit: '1',
  max_offset: 100000,
  idf_cache: true,
  doc_length_cache: true,
  max_cache_size_mb: '512',
  cache_ttl_seconds: 3600,
  query_timeout_ms: '5000',
  indexing_timeout_ms: '30000',
  max_candidates: 10000,
  min_candidates: '10',
  min_score_threshold: '0.0',
  normalize_scores: true,
  score_precision: '6',
  enable_score_explanation: false,
  enable_wildcards: true,
  enable_prefix_matching: true,
  store_positions: true,
  store_offsets: false,
  track_total_hits: true,
  track_scores: true,
  request_cache: true,
  allow_partial_search_results: true,
  log_queries: false,
  log_slow_queries: true,
  slow_query_threshold_ms: '1000',
  log_level: 1
})

const formatValue = (value) => {
  if (value === null) return 'null'
  if (value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : String(value)
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const getTagNameFromKey = (key) => {
  const match = String(key || '').match(/^([A-Za-z_][A-Za-z0-9_-]*)\[/)
  return match ? match[1] : 'config'
}

const getTagInstanceFromKey = (key) => {
  const match = String(key || '').match(/^([A-Za-z_][A-Za-z0-9_-]*\[\d+\])/)
  return match ? match[1] : String(key || 'config')
}

const getFileKind = (name) => {
  const normalized = String(name || '').toLowerCase()
  if (normalized.includes('module')) return { label: 'modules', icon: 'mdi-puzzle-outline' }
  if (normalized.includes('search')) return { label: 'search', icon: 'mdi-magnify' }
  if (normalized.includes('link')) return { label: 'links', icon: 'mdi-lan-connect' }
  if (normalized.includes('storage') || normalized.includes('rock')) return { label: 'storage', icon: 'mdi-database-outline' }
  return { label: 'server', icon: 'mdi-server-outline' }
}

const flattenConfig = (value, prefix = '') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return flattenConfig(child, path)
    }
    return [{ key: path, value: formatValue(child) }]
  })
}

const configRows = computed(() => {
  const source = getDefaultSearchConfig()
  return flattenConfig(source).sort((a, b) => a.key.localeCompare(b.key))
})

const selectedFile = computed(() => {
  if (!configFiles.value.length) return null
  return configFiles.value.find(file => file.name === activeFileName.value) || configFiles.value[0]
})

const selectedRows = computed(() => {
  const rows = selectedFile.value?.rows
  if (!Array.isArray(rows)) return []
  return rows
    .map(row => ({
      key: row.key || '',
      value: formatValue(row.value),
      line: row.line
    }))
    .filter(row => row.key)
})

const tagSummaryRows = computed(() => {
  const summary = new Map()

  selectedRows.value.forEach((row) => {
    const tagName = getTagNameFromKey(row.key)
    const tagInstance = getTagInstanceFromKey(row.key)
    if (!summary.has(tagName)) {
      summary.set(tagName, { name: tagName, instances: new Set(), attributeCount: 0 })
    }

    const item = summary.get(tagName)
    item.instances.add(tagInstance)
    if (String(row.key || '').includes('.')) {
      item.attributeCount += 1
    }
  })

  return Array.from(summary.values())
    .map(item => ({
      name: item.name,
      count: item.instances.size,
      attributeCount: item.attributeCount
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const topologyNodes = computed(() => {
  const files = configFiles.value.length ? configFiles.value : buildFallbackConfigFiles()
  const count = Math.max(files.length, 1)
  return files.map((file, index) => {
    const kind = getFileKind(file.name)
    const angle = count === 1 ? -Math.PI / 2 : (Math.PI * 2 * index / count) - Math.PI / 2
    const rows = Array.isArray(file.rows) ? file.rows : []
    const tags = new Set(rows.map(row => getTagNameFromKey(row.key)).filter(Boolean))

    return {
      name: file.name,
      label: kind.label,
      icon: kind.icon,
      meta: `${tags.size} tags`,
      x: 50 + Math.cos(angle) * 34,
      y: 50 + Math.sin(angle) * 34
    }
  })
})

const topologyLinks = computed(() => {
  return topologyNodes.value
    .filter(node => node.name !== activeFileName.value)
    .map(node => ({
      key: `${activeFileName.value}:${node.name}`,
      x1: 50,
      y1: 50,
      x2: node.x,
      y2: node.y
    }))
})

const buildFallbackConfigFiles = () => ([{
  name: 'search-config',
  path: '/search-config',
  exists: true,
  truncated: false,
  rows: configRows.value
}])

const loadConfig = async () => {
  loading.value = true
  error.value = null

  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const url = buildApiUrl(baseUrlValue, useProxy, '/config-files')
    const response = await axios.get(url, { timeout: 5000 })

    if (response.data && Array.isArray(response.data.files)) {
      configFiles.value = response.data.files
        .filter(file => file && typeof file === 'object')
        .map(file => ({
          name: file.name || 'config',
          path: file.path || '',
          exists: file.exists !== false,
          truncated: file.truncated === true,
          rows: Array.isArray(file.rows) ? file.rows : []
        }))
      activeFileName.value = response.data.main || configFiles.value[0]?.name || ''
    } else {
      configFiles.value = buildFallbackConfigFiles()
      activeFileName.value = configFiles.value[0].name
      error.value = 'Configuration files endpoint returned an unexpected response. Showing search defaults.'
    }
  } catch (err) {
    configFiles.value = buildFallbackConfigFiles()
    activeFileName.value = configFiles.value[0].name
    error.value = `Configuration files endpoint unavailable. Showing search defaults. ${extractSafeErrorMessage(err, '')}`.trim()
  } finally {
    loading.value = false
  }
}

onMounted(loadConfig)
</script>

<style scoped>
.dashboard-conf-view {
  width: 100%;
  min-height: 100%;
  background: transparent;
  overflow-x: hidden;
}

.dashboard-conf-content {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 28px 24px;
}

.content-inner {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
}

.collections-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.collections-title-section {
  min-width: 0;
}

.collections-title-text.dashboard-conf-title {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
}

.dashboard-conf-actions {
  flex: 0 0 auto;
}

.dashboard-conf-back {
  color: #043061;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.dashboard-conf-back:hover,
.dashboard-conf-back:focus-visible {
  text-decoration: underline;
}

.dashboard-conf-back:focus,
.dashboard-conf-back:focus-visible,
.dashboard-conf-back:active {
  outline: none;
  box-shadow: none;
  border: 0;
}

.dashboard-settings-section {
  width: 100%;
  border-radius: 14px !important;
  box-shadow: none !important;
  background: transparent !important;
}

.dashboard-conf-details-section {
  margin-top: 18px;
}

.dashboard-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 0;
  padding: 14px 16px;
  border: 1px solid #d8e1eb;
  border-bottom: none;
  border-radius: 14px 14px 0 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.dashboard-settings-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dashboard-conf-topology {
  position: relative;
  min-height: 340px;
  border: 1px solid #d8e1eb;
  border-radius: 0 0 14px 14px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 50%, rgba(4, 48, 97, 0.08) 0, rgba(4, 48, 97, 0.08) 84px, transparent 85px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.dashboard-conf-links {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.dashboard-conf-links line {
  stroke: #9fb1c4;
  stroke-width: 0.55;
  stroke-dasharray: 3 2;
}

.dashboard-conf-topology::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 92px;
  height: 92px;
  border: 1px solid #b9c7d8;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  color: #043061;
  content: "HLQuery";
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
  transform: translate(-50%, -50%);
}

.dashboard-conf-node {
  position: absolute;
  z-index: 1;
  width: 128px;
  min-height: 74px;
  padding: 10px;
  border: 1px solid #d8e1eb;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  display: grid;
  gap: 4px;
  place-items: center;
  transform: translate(-50%, -50%);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.dashboard-conf-node:hover,
.dashboard-conf-node:focus-visible {
  border-color: #043061;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  outline: none;
  transform: translate(-50%, -50%) translateY(-1px);
}

.dashboard-conf-node--active {
  border-color: #043061;
  background: #f8fafc;
  color: #043061;
}

.dashboard-conf-node span {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.15;
}

.dashboard-conf-node small {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.detail-card-icon {
  font-size: 18px;
  color: #64748b;
}

.detail-card-title {
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}

.dashboard-conf-count {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.dashboard-conf-file-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-right: 1px solid #d8e1eb;
  border-left: 1px solid #d8e1eb;
  background: rgba(255, 255, 255, 0.98);
}

.dashboard-conf-file-tab {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #d8e1eb;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.dashboard-conf-file-tab:hover {
  border-color: #9fb1c4;
}

.dashboard-conf-file-tab:focus,
.dashboard-conf-file-tab:focus-visible,
.dashboard-conf-file-tab:active {
  outline: none;
  box-shadow: none;
}

.dashboard-conf-file-tab--active {
  border-color: #043061;
  background: #043061;
  color: #ffffff;
}

.dashboard-conf-tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  padding: 12px 16px;
  border-right: 1px solid #d8e1eb;
  border-left: 1px solid #d8e1eb;
  background: rgba(255, 255, 255, 0.98);
}

.dashboard-conf-tag-card {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.dashboard-conf-tag-name {
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.dashboard-conf-tag-meta {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.dashboard-settings-table-wrap {
  border: 1px solid #d8e1eb;
  border-top: none;
  border-radius: 0 0 14px 14px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.96) 100%);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.dashboard-settings-table {
  background: transparent !important;
}

.dashboard-settings-table :deep(.v-table__wrapper),
.dashboard-settings-table :deep(table) {
  background: transparent !important;
}

.dashboard-settings-table :deep(tbody tr:nth-child(even)) {
  background: #f8fafc;
}

.dashboard-settings-table :deep(td) {
  padding: 14px 18px;
  font-size: 14px;
  color: #334155;
  border-bottom-color: #e2e8f0 !important;
}

.dashboard-conf-key {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #0f172a !important;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.dashboard-conf-key span {
  display: block;
}

.dashboard-conf-line {
  margin-top: 3px;
  color: #94a3b8;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
}

.dashboard-conf-value {
  max-width: 520px;
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .dashboard-conf-content {
    padding: 20px 16px;
  }

  .content-inner {
    width: 100%;
    max-width: 100%;
  }

  .collections-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboard-conf-topology {
    min-height: 520px;
  }

  .dashboard-conf-node {
    width: 112px;
  }

  .dashboard-settings-table :deep(td) {
    display: block;
    width: 100%;
    text-align: left !important;
  }
}
</style>
