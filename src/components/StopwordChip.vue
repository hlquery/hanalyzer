<template>
  <v-tooltip
    v-if="tooltipText"
    location="top"
    :text="tooltipText"
  >
    <template v-slot:activator="{ props }">
      <v-chip
        v-bind="props"
        :class="['stopword-chip', { 'stopword-chip--deletable': deletable }]"
        :color="color"
        :variant="variant"
        closable
        @click:close="$emit('delete', stopword)"
      >
        <span class="stopword-chip__text">{{ word }}</span>
      </v-chip>
    </template>
  </v-tooltip>
  <v-chip
    v-else
    :class="['stopword-chip', { 'stopword-chip--deletable': deletable }]"
    :color="color"
    :variant="variant"
    closable
    @click:close="$emit('delete', stopword)"
  >
    <span class="stopword-chip__text">{{ word }}</span>
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stopword: {
    type: [String, Object],
    required: true
  },
  color: {
    type: String,
    default: 'primary'
  },
  variant: {
    type: String,
    default: 'outlined'
  },
  deletable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['delete'])

const word = computed(() => {
  if (typeof props.stopword === 'string') {
    return props.stopword
  } else if (props.stopword && typeof props.stopword === 'object') {
    return props.stopword.word || props.stopword.text || JSON.stringify(props.stopword)
  }
  return String(props.stopword)
})

const tooltipText = computed(() => {
  if (typeof props.stopword === 'object' && props.stopword) {
    const parts = []
    if (props.stopword.created_at) {
      parts.push(`Created: ${formatDate(props.stopword.created_at)}`)
    }
    if (props.stopword.updated_at) {
      parts.push(`Updated: ${formatDate(props.stopword.updated_at)}`)
    }
    return parts.join('\n')
  }
  return null
})

const formatDate = (dateString) => {
  if (!dateString && dateString !== 0) return ''
  try {
    let date
    
    if (typeof dateString === 'number') {
      date = dateString < 10000000000 
        ? new Date(dateString * 1000)
        : new Date(dateString)
    } else if (typeof dateString === 'string') {
      date = new Date(dateString)
      if (isNaN(date.getTime())) {
        const timestamp = parseFloat(dateString)
        if (!isNaN(timestamp) && isFinite(timestamp)) {
          date = timestamp < 10000000000 
            ? new Date(timestamp * 1000)
            : new Date(timestamp)
        }
      }
    } else {
      date = new Date(dateString)
    }
    
    if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
      return String(dateString)
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, '0')
    const displaySeconds = seconds.toString().padStart(2, '0')
    
    return `${month} ${day}, ${year} at ${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`
  } catch (err) {
    console.warn('Date formatting error:', err, dateString)
    return String(dateString)
  }
}
</script>

<style scoped>
/* hlquery chip design */
.stopword-chip {
  border-radius: 999px !important;
  padding: 0 12px !important;
  height: 28px !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  cursor: default;
  transition: all 0.15s ease !important;
  border: 1px solid #e3e8ee !important;
}

.stopword-chip:hover {
  border-color: #cbd5e1 !important;
  background: #f6f9fc !important;
}

.stopword-chip__text {
  text-align: center;
  display: block;
  color: #0a2540 !important;
}
</style>
