// Camera stop script
// This script runs in the main page context to stop MediaPipe camera processing

(function() {
  try {
    // Stop MediaPipe Camera
    if (window.mediaPipeCamera) {
      window.mediaPipeCamera.stop();
      window.mediaPipeCamera = null;
    }
    
    // Close MediaPipe Hands
    if (window.mediaPipeHands) {
      window.mediaPipeHands.close();
      window.mediaPipeHands = null;
    }
    
    // Notify that stopping is complete
    window.postMessage({ type: 'CAMERA_STOPPED' }, '*');
    
  } catch (error) {
    console.error('Error stopping camera:', error);
    window.postMessage({ type: 'CAMERA_STOPPED' }, '*');
  }
})(); 