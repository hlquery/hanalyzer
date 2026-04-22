<template>
  <div class="collection-search-syntax-view">
    <div class="search-syntax-header">
      <div class="search-syntax-header__content">
        <button
          type="button"
          class="search-syntax-kicker"
          @click="goBack"
        >
          <v-icon size="16" class="mr-2">mdi-folder</v-icon>
          {{ collectionName }}
        </button>

        <h1 class="search-syntax-title">Search syntax examples</h1>
        <p class="search-syntax-subtitle">
          Common query patterns you can paste directly into this collection search box.
        </p>
      </div>
    </div>

    <v-card class="search-syntax-term-card" elevation="0">
      <div class="search-syntax-term-label">Base term</div>
      <div class="search-syntax-term-copy">
        Change this once and all examples below update automatically.
      </div>
      <input
        v-model="baseTerm"
        type="text"
        class="search-syntax-term-input"
        placeholder="laptop"
      />
    </v-card>

    <v-card class="search-syntax-table-card" elevation="0">
      <div class="search-syntax-table-wrap">
        <table class="search-syntax-table">
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Example</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="example in examples" :key="example.label">
              <td class="search-syntax-label-cell">{{ example.label }}</td>
              <td class="search-syntax-code-cell">
                <button
                  type="button"
                  class="search-syntax-code-button"
                  @click="runExample(example.query)"
                >
                  <code>{{ example.query }}</code>
                </button>
              </td>
              <td class="search-syntax-description-cell">{{ example.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  name: {
    type: String,
    required: true
  }
})

const route = useRoute()
const router = useRouter()

const collectionName = computed(() => props.name || route.params.name || '')
const baseTerm = ref('laptop')
const normalizedBaseTerm = computed(() => {
  const value = String(baseTerm.value || '').trim()
  return value || 'laptop'
})
const examples = computed(() => [
  {
    label: 'Field-specific search',
    query: `title:${normalizedBaseTerm.value}`,
    description: 'Search only inside one field instead of the whole document.'
  },
  {
    label: 'Range query',
    query: 'price:[100 TO 500]',
    description: 'Match numeric or comparable values inside a range.'
  },
  {
    label: 'Fuzzy search',
    query: `${normalizedBaseTerm.value}~2`,
    description: 'Find close spellings with a small edit distance.'
  },
  {
    label: 'Wildcard search',
    query: `${normalizedBaseTerm.value}*`,
    description: 'Match prefixes and partial word expansions.'
  },
  {
    label: 'Case-sensitive search',
    query: `is:casesensitive ${capitalizeFirst(normalizedBaseTerm.value)}`,
    description: 'Respect exact letter casing for the query.'
  },
  {
    label: 'Boost term importance',
    query: `${normalizedBaseTerm.value}^2.0 computer`,
    description: 'Increase the ranking weight of one term.'
  },
  {
    label: 'NOT operator',
    query: `!${normalizedBaseTerm.value}`,
    description: 'Exclude documents that contain the term.'
  },
  {
    label: 'Combined query',
    query: `title:${normalizedBaseTerm.value} AND price:[100 TO 500]`,
    description: 'Combine multiple conditions in a single query.'
  }
])

const capitalizeFirst = (value) => {
  const text = String(value || '')
  if (!text) return ''
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

const runExample = (query) => {
  const encodedName = encodeURIComponent(collectionName.value)
  router.push({
    path: `/collections/${encodedName}`,
    query: { q: query }
  }).catch((err) => {
    if (err?.name !== 'NavigationDuplicated' && !err?.message?.includes('Avoided redundant navigation')) {
      console.error('Navigation error:', err)
    }
  })
}

const goBack = () => {
  const encodedName = encodeURIComponent(collectionName.value)
  router.push(`/collections/${encodedName}`).catch((err) => {
    if (err?.name !== 'NavigationDuplicated' && !err?.message?.includes('Avoided redundant navigation')) {
      console.error('Navigation error:', err)
    }
  })
}
</script>

<style scoped>
.collection-search-syntax-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-syntax-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.search-syntax-header__content {
  max-width: 820px;
}

.search-syntax-kicker {
  display: inline-flex;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.search-syntax-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.search-syntax-subtitle {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.6;
  color: #64748b;
}

.search-syntax-table-card {
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  border-radius: 20px !important;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.06) !important;
}

.search-syntax-term-card {
  padding: 18px 20px;
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  border-radius: 18px !important;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05) !important;
}

.search-syntax-term-label {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #475569;
  text-transform: uppercase;
}

.search-syntax-term-copy {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.5;
  color: #64748b;
}

.search-syntax-term-input {
  width: min(100%, 420px);
  margin-top: 14px;
  min-height: 52px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid #dbe3ee;
  background: #ffffff;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.search-syntax-term-input:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.search-syntax-table-wrap {
  overflow-x: auto;
  padding: 10px;
}

.search-syntax-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.search-syntax-table thead th {
  text-align: left;
  padding: 16px 18px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.search-syntax-table tbody td {
  padding: 18px;
  vertical-align: top;
  border-bottom: 1px solid #e2e8f0;
}

.search-syntax-table tbody tr:last-child td {
  border-bottom: none;
}

.search-syntax-label-cell {
  min-width: 200px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.search-syntax-code-cell {
  min-width: 280px;
}

.search-syntax-code-cell code {
  pointer-events: none;
  display: inline-block;
  padding: 12px 14px;
  border-radius: 12px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
}

.search-syntax-code-button {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.search-syntax-code-button:hover code {
  background: #0f172a;
}

.search-syntax-description-cell {
  min-width: 260px;
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
}

@media (max-width: 760px) {
  .collection-search-syntax-view {
    gap: 16px;
  }

  .search-syntax-title {
    font-size: 24px;
  }

  .search-syntax-subtitle {
    font-size: 14px;
  }

  .search-syntax-table-wrap {
    padding: 0;
  }

  .search-syntax-table {
    min-width: 720px;
  }
}
</style>
