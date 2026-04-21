<template>
  <div class="nf-wrap">
    <div class="nf-card">
      <div class="nf-icon-wrapper">
        <v-icon size="64" color="#94a3b8">mdi-alert-circle-outline</v-icon>
      </div>
      <div class="nf-error-code">404</div>
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <div class="actions">
        <v-btn
          @click="goHome"
          variant="flat"
          size="large"
          prepend-icon="mdi-home"
          class="unified-btn unified-btn-primary"
        >
          Go Home
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const goHome = () => {
  router.push('/collections')
}

onMounted(() => {
  console.log('NotFound component mounted for path:', route.path)
})
</script>
<style scoped>
.nf-wrap { 
  min-height: calc(100vh - 72px); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 40px 24px; 
  background: transparent !important;
  position: relative;
  width: 100%;
  margin: 0;
}

.nf-card { 
  max-width: 800px; 
  width: 100%; 
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 16px !important;
  padding: 96px 64px !important;
  text-align: center;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04) !important;
  position: relative;
}

.nf-icon-wrapper {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.nf-icon-wrapper :deep(.v-icon) {
  font-size: 96px !important;
}

.nf-error-code {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 120px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  line-height: 1 !important;
  margin-bottom: 24px;
  letter-spacing: -0.02em !important;
}

h1 { 
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 36px !important; 
  font-weight: 600 !important; 
  letter-spacing: -0.02em !important; 
  margin: 0 0 16px !important;
  color: #1e293b !important;
}

p { 
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  color: #64748b !important; 
  margin: 0 0 40px !important;
  font-size: 18px !important;
  line-height: 1.6 !important;
  font-weight: 400 !important;
}

.actions { 
  display: flex; 
  gap: 12px; 
  justify-content: center; 
  flex-wrap: wrap;
}

/* Unified button styles - matching CollectionsView */
.unified-btn {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  border-radius: 8px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  min-width: auto !important;
}

.unified-btn-primary {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2) !important;
  padding: 10px 20px !important;
  height: 40px !important;
  font-size: 14px !important;
}

.unified-btn-primary:hover {
  background: linear-gradient(135deg, #1e88e5 0%, #1976d2 100%) !important;
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.3) !important;
  transform: translateY(-1px) !important;
}

.unified-btn-secondary {
  color: #1976d2 !important;
  background: transparent !important;
  padding: 10px 16px !important;
  height: 40px !important;
  font-size: 14px !important;
}

.unified-btn-secondary:hover {
  background: rgba(25, 118, 210, 0.08) !important;
  color: #1565c0 !important;
}

@media (max-width: 600px) {
  .nf-card {
    padding: 64px 32px !important;
    max-width: 100% !important;
  }
  
  .nf-error-code {
    font-size: 80px !important;
  }
  
  h1 {
    font-size: 28px !important;
  }
  
  p {
    font-size: 16px !important;
  }

  .nf-icon-wrapper :deep(.v-icon) {
    font-size: 72px !important;
  }

  .actions {
    flex-direction: column;
    width: 100%;
  }

  .actions .unified-btn {
    width: 100%;
  }
}
</style>