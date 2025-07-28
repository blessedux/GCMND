'use client';

import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import { HandData } from '@/types';

interface StableHandRendererProps {
  leftHand: HandData | null;
  rightHand: HandData | null;
}

export default function StableHandRenderer({ leftHand, rightHand }: StableHandRendererProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const handsDataRef = useRef<{ left: any[] | null; right: any[] | null }>({ left: null, right: null });
  
  // Interactive sensitivity controls
  const [sensitivityX, setSensitivityX] = useState(1.5);
  const [sensitivityY, setSensitivityY] = useState(1.5);
  const [offsetX, setOffsetX] = useState(0.5);
  const [offsetY, setOffsetY] = useState(0.5);
  const [showControls, setShowControls] = useState(false);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [depthEffectEnabled, setDepthEffectEnabled] = useState(true);
  const [restingDepth, setRestingDepth] = useState(0.1);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [currentDepthZ, setCurrentDepthZ] = useState({ left: 0, right: 0 });
  
  // Cursor smoothing
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0, z: 0 });
  const cursorSmoothingRef = useRef({ x: 0, y: 0, z: 0 });

  // Control states
  const [enableWASDControls, setEnableWASDControls] = useState(true);
  const [enableClicking, setEnableClicking] = useState(true);
  const [lastKeyPress, setLastKeyPress] = useState<string>('');
  const [controlLogs, setControlLogs] = useState<string[]>([]);

  // Viewport zones for WASD controls
  const [viewportZones, setViewportZones] = useState({
    leftZone: 0.3,    // Left 30% of viewport = A
    rightZone: 0.7,   // Right 30% of viewport = D
    topZone: 0.3,     // Top 30% of viewport = W
    bottomZone: 0.7   // Bottom 30% of viewport = S
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p: p5) => {
      // Global variables for stable rendering
      let leftHandLandmarks: any[] | null = null;
      let rightHandLandmarks: any[] | null = null;
      let previousLeftLandmarks: any[] | null = null;
      let previousRightLandmarks: any[] | null = null;
      let frameCount = 0;

      p.setup = () => {
        p.createCanvas(window.innerWidth, window.innerHeight, p.WEBGL);
        p.frameRate(30);
        p.background(0, 0); // Transparent background
      };

      p.draw = () => {
        p.clear();
        p.background(0, 0); // Transparent background
        
        // Update landmarks from props (only when they change)
        if (handsDataRef.current.left !== leftHandLandmarks) {
          leftHandLandmarks = handsDataRef.current.left;
        }
        if (handsDataRef.current.right !== rightHandLandmarks) {
          rightHandLandmarks = handsDataRef.current.right;
        }

        // Set up 3D perspective
        p.perspective(p.PI / 3, p.width / p.height, 0.1, 1000);
        
        // No rotation - keep hands flat for overlay effect

        // Analyze gestures and controls
        let leftGestures: { isPinching: boolean; isGrabbing: boolean; isThumbClicking: boolean; pinchPoint: { x: number; y: number; z: number } | null; wristPosition: { x: number; y: number; z: number } | null } = { isPinching: false, isGrabbing: false, isThumbClicking: false, pinchPoint: null, wristPosition: null };
        let rightGestures: { isPinching: boolean; isGrabbing: boolean; isThumbClicking: boolean; pinchPoint: { x: number; y: number; z: number } | null; wristPosition: { x: number; y: number; z: number } | null } = { isPinching: false, isGrabbing: false, isThumbClicking: false, pinchPoint: null, wristPosition: null };

        // Simple smoothing - only update if landmarks exist
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          if (!previousLeftLandmarks) {
            previousLeftLandmarks = [...leftHandLandmarks];
          } else {
            // Simple linear interpolation
            for (let i = 0; i < leftHandLandmarks.length; i++) {
              if (leftHandLandmarks[i] && previousLeftLandmarks[i]) {
                previousLeftLandmarks[i].x = previousLeftLandmarks[i].x * 0.7 + leftHandLandmarks[i].x * 0.3;
                previousLeftLandmarks[i].y = previousLeftLandmarks[i].y * 0.7 + leftHandLandmarks[i].y * 0.3;
                previousLeftLandmarks[i].z = previousLeftLandmarks[i].z * 0.7 + leftHandLandmarks[i].z * 0.3;
              }
            }
          }
          leftGestures = checkGestures(previousLeftLandmarks);
          renderHand(p, previousLeftLandmarks, [255, 255, 255], 'left');
        } else {
          previousLeftLandmarks = null;
        }

        if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          if (!previousRightLandmarks) {
            previousRightLandmarks = [...rightHandLandmarks];
          } else {
            // Simple linear interpolation
            for (let i = 0; i < rightHandLandmarks.length; i++) {
              if (rightHandLandmarks[i] && previousRightLandmarks[i]) {
                previousRightLandmarks[i].x = previousRightLandmarks[i].x * 0.7 + rightHandLandmarks[i].x * 0.3;
                previousRightLandmarks[i].y = previousRightLandmarks[i].y * 0.7 + rightHandLandmarks[i].y * 0.3;
                previousRightLandmarks[i].z = previousRightLandmarks[i].z * 0.7 + rightHandLandmarks[i].z * 0.3;
              }
            }
          }
          rightGestures = checkGestures(previousRightLandmarks);
          renderHand(p, previousRightLandmarks, [255, 255, 255], 'right');
        } else {
          previousRightLandmarks = null;
        }

        // Temporarily disable controls for ETH-3D overlay
        // handleControls(leftGestures, rightGestures);
        // drawViewportZones(p);

        frameCount++;
      };

      const drawDepthRuler = (p: p5) => {
        p.push();
        
        // EXTREME depth simulation - reaching 5-8 meters into UI
        // Resting position is at 0cm, reaching forward goes to -800cm (8 meters deep into UI)
        // Reaching back goes to +300cm (3 meters back from resting position)
        
        const minDepth = 300; // 300cm back from resting position (closer to camera)
        const maxDepth = -800; // 800cm forward from resting position (8 meters deep into UI)
        const rulerSteps = 25; // 25 steps for clear measurement
        
        // Draw ruler from bottom center to center of screen
        const rulerStartX = 0;
        const rulerStartY = p.height / 2 - 50; // Bottom of screen
        const rulerStartZ = minDepth;
        
        const rulerEndX = 0;
        const rulerEndY = 0; // Center of screen
        const rulerEndZ = maxDepth;
        
        // Draw main ruler line
        p.stroke(255, 255, 255, 150);
        p.strokeWeight(3);
        p.line(rulerStartX, rulerStartY, rulerStartZ, rulerEndX, rulerEndY, rulerEndZ);
        
        // Draw measurement marks
        for (let i = 0; i <= rulerSteps; i++) {
          const t = i / rulerSteps;
          const currentX = p.lerp(rulerStartX, rulerEndX, t);
          const currentY = p.lerp(rulerStartY, rulerEndY, t);
          const currentZ = p.lerp(rulerStartZ, rulerEndZ, t);
          const distance = currentZ; // Distance from resting position (can be negative)
          
          // Draw tick mark
          p.push();
          p.translate(currentX, currentY, currentZ);
          
          // Tick mark perpendicular to ruler
          const tickLength = 15;
          p.stroke(255, 255, 255, 200);
          p.strokeWeight(2);
          p.line(-tickLength, 0, 0, tickLength, 0, 0);
          
          // Distance label - show as relative to resting position
          p.fill(255, 255, 255, 200);
          p.noStroke();
          p.textSize(12);
          p.textAlign(p.CENTER);
          
          if (distance === 0) {
            p.fill(255, 255, 0, 200); // Highlight resting position
            p.text('REST', 0, -10);
          } else {
            const sign = distance > 0 ? '+' : '';
            p.text(`${sign}${distance}cm`, 0, -10);
          }
          
          p.pop();
        }
        
        // Draw perspective grid lines (optional visual aid)
        p.stroke(100, 100, 255, 60);
        p.strokeWeight(1);
        
        // Horizontal perspective lines
        for (let depth = minDepth; depth >= maxDepth; depth -= 80) {
          const width = p.map(depth, minDepth, maxDepth, 400, 10); // Width decreases extremely with depth
          p.line(-width, 0, depth, width, 0, depth);
        }
        
        // Vertical perspective lines
        for (let x = -200; x <= 200; x += 50) {
          const startWidth = 400;
          const endWidth = 10;
          const startY = p.height / 2 - 50;
          const endY = 0;
          
          // Calculate Y position based on X (perspective)
          const y1 = startY;
          const y2 = endY;
          const z1 = minDepth;
          const z2 = maxDepth;
          
          p.line(x, y1, z1, x * (endWidth / startWidth), y2, z2);
        }
        
        p.pop();
      };

      const renderHand = (p: p5, landmarks: any[], color: number[], handType: string) => {
        if (!landmarks || landmarks.length < 21) return;

        p.push();
        
        // Set up lighting
        p.ambientLight(60, 60, 60);
        p.directionalLight(255, 255, 255, 0, 0, -1);
        
        // Calculate average Z for depth scaling
        let avgZ = 0;
        let validLandmarks = 0;
        for (const landmark of landmarks) {
          if (landmark && typeof landmark.z === 'number') {
            avgZ += landmark.z;
            validLandmarks++;
          }
        }
        avgZ = validLandmarks > 0 ? avgZ / validLandmarks : 0;
        
        // Apply depth configuration - restingDepth is now the calibrated resting position
        const depthZ = avgZ; // NO FLIP - direct mapping for natural movement
        
        // Calculate depth offset from resting position
        const depthOffset = depthZ - restingDepth;
        
        // Set boundaries for small hand movements (small real movement = larger UI movement)
        const depthSensitivity = 200.0; // Moderate sensitivity for natural feel
        const depthFactor = depthOffset * depthSensitivity;
        
        // Clamp depth factor to reasonable range (small movement area)
        const clampedDepthFactor = p.constrain(depthFactor, -100, 100); // 100cm forward/backward
        
        // Calculate perspective scale for dots (smaller when closer to camera, bigger when further)
        const perspectiveScale = p.map(clampedDepthFactor, -100, 100, 0.3, 1.5); // Scale from 0.3 (close) to 1.5 (far)
        
        // Update current depth for calibration
        if (handType === 'left') {
          setCurrentDepthZ(prev => ({ ...prev, left: depthZ }));
        } else {
          setCurrentDepthZ(prev => ({ ...prev, right: depthZ }));
        }
        
        // Check if hand is at resting position (dots should be on vectors)
        const restingTolerance = 0.02; // Very small tolerance for "at rest"
        const isAtRest = Math.abs(depthOffset) < restingTolerance;
        
        if (isAtRest) {
          console.log(`🎯 ${handType.toUpperCase()} HAND AT REST! Depth offset: ${depthOffset.toFixed(3)}`);
        }
        
        // Log depth values during calibration
        if (isCalibrating) {
          console.log(`📏 ${handType.toUpperCase()} HAND DEPTH: ${depthZ.toFixed(3)} (Resting: ${restingDepth.toFixed(3)})`);
        }

        // Draw VECTORS (connections) - NO SCALING, STATIC depth, only X/Y movement
        // Vectors define the resting position (point zero)
        p.stroke(color[0], color[1], color[2], 150);
        p.strokeWeight(4); // Fixed stroke weight - NO SCALING
        p.noFill();

        // Hand connections
        const connections = [
          // Thumb
          [0, 1], [1, 2], [2, 3], [3, 4],
          // Index finger
          [0, 5], [5, 6], [6, 7], [7, 8],
          // Middle finger
          [0, 9], [9, 10], [10, 11], [11, 12],
          // Ring finger
          [0, 13], [13, 14], [14, 15], [15, 16],
          // Pinky
          [0, 17], [17, 18], [18, 19], [19, 20],
          // Palm
          [5, 9], [9, 13], [13, 17]
        ];

        for (const [start, end] of connections) {
          if (landmarks[start] && landmarks[end]) {
            // Draw vectors at CONSTANT depth - never changes regardless of hand movement
            // Mirror mapping for correct hand positioning
            const x1 = p.map(landmarks[start].x, 0, 1, p.width/2, -p.width/2);
            const y1 = p.map(landmarks[start].y, 0, 1, -p.height/2, p.height/2);
            const z1 = 0; // CONSTANT depth at resting position (point zero)
            
            const x2 = p.map(landmarks[end].x, 0, 1, p.width/2, -p.width/2);
            const y2 = p.map(landmarks[end].y, 0, 1, -p.height/2, p.height/2);
            const z2 = 0; // CONSTANT depth at resting position (point zero)

            p.line(x1, y1, z1, x2, y2, z2);
          }
        }

        // Render DOTS (landmarks) - move relative to vectors based on depth with perspective scaling
        // Draw dots AFTER vectors so they appear on top
        for (let i = 0; i < landmarks.length; i++) {
          const landmark = landmarks[i];
          if (!landmark) continue;

          // Mirror mapping for correct hand positioning
          const x = p.map(landmark.x, 0, 1, p.width/2, -p.width/2);
          const y = p.map(landmark.y, 0, 1, -p.height/2, p.height/2);
          const z = clampedDepthFactor; // Dots move with depth offset from resting position

          p.push();
          p.translate(x, y, z);
          p.scale(perspectiveScale); // Apply perspective scaling (smaller when further away)
          
          // Different sizes for different landmark types
          let size = 8;
          if (i === 0) size = 12; // Wrist
          else if (i % 4 === 0) size = 10; // Finger tips
          else size = 6; // Other joints

          // Always visible dots - bright and visible
          p.fill(color[0], color[1], color[2], 255);
          p.noStroke();
          p.sphere(size);
          
          // Debug: Add bright outline to make dots more visible
          p.stroke(255, 255, 255, 200);
          p.strokeWeight(2);
          p.noFill();
          p.sphere(size + 2);
          
          // Draw depth indicator on wrist (landmark 0)
          if (i === 0) {
            p.fill(255, 255, 255, 200);
            p.noStroke();
            p.textSize(10);
            p.textAlign(p.CENTER);
            
            if (isAtRest) {
              p.fill(255, 255, 0, 200); // Yellow for resting
              p.text('REST', 0, size + 15);
            } else {
              const sign = clampedDepthFactor > 0 ? '+' : '';
              p.text(`${sign}${clampedDepthFactor.toFixed(0)}cm`, 0, size + 15);
            }
          }
          
          p.pop();
        }

        p.pop();
      };

      const checkGestures = (landmarks: any[]): { isPinching: boolean; isGrabbing: boolean; isThumbClicking: boolean; pinchPoint: { x: number; y: number; z: number } | null; wristPosition: { x: number; y: number; z: number } | null } => {
        if (!landmarks || landmarks.length < 21) return { isPinching: false, isGrabbing: false, isThumbClicking: false, pinchPoint: null, wristPosition: null };
        
        // Check for pinch between thumb tip and index finger tip
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const wrist = landmarks[0];
        
        if (!thumbTip || !indexTip || !wrist) return { isPinching: false, isGrabbing: false, isThumbClicking: false, pinchPoint: null, wristPosition: null };
        
        // Calculate distance between thumb and index finger tips
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dz = thumbTip.z - indexTip.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Pinch threshold
        const pinchThreshold = 0.15;
        const isPinching = distance < pinchThreshold;
        
        // Check for thumb clicking (thumb extended up and down)
        const thumbBase = landmarks[2];
        const thumbMiddle = landmarks[3];
        
        let isThumbClicking = false;
        if (thumbBase && thumbMiddle && thumbTip) {
          // Check if thumb is extended upward (clicking gesture)
          const thumbExtension = Math.sqrt(
            Math.pow(thumbTip.x - thumbBase.x, 2) +
            Math.pow(thumbTip.y - thumbBase.y, 2) +
            Math.pow(thumbTip.z - thumbBase.z, 2)
          );
          
          // Thumb clicking threshold - thumb should be extended but not too much
          const thumbClickThreshold = 0.12;
          const thumbClickMax = 0.25;
          isThumbClicking = thumbExtension > thumbClickThreshold && thumbExtension < thumbClickMax;
        }
        
        // Check for grab gesture (closed fist)
        const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
        const fingerBases = [landmarks[2], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
        
        let allFingersCurled = true;
        for (let i = 0; i < fingerTips.length; i++) {
          if (fingerTips[i] && fingerBases[i]) {
            const fingerDistance = Math.sqrt(
              Math.pow(fingerTips[i].x - fingerBases[i].x, 2) +
              Math.pow(fingerTips[i].y - fingerBases[i].y, 2) +
              Math.pow(fingerTips[i].z - fingerBases[i].z, 2)
            );
            
            if (fingerDistance > 0.1) {
              allFingersCurled = false;
              break;
            }
          }
        }
        
        const isGrabbing = allFingersCurled;
        
        // Calculate pinch point
        const pinchPoint = isPinching ? {
          x: (thumbTip.x + indexTip.x) / 2,
          y: (thumbTip.y + indexTip.y) / 2,
          z: (thumbTip.z + indexTip.z) / 2
        } : null;
        
        // Get wrist position
        const wristPosition = {
          x: wrist.x,
          y: wrist.y,
          z: wrist.z
        };
        
        return { isPinching, isGrabbing, isThumbClicking, pinchPoint, wristPosition };
      };

      const handleControls = (leftGestures: any, rightGestures: any) => {
        // Handle WASD controls based on hand position in viewport
        if (enableWASDControls) {
          const leftWrist = leftGestures.wristPosition;
          const rightWrist = rightGestures.wristPosition;
          
          let wasdKey = '';
          
          // Use the hand that's more active (closer to camera)
          const activeHand = leftWrist && rightWrist ? 
            (leftWrist.z < rightWrist.z ? leftWrist : rightWrist) : 
            (leftWrist || rightWrist);
          
          if (activeHand) {
            // Map viewport position to WASD keys
            if (activeHand.x < viewportZones.leftZone) {
              wasdKey = 'A';
            } else if (activeHand.x > viewportZones.rightZone) {
              wasdKey = 'D';
            }
            
            if (activeHand.y < viewportZones.topZone) {
              wasdKey = wasdKey ? wasdKey + '+W' : 'W';
            } else if (activeHand.y > viewportZones.bottomZone) {
              wasdKey = wasdKey ? wasdKey + '+S' : 'S';
            }
            
            if (wasdKey && wasdKey !== lastKeyPress) {
              simulateKeyPress(wasdKey);
              addControlLog(`🎮 WASD: ${wasdKey} | Hand: ${activeHand.x.toFixed(2)}, ${activeHand.y.toFixed(2)}`);
            }
          }
        }
        
        // Handle clicking (thumb clicking gesture)
        if (enableClicking) {
          const leftClicking = leftGestures.isThumbClicking;
          const rightClicking = rightGestures.isThumbClicking;
          
          if (leftClicking || rightClicking) {
            if (lastKeyPress !== 'CLICK') {
              simulateKeyPress('CLICK');
              addControlLog(`🖱️ CLICK: ${leftClicking ? 'Left' : 'Right'} hand thumb clicking`);
            }
          }
        }
      };

      const simulateKeyPress = (key: string) => {
        console.log(`⌨️ SIMULATING KEY: ${key}`);
        setLastKeyPress(key);
        
        // Create and dispatch keyboard events
        if (key !== 'CLICK') {
          const keyDownEvent = new KeyboardEvent('keydown', {
            key: key.toLowerCase(),
            code: `Key${key}`,
            keyCode: key.charCodeAt(0),
            which: key.charCodeAt(0),
            bubbles: true,
            cancelable: true
          });

          const keyUpEvent = new KeyboardEvent('keyup', {
            key: key.toLowerCase(),
            code: `Key${key}`,
            keyCode: key.charCodeAt(0),
            which: key.charCodeAt(0),
            bubbles: true,
            cancelable: true
          });

          document.dispatchEvent(keyDownEvent);
          
          setTimeout(() => {
            document.dispatchEvent(keyUpEvent);
          }, 100);
        } else {
          // Simulate mouse click
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          document.dispatchEvent(clickEvent);
        }
      };

      const addControlLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        setControlLogs(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
        console.log(logEntry);
      };

      const drawViewportZones = (p: p5) => {
        p.push();
        p.translate(-p.width/2, -p.height/2, 0);
        
        // Draw viewport zones for WASD controls
        p.stroke(255, 255, 0, 100);
        p.strokeWeight(1);
        p.noFill();
        
        // Left zone (A)
        p.rect(0, 0, p.width * viewportZones.leftZone, p.height);
        
        // Right zone (D)
        p.rect(p.width * viewportZones.rightZone, 0, p.width * (1 - viewportZones.rightZone), p.height);
        
        // Top zone (W)
        p.rect(0, 0, p.width, p.height * viewportZones.topZone);
        
        // Bottom zone (S)
        p.rect(0, p.height * viewportZones.bottomZone, p.width, p.height * (1 - viewportZones.bottomZone));
        
        // Zone labels
        p.fill(255, 255, 0, 150);
        p.noStroke();
        p.textSize(12);
        p.textAlign(p.CENTER);
        
        p.text('A', p.width * viewportZones.leftZone / 2, p.height / 2);
        p.text('D', p.width * (1 + viewportZones.rightZone) / 2, p.height / 2);
        p.text('W', p.width / 2, p.height * viewportZones.topZone / 2);
        p.text('S', p.width / 2, p.height * (1 + viewportZones.bottomZone) / 2);
        
        p.pop();
      };
    };

    p5InstanceRef.current = new p5(sketch, canvasRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [sensitivityX, sensitivityY, offsetX, offsetY, calibrationMode, depthEffectEnabled, restingDepth, enableWASDControls, enableClicking, viewportZones]);

  // Update hands data without triggering re-renders
  useEffect(() => {
    handsDataRef.current.left = leftHand?.landmarks || null;
    handsDataRef.current.right = rightHand?.landmarks || null;
  }, [leftHand, rightHand]);

  const resetCalibration = () => {
    setSensitivityX(1.5);
    setSensitivityY(1.5);
    setOffsetX(0.5);
    setOffsetY(0.5);
  };

  const saveCalibration = () => {
    const config = {
      sensitivityX,
      sensitivityY,
      offsetX,
      offsetY,
      restingDepth
    };
    localStorage.setItem('cursorCalibration', JSON.stringify(config));
    console.log('Calibration saved:', config);
  };

  const loadCalibration = () => {
    const saved = localStorage.getItem('cursorCalibration');
    if (saved) {
      const config = JSON.parse(saved);
      setSensitivityX(config.sensitivityX || 1.5);
      setSensitivityY(config.sensitivityY || 1.5);
      setOffsetX(config.offsetX || 0.5);
      setOffsetY(config.offsetY || 0.5);
      setRestingDepth(config.restingDepth || 0.1);
    }
  };

  const calibrateRestingPosition = () => {
    setIsCalibrating(true);
    console.log('🎯 CALIBRATION MODE ACTIVATED');
    console.log('📏 Move your hands to the desired resting position and click "Set Resting Position"');
  };

  const setRestingPosition = () => {
    // Use the average of both hands' current depth as the new resting position
    const avgDepth = (currentDepthZ.left + currentDepthZ.right) / 2;
    setRestingDepth(avgDepth);
    setIsCalibrating(false);
    console.log(`🎯 RESTING POSITION SET! New resting depth: ${avgDepth.toFixed(3)}`);
    console.log(`📏 Dots will now rest on vectors when hands are at this position`);
  };

  const resetRestingPosition = () => {
    setRestingDepth(0.1);
    setIsCalibrating(false);
    console.log('🔄 Resting position reset to default');
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 100,
      pointerEvents: 'none' // Allow clicks to pass through to underlying elements
    }}>
      <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Controls hidden for ETH-3D overlay */}
    </div>
  );
} 