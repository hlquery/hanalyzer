import { inject } from 'vue'

export function useCopy() {
  const toast = inject('toast', { success: () => {}, error: () => {} })
  
  const copyToClipboard = async (text, successMessage = 'Copied to clipboard', errorMessage = 'Failed to copy') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage, 'Copied')
      return true
    } catch (err) {
      console.error('Copy failed:', err)
      toast.error(errorMessage, 'Error')
      return false
    }
  }
  
  const copyJSON = async (obj, successMessage = 'JSON copied to clipboard') => {
    try {
      const json = JSON.stringify(obj, null, 2)
      return await copyToClipboard(json, successMessage)
    } catch (err) {
      toast.error('Failed to format JSON', 'Error')
      return false
    }
  }
  
  return {
    copyToClipboard,
    copyJSON
  }
}
