import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcuts(shortcuts) {
  const handleKeyDown = (event) => {
    // Check for modifier keys
    const isCtrl = event.ctrlKey || event.metaKey
    const isShift = event.shiftKey
    const isAlt = event.altKey
    
    // Build key combination string
    const key = event.key.toLowerCase()
    let combination = ''
    
    if (isCtrl) combination += 'ctrl+'
    if (isShift) combination += 'shift+'
    if (isAlt) combination += 'alt+'
    combination += key
    
    // Find matching shortcut
    const shortcut = shortcuts.find(s => s.key === combination || s.key === key)
    
    if (shortcut && !shortcut.disabled?.()) {
      // For Ctrl+C, check if text is selected BEFORE preventing default
      // This allows normal copy behavior when user selects text
      if (combination === 'ctrl+c' || key === 'c') {
        const selection = window.getSelection()
        const hasSelection = selection && selection.toString().trim().length > 0
        
        // If text is selected, don't prevent default - let browser handle copy
        if (hasSelection) {
          return // Let default copy behavior work
        }
        
        // If user is in an input/textarea, let default behavior work
        if (event.target.matches('input, textarea')) {
          return
        }
      }
      
      event.preventDefault()
      shortcut.handler(event)
    }
  }
  
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
  
  return {
    handleKeyDown
  }
}
