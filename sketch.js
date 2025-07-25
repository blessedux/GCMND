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

  strokeWeight(5);
  stroke(255, 0, 0);

  line(0, 0, compareD * 500, 0);
  if (compareD < 0.015) {
    document.querySelector(".info").querySelector("p").innerHTML = "Pinch detected!";
  } else {
    document.querySelector(".info").querySelector("p").innerHTML = "No pinch detected";
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

  // Detect if the user is performing a pinch gesture
  if (compareD < 0.015) {
    grabbing = true; // Pinch detected
  } else {
    grabbing = false; // No pinch
  }

  // Handle grabbing interaction with the object
  if (grabbing) {
    // use a distance comparisson to know if the pinch and grabbing is near the object
    // note that we already map the pinchVector (xy) to the worlds coordinates
    let pinchVector = createVector(
      -xy[0] * width + width / 2,
      xy[1] * height - height / 2,
      xy[2]
    );
    if (
      dist(pinchVector.x, pinchVector.y, objectVector.x, objectVector.y) < 25 &&
      locked == false
    ) {
      locked = true; // Lock the object to the hand
      objectSize = 2; // Enlarge the object when grabbed
    }
    if (locked) {
      // Update the object's position based on the pinch
      objectVector.x = -xy[0] * width + width / 2;
      objectVector.y = xy[1] * height - height / 2;
      objectVector.z = xy[2];
    }
  } else {
    locked = false; // Release the object
    objectSize = 1; // Reset the object size
  }
  // smoothing the objectSize based on locked and unlocked object
  objectSizeSmooth = objectSize * 0.5 + lastObjectSize * 0.5;
  lastObjectSize = objectSizeSmooth;
}

function displayResults() {
  if (lmResults) {
    for (let i = 0; i < lm.length; i++) {
      strokeWeight(5);
      stroke(0, 255, 0);
      /* non mirrored version  uncomment if wanting to use  this */
      //point(lm[i].x*width - width/2,lm[i].y*height -height/2, lm[i].z);
      //text(i,lm[i].x*width - width/2,lm[i].y*height -height/2 );
      /* mirrored version */
      point(
        -lm[i].x * width + width / 2,
        lm[i].y * height - height / 2,
        lm[i].z
      );
      text(i, -lm[i].x * width + width / 2 + 4, lm[i].y * height - height / 2);
    }
  }
}

let lm = [];
function onResults(results) {
  if (results.multiHandLandmarks) {
    lmResults = true;
    for (const landmarks of results.multiHandLandmarks) {
      lm = landmarks;
      for (let i = 0; i < landmarks.length; i++) {
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
    }
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
  
  // Initialize hands
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    },
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  hands.onResults(onResults);
  
  // Don't auto-initialize camera, wait for user to click button
  document.getElementById('camera-status').textContent = 'Camera: Click button to start';
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

// Manual camera enable button
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('enable-camera').addEventListener('click', function() {
    console.log('Manual camera enable clicked');
    
    // Update status
    document.getElementById('camera-status').textContent = 'Camera: Requesting permission...';
    document.getElementById('camera-status').style.color = '#ff9800';
    document.getElementById('enable-camera').disabled = true;
    document.getElementById('enable-camera').textContent = '⏳ Requesting...';
    
    // First get camera access
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user' // Use front camera
      } 
    })
    .then(function(stream) {
      console.log('Camera stream obtained');
      videoElement.srcObject = stream;
      videoElement.play();
      
      document.getElementById('camera-status').textContent = 'Camera: Active ✅';
      document.getElementById('camera-status').style.color = '#4CAF50';
      document.getElementById('enable-camera').style.display = 'none';
      document.getElementById('camera-help').style.display = 'none';
      
      // Initialize MediaPipe camera processing
      setTimeout(() => {
        console.log('Starting MediaPipe processing');
        
        // Create camera instance for MediaPipe
        camera = new Camera(videoElement, {
          onFrame: async () => {
            if (hands) {
              await hands.send({ image: videoElement });
            }
          },
          width: 640,
          height: 480,
        });
        
        camera.start().then(() => {
          console.log('MediaPipe camera processing started successfully');
        }).catch((error) => {
          console.error('MediaPipe camera processing error:', error);
          document.getElementById('camera-status').textContent = 'Camera: Active (No hand tracking)';
        });
      }, 1000);
    })
    .catch(function(error) {
      console.error('Manual camera access failed:', error);
      document.getElementById('camera-status').textContent = 'Camera: Permission Denied ❌';
      document.getElementById('camera-status').style.color = '#f44336';
      document.getElementById('enable-camera').disabled = false;
      document.getElementById('enable-camera').textContent = '🔓 Allow Camera Access';
      document.getElementById('camera-help').style.display = 'block';
      
      // Show specific error message
      if (error.name === 'NotAllowedError') {
        document.getElementById('camera-help').innerHTML = '💡 <strong>Camera permission denied.</strong> Please allow camera access in your browser settings or try refreshing the page.';
      } else if (error.name === 'NotFoundError') {
        document.getElementById('camera-help').innerHTML = '💡 <strong>No camera found.</strong> Please connect a camera and try again.';
      } else {
        document.getElementById('camera-help').innerHTML = '💡 <strong>Camera error:</strong> ' + error.message + '. Try refreshing the page.';
      }
    });
  });
});

function distance(x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  // let dz = z2-z1
  let tD = dx * dx + dy * dy;
  // + (dz*dz)
  return tD;
} 