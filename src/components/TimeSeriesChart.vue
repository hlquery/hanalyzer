<template>
  <div class="time-series-chart-container">
    <div v-if="loading" class="chart-loading">
      <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
    </div>
    <Line
      v-else
      :data="chartData"
      :options="chartOptions"
      :height="height"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  labels: {
    type: Array,
    default: () => []
  },
  label: {
    type: String,
    default: 'Value'
  },
  color: {
    type: String,
    default: '#1976d2'
  },
  height: {
    type: Number,
    default: 200
  },
  loading: {
    type: Boolean,
    default: false
  },
  yAxisLabel: {
    type: String,
    default: ''
  },
  fill: {
    type: Boolean,
    default: true
  }
})

const normalizedData = computed(() => Array.isArray(props.data) ? props.data : [])
const normalizedLabels = computed(() => Array.isArray(props.labels) ? props.labels : [])

const chartData = computed(() => {
  const fillColor = props.fill ? props.color.replace('1)', '0.1)') : 'transparent'
  
  return {
    labels: normalizedLabels.value.length > 0 ? normalizedLabels.value : normalizedData.value.map((_, i) => `${i + 1}`),
    datasets: [{
      label: props.label,
      data: normalizedData.value,
      borderColor: props.color,
      backgroundColor: fillColor,
      borderWidth: 2.5,
      fill: props.fill,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: props.color,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
    }]
  }
})

const chartOptions = computed(() => {
  const maxValue = normalizedData.value.length > 0 ? Math.max(...normalizedData.value) : 100
  const minValue = normalizedData.value.length > 0 ? Math.min(...normalizedData.value) : 0
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          family: 'Inter, Helvetica, sans-serif',
          size: 13,
          weight: '600'
        },
        bodyFont: {
          family: 'Inter, Helvetica, sans-serif',
          size: 12
        },
        borderColor: props.color,
        borderWidth: 1,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: minValue >= 0,
        min: minValue >= 0 ? 0 : minValue * 1.1,
        max: maxValue * 1.2 || 100,
        ticks: {
          font: {
            family: 'Inter, Helvetica, sans-serif',
            size: 11,
            weight: '500'
          },
          color: '#64748b',
          padding: 8,
          callback: function(value) {
            if (props.yAxisLabel) {
              return value + props.yAxisLabel
            }
            return value
          }
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.6)',
          drawBorder: false,
          lineWidth: 1,
          borderDash: [2, 2]
        }
      },
      x: {
        ticks: {
          font: {
            family: 'Inter, Helvetica, sans-serif',
            size: 10,
            weight: '500'
          },
          color: '#64748b',
          maxRotation: 0,
          minRotation: 0,
          maxTicksLimit: 10
        },
        grid: {
          display: false,
          drawBorder: false
        }
      }
    }
  }
})
</script>

<style scoped>
.time-series-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
</style>
