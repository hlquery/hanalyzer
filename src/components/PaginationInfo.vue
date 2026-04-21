<template>
  <div class="pagination-info">
    <div class="d-flex align-center" style="gap: 8px;">
      <span class="pagination-info-text">
        Showing {{ start }} to {{ end }} of {{ total }} {{ itemLabel }}
        <span v-if="loading" class="ml-2">
          <v-progress-circular indeterminate size="12" width="2" color="primary"></v-progress-circular>
        </span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  itemsPerPage: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  itemLabel: {
    type: String,
    default: 'items'
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const start = computed(() => {
  if (props.total === 0) return 0
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const end = computed(() => {
  return Math.min(props.currentPage * props.itemsPerPage, props.total)
})
</script>

<style scoped>
.pagination-info {
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.pagination-info-text {
  font-size: 13px;
  color: #000000;
  font-weight: 500;
}
</style>
