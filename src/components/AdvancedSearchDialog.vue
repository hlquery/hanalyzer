<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    persistent
    class="advanced-search-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="advanced-search-card" elevation="0">
      <div class="advanced-search-header">
        <div>
          <h2 class="advanced-search-title">Advanced Search</h2>
          <p class="advanced-search-subtitle">Tune search behavior for this collection.</p>
        </div>
        <button type="button" class="advanced-search-icon-btn" aria-label="Close advanced search" @click="close">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>

      <div class="advanced-search-body">
        <label class="advanced-search-field advanced-search-field--full">
          <span class="advanced-search-label">Query text</span>
          <input
            v-model="form.query"
            type="text"
            class="advanced-search-input"
            placeholder="abstract painting"
          />
        </label>

        <label class="advanced-search-field">
          <span class="advanced-search-label">Search mode</span>
          <select v-model="form.mode" class="advanced-search-input">
            <option value="text">Text</option>
            <option value="vector">Vector</option>
            <option value="geo">Geo</option>
          </select>
        </label>

        <label class="advanced-search-field">
          <span class="advanced-search-label">Limit</span>
          <input
            v-model.number="form.limit"
            type="number"
            min="1"
            max="100"
            class="advanced-search-input"
          />
        </label>

        <label class="advanced-search-field advanced-search-field--full">
          <span class="advanced-search-label">Vector input</span>
          <textarea
            v-model="form.vectorText"
            class="advanced-search-textarea"
            placeholder="[0.123, -0.082, 0.441, ...]"
            rows="4"
            @input="vectorError = ''"
          ></textarea>
          <span v-if="vectorError" class="advanced-search-error">{{ vectorError }}</span>
        </label>

        <label class="advanced-search-field">
          <span class="advanced-search-label">Vector field</span>
          <input
            v-model="form.vectorField"
            type="text"
            class="advanced-search-input"
            placeholder="embedding"
          />
        </label>

        <label class="advanced-search-field">
          <span class="advanced-search-label">Distance metric</span>
          <select v-model="form.distance" class="advanced-search-input">
            <option value="cosine">Cosine</option>
            <option value="dot_product">Dot product</option>
            <option value="euclidean">Euclidean</option>
          </select>
        </label>

        <label class="advanced-search-check advanced-search-field--full">
          <input v-model="form.showScores" type="checkbox" />
          <span>Show scores in results</span>
        </label>

        <div v-if="form.mode === 'hybrid'" class="advanced-search-weights advanced-search-field--full">
          <div class="advanced-search-weights-header">
            <span class="advanced-search-label">Hybrid weights</span>
            <span class="advanced-search-weight-total">{{ normalizedTextWeight.toFixed(2) }} / {{ normalizedVectorWeight.toFixed(2) }}</span>
          </div>

          <label class="advanced-search-range">
            <span>Text weight</span>
            <input v-model.number="form.textWeight" type="range" min="0" max="1" step="0.05" />
          </label>

          <label class="advanced-search-range">
            <span>Vector weight</span>
            <input v-model.number="form.vectorWeight" type="range" min="0" max="1" step="0.05" />
          </label>
        </div>
      </div>

      <div class="advanced-search-actions">
        <button type="button" class="advanced-search-secondary-btn" @click="close">Cancel</button>
        <button type="button" class="advanced-search-primary-btn" @click="submit">Search</button>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  query: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    default: 'text'
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const vectorError = ref('')
const form = reactive({
  query: '',
  mode: 'text',
  vectorText: '',
  vectorField: 'embedding',
  distance: 'cosine',
  showScores: false,
  textWeight: 0.4,
  vectorWeight: 0.6,
  limit: 10
})

const normalizedTextWeight = computed(() => Number(form.textWeight) || 0)
const normalizedVectorWeight = computed(() => Number(form.vectorWeight) || 0)

const resetForm = () => {
  form.query = props.query || ''
  form.mode = ['text', 'keyword', 'vector', 'hybrid', 'geo'].includes(props.mode) ? props.mode : 'text'
  if (form.mode === 'keyword') {
    form.mode = 'text'
  }
  form.vectorText = ''
  form.vectorField = 'embedding'
  form.distance = 'cosine'
  form.showScores = false
  form.textWeight = 0.4
  form.vectorWeight = 0.6
  form.limit = 10
  vectorError.value = ''
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    resetForm()
  }
})

const parseVector = () => {
  const raw = String(form.vectorText || '').trim()
  if (!raw) {
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    vectorError.value = 'Vector must be valid JSON.'
    return undefined
  }

  if (!Array.isArray(parsed)) {
    vectorError.value = 'Vector must be a JSON array.'
    return undefined
  }

  if (!parsed.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    vectorError.value = 'Every vector item must be a number.'
    return undefined
  }

  vectorError.value = ''
  return parsed
}

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  const vector = parseVector()
  if (vector === undefined) {
    return
  }

  if (form.mode === 'vector' && !vector && !String(form.query || '').trim()) {
    vectorError.value = 'Provide query text or a raw vector for vector search.'
    return
  }

  const payload = {
    query: String(form.query || '').trim(),
    mode: form.mode,
    vector,
    vector_field: String(form.vectorField || 'embedding').trim() || 'embedding',
    distance: form.distance,
    show_scores: form.showScores,
    limit: Math.max(1, Number(form.limit) || 10)
  }

  if (form.mode === 'hybrid') {
    payload.weights = {
      text: normalizedTextWeight.value,
      vector: normalizedVectorWeight.value
    }
  }

  emit('submit', payload)
  close()
}
</script>

<style scoped>
.advanced-search-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px !important;
  overflow: hidden;
}

.advanced-search-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #edf2f7;
}

.advanced-search-title {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

.advanced-search-subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
}

.advanced-search-icon-btn {
  width: 34px;
  height: 34px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.advanced-search-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 22px 24px;
}

.advanced-search-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.advanced-search-field--full {
  grid-column: 1 / -1;
}

.advanced-search-label {
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
}

.advanced-search-input,
.advanced-search-textarea {
  width: 100%;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font: 500 14px/1.4 Inter, Helvetica, sans-serif;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.advanced-search-input {
  min-height: 40px;
  padding: 0 12px;
}

.advanced-search-textarea {
  resize: vertical;
  padding: 10px 12px;
}

.advanced-search-input:focus,
.advanced-search-textarea:focus {
  border-color: #043061;
  box-shadow: 0 0 0 3px rgba(4, 48, 97, 0.08);
}

.advanced-search-error {
  color: #dc2626;
  font-size: 12px;
  font-weight: 700;
}

.advanced-search-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.advanced-search-check input {
  width: 15px;
  height: 15px;
  accent-color: #043061;
}

.advanced-search-weights {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.advanced-search-weights-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.advanced-search-weight-total {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.advanced-search-range {
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: center;
  gap: 12px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.advanced-search-range + .advanced-search-range {
  margin-top: 8px;
}

.advanced-search-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 22px;
  border-top: 1px solid #edf2f7;
}

.advanced-search-secondary-btn,
.advanced-search-primary-btn {
  min-height: 38px;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.advanced-search-secondary-btn {
  border: 1px solid #dbe3ef;
  background: #ffffff;
  color: #334155;
}

.advanced-search-primary-btn {
  border: 1px solid #043061;
  background: #043061;
  color: #ffffff;
}

@media (max-width: 720px) {
  .advanced-search-body {
    grid-template-columns: 1fr;
  }

  .advanced-search-range {
    grid-template-columns: 1fr;
  }
}
</style>
