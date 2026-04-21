<template>
  <div class="empty-state-container">
    <div class="empty-state-content">
      <div class="empty-state-icon-wrapper">
        <v-icon 
          :icon="icon" 
          :size="iconSize" 
          :color="iconColor"
          class="empty-state-icon"
        ></v-icon>
      </div>
      <h2 class="empty-state-title">{{ title }}</h2>
      <p class="empty-state-description">{{ description }}</p>
      <div v-if="actions && actions.length > 0" class="empty-state-actions">
        <v-btn
          v-for="(action, index) in actions"
          :key="index"
          :color="action.color || 'primary'"
          :variant="action.variant || 'flat'"
          :prepend-icon="action.icon"
          @click="action.handler"
          size="small"
          class="empty-state-action-btn"
        >
          {{ action.label }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: 'mdi-information-outline'
  },
  iconSize: {
    type: Number,
    default: 80
  },
  iconColor: {
    type: String,
    default: '#cbd5e1'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  actions: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.empty-state-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 48px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.empty-state-content {
  text-align: center;
  max-width: 500px;
}

.empty-state-icon-wrapper {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.empty-state-icon {
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.empty-state-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.empty-state-description {
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.empty-state-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.empty-state-action-btn {
  min-width: 140px;
}
</style>
