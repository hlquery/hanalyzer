<template>
  <div class="sql-view">
    <div class="collections-header sql-header">
      <div class="collections-title-section">
        <h1 class="collections-title-text sql-title-text">
          <v-icon icon="mdi-console-line" class="sql-title-icon" aria-hidden="true" />
          <span class="sql-title-chars" aria-label="SQL">
            <span>S</span>
            <span>Q</span>
            <span>L</span>
          </span>
        </h1>
        <div class="sql-subtitle">
          Run SQL queries against the server and inspect the result set below.
        </div>
      </div>
    </div>

    <div class="sql-query-card">
      <div class="sql-query-card-text">
        <v-textarea
          v-model="query"
          variant="plain"
          class="sql-query-input"
          placeholder="SELECT * FROM food LIMIT 20;"
          rows="4"
          auto-grow
          hide-details
          spellcheck="false"
          @keydown.ctrl.enter.prevent="runQuery(1)"
        />

        <div class="sql-query-examples">
          <div class="sql-example-label">Examples</div>
          <div
            v-for="group in sqlExampleGroups"
            :key="group.title"
            class="sql-example-group"
          >
            <div class="sql-example-group-title">{{ group.title }}</div>
            <button
              v-for="example in group.items"
              :key="example.sql"
              class="sql-example-chip"
              :class="{ 'sql-example-chip--active': isExampleActive(example.sql) }"
              type="button"
              :title="example.description"
              :aria-pressed="isExampleActive(example.sql)"
              @click="applyExample(example.sql)"
            >
              <span class="sql-example-chip-title">{{ example.label }}</span>
              <code>{{ example.sql }}</code>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="sql-query-footer">
      <button
        type="button"
        class="sql-action-btn sql-clear-btn"
        @click="clearQuery"
        :disabled="loading && !query.trim()"
      >
        Clear
      </button>
      <button
        type="button"
        class="sql-action-btn sql-run-btn"
        :disabled="loading"
        @click="runQuery(1)"
      >
        Run SQL
      </button>
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      class="sql-alert"
      closable
      @click:close="errorMessage = ''"
    >
      <div class="font-weight-bold mb-1">SQL Error</div>
      <div>{{ errorMessage }}</div>
    </v-alert>

    <v-alert
      v-if="queryInfo"
      type="info"
      variant="tonal"
      class="sql-alert"
    >
      <div class="font-weight-bold mb-1">{{ queryInfo.title }}</div>
      <div>{{ queryInfo.message }}</div>
    </v-alert>

    <v-card v-if="loading" class="sql-results-card sql-state-card" elevation="0">
      <v-card-text class="text-center py-10">
        <v-progress-circular indeterminate color="primary" size="34" width="3" />
        <div class="sql-state-title mt-4">Running query</div>
        <div class="sql-state-copy">Waiting for the server response.</div>
      </v-card-text>
    </v-card>

    <div v-else-if="hasRows" class="sql-results-block">
      <div class="sql-results-header">
        <div class="sql-results-header-main">
          <div class="sql-results-title">Results</div>
          <div class="sql-results-meta">
            <span>{{ totalRows }} row{{ totalRows === 1 ? '' : 's' }}</span>
            <span v-if="formattedSearchTimeMs !== null">· {{ formattedSearchTimeMs }} ms</span>
            <span v-if="totalPages > 0">· Page {{ currentPage }} of {{ totalPages }}</span>
          </div>
        </div>
      </div>

      <div class="sql-results-body">
        <div class="sql-grid-shell" :style="{ '--sql-grid-columns': `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }">
          <div class="sql-grid-row sql-grid-header">
            <div v-for="column in columns" :key="column" class="sql-grid-cell sql-grid-header-cell">
              {{ column }}
            </div>
          </div>

          <div v-for="(row, rowIndex) in rows" :key="`sql-row-${rowIndex}`" class="sql-grid-row">
            <div v-for="column in columns" :key="`${rowIndex}-${column}`" class="sql-grid-cell sql-grid-data-cell">
              <a
                v-if="isClickableIdCell(column, row?.[column])"
                class="sql-cell-link"
                :title="`Open row ${formatCell(row?.[column])}`"
                :href="getRowHref(row?.[column])"
                @click="openRowById(row?.[column], $event)"
              >
                <span class="sql-cell-value">
                  {{ formatCell(row?.[column]) }}
                </span>
              </a>
              <span v-else class="sql-cell-value" :title="formatCell(row?.[column])">
                {{ formatCell(row?.[column]) }}
              </span>
            </div>
          </div>
        </div>

        <div class="sql-pagination-row" v-if="totalPages > 1">
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="5"
            density="compact"
            class="sql-pagination"
            @update:model-value="handlePageChange"
          />
        </div>
      </div>
    </div>

    <v-card v-else-if="!loading && ranOnce" class="sql-results-card sql-state-card" elevation="0">
      <v-card-text class="text-center sql-state-card-text">
        <v-icon icon="mdi-database-off-outline" size="42" color="#94a3b8" class="mb-3" />
        <div class="sql-state-title">No rows returned</div>
        <div class="sql-state-copy">Try a different query or check whether the statement is a write query.</div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { buildApiUrl, getBaseUrlValue, shouldUseProxy, getErrorMessage } from '../utils/apiHelpers'

