<template>
  <v-menu location="bottom end" :close-on-content-click="false">
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
        size="small"
        class="quick-actions-btn"
      >
        <v-icon>mdi-dots-vertical</v-icon>
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        v-for="action in actions"
        :key="action.id"
        @click="action.handler"
        :disabled="action.disabled"
      >
        <template v-slot:prepend>
          <v-icon :color="action.color">{{ action.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ action.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
defineProps({
  actions: {
    type: Array,
    required: true,
    validator: (actions) => {
      return actions.every(a => a.id && a.label && a.handler && a.icon)
    }
  }
})
</script>

<style scoped>
.quick-actions-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.quick-actions-btn:hover {
  opacity: 1;
}
</style>
