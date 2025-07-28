// Debug version of Gesture Mouse Controller
console.log('🎯 DEBUG: Content script loaded');

// Simple test to see if the script is running
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 DEBUG: DOM loaded');
  
  // Add a visible indicator
  const indicator = document.createElement('div');
  indicator.id = 'gesture-debug-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: red;
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 12px;
    max-width: 200px;
    word-wrap: break-word;
  `;
  indicator.textContent = '🎯 Extension Loaded';
  document.body.appendChild(indicator);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🎯 DEBUG: Received message:', request.action);
  
  if (request.action === 'start') {
    console.log('🎯 DEBUG: Starting camera test...');
    
    // Update indicator
    const indicator = document.getElementById('gesture-debug-indicator');
    if (indicator) {
      indicator.textContent = '🎯 Requesting Camera...';
      indicator.style.background = 'orange';
    }
    
    // Test camera access with better error handling
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const error = 'getUserMedia not supported';
      console.error('🎯 DEBUG:', error);
      
      if (indicator) {
        indicator.textContent = '🎯 Camera API Not Supported';
        indicator.style.background = 'red';
      }
      
      sendResponse({ success: false, error: error });
      return true;
    }
    
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      } 
    })
      .then(stream => {
        console.log('🎯 DEBUG: Camera access granted!');
        console.log('🎯 DEBUG: Stream tracks:', stream.getTracks().length);
        
        if (indicator) {
          indicator.textContent = '🎯 Camera Active! ✅';
          indicator.style.background = 'green';
        }
        
        // Create a test video element to verify the stream works
        const testVideo = document.createElement('video');
        testVideo.srcObject = stream;
        testVideo.style.cssText = `
          position: fixed;
          top: 50px;
          right: 10px;
          width: 160px;
          height: 120px;
          border: 2px solid green;
          z-index: 9999;
        `;
        document.body.appendChild(testVideo);
        
        testVideo.onloadedmetadata = () => {
          console.log('🎯 DEBUG: Video metadata loaded');
          testVideo.play().then(() => {
            console.log('🎯 DEBUG: Video playing successfully');
            
            // Stop after 3 seconds for testing
            setTimeout(() => {
              stream.getTracks().forEach(track => {
                console.log('🎯 DEBUG: Stopping track:', track.kind);
                track.stop();
              });
              testVideo.remove();
              
              if (indicator) {
                indicator.textContent = '🎯 Camera Test Complete';
                indicator.style.background = 'blue';
              }
            }, 3000);
          }).catch(err => {
            console.error('🎯 DEBUG: Video play failed:', err);
          });
        };
        
        sendResponse({ success: true, message: 'Camera access granted and working' });
      })
      .catch(error => {
        console.error('🎯 DEBUG: Camera access failed:', error);
        console.error('🎯 DEBUG: Error name:', error.name);
        console.error('🎯 DEBUG: Error message:', error.message);
        
        let errorMessage = 'Unknown error';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera in use by another app';
        } else {
          errorMessage = error.message;
        }
        
        if (indicator) {
          indicator.textContent = `🎯 Camera Failed: ${errorMessage}`;
          indicator.style.background = 'red';
        }
        
        sendResponse({ success: false, error: errorMessage });
      });
    
    return true; // Keep message channel open
  }
  
  if (request.action === 'stop') {
    console.log('🎯 DEBUG: Stopping...');
    
    const indicator = document.getElementById('gesture-debug-indicator');
    if (indicator) {
      indicator.textContent = '🎯 Stopped';
      indicator.style.background = 'gray';
    }
    
    // Remove any test video elements
    const testVideos = document.querySelectorAll('video[style*="position: fixed"]');
    testVideos.forEach(video => video.remove());
    
    sendResponse({ success: true });
  }
  
  if (request.action === 'ping') {
    console.log('🎯 DEBUG: Ping received');
    sendResponse({ success: true, active: true });
  }
});

console.log('🎯 DEBUG: Content script setup complete'); 