const router = useRouter()
const route = useRoute()
const baseUrl = inject('baseUrl')

const query = ref('')
const loading = ref(false)
const errorMessage = ref('')
const queryInfo = ref(null)
const rows = ref([])
const columns = ref([])
const totalRows = ref(0)
const totalPages = ref(0)
const currentPage = ref(1)
const perPage = ref(20)
const searchTimeMs = ref(null)
const ranOnce = ref(false)

const sqlExampleGroups = [
  {
    title: 'Browse',
    items: [
      {
        label: 'List collections',
        sql: 'SHOW COLLECTIONS;',
        description: 'Return the collections available on the server.'
      },
      {
        label: 'Query all',
        sql: 'SELECT * FROM food LIMIT 20;',
        description: 'Return every field from a collection with a bounded result set.'
      },
      {
        label: 'Pick fields',
        sql: 'SELECT id, title, score FROM food LIMIT 20;',
        description: 'Return only the fields you want to inspect.'
      }
    ]
  },
  {
    title: 'Text',
    items: [
      {
        label: 'Contains',
        sql: "SELECT id, title FROM food WHERE title CONTAINS 'apple' LIMIT 20;",
        description: 'Match rows where the field contains a value anywhere in the text.'
      },
      {
        label: 'Not contains',
        sql: "SELECT id, title FROM food WHERE title NOT CONTAINS 'apple' LIMIT 20;",
        description: 'Exclude rows where the field contains a value.'
      },
      {
        label: 'LIKE',
        sql: "SELECT id, title FROM food WHERE title LIKE '%apple%' LIMIT 20;",
        description: 'Use SQL wildcard matching with percent and underscore patterns.'
      },
      {
        label: 'ILIKE',
        sql: "SELECT id, title FROM food WHERE title ILIKE '%Apple%' LIMIT 20;",
        description: 'Use case-insensitive wildcard matching.'
      }
    ]
  },
  {
    title: 'Filters',
    items: [
      {
        label: 'Equals',
        sql: "SELECT id, title FROM food WHERE category = 'fruit' LIMIT 20;",
        description: 'Match an exact scalar field value.'
      },
      {
        label: 'Range',
        sql: 'SELECT id, title, price FROM food WHERE price BETWEEN 10 AND 50 ORDER BY price ASC LIMIT 20;',
        description: 'Filter numeric values between two bounds.'
      },
      {
        label: 'IN list',
        sql: "SELECT id, title FROM food WHERE category IN ('fruit', 'snack') LIMIT 20;",
        description: 'Match any value from a fixed list.'
      },
      {
        label: 'Boolean',
        sql: "SELECT id, title FROM food WHERE active IS TRUE OR category = 'featured' LIMIT 20;",
        description: 'Combine boolean predicates with OR.'
      }
    ]
  },
  {
    title: 'Sort',
    items: [
      {
        label: 'Newest',
        sql: 'SELECT id, title, timestamp FROM art ORDER BY timestamp DESC LIMIT 20;',
        description: 'Sort rows by a timestamp field.'
      },
      {
        label: 'Page',
        sql: 'SELECT id, title FROM food ORDER BY id ASC LIMIT 20 OFFSET 20;',
        description: 'Fetch the next page with LIMIT and OFFSET.'
      },
      {
        label: 'Distinct',
        sql: 'SELECT DISTINCT category FROM food ORDER BY category ASC;',
        description: 'Return one row per unique category.'
      }
    ]
  },
  {
    title: 'Aggregates',
    items: [
      {
        label: 'Count',
        sql: 'SELECT COUNT(*) AS total_docs FROM food;',
        description: 'Count all matching documents.'
      },
      {
        label: 'Stats',
        sql: 'SELECT AVG(score) AS avg_score, MIN(price) AS min_price, MAX(price) AS max_price FROM food;',
        description: 'Calculate aggregate values across matching rows.'
      },
      {
        label: 'Group',
        sql: 'SELECT category, COUNT(*) AS total_docs FROM food GROUP BY category ORDER BY total_docs DESC LIMIT 20;',
        description: 'Group rows and order by an aggregate output.'
      },
      {
        label: 'Having',
        sql: 'SELECT category, COUNT(*) AS total_docs FROM food GROUP BY category HAVING COUNT(*) >= 2 ORDER BY total_docs DESC;',
        description: 'Filter grouped aggregate results.'
      }
    ]
  },
  {
    title: 'Writes',
    items: [
      {
        label: 'Insert',
        sql: "INSERT INTO food (id, title, category, score) VALUES ('doc_new', 'Inserted from SQL', 'ops', 1);",
        description: 'Insert one document through the top-level SQL endpoint.'
      },
      {
        label: 'Delete',
        sql: "DELETE FROM food WHERE id = 'doc_new' LIMIT 1;",
        description: 'Delete matching documents through the top-level SQL endpoint.'
      },
      {
        label: 'Drop',
        sql: 'DROP COLLECTION old_collection;',
        description: 'Drop a collection through the top-level SQL endpoint.'
      }
    ]
  }
]

