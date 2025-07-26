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
        p.createCanvas(800, 640, p.WEBGL);
        p.frameRate(30);
        p.background(0);
      };

      p.draw = () => {
        p.clear();
        p.background(0);
        
        // Update landmarks from props (only when they change)
        if (handsDataRef.current.left !== leftHandLandmarks) {
          leftHandLandmarks = handsDataRef.current.left;
        }
        if (handsDataRef.current.right !== rightHandLandmarks) {
          rightHandLandmarks = handsDataRef.current.right;
        }

        // Set up 3D perspective
        p.perspective(p.PI / 3, p.width / p.height, 0.1, 1000);
        
        // Rotate view slightly for better 3D effect
        p.rotateX(p.PI / 12);
        p.rotateY(p.PI / 24);

        // Draw depth ruler first (behind everything)
        drawDepthRuler(p);

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
          renderHand(p, previousLeftLandmarks, [0, 255, 0], 'left');
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
          renderHand(p, previousRightLandmarks, [0, 0, 255], 'right');
        } else {
          previousRightLandmarks = null;
        }

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
        for (let depth = minDepth; depth >= maxDepth; depth -= 50) {
          const width = p.map(depth, minDepth, maxDepth, 400, 20); // Width decreases dramatically with depth
          p.line(-width, 0, depth, width, 0, depth);
        }
        
        // Vertical perspective lines
        for (let x = -200; x <= 200; x += 50) {
          const startWidth = 400;
          const endWidth = 20;
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
        const depthZ = -avgZ; // Flip depth for intuitive control
        
        // Calculate depth offset from resting position
        const depthOffset = depthZ - restingDepth;
        
        // DRAMATICALLY increase depth sensitivity for small hand movements
        // Small real hand movements = large virtual reach distances (3-5 meters)
        const depthSensitivity = 500.0; // EXTREME sensitivity for dramatic reach
        const depthFactor = depthOffset * depthSensitivity;
        
        // Clamp depth factor to dramatic range (3-5 meters into UI)
        const clampedDepthFactor = p.constrain(depthFactor, 300, -800); // 300cm back to 800cm forward (8 meters!)
        
        // Calculate perspective scale for dots (smaller when further away)
        const perspectiveScale = p.map(clampedDepthFactor, 300, -800, 1.0, 0.05); // Scale from 1.0 to 0.05 for extreme perspective
        
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
            const x1 = p.map(landmarks[start].x, 0, 1, -p.width/2, p.width/2);
            const y1 = p.map(landmarks[start].y, 0, 1, -p.height/2, p.height/2);
            const z1 = 0; // CONSTANT depth at resting position (point zero)
            
            const x2 = p.map(landmarks[end].x, 0, 1, -p.width/2, p.width/2);
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

          const x = p.map(landmark.x, 0, 1, -p.width/2, p.width/2);
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

      const checkGestures = (landmarks: any[]): { isPinching: boolean; isGrabbing: boolean; pinchPoint: { x: number; y: number; z: number } | null; wristPosition: { x: number; y: number; z: number } | null } => {
        if (!landmarks || landmarks.length < 21) return { isPinching: false, isGrabbing: false, pinchPoint: null, wristPosition: null };
        
        // Check for pinch between thumb tip and index finger tip
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const wrist = landmarks[0];
        
        if (!thumbTip || !indexTip || !wrist) return { isPinching: false, isGrabbing: false, pinchPoint: null, wristPosition: null };
        
        // Calculate distance between thumb and index finger tips
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dz = thumbTip.z - indexTip.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Pinch threshold
        const pinchThreshold = 0.15;
        const isPinching = distance < pinchThreshold;
        
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
        
        return { isPinching, isGrabbing, pinchPoint, wristPosition };
      };
    };

    p5InstanceRef.current = new p5(sketch, canvasRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [sensitivityX, sensitivityY, offsetX, offsetY, calibrationMode, depthEffectEnabled, restingDepth]);

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
    <div style={{ position: 'relative' }}>
      <div ref={canvasRef} />
      
      {/* Interactive Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000,
        minWidth: '200px'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Hand Depth Controls</span>
          <button
            onClick={() => setShowControls(!showControls)}
            style={{
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            {showControls ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showControls && (
          <>
            {/* Resting Position Calibration */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc' }}>Resting Position</div>
              <div style={{ fontSize: '10px', marginBottom: '5px', color: '#aaa' }}>
                Current: {restingDepth.toFixed(3)}
              </div>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '5px' }}>
                <button
                  onClick={calibrateRestingPosition}
                  style={{
                    background: isCalibrating ? '#ff8800' : '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '3px 6px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    flex: 1
                  }}
                >
                  {isCalibrating ? 'Calibrating...' : 'Start Cal'}
                </button>
                
                <button
                  onClick={setRestingPosition}
                  disabled={!isCalibrating}
                  style={{
                    background: isCalibrating ? '#4CAF50' : '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '3px 6px',
                    cursor: isCalibrating ? 'pointer' : 'not-allowed',
                    fontSize: '9px',
                    flex: 1
                  }}
                >
                  Set Position
                </button>
              </div>
              
              <button
                onClick={resetRestingPosition}
                style={{
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 6px',
                  cursor: 'pointer',
                  fontSize: '9px',
                  width: '100%'
                }}
              >
                Reset Position
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={saveCalibration}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  flex: 1
                }}
              >
                Save
              </button>
              
              <button
                onClick={loadCalibration}
                style={{
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  flex: 1
                }}
              >
                Load
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 