// Camera initialization script
// This script runs in the main page context to start MediaPipe camera processing

(function() {
  try {
    // Check if Camera class and mediaPipeHands are available
    if (typeof window.Camera === 'undefined') {
      window.postMessage({ type: 'CAMERA_ERROR', error: 'Camera class not available' }, '*');
      return;
    }
    
    if (!window.mediaPipeHands) {
      window.postMessage({ type: 'CAMERA_ERROR', error: 'MediaPipe Hands not initialized' }, '*');
      return;
    }
    
    // Find the video element that was created by the content script
    const videoElement = document.querySelector('video[style*="position: fixed"]');
    if (!videoElement) {
      window.postMessage({ type: 'CAMERA_ERROR', error: 'Video element not found' }, '*');
      return;
    }
    
    // Initialize MediaPipe Camera
    window.mediaPipeCamera = new window.Camera(videoElement, {
      onFrame: async function() {
        if (window.mediaPipeHands) {
          await window.mediaPipeHands.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480
    });
    
    // Start the camera
    window.mediaPipeCamera.start().then(function() {
      window.postMessage({ type: 'CAMERA_STARTED' }, '*');
    }).catch(function(error) {
      window.postMessage({ type: 'CAMERA_ERROR', error: error.message }, '*');
    });
    
  } catch (error) {
    window.postMessage({ type: 'CAMERA_ERROR', error: error.message }, '*');
  }
})(); 