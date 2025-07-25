// Gesture Recorder System
let videoElement;
let camera;
let hands;
let lm = [];
let lmResults = false;
let isRecording = false;
let recordingData = [];
let savedGestures = [];
let currentGestureName = '';
let currentGestureCategory = '';
let currentGestureDescription = '';

// Gesture storage
const GESTURE_STORAGE_KEY = 'custom_gestures';

// Initialize the application
function setup() {
    const canvas = createCanvas(800, 640, WEBGL);
    canvas.parent('canvas-container');
    
    videoElement = document.querySelector('.input_video');
    
    // Load saved gestures
    loadSavedGestures();
    updateStats();
    
    // Set up camera button
    document.getElementById('enable-camera').addEventListener('click', initializeCamera);
    
    // Set up recording buttons
    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    document.getElementById('save-gesture').addEventListener('click', saveGesture);
    
    // Initialize MediaPipe
    initializeMediaPipe();
}

function draw() {
    background(0);
    
    // Draw hand landmarks
    if (lmResults && lm.length > 0) {
        displayResults();
        
        // If recording, collect data
        if (isRecording) {
            collectGestureData();
        }
    }
    
    // Draw recording status
    if (isRecording) {
        drawRecordingStatus();
    }
    
    // Draw saved gestures preview
    drawGesturePreview();
}

function initializeMediaPipe() {
    console.log('Initializing MediaPipe Hands...');
    try {
        hands = new Hands({
            locateFile: (file) => {
                console.log('Loading MediaPipe file:', file);
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            },
        });
        console.log('MediaPipe Hands initialized successfully');
        
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
            selfieMode: true,
        });
        
        hands.onResults(onResults);
        
    } catch (error) {
        console.error('Failed to initialize MediaPipe Hands:', error);
        document.getElementById('camera-status').textContent = 'Error: MediaPipe failed to load';
        document.getElementById('camera-status').style.color = '#f44336';
    }
}

function initializeCamera() {
    console.log('Initializing camera...');
    
    document.getElementById('enable-camera').disabled = true;
    document.getElementById('enable-camera').textContent = 'Requesting...';
    
    document.getElementById('camera-status').textContent = 'Camera: Requesting permission...';
    document.getElementById('camera-status').style.color = '#ff9800';
    
    navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30, max: 60 },
            aspectRatio: { ideal: 4/3 }
        }
    })
    .then(function(stream) {
        console.log('Camera stream obtained successfully');
        
        videoElement.srcObject = stream;
        videoElement.play();
        
        document.getElementById('camera-status').textContent = 'Camera: Active';
        document.getElementById('camera-status').style.color = '#4CAF50';
        document.getElementById('enable-camera').style.display = 'none';
        document.getElementById('camera-help').style.display = 'none';
        
        // Initialize MediaPipe camera processing
        setTimeout(() => {
            console.log('Starting MediaPipe processing');
            
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
            });
        }, 1000);
        
    })
    .catch(function(error) {
        console.error('Camera access failed:', error);
        document.getElementById('camera-status').textContent = 'Camera: Permission Denied';
        document.getElementById('camera-status').style.color = '#f44336';
        document.getElementById('enable-camera').disabled = false;
        document.getElementById('enable-camera').textContent = 'Allow Camera Access';
        document.getElementById('camera-help').style.display = 'block';
        
        if (error.name === 'NotAllowedError') {
            document.getElementById('camera-help').innerHTML = '<strong>Camera permission denied.</strong> Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
            document.getElementById('camera-help').innerHTML = '<strong>No camera found.</strong> Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError') {
            document.getElementById('camera-help').innerHTML = '<strong>Camera in use.</strong> Please close other camera applications and try again.';
        } else {
            document.getElementById('camera-help').innerHTML = '<strong>Camera error:</strong> ' + error.message;
        }
    });
}

function onResults(results) {
    if (results.multiHandLandmarks) {
        lmResults = true;
        for (const landmarks of results.multiHandLandmarks) {
            lm = landmarks;
        }
    } else {
        lmResults = false;
    }
}

function displayResults() {
    if (lmResults) {
        for (let i = 0; i < lm.length; i++) {
            strokeWeight(5);
            stroke(0, 255, 0);
            point(
                lm[i].x * width - width / 2,
                lm[i].y * height - height / 2,
                lm[i].z
            );
            text(i, lm[i].x * width - width / 2 + 4, lm[i].y * height - height / 2);
        }
    }
}

function startRecording() {
    const gestureName = document.getElementById('gesture-name').value.trim();
    const gestureCategory = document.getElementById('gesture-category').value;
    const gestureDescription = document.getElementById('gesture-description').value.trim();
    
    if (!gestureName) {
        alert('Please enter a gesture name');
        return;
    }
    
    if (!lmResults) {
        alert('Please wait for hand detection to start');
        return;
    }
    
    // Check if gesture name already exists
    if (savedGestures.find(g => g.name.toLowerCase() === gestureName.toLowerCase())) {
        if (!confirm(`Gesture "${gestureName}" already exists. Do you want to overwrite it?`)) {
            return;
        }
        // Remove existing gesture
        savedGestures = savedGestures.filter(g => g.name.toLowerCase() !== gestureName.toLowerCase());
    }
    
    currentGestureName = gestureName;
    currentGestureCategory = gestureCategory;
    currentGestureDescription = gestureDescription;
    
    isRecording = true;
    recordingData = [];
    
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.display = 'inline-block';
    document.getElementById('recording-indicator').style.display = 'block';
    
    console.log(`Started recording gesture: ${gestureName}`);
}

