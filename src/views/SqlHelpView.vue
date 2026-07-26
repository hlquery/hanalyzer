<template>
  <div class="sql-help-page">
    <div class="sql-help-page-header">
      <div>
        <div class="sql-help-eyebrow">
          <v-icon icon="mdi-console-line" size="16" /> SQL in HLQuery
        </div>
        <h1 class="sql-help-page-title">Query your collections with SQL</h1>
        <p class="sql-help-page-subtitle">
          Use familiar SQL statements to inspect collections, select fields, filter documents, and sort results.
        </p>
      </div>

      <div class="sql-help-page-actions">
        <button type="button" class="sql-help-page-button" @click="showExamples = !showExamples">
          <v-icon :icon="showExamples ? 'mdi-chevron-up' : 'mdi-code-tags'" size="18" />
          {{ showExamples ? 'Hide examples' : 'Examples' }}
        </button>
        <router-link to="/sql" class="sql-help-page-button sql-help-page-button--primary">
          <v-icon icon="mdi-play" size="17" /> Open SQL editor
        </router-link>
      </div>
    </div>

    <div class="sql-help-layout">
      <main class="sql-help-main">
        <section class="sql-help-card sql-help-intro-card">
          <div class="sql-help-card-icon"><v-icon icon="mdi-lightbulb-outline" /></div>
          <div>
            <h2>How it works</h2>
            <p>
              HLQuery runs SQL against your search collections. A collection is used as the table name, and each
              document field can be selected like a column.
            </p>
          </div>
        </section>

        <section class="sql-help-card">
          <div class="sql-help-section-heading">
            <span class="sql-help-step">1</span>
            <div>
              <h2>Choose a collection</h2>
              <p>Use the collection name after <code>FROM</code>.</p>
            </div>
          </div>
          <pre><code>SELECT * FROM food;</code></pre>
          <p class="sql-help-note">Replace <code>food</code> with any collection available on your server.</p>
        </section>

        <section class="sql-help-card">
          <div class="sql-help-section-heading">
            <span class="sql-help-step">2</span>
            <div>
              <h2>Select the fields you need</h2>
              <p>Use <code>*</code> for every field, or name only the fields you want to see.</p>
            </div>
          </div>
          <pre><code>SELECT id, title, score
FROM universities;</code></pre>
        </section>

        <section class="sql-help-card">
          <div class="sql-help-section-heading">
            <span class="sql-help-step">3</span>
            <div>
              <h2>Filter, sort, and limit</h2>
              <p>Combine <code>WHERE</code>, <code>ORDER BY</code>, and <code>LIMIT</code> to shape the result.</p>
            </div>
          </div>
          <pre><code>SELECT id, title
FROM food
WHERE content LIKE '%pasta%'
ORDER BY timestamp DESC
LIMIT 20;</code></pre>
        </section>

        <section v-if="showExamples" id="sql-examples" class="sql-help-card sql-help-examples-card">
          <div class="sql-help-section-heading sql-help-section-heading--examples">
            <div>
              <h2>SQL examples</h2>
              <p>Choose an example to open it in the SQL editor and run it against your server.</p>
            </div>
            <v-icon icon="mdi-code-tags" color="#488aec" size="30" />
          </div>

          <div class="sql-help-example-grid">
            <button
              v-for="example in examples"
              :key="example.title"
              type="button"
              class="sql-help-example-card"
              @click="openExample(example.sql)"
            >
              <span class="sql-help-example-card-title">{{ example.title }}</span>
              <span class="sql-help-example-card-copy">{{ example.copy }}</span>
              <code>{{ example.sql }}</code>
              <span class="sql-help-example-cta">Try example <v-icon icon="mdi-arrow-right" size="15" /></span>
            </button>
          </div>
        </section>
      </main>

      <aside class="sql-help-sidebar">
        <div class="sql-help-card sql-help-reference-card">
          <h2>Quick reference</h2>
          <div v-for="item in reference" :key="item.keyword" class="sql-help-reference-row">
            <code>{{ item.keyword }}</code>
            <span>{{ item.description }}</span>
          </div>
        </div>

        <div class="sql-help-card sql-help-tip-card">
          <v-icon icon="mdi-information-outline" size="20" />
          <div>
            <strong>Good to know</strong>
            <p>Queries are paginated automatically. Use <code>LIMIT</code> when you want to keep a result set small.</p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showExamples = ref(false)

const examples = [
  { title: 'List collections', copy: 'Show available collections', sql: 'SHOW COLS;' },
  { title: 'Browse documents', copy: 'Return the first 20 documents', sql: 'SELECT * FROM food LIMIT 20;' },
  { title: 'Pick fields', copy: 'Return only selected fields', sql: 'SELECT id, title FROM food LIMIT 20;' },
  { title: 'Filter text', copy: 'Find documents containing pasta', sql: "SELECT id, title FROM food WHERE content LIKE '%pasta%' LIMIT 20;" },
  { title: 'Prefix match', copy: 'Match content starting with a value', sql: "SELECT title FROM music WHERE content LIKE 'madonna%';" },
  { title: 'Newest first', copy: 'Sort by timestamp descending', sql: 'SELECT id, title FROM art ORDER BY timestamp DESC LIMIT 20;' },
  { title: 'Count documents', copy: 'Count rows in a collection', sql: 'SELECT COUNT(*) FROM food;' },
  { title: 'Sort by score', copy: 'Show highest scored results', sql: 'SELECT id, title, score FROM universities ORDER BY score DESC LIMIT 20;' }
]

