import axios from 'axios'

/**
 * Validation composable for document and input validation
 */
export function useValidation() {
  /**
   * Sanitize input string
   * @param {string} input - Input string to sanitize
   * @returns {string} - Sanitized string
   */
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') {
      return String(input || '').trim()
    }
    return input.trim()
  }

  /**
   * Validate JSON string
   * @param {string} jsonString - JSON string to validate
   * @param {boolean} strict - If true, requires the JSON to be an object (not array)
   * @returns {{valid: boolean, error?: string, data?: object}}
   */
  const validateJSON = (jsonString, strict = false) => {
    if (!jsonString || !jsonString.trim()) {
      return { valid: false, error: 'JSON is required' }
    }

    try {
      const parsed = JSON.parse(jsonString)
      
      if (strict && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
        return { valid: false, error: 'Document must be a JSON object' }
      }

      return { valid: true, data: parsed }
    } catch (err) {
      return { valid: false, error: `Invalid JSON: ${err.message}` }
    }
  }

  /**
   * Validate document object
   * @param {object} document - Document object to validate
   * @param {string} mode - Validation mode ('json' or 'form')
   * @returns {{valid: boolean, error?: string}}
   */
  const validateDocument = (document, mode = 'form') => {
    if (!document || typeof document !== 'object') {
      return { valid: false, error: 'Document must be an object' }
    }

    if (!document.id) {
      return { valid: false, error: 'Document must include an "id" field' }
    }

    if (typeof document.id !== 'string' || !document.id.trim()) {
      return { valid: false, error: 'Document ID must be a non-empty string' }
    }

    // Validate field values: check for invalid characters (commas)
    // Commas are not allowed in string field values as they're reserved for internal parsing
    for (const [key, value] of Object.entries(document)) {
      // Skip the 'id' field as it has its own validation
      if (key === 'id') continue
      
      // Check string values for commas
      if (typeof value === 'string' && value.includes(',')) {
        return { 
          valid: false, 
          error: `Field '${key}' contains invalid character: comma (,). Commas are not allowed in field values. Use underscores (_) or spaces instead, or use arrays for multiple values.`
        }
      }
      
      // Check array values - ensure they don't contain strings with commas
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.includes(',')) {
            return { 
              valid: false, 
              error: `Field '${key}' contains invalid character: comma (,). Array items cannot contain commas. Use underscores (_) or spaces instead.`
            }
          }
        }
      }
    }

    return { valid: true }
  }

  /**
   * Check connection to server
   * @param {string} baseUrl - Base URL of the server
   * @returns {Promise<{connected: boolean, error?: string}>}
   */
  const checkConnection = async (baseUrl) => {
    if (!baseUrl) {
      return { connected: false, error: 'Base URL is required' }
    }

    try {
      const response = await axios.get(`${baseUrl}/health`, {
        timeout: 5000
      })
      
      if (response.status === 200) {
        return { connected: true }
      }
      
      return { connected: false, error: `Server returned status ${response.status}` }
    } catch (err) {
      // Try alternative endpoint if /health doesn't exist
      try {
        const altResponse = await axios.get(`${baseUrl}/api/health`, {
          timeout: 5000
        })
        if (altResponse.status === 200) {
          return { connected: true }
        }
      } catch (altErr) {
        // Ignore alternative endpoint error
      }

      return { 
        connected: false, 
        error: err.message || 'Connection failed. Please check if the server is running.' 
      }
    }
  }

  return {
    sanitizeInput,
    validateJSON,
    validateDocument,
    checkConnection
  }
}