function stopRecording() {
    isRecording = false;
    
    document.getElementById('start-recording').style.display = 'inline-block';
    document.getElementById('stop-recording').style.display = 'none';
    document.getElementById('save-gesture').style.display = 'inline-block';
    document.getElementById('recording-indicator').style.display = 'none';
    
    console.log(`Stopped recording. Collected ${recordingData.length} samples`);
    updateStats();
}

function collectGestureData() {
    if (lmResults && lm.length > 0) {
        // Collect landmark data
        const sample = {
            timestamp: Date.now(),
            landmarks: lm.map(landmark => ({
                x: landmark.x,
                y: landmark.y,
                z: landmark.z
            }))
        };
        
        recordingData.push(sample);
        
        // Update current samples counter
        document.getElementById('current-samples').textContent = recordingData.length;
    }
}

function saveGesture() {
    if (recordingData.length === 0) {
        alert('No gesture data to save. Please record a gesture first.');
        return;
    }
    
    const gesture = {
        id: Date.now(),
        name: currentGestureName,
        category: currentGestureCategory,
        description: currentGestureDescription,
        samples: recordingData,
        sampleCount: recordingData.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    savedGestures.push(gesture);
    saveGesturesToStorage();
    updateGestureList();
    updateStats();
    
    // Reset form
    document.getElementById('gesture-name').value = '';
    document.getElementById('gesture-description').value = '';
    document.getElementById('save-gesture').style.display = 'none';
    recordingData = [];
    document.getElementById('current-samples').textContent = '0';
    
    console.log(`Saved gesture: ${gesture.name} with ${gesture.sampleCount} samples`);
}

function deleteGesture(gestureId) {
    if (confirm('Are you sure you want to delete this gesture?')) {
        savedGestures = savedGestures.filter(g => g.id !== gestureId);
        saveGesturesToStorage();
        updateGestureList();
        updateStats();
    }
}

function loadSavedGestures() {
    const stored = localStorage.getItem(GESTURE_STORAGE_KEY);
    if (stored) {
        try {
            savedGestures = JSON.parse(stored);
            updateGestureList();
        } catch (error) {
            console.error('Error loading saved gestures:', error);
            savedGestures = [];
        }
    }
}

function saveGesturesToStorage() {
    try {
        localStorage.setItem(GESTURE_STORAGE_KEY, JSON.stringify(savedGestures));
    } catch (error) {
        console.error('Error saving gestures:', error);
    }
}

function updateGestureList() {
    const gestureList = document.getElementById('gesture-list');
    gestureList.innerHTML = '';
    
    if (savedGestures.length === 0) {
        gestureList.innerHTML = '<p style="text-align: center; opacity: 0.7;">No gestures saved yet. Record your first gesture above!</p>';
        return;
    }
    
    savedGestures.forEach(gesture => {
        const card = document.createElement('div');
        card.className = 'gesture-card';
        
        card.innerHTML = `
            <h3>${gesture.name}</h3>
            <p><strong>Category:</strong> ${gesture.category}</p>
            <p><strong>Description:</strong> ${gesture.description}</p>
            <p><strong>Samples:</strong> ${gesture.sampleCount}</p>
            <p><strong>Created:</strong> ${new Date(gesture.createdAt).toLocaleDateString()}</p>
            <button class="btn-delete" onclick="deleteGesture(${gesture.id})">Delete</button>
            <button class="btn-record" onclick="playbackGesture(${gesture.id})">Playback</button>
        `;
        
        gestureList.appendChild(card);
    });
}

function updateStats() {
    const totalGestures = savedGestures.length;
    const totalSamples = savedGestures.reduce((sum, g) => sum + g.sampleCount, 0);
    const currentSamples = recordingData.length;
    
    document.getElementById('total-gestures').textContent = totalGestures;
    document.getElementById('samples-recorded').textContent = totalSamples;
    document.getElementById('current-samples').textContent = currentSamples;
}

function drawRecordingStatus() {
    push();
    fill(255, 0, 0, 150);
    textAlign(CENTER);
    textSize(20);
    text('🔴 RECORDING', 0, -height/2 + 50);
    textSize(14);
    text(`Samples: ${recordingData.length}`, 0, -height/2 + 80);
    pop();
}

function drawGesturePreview() {
    // Draw a simple preview of the current hand position
    if (lmResults && lm.length > 0) {
        push();
        stroke(255, 255, 0);
        strokeWeight(2);
        noFill();
        
        // Draw hand outline
        beginShape();
        for (let i = 0; i < lm.length; i++) {
            vertex(
                lm[i].x * width - width / 2,
                lm[i].y * height - height / 2
            );
        }
        endShape();
        pop();
    }
}

function playbackGesture(gestureId) {
    const gesture = savedGestures.find(g => g.id === gestureId);
    if (!gesture) return;
    
    console.log(`Playing back gesture: ${gesture.name}`);
    alert(`Playing back gesture: ${gesture.name}\nThis feature will be implemented in the next phase.`);
}

// Export functions for global access
window.deleteGesture = deleteGesture;
window.playbackGesture = playbackGesture; 