// Content script for video display and gesture control
console.log('🎯 VIDEO DISPLAY: Script loaded');

let videoElement = null;
let cameraStream = null;
let isActive = false;

// MediaPipe setup
async function setupMediaPipe() {
  console.log('🎯 VIDEO DISPLAY: Setting up MediaPipe...');
  
  try {
    // Inject MediaPipe scripts into the main page context
    const scriptUrls = [
      chrome.runtime.getURL('mediapipe/camera_utils.js'),
      chrome.runtime.getURL('mediapipe/control_utils.js'),
      chrome.runtime.getURL('mediapipe/drawing_utils.js'),
      chrome.runtime.getURL('mediapipe/hands.js')
    ];

    // Create and inject script elements into the main page
    for (const url of scriptUrls) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
          console.log(`🎯 VIDEO DISPLAY: Loaded script: ${url}`);
          resolve();
        };
        script.onerror = (e) => {
          console.error(`🎯 VIDEO DISPLAY: Failed to load script: ${url}`, e);
          reject(new Error(`Failed to load ${url}`));
        };
        // Inject into the main page context
        (document.head || document.documentElement).appendChild(script);
      });
    }
    
    console.log('🎯 VIDEO DISPLAY: MediaPipe scripts loaded');
    
    // Wait for scripts to initialize and check for Hands class availability
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait
    
    while (attempts < maxAttempts) {
      // Check if Hands class is available by trying to access it
      try {
        // Use a simpler approach to check for Hands availability
        const hasHands = await new Promise(resolve => {
          // Create a temporary script element to check for Hands
          const tempScript = document.createElement('script');
          tempScript.src = chrome.runtime.getURL('hands-check.js');
          document.head.appendChild(tempScript);
          
          const handler = (event) => {
            if (event.data && event.data.type === 'HANDS_CHECK') {
              window.removeEventListener('message', handler);
              document.head.removeChild(tempScript);
              resolve(event.data.available);
            }
          };
          window.addEventListener('message', handler);
          
          // Cleanup after timeout
          setTimeout(() => {
            window.removeEventListener('message', handler);
            if (document.head.contains(tempScript)) {
              document.head.removeChild(tempScript);
            }
            resolve(false);
          }, 100);
        });
        
        if (hasHands) {
          console.log('🎯 VIDEO DISPLAY: Hands class is available in main page context');
          break;
        }
      } catch (error) {
        console.log('🎯 VIDEO DISPLAY: Still waiting for Hands class...');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Hands class not available after loading MediaPipe scripts');
    }
    
    // Initialize Hands using a separate script file approach
    const initScriptUrl = chrome.runtime.getURL('mediapipe-init.js');
    const initScript = document.createElement('script');
    initScript.src = initScriptUrl;
    document.head.appendChild(initScript);
    
    // Wait for initialization
    await new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === 'HANDS_INITIALIZED') {
          window.removeEventListener('message', handler);
          document.head.removeChild(initScript);
          resolve();
        } else if (event.data && event.data.type === 'HANDS_INIT_ERROR') {
          window.removeEventListener('message', handler);
          document.head.removeChild(initScript);
          reject(new Error(event.data.error));
        }
      };
      window.addEventListener('message', handler);
      
      // Cleanup after timeout
      setTimeout(() => {
        window.removeEventListener('message', handler);
        if (document.head.contains(initScript)) {
          document.head.removeChild(initScript);
        }
        reject(new Error('Failed to initialize Hands'));
      }, 5000);
    });
    
    console.log('🎯 VIDEO DISPLAY: MediaPipe Hands initialized in main page context');
    
    // Set up message listener for MediaPipe results
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'MEDIAPIPE_RESULTS') {
        onResults(event.data.results);
      }
    });
    
    console.log('🎯 VIDEO DISPLAY: MediaPipe Hands initialized');
  } catch (error) {
    console.error('🎯 VIDEO DISPLAY: MediaPipe setup failed:', error);
    throw error;
  }
}

// Gesture detection and mouse control
function onResults(results) {
  console.log('🎯 VIDEO DISPLAY: onResults called!', results);
  
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    console.log('🎯 VIDEO DISPLAY: No hand detected');
    return;
  }
  
  const landmarks = results.multiHandLandmarks[0];
  if (!landmarks) {
    console.log('🎯 VIDEO DISPLAY: No landmarks found');
    return;
  }
  
  console.log('🎯 VIDEO DISPLAY: Hand detected! Processing landmarks...');
  
  // Get hand position (index finger tip)
  const indexTip = landmarks[8];
  const thumbTip = landmarks[4];
  
  // Convert to screen coordinates with sensitivity
  const sensitivity = 5; // You can make this configurable
  const screenX = indexTip.x * window.innerWidth * (sensitivity / 5);
  const screenY = indexTip.y * window.innerHeight * (sensitivity / 5);
  
  console.log(`🎯 VIDEO DISPLAY: Hand position: x=${screenX.toFixed(0)}, y=${screenY.toFixed(0)}`);
  
  // Calculate pinch distance
  const pinchDistance = Math.sqrt(
    Math.pow(thumbTip.x - indexTip.x, 2) + 
    Math.pow(thumbTip.y - indexTip.y, 2)
  );
  
  const isPinching = pinchDistance < 0.1;
  
  console.log(`🎯 VIDEO DISPLAY: Pinch distance: ${pinchDistance.toFixed(3)}, Is pinching: ${isPinching}`);
  
  // Move mouse cursor
  moveMouse(screenX, screenY);
  
  // Handle click on pinch
  if (isPinching) {
    console.log('🎯 VIDEO DISPLAY: Pinch detected! Triggering click...');
    clickMouse();
  }
}

