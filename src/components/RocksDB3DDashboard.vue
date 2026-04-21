<template>
  <div>
    <v-card class="mb-6" elevation="2">
      <v-card-title class="d-flex justify-space-between align-center pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-cube-outline" size="32" color="primary" class="mr-3"></v-icon>
          <span class="text-h5 font-weight-bold">RocksDB Tree 3D Dashboard</span>
        </div>
        <div class="d-flex gap-2">
          <v-btn
            color="info"
            variant="outlined"
            @click="resetCamera"
            prepend-icon="mdi-camera-control"
          >
            Reset View
          </v-btn>
          <v-btn
            :color="'#0e2438'"
            @click="loadRocksDBData"
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

    <v-row>
      <v-col cols="12" md="9">
        <v-card elevation="2" class="rocksdb-canvas-container">
          <div ref="canvasContainer" class="canvas-wrapper"></div>
          
          <!-- Loading Overlay -->
          <v-overlay v-if="loading" class="align-center justify-center">
            <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            <div class="mt-4 text-h6">Loading RocksDB data...</div>
          </v-overlay>

          <!-- Info Panel -->
          <v-card
            v-if="rocksdbData"
            class="info-panel"
            elevation="4"
          >
            <v-card-title class="text-subtitle-1 pa-2">
              <v-icon icon="mdi-information" class="mr-2"></v-icon>
              RocksDB Statistics
            </v-card-title>
            <v-card-text class="pa-2">
              <div class="text-caption mb-1">
                <strong>Memory:</strong> {{ formatBytes(rocksdbData.memory?.memtable_size_bytes || 0) }}
              </div>
              <div class="text-caption mb-1">
                <strong>Disk:</strong> {{ formatBytes(rocksdbData.disk?.sstable_size_bytes || 0) }}
              </div>
              <div class="text-caption">
                <strong>SSTables:</strong> {{ rocksdbData.disk?.sstable_count || 0 }}
              </div>
            </v-card-text>
          </v-card>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card elevation="2">
          <v-card-title class="pa-3">
            <v-icon icon="mdi-chart-bar" class="mr-2"></v-icon>
            Real-time Status
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="statusColors.flush" icon="mdi-database-export"></v-icon>
                </template>
                <v-list-item-title>Flushes</v-list-item-title>
                <v-list-item-subtitle>{{ flushCount }} active</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="statusColors.merge" icon="mdi-merge"></v-icon>
                </template>
                <v-list-item-title>Merges</v-list-item-title>
                <v-list-item-subtitle>{{ mergeCount }} active</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon :color="statusColors.compact" icon="mdi-compress"></v-icon>
                </template>
                <v-list-item-title>Compactions</v-list-item-title>
                <v-list-item-subtitle>{{ compactCount }} active</v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-divider class="my-3"></v-divider>

            <div class="text-caption text-grey-darken-1">
              <div class="mb-2">
                <strong>Physical Size:</strong> {{ formatBytes(rocksdbData?.disk?.sstable_size_bytes || 0) }}
              </div>
              <div class="mb-2">
                <strong>Logical Entries:</strong> {{ logicalEntries.toLocaleString() }}
              </div>
              <div>
                <strong>Compression Ratio:</strong> {{ compressionRatio.toFixed(2) }}x
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRocksDBStats } from '../composables/useRocksDBStats'
import { inject } from 'vue'
import * as THREE from 'three'
import { gsap } from 'gsap'

const baseUrl = inject('baseUrl')
const { rocksdbData, loading, loadRocksDBStats } = useRocksDBStats(baseUrl)

const canvasContainer = ref(null)
let scene = null
let camera = null
let renderer = null
let animationId = null
let rocksdbBars = []

const flushCount = ref(0)
const mergeCount = ref(0)
const compactCount = ref(0)
const logicalEntries = ref(0)
const compressionRatio = ref(1.0)

const statusColors = {
  flush: 'blue',
  merge: 'orange',
  compact: 'green'
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const initThreeJS = () => {
  if (!canvasContainer.value) return

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f5f5)

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
    0.1,
    1000
  )
  camera.position.set(0, 5, 10)
  camera.lookAt(0, 0, 0)

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  renderer.shadowMap.enabled = true
  canvasContainer.value.appendChild(renderer.domElement)

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // Grid
  const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc)
  scene.add(gridHelper)

  // Controls (simple orbit)
  let isDragging = false
  let previousMousePosition = { x: 0, y: 0 }

  renderer.domElement.addEventListener('mousedown', (e) => {
    isDragging = true
    previousMousePosition = { x: e.clientX, y: e.clientY }
  })

  renderer.domElement.addEventListener('mousemove', (e) => {
    if (!isDragging) return

    const deltaX = e.clientX - previousMousePosition.x
    const deltaY = e.clientY - previousMousePosition.y

    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * 0.01)
    
    const spherical = new THREE.Spherical()
    spherical.setFromVector3(camera.position)
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.01))
    camera.position.setFromSpherical(spherical)
    camera.lookAt(0, 0, 0)

    previousMousePosition = { x: e.clientX, y: e.clientY }
  })

  renderer.domElement.addEventListener('mouseup', () => {
    isDragging = false
  })

  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault()
    const delta = e.deltaY * 0.01
    camera.position.multiplyScalar(1 + delta)
  })

  // Handle resize
  window.addEventListener('resize', onWindowResize)
}

