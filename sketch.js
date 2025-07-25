// written by ndr3svt from sooft.studio
// find more stuff like this on Instagram :
// https://www.instagram.com/ndr3svt/
// https://www.instagram.com/sooft.studio/

// other references to hand landmarks detection:
// https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker

// link to article : https://medium.com/@andresvillatorres/bringing-gesture-recognition-to-life-with-p5-js-hand-landmarks-and-machine-learning-66f66f91ab72

// link to publication behind hands js landmark detection model : 
//https://arxiv.org/abs/2006.10214
// hand tracking and drawing landmarks using handtrack.js

const videoElement = document.getElementsByClassName("input_video")[0];

// Enhanced gesture detection variables
let compareD = 0;
let xy = [250, 250];
let p_xy = [0, 0];
let lmResults = false;

let objectVector;
let font = null;

let grabbing = false;
let locked = false;
let objectSize = 1;
let lastObjectSize = 1;
let objectSizeSmooth = 0;

// New gesture detection variables
let currentGesture = "None";
let gestureConfidence = 0;
let gestureHistory = [];
let lastGesture = "None";

// Gesture detection thresholds
const GESTURE_THRESHOLDS = {
  PINCH: 0.015,
  FIST: 0.08,
  OPEN_HAND: 0.06, // Even more reduced to make it easier to detect
  POINTING: 0.06,
  VICTORY: 0.04
};

// Initialize the canvas and objects
function setup() {
  objectVector = createVector(100, 0, 0);

  createCanvas(800, 640, WEBGL);
  // Using default font instead of custom font
  textFont('Arial');
  textSize(12);
}

// Run the hand tracker on every frame
function draw() {
  clear();
  push();
  translate(0, 0, -100);
  //image(videoInput, -width/2, -height/2, width, height);
  pop();

  // Enhanced gesture display
  strokeWeight(5);
  
  // Color based on gesture type
  let gestureColor;
  switch(currentGesture) {
    case "pinch":
      gestureColor = color(255, 0, 0); // Red
      break;
    case "fist":
      gestureColor = color(255, 165, 0); // Orange
      break;
    case "openHand":
      gestureColor = color(0, 255, 0); // Green
      break;
    case "pointing":
      gestureColor = color(0, 255, 255); // Cyan
      break;
    case "victory":
      gestureColor = color(255, 0, 255); // Magenta
      break;
    default:
      gestureColor = color(128, 128, 128); // Gray
  }
  
  stroke(gestureColor);
  
  // Draw gesture indicator line
  const lineLength = gestureConfidence * 300;
  line(0, 0, lineLength, 0);
  
  // Update status text with multi-hand gesture information
  const gestureDisplayName = {
    "pinch": "Pinch",
    "fist": "Fist", 
    "openHand": "Open Hand",
    "pointing": "Pointing",
    "victory": "Victory",
    "None": "No Gesture"
  };
  
  let statusText = "";
  
  // Left hand status
  if (leftHand) {
    const leftConfidence = Math.round(leftHandConfidence * 100);
    statusText += `Left: ${gestureDisplayName[leftHandGesture]} (${leftConfidence}%)`;
  } else {
    statusText += "Left: Not detected";
  }
  
  statusText += " | ";
  
  // Right hand status
  if (rightHand) {
    const rightConfidence = Math.round(rightHandConfidence * 100);
    statusText += `Right: ${gestureDisplayName[rightHandGesture]} (${rightConfidence}%)`;
  } else {
    statusText += "Right: Not detected";
  }
  
  // Add total hands detected
  const totalHands = (leftHand ? 1 : 0) + (rightHand ? 1 : 0);
  statusText += ` | Hands: ${totalHands}/2`;
  
  // Add debug info for open hand (legacy)
  if (lastGesture && lastGesture.openHand) {
    statusText += ` | Open Hand: ${lastGesture.openHand.extendedFingers}/4 fingers, dist: ${lastGesture.openHand.distance.toFixed(3)}`;
  }
  
  // Add more detailed debug info
  if (lastGesture && lastGesture.openHand) {
    console.log('Open Hand Debug:', {
      extendedFingers: lastGesture.openHand.extendedFingers,
      distance: lastGesture.openHand.distance,
      threshold: GESTURE_THRESHOLDS.OPEN_HAND,
      detected: lastGesture.openHand.detected
    });
  }
  
  document.querySelector(".info").querySelector("p").innerHTML = statusText;
  
  // Show/hide open hand indicator for either hand
  const openHandIndicator = document.getElementById('open-hand-indicator');
  if (leftHandGesture === "openHand" || rightHandGesture === "openHand") {
    openHandIndicator.style.display = 'block';
  } else {
    openHandIndicator.style.display = 'none';
  }

  // draw object which is being dragged
  push();
  fill(0, 0, 255, 100);
  stroke(0, 0, 255);
  translate(objectVector.x, objectVector.y, objectVector.z);
  ellipse(
    0,
    0,
    100 * map(objectVector.z, 0.1, -0.1, 0.1, objectSizeSmooth),
    100 * map(objectVector.z, 0.1, -0.1, 0.1, objectSizeSmooth)
  );
  pop();

  // drawing landmarks
  displayResults();

  // Enhanced gesture-based interaction
  if (currentGesture === "pinch") {
    grabbing = true; // Pinch detected
  } else {
    grabbing = false; // No pinch
  }

  // Handle grabbing interaction with the object
  if (grabbing && lmResults && lm.length > 0) {
    // Use thumb tip (4) and index tip (8) for pinch position
    const thumbTip = lm[4];
    const indexTip = lm[8];
    
    // Calculate pinch center position
    const pinchX = (thumbTip.x + indexTip.x) / 2;
    const pinchY = (thumbTip.y + indexTip.y) / 2;
    const pinchZ = (thumbTip.z + indexTip.z) / 2;
    
    // Map to world coordinates
    let pinchVector = createVector(
      pinchX * width - width / 2,
      pinchY * height - height / 2,
      pinchZ
    );
    
    if (
      dist(pinchVector.x, pinchVector.y, objectVector.x, objectVector.y) < 50 &&
      locked == false
    ) {
      locked = true; // Lock the object to the hand
      objectSize = 2; // Enlarge the object when grabbed
    }
    if (locked) {
      // Update the object's position based on the pinch
      objectVector.x = pinchX * width - width / 2;
      objectVector.y = pinchY * height - height / 2;
      objectVector.z = pinchZ;
    }
  } else {
    locked = false; // Release the object
    objectSize = 1; // Reset the object size
  }
  // smoothing the objectSize based on locked and unlocked object
  objectSizeSmooth = objectSize * 0.5 + lastObjectSize * 0.5;
  lastObjectSize = objectSizeSmooth;
  
  // Draw gesture debug information
  if (lmResults) {
    drawGestureDebug();
  }
  
  // Draw privacy mode indicator
  drawPrivacyIndicator();
}