// Mouse control functions
function moveMouse(x, y) {
  console.log(`🎯 VIDEO DISPLAY: Moving mouse to: x=${x.toFixed(0)}, y=${y.toFixed(0)}`);
  const event = new MouseEvent('mousemove', {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y
  });
  document.elementFromPoint(x, y)?.dispatchEvent(event);
}

function clickMouse() {
  console.log('🎯 VIDEO DISPLAY: Clicking mouse...');
  const event = new MouseEvent('mousedown', {
    view: window,
    bubbles: true,
    cancelable: true,
    button: 0
  });
  document.activeElement?.dispatchEvent(event);
  
  setTimeout(() => {
    const upEvent = new MouseEvent('mouseup', {
      view: window,
      bubbles: true,
      cancelable: true,
      button: 0
    });
    document.activeElement?.dispatchEvent(upEvent);
    console.log('🎯 VIDEO DISPLAY: Mouse click completed');
  }, 100);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🎯 VIDEO DISPLAY: Received message:', request.action);
  
  if (request.action === 'startCamera') {
    startCamera().then(success => {
      sendResponse({ success: success });
    }).catch(error => {
      console.error('🎯 VIDEO DISPLAY: Camera start failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'stopCamera') {
    stopCamera();
    sendResponse({ success: true });
  }
});

async function startCamera() {
  if (isActive) {
    console.log('🎯 VIDEO DISPLAY: Camera already active');
    return true;
  }
  
  try {
    console.log('🎯 VIDEO DISPLAY: Requesting camera access...');
    
    // Check if camera permission is already granted
    const permissions = await navigator.permissions.query({ name: 'camera' });
    console.log('🎯 VIDEO DISPLAY: Camera permission state:', permissions.state);
    
    if (permissions.state === 'denied') {
      throw new Error('Camera permission denied. Please allow camera access in Chrome settings.');
    }
    
    // Request camera access with simpler constraints
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: true
    });
    
    console.log('🎯 VIDEO DISPLAY: Camera access granted!');
    
    // Setup MediaPipe
    await setupMediaPipe();
    
    // Create video element
    videoElement = document.createElement('video');
    videoElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      border: 3px solid green;
      z-index: 10000;
      background: #000;
    `;
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    
    // Set video source
    videoElement.srcObject = cameraStream;
    
    // Add to page
    document.body.appendChild(videoElement);
    
    // Wait for video to be ready
    await new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        console.log('🎯 VIDEO DISPLAY: Video metadata loaded');
        videoElement.play().then(() => {
          console.log('🎯 VIDEO DISPLAY: Video playing successfully');
          resolve();
        }).catch(reject);
      };
      videoElement.onerror = reject;
    });
    
    // Start MediaPipe processing using a separate script file
    const cameraInitUrl = chrome.runtime.getURL('camera-init.js');
    const cameraScript = document.createElement('script');
    cameraScript.src = cameraInitUrl;
    document.head.appendChild(cameraScript);
    
    // Wait for camera to start
    await new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === 'CAMERA_STARTED') {
          window.removeEventListener('message', handler);
          document.head.removeChild(cameraScript);
          resolve();
        } else if (event.data && event.data.type === 'CAMERA_ERROR') {
          window.removeEventListener('message', handler);
          document.head.removeChild(cameraScript);
          reject(new Error(event.data.error));
        }
      };
      window.addEventListener('message', handler);
      
      // Cleanup after timeout
      setTimeout(() => {
        window.removeEventListener('message', handler);
        if (document.head.contains(cameraScript)) {
          document.head.removeChild(cameraScript);
        }
        reject(new Error('Failed to start camera'));
      }, 10000);
    });
    
    console.log('🎯 VIDEO DISPLAY: MediaPipe camera started');
    
    isActive = true;
    
    // Notify background script
    chrome.runtime.sendMessage({ action: 'cameraStarted' });
    
    console.log('🎯 VIDEO DISPLAY: Camera and gesture detection started successfully');
    return true;
    
  } catch (error) {
    console.error('🎯 VIDEO DISPLAY: Camera failed:', error);
    isActive = false;
    
    // Show user-friendly error message
    if (error.name === 'NotAllowedError') {
      throw new Error('Camera access denied. Please allow camera access and try again.');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No camera found. Please connect a camera and try again.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Camera is in use by another application. Please close other camera apps and try again.');
    } else {
      throw new Error(`Camera error: ${error.message}`);
    }
  }
}

function stopCamera() {
  console.log('🎯 VIDEO DISPLAY: Stopping camera...');
  
  // Stop camera and hands using a separate script file
  const stopScriptUrl = chrome.runtime.getURL('camera-stop.js');
  const stopScript = document.createElement('script');
  stopScript.src = stopScriptUrl;
  document.head.appendChild(stopScript);
  
  // Wait for stop confirmation
  const handler = (event) => {
    if (event.data && event.data.type === 'CAMERA_STOPPED') {
      window.removeEventListener('message', handler);
      document.head.removeChild(stopScript);
    }
  };
  window.addEventListener('message', handler);
  
  // Cleanup after timeout
  setTimeout(() => {
    window.removeEventListener('message', handler);
    if (document.head.contains(stopScript)) {
      document.head.removeChild(stopScript);
    }
  }, 2000);
  
  if (videoElement) {
    videoElement.remove();
    videoElement = null;
  }
  
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => {
      track.stop();
      console.log('🎯 VIDEO DISPLAY: Track stopped:', track.kind);
    });
    cameraStream = null;
  }
  
  isActive = false;
  
  // Notify background script
  chrome.runtime.sendMessage({ action: 'cameraStopped' });
  
  console.log('🎯 VIDEO DISPLAY: Camera and gesture detection stopped');
} 