const reference = [
  { keyword: 'SELECT', description: 'Choose fields to return' },
  { keyword: 'FROM', description: 'Choose the collection' },
  { keyword: 'WHERE', description: 'Filter matching documents' },
  { keyword: 'LIKE', description: 'Match text patterns with % wildcards' },
  { keyword: 'ORDER BY', description: 'Sort the result set' },
  { keyword: 'LIMIT', description: 'Cap the number of returned rows' },
  { keyword: 'COUNT(*)', description: 'Count documents in a collection' }
]

const openExample = async (sql) => {
  await router.push({ path: '/sql', query: { sql, page: '1', per_page: '20' } })
}
</script>

<style scoped>
.sql-help-page { max-width: 1180px; margin: 0 auto; color: #172033; }
.sql-help-page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; margin-bottom: 28px; }
.sql-help-eyebrow { display: flex; align-items: center; gap: 7px; color: #488aec; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.sql-help-page-title { margin: 8px 0 7px; font-size: clamp(28px, 4vw, 42px); line-height: 1.12; letter-spacing: -.035em; }
.sql-help-page-subtitle { max-width: 680px; margin: 0; color: #64748b; font-size: 16px; }
.sql-help-page-actions { display: flex; flex-shrink: 0; gap: 10px; }
.sql-help-page-button { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #dbe3ef; border-radius: 9px; padding: 11px 15px; color: #334155; background: #fff; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; transition: .2s ease; }
.sql-help-page-button:hover { border-color: #a9c4f4; color: #326fc8; transform: translateY(-1px); }
.sql-help-page-button--primary { border-color: #488aec; color: #fff; background: #488aec; }
.sql-help-page-button--primary:hover { color: #fff; background: #3778d4; }
.sql-help-layout { display: grid; grid-template-columns: minmax(0, 1fr) 310px; gap: 22px; align-items: start; }
.sql-help-main, .sql-help-sidebar { display: grid; gap: 16px; }
.sql-help-card { border: 1px solid #e3e9f2; border-radius: 14px; padding: 24px; background: #fff; box-shadow: 0 8px 24px rgba(35, 52, 82, .045); }
.sql-help-intro-card { display: flex; gap: 16px; border-color: #d8e5fa; background: linear-gradient(135deg, #f5f9ff, #fff); }
.sql-help-card-icon { display: grid; flex-shrink: 0; place-items: center; width: 42px; height: 42px; border-radius: 11px; color: #488aec; background: #e8f1ff; }
.sql-help-card h2 { margin: 0 0 7px; color: #1e293b; font-size: 18px; }
.sql-help-card p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.65; }
.sql-help-section-heading { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 18px; }
.sql-help-section-heading h2 { margin-bottom: 4px; }
.sql-help-step { display: grid; flex-shrink: 0; place-items: center; width: 29px; height: 29px; border-radius: 50%; color: #fff; background: #488aec; font-size: 13px; font-weight: 800; }
pre { overflow-x: auto; margin: 0; border-radius: 9px; padding: 16px 18px; color: #dbeafe; background: #172033; font: 13px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; }
code { border-radius: 4px; padding: 2px 5px; color: #326fc8; background: #eef5ff; font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
pre code { padding: 0; color: inherit; background: transparent; font-size: inherit; }
.sql-help-note { margin-top: 12px !important; font-size: 12px !important; }
.sql-help-sidebar { position: sticky; top: 104px; }
.sql-help-reference-card h2 { margin-bottom: 16px; }
.sql-help-reference-row { display: flex; align-items: baseline; gap: 10px; padding: 11px 0; border-top: 1px solid #edf1f6; }
.sql-help-reference-row code { flex-shrink: 0; min-width: 78px; color: #326fc8; font-weight: 700; }
.sql-help-reference-row span { color: #64748b; font-size: 12px; line-height: 1.4; }
.sql-help-tip-card { display: flex; gap: 10px; color: #488aec; background: #f6f9ff; }
.sql-help-tip-card p { margin-top: 5px; font-size: 12px; }
.sql-help-examples-card { border-color: #cfe0fb; }
.sql-help-section-heading--examples { justify-content: space-between; }
.sql-help-example-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.sql-help-example-card { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; border: 1px solid #e0e8f4; border-radius: 10px; padding: 15px; color: inherit; background: #fbfcfe; text-align: left; cursor: pointer; transition: .2s ease; }
.sql-help-example-card:hover { border-color: #8eb4ee; background: #f4f8ff; transform: translateY(-2px); }
.sql-help-example-card-title { color: #1e293b; font-size: 14px; font-weight: 800; }
.sql-help-example-card-copy { min-height: 32px; color: #64748b; font-size: 12px; }
.sql-help-example-card code { overflow: hidden; width: 100%; color: #326fc8; text-overflow: ellipsis; white-space: nowrap; }
.sql-help-example-cta { display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; color: #488aec; font-size: 12px; font-weight: 700; }
@media (max-width: 900px) { .sql-help-page-header { align-items: flex-start; flex-direction: column; } .sql-help-layout { grid-template-columns: 1fr; } .sql-help-sidebar { position: static; } }
@media (max-width: 600px) { .sql-help-page-actions { width: 100%; } .sql-help-page-button { flex: 1; justify-content: center; } .sql-help-card { padding: 18px; } .sql-help-example-grid { grid-template-columns: 1fr; } }
</style>
