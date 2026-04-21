<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :max-width="maxWidth" persistent class="confirmation-dialog">
    <v-card class="delete-dialog-card">
      <v-card-title 
        class="d-flex align-center pa-5" 
        :style="`background: linear-gradient(135deg, var(--${type}) 0%, ${getColorDark(type)} 100%); border-radius: 16px 16px 0 0;`"
      >
        <v-icon :icon="getIcon(type)" color="white" class="mr-3"></v-icon>
        <span class="text-white font-weight-bold">{{ title }}</span>
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="text-body-1 mb-2">{{ message }}</div>
        <div v-if="details" class="text-caption text-grey-darken-1 mt-2">{{ details }}</div>
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="$emit('update:error', null)"
        >
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="$emit('cancel')"
          :disabled="loading"
          size="small"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          :color="type"
          variant="flat"
          @click="$emit('confirm')"
          :loading="loading"
          size="small"
          class="delete-btn-centered"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  details: String,
  type: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'error', 'warning', 'info', 'success'].includes(v)
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  loading: Boolean,
  error: String,
  maxWidth: {
    type: [String, Number],
    default: 500
  }
})

defineEmits(['update:modelValue', 'confirm', 'cancel', 'update:error'])

const getIcon = (type) => {
  const icons = {
    error: 'mdi-alert',
    warning: 'mdi-alert',
    info: 'mdi-information',
    success: 'mdi-check-circle',
    primary: 'mdi-help-circle'
  }
  return icons[type] || 'mdi-help-circle'
}

const getColorDark = (type) => {
  const colors = {
    error: '#dc2626',
    warning: '#d97706',
    info: '#0284c7',
    success: '#059669',
    primary: '#005a9e'
  }
  return colors[type] || '#005a9e'
}
</script>

<style scoped>
/* Confirmation Dialog - Consistent Styling */
.confirmation-dialog :deep(.v-overlay__content) {
  border-radius: 16px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: none !important;
}

.confirmation-dialog :deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.5) !important;
}

.delete-dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.delete-btn-centered {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
}

.delete-btn-centered :deep(.v-btn__content) {
  justify-content: center !important;
  width: 100% !important;
}
</style>
