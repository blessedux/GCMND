// MediaPipe initialization script
// This script runs in the main page context to initialize MediaPipe Hands

(function() {
  try {
    // Check if Hands class is available
    if (typeof window.Hands === 'undefined') {
      window.postMessage({ type: 'HANDS_INIT_ERROR', error: 'Hands class not available' }, '*');
      return;
    }

    // Get the extension URL for mediapipe files
    const extensionUrl = window.location.origin + '/mediapipe/';
    
    // Initialize MediaPipe Hands
    window.mediaPipeHands = new window.Hands({
      locateFile: function(file) {
        return extensionUrl + file;
      }
    });
    
    // Set options
    window.mediaPipeHands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    // Set up results handler
    window.mediaPipeHands.onResults(function(results) {
      window.postMessage({ type: 'MEDIAPIPE_RESULTS', results: results }, '*');
    });
    
    // Notify that initialization is complete
    window.postMessage({ type: 'HANDS_INITIALIZED' }, '*');
    
  } catch (error) {
    window.postMessage({ type: 'HANDS_INIT_ERROR', error: error.message }, '*');
  }
})(); 