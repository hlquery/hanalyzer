<template>
  <div class="json-editor-container">
    <div class="json-editor-header">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center" style="gap: 8px;">
          <v-icon size="18" color="primary">mdi-code-json</v-icon>
          <span class="json-editor-title">{{ title || 'JSON Editor' }}</span>
        </div>
        <div class="d-flex align-center" style="gap: 8px;">
          <v-btn
            v-if="!readonly"
            variant="text"
            size="small"
            @click="formatJson"
            prepend-icon="mdi-code-braces"
          >
            Format
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            @click="copyToClipboard"
            prepend-icon="mdi-content-copy"
          >
            Copy
          </v-btn>
          <v-btn
            v-if="!readonly"
            variant="text"
            size="small"
            @click="editMode = !editMode"
            :prepend-icon="editMode ? 'mdi-eye' : 'mdi-pencil'"
          >
            {{ editMode ? 'View' : 'Edit' }}
          </v-btn>
        </div>
      </div>
    </div>
    
    <div v-if="editMode && !readonly" class="json-editor-textarea">
      <textarea
        v-model="jsonString"
        @input="handleInput"
        class="json-textarea"
        :class="{ 'json-error': hasError }"
        spellcheck="false"
      ></textarea>
      <div v-if="hasError" class="json-error-message">
        <v-icon size="16" color="error">mdi-alert-circle</v-icon>
        Invalid JSON: {{ errorMessage }}
      </div>
    </div>
    
    <div v-else class="json-viewer">
      <pre class="json-pretty" :class="{ 'json-error': hasError }">{{ formattedJson }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Object, String],
    default: () => ({})
  },
  readonly: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const editMode = ref(false)
const jsonString = ref('')
const hasError = ref(false)
const errorMessage = ref('')

const formattedJson = computed(() => {
  try {
    const obj = typeof props.modelValue === 'string' 
      ? JSON.parse(props.modelValue) 
      : props.modelValue
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return String(props.modelValue)
  }
})

watch(() => props.modelValue, (newVal) => {
  try {
    if (typeof newVal === 'string') {
      jsonString.value = newVal
    } else {
      jsonString.value = JSON.stringify(newVal, null, 2)
    }
    hasError.value = false
  } catch (e) {
    jsonString.value = String(newVal)
  }
}, { immediate: true })

const handleInput = () => {
  try {
    const parsed = JSON.parse(jsonString.value)
    hasError.value = false
    errorMessage.value = ''
    emit('update:modelValue', parsed)
    emit('change', parsed)
  } catch (e) {
    hasError.value = true
    errorMessage.value = e.message
  }
}

const formatJson = () => {
  try {
    const parsed = JSON.parse(jsonString.value)
    jsonString.value = JSON.stringify(parsed, null, 2)
    hasError.value = false
    emit('update:modelValue', parsed)
    emit('change', parsed)
  } catch (e) {
    hasError.value = true
    errorMessage.value = e.message
  }
}

const copyToClipboard = async () => {
  try {
    const text = editMode ? jsonString.value : formattedJson.value
    await navigator.clipboard.writeText(text)
    // Could show a toast here
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}
</script>

<style scoped>
.json-editor-container {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.json-editor-header {
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.json-editor-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.json-editor-textarea {
  position: relative;
}

.json-textarea {
  width: 100%;
  min-height: 300px;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  border: none;
  outline: none;
  resize: vertical;
  background: #1e293b;
  color: #e2e8f0;
}

.json-textarea.json-error {
  border: 2px solid #ef4444;
}

.json-error-message {
  position: absolute;
  bottom: 8px;
  left: 16px;
  right: 16px;
  padding: 8px 12px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.json-viewer {
  max-height: 600px;
  overflow: auto;
  background: #1e293b;
}

.json-pretty {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #e2e8f0;
  background: transparent;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.json-pretty.json-error {
  color: #ef4444;
}
</style>
