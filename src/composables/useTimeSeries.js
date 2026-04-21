import { ref } from 'vue'

export function useTimeSeries(maxPoints = 60) {
  const data = ref([])
  const labels = ref([])
  
  const addPoint = (value, label = null) => {
    data.value.push(value)
    labels.value.push(label || new Date().toLocaleTimeString())
    
    if (data.value.length > maxPoints) {
      data.value.shift()
      labels.value.shift()
    }
  }
  
  const clear = () => {
    data.value = []
    labels.value = []
  }
  
  const getLatest = () => {
    return data.value.length > 0 ? data.value[data.value.length - 1] : null
  }
  
  const getAverage = () => {
    if (data.value.length === 0) return 0
    const sum = data.value.reduce((a, b) => a + b, 0)
    return sum / data.value.length
  }
  
  return {
    data,
    labels,
    addPoint,
    clear,
    getLatest,
    getAverage
  }
}
