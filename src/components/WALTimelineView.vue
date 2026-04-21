<template>
  <div>
    <v-card class="mb-6" elevation="2">
      <v-card-title class="d-flex justify-space-between align-center pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-timeline" size="32" color="primary" class="mr-3"></v-icon>
          <span class="text-h5 font-weight-bold">WAL Timeline</span>
        </div>
        <div class="d-flex gap-2">
          <v-select
            v-model="selectedCollection"
            :items="collectionItems"
            label="Collection"
            prepend-inner-icon="mdi-folder"
            variant="outlined"
            style="min-width: 200px;"
            bg-color="white"
            clearable
            @update:model-value="loadTimeline"
          ></v-select>
          <v-btn
            :color="'#0e2438'"
            @click="loadTimeline(true)"
            :loading="loading"
            prepend-icon="mdi-refresh"
            variant="flat"
            style="color: white; font-weight: 500;"
          >
            Refresh
          </v-btn>
        </div>
      </v-card-title>
    </v-card>

    <v-card elevation="2" class="timeline-container">
      <v-card-text class="pa-0">
        <div v-if="loading" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <div class="mt-4 text-h6">Loading timeline...</div>
        </div>

        <div v-else-if="timeline.length === 0" class="text-center py-12">
          <v-icon icon="mdi-timeline-outline" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
          <div class="text-h6 text-grey-darken-1 mb-2">No timeline data</div>
          <div class="text-body-2 text-grey-darken-2">WAL events will appear here</div>
        </div>

        <div v-else class="timeline-wrapper">
          <!-- Timeline Header -->
          <div class="timeline-header pa-4 bg-grey-lighten-4">
            <div class="d-flex justify-space-between align-center">
              <div>
                <span class="text-h6 font-weight-bold">{{ timeline.length }} Events</span>
                <span class="text-caption text-grey-darken-1 ml-2">
                  {{ formatTimeRange(timeline) }}
                </span>
              </div>
              <div class="d-flex gap-2">
                <v-chip
                  v-for="type in eventTypes"
                  :key="type.name"
                  :color="type.color"
                  size="small"
                  variant="flat"
                  class="mr-1"
                >
                  <v-icon :icon="type.icon" size="small" class="mr-1"></v-icon>
                  {{ type.count }}
                </v-chip>
              </div>
            </div>
          </div>

          <!-- Timeline Content -->
          <div class="timeline-content pa-4">
            <div class="timeline-line"></div>
            
            <div
              v-for="(event, index) in sortedTimeline"
              :key="event.id"
              class="timeline-event"
              :class="[`event-${event.type}`, getEventCardClass(index)]"
              :style="getEventStyle(event, index)"
            >
              <div class="event-marker" :class="`marker-${event.type}`">
                <v-icon :icon="getEventIcon(event.type)" size="20"></v-icon>
              </div>
              
              <div class="event-card" @click="selectEvent(event)">
                <div class="event-header">
                  <div class="d-flex align-center">
                    <v-chip
                      :color="getEventColor(event.type)"
                      size="small"
                      variant="flat"
                      class="mr-2"
                    >
                      {{ event.type.toUpperCase() }}
                    </v-chip>
                    <span class="text-subtitle-2 font-weight-bold">{{ event.collection }}</span>
                  </div>
                  <span class="text-caption text-grey-darken-1">
                    {{ formatTimestamp(event.timestamp) }}
                  </span>
                </div>
                
                <div class="event-body">
                  <div class="text-body-2">
                    <v-icon :icon="getEventIcon(event.type)" size="small" class="mr-1"></v-icon>
                    {{ getEventDescription(event) }}
                  </div>
                  <div v-if="event.count" class="text-caption text-grey-darken-1 mt-1">
                    {{ event.count }} items affected
                  </div>
                </div>

                <div class="event-status">
                  <v-chip
                    :color="event.status === 'success' ? 'success' : 'error'"
                    size="x-small"
                    variant="flat"
                  >
                    {{ event.status }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Event Detail Dialog -->
    <v-dialog v-model="showEventDialog" max-width="600">
      <v-card v-if="selectedEvent">
        <v-card-title class="d-flex justify-space-between align-center pa-4 bg-primary">
          <div class="d-flex align-center">
            <v-icon :icon="getEventIcon(selectedEvent.type)" color="white" class="mr-2"></v-icon>
            <span class="text-white font-weight-bold">Event Details</span>
          </div>
          <v-btn icon variant="text" @click="showEventDialog = false" color="white">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>Type</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.type }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Collection</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.collection }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Timestamp</v-list-item-title>
              <v-list-item-subtitle>{{ formatTimestamp(selectedEvent.timestamp) }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Status</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.status }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedEvent.count">
              <v-list-item-title>Count</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.count }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useWALTimeline } from '../composables/useWALTimeline'
import { useCollections } from '../composables/useCollections'
import { inject } from 'vue'
import { gsap } from 'gsap'

const baseUrl = inject('baseUrl')
const { timeline, loading, loadWALTimeline, loadWithRetry, startAutoRefresh, stopAutoRefresh } = useWALTimeline(baseUrl)
const { collections, loadCollections } = useCollections(baseUrl)

const selectedCollection = ref(null)
const showEventDialog = ref(false)
const selectedEvent = ref(null)

const collectionItems = computed(() => {
  return [
    { title: 'All Collections', value: null },
    ...collections.value.map(col => ({ title: col.name, value: col.name }))
  ]
})

const sortedTimeline = computed(() => {
  return [...timeline.value].sort((a, b) => b.timestamp - a.timestamp)
})

