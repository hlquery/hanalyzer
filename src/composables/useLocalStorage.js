import { ref, watch } from 'vue'

export function useLocalStorage(key, defaultValue = null) {
  // Safely parse JSON from localStorage
  let initialValue = defaultValue
  try {
    const storedValue = localStorage.getItem(key)
    if (storedValue) {
      initialValue = JSON.parse(storedValue)
    }
  } catch (e) {
    console.warn(`Failed to parse JSON from localStorage (${key}):`, e)
    // Remove corrupted data
    try {
      localStorage.removeItem(key)
    } catch (removeErr) {
      console.warn(`Failed to remove corrupted localStorage item (${key}):`, removeErr)
    }
    initialValue = defaultValue
  }
  
  const value = ref(initialValue)
  
  // Watch for changes and persist to localStorage
  watch(value, (newValue) => {
    try {
      if (newValue === null || newValue === undefined) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(newValue))
      }
    } catch (e) {
      console.warn(`Failed to save to localStorage (${key}):`, e)
    }
  }, { deep: true })
  
  return value
}