function displayResults() {
  // Always show hand landmarks when available - more stable rendering
  if (lmResults) {
    // Draw left hand landmarks (green)
    if (leftHand && leftHand.length > 0) {
      for (let i = 0; i < leftHand.length; i++) {
        // Draw points only - no vectors or lines
        strokeWeight(8);
        stroke(0, 255, 0, 200); // Green with some transparency
        point(
          leftHand[i].x * width - width / 2,
          leftHand[i].y * height - height / 2,
          leftHand[i].z
        );
        
        // Draw landmark numbers - ensure they're visible
        push();
        strokeWeight(2);
        stroke(0, 0, 0, 200); // Black outline for text
        fill(255, 255, 255, 255); // Solid white text
        textSize(12);
        textAlign(CENTER);
        text(i, leftHand[i].x * width - width / 2, leftHand[i].y * height - height / 2 - 15);
        pop();
      }
    }
    
    // Draw right hand landmarks (blue)
    if (rightHand && rightHand.length > 0) {
      for (let i = 0; i < rightHand.length; i++) {
        // Draw points only - no vectors or lines
        strokeWeight(8);
        stroke(0, 0, 255, 200); // Blue with some transparency
        point(
          rightHand[i].x * width - width / 2,
          rightHand[i].y * height - height / 2,
          rightHand[i].z
        );
        
        // Draw landmark numbers - ensure they're visible
        push();
        strokeWeight(2);
        stroke(0, 0, 0, 200); // Black outline for text
        fill(255, 255, 255, 255); // Solid white text
        textSize(12);
        textAlign(CENTER);
        text(i, rightHand[i].x * width - width / 2, rightHand[i].y * height - height / 2 - 15);
        pop();
      }
    }
  } else {
    // Show "No hand detected" message when no landmarks
    push();
    fill(255, 255, 255, 100);
    textAlign(CENTER);
    textSize(16);
    text("No hand detected", 0, 0);
    pop();
  }
}