const hasRows = computed(() => Array.isArray(rows.value) && rows.value.length > 0)
const formattedSearchTimeMs = computed(() => {
  if (searchTimeMs.value === null || searchTimeMs.value === undefined || searchTimeMs.value === '') {
    return null
  }

  const parsed = Number(searchTimeMs.value)
  if (!Number.isFinite(parsed)) {
    return String(searchTimeMs.value)
  }

  return parsed.toFixed(2)
})

const normalizeSqlText = (value) => {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/;+$/, '')
    .toLowerCase()

  if (normalized === 'cols' || normalized === 'show cols') {
    return 'show cols'
  }

  return normalized
}

const isExampleActive = (sql) => normalizeSqlText(query.value) === normalizeSqlText(sql)

const collectColumns = (resultRows) => {
  const keys = new Set()

  for (const row of resultRows || []) {
    if (!row || typeof row !== 'object') continue
    Object.keys(row).forEach((key) => keys.add(key))
  }

  const preferred = ['id', 'title', 'name', 'score', 'timestamp', 'created_at']
  const ordered = []

  for (const key of preferred) {
    if (keys.has(key)) {
      ordered.push(key)
      keys.delete(key)
    }
  }

  return [...ordered, ...Array.from(keys).sort((a, b) => a.localeCompare(b))]
}

const normalizeRows = (responseData) => {
  if (Array.isArray(responseData?.rows)) {
    return responseData.rows
  }

  if (Array.isArray(responseData?.hits)) {
    return responseData.hits.map((hit) => hit?.document || hit?.row || hit || {})
  }

  return []
}

const formatCell = (value) => {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch (_err) {
    return String(value)
  }
}

const extractCollectionName = (sqlText) => {
  const sql = String(sqlText || '').trim()
  if (!sql) return ''

  const quotedMatch = sql.match(/\bFROM\s+[`"]([^`"]+)[`"]/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim()
  }

  const plainMatch = sql.match(/\bFROM\s+([A-Za-z0-9_.-]+)/i)
  return plainMatch?.[1]?.trim() || ''
}