const onWindowResize = () => {
  if (!canvasContainer.value || !camera || !renderer) return
  
  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
}

const createRocksDBVisualization = () => {
  if (!scene || !rocksdbData.value) return

  // Clear existing bars
  rocksdbBars.forEach(bar => scene.remove(bar))
  rocksdbBars = []

  const levels = 5 // Simulate 5 RocksDB levels
  const barWidth = 0.8
  const spacing = 1.2

  for (let i = 0; i < levels; i++) {
    // Calculate bar height based on data
    const memSize = rocksdbData.value.memory?.memtable_size_bytes || 0
    const diskSize = rocksdbData.value.disk?.sstable_size_bytes || 0
    const totalSize = memSize + diskSize
    const height = Math.max(0.5, Math.min(5, (totalSize / (1024 * 1024 * 1024)) * 2)) // Scale to reasonable height

    // Physical size bar (blue)
    const physicalGeometry = new THREE.BoxGeometry(barWidth, height, barWidth)
    const physicalMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2196f3,
      metalness: 0.3,
      roughness: 0.7
    })
    const physicalBar = new THREE.Mesh(physicalGeometry, physicalMaterial)
    physicalBar.position.set((i - levels / 2) * spacing, height / 2, 0)
    physicalBar.castShadow = true
    physicalBar.receiveShadow = true
    scene.add(physicalBar)
    rocksdbBars.push(physicalBar)

    // Logical entries bar (green, slightly offset)
    const logicalHeight = height * 1.2 // Logical is typically larger
    const logicalGeometry = new THREE.BoxGeometry(barWidth * 0.8, logicalHeight, barWidth * 0.8)
    const logicalMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4caf50,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.7
    })
    const logicalBar = new THREE.Mesh(logicalGeometry, logicalMaterial)
    logicalBar.position.set((i - levels / 2) * spacing + 0.3, logicalHeight / 2, 0.3)
    logicalBar.castShadow = true
    scene.add(logicalBar)
    rocksdbBars.push(logicalBar)

    // Animate bars
    gsap.fromTo(physicalBar.scale,
      { y: 0 },
      { y: 1, duration: 1, delay: i * 0.1, ease: 'power2.out' }
    )
    gsap.fromTo(logicalBar.scale,
      { y: 0 },
      { y: 1, duration: 1, delay: i * 0.1 + 0.2, ease: 'power2.out' }
    )
  }

  // Update stats
  logicalEntries.value = Math.floor((rocksdbData.value.disk?.sstable_size_bytes || 0) / 100)
  compressionRatio.value = logicalEntries.value > 0 
    ? (rocksdbData.value.disk?.sstable_size_bytes || 1) / logicalEntries.value 
    : 1.0
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  // Rotate bars slightly for visual interest
  rocksdbBars.forEach((bar, index) => {
    if (index % 2 === 0) {
      bar.rotation.y += 0.005
    }
  })

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

const resetCamera = () => {
  if (camera) {
    gsap.to(camera.position, {
      x: 0,
      y: 5,
      z: 10,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => {
        camera.lookAt(0, 0, 0)
      }
    })
  }
}

const loadRocksDBData = async () => {
  await loadRocksDBStats()
  if (rocksdbData.value) {
    createRocksDBVisualization()
  }
}

watch(rocksdbData, () => {
  if (rocksdbData.value) {
    createRocksDBVisualization()
  }
})

onMounted(() => {
  initThreeJS()
  animate()
  loadRocksDBData()

  // Simulate real-time updates
  setInterval(() => {
    flushCount.value = Math.floor(Math.random() * 3)
    mergeCount.value = Math.floor(Math.random() * 2)
    compactCount.value = Math.floor(Math.random() * 2)
  }, 2000)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', onWindowResize)
  if (renderer && canvasContainer.value) {
    canvasContainer.value.removeChild(renderer.domElement)
    renderer.dispose()
  }
})
</script>

<style scoped>
.rocksdb-canvas-container {
  position: relative;
  min-height: 600px;
  background: #f5f5f5;
}

.canvas-wrapper {
  width: 100%;
  height: 600px;
  position: relative;
}

.info-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  min-width: 200px;
}
</style>