function drawGestureDebug() {
  push();
  fill(255);
  textAlign(LEFT);
  textSize(14);
  
  let yPos = -height/2 + 20;
  text("Multi-Hand Gesture Debug:", -width/2 + 10, yPos);
  yPos += 20;
  
  // Left hand info
  if (leftHand) {
    text(`Left Hand: ${leftHandGesture} (${Math.round(leftHandConfidence * 100)}%)`, -width/2 + 10, yPos);
    yPos += 15;
  } else {
    text("Left Hand: Not detected", -width/2 + 10, yPos);
    yPos += 15;
  }
  
  // Right hand info
  if (rightHand) {
    text(`Right Hand: ${rightHandGesture} (${Math.round(rightHandConfidence * 100)}%)`, -width/2 + 10, yPos);
    yPos += 15;
  } else {
    text("Right Hand: Not detected", -width/2 + 10, yPos);
    yPos += 15;
  }
  
  // Combined info
  yPos += 10;
  text(`Primary: ${currentGesture}`, -width/2 + 10, yPos);
  yPos += 15;
  text(`Confidence: ${Math.round(gestureConfidence * 100)}%`, -width/2 + 10, yPos);
  yPos += 15;
  text(`Hands Detected: ${(leftHand ? 1 : 0) + (rightHand ? 1 : 0)}`, -width/2 + 10, yPos);
  
  pop();
}

function drawPrivacyIndicator() {
  push();
  fill(0, 255, 0, 150);
  textAlign(RIGHT);
  textSize(12);
  
  // Draw privacy indicator in top-right corner
  text("Privacy Mode: Hand Tracking Only", width/2 - 10, -height/2 + 20);
  
  pop();
}

// Global variables for multiple hands
let lm = []; // Keep for backward compatibility
let leftHand = null;
let rightHand = null;
let leftHandGesture = "None";
let rightHandGesture = "None";
let leftHandConfidence = 0;
let rightHandConfidence = 0;

function onResults(results) {
  if (results.multiHandLandmarks) {
    lmResults = true;
    
    // Reset hands
    leftHand = null;
    rightHand = null;
    leftHandGesture = "None";
    rightHandGesture = "None";
    leftHandConfidence = 0;
    rightHandConfidence = 0;
    
    // Process each hand
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks = results.multiHandLandmarks[i];
      const handedness = results.multiHandedness ? results.multiHandedness[i] : null;
      
      // Determine which hand this is
      const isLeftHand = handedness && handedness.label === 'Left';
      const isRightHand = handedness && handedness.label === 'Right';
      
      // Store hand data
      if (isLeftHand || (!isRightHand && leftHand === null)) {
        leftHand = landmarks;
        lm = landmarks; // Keep backward compatibility
        
        // Process left hand gestures
        const gestureResult = detectAllGestures(landmarks);
        leftHandGesture = gestureResult.gesture;
        leftHandConfidence = gestureResult.confidence;
        
        // Update current gesture for backward compatibility
        currentGesture = leftHandGesture;
        gestureConfidence = leftHandConfidence;
        
        // Legacy pinch detection for backward compatibility
        compareD = distance(
          landmarks[8].x,
          landmarks[8].y,
          landmarks[4].x,
          landmarks[4].y
        );
        
        if (compareD <= 0.01) {
          xy[0] = (landmarks[4].x + landmarks[8].x) / 2;
          xy[1] = (landmarks[4].y + landmarks[8].y) / 2;
          xy[2] = landmarks[4].z;
        }
      }
      
      if (isRightHand || (!isLeftHand && rightHand === null)) {
        rightHand = landmarks;
        
        // Process right hand gestures
        const gestureResult = detectAllGestures(landmarks);
        rightHandGesture = gestureResult.gesture;
        rightHandConfidence = gestureResult.confidence;
      }
    }
    
    // Update gesture history for smoothing (using primary hand)
    gestureHistory.push(currentGesture);
    if (gestureHistory.length > 5) {
      gestureHistory.shift();
    }
    
    // Get most common gesture in recent history (smoothing)
    const gestureCounts = {};
    gestureHistory.forEach(gesture => {
      gestureCounts[gesture] = (gestureCounts[gesture] || 0) + 1;
    });
    
    const mostCommonGesture = Object.keys(gestureCounts).reduce((a, b) => 
      gestureCounts[a] > gestureCounts[b] ? a : b
    );
    
    if (gestureCounts[mostCommonGesture] >= 3) {
      currentGesture = mostCommonGesture;
    }
    
  } else {
    lmResults = false;
    currentGesture = "None";
    gestureConfidence = 0;
    leftHand = null;
    rightHand = null;
    leftHandGesture = "None";
    rightHandGesture = "None";
    leftHandConfidence = 0;
    rightHandConfidence = 0;
  }
}