const isClickableIdCell = (column, value) => column === 'id' && value !== null && value !== undefined && String(value).trim() !== ''

const getRowRoute = (idValue) => {
  const collectionName = extractCollectionName(query.value)

  if (!collectionName || idValue === null || idValue === undefined || String(idValue).trim() === '') {
    return null
  }

  return {
    path: `/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(String(idValue))}`
  }
}

const getRowHref = (idValue) => {
  const routeLocation = getRowRoute(idValue)
  return routeLocation ? router.resolve(routeLocation).href : '#'
}

const openRowById = async (idValue, event) => {
  const routeLocation = getRowRoute(idValue)
  if (!routeLocation) {
    errorMessage.value = 'Could not determine the collection name from the current SQL query.'
    if (event) {
      event.preventDefault()
    }
    return
  }

  if (!event) {
    await router.push(routeLocation)
    return
  }

  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  event.preventDefault()
  await router.push(routeLocation)
}

const syncRoute = async (page) => {
  await router.replace({
    path: '/sql',
    query: {
      sql: query.value,
      page: String(page),
      per_page: String(perPage.value)
    }
  })
}

const runQuery = async (page = 1) => {
  const sql = String(query.value || '').trim()
  if (!sql) {
    errorMessage.value = 'SQL query cannot be empty.'
    rows.value = []
    columns.value = []
    totalRows.value = 0
    totalPages.value = 0
    queryInfo.value = null
    ranOnce.value = true
    return
  }

  loading.value = true
  errorMessage.value = ''
  queryInfo.value = null

  try {
    currentPage.value = page
    await syncRoute(page)

    const baseUrlValue = getBaseUrlValue(baseUrl)
    const useProxy = shouldUseProxy(baseUrlValue)
    const response = await axios.get(
      buildApiUrl(baseUrlValue, useProxy, '/sql', {
        sql,
        page,
        per_page: perPage.value
      })
    )

    const data = response.data || {}
    const nextRows = normalizeRows(data)

    rows.value = nextRows
    columns.value = collectColumns(nextRows)
    totalRows.value = Number(data.found ?? nextRows.length ?? 0)
    totalPages.value = Number(data.total_pages ?? 0)
    currentPage.value = Number(data.page ?? page ?? 1)
    perPage.value = Number(data.per_page ?? perPage.value ?? 20)
    searchTimeMs.value = data.search_time_ms ?? null
    ranOnce.value = true

    if (typeof data.message === 'string' && data.message.trim()) {
      queryInfo.value = {
        title: 'SQL Response',
        message: data.message.trim()
      }
    } else if (Array.isArray(nextRows) && nextRows.length === 0 && data.updated !== undefined) {
      queryInfo.value = {
        title: 'SQL Response',
        message: `Updated ${data.updated} row${Number(data.updated) === 1 ? '' : 's'}.`
      }
    } else if (Array.isArray(nextRows) && nextRows.length === 0 && data.deleted !== undefined) {
      queryInfo.value = {
        title: 'SQL Response',
        message: `Deleted ${data.deleted} row${Number(data.deleted) === 1 ? '' : 's'}.`
      }
    }
  } catch (err) {
    errorMessage.value = getErrorMessage(err, 'Failed to run SQL query')
    rows.value = []
    columns.value = []
    totalRows.value = 0
    totalPages.value = 0
    queryInfo.value = null
    ranOnce.value = true
  } finally {
    loading.value = false
  }
}

const handlePageChange = async (page) => {
  await runQuery(page)
}

const clearQuery = () => {
  query.value = ''
  rows.value = []
  columns.value = []
  totalRows.value = 0
  totalPages.value = 0
  searchTimeMs.value = null
  queryInfo.value = null
  errorMessage.value = ''
  ranOnce.value = false
  router.replace({ path: '/sql', query: {} })
}

const applyExample = (sql) => {
  query.value = sql
}

