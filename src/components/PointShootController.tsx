'use client';

import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import { HandData } from '@/types';

interface PointShootControllerProps {
  leftHand: HandData | null;
  rightHand: HandData | null;
}

interface GunState {
  isAiming: boolean;
  isShooting: boolean;
  aimDirection: { x: number; y: number; z: number };
  aimAccuracy: number; // 0-100%
  recoil: number;
  ammoCount: number;
  reloading: boolean;
  targetHit: boolean;
  lastShotTime: number;
}

export default function PointShootController({ leftHand, rightHand }: PointShootControllerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const handsDataRef = useRef<{ 
    left: any[] | null; 
    right: any[] | null;
    leftDepth?: {
      depth: number;
      rawZ: number;
      distance: number;
      scale: number;
    };
    rightDepth?: {
      depth: number;
      rawZ: number;
      distance: number;
      scale: number;
    };
    leftThumbWasUp?: boolean;
    rightThumbWasUp?: boolean;
    leftThumbWasTouching?: boolean;
    rightThumbWasTouching?: boolean;
    leftThumbWasCurved?: boolean;
    rightThumbWasCurved?: boolean;
  }>({ left: null, right: null });
  
  // Gun state
  const [gunState, setGunState] = useState<GunState>({
    isAiming: false,
    isShooting: false,
    aimDirection: { x: 0, y: 0, z: 0 },
    aimAccuracy: 0,
    recoil: 0,
    ammoCount: 30,
    reloading: false,
    targetHit: false,
    lastShotTime: 0
  });

  // Debug controls
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [enableKeyboardSimulation, setEnableKeyboardSimulation] = useState(false);
  const [lastKeyPress, setLastKeyPress] = useState<string>('');

  // Sensitivity settings
  const [aimSensitivity, setAimSensitivity] = useState(2.0);
  const [shootSensitivity, setShootSensitivity] = useState(1.5);
  const [recoilRecovery, setRecoilRecovery] = useState(0.95);

  // Targets
  const [targets, setTargets] = useState<Array<{
    id: number;
    x: number;
    y: number;
    z: number;
    size: number;
    health: number;
    hit: boolean;
    hitTime: number;
  }>>([]);

  // Game settings
  const [gameMode, setGameMode] = useState<'practice' | 'targets' | 'moving'>('practice');
  const [score, setScore] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  const [targetsHit, setTargetsHit] = useState(0);
  const [lastShotTime, setLastShotTime] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p: p5) => {
      let leftHandLandmarks: any[] | null = null;
      let rightHandLandmarks: any[] | null = null;
      let frameCount = 0;

      p.setup = () => {
        p.createCanvas(800, 600, p.WEBGL);
        p.frameRate(60);
        p.background(0);
        
        // Initialize targets
        initializeTargets();
      };

      p.draw = () => {
        p.clear();
        p.background(20, 30, 40);
        
        // Update landmarks from props
        if (handsDataRef.current.left !== leftHandLandmarks) {
          leftHandLandmarks = handsDataRef.current.left;
        }
        if (handsDataRef.current.right !== rightHandLandmarks) {
          rightHandLandmarks = handsDataRef.current.right;
        }
        
        // Debug logging for hands data
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          console.log('🤚 LEFT HAND: Landmarks received, count:', leftHandLandmarks.length);
        }
        if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          console.log('🤚 RIGHT HAND: Landmarks received, count:', rightHandLandmarks.length);
        }

        // Set up 3D perspective
        p.perspective(p.PI / 3, p.width / p.height, 0.1, 1000);
        p.rotateX(p.PI / 12);

        // Analyze gun gestures
        const newGunState = analyzeGunGestures(p, leftHandLandmarks || [], rightHandLandmarks || []);
        setGunState(newGunState);

        // Check if all targets are hit and reset
        const allTargetsHit = targets.every(target => target.hit);
        if (allTargetsHit && targets.length > 0) {
          setTimeout(() => {
            initializeTargets();
            console.log('🎯 All targets hit! Resetting targets...');
          }, 2000); // Wait 2 seconds before resetting
        }

        // Draw hands with vectors and dots (both green)
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          console.log('🤚 RENDERING LEFT HAND with', leftHandLandmarks.length, 'landmarks');
          renderHand(p, leftHandLandmarks, [0, 255, 0], 'left');
          
          // Add a bright indicator for left hand
          const wrist = leftHandLandmarks[0];
          const x = p.map(wrist.x, 0, 1, -p.width/2, p.width/2);
          const y = p.map(wrist.y, 0, 1, -p.height/2, p.height/2);
          p.push();
          p.translate(x, y, 0);
          p.fill(0, 255, 0, 100);
          p.noStroke();
          p.sphere(30);
          p.pop();
          
          // Draw aiming line (wrist to pointer knuckle)
          const indexKnuckle = leftHandLandmarks[5];
          const knuckleX = p.map(indexKnuckle.x, 0, 1, -p.width/2, p.width/2);
          const knuckleY = p.map(indexKnuckle.y, 0, 1, -p.height/2, p.height/2);
          
          p.push();
          p.stroke(255, 255, 0, 255); // Bright yellow aiming line
          p.strokeWeight(8);
          p.line(x, y, 0, knuckleX, knuckleY, 0);
          
          // Draw aiming direction indicator
          p.translate(knuckleX, knuckleY, 0);
          p.fill(255, 255, 0, 255);
          p.noStroke();
          p.sphere(15);
          p.pop();
          
          // Debug: Log hand position to check for mirroring
          console.log(`🤚 LEFT HAND POSITION: (${x.toFixed(1)}, ${y.toFixed(1)}) - Raw: (${wrist.x.toFixed(3)}, ${wrist.y.toFixed(3)})`);
        }
        if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          console.log('🤚 RENDERING RIGHT HAND with', rightHandLandmarks.length, 'landmarks');
          renderHand(p, rightHandLandmarks, [255, 100, 255], 'right');
          
          // Add a bright indicator for right hand
          const wrist = rightHandLandmarks[0];
          const x = p.map(wrist.x, 0, 1, -p.width/2, p.width/2);
          const y = p.map(wrist.y, 0, 1, -p.height/2, p.height/2);
          p.push();
          p.translate(x, y, 0);
          p.fill(255, 100, 255, 100);
          p.noStroke();
          p.sphere(30);
          p.pop();
          
          // Draw aiming line (wrist to pointer knuckle)
          const indexKnuckle = rightHandLandmarks[5];
          const knuckleX = p.map(indexKnuckle.x, 0, 1, -p.width/2, p.width/2);
          const knuckleY = p.map(indexKnuckle.y, 0, 1, -p.height/2, p.height/2);
          
          p.push();
          p.stroke(255, 255, 0, 255); // Bright yellow aiming line
          p.strokeWeight(8);
          p.line(x, y, 0, knuckleX, knuckleY, 0);
          
          // Draw aiming direction indicator
          p.translate(knuckleX, knuckleY, 0);
          p.fill(255, 255, 0, 255);
          p.noStroke();
          p.sphere(15);
          p.pop();
          
          // Debug: Log hand position to check for mirroring
          console.log(`🤚 RIGHT HAND POSITION: (${x.toFixed(1)}, ${y.toFixed(1)}) - Raw: (${wrist.x.toFixed(3)}, ${wrist.y.toFixed(3)})`);
        }
        
        // Draw gun model
        drawGun(p, newGunState);
        
        // Draw targets
        drawTargets(p);
        
        // Draw cursor projection (laser)
        drawCursor(p, newGunState);
        
        // Draw a simple 2D cursor when aiming (always visible)
        if (newGunState.isAiming) {
          drawSimpleCursor(p, newGunState);
        }
        
        // Always draw a test laser for debugging
        if (showDebugInfo) {
          drawTestLaser(p);
        }
        
        // Draw crosshair
        drawCrosshair(p, newGunState);
        
        // Draw UI
        drawUI(p, newGunState);
        
        // Draw debug info
        if (showDebugInfo) {
          drawDebugInfo(p, newGunState);
        }

        frameCount++;
      };

      const initializeTargets = () => {
        const newTargets = [];
        for (let i = 0; i < 5; i++) {
          newTargets.push({
            id: i,
            x: p.random(-300, 300),
            y: p.random(-200, 200),
            z: p.random(-500, -200),
            size: p.random(20, 50),
            health: 100,
            hit: false,
            hitTime: 0
          });
        }
        setTargets(newTargets);
      };

      const analyzeGunGestures = (p: p5, leftLandmarks: any[], rightLandmarks: any[]): GunState => {
        // Check if at least one hand is present
        if ((!leftLandmarks || leftLandmarks.length < 21) && (!rightLandmarks || rightLandmarks.length < 21)) {
          return {
            ...gunState,
            isAiming: false,
            isShooting: false
          };
        }

        // Get wrist and index finger positions
        const leftWrist = leftLandmarks[0];
        const leftIndexTip = leftLandmarks[8];
        const rightWrist = rightLandmarks[0];
        const rightIndexTip = rightLandmarks[8];

        // Detect pointing gesture (pointer + middle finger extended, ring + pinky closed)
        const leftPointing = detectPointing(leftLandmarks);
        const rightPointing = detectPointing(rightLandmarks);

        // Detect shooting gesture (thumb touches pointer finger)
        const leftShooting = detectShooting(leftLandmarks);
        const rightShooting = detectShooting(rightLandmarks);

        // Detect thumb movement for detailed logging
        const leftThumb = detectThumbMovement(leftLandmarks);
        const rightThumb = detectThumbMovement(rightLandmarks);

        // Log gesture detection
        if (leftPointing || rightPointing) {
          console.log(`🎯 POINTING: Left: ${leftPointing ? '✅' : '❌'} | Right: ${rightPointing ? '✅' : '❌'}`);
          console.log(`🎯 AIMING DETECTED - This might trigger mirroring issues`);
        }
        
        if (leftShooting || rightShooting) {
          console.log(`🔫 SHOOTING: Left: ${leftShooting ? '✅' : '❌'} | Right: ${rightShooting ? '✅' : '❌'}`);
        }
        
        if (leftThumb.isUp || rightThumb.isUp) {
          console.log(`👍 THUMB UP: Left: ${leftThumb.isUp ? '✅' : '❌'} | Right: ${rightThumb.isUp ? '✅' : '❌'}`);
        }
        
        if (leftThumb.isDown || rightThumb.isDown) {
          console.log(`👎 THUMB DOWN: Left: ${leftThumb.isDown ? '✅' : '❌'} | Right: ${rightThumb.isDown ? '✅' : '❌'} | Distance: ${leftThumb.distance.toFixed(3)}/${rightThumb.distance.toFixed(3)}`);
        }

        // Calculate aim direction from pointing hand with smart sensitivity
        const aimHand = leftPointing ? leftLandmarks : rightPointing ? rightLandmarks : null;
        let aimDirection = { x: 0, y: 0, z: 0 };
        let isAiming = false;

        if (aimHand) {
          const wrist = aimHand[0];
          const indexKnuckle = aimHand[5]; // Pointer finger MCP (knuckle)
          
          // IMPROVED SYSTEM: Use wrist-to-pointer-knuckle line for aiming
          // This creates a more stable and intuitive aiming line (same as Aim & Background)
          const dx = indexKnuckle.x - wrist.x;
          const dy = indexKnuckle.y - wrist.y;
          const dz = indexKnuckle.z - wrist.z;
          
          // Normalize the aiming direction
          const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (length > 0) {
            // Use wrist-to-knuckle direction for aiming
            aimDirection = {
              x: dx / length,
              y: dy / length,
              z: dz / length
            };
            
            // Apply smoothing and sensitivity for more consistent movement
            const baseSensitivity = 2.0; // Increased for better responsiveness
            const smoothingFactor = 0.9; // Higher smoothing for stability
            
            // Apply exponential smoothing to reduce jittering
            aimDirection.x = aimDirection.x * baseSensitivity * smoothingFactor;
            aimDirection.y = aimDirection.y * baseSensitivity * smoothingFactor;
            
            // Ensure forward direction for shooting
            if (aimDirection.z > 0) {
              aimDirection.z = -Math.abs(aimDirection.z); // Force forward direction
            }
            
            // Clamp to reasonable range with smoother boundaries
            aimDirection.x = p.constrain(aimDirection.x, -1, 1);
            aimDirection.y = p.constrain(aimDirection.y, -1, 1);
            aimDirection.z = p.constrain(aimDirection.z, -1, 0); // Keep negative for forward
            
            isAiming = true;
            console.log(`🎯 POINT & SHOOT SMOOTH AIMING: Direction: ${JSON.stringify(aimDirection)}, Sensitivity: ${baseSensitivity}, Smoothing: ${smoothingFactor}`);
          }
        }
        
        // Debug logging for aiming state
        if (isAiming) {
          console.log('🎯 AIMING: State is TRUE, should show laser');
        }

        // Detect shooting
        const isShooting = leftShooting || rightShooting;
        
        // Calculate aim accuracy based on hand stability
        const aimAccuracy = calculateAimAccuracy(aimHand);
        
        // Handle recoil and mouse movement
        let recoil = gunState.recoil;
        if (isShooting && Date.now() - gunState.lastShotTime > 100) {
          recoil = Math.min(recoil + 0.3, 1.0);
          setShotsFired(prev => prev + 1);
          setLastShotTime(Date.now());
          
          // Check for hits
          if (isAiming) {
            const hitTarget = checkForHits(p, aimDirection, recoil);
            if (hitTarget) {
              setTargetsHit(prev => prev + 1);
              console.log(`🎯 TARGET HIT! Total hits: ${targetsHit + 1}`);
            }
          }
          
          // Log shot
          console.log(`🔫 SHOT FIRED! Recoil: ${recoil.toFixed(2)}, Accuracy: ${aimAccuracy.toFixed(0)}%`);
        } else {
          recoil *= recoilRecovery;
        }

        // Handle mouse movement based on hand X position
        if (isAiming) {
          const aimHand = leftPointing ? leftLandmarks : rightPointing ? rightLandmarks : null;
          if (aimHand) {
            const wrist = aimHand[0];
            // Map hand X position to mouse movement
            const mouseX = p.map(wrist.x, 0, 1, 0, window.innerWidth);
            const mouseY = p.map(wrist.y, 0, 1, 0, window.innerHeight);
            
            // Simulate mouse movement
            const mouseEvent = new MouseEvent('mousemove', {
              clientX: mouseX,
              clientY: mouseY,
              bubbles: true,
              cancelable: true
            });
            document.dispatchEvent(mouseEvent);
          }
        }

        // Handle reloading (both hands closed fists)
        const leftFist = detectFist(leftLandmarks);
        const rightFist = detectFist(rightLandmarks);
        const reloading = leftFist && rightFist;

        return {
          isAiming,
          isShooting,
          aimDirection,
          aimAccuracy,
          recoil,
          ammoCount: reloading ? 30 : gunState.ammoCount,
          reloading,
          targetHit: false,
          lastShotTime: isShooting ? Date.now() : gunState.lastShotTime
        };
      };

      const detectPointing = (landmarks: any[]): boolean => {
        if (!landmarks || landmarks.length < 21) return false;
        
        // NEW SYSTEM: Pointer finger extended + thumb up = aiming
        const thumbTip = landmarks[4];
        const thumbIP = landmarks[3];
        const thumbMCP = landmarks[2];
        const indexTip = landmarks[8];
        const indexPIP = landmarks[6];
        const indexMCP = landmarks[5];
        const middleTip = landmarks[12];
        const middlePIP = landmarks[10];
        const middleMCP = landmarks[9];
        const ringTip = landmarks[16];
        const ringPIP = landmarks[14];
        const ringMCP = landmarks[13];
        const pinkyTip = landmarks[20];
        const pinkyPIP = landmarks[18];
        const pinkyMCP = landmarks[17];
        
        // Calculate finger extensions
        const indexExtension = calculateDistance(indexTip, indexMCP);
        const middleExtension = calculateDistance(middleTip, middleMCP);
        const ringExtension = calculateDistance(ringTip, ringMCP);
        const pinkyExtension = calculateDistance(pinkyTip, pinkyMCP);
        const thumbExtension = calculateDistance(thumbTip, thumbMCP);
        
        // Pointer finger should be extended
        const indexExtended = indexExtension > 0.12; // Higher threshold for clear extension
        
        // Other fingers should be closed (fist)
        const middleClosed = middleExtension < 0.08;
        const ringClosed = ringExtension < 0.08;
        const pinkyClosed = pinkyExtension < 0.08;
        
        // Thumb should be pointing up (extended upward)
        const thumbUp = thumbExtension > 0.10;
        
        // Check if thumb is pointing upward relative to other fingers
        const thumbDirection = {
          x: thumbTip.x - thumbMCP.x,
          y: thumbTip.y - thumbMCP.y,
          z: thumbTip.z - thumbMCP.z
        };
        
        // Normalize thumb direction
        const thumbLength = Math.sqrt(thumbDirection.x * thumbDirection.x + thumbDirection.y * thumbDirection.y + thumbDirection.z * thumbDirection.z);
        const normalizedThumb = thumbLength > 0 ? {
          x: thumbDirection.x / thumbLength,
          y: thumbDirection.y / thumbLength,
          z: thumbDirection.z / thumbLength
        } : { x: 0, y: 0, z: 0 };
        
        // Thumb is pointing up if Y component is positive (upward direction)
        const isThumbPointingUp = normalizedThumb.y > 0.3; // Threshold for upward direction
        
        const isAiming = indexExtended && middleClosed && ringClosed && pinkyClosed && thumbUp && isThumbPointingUp;
        
        // Log aiming detection for debugging
        if (isAiming) {
          console.log(`🎯 NEW AIMING DETECTION: Pointer: ${indexExtended ? '✅' : '❌'}, Middle: ${middleClosed ? '✅' : '❌'}, Ring: ${ringClosed ? '✅' : '❌'}, Pinky: ${pinkyClosed ? '✅' : '❌'}, Thumb Up: ${thumbUp ? '✅' : '❌'}, Thumb Direction: ${isThumbPointingUp ? '✅' : '❌'}`);
        }
        
        return isAiming;
      };

      const detectShooting = (landmarks: any[]): boolean => {
        if (!landmarks || landmarks.length < 21) return false;
        
        // SIMPLE SYSTEM: Full fist = shooting (all fingers closed)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        
        // Get finger base landmarks (MCP joints)
        const thumbMCP = landmarks[2];
        const indexMCP = landmarks[5];
        const middleMCP = landmarks[9];
        const ringMCP = landmarks[13];
        const pinkyMCP = landmarks[17];
        
        // Calculate finger extensions
        const thumbExtension = calculateDistance(thumbTip, thumbMCP);
        const indexExtension = calculateDistance(indexTip, indexMCP);
        const middleExtension = calculateDistance(middleTip, middleMCP);
        const ringExtension = calculateDistance(ringTip, ringMCP);
        const pinkyExtension = calculateDistance(pinkyTip, pinkyMCP);
        
        // More lenient thresholds for fist detection (same as Aim & Background)
        const thumbClosed = thumbExtension < 0.12; // Increased from 0.08
        const indexClosed = indexExtension < 0.12; // Increased from 0.08
        const middleClosed = middleExtension < 0.12; // Increased from 0.08
        const ringClosed = ringExtension < 0.12; // Increased from 0.08
        const pinkyClosed = pinkyExtension < 0.12; // Increased from 0.08
        
        // Detect full fist gesture
        const isFullFist = thumbClosed && indexClosed && middleClosed && ringClosed && pinkyClosed;
        
        // Calculate fist percentage for debugging
        const closedFingers = [thumbClosed, indexClosed, middleClosed, ringClosed, pinkyClosed].filter(Boolean).length;
        const fistPercentage = (closedFingers / 5) * 100;
        
        // Detect when fist starts (not continuous)
        const wasFist = handsDataRef.current[`${landmarks === leftHandLandmarks ? 'left' : 'right'}ThumbWasUp`] || false;
        const shooting = !wasFist && isFullFist; // Only trigger on initial fist
        
        // Store current fist state for next frame
        if (landmarks === leftHandLandmarks) {
          handsDataRef.current.leftThumbWasUp = isFullFist;
        } else {
          handsDataRef.current.rightThumbWasUp = isFullFist;
        }
        
        // Log shooting detection for debugging
        if (shooting) {
          console.log(`🔫 POINT & SHOOT SHOOTING DETECTION: Full fist detected: ✅ (Fist %: ${fistPercentage.toFixed(0)}%, Thumb: ${thumbClosed ? '✅' : '❌'}, Index: ${indexClosed ? '✅' : '❌'}, Middle: ${middleClosed ? '✅' : '❌'}, Ring: ${ringClosed ? '✅' : '❌'}, Pinky: ${pinkyClosed ? '✅' : '❌'})`);
        } else if (fistPercentage > 60) {
          // Log when close to fist but not quite there
          console.log(`🔫 POINT & SHOOT FIST PROGRESS: ${fistPercentage.toFixed(0)}% fist (Thumb: ${thumbExtension.toFixed(3)}, Index: ${indexExtension.toFixed(3)}, Middle: ${middleExtension.toFixed(3)}, Ring: ${ringExtension.toFixed(3)}, Pinky: ${pinkyExtension.toFixed(3)})`);
        }
        
        return shooting;
      };

      const detectFist = (landmarks: any[]): boolean => {
        if (!landmarks || landmarks.length < 21) return false;
        
        // Get finger tip landmarks
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        
        // Get finger base landmarks (MCP joints)
        const thumbBase = landmarks[2];
        const indexBase = landmarks[5];
        const middleBase = landmarks[9];
        const ringBase = landmarks[13];
        const pinkyBase = landmarks[17];
        
        // Calculate distances from tips to bases for each finger
        const distances = [
          calculateDistance(thumbTip, thumbBase),
          calculateDistance(indexTip, indexBase),
          calculateDistance(middleTip, middleBase),
          calculateDistance(ringTip, ringBase),
          calculateDistance(pinkyTip, pinkyBase)
        ];
        
        // Check if all fingers are curled (fist)
        const fistThreshold = 0.08;
        const allFingersCurled = distances.every(distance => distance < fistThreshold);
        
        return allFingersCurled;
      };

      const calculateDistance = (point1: any, point2: any): number => {
        if (!point1 || !point2) return 0;
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const dz = point1.z - point2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };

      const calculateAimAccuracy = (landmarks: any[] | null): number => {
        if (!landmarks) return 0;
        
        // Calculate hand stability based on landmark variance
        let variance = 0;
        const wrist = landmarks[0];
        const indexTip = landmarks[8];
        
        // Simple stability calculation
        const distance = calculateDistance(wrist, indexTip);
        const stability = Math.max(0, 1 - Math.abs(distance - 0.15) / 0.1);
        
        return Math.min(100, stability * 100);
      };

      const calculateFistPercentage = (landmarks: any[]): number => {
        if (!landmarks || landmarks.length < 21) return 0;
        
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        
        // Get finger base landmarks (MCP joints)
        const thumbMCP = landmarks[2];
        const indexMCP = landmarks[5];
        const middleMCP = landmarks[9];
        const ringMCP = landmarks[13];
        const pinkyMCP = landmarks[17];
        
        // Calculate finger extensions
        const thumbExtension = calculateDistance(thumbTip, thumbMCP);
        const indexExtension = calculateDistance(indexTip, indexMCP);
        const middleExtension = calculateDistance(middleTip, middleMCP);
        const ringExtension = calculateDistance(ringTip, ringMCP);
        const pinkyExtension = calculateDistance(pinkyTip, pinkyMCP);
        
        // Check if each finger is closed (using same thresholds as detectShooting)
        const thumbClosed = thumbExtension < 0.12;
        const indexClosed = indexExtension < 0.12;
        const middleClosed = middleExtension < 0.12;
        const ringClosed = ringExtension < 0.12;
        const pinkyClosed = pinkyExtension < 0.12;
        
        // Calculate percentage of closed fingers
        const closedFingers = [thumbClosed, indexClosed, middleClosed, ringClosed, pinkyClosed].filter(Boolean).length;
        const fistPercentage = (closedFingers / 5) * 100;
        
        return fistPercentage;
      };

      const detectThumbMovement = (landmarks: any[]): { isUp: boolean; isDown: boolean; distance: number } => {
        if (!landmarks || landmarks.length < 21) return { isUp: false, isDown: false, distance: 0 };
        
        const thumbTip = landmarks[4];
        const thumbBase = landmarks[2];
        const indexTip = landmarks[8];
        
        // Calculate thumb extension
        const thumbExtension = calculateDistance(thumbTip, thumbBase);
        const thumbToIndexDistance = calculateDistance(thumbTip, indexTip);
        
        // Thumb position thresholds
        const upThreshold = 0.12;
        const downThreshold = 0.08;
        
        const isUp = thumbExtension > upThreshold;
        const isDown = thumbToIndexDistance < downThreshold;
        
        return { isUp, isDown, distance: thumbToIndexDistance };
      };

      const checkForHits = (p: p5, aimDirection: { x: number; y: number; z: number }, recoil: number): boolean => {
        const accuracy = 1 - recoil * 0.5; // Recoil affects accuracy
        
        // Get the aiming hand position for hit detection
        let laserStartPosition = { x: 0, y: 0, z: 0 };
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          const indexTip = leftHandLandmarks[8];
          const middleTip = leftHandLandmarks[12];
          const midPointX = (indexTip.x + middleTip.x) / 2;
          const midPointY = (indexTip.y + middleTip.y) / 2;
          const midPointZ = (indexTip.z + middleTip.z) / 2;
          
          laserStartPosition = {
            x: p.map(midPointX, 0, 1, -p.width/2, p.width/2),
            y: p.map(midPointY, 0, 1, -p.height/2, p.height/2),
            z: p.map(midPointZ, 0, 1, -100, 100)
          };
        } else if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          const indexTip = rightHandLandmarks[8];
          const middleTip = rightHandLandmarks[12];
          const midPointX = (indexTip.x + middleTip.x) / 2;
          const midPointY = (indexTip.y + middleTip.y) / 2;
          const midPointZ = (indexTip.z + middleTip.z) / 2;
          
          laserStartPosition = {
            x: p.map(midPointX, 0, 1, -p.width/2, p.width/2),
            y: p.map(midPointY, 0, 1, -p.height/2, p.height/2),
            z: p.map(midPointZ, 0, 1, -100, 100)
          };
        }
        
        // Calculate cursor position (FORWARD direction)
        const cursorDistance = 200;
        const cursorX = laserStartPosition.x + aimDirection.x * cursorDistance;
        const cursorY = laserStartPosition.y + aimDirection.y * cursorDistance;
        const cursorZ = laserStartPosition.z + aimDirection.z * cursorDistance; // Negative Z = forward
        
        let hitTarget = false;
        
        targets.forEach((target, index) => {
          if (target.hit) return; // Skip already hit targets
          
          // Calculate distance between cursor and target
          const dx = cursorX - target.x;
          const dy = cursorY - target.y;
          const dz = cursorZ - target.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Hit detection based on cursor proximity and accuracy
          const hitRadius = target.size * (1 + (1 - accuracy) * 2); // Larger hit area with recoil
          const hitChance = Math.max(0, 1 - distance / hitRadius) * accuracy;
          
          if (Math.random() < hitChance) {
            const newTargets = [...targets];
            newTargets[index] = {
              ...target,
              hit: true,
              hitTime: Date.now(),
              health: 0
            };
            setTargets(newTargets);
            setScore(prev => prev + 10);
            hitTarget = true;
            
            // Log hit
            console.log(`🎯 TARGET HIT! Distance: ${distance.toFixed(1)}, Accuracy: ${(accuracy * 100).toFixed(0)}%, Score: ${score + 10}`);
          }
        });
        
        return hitTarget;
      };

      const drawGun = (p: p5, state: GunState) => {
        p.push();
        
        // Get the shooting hand position (fist)
        let gunPosition = { x: 0, y: 0, z: 0 };
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          const wrist = leftHandLandmarks[0];
          gunPosition = {
            x: p.map(wrist.x, 0, 1, -p.width/2, p.width/2),
            y: p.map(wrist.y, 0, 1, -p.height/2, p.height/2),
            z: 0
          };
        } else if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          const wrist = rightHandLandmarks[0];
          gunPosition = {
            x: p.map(wrist.x, 0, 1, -p.width/2, p.width/2),
            y: p.map(wrist.y, 0, 1, -p.height/2, p.height/2),
            z: 0
          };
        }
        
        // Draw gun model when fist is closed (shooting)
        if (state.isShooting) {
          p.translate(gunPosition.x, gunPosition.y, gunPosition.z);
          
          // Calculate gun direction from wrist to knuckles (forward direction)
          let gunDirection = { x: 0, y: 0, z: -1 }; // Default forward
          
          if (leftHandLandmarks && leftHandLandmarks.length > 0) {
            const wrist = leftHandLandmarks[0];
            const knuckles = leftHandLandmarks[5]; // Index finger base
            gunDirection = {
              x: knuckles.x - wrist.x,
              y: knuckles.y - wrist.y,
              z: knuckles.z - wrist.z
            };
          } else if (rightHandLandmarks && rightHandLandmarks.length > 0) {
            const wrist = rightHandLandmarks[0];
            const knuckles = rightHandLandmarks[5]; // Index finger base
            gunDirection = {
              x: knuckles.x - wrist.x,
              y: knuckles.y - wrist.y,
              z: knuckles.z - wrist.z
            };
          }
          
          // Normalize gun direction
          const length = Math.sqrt(gunDirection.x * gunDirection.x + gunDirection.y * gunDirection.y + gunDirection.z * gunDirection.z);
          if (length > 0) {
            gunDirection = {
              x: gunDirection.x / length,
              y: gunDirection.y / length,
              z: gunDirection.z / length
            };
          }
          
          // Draw gun barrel (thick stick)
          const barrelLength = 80;
          p.stroke(60, 60, 60, 255); // Dark gray
          p.strokeWeight(12);
          p.noFill();
          p.line(0, 0, 0, 
                 gunDirection.x * barrelLength, 
                 gunDirection.y * barrelLength, 
                 gunDirection.z * barrelLength);
          
          // Draw gun handle (perpendicular to barrel)
          p.stroke(80, 80, 80, 255);
          p.strokeWeight(8);
          p.line(0, 0, 0, 0, 20, 0);
          
          // Draw gun grip
          p.stroke(100, 100, 100, 255);
          p.strokeWeight(6);
          p.line(0, 20, 0, 0, 30, 0);
          
          // Draw trigger guard
          p.stroke(70, 70, 70, 255);
          p.strokeWeight(4);
          p.noFill();
          p.circle(0, 10, 12);
          
          // Draw trigger (highlighted when shooting)
          p.fill(255, 0, 0, 255);
          p.stroke(255, 0, 0, 255);
          p.strokeWeight(2);
          p.rect(-1.5, 8, 3, 6);
          
          // Draw muzzle flash
          p.push();
          p.translate(
            gunDirection.x * barrelLength,
            gunDirection.y * barrelLength,
            gunDirection.z * barrelLength
          );
          
          p.fill(255, 255, 0, 200);
          p.stroke(255, 100, 0, 255);
          p.strokeWeight(4);
          p.sphere(10);
          
          // Muzzle flash rays
          p.stroke(255, 255, 0, 150);
          p.strokeWeight(3);
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * p.TWO_PI;
            const rayLength = 20;
            p.line(0, 0, 0,
                   Math.cos(angle) * rayLength,
                   Math.sin(angle) * rayLength,
                   0);
          }
          
          p.pop();
          
          // Draw laser from gun barrel
          const laserLength = 300;
          p.stroke(255, 0, 0, 255); // Bright red laser
          p.strokeWeight(8);
          p.line(
            gunDirection.x * barrelLength,
            gunDirection.y * barrelLength,
            gunDirection.z * barrelLength,
            gunDirection.x * (barrelLength + laserLength),
            gunDirection.y * (barrelLength + laserLength),
            gunDirection.z * (barrelLength + laserLength)
          );
          
          // Laser glow
          p.stroke(255, 100, 100, 150);
          p.strokeWeight(16);
          p.line(
            gunDirection.x * barrelLength,
            gunDirection.y * barrelLength,
            gunDirection.z * barrelLength,
            gunDirection.x * (barrelLength + laserLength),
            gunDirection.y * (barrelLength + laserLength),
            gunDirection.z * (barrelLength + laserLength)
          );
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
        
        // INVERTED depth calculation: closer to camera = more depth, further from camera = less depth
        const depthZ = avgZ;
        const depthOffset = depthZ - 0.3; // Resting depth
        const depthSensitivity = 200.0; // Increased sensitivity
        const depthFactor = depthOffset * depthSensitivity;
        const clampedDepthFactor = p.constrain(depthFactor, -100, 100);
        
        // Calculate perspective scale (bigger when closer, smaller when further)
        const perspectiveScale = p.map(clampedDepthFactor, -100, 100, 0.3, 2.0);

        // Draw VECTORS (connections) - hand skeleton with depth
        p.stroke(color[0], color[1], color[2], 200); // Brighter stroke
        p.strokeWeight(4); // Thicker lines
        p.noFill();

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

        // Draw numbered vectors
        for (let i = 0; i < connections.length; i++) {
          const [start, end] = connections[i];
          if (landmarks[start] && landmarks[end]) {
            // Direct mapping (no mirroring)
            const x1 = p.map(landmarks[start].x, 0, 1, -p.width/2, p.width/2);
            const y1 = p.map(landmarks[start].y, 0, 1, -p.height/2, p.height/2);
            const z1 = clampedDepthFactor; // Apply depth to vectors too
            
            const x2 = p.map(landmarks[end].x, 0, 1, -p.width/2, p.width/2);
            const y2 = p.map(landmarks[end].y, 0, 1, -p.height/2, p.height/2);
            const z2 = clampedDepthFactor; // Apply depth to vectors too

            p.line(x1, y1, z1, x2, y2, z2);
            
            // Draw vector number at midpoint
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const midZ = (z1 + z2) / 2;
            
            p.push();
            p.translate(midX, midY, midZ);
            p.scale(perspectiveScale);
            
            p.fill(255, 255, 0, 255); // Yellow text
            p.stroke(0, 0, 0, 255); // Black outline
            p.strokeWeight(1);
            p.textSize(8);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(`V${i}`, 0, 0);
            
            p.pop();
          }
        }

        // Render DOTS (landmarks) - move with depth
        for (let i = 0; i < landmarks.length; i++) {
          const landmark = landmarks[i];
          if (!landmark) continue;

          // Direct mapping (no mirroring)
          const x = p.map(landmark.x, 0, 1, -p.width/2, p.width/2);
          const y = p.map(landmark.y, 0, 1, -p.height/2, p.height/2);
          const z = clampedDepthFactor;

          p.push();
          p.translate(x, y, z);
          p.scale(perspectiveScale);
          
          let size = 8; // Larger base size
          if (i === 0) size = 15; // Wrist - much larger
          else if (i % 4 === 0) size = 12; // Finger tips - larger
          else if (i % 4 === 1) size = 10; // Middle joints
          else if (i % 4 === 2) size = 8; // End joints

          p.fill(color[0], color[1], color[2], 255);
          p.stroke(255, 255, 255, 100); // White outline
          p.strokeWeight(1);
          p.sphere(size);
          
          // Draw landmark number
          p.fill(255, 255, 255, 255); // White text
          p.stroke(0, 0, 0, 255); // Black outline
          p.strokeWeight(1);
          p.textSize(10);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(`${i}`, 0, 0);
          
          p.pop();
        }

        p.pop();
      };

      const drawCursor = (p: p5, state: GunState) => {
        if (!state.isAiming) {
          console.log('🎯 LASER: Not aiming, skipping laser draw');
          return;
        }
        
        console.log('🎯 LASER: Drawing laser beam...');
        
        p.push();
        
        // Get the aiming hand and finger tip positions
        let aimHand = null;
        
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          aimHand = leftHandLandmarks;
        } else if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          aimHand = rightHandLandmarks;
        }
        
        if (aimHand) {
          const indexTip = aimHand[8];
          const middleTip = aimHand[12];
          
          // Calculate laser start position (midpoint between pointer and middle finger tips)
          const midPointX = (indexTip.x + middleTip.x) / 2;
          const midPointY = (indexTip.y + middleTip.y) / 2;
          const midPointZ = (indexTip.z + middleTip.z) / 2;
          
          // Map to screen coordinates (2D)
          const screenX = p.map(midPointX, 0, 1, -p.width/2, p.width/2);
          const screenY = p.map(midPointY, 0, 1, -p.height/2, p.height/2);
          
          // Calculate cursor position on screen based on aim direction
          const cursorDistance = 300; // Distance from hand to cursor on screen
          const cursorX = screenX + state.aimDirection.x * cursorDistance;
          const cursorY = screenY + state.aimDirection.y * cursorDistance;
          
          // Draw laser beam from hand to cursor (2D on screen)
          p.stroke(255, 0, 0, 255); // Bright red laser
          p.strokeWeight(8);
          p.noFill();
          p.line(screenX, screenY, 0, cursorX, cursorY, 0);
          
          // Draw laser glow effect
          p.stroke(255, 100, 100, 200);
          p.strokeWeight(16);
          p.line(screenX, screenY, 0, cursorX, cursorY, 0);
          
          // Draw additional bright core
          p.stroke(255, 255, 255, 255); // White core
          p.strokeWeight(4);
          p.line(screenX, screenY, 0, cursorX, cursorY, 0);
          
          // Draw cursor dot at end of laser (always visible on screen)
          p.translate(cursorX, cursorY, 0);
          
          // Draw cursor glow
          p.fill(255, 100, 100, 200);
          p.noStroke();
          p.circle(0, 0, 30);
          
          // Draw cursor center
          p.fill(255, 0, 0, 255); // Red cursor
          p.circle(0, 0, 15);
          
          // Draw bright center
          p.fill(255, 255, 255, 255);
          p.circle(0, 0, 6);
          
          // Draw accuracy indicator
          const accuracySize = (100 - state.aimAccuracy) * 0.4;
          p.stroke(255, 255, 0, 200);
          p.strokeWeight(2);
          p.noFill();
          p.circle(0, 0, accuracySize);
          
          // Draw crosshair lines
          p.stroke(255, 255, 255, 200);
          p.strokeWeight(1);
          p.line(-10, 0, 0, 10, 0, 0);
          p.line(0, -10, 0, 0, 10, 0);
          
          console.log(`🎯 CURSOR POSITION: (${cursorX.toFixed(1)}, ${cursorY.toFixed(1)})`);
        }
        
        p.pop();
      };

      const drawSimpleCursor = (p: p5, state: GunState) => {
        p.push();
        
        // Draw a simple 2D cursor that's always visible on screen
        // Position cursor based on aim direction (simplified)
        const cursorX = state.aimDirection.x * 200; // Scale aim direction to screen
        const cursorY = state.aimDirection.y * 200;
        
        // Draw cursor at screen position
        p.translate(cursorX, cursorY, 0);
        
        // Draw cursor glow
        p.fill(255, 0, 0, 150);
        p.noStroke();
        p.circle(0, 0, 40);
        
        // Draw cursor center
        p.fill(255, 0, 0, 255);
        p.circle(0, 0, 20);
        
        // Draw bright center
        p.fill(255, 255, 255, 255);
        p.circle(0, 0, 8);
        
        // Draw crosshair
        p.stroke(255, 255, 255, 255);
        p.strokeWeight(2);
        p.noFill();
        p.line(-15, 0, 0, 15, 0, 0);
        p.line(0, -15, 0, 0, 15, 0);
        
        console.log(`🎯 SIMPLE CURSOR: (${cursorX.toFixed(1)}, ${cursorY.toFixed(1)})`);
        
        p.pop();
      };

      const drawTestLaser = (p: p5) => {
        p.push();
        
        // Draw a simple test laser from center to show the system is working
        p.stroke(0, 255, 0, 255); // Bright green
        p.strokeWeight(10);
        p.noFill();
        p.line(0, 0, 0, 0, 0, -200);
        
        // Draw test cursor
        p.translate(0, 0, -200);
        p.fill(0, 255, 0, 255);
        p.noStroke();
        p.sphere(15);
        
        p.pop();
      };

      const drawTargets = (p: p5) => {
        p.push();
        
        targets.forEach(target => {
          p.push();
          p.translate(target.x, target.y, target.z);
          
          // Draw target
          if (target.hit) {
            // Explosion effect for hit targets
            const timeSinceHit = Date.now() - target.hitTime;
            const explosionProgress = Math.min(timeSinceHit / 1000, 1); // 1 second explosion
            
            if (explosionProgress < 1) {
              // Explosion particles
              const particleCount = 20;
              const explosionRadius = target.size * (1 + explosionProgress * 3);
              
              for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * p.TWO_PI;
                const radius = explosionRadius * (0.5 + Math.random() * 0.5);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const z = (Math.random() - 0.5) * 20;
                
                p.push();
                p.translate(x, y, z);
                
                const alpha = 255 * (1 - explosionProgress);
                p.fill(255, 100 + explosionProgress * 155, 0, alpha);
                p.noStroke();
                p.sphere(2 + explosionProgress * 3);
                
                p.pop();
              }
              
              // Explosion flash
              p.fill(255, 255, 0, 100 * (1 - explosionProgress));
              p.noStroke();
              p.sphere(target.size * (1 + explosionProgress * 2));
            }
          } else {
            // Active target
            p.fill(255, 255, 0, 150);
            p.stroke(255, 255, 255, 200);
            p.strokeWeight(2);
            p.sphere(target.size);
            
            // Target rings
            p.noFill();
            p.stroke(255, 255, 255, 100);
            p.strokeWeight(1);
            p.circle(0, 0, target.size * 2);
            p.circle(0, 0, target.size * 1.5);
            p.circle(0, 0, target.size);
            
            // Target center
            p.fill(255, 0, 0, 200);
            p.noStroke();
            p.circle(0, 0, target.size * 0.3);
          }
          
          p.pop();
        });
        
        p.pop();
      };

      const drawCrosshair = (p: p5, state: GunState) => {
        if (!state.isAiming) return;
        
        p.push();
        
        // Draw crosshair at screen center
        p.stroke(255, 255, 255, 200);
        p.strokeWeight(2);
        p.noFill();
        
        const size = 20 + state.recoil * 10; // Recoil affects crosshair size
        
        // Crosshair lines
        p.line(-size, 0, 0, size, 0, 0);
        p.line(0, -size, 0, 0, size, 0);
        
        // Accuracy indicator
        const accuracySize = (100 - state.aimAccuracy) * 0.5;
        p.stroke(255, 0, 0, 100);
        p.circle(0, 0, accuracySize);
        
        p.pop();
      };

      const drawUI = (p: p5, state: GunState) => {
        p.push();
        p.translate(-p.width/2 + 20, -p.height/2 + 20, 0);
        
        p.fill(255, 255, 255, 200);
        p.noStroke();
        p.textSize(16);
        p.textAlign(p.LEFT);
        
        // Score and stats
        p.text(`Score: ${score}`, 0, 0);
        p.text(`Shots: ${shotsFired}`, 0, 25);
        p.text(`Targets Hit: ${targetsHit}`, 0, 50);
        p.text(`Accuracy: ${state.aimAccuracy.toFixed(0)}%`, 0, 75);
        p.text(`Ammo: ${state.ammoCount}`, 0, 100);
        
        // Status indicators
        if (state.isAiming) {
          p.fill(0, 255, 0, 200);
          p.text('🎯 AIMING', 0, 125);
        }
        
        if (state.isShooting) {
          p.fill(255, 0, 0, 200);
          p.text('🔫 SHOOTING', 0, 150);
        }
        
        if (state.reloading) {
          p.fill(255, 255, 0, 200);
          p.text('🔄 RELOADING', 0, 175);
        }
        
        // Last shot time
        if (lastShotTime > 0) {
          const timeSinceShot = Date.now() - lastShotTime;
          if (timeSinceShot < 2000) { // Show for 2 seconds
            p.fill(255, 255, 0, 200);
            p.text(`🔫 SHOT FIRED! (${(timeSinceShot / 1000).toFixed(1)}s ago)`, 0, 200);
          }
        }
        
        // Fist percentage for shooting feedback
        p.textSize(14);
        p.fill(255, 255, 255, 200);
        p.text('=== SHOOTING STATUS ===', 0, 230);
        
        // Calculate fist percentage from current hands
        let fistPercentage = 0;
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          const leftFistData = calculateFistPercentage(leftHandLandmarks);
          fistPercentage = Math.max(fistPercentage, leftFistData);
        }
        if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          const rightFistData = calculateFistPercentage(rightHandLandmarks);
          fistPercentage = Math.max(fistPercentage, rightFistData);
        }
        
        const fistColor = fistPercentage > 80 ? [0, 255, 0] : fistPercentage > 60 ? [255, 255, 0] : [255, 255, 255];
        p.fill(fistColor[0], fistColor[1], fistColor[2], 200);
        p.text(`FIST: ${fistPercentage.toFixed(0)}% (${fistPercentage > 80 ? 'SHOOT READY' : 'MAKE FIST'})`, 0, 250);
        
        // Depth information
        p.textSize(14);
        p.fill(100, 200, 255, 200);
        
        // Left hand depth
        if (handsDataRef.current.leftDepth) {
          const leftDepth = handsDataRef.current.leftDepth;
          p.text(`🤚 Left Hand:`, 0, 230);
          p.text(`   Depth: ${leftDepth.depth.toFixed(1)}`, 0, 250);
          p.text(`   Raw Z: ${leftDepth.rawZ.toFixed(3)}`, 0, 270);
          p.text(`   Scale: ${leftDepth.scale.toFixed(2)}`, 0, 290);
          
          // Depth direction indicator
          const depthDirection = leftDepth.depth > 0 ? 'CLOSER' : 'FURTHER';
          const depthColor = leftDepth.depth > 0 ? [0, 255, 0] : [255, 100, 0];
          p.fill(depthColor[0], depthColor[1], depthColor[2], 200);
          p.text(`   ${depthDirection} to camera`, 0, 310);
        }
        
        // Right hand depth
        if (handsDataRef.current.rightDepth) {
          const rightDepth = handsDataRef.current.rightDepth;
          p.fill(255, 100, 255, 200);
          p.text(`🤚 Right Hand:`, 0, 340);
          p.text(`   Depth: ${rightDepth.depth.toFixed(1)}`, 0, 360);
          p.text(`   Raw Z: ${rightDepth.rawZ.toFixed(3)}`, 0, 380);
          p.text(`   Scale: ${rightDepth.scale.toFixed(2)}`, 0, 400);
          
          // Depth direction indicator
          const depthDirection = rightDepth.depth > 0 ? 'CLOSER' : 'FURTHER';
          const depthColor = rightDepth.depth > 0 ? [0, 255, 0] : [255, 100, 0];
          p.fill(depthColor[0], depthColor[1], depthColor[2], 200);
          p.text(`   ${depthDirection} to camera`, 0, 420);
        }
        
        // Hand detection status
        p.textSize(16);
        p.fill(255, 255, 255, 200);
        p.text('=== HAND DETECTION ===', 0, 460);
        
        const leftDetected = leftHandLandmarks && leftHandLandmarks.length > 0;
        const rightDetected = rightHandLandmarks && rightHandLandmarks.length > 0;
        
        p.fill(leftDetected ? 0 : 255, leftDetected ? 255 : 0, 0, 200);
        p.text(`Left Hand: ${leftDetected ? '✅ DETECTED' : '❌ NOT DETECTED'}`, 0, 480);
        
        p.fill(rightDetected ? 0 : 255, rightDetected ? 255 : 0, 0, 200);
        p.text(`Right Hand: ${rightDetected ? '✅ DETECTED' : '❌ NOT DETECTED'}`, 0, 500);
        
        if (leftDetected && leftHandLandmarks) {
          p.fill(0, 255, 0, 200);
          p.text(`Left Landmarks: ${leftHandLandmarks.length}`, 0, 520);
        }
        
        if (rightDetected && rightHandLandmarks) {
          p.fill(0, 255, 0, 200);
          p.text(`Right Landmarks: ${rightHandLandmarks.length}`, 0, 540);
        }
        
        p.pop();
      };

      const drawDebugInfo = (p: p5, state: GunState) => {
        p.push();
        p.translate(-p.width/2 + 20, p.height/2 - 200, 0);
        
        p.fill(255, 255, 255, 150);
        p.noStroke();
        p.textSize(12);
        p.textAlign(p.LEFT);
        
        const debugInfo = [
          `Aiming: ${state.isAiming ? 'YES' : 'NO'}`,
          `Shooting: ${state.isShooting ? 'YES' : 'NO'}`,
          `Aim Direction: (${state.aimDirection.x.toFixed(2)}, ${state.aimDirection.y.toFixed(2)}, ${state.aimDirection.z.toFixed(2)})`,
          `Recoil: ${state.recoil.toFixed(2)}`,
          `Last Key: ${lastKeyPress}`,
          `Keyboard Sim: ${enableKeyboardSimulation ? 'ON' : 'OFF'}`
        ];
        
        debugInfo.forEach((info, index) => {
          p.text(info, 0, index * 20);
        });
        
        // Add hand landmark legend
        p.translate(0, 140);
        p.fill(255, 255, 255, 200);
        p.textSize(10);
        p.text('HAND LANDMARKS:', 0, 0);
        
        const landmarkNames = [
          '0: Wrist', '1: Thumb CMC', '2: Thumb MCP', '3: Thumb IP', '4: Thumb Tip',
          '5: Index MCP', '6: Index PIP', '7: Index DIP', '8: Index Tip',
          '9: Middle MCP', '10: Middle PIP', '11: Middle DIP', '12: Middle Tip',
          '13: Ring MCP', '14: Ring PIP', '15: Ring DIP', '16: Ring Tip',
          '17: Pinky MCP', '18: Pinky PIP', '19: Pinky DIP', '20: Pinky Tip'
        ];
        
        landmarkNames.forEach((name, index) => {
          const row = Math.floor(index / 2);
          const col = index % 2;
          p.text(name, col * 120, (row + 1) * 15);
        });
        
        p.translate(0, 180);
        p.fill(255, 255, 0, 200);
        p.text('VECTORS (V0-V22):', 0, 0);
        p.fill(255, 255, 255, 150);
        p.textSize(8);
        p.text('V0-V3: Thumb, V4-V7: Index, V8-V11: Middle', 0, 15);
        p.text('V12-V15: Ring, V16-V19: Pinky, V20-V22: Palm', 0, 30);
        
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
  }, [showDebugInfo, aimSensitivity, shootSensitivity, recoilRecovery]);

  // Update hands data without triggering re-renders
  useEffect(() => {
    handsDataRef.current.left = leftHand?.landmarks || null;
    handsDataRef.current.right = rightHand?.landmarks || null;
  }, [leftHand, rightHand]);

  // Keyboard simulation effect
  useEffect(() => {
    if (!enableKeyboardSimulation) return;

    const simulateKeyPress = (key: string) => {
      console.log(`⌨️ SIMULATING KEY: ${key.toUpperCase()}`);
      
      const keyDownEvent = new KeyboardEvent('keydown', {
        key: key,
        code: `Key${key.toUpperCase()}`,
        keyCode: key.charCodeAt(0),
        which: key.charCodeAt(0),
        bubbles: true,
        cancelable: true
      });

      const keyUpEvent = new KeyboardEvent('keyup', {
        key: key,
        code: `Key${key.toUpperCase()}`,
        keyCode: key.charCodeAt(0),
        which: key.charCodeAt(0),
        bubbles: true,
        cancelable: true
      });

      document.dispatchEvent(keyDownEvent);
      console.log(`⌨️ KEY DOWN: ${key.toUpperCase()} dispatched`);
      
      setTimeout(() => {
        document.dispatchEvent(keyUpEvent);
        console.log(`⌨️ KEY UP: ${key.toUpperCase()} dispatched`);
      }, 100);

      setLastKeyPress(key.toUpperCase());
    };

    // Simulate key presses based on gun state
    if (gunState.isShooting) {
      simulateKeyPress('space');
    }

    if (gunState.reloading) {
      simulateKeyPress('r');
    }

  }, [gunState, enableKeyboardSimulation]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={canvasRef} />
      
      {/* Controls Panel */}
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
        minWidth: '250px'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          🔫 Point & Shoot Controls
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            <input
              type="checkbox"
              checked={showDebugInfo}
              onChange={(e) => setShowDebugInfo(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Show Debug Info
          </label>
          
          <label style={{ display: 'block', marginBottom: '5px' }}>
            <input
              type="checkbox"
              checked={enableKeyboardSimulation}
              onChange={(e) => setEnableKeyboardSimulation(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Enable Keyboard Simulation
          </label>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc', display: 'block' }}>
            Smart Aim Sensitivity: {aimSensitivity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={aimSensitivity}
            onChange={(e) => setAimSensitivity(parseFloat(e.target.value))}
            style={{ width: '100%' }}
            aria-label="Smart aim sensitivity"
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc', display: 'block' }}>
            Shoot Sensitivity: {shootSensitivity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={shootSensitivity}
            onChange={(e) => setShootSensitivity(parseFloat(e.target.value))}
            style={{ width: '100%' }}
            aria-label="Shoot sensitivity"
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc', display: 'block' }}>
            Recoil Recovery: {recoilRecovery.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.8"
            max="0.99"
            step="0.01"
            value={recoilRecovery}
            onChange={(e) => setRecoilRecovery(parseFloat(e.target.value))}
            style={{ width: '100%' }}
            aria-label="Recoil recovery"
          />
        </div>

        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '10px', padding: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '5px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#FFD700' }}>🎮 NEW POINT & SHOOT CONTROLS:</div>
          <div>• Hands always aim (when detected)</div>
          <div>• Aiming line: wrist to pointer knuckle</div>
          <div>• Full fist = Shoot (all fingers closed)</div>
          <div>• Smoother cursor movement</div>
          <div>• Same system as Aim & Background</div>
        </div>

        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '10px' }}>
          <div>🎯 How to Play:</div>
          <div>• Show your hand = Start aiming</div>
          <div>• Point your hand = Aim cursor</div>
          <div>• Make a fist = Shoot</div>
          <div>• Hit targets to score points</div>
          <div>• Reduced jittering</div>
        </div>

        {/* Live Status Indicator */}
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '5px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '11px', marginBottom: '8px', color: '#4CAF50', fontWeight: 'bold' }}>
            🎯 LIVE STATUS
          </div>
          
          <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
            <div style={{ 
              color: gunState.isAiming ? '#00FF00' : '#666',
              fontWeight: gunState.isAiming ? 'bold' : 'normal'
            }}>
              {gunState.isAiming ? '🎯 AIMING' : '🎯 AIM: IDLE'}
            </div>
            
            <div style={{ 
              color: gunState.isShooting ? '#FF4444' : '#666',
              fontWeight: gunState.isShooting ? 'bold' : 'normal'
            }}>
              {gunState.isShooting ? '🔫 SHOOTING' : '🔫 SHOOT: IDLE'}
            </div>
            
            <div style={{ 
              color: gunState.reloading ? '#FFFF00' : '#666',
              fontWeight: gunState.reloading ? 'bold' : 'normal'
            }}>
              {gunState.reloading ? '🔄 RELOADING' : '🔄 RELOAD: IDLE'}
            </div>
            
            <div style={{ color: '#888', marginTop: '5px', fontSize: '9px' }}>
              Accuracy: {gunState.aimAccuracy.toFixed(0)}% | 
              Recoil: {gunState.recoil.toFixed(2)} |
              Ammo: {gunState.ammoCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 