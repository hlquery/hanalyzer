import { inject } from 'vue'

/**
 * Professional error handling composable
 * Provides user-friendly error messages and logging
 */
export function useErrorHandler() {
  const toast = inject('toast', { error: () => {} })

  const handleError = (error, context = 'Operation') => {
    let userMessage = 'An unexpected error occurred'
    let technicalMessage = error?.message || 'Unknown error'
    let protocolCode = null
    let protocolCodeText = null
    
    // Handle different error types
    if (error?.response) {
      // HTTP error response
      const status = error.response.status
      const data = error.response.data
      
      // Extract protocol codes if available
      if (data?.code) {
        protocolCode = data.code
        protocolCodeText = data.code_text || `Code ${data.code}`
      }
      
      // Map protocol codes to user-friendly messages
      if (protocolCode) {
        switch (protocolCode) {
          case 21000: // COLLECTION_NOT_FOUND
            userMessage = 'Collection not found. The specified collection does not exist.'
            break
          case 21001: // COLLECTION_EMPTY
            userMessage = 'Collection is empty. No documents found in this collection.'
            break
          case 21002: // COLLECTION_EXISTS
            userMessage = 'Collection already exists with this name.'
            break
          case 22000: // DOCUMENT_NOT_FOUND
            userMessage = 'Document not found. The specified document does not exist.'
            break
          case 23000: // SEARCH_INVALID_QUERY
            userMessage = 'Invalid search query. Please check your search parameters.'
            break
          case 23004: // SEARCH_EMPTY_QUERY
            userMessage = 'Search query cannot be empty.'
            break
          case 24001: // VALIDATION_INVALID_JSON
            userMessage = 'Invalid JSON format. Please check your request body.'
            break
          case 25000: // AUTH_REQUIRED
            userMessage = 'Authentication required. Please check your credentials.'
            break
          case 26001: // SYSTEM_UNAVAILABLE
            userMessage = 'Service temporarily unavailable. The server may be starting up.'
            break
          case 26002: // SYSTEM_SYNCING
            userMessage = 'System is syncing. Please wait a moment and try again.'
            break
          default:
            // Use code_text if available, otherwise fall through to HTTP status handling
            if (protocolCodeText) {
              userMessage = data?.message || data?.error || protocolCodeText
            }
        }
      }
      
      // Fall back to HTTP status code handling if no protocol code mapping
      if (!protocolCode || !userMessage || userMessage === 'An unexpected error occurred') {
        switch (status) {
          case 400:
            userMessage = data?.message || data?.error || 'Invalid request. Please check your input and try again.'
            break
          case 401:
            userMessage = 'Authentication required. Please check your credentials.'
            break
          case 403:
            userMessage = data?.message || 'You don\'t have permission to perform this action.'
            break
          case 404:
            userMessage = 'The requested resource was not found.'
            break
          case 409:
            userMessage = data?.message || 'A conflict occurred. The resource may already exist.'
            break
          case 429:
            userMessage = 'Too many requests. Please wait a moment and try again.'
            break
          case 500:
            userMessage = 'Server error. Please try again later or contact support.'
            break
          case 503:
            userMessage = 'Service temporarily unavailable. The server may be starting up. Please wait a moment.'
            break
          case 504:
            userMessage = 'Request timeout. The server took too long to respond.'
            break
          default:
            userMessage = data?.message || data?.error || `Server returned an error (${status}). Please try again.`
        }
      }
      
      technicalMessage = protocolCode 
        ? `HTTP ${status} [Code ${protocolCode}: ${protocolCodeText || 'Unknown'}] ${data?.error || data?.message || error.message}`
        : `HTTP ${status}: ${data?.error || data?.message || error.message}`
    } else if (error?.request) {
      // Network error
      userMessage = 'Network error. Please check your connection and try again.'
      technicalMessage = 'Network request failed'
    } else if (error?.message) {
      // JavaScript error
      userMessage = error.message
      technicalMessage = error.message
    }
    
    // Log technical details for debugging
    console.error(`[${context}] Error:`, {
      message: technicalMessage,
      error: error,
      timestamp: new Date().toISOString()
    })
    
    // Show user-friendly message
    toast.error(userMessage, `${context} Failed`)
    
    return {
      userMessage,
      technicalMessage,
      protocolCode,
      protocolCodeText,
      error
    }
  }
  
  const handleSuccess = (message, title = 'Success') => {
    toast.success(message, title)
  }
  
  const handleWarning = (message, title = 'Warning') => {
    toast.warning(message, title)
  }
  
  const handleInfo = (message, title = 'Info') => {
    toast.info(message, title)
  }
  
  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo
  }
}
