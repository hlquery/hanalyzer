<template>
  <div class="toast-container">
    <TransitionGroup name="toast" tag="div">
      <v-card
        v-for="toast in toasts"
        :key="toast.id"
        v-show="toast.visible"
        :color="getToastColor(toast.type)"
        variant="flat"
        elevation="8"
        class="toast-card"
        @click="removeToast(toast.id)"
      >
        <v-card-text class="toast-content">
          <div class="toast-row">
            <v-icon
              :icon="getToastIcon(toast.type)"
              size="24"
              class="toast-icon"
              :style="{ color: getToastIconColor(toast.type) }"
            ></v-icon>
            <div class="toast-copy">
              <div v-if="toast.title" class="toast-title">
                {{ toast.title }}
              </div>
              <div class="toast-message">
                {{ toast.message }}
              </div>
            </div>
            <v-btn
              icon
              variant="text"
              size="small"
              @click.stop="removeToast(toast.id)"
              class="toast-close-btn"
            >
              <v-icon size="18">mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()

const getToastColor = (type) => {
  // Use light gray for all toasts
  return 'grey-lighten-1'
}

const getToastIcon = (type) => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  return icons[type] || 'mdi-information'
}

const getToastIconColor = (type) => {
  const colors = {
    success: '#10b981', // green
    error: '#ef4444', // red
    warning: '#f59e0b', // orange
    info: '#3b82f6' // blue
  }
  return colors[type] || '#3b82f6'
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}

.toast-card {
  pointer-events: auto;
  cursor: pointer;
  border-radius: 14px !important;
  background: #ffffff !important;
  border: 1px solid #dbe3ee !important;
  box-shadow: 
    0 14px 34px rgba(15, 23, 42, 0.10),
    0 4px 14px rgba(15, 23, 42, 0.06) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  min-width: 0;
  max-width: 100%;
}

.toast-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 18px 42px rgba(15, 23, 42, 0.12),
    0 6px 18px rgba(15, 23, 42, 0.08) !important;
  border-color: #cbd5e1 !important;
}

.toast-content {
  padding: 14px 16px !important;
  font-family: Inter, Helvetica, sans-serif !important;
}

.toast-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  width: 100%;
  gap: 12px;
}

.toast-copy {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
}

.toast-title {
  font-size: 14px;
  line-height: 1.35;
  color: #0f172a;
  font-weight: 700;
  margin-bottom: 2px;
  word-break: break-word;
}

.toast-message {
  font-size: 13px;
  line-height: 1.45;
  color: #475569;
  word-break: break-word;
}

.toast-icon {
  opacity: 1;
  flex-shrink: 0;
  align-self: start;
  margin-top: 1px;
}

.toast-icon :deep(svg) {
  color: inherit !important;
}

.toast-close-btn {
  color: #64748b !important;
  transition: all 0.2s ease !important;
  align-self: start;
  margin: -4px -6px 0 0 !important;
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
}

.toast-close-btn:hover {
  color: #1e293b !important;
  background: rgba(0, 0, 0, 0.05) !important;
}

/* Toast animations */
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) translateY(20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) translateY(20px) scale(0.95);
}

.toast-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 600px) {
  .toast-container {
    bottom: 16px;
    right: 16px;
    left: 16px;
    width: auto;
  }
  
  .toast-card {
    max-width: none;
  }
}
</style>