const eventTypes = computed(() => {
  const types = {
    insert: { name: 'Insert', icon: 'mdi-plus-circle', color: 'success', count: 0 },
    update: { name: 'Update', icon: 'mdi-pencil', color: 'info', count: 0 },
    delete: { name: 'Delete', icon: 'mdi-delete', color: 'error', count: 0 },
    flush: { name: 'Flush', icon: 'mdi-database-export', color: 'blue', count: 0 },
    merge: { name: 'Merge', icon: 'mdi-merge', color: 'orange', count: 0 },
    compact: { name: 'Compact', icon: 'mdi-compress', color: 'purple', count: 0 },
    crash: { name: 'Crash', icon: 'mdi-alert', color: 'red', count: 0 },
    recovery: { name: 'Recovery', icon: 'mdi-backup-restore', color: 'amber', count: 0 }
  }

  timeline.value.forEach(event => {
    if (types[event.type]) {
      types[event.type].count++
    }
  })

  return Object.values(types).filter(t => t.count > 0)
})

const getEventIcon = (type) => {
  const icons = {
    insert: 'mdi-plus-circle',
    update: 'mdi-pencil',
    delete: 'mdi-delete',
    flush: 'mdi-database-export',
    merge: 'mdi-merge',
    compact: 'mdi-compress',
    crash: 'mdi-alert',
    recovery: 'mdi-backup-restore'
  }
  return icons[type] || 'mdi-circle'
}

const getEventColor = (type) => {
  const colors = {
    insert: 'success',
    update: 'info',
    delete: 'error',
    flush: 'blue',
    merge: 'orange',
    compact: 'purple',
    crash: 'red',
    recovery: 'amber'
  }
  return colors[type] || 'grey'
}

const getEventDescription = (event) => {
  const descriptions = {
    insert: `Inserted ${event.count || 0} documents`,
    update: `Updated ${event.count || 0} documents`,
    delete: `Deleted ${event.count || 0} documents`,
    flush: `Flushed memtable to disk`,
    merge: `Merged ${event.count || 0} SSTables`,
    compact: `Compacted RocksDB levels`,
    crash: `System crash detected`,
    recovery: `Recovery completed`
  }
  return descriptions[event.type] || event.type
}

const getEventStyle = (event, index) => {
  const isLeft = index % 2 === 0
  return {
    '--event-delay': `${index * 0.1}s`
  }
}

const getEventCardClass = (index) => {
  const isLeft = index % 2 === 0
  return isLeft ? 'event-card-left' : 'event-card-right'
}

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const formatTimeRange = (events) => {
  if (events.length === 0) return ''
  const times = events.map(e => e.timestamp)
  const min = Math.min(...times)
  const max = Math.max(...times)
  return `${formatTimestamp(min)} - ${formatTimestamp(max)}`
}

const selectEvent = (event) => {
  selectedEvent.value = event
  showEventDialog.value = true
}

const loadTimeline = async (showLoading = false) => {
  // Load in background without blocking
  if (showLoading) {
    await loadWALTimeline(selectedCollection.value)
  } else {
    // Non-blocking load with retry
    loadWithRetry(selectedCollection.value).then(() => {
      // Animate new events only
      nextTick(() => {
        gsap.fromTo('.timeline-event',
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
        )
      })
    }).catch(() => {
      // Silent fail - will retry automatically
    })
  }
}

// Watch for collection changes
watch(selectedCollection, (newVal) => {
  stopAutoRefresh()
  loadTimeline(false)
  startAutoRefresh(newVal, 10000)
})

onMounted(async () => {
  // Load collections in background (non-blocking)
  loadCollections().catch(() => {})
  
  // Start timeline load immediately (non-blocking)
  loadTimeline(false)
  
  // Start auto-refresh with incremental updates (every 10 seconds)
  startAutoRefresh(selectedCollection.value, 10000)
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.timeline-container {
  min-height: 600px;
}

.timeline-wrapper {
  position: relative;
}

.timeline-header {
  border-bottom: 2px solid #e0e0e0;
}

.timeline-content {
  position: relative;
  min-height: 500px;
}

.timeline-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #1976D2, #42A5F5);
  transform: translateX(-50%);
  z-index: 0;
}

.timeline-event {
  position: relative;
  margin-bottom: 32px;
  z-index: 1;
  animation: fadeInSlide 0.5s ease-out;
  animation-delay: var(--event-delay, 0s);
  animation-fill-mode: both;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.event-marker {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2;
  transition: all 0.3s ease;
}

.event-marker:hover {
  transform: translateX(-50%) scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.marker-insert { background: #4caf50; color: white; }
.marker-update { background: #2196f3; color: white; }
.marker-delete { background: #f44336; color: white; }
.marker-flush { background: #1976d2; color: white; }
.marker-merge { background: #ff9800; color: white; }
.marker-compact { background: #9c27b0; color: white; }
.marker-crash { background: #d32f2f; color: white; }
.marker-recovery { background: #ffc107; color: white; }

.event-card {
  position: relative;
  width: 45%;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: -24px;
}

.event-card-left {
  margin-left: 0;
  margin-right: auto;
}

.event-card-right {
  margin-left: auto;
  margin-right: 0;
}

.event-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.event-body {
  margin-bottom: 8px;
}

.event-status {
  display: flex;
  justify-content: flex-end;
}

.event-insert .event-card {
  border-left: 4px solid #4caf50;
}

.event-update .event-card {
  border-left: 4px solid #2196f3;
}

.event-delete .event-card {
  border-left: 4px solid #f44336;
}

.event-flush .event-card {
  border-left: 4px solid #1976d2;
}

.event-merge .event-card {
  border-left: 4px solid #ff9800;
}

.event-compact .event-card {
  border-left: 4px solid #9c27b0;
}

.event-crash .event-card {
  border-left: 4px solid #d32f2f;
}

.event-recovery .event-card {
  border-left: 4px solid #ffc107;
}
</style>
