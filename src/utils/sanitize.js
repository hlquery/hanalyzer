/**
 * Sanitize error messages and user input to prevent XSS attacks
 * Removes HTML tags and escapes special characters
 */

export function sanitizeError(error) {
  if (!error) return 'Unknown error'
  
  // Convert to string
  let errorStr = String(error)
  
  // Remove HTML tags
  errorStr = errorStr.replace(/<[^>]*>/g, '')
  
  // Escape special characters that could be used for XSS
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  
  // Replace special characters
  errorStr = errorStr.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char)
  
  // Limit length to prevent extremely long error messages
  if (errorStr.length > 500) {
    errorStr = errorStr.substring(0, 500) + '...'
  }
  
  return errorStr
}

/**
 * Extract safe error message from API error response
 */
export function extractSafeErrorMessage(err, defaultMessage = 'An error occurred') {
  if (!err) return defaultMessage
  
  // Try to get error message from response
  let errorMsg = err.response?.data?.error || 
                 err.response?.data?.message || 
                 err.message || 
                 defaultMessage
  
  // If errorMsg is an object, try to stringify it safely
  if (typeof errorMsg === 'object') {
    try {
      errorMsg = JSON.stringify(errorMsg)
    } catch (e) {
      errorMsg = defaultMessage
    }
  }
  
  // Sanitize the error message
  return sanitizeError(errorMsg)
}