// Hands initialization moved to window.load event

// Global variables for camera and hands
let camera = null;
let hands = null;

// Wait for all resources to load
window.addEventListener('load', function() {
  console.log('Window loaded, checking MediaPipe availability...');
  
  // Check if MediaPipe is available
  if (typeof Hands === 'undefined') {
    console.error('MediaPipe Hands not loaded');
    document.getElementById('camera-status').textContent = 'Error: MediaPipe not loaded';
    document.getElementById('camera-status').style.color = '#f44336';
    return;
  }
  
  console.log('MediaPipe Hands available, initializing...');
  
  // Initialize hands with privacy-first settings
console.log('Initializing MediaPipe Hands...');
try {
  hands = new Hands({
    locateFile: (file) => {
      console.log('Loading MediaPipe file:', file);
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    },
  });
  console.log('MediaPipe Hands initialized successfully');
} catch (error) {
  console.error('Failed to initialize MediaPipe Hands:', error);
  document.getElementById('camera-status').textContent = 'Error: MediaPipe failed to load';
  document.getElementById('camera-status').style.color = '#f44336';
}

  // Configure for privacy-first: only hand detection, no face processing
console.log('Setting MediaPipe options...');
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7, // Higher confidence for better accuracy
  minTrackingConfidence: 0.7,
  // Privacy settings - only process hand regions
  selfieMode: true, // Mirror the image for better UX
});
console.log('Setting MediaPipe onResults callback...');
hands.onResults(onResults);
  
  // Don't auto-initialize camera, wait for user to click button
  document.getElementById('camera-status').textContent = 'Camera: Click button to start (Privacy Mode)';
  document.getElementById('camera-status').style.color = '#ff9800';
  document.getElementById('enable-camera').style.display = 'block';
});

function initializeCamera() {
  console.log('Initializing camera...');
  
  // Initialize camera with proper error handling
  camera = new Camera(videoElement, {
    onFrame: async () => {
      if (hands) {
        await hands.send({ image: videoElement });
      }
    },
    width: 640,
    height: 480,
  });

  // Add error handling and logging
  camera.start().then(() => {
    console.log('Camera started successfully');
    document.getElementById('camera-status').textContent = 'Camera: Active';
    document.getElementById('camera-status').style.color = '#4CAF50';
    document.getElementById('enable-camera').style.display = 'none';
  }).catch((error) => {
    console.error('Error starting camera:', error);
    document.getElementById('camera-status').textContent = 'Camera: Failed - ' + error.message;
    document.getElementById('camera-status').style.color = '#f44336';
    document.getElementById('enable-camera').style.display = 'block';
  });
}

// Check camera permissions function
async function checkCameraPermissions() {
  try {
    const permission = await navigator.permissions.query({ name: 'camera' });
    return permission.state;
  } catch (error) {
    console.log('Permission API not supported, will request camera access');
    return 'prompt';
  }
}

// Force camera access request (bypasses permission checks)
async function forceCameraRequest() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        facingMode: 'user',
        frameRate: { ideal: 30, max: 60 },
        aspectRatio: { ideal: 4/3 }
      } 
    });
    return { success: true, stream };
  } catch (error) {
    console.error('Force camera request failed:', error);
    return { success: false, error };
  }
}