onMounted(async () => {
  const initialQuery = typeof route.query.sql === 'string' ? route.query.sql : ''
  const initialPage = Number(route.query.page || 1) > 0 ? Number(route.query.page || 1) : 1
  const initialPerPage = Number(route.query.per_page || 20) > 0 ? Number(route.query.per_page || 20) : 20

  perPage.value = initialPerPage
  currentPage.value = initialPage

  if (initialQuery.trim()) {
    query.value = initialQuery
    await runQuery(initialPage)
  }
})

watch(
  () => [route.query.sql, route.query.page, route.query.per_page],
  ([nextSql, nextPage, nextPerPage]) => {
    const normalizedRouteSql = typeof nextSql === 'string' ? nextSql : ''
    if (normalizeSqlText(normalizedRouteSql) !== normalizeSqlText(query.value)) {
      query.value = normalizedRouteSql
    }

    const parsedPage = Number(nextPage || 1)
    if (parsedPage > 0 && parsedPage !== currentPage.value) {
      currentPage.value = parsedPage
    }

    const parsedPerPage = Number(nextPerPage || 20)
    if (parsedPerPage > 0 && parsedPerPage !== perPage.value) {
      perPage.value = parsedPerPage
    }
  }
)
</script>

<style scoped>
.sql-view {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 0 32px;
  color: #0f172a;
}

.sql-header {
  margin-bottom: 16px;
}

.sql-title-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: Inter, Helvetica, sans-serif !important;
  font-size: 30px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  color: #0f172a !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.sql-title-chars {
  display: inline-flex;
  align-items: baseline;
  gap: 0.08em;
  letter-spacing: 0.08em;
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace !important;
}

.sql-title-chars span {
  display: inline-block;
  line-height: 1;
}

.sql-title-text .collection-dir-icon {
  flex: 0 0 auto;
  color: #0f172a !important;
}

.sql-title-icon {
  flex: 0 0 auto;
  color: #0f172a !important;
  font-size: 28px !important;
}

.sql-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #334155;
  font-weight: 500;
}

.sql-query-card,
.sql-results-card {
  border: 1px solid #d6e0ea;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.sql-query-card {
  margin-top: 34px;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.sql-query-card-text {
  padding: 0;
}

.sql-query-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sql-action-btn {
  appearance: none;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  text-transform: none;
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
  min-height: 32px;
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  color: #ffffff !important;
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow:
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  cursor: pointer;
  line-height: 32px;
  letter-spacing: normal;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: perspective(1000px) translateZ(0);
}

.sql-action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.sql-action-btn:hover:not(:disabled) {
  color: #ffffff !important;
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow:
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  transform: perspective(1000px) translateZ(0);
}

.sql-action-btn:hover:not(:disabled)::before {
  opacity: 1;
}

.sql-action-btn:active:not(:disabled) {
  background: linear-gradient(135deg, #032a4f 0%, #021d3a 50%, #011528 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0);
  box-shadow:
    0 2px 4px rgba(4, 48, 97, 0.4),
    0 1px 2px rgba(4, 48, 97, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.sql-action-btn:active:not(:disabled)::before {
  opacity: 0.5;
}

.sql-run-btn {
  min-width: 104px;
}

.sql-query-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.sql-clear-btn {
  min-width: 86px;
}

.sql-clear-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sql-action-btn:disabled {
  opacity: 0.55;
  transform: none;
  cursor: not-allowed;
}

.sql-query-input :deep(.v-field) {
  border-radius: 12px !important;
  border: 0 !important;
  background: #ffffff !important;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06) !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace !important;
}

.sql-query-input {
  margin: 0;
}

.sql-query-input :deep(.v-field__overlay),
.sql-query-input :deep(.v-field__outline) {
  display: none;
}

.sql-query-input :deep(.v-field__field) {
  padding: 0 !important;
}

.sql-query-input :deep(.v-field__input) {
  align-items: flex-start !important;
  min-height: 120px !important;
  padding: 22px 24px !important;
  color: #0f172a !important;
}

.sql-query-input :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace !important;
  font-size: 13px !important;
  line-height: 1.55 !important;
  font-weight: 500 !important;
  color: #0f172a !important;
  letter-spacing: 0 !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  text-rendering: geometricPrecision !important;
  min-height: 0 !important;
  padding: 0 !important;
  resize: none !important;
}

.sql-query-input :deep(textarea::placeholder) {
  color: #64748b !important;
  opacity: 1 !important;
}

.sql-query-examples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.sql-example-label {
  grid-column: 1 / -1;
  font-size: 12px;
  font-weight: 800;
  color: #000000;
}

.sql-example-group {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sql-example-group-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
}

.sql-example-chip {
  border: 1px solid #dbe3ee;
  background: #ffffff;
  color: #0f172a;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  text-align: left;
}

.sql-example-chip:hover {
  background: #ffffff;
  border-color: #9cb7d6;
  color: #0f172a;
}

.sql-example-chip:focus-visible {
  outline: 2px solid rgba(4, 48, 97, 0.32);
  outline-offset: 2px;
}

.sql-example-chip--active,
.sql-example-chip--active:hover {
  background: #eaf3ff;
  border-color: #4b7db5;
  color: #032a4f;
  box-shadow: inset 0 0 0 1px rgba(4, 48, 97, 0.08);
}

.sql-example-chip-title {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.1;
  color: #000000;
}

.sql-example-chip code {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
  color: #334155;
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}

.sql-alert {
  margin-top: 16px;
}

.sql-alert :deep(.v-alert__content),
.sql-alert :deep(.v-alert__content .font-weight-bold),
.sql-alert :deep(.v-alert__content div) {
  color: #0f172a !important;
}

.sql-results-card {
  margin-top: 16px;
}

.sql-results-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.sql-results-header {
  width: 100%;
  padding: 0;
  margin: 0;
}

.sql-results-header-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.sql-results-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.sql-results-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
}

.sql-results-body {
  width: 100%;
  padding: 0;
}

.sql-grid-shell {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e5ebf2;
}

.sql-grid-row {
  display: grid;
  grid-template-columns: var(--sql-grid-columns);
}

.sql-grid-row + .sql-grid-row {
  border-top: 1px solid #eef2f7;
}

.sql-grid-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
}

.sql-grid-header-cell {
  background: #f8fafc;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.sql-grid-row:hover .sql-grid-data-cell {
  background: #f8fafc;
}

.sql-grid-cell {
  min-width: 0;
  padding: 12px 14px;
}

.sql-grid-cell + .sql-grid-cell {
  border-left: 1px solid #edf2f7;
}

.sql-grid-header-cell + .sql-grid-header-cell {
  border-left: 1px solid #d7dee8;
}

.sql-grid-header-cell {
  text-align: left;
}

.sql-grid-data-cell {
  color: #0f172a;
  font-size: 13px;
  background: #ffffff;
}

.sql-cell-value {
  display: block;
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

.sql-cell-link {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  color: inherit;
  text-decoration: none;
}

.sql-cell-link:focus,
.sql-cell-link:focus-visible,
.sql-cell-link:active {
  outline: none;
  box-shadow: none;
  border: 0;
}

.sql-cell-link .sql-cell-value {
  color: #043061;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: rgba(4, 48, 97, 0.28);
  text-underline-offset: 0.15em;
}

.sql-cell-link:hover .sql-cell-value {
  color: #03284d;
  text-decoration-color: rgba(4, 48, 97, 0.55);
}

.sql-pagination-row {
  display: flex;
  justify-content: center;
  padding-top: 18px;
}

.sql-pagination :deep(.v-btn),
.sql-pagination :deep(.v-pagination__item),
.sql-pagination :deep(.v-pagination__next),
.sql-pagination :deep(.v-pagination__prev) {
  color: #0f172a !important;
}

.sql-state-card {
  margin-top: 16px;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sql-state-card-text {
  padding: 56px 24px 60px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.sql-state-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.sql-state-copy {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

@media (max-width: 960px) {
  .sql-query-toolbar {
    align-items: flex-start;
  }

  .sql-query-examples {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 10px;
  }

  .sql-example-label {
    display: block;
    width: 100%;
  }

  .sql-example-chip {
    width: 100%;
    text-align: left;
  }

  .sql-query-actions {
    width: 100%;
  }

  .sql-action-btn {
    flex: 1 1 0;
  }

  .sql-cell-value {
    max-width: 100%;
  }
}
</style>
