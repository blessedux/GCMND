// Gesture Mouse Controller - Content Script
class GestureMouseController {
  constructor() {
    this.isActive = false;
    this.video = null;
    this.canvas = null;
    this.hands = null;
    this.camera = null;
    this.lastHandPosition = { x: 0, y: 0 };
    this.isPinching = false;
    this.sensitivity = 1.0;
    this.gestureThreshold = 0.05;
    
    console.log('🎯 GestureMouseController constructor called');
  }

  async init() {
    try {
      console.log('🎯 Starting GestureMouseController initialization...');
      
      // Load MediaPipe scripts
      await this.loadMediaPipeScripts();
      
      // Initialize camera and hands detection
      await this.initializeHands();
      
      console.log('✅ GestureMouseController initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize GestureMouseController:', error);
      return false;
    }
  }

  async loadMediaPipeScripts() {
    console.log('📦 Loading MediaPipe scripts...');
    
    const scripts = [
      chrome.runtime.getURL('mediapipe/camera_utils.js'),
      chrome.runtime.getURL('mediapipe/control_utils.js'),
      chrome.runtime.getURL('mediapipe/drawing_utils.js'),
      chrome.runtime.getURL('mediapipe/hands.js')
    ];

    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          console.log(`✅ Loaded: ${src}`);
          resolve();
        };
        script.onerror = (e) => {
          console.error(`❌ Failed to load: ${src}`, e);
          reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
      });
    }
    
    // Wait for scripts to initialize and check for Hands class
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (!window.Hands && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.Hands) {
      throw new Error('Hands class not available after loading MediaPipe scripts');
    }
    
    console.log('✅ All MediaPipe scripts loaded and Hands class is available');
  }

  async initializeHands() {
    console.log('🤚 Initializing MediaPipe Hands...');
    
    // Create hidden video element
    this.video = document.createElement('video');
    this.video.style.display = 'none';
    document.body.appendChild(this.video);

    // Create canvas for processing
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);

    // Check if MediaPipe is available
    if (!window.Hands) {
      throw new Error('MediaPipe Hands not available after script loading');
    }

    // Initialize MediaPipe Hands
    this.hands = new window.Hands({
      locateFile: (file) => {
        return chrome.runtime.getURL(`mediapipe/${file}`);
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));

    console.log('✅ MediaPipe Hands initialized');
    
    // Start camera
    await this.startCamera();
  }

  async startCamera() {
    try {
      console.log('📹 Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('✅ Camera stream obtained');

      this.video.srcObject = stream;
      await this.video.play();

      console.log('✅ Video element playing');

      // Check if MediaPipe Camera is available
      if (!window.Camera) {
        throw new Error('MediaPipe Camera not available');
      }

      // Start MediaPipe processing
      this.camera = new window.Camera(this.video, {
        onFrame: async () => {
          if (this.hands && this.isActive) {
            try {
              await this.hands.send({ image: this.video });
            } catch (error) {
              console.warn('Frame processing error:', error);
            }
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.isActive = true;
      console.log('✅ Camera started for gesture detection');
    } catch (error) {
      console.error('❌ Failed to start camera:', error);
      throw error;
    }
  }

  onResults(results) {
    if (!this.isActive || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    if (!landmarks) return;

    // Get hand position (wrist)
    const wrist = landmarks[0];
    const currentX = wrist.x * window.innerWidth;
    const currentY = wrist.y * window.innerHeight;

    // Detect pinch gesture
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDistance = this.calculateDistance(thumbTip, indexTip);
    const isPinching = pinchDistance < this.gestureThreshold;

    // Handle mouse movement
    if (isPinching) {
      if (!this.isPinching) {
        // Start pinch - simulate mouse down
        this.simulateMouseEvent('mousedown', currentX, currentY);
        this.isPinching = true;
        console.log('🤏 Pinch started at', currentX.toFixed(0), currentY.toFixed(0));
      } else {
        // Continue pinch - simulate mouse move (drag)
        this.simulateMouseEvent('mousemove', currentX, currentY);
      }
    } else if (this.isPinching) {
      // End pinch - simulate mouse up
      this.simulateMouseEvent('mouseup', currentX, currentY);
      this.isPinching = false;
      console.log('🤏 Pinch ended');
    } else {
      // Normal mouse movement
      this.simulateMouseEvent('mousemove', currentX, currentY);
    }

    this.lastHandPosition = { x: currentX, y: currentY };
  }

  calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = point1.z - point2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  simulateMouseEvent(type, x, y) {
    const event = new MouseEvent(type, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y
    });

    // Find element at position
    const element = document.elementFromPoint(x, y);
    if (element) {
      element.dispatchEvent(event);
    }
  }

  stop() {
    console.log('🛑 Stopping GestureMouseController...');
    this.isActive = false;
    if (this.camera) {
      this.camera.stop();
    }
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
    }
    console.log('✅ GestureMouseController stopped');
  }
}

// Initialize the controller when the page loads
let gestureController = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received message:', request.action);
  
  if (request.action === 'start') {
    console.log('🚀 Starting gesture control...');
    if (!gestureController) {
      gestureController = new GestureMouseController();
    }
    
    gestureController.init().then(success => {
      if (success) {
        console.log('✅ Gesture control started successfully');
        sendResponse({ success: true });
      } else {
        console.error('❌ Failed to start gesture control');
        sendResponse({ success: false, error: 'Initialization failed' });
      }
    }).catch(error => {
      console.error('❌ Error starting gesture control:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep the message channel open for async response
  } else if (request.action === 'stop') {
    console.log('🛑 Stopping gesture control...');
    if (gestureController) {
      gestureController.stop();
      gestureController = null;
    }
    sendResponse({ success: true });
  } else if (request.action === 'setSensitivity') {
    if (gestureController) {
      gestureController.sensitivity = request.value;
    }
    sendResponse({ success: true });
  } else if (request.action === 'ping') {
    // Simple ping to check if extension is active
    sendResponse({ success: true, active: !!gestureController && gestureController.isActive });
  }
});

console.log('🎯 Gesture Mouse Controller content script loaded'); 