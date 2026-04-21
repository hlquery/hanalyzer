<template>
  <v-tooltip :location="location" :text="text" :disabled="!text">
    <template v-slot:activator="{ props }">
      <v-icon
        v-bind="props"
        :size="size"
        :color="color"
        class="help-icon"
      >
        mdi-help-circle-outline
      </v-icon>
    </template>
  </v-tooltip>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'top'
  },
  size: {
    type: Number,
    default: 18
  },
  color: {
    type: String,
    default: '#64748b'
  }
})
</script>

<style scoped>
.help-icon {
  cursor: help;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.help-icon:hover {
  opacity: 1;
}
</style>
