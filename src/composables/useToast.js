import { ref } from 'vue'

const toasts = ref([])
let toastId = 0

export function useToast() {
  const showToast = (message, type = 'info', title = null, duration = 4000) => {
    const id = toastId++
    const toast = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      title,
      duration,
      visible: true
    }
    
    toasts.value.push(toast)
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }
  
  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const success = (message, title = 'Success') => {
    return showToast(message, 'success', title)
  }
  
  const error = (message, title = 'Error') => {
    return showToast(message, 'error', title, 6000) // Errors stay longer
  }
  
  const warning = (message, title = 'Warning') => {
    return showToast(message, 'warning', title)
  }
  
  const info = (message, title = 'Info') => {
    return showToast(message, 'info', title)
  }
  
  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}
