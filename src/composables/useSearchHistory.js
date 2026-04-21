import { ref, computed } from 'vue'

const searchHistory = ref([])
const MAX_HISTORY = 50

export function useSearchHistory() {
  const addSearch = (query, collection, filters = {}) => {
    const search = {
      id: Date.now(),
      query,
      collection,
      filters,
      timestamp: new Date().toISOString()
    }
    
    // Remove duplicates
    searchHistory.value = searchHistory.value.filter(
      s => !(s.query === query && s.collection === collection)
    )
    
    // Add to beginning
    searchHistory.value.unshift(search)
    
    // Limit history size
    if (searchHistory.value.length > MAX_HISTORY) {
      searchHistory.value = searchHistory.value.slice(0, MAX_HISTORY)
    }
    
    // Persist to localStorage
    try {
      localStorage.setItem('hlquery_search_history', JSON.stringify(searchHistory.value))
    } catch (e) {
      console.warn('Failed to save search history:', e)
    }
  }
  
  const clearHistory = () => {
    searchHistory.value = []
    try {
      localStorage.removeItem('hlquery_search_history')
    } catch (e) {
      console.warn('Failed to clear search history:', e)
    }
  }
  
  const getRecentSearches = (limit = 10) => {
    return searchHistory.value.slice(0, limit)
  }
  
  const getSearchesByCollection = (collection) => {
    return searchHistory.value.filter(s => s.collection === collection)
  }
  
  // Load from localStorage on init
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('hlquery_search_history')
      if (stored) {
        searchHistory.value = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Failed to load search history:', e)
    }
  }
  
  // Initialize
  loadHistory()
  
  return {
    searchHistory: computed(() => searchHistory.value),
    addSearch,
    clearHistory,
    getRecentSearches,
    getSearchesByCollection,
    loadHistory
  }
}
