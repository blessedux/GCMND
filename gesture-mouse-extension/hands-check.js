// Hands availability check script
// This script runs in the main page context to check if Hands class is available

(function() {
  try {
    const available = typeof window.Hands !== 'undefined';
    window.postMessage({ type: 'HANDS_CHECK', available: available }, '*');
  } catch (error) {
    window.postMessage({ type: 'HANDS_CHECK', available: false }, '*');
  }
})(); 