// Manual camera enable button
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('enable-camera').addEventListener('click', async function() {
    console.log('Manual camera enable clicked');
    
    // Disable button to prevent multiple clicks
    document.getElementById('enable-camera').disabled = true;
    document.getElementById('enable-camera').textContent = 'Requesting...';
    
    // Update status
    document.getElementById('camera-status').textContent = 'Camera: Requesting permission...';
    document.getElementById('camera-status').style.color = '#ff9800';
    
    // Skip permission checking and go straight to camera request
    // This will trigger the browser's permission prompt
    console.log('Directly requesting camera access...');
    
    try {
      // Force camera request (this will trigger the permission prompt)
      const cameraResult = await forceCameraRequest();
      
      if (!cameraResult.success) {
        throw cameraResult.error;
      }
      
      const stream = cameraResult.stream;
      
      console.log('Camera stream obtained successfully');
      
      // Set up video element with privacy-first processing
      videoElement.srcObject = stream;
      videoElement.play();
      
      // Hide the actual video feed for privacy (only show landmarks)
      videoElement.style.display = 'none';
      
      document.getElementById('camera-status').textContent = 'Camera: Active (Privacy Mode)';
      document.getElementById('camera-status').style.color = '#4CAF50';
      document.getElementById('enable-camera').style.display = 'none';
      document.getElementById('camera-help').style.display = 'none';
      
      // Initialize MediaPipe camera processing with privacy settings
      setTimeout(() => {
        console.log('Starting MediaPipe processing with privacy mode');
        
        // Create camera instance for MediaPipe
        camera = new Camera(videoElement, {
          onFrame: async () => {
            if (hands) {
              // Only send the image for hand landmark processing
              await hands.send({ image: videoElement });
            }
          },
          width: 640,
          height: 480,
        });
        
        camera.start().then(() => {
          console.log('MediaPipe camera processing started successfully');
          document.getElementById('camera-status').textContent = 'Camera: Active (Hand Tracking Only)';
        }).catch((error) => {
          console.error('MediaPipe camera processing error:', error);
          document.getElementById('camera-status').textContent = 'Camera: Active (No hand tracking)';
        });
      }, 1000);
      
    } catch (error) {
      console.error('Camera access failed:', error);
      document.getElementById('camera-status').textContent = 'Camera: Permission Denied';
      document.getElementById('camera-status').style.color = '#f44336';
      document.getElementById('enable-camera').disabled = false;
      document.getElementById('enable-camera').textContent = 'Allow Camera Access';
      document.getElementById('camera-help').style.display = 'block';
      
      // Show specific error message and solution
      if (error.name === 'NotAllowedError') {
        document.getElementById('camera-help').innerHTML = '<strong>Camera permission denied.</strong> Please allow camera access in your browser settings or try refreshing the page.';
      } else if (error.name === 'NotFoundError') {
        document.getElementById('camera-help').innerHTML = '<strong>No camera found.</strong> Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        document.getElementById('camera-help').innerHTML = '<strong>Camera in use.</strong> Please close other camera applications and try again.';
      } else {
        document.getElementById('camera-help').innerHTML = '<strong>Camera error:</strong> ' + error.message + '. Try refreshing the page.';
      }
    }
  });
});

// Enhanced gesture detection functions
function distance(x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  // let dz = z2-z1
  let tD = dx * dx + dy * dy;
  // + (dz*dz)
  return tD;
}

function detectPinch(landmarks) {
  // Distance between thumb tip (4) and index tip (8)
  const pinchDistance = distance(
    landmarks[4].x, landmarks[4].y,
    landmarks[8].x, landmarks[8].y
  );
  return {
    detected: pinchDistance < GESTURE_THRESHOLDS.PINCH,
    confidence: 1 - (pinchDistance / GESTURE_THRESHOLDS.PINCH),
    distance: pinchDistance
  };
}

function detectFist(landmarks) {
  // Check if all fingers are curled (tips are close to base)
  const fingerTips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
  const fingerBases = [5, 9, 13, 17]; // Index, middle, ring, pinky bases
  
  let totalDistance = 0;
  let validFingers = 0;
  
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    const dist = distance(tip.x, tip.y, base.x, base.y);
    totalDistance += dist;
    validFingers++;
  }
  
  const avgDistance = totalDistance / validFingers;
  return {
    detected: avgDistance < GESTURE_THRESHOLDS.FIST,
    confidence: 1 - (avgDistance / GESTURE_THRESHOLDS.FIST),
    distance: avgDistance
  };
}

