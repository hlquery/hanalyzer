<template>
  <div class="skeleton-container" :class="variant">
    <div v-if="variant === 'card'" class="skeleton-card">
      <div class="skeleton-header"></div>
      <div class="skeleton-line" v-for="i in lines" :key="i" :style="{ width: getLineWidth(i) }"></div>
    </div>
    <div v-else-if="variant === 'table'" class="skeleton-table">
      <div class="skeleton-row" v-for="i in rows" :key="i">
        <div class="skeleton-cell" v-for="j in columns" :key="j"></div>
      </div>
    </div>
    <div v-else-if="variant === 'list'" class="skeleton-list">
      <div class="skeleton-item" v-for="i in items" :key="i">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line" style="width: 60%"></div>
          <div class="skeleton-line" style="width: 40%"></div>
        </div>
      </div>
    </div>
    <div v-else class="skeleton-default">
      <div class="skeleton-line" v-for="i in lines" :key="i" :style="{ width: getLineWidth(i) }"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'card', 'table', 'list'].includes(value)
  },
  lines: {
    type: Number,
    default: 3
  },
  rows: {
    type: Number,
    default: 5
  },
  columns: {
    type: Number,
    default: 4
  },
  items: {
    type: Number,
    default: 5
  }
})

const getLineWidth = (index) => {
  const widths = [100, 85, 70, 90, 75]
  return `${widths[(index - 1) % widths.length]}%`
}
</script>

<style scoped>
.skeleton-container {
  width: 100%;
}

.skeleton-line,
.skeleton-header,
.skeleton-cell,
.skeleton-avatar {
  background: linear-gradient(
    90deg,
    #f1f5f9 0%,
    #e2e8f0 50%,
    #f1f5f9 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 6px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-card {
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.skeleton-header {
  height: 24px;
  width: 40%;
  margin-bottom: 20px;
}

.skeleton-line {
  height: 16px;
  margin-bottom: 12px;
}

.skeleton-table {
  width: 100%;
}

.skeleton-row {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.skeleton-cell {
  flex: 1;
  height: 20px;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-item {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-default {
  padding: 16px;
}
</style>