function detectOpenHand(landmarks) {
  // Check if all fingers are extended (tips are far from base)
  const fingerTips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
  const fingerBases = [5, 9, 13, 17]; // Index, middle, ring, pinky bases
  
  let totalDistance = 0;
  let validFingers = 0;
  let extendedFingers = 0;
  
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    const dist = distance(tip.x, tip.y, base.x, base.y);
    totalDistance += dist;
    validFingers++;
    
    // Count how many fingers are extended
    if (dist > GESTURE_THRESHOLDS.OPEN_HAND * 0.8) { // Slightly more lenient
      extendedFingers++;
    }
  }
  
  const avgDistance = totalDistance / validFingers;
  
  // Require at least 1 out of 4 fingers to be extended for open hand (very lenient)
  const isOpenHand = extendedFingers >= 1 && avgDistance > GESTURE_THRESHOLDS.OPEN_HAND * 0.7;
  
  return {
    detected: isOpenHand,
    confidence: Math.min(avgDistance / GESTURE_THRESHOLDS.OPEN_HAND, 1),
    distance: avgDistance,
    extendedFingers: extendedFingers // Debug info
  };
}

function detectPointing(landmarks) {
  // Check if only index finger is extended
  const fingerTips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
  const fingerBases = [5, 9, 13, 17]; // Index, middle, ring, pinky bases
  
  const indexDistance = distance(
    landmarks[8].x, landmarks[8].y,
    landmarks[5].x, landmarks[5].y
  );
  
  // Check if other fingers are curled
  let otherFingersCurled = true;
  for (let i = 1; i < fingerTips.length; i++) {
    const dist = distance(
      landmarks[fingerTips[i]].x, landmarks[fingerTips[i]].y,
      landmarks[fingerBases[i]].x, landmarks[fingerBases[i]].y
    );
    if (dist > GESTURE_THRESHOLDS.POINTING) {
      otherFingersCurled = false;
      break;
    }
  }
  
  return {
    detected: indexDistance > GESTURE_THRESHOLDS.OPEN_HAND && otherFingersCurled,
    confidence: Math.min(indexDistance / GESTURE_THRESHOLDS.OPEN_HAND, 1),
    distance: indexDistance
  };
}

function detectVictory(landmarks) {
  // Check if index and middle fingers are extended, others curled
  const indexDistance = distance(
    landmarks[8].x, landmarks[8].y,
    landmarks[5].x, landmarks[5].y
  );
  const middleDistance = distance(
    landmarks[12].x, landmarks[12].y,
    landmarks[9].x, landmarks[9].y
  );
  
  // Check if ring and pinky are curled
  const ringDistance = distance(
    landmarks[16].x, landmarks[16].y,
    landmarks[13].x, landmarks[13].y
  );
  const pinkyDistance = distance(
    landmarks[20].x, landmarks[20].y,
    landmarks[17].x, landmarks[17].y
  );
  
  const indexMiddleExtended = indexDistance > GESTURE_THRESHOLDS.OPEN_HAND && 
                             middleDistance > GESTURE_THRESHOLDS.OPEN_HAND;
  const othersCurled = ringDistance < GESTURE_THRESHOLDS.POINTING && 
                      pinkyDistance < GESTURE_THRESHOLDS.POINTING;
  
  return {
    detected: indexMiddleExtended && othersCurled,
    confidence: Math.min((indexDistance + middleDistance) / (2 * GESTURE_THRESHOLDS.OPEN_HAND), 1),
    distance: (indexDistance + middleDistance) / 2
  };
}

function detectAllGestures(landmarks) {
  const gestures = {
    pinch: detectPinch(landmarks),
    fist: detectFist(landmarks),
    openHand: detectOpenHand(landmarks),
    pointing: detectPointing(landmarks),
    victory: detectVictory(landmarks)
  };
  
  // Find the gesture with highest confidence
  let bestGesture = "None";
  let bestConfidence = 0;
  
  for (const [gestureName, gesture] of Object.entries(gestures)) {
    if (gesture.detected && gesture.confidence > bestConfidence) {
      bestGesture = gestureName;
      bestConfidence = gesture.confidence;
    }
  }
  
  return {
    gesture: bestGesture,
    confidence: bestConfidence,
    details: gestures
  };
} 