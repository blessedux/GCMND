'use client';

import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import { HandData } from '@/types';

interface AimBackgroundControllerProps {
  leftHand: HandData | null;
  rightHand: HandData | null;
}

interface CameraState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  sensitivity: number;
  smoothing: number;
}

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  color: number[];
  hit: boolean;
  hitTime: number;
}



// Add new interface for mouse event simulation
interface MouseEventSimulator {
  isMouseDown: boolean;
  lastMousePosition: { x: number; y: number };
  dragThreshold: number;
  clickThreshold: number;
  lastClickTime: number;
  isDragging: boolean;
}

export default function AimBackgroundController({ leftHand, rightHand }: AimBackgroundControllerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const handsDataRef = useRef<{ 
    left: any[] | null; 
    right: any[] | null;
    leftThumbWasTouching?: boolean;
    rightThumbWasTouching?: boolean;
    leftThumbWasUp?: boolean;
    rightThumbWasUp?: boolean;
  }>({ left: null, right: null });
  
  // Add mouse event simulator state
  const mouseSimulatorRef = useRef<MouseEventSimulator>({
    isMouseDown: false,
    lastMousePosition: { x: 0, y: 0 },
    dragThreshold: 10, // pixels
    clickThreshold: 200, // milliseconds
    lastClickTime: 0,
    isDragging: false
  });
  
  // Camera state
  const [camera, setCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    sensitivity: 2.0,
    smoothing: 0.1
  });

  // Targets
  const [targets, setTargets] = useState<Target[]>([]);
  

  
  // Current gesture data for UI
  const [currentGestureData, setCurrentGestureData] = useState<any>({
    isAiming: false,
    isShooting: false,
    fistPercentage: 0
  });
  
  // Game state
  const [score, setScore] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  const [targetsHit, setTargetsHit] = useState(0);
  const [lastShotTime, setLastShotTime] = useState(0);

  // Settings
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [backgroundType, setBackgroundType] = useState<'grid' | 'stars' | 'mountains'>('grid');

  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationData, setCalibrationData] = useState({
    minY: 0.3, // Minimum Y position for hand
    maxY: 0.7, // Maximum Y position for hand
    centerY: 0.5, // Center Y position
    ySensitivity: 30.0, // Vertical sensitivity multiplier
    horizontalLock: true // Keep hand centered horizontally
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p: p5) => {
      let leftHandLandmarks: any[] | null = null;
      let rightHandLandmarks: any[] | null = null;
      let frameCount = 0;

      p.setup = () => {
        p.createCanvas(1200, 800, p.WEBGL);
        p.frameRate(60);
        p.background(0);
        
        // Initialize targets
        initializeTargets();
      };

      p.draw = () => {
        p.clear();
        
        // Update landmarks from props
        if (handsDataRef.current.left !== leftHandLandmarks) {
          leftHandLandmarks = handsDataRef.current.left;
        }
        if (handsDataRef.current.right !== rightHandLandmarks) {
          rightHandLandmarks = handsDataRef.current.right;
        }
        
        // Debug logging for hands data
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          console.log('🤚 AIM BG LEFT HAND: Landmarks received, count:', leftHandLandmarks.length);
        }
        if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          console.log('🤚 AIM BG RIGHT HAND: Landmarks received, count:', rightHandLandmarks.length);
        }

        // Set up 3D perspective
        p.perspective(p.PI / 3, p.width / p.height, 0.1, 1000);
        p.rotateX(p.PI / 12);

        // Analyze hand gestures for camera control
        const gestureData = analyzeHandGestures(p, leftHandLandmarks || [], rightHandLandmarks || []);
        
        // Update camera based on hand position
        updateCamera(p, gestureData);
        
        // Update aiming and shooting states
        // setIsAiming(gestureData.isAiming); // This line is removed as per the new_code
        // setIsShooting(gestureData.isShooting); // This line is removed as per the new_code
        
        // Log aiming and shooting status
        if (gestureData.isAiming) {
          console.log('🎯 AIM & BACKGROUND: AIMING ACTIVE - Hand detected and aiming');
        }
        
        if (gestureData.isShooting) {
          console.log('🔫 AIM & BACKGROUND: SHOOTING TRIGGERED - Fist detected');
        }
        
        // Update current gesture data for UI
        setCurrentGestureData(gestureData);
        
        // Draw background
        drawBackground(p);
        
        // Draw hands with 3D laser pointers
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          console.log('🤚 AIM BG RENDERING LEFT HAND with', leftHandLandmarks.length, 'landmarks');
          renderHand(p, leftHandLandmarks, [0, 255, 0], 'left'); // Green for left hand
          
          // Draw 3D laser pointer from hand to wall
          draw3DLaserPointer(p, leftHandLandmarks, [255, 255, 0]); // Yellow laser
          
          // Debug: Log hand position
          const wrist = leftHandLandmarks[0];
          const x = p.map(wrist.x, 0, 1, -p.width/2, p.width/2);
          const y = p.map(wrist.y, 0, 1, -p.height/2, p.height/2);
          console.log(`🤚 AIM BG LEFT HAND POSITION: (${x.toFixed(1)}, ${y.toFixed(1)}) - Raw: (${wrist.x.toFixed(3)}, ${wrist.y.toFixed(3)})`);
        }
        if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          console.log('🤚 AIM BG RENDERING RIGHT HAND with', rightHandLandmarks.length, 'landmarks');
          renderHand(p, rightHandLandmarks, [255, 100, 255], 'right'); // Magenta for right hand
          
          // Draw 3D laser pointer from hand to wall
          draw3DLaserPointer(p, rightHandLandmarks, [255, 255, 0]); // Yellow laser
          
          // Debug: Log hand position
          const wrist = rightHandLandmarks[0];
          const x = p.map(wrist.x, 0, 1, -p.width/2, p.width/2);
          const y = p.map(wrist.y, 0, 1, -p.height/2, p.height/2);
          console.log(`🤚 AIM BG RIGHT HAND POSITION: (${x.toFixed(1)}, ${y.toFixed(1)}) - Raw: (${wrist.x.toFixed(3)}, ${wrist.y.toFixed(3)})`);
        }
        
        // Draw test hand indicator if no hands detected
        if ((!leftHandLandmarks || leftHandLandmarks.length === 0) && 
            (!rightHandLandmarks || rightHandLandmarks.length === 0)) {
          drawTestHandIndicator(p);
        }
        
        // Draw targets
        drawTargets(p);
        

        

        

        

        
        // Mouse cursor removed - only red cursor shows
        
        // Draw UI
        drawUI(p, gestureData);
        
        // Draw debug info
        if (showDebugInfo) {
          drawDebugInfo(p, gestureData);
        }

        // Draw panning direction indicator for testing
        // if (gestureData.isAiming) { // This line is removed as per the new_code
        //   p.push();
        //   p.translate(0, -p.height/2 + 50, 0);
        //   
        //   // Show panning direction
        //   const panDirection = gestureData.aimX > 0.1 ? 'RIGHT' : gestureData.aimX < -0.1 ? 'LEFT' : 'CENTER';
        //   const panColor = panDirection === 'RIGHT' ? [0, 255, 0] : panDirection === 'LEFT' ? [255, 0, 0] : [255, 255, 255];
        //   
        //   p.fill(panColor[0], panColor[1], panColor[2], 255);
        //   p.textSize(24);
        //   p.textAlign(p.CENTER);
        //   p.text(`PANNING: ${panDirection} (${gestureData.aimX.toFixed(2)})`, 0, 0);
        //   
        //   // Show camera state
        //   p.translate(0, 40, 0);
        //   p.fill(255, 255, 255, 255);
        //   p.textSize(16);
        //   p.text(`Camera X: ${camera.x.toFixed(0)}, Y: ${camera.y.toFixed(0)}`, 0, 0);
        //   p.text(`Target X: ${camera.targetX.toFixed(0)}, Y: ${camera.targetY.toFixed(0)}`, 0, 20);
        //   
        //   // Show fist percentage for shooting
        //   p.translate(0, 60, 0);
        //   const fistPercentage = gestureData.fistPercentage || 0;
        //   const fistColor = fistPercentage > 80 ? [0, 255, 0] : fistPercentage > 60 ? [255, 255, 0] : [255, 255, 255];
        //   p.fill(fistColor[0], fistColor[1], fistColor[2], 255);
        //   p.text(`FIST: ${fistPercentage.toFixed(0)}% (${fistPercentage > 80 ? 'SHOOT READY' : 'MAKE FIST'})`, 0, 0);
        //   
        //   // Show cursor position for debugging
        //   p.translate(0, 30, 0);
        //   p.fill(100, 200, 255, 255);
        //   p.text(`Mouse: (${p.mouseX.toFixed(0)}, ${p.mouseY.toFixed(0)})`, 0, 0);
        //   p.text(`Hand Aim: (${(gestureData.aimX * 100).toFixed(0)}, ${(gestureData.aimY * 100).toFixed(0)})`, 0, 20);
        //   
        //   // Show mouse drag status
        //   p.translate(0, 50, 0);
        //   const dragColor = p.mouseIsPressed ? [0, 255, 0] : [255, 255, 255];
        //   p.fill(dragColor[0], dragColor[1], dragColor[2], 255);
        //   p.text(`MOUSE DRAG: ${p.mouseIsPressed ? 'ACTIVE' : 'INACTIVE'}`, 0, 0);
        //   p.text(`DRAG DELTA: (${(p.mouseX - p.pmouseX).toFixed(0)}, ${(p.mouseY - p.pmouseY).toFixed(0)})`, 0, 20);
        //   
        //   p.pop();
        // }

        frameCount++;
      };

      const initializeTargets = () => {
        const newTargets: Target[] = [];
        const colors = [
          [255, 0, 0],    // Red
          [0, 255, 0],    // Green
          [0, 0, 255],    // Blue
          [255, 255, 0],  // Yellow
          [255, 0, 255],  // Magenta
          [0, 255, 255],  // Cyan
          [255, 128, 0],  // Orange
          [128, 0, 255]   // Purple
        ];

        for (let i = 0; i < 8; i++) {
          newTargets.push({
            id: i,
            x: p.random(-2000, 2000),
            y: p.random(-1500, 1500),
            size: p.random(30, 80),
            color: colors[i % colors.length],
            hit: false,
            hitTime: 0
          });
        }
        setTargets(newTargets);
      };

      const analyzeHandGestures = (p: p5, leftLandmarks: any[], rightLandmarks: any[]): any => {
        // Check if at least one hand is present
        if ((!leftLandmarks || leftLandmarks.length < 21) && (!rightLandmarks || rightLandmarks.length < 21)) {
          return {
            aimX: 0,
            aimY: 0,
            isAiming: false,
            isShooting: false,
            handStability: 0,
            leftCenter: { x: 0, y: 0, z: 0 },
            rightCenter: { x: 0, y: 0, z: 0 }
          };
        }

        // Get hand centers (handle cases where only one hand is present)
        const leftCenter = leftLandmarks && leftLandmarks.length >= 21 ? getHandCenter(leftLandmarks) : { x: 0, y: 0, z: 0 };
        const rightCenter = rightLandmarks && rightLandmarks.length >= 21 ? getHandCenter(rightLandmarks) : { x: 0, y: 0, z: 0 };

        // Detect pointing gesture (index finger extended)
        const leftPointing = leftLandmarks && leftLandmarks.length >= 21 ? detectPointing(leftLandmarks) : false;
        const rightPointing = rightLandmarks && rightLandmarks.length >= 21 ? detectPointing(rightLandmarks) : false;

        // Detect shooting gesture (thumb touches index)
        const leftShooting = leftLandmarks && leftLandmarks.length >= 21 ? detectShooting(leftLandmarks) : false;
        const rightShooting = rightLandmarks && rightLandmarks.length >= 21 ? detectShooting(rightLandmarks) : false;

        // Detect mouse drag gesture (palm down, fingers extended)
        const leftDragging = leftLandmarks && leftLandmarks.length >= 21 ? detectDragging(leftLandmarks) : false;
        const rightDragging = rightLandmarks && rightLandmarks.length >= 21 ? detectDragging(rightLandmarks) : false;

        // Calculate aim direction from pointing hand with smart sensitivity
        let aimHand = leftPointing ? leftLandmarks : rightPointing ? rightLandmarks : null;
        let aimX = 0;
        let aimY = 0;
        let isAiming = false;
        let handStability = 0;

        // NEW SYSTEM: Always aim when hands are detected, use wrist-to-pointer-knuckle line
        if (leftLandmarks && leftLandmarks.length >= 21) {
          aimHand = leftLandmarks;
        } else if (rightLandmarks && rightLandmarks.length >= 21) {
          aimHand = rightLandmarks;
        }

        if (aimHand) {
          const wrist = aimHand[0];
          const indexKnuckle = aimHand[5]; // Pointer finger MCP (knuckle)
          
          // IMPROVED SYSTEM: Use wrist-to-pointer-knuckle line for aiming
          // This creates a more stable and intuitive aiming line
          const dx = indexKnuckle.x - wrist.x;
          const dy = indexKnuckle.y - wrist.y;
          const dz = indexKnuckle.z - wrist.z;
          
          // Normalize the aiming direction
          const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (length > 0) {
            // Use wrist-to-knuckle direction for aiming
            const fingerDirection = {
              x: dx / length,
              y: dy / length,
              z: dz / length
            };
            
            // Apply smoothing and sensitivity for more consistent movement
            const baseSensitivity = 2.0; // Increased for better responsiveness
            const smoothingFactor = 0.9; // Higher smoothing for stability
            
            // Apply exponential smoothing to reduce jittering
            aimX = fingerDirection.x * baseSensitivity * smoothingFactor;
            aimY = fingerDirection.y * baseSensitivity * smoothingFactor;
            
            // Clamp values with smoother boundaries
            aimX = p.constrain(aimX, -1, 1);
            aimY = p.constrain(aimY, -1, 1);
            
            // Always aim when hands are detected
            isAiming = true;
            
            // Calculate hand stability
            handStability = calculateHandStability(aimHand);
            
            // Handle mouse movement simulation for online games
            if (isAiming) {
              // Simulate mouse movement for online games
              // Map hand aim direction to mouse position on screen
              const mouseX = p.map(aimX, -1, 1, 0, window.innerWidth);
              const mouseY = p.map(aimY, -1, 1, 0, window.innerHeight);
              
              // Create and dispatch mouse movement event
              const mouseEvent = new MouseEvent('mousemove', {
                clientX: mouseX,
                clientY: mouseY,
                screenX: mouseX,
                screenY: mouseY,
                bubbles: true,
                cancelable: true
              });
              
              // Dispatch the event to the document
              document.dispatchEvent(mouseEvent);
              
              console.log(`🖱️ MOUSE SIMULATION: Aim (${aimX.toFixed(2)}, ${aimY.toFixed(2)}) -> Mouse (${mouseX.toFixed(0)}, ${mouseY.toFixed(0)})`);
            }
            
            console.log('🎯 AIM BG ALWAYS AIMING: Direction:', { x: aimX.toFixed(2), y: aimY.toFixed(2) }, 'Sensitivity:', baseSensitivity, 'Smoothing:', smoothingFactor);
          }
        }

        const isShooting = leftShooting || rightShooting;
        const isDragging = leftDragging || rightDragging;

        // Calculate fist percentage for UI display
        let fistPercentage = 0;
        if (leftLandmarks && leftLandmarks.length >= 21) {
          const leftFistData = calculateFistPercentage(leftLandmarks);
          fistPercentage = Math.max(fistPercentage, leftFistData);
        }
        if (rightLandmarks && rightLandmarks.length >= 21) {
          const rightFistData = calculateFistPercentage(rightLandmarks);
          fistPercentage = Math.max(fistPercentage, rightFistData);
        }

        // Debug logging
        if (leftPointing || rightPointing) {
          console.log(`🎯 AIM & BG POINTING: Left: ${leftPointing ? '✅' : '❌'} | Right: ${rightPointing ? '✅' : '❌'}`);
        }
        
        if (leftShooting || rightShooting) {
          console.log(`🔫 AIM & BG SHOOTING: Left: ${leftShooting ? '✅' : '❌'} | Right: ${rightShooting ? '✅' : '❌'}`);
        }



        // Handle mouse dragging
        if (isDragging) {
          // Calculate cursor position for dragging
          let aimHand = null;
          if (leftHandLandmarks && leftHandLandmarks.length >= 21) {
            aimHand = leftHandLandmarks;
          } else if (rightHandLandmarks && rightHandLandmarks.length >= 21) {
            aimHand = rightHandLandmarks;
          }
          
          if (aimHand) {
            const wrist = aimHand[0];
            const indexKnuckle = aimHand[5];
            const indexTip = aimHand[8];
            
            // Calculate aim direction (same as shooting)
            const baseDx = indexKnuckle.x - wrist.x;
            const baseDy = indexKnuckle.y - wrist.y;
            const baseDz = indexKnuckle.z - wrist.z;
            
            const fingerDx = indexTip.x - indexKnuckle.x;
            const fingerDy = indexTip.y - indexKnuckle.y;
            const fingerDz = indexTip.z - indexKnuckle.z;
            
            const horizontalMovement = wrist.x - 0.5;
            const horizontalEnhancement = horizontalMovement * 3.0;
            
            const enhancedDx = baseDx + fingerDx * 0.3;
            const enhancedDy = baseDy + fingerDy * 0.3 + horizontalEnhancement;
            const enhancedDz = baseDz + fingerDz * 0.3;
            
            const length = Math.sqrt(enhancedDx * enhancedDx + enhancedDy * enhancedDy + enhancedDz * enhancedDz);
            if (length > 0) {
              const normalizedX = enhancedDx / length;
              const normalizedY = enhancedDy / length;
              
              const xSensitivity = 1.5;
              const ySensitivity = 25.0;
              const smoothingFactor = 0.99;
              
              const currentX = p.mouseX;
              const currentY = p.mouseY;
              
              const rawX = p.map(normalizedX * xSensitivity, -1, 1, 0, p.width);
              const rawY = p.map(normalizedY * ySensitivity, -1, 1, 0, p.height);
              
              const smoothedX = p.lerp(currentX, rawX, smoothingFactor);
              const smoothedY = p.lerp(currentY, rawY, smoothingFactor);
              
              const centerY = p.height / 2;
              const snapThreshold = 100;
              const snapStrength = 0.95;
              const returnSpeed = 0.02;
              
              let finalY = smoothedY;
              if (Math.abs(smoothedY - centerY) < snapThreshold) {
                const distanceFromCenter = smoothedY - centerY;
                const snapDistance = distanceFromCenter * (1 - snapStrength);
                finalY = centerY + (snapDistance * returnSpeed);
              }
              
              const finalX = p.constrain(smoothedX, 0, p.width);
              finalY = p.constrain(finalY, 0, p.height);
              
              // Convert to window coordinates
              const canvasRect = canvasRef.current?.getBoundingClientRect();
              const windowX = finalX + (canvasRect?.left || 0);
              const windowY = finalY + (canvasRect?.top || 0);
              
              // SIMULATE MOUSE DRAG
              handleMouseDown(windowX, windowY);
              handleMouseMovement(windowX, windowY);
              
              console.log(`🖱️ MOUSE DRAG ACTIVE at window position: (${windowX.toFixed(0)}, ${windowY.toFixed(0)})`);
            }
          }
        } else {
          // Release mouse if not dragging
          const simulator = mouseSimulatorRef.current;
          if (simulator.isMouseDown && !isShooting) {
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            const windowX = p.mouseX + (canvasRect?.left || 0);
            const windowY = p.mouseY + (canvasRect?.top || 0);
            handleMouseUp(windowX, windowY);
          }
        }

        // Handle shooting and mouse events
        if (isShooting && Date.now() - lastShotTime > 200) {
          setLastShotTime(Date.now());
          setShotsFired(prev => prev + 1);
          
          // Calculate cursor position for mouse events
          let aimHand = null;
          if (leftHandLandmarks && leftHandLandmarks.length >= 21) {
            aimHand = leftHandLandmarks;
          } else if (rightHandLandmarks && rightHandLandmarks.length >= 21) {
            aimHand = rightHandLandmarks;
          }
          
          if (aimHand) {
            const wrist = aimHand[0];
            const indexKnuckle = aimHand[5];
            const indexTip = aimHand[8];
            
            // Calculate base aim direction (wrist to knuckle)
            const baseDx = indexKnuckle.x - wrist.x;
            const baseDy = indexKnuckle.y - wrist.y;
            const baseDz = indexKnuckle.z - wrist.z;
            
            // Calculate finger direction (knuckle to tip)
            const fingerDx = indexTip.x - indexKnuckle.x;
            const fingerDy = indexTip.y - indexKnuckle.y;
            const fingerDz = indexTip.z - indexKnuckle.z;
            
            // ENHANCED ANGLE CALCULATION
            const horizontalMovement = wrist.x - 0.5;
            const horizontalEnhancement = horizontalMovement * 3.0;
            
            // Combine base direction with enhanced angle
            const enhancedDx = baseDx + fingerDx * 0.3;
            const enhancedDy = baseDy + fingerDy * 0.3 + horizontalEnhancement;
            const enhancedDz = baseDz + fingerDz * 0.3;
            
            // Normalize the enhanced direction
            const length = Math.sqrt(enhancedDx * enhancedDx + enhancedDy * enhancedDy + enhancedDz * enhancedDz);
            if (length > 0) {
              const normalizedX = enhancedDx / length;
              const normalizedY = enhancedDy / length;
              const normalizedZ = enhancedDz / length;
              
              // Apply sensitivity and smoothing
              const xSensitivity = 1.5;
              const ySensitivity = 25.0;
              const smoothingFactor = 0.99;
              
              const currentX = p.mouseX;
              const currentY = p.mouseY;
              
              // Map to screen coordinates
              const rawX = p.map(normalizedX * xSensitivity, -1, 1, 0, p.width);
              const rawY = p.map(normalizedY * ySensitivity, -1, 1, 0, p.height);
              
              const smoothedX = p.lerp(currentX, rawX, smoothingFactor);
              const smoothedY = p.lerp(currentY, rawY, smoothingFactor);
              
              // Magnetic snapping
              const centerY = p.height / 2;
              const snapThreshold = 100;
              const snapStrength = 0.95;
              const returnSpeed = 0.02;
              
              let finalY = smoothedY;
              if (Math.abs(smoothedY - centerY) < snapThreshold) {
                const distanceFromCenter = smoothedY - centerY;
                const snapDistance = distanceFromCenter * (1 - snapStrength);
                finalY = centerY + (snapDistance * returnSpeed);
              }
              
              // Clamp to screen boundaries
              const finalX = p.constrain(smoothedX, 0, p.width);
              finalY = p.constrain(finalY, 0, p.height);
              
              // Convert to window coordinates (account for canvas position)
              const canvasRect = canvasRef.current?.getBoundingClientRect();
              const windowX = finalX + (canvasRect?.left || 0);
              const windowY = finalY + (canvasRect?.top || 0);
              
              // SIMULATE MOUSE CLICK EVENT
              handleMouseDown(windowX, windowY);
              handleMouseUp(windowX, windowY);
              
              console.log(`🔫 MOUSE CLICK SIMULATED at window position: (${windowX.toFixed(0)}, ${windowY.toFixed(0)})`);
            }
          }
          
          // Check for hits at screen center
          checkForHits(p);
        }

        return {
          aimX,
          aimY,
          isAiming,
          isShooting,
          isDragging,
          handStability,
          leftCenter,
          rightCenter,
          fistPercentage
        };
      };

      const getHandCenter = (landmarks: any[]): { x: number; y: number; z: number } => {
        if (!landmarks || landmarks.length < 21) return { x: 0, y: 0, z: 0 };
        
        const wrist = landmarks[0];
        const indexBase = landmarks[5];
        const middleBase = landmarks[9];
        const ringBase = landmarks[13];
        const pinkyBase = landmarks[17];
        
        const centerX = (wrist.x + indexBase.x + middleBase.x + ringBase.x + pinkyBase.x) / 5;
        const centerY = (wrist.y + indexBase.y + middleBase.y + ringBase.y + pinkyBase.y) / 5;
        const centerZ = (wrist.z + indexBase.z + middleBase.z + ringBase.z + pinkyBase.z) / 5;
        
        return { x: centerX, y: centerY, z: centerZ };
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
          console.log(`🎯 AIM BG NEW AIMING DETECTION: Pointer: ${indexExtended ? '✅' : '❌'}, Middle: ${middleClosed ? '✅' : '❌'}, Ring: ${ringClosed ? '✅' : '❌'}, Pinky: ${pinkyClosed ? '✅' : '❌'}, Thumb Up: ${thumbUp ? '✅' : '❌'}, Thumb Direction: ${isThumbPointingUp ? '✅' : '❌'}`);
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
        
        // More lenient thresholds for fist detection
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
          console.log(`🔫 AIM BG SHOOTING DETECTION: Full fist detected: ✅ (Fist %: ${fistPercentage.toFixed(0)}%, Thumb: ${thumbClosed ? '✅' : '❌'}, Index: ${indexClosed ? '✅' : '❌'}, Middle: ${middleClosed ? '✅' : '❌'}, Ring: ${ringClosed ? '✅' : '❌'}, Pinky: ${pinkyClosed ? '✅' : '❌'})`);
        } else if (fistPercentage > 60) {
          // Log when close to fist but not quite there
          console.log(`🔫 AIM BG FIST PROGRESS: ${fistPercentage.toFixed(0)}% fist (Thumb: ${thumbExtension.toFixed(3)}, Index: ${indexExtension.toFixed(3)}, Middle: ${middleExtension.toFixed(3)}, Ring: ${ringExtension.toFixed(3)}, Pinky: ${pinkyExtension.toFixed(3)})`);
        }
        
        return shooting;
      };

      const detectDragging = (landmarks: any[]): boolean => {
        if (!landmarks || landmarks.length < 21) return false;
        
        // Detect palm down gesture (fingers extended, palm facing down)
        const wrist = landmarks[0];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        
        // Get finger base landmarks (MCP joints)
        const indexMCP = landmarks[5];
        const middleMCP = landmarks[9];
        const ringMCP = landmarks[13];
        const pinkyMCP = landmarks[17];
        
        // Calculate finger extensions
        const indexExtension = calculateDistance(indexTip, indexMCP);
        const middleExtension = calculateDistance(middleTip, middleMCP);
        const ringExtension = calculateDistance(ringTip, ringMCP);
        const pinkyExtension = calculateDistance(pinkyTip, pinkyMCP);
        
        // All fingers should be extended for dragging
        const indexExtended = indexExtension > 0.12;
        const middleExtended = middleExtension > 0.12;
        const ringExtended = ringExtension > 0.12;
        const pinkyExtended = pinkyExtension > 0.12;
        
        // Check if palm is facing down (wrist Y > finger tips Y)
        const palmDown = wrist.y > (indexTip.y + middleTip.y + ringTip.y + pinkyTip.y) / 4;
        
        const isDragging = indexExtended && middleExtended && ringExtended && pinkyExtended && palmDown;
        
        // Log dragging detection for debugging
        if (isDragging) {
          console.log(`🖱️ DRAG GESTURE DETECTED: Palm down with extended fingers`);
        }
        
        return isDragging;
      };

      const calculateDistance = (point1: any, point2: any): number => {
        if (!point1 || !point2) return 0;
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const dz = point1.z - point2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };

      const calculateHandStability = (landmarks: any[]): number => {
        if (!landmarks || landmarks.length < 21) return 0;
        
        const wrist = landmarks[0];
        const indexTip = landmarks[8];
        
        const distance = calculateDistance(wrist, indexTip);
        const stability = Math.max(0, 1 - Math.abs(distance - 0.15) / 0.1);
        
        return Math.min(1, stability);
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

      const updateCamera = (p: p5, gestureData: any) => {
        // FOCUS ON CURSOR POSITIONING ONLY
        // Remove background movement, focus on precise cursor control
        
        if (!gestureData.isAiming) return;
        
        // FIXED HAND POSITION SYSTEM
        // Keep wrist centered horizontally, use horizontal movement to enhance angle
        
        // Get hand landmarks for enhanced angle calculation
        let aimHand = null;
        if (leftHandLandmarks && leftHandLandmarks.length >= 21) {
          aimHand = leftHandLandmarks;
        } else if (rightHandLandmarks && rightHandLandmarks.length >= 21) {
          aimHand = rightHandLandmarks;
        }
        
        if (!aimHand) return;
        
        const wrist = aimHand[0];
        const indexKnuckle = aimHand[5];
        const indexTip = aimHand[8];
        
        // Calculate base aim direction (wrist to knuckle)
        const baseDx = indexKnuckle.x - wrist.x;
        const baseDy = indexKnuckle.y - wrist.y;
        const baseDz = indexKnuckle.z - wrist.z;
        
        // Calculate finger direction (knuckle to tip)
        const fingerDx = indexTip.x - indexKnuckle.x;
        const fingerDy = indexTip.y - indexKnuckle.y;
        const fingerDz = indexTip.z - indexKnuckle.z;
        
        // ENHANCED ANGLE CALCULATION WITH CALIBRATION
        // Keep hand centered horizontally, use vertical movement for aiming
        const horizontalMovement = wrist.x - 0.5; // Distance from center (0.5 is center)
        
        // CALIBRATED VERTICAL AIMING
        // Map hand Y position to calibrated range
        const normalizedHandY = p.map(wrist.y, calibrationData.minY, calibrationData.maxY, 0, 1);
        const clampedHandY = p.constrain(normalizedHandY, 0, 1);
        
        // Calculate vertical aim direction based on calibrated hand position
        const verticalAimDirection = (clampedHandY - 0.5) * 2; // -1 to 1 range
        
        // Combine base direction with calibrated vertical aiming
        const enhancedDx = baseDx + fingerDx * 0.3; // 30% finger influence
        const enhancedDy = verticalAimDirection; // Use calibrated vertical direction
        const enhancedDz = baseDz + fingerDz * 0.3;
        
        // Normalize the enhanced direction
        const length = Math.sqrt(enhancedDx * enhancedDx + enhancedDy * enhancedDy + enhancedDz * enhancedDz);
        if (length > 0) {
          const normalizedX = enhancedDx / length;
          const normalizedY = enhancedDy / length;
          const normalizedZ = enhancedDz / length;
          
          // Apply calibrated sensitivity
          const xSensitivity = 1.5; // Perfect X-axis sensitivity
          const ySensitivity = calibrationData.ySensitivity; // Calibrated Y-axis sensitivity
          
          // Apply extreme smoothing to eliminate jittering
          const smoothingFactor = 0.99; // Ultra-high smoothing for zero jitter
          
          // Get current cursor position for smoothing
          const currentX = p.mouseX;
          const currentY = p.mouseY;
          
          // Map enhanced aim direction to screen coordinates
          const rawX = p.map(normalizedX * xSensitivity, -1, 1, 0, p.width);
          const rawY = p.map(normalizedY * ySensitivity, -1, 1, 0, p.height);
          
          // Apply extreme smoothing to reduce jittering
          const smoothedX = p.lerp(currentX, rawX, smoothingFactor);
          const smoothedY = p.lerp(currentY, rawY, smoothingFactor);
          
          // MAGNETIC SNAPPING TO VERTICAL CENTER
          const centerY = p.height / 2;
          const snapThreshold = 100; // Larger threshold for stronger snapping
          const snapStrength = 0.95; // Much stronger snap to center
          const returnSpeed = 0.02; // Very slow return to center
          
          let finalY = smoothedY;
          if (Math.abs(smoothedY - centerY) < snapThreshold) {
            // Strong snap towards center with very slow movement
            const distanceFromCenter = smoothedY - centerY;
            const snapDistance = distanceFromCenter * (1 - snapStrength);
            finalY = centerY + (snapDistance * returnSpeed); // Very slow return
          }
          
          // Clamp to screen boundaries
          const finalX = p.constrain(smoothedX, 0, p.width);
          finalY = p.constrain(finalY, 0, p.height);
          
          // Update camera to center on cursor position (minimal movement)
          const newTargetX = (finalX - p.width / 2) * 0.05; // Very minimal background movement
          const newTargetY = (finalY - p.height / 2) * 0.05;
          
          setCamera(prev => ({
            ...prev,
            targetX: newTargetX,
            targetY: newTargetY
          }));
          
          // Convert to window coordinates for mouse events
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          const windowX = finalX + (canvasRect?.left || 0);
          const windowY = finalY + (canvasRect?.top || 0);
          
          // SIMULATE CONTINUOUS MOUSE MOVEMENT
          handleMouseMovement(windowX, windowY);
          
          console.log('🎯 CALIBRATED AIMING: Hand Y:', wrist.y.toFixed(3), 'Normalized:', clampedHandY.toFixed(3), 'Vertical Aim:', verticalAimDirection.toFixed(3), 'Cursor:', { x: finalX.toFixed(0), y: finalY.toFixed(0) }, 'Window:', { x: windowX.toFixed(0), y: windowY.toFixed(0) }, 'Sensitivity:', { x: xSensitivity, y: ySensitivity });
        }
      };





      const draw3DLaserPointer = (p: p5, landmarks: any[], color: number[]) => {
        if (!landmarks || landmarks.length < 21) return;
        
        // Get hand landmarks for 3D laser calculation
        const wrist = landmarks[0];
        const indexKnuckle = landmarks[5]; // Pointer finger MCP (knuckle)
        const indexTip = landmarks[8]; // Pointer finger tip
        
        // Calculate 3D direction vector from wrist to index tip (actual pointing direction)
        const directionX = indexTip.x - wrist.x;
        const directionY = indexTip.y - wrist.y;
        const directionZ = indexTip.z - wrist.z;
        
        // Normalize the direction vector
        const length = Math.sqrt(directionX * directionX + directionY * directionY + directionZ * directionZ);
        if (length === 0) return;
        
        const normalizedX = directionX / length;
        const normalizedY = directionY / length;
        const normalizedZ = directionZ / length;
        
        // Convert hand position to 3D world coordinates (NO MIRRORING)
        const handX = p.map(wrist.x, 0, 1, -p.width/2, p.width/2);
        const handY = p.map(wrist.y, 0, 1, -p.height/2, p.height/2);
        const handZ = p.map(wrist.z, 0, 1, -200, 200); // Map Z to reasonable depth
        
        // Wall is 10 meters (1000 units) away from hand
        const wallDistance = 1000;
        
        // Calculate intersection point with wall
        const wallZ = handZ - wallDistance; // Wall is behind the hand
        const t = (wallZ - handZ) / normalizedZ; // Parameter for line equation
        
        const wallX = handX + normalizedX * t;
        const wallY = handY + normalizedY * t;
        
        // Draw the gun barrel (from wrist to knuckle)
        p.push();
        p.stroke(100, 100, 100, 255); // Dark gray gun barrel
        p.strokeWeight(12); // Thick gun barrel
        p.line(handX, handY, handZ, handX + normalizedX * 50, handY + normalizedY * 50, handZ + normalizedZ * 50);
        p.pop();
        
        // Draw the laser beam from gun barrel to wall (10 meters long)
        p.push();
        p.stroke(color[0], color[1], color[2], 255);
        p.strokeWeight(6); // Bright laser beam
        p.line(handX + normalizedX * 50, handY + normalizedY * 50, handZ + normalizedZ * 50, wallX, wallY, wallZ);
        
        // Draw laser glow effect
        p.stroke(color[0], color[1], color[2], 100);
        p.strokeWeight(12);
        p.line(handX + normalizedX * 50, handY + normalizedY * 50, handZ + normalizedZ * 50, wallX, wallY, wallZ);
        p.pop();
        
        // Draw gun handle at wrist
        p.push();
        p.translate(handX, handY, handZ);
        p.fill(50, 50, 50, 255); // Dark gun handle
        p.noStroke();
        p.box(20, 30, 15); // Gun handle
        p.pop();
        
        // Draw laser impact point on wall (smaller and less prominent)
        p.push();
        p.translate(wallX, wallY, wallZ);
        p.fill(color[0], color[1], color[2], 100);
        p.noStroke();
        p.sphere(8); // Smaller impact point
        
        // Draw small impact ring
        p.noFill();
        p.stroke(color[0], color[1], color[2], 80);
        p.strokeWeight(1);
        p.circle(0, 0, 20);
        p.pop();
        
        // Draw visible cursor at laser intersection point
        p.push();
        p.translate(wallX, wallY, wallZ);
        
        // Draw cursor glow
        p.fill(255, 0, 0, 150);
        p.noStroke();
        p.circle(0, 0, 30);
        
        // Draw cursor center
        p.fill(255, 0, 0, 255);
        p.circle(0, 0, 15);
        
        // Draw bright center
        p.fill(255, 255, 255, 255);
        p.circle(0, 0, 6);
        
        // Draw crosshair
        p.stroke(255, 255, 255, 255);
        p.strokeWeight(2);
        p.noFill();
        p.line(-12, 0, 0, 12, 0, 0);
        p.line(0, -12, 0, 0, 12, 0);
        
        p.pop();
        
        // Convert 3D intersection to 2D screen coordinates for mouse events
        const screenX = p.map(wallX, -p.width/2, p.width/2, 0, p.width);
        const screenY = p.map(wallY, -p.height/2, p.height/2, 0, p.height);
        
        // Update mouse cursor position based on laser intersection
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        const windowX = screenX + (canvasRect?.left || 0);
        const windowY = screenY + (canvasRect?.top || 0);
        
        // Simulate mouse movement to laser intersection point
        handleMouseMovement(windowX, windowY);
        
        console.log(`🎯 3D LASER: Hand (${handX.toFixed(0)}, ${handY.toFixed(0)}, ${handZ.toFixed(0)}) -> Wall (${wallX.toFixed(0)}, ${wallY.toFixed(0)}, ${wallZ.toFixed(0)}) -> Screen (${screenX.toFixed(0)}, ${screenY.toFixed(0)})`);
      };

      const renderHand = (p: p5, landmarks: any[], color: number[], handType: string) => {
        if (!landmarks || landmarks.length < 21) return;

        p.push();
        
        // Set up lighting
        p.ambientLight(60, 60, 60);
        p.directionalLight(255, 255, 255, 0, 0, -1);
        
        // SIMPLIFIED: No depth scaling or perspective changes to prevent mirroring
        // Use consistent coordinate mapping for all landmarks

        // Draw VECTORS (connections) - static hand skeleton
        p.stroke(color[0], color[1], color[2], 150);
        p.strokeWeight(3);
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
            // CONSISTENT: Direct mapping with NO depth scaling
            const x1 = p.map(landmarks[start].x, 0, 1, -p.width/2, p.width/2);
            const y1 = p.map(landmarks[start].y, 0, 1, -p.height/2, p.height/2);
            const z1 = 0; // Static depth for vectors
            
            const x2 = p.map(landmarks[end].x, 0, 1, -p.width/2, p.width/2);
            const y2 = p.map(landmarks[end].y, 0, 1, -p.height/2, p.height/2);
            const z2 = 0; // Static depth for vectors

            p.line(x1, y1, z1, x2, y2, z2);
            
            // Draw vector number at midpoint
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const midZ = (z1 + z2) / 2;
            
            p.push();
            p.translate(midX, midY, midZ);
            
            p.fill(255, 255, 0, 255); // Yellow text
            p.stroke(0, 0, 0, 255); // Black outline
            p.strokeWeight(1);
            p.textSize(8);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(`V${i}`, 0, 0);
            
            p.pop();
          }
        }

        // Render DOTS (landmarks) - consistent positioning
        for (let i = 0; i < landmarks.length; i++) {
          const landmark = landmarks[i];
          if (!landmark) continue;

          // CONSISTENT: Direct mapping with NO depth scaling
          const x = p.map(landmark.x, 0, 1, -p.width/2, p.width/2);
          const y = p.map(landmark.y, 0, 1, -p.height/2, p.height/2);
          const z = 0; // Static depth for all landmarks

          p.push();
          p.translate(x, y, z);
          
          let size = 6;
          if (i === 0) size = 10; // Wrist
          else if (i % 4 === 0) size = 8; // Finger tips

          p.fill(color[0], color[1], color[2], 255);
          p.noStroke();
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

      const drawTestHandIndicator = (p: p5) => {
        p.push();
        
        // Draw a simple test indicator to show the system is working
        p.translate(0, 0, 0);
        p.fill(255, 255, 0, 200); // Yellow
        p.noStroke();
        p.sphere(20);
        
        // Draw text
        p.fill(255, 255, 255, 255);
        p.textSize(16);
        p.textAlign(p.CENTER);
        p.text('No hands detected', 0, 40);
        
        p.pop();
      };

      const drawBackground = (p: p5) => {
        p.push();
        
        // Clean background - no grid, no horizon
        p.background(20, 30, 50); // Dark blue background
        
        // Draw the 3D wall at 10 meters (1000 units) distance
        p.push();
        p.translate(0, 0, -1000); // Wall at 10 meters distance
        
        // Wall dimensions (covers the entire viewport)
        const wallWidth = 2000;
        const wallHeight = 1500;
        
        // Draw wall with solid fill and border
        p.fill(60, 70, 90); // Lighter wall color for visibility
        p.stroke(100, 110, 130); // Bright border
        p.strokeWeight(3);
        
        // Draw wall outline
        p.rect(-wallWidth/2, -wallHeight/2, wallWidth, wallHeight);
        
        // Draw prominent grid lines on wall for precise aiming reference
        p.stroke(120, 130, 150, 200); // Very visible grid lines
        p.strokeWeight(2);
        
        // Vertical lines (every 100 units for clarity)
        for (let x = -wallWidth/2; x <= wallWidth/2; x += 100) {
          p.line(x, -wallHeight/2, x, wallHeight/2);
        }
        
        // Horizontal lines (every 100 units for clarity)
        for (let y = -wallHeight/2; y <= wallHeight/2; y += 100) {
          p.line(-wallWidth/2, y, wallWidth/2, y);
        }
        
        // Draw center crosshair on wall
        p.stroke(255, 255, 255, 200);
        p.strokeWeight(3);
        p.line(-30, 0, 0, 30, 0, 0);
        p.line(0, -30, 0, 0, 30, 0);
        
        // Draw center dot
        p.fill(255, 255, 255, 200);
        p.noStroke();
        p.circle(0, 0, 8);
        
        // Draw distance indicator
        p.fill(255, 255, 255, 200);
        p.noStroke();
        p.textSize(24);
        p.textAlign(p.CENTER);
        p.text('10 METERS', 0, -wallHeight/2 + 40);
        
        // Draw aiming instructions
        p.textSize(16);
        p.text('AIM HERE', 0, wallHeight/2 - 40);
        
        p.pop();
        
        p.pop();
      };

      const drawTargets = (p: p5) => {
        p.push();
        p.translate(-camera.x, -camera.y);
        
        targets.forEach(target => {
          p.push();
          p.translate(target.x, target.y);
          
          if (target.hit) {
            // Explosion effect
            const timeSinceHit = Date.now() - target.hitTime;
            const explosionProgress = Math.min(timeSinceHit / 1000, 1);
            
            if (explosionProgress < 1) {
              // Explosion particles
              const particleCount = 15;
              const explosionRadius = target.size * (1 + explosionProgress * 2);
              
              for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * p.TWO_PI;
                const radius = explosionRadius * (0.5 + Math.random() * 0.5);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                const alpha = 255 * (1 - explosionProgress);
                p.fill(255, 100 + explosionProgress * 155, 0, alpha);
                p.noStroke();
                p.circle(x, y, 3 + explosionProgress * 2);
              }
            }
          } else {
            // Active target
            p.fill(target.color[0], target.color[1], target.color[2], 200);
            p.stroke(255, 255, 255, 150);
            p.strokeWeight(2);
            p.circle(0, 0, target.size);
            
            // Target rings
            p.noFill();
            p.stroke(255, 255, 255, 100);
            p.strokeWeight(1);
            p.circle(0, 0, target.size * 1.5);
            p.circle(0, 0, target.size * 2);
            
            // Target center
            p.fill(255, 0, 0, 200);
            p.noStroke();
            p.circle(0, 0, target.size * 0.3);
          }
          
          p.pop();
        });
        
        p.pop();
      };



      const checkForHits = (p: p5) => {
        // Check if any target is at screen center
        targets.forEach((target, index) => {
          if (target.hit) return;
          
          // Calculate target position relative to camera
          const targetScreenX = target.x + camera.x;
          const targetScreenY = target.y + camera.y;
          
          // Check if target is near screen center
          const centerX = p.width / 2;
          const centerY = p.height / 2;
          const hitRadius = target.size * 0.5;
          
          const distance = p.dist(targetScreenX, targetScreenY, centerX, centerY);
          
          if (distance < hitRadius) {
            const newTargets = [...targets];
            newTargets[index] = {
              ...target,
              hit: true,
              hitTime: Date.now()
            };
            setTargets(newTargets);
            setScore(prev => prev + 10);
            
            console.log(`🎯 TARGET HIT! Distance: ${distance.toFixed(1)}, Score: ${score + 10}`);
          }
        });
      };

      const drawUI = (p: p5, gestureData: any) => {
        p.push();
        
        p.fill(255, 255, 255, 200);
        p.noStroke();
        p.textSize(16);
        p.textAlign(p.LEFT);
        
        // Score and stats
        p.text(`Score: ${score}`, 20, 30);
        p.text(`Shots: ${shotsFired}`, 20, 55);
        p.text(`Accuracy: ${shotsFired > 0 ? ((score / shotsFired) * 10).toFixed(1) : 0}%`, 20, 80);
        
        // Camera position
        p.text(`Camera: (${camera.x.toFixed(0)}, ${camera.y.toFixed(0)})`, 20, 105);
        
        // Status indicators
        if (gestureData.isAiming) {
          p.fill(0, 255, 0, 200);
          p.text('🎯 AIMING', 20, 130);
        }
        
        if (gestureData.isShooting) {
          p.fill(255, 0, 0, 200);
          p.text('🔫 SHOOTING', 20, 155);
        }
        
        p.pop();
      };

      // Mouse Event Simulation Functions
      const simulateMouseEvent = (type: 'mousemove' | 'mousedown' | 'mouseup' | 'click', x: number, y: number, button: number = 0) => {
        const event = new MouseEvent(type, {
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          button: button,
          buttons: type === 'mousedown' ? 1 : 0,
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        // Dispatch to document and active element
        document.dispatchEvent(event);
        
        // Also dispatch to the element under the cursor
        const elementUnderCursor = document.elementFromPoint(x, y);
        if (elementUnderCursor) {
          elementUnderCursor.dispatchEvent(event);
        }
        
        console.log(`🖱️ MOUSE EVENT: ${type} at (${x}, ${y})`);
      };

      const handleMouseMovement = (x: number, y: number) => {
        const simulator = mouseSimulatorRef.current;
        
        // Always dispatch mousemove
        simulateMouseEvent('mousemove', x, y);
        
        // Handle dragging if mouse is down
        if (simulator.isMouseDown) {
          const distance = Math.sqrt(
            Math.pow(x - simulator.lastMousePosition.x, 2) + 
            Math.pow(y - simulator.lastMousePosition.y, 2)
          );
          
          if (distance > simulator.dragThreshold) {
            simulator.isDragging = true;
            console.log(`🖱️ DRAGGING: Distance ${distance.toFixed(1)}px`);
          }
        }
        
        simulator.lastMousePosition = { x, y };
      };

      const handleMouseDown = (x: number, y: number) => {
        const simulator = mouseSimulatorRef.current;
        
        if (!simulator.isMouseDown) {
          simulator.isMouseDown = true;
          simulator.isDragging = false;
          simulator.lastMousePosition = { x, y };
          
          simulateMouseEvent('mousedown', x, y);
          console.log(`🖱️ MOUSE DOWN: at (${x}, ${y})`);
        }
      };

      const handleMouseUp = (x: number, y: number) => {
        const simulator = mouseSimulatorRef.current;
        
        if (simulator.isMouseDown) {
          simulateMouseEvent('mouseup', x, y);
          
          // If not dragging, it's a click
          if (!simulator.isDragging) {
            const timeSinceLastClick = Date.now() - simulator.lastClickTime;
            if (timeSinceLastClick > simulator.clickThreshold) {
              simulateMouseEvent('click', x, y);
              console.log(`🖱️ CLICK: at (${x}, ${y})`);
            }
          } else {
            console.log(`🖱️ DRAG END: at (${x}, ${y})`);
          }
          
          simulator.isMouseDown = false;
          simulator.isDragging = false;
          simulator.lastClickTime = Date.now();
        }
      };

      const drawDebugInfo = (p: p5, gestureData: any) => {
        p.push();
        p.translate(20, p.height - 150);
        
        p.fill(255, 255, 255, 150);
        p.noStroke();
        p.textSize(12);
        p.textAlign(p.LEFT);
        
        const simulator = mouseSimulatorRef.current;
        const debugInfo = [
          `Aim X: ${gestureData.aimX.toFixed(2)}`,
          `Aim Y: ${gestureData.aimY.toFixed(2)}`,
          `Aiming: ${gestureData.isAiming ? 'YES' : 'NO'}`,
          `Shooting: ${gestureData.isShooting ? 'YES' : 'NO'}`,
          `Stability: ${(gestureData.handStability * 100).toFixed(0)}%`,
          `Targets Hit: ${targets.filter(t => t.hit).length}/${targets.length}`,
          `Mouse: ${simulator.isMouseDown ? 'DOWN' : 'UP'}`,
          `Dragging: ${simulator.isDragging ? 'YES' : 'NO'}`
        ];
        
        debugInfo.forEach((info, index) => {
          p.text(info, 0, index * 18);
        });
        
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
  }, [showDebugInfo, showCrosshair, backgroundType, camera.sensitivity, camera.smoothing, lastShotTime]);

  // Update hands data without triggering re-renders
  useEffect(() => {
    handsDataRef.current.left = leftHand?.landmarks || null;
    handsDataRef.current.right = rightHand?.landmarks || null;
  }, [leftHand, rightHand]);

  // Update aiming and shooting states
  useEffect(() => {
    if (p5InstanceRef.current) {
      // This will be updated in the p5 draw loop
    }
  }, []);

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
        minWidth: '280px'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          🎯 Aim & Background Controls
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
              checked={showCrosshair}
              onChange={(e) => setShowCrosshair(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Show Crosshair
          </label>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc', display: 'block' }}>
            Camera Sensitivity: {camera.sensitivity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={camera.sensitivity}
            onChange={(e) => setCamera(prev => ({ ...prev, sensitivity: parseFloat(e.target.value) }))}
            style={{ width: '100%' }}
            aria-label="Camera sensitivity"
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc', display: 'block' }}>
            Vertical Sensitivity: {calibrationData.ySensitivity.toFixed(1)}
          </label>
          <input
            type="range"
            min="10.0"
            max="50.0"
            step="1.0"
            value={calibrationData.ySensitivity}
            onChange={(e) => setCalibrationData(prev => ({ ...prev, ySensitivity: parseFloat(e.target.value) }))}
            style={{ width: '100%' }}
            aria-label="Vertical sensitivity"
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc', display: 'block' }}>
            Hand Y Range: {calibrationData.minY.toFixed(2)} - {calibrationData.maxY.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={calibrationData.maxY - calibrationData.minY}
            onChange={(e) => {
              const range = parseFloat(e.target.value);
              const center = (calibrationData.minY + calibrationData.maxY) / 2;
              setCalibrationData(prev => ({
                ...prev,
                minY: center - range / 2,
                maxY: center + range / 2
              }));
            }}
            style={{ width: '100%' }}
            aria-label="Hand Y range"
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <button
            onClick={() => setIsCalibrating(!isCalibrating)}
            style={{
              width: '100%',
              padding: '8px',
              background: isCalibrating ? '#ff4444' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {isCalibrating ? 'Stop Calibration' : 'Start Calibration'}
          </button>
        </div>

        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '10px' }}>
          <div>🎯 3D Gun & Laser System:</div>
          <div>• Gun barrel from wrist to knuckle</div>
          <div>• Laser follows your actual pointing direction</div>
          <div>• No mirroring - natural hand movement</div>
          <div>• Laser extends 10 meters to wall</div>
          <div>• Visible red cursor at laser impact</div>
          <div>• Realistic 3D physics simulation</div>
          <div>• Precise intersection calculation</div>
          <div>• Full fist = Mouse Click</div>
          <div>• Palm down + extended fingers = Drag</div>
          <div>• Real mouse events sent to browser</div>
          <div>• Works with any web app/game</div>
          <div>• Grid wall for precise aiming</div>
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
              color: currentGestureData?.isAiming ? '#00FF00' : '#666',
              fontWeight: currentGestureData?.isAiming ? 'bold' : 'normal'
            }}>
              {currentGestureData?.isAiming ? '🎯 AIMING' : '🎯 AIM: IDLE'}
            </div>
            
            <div style={{ 
              color: currentGestureData?.isShooting ? '#FF4444' : '#666',
              fontWeight: currentGestureData?.isShooting ? 'bold' : 'normal'
            }}>
              {currentGestureData?.isShooting ? '🔫 SHOOTING' : '🔫 SHOOT: IDLE'}
            </div>
            
            <div style={{ 
              color: currentGestureData?.isDragging ? '#FF8800' : '#666',
              fontWeight: currentGestureData?.isDragging ? 'bold' : 'normal'
            }}>
              {currentGestureData?.isDragging ? '🖱️ DRAGGING' : '🖱️ DRAG: IDLE'}
            </div>
            
            <div style={{ color: '#888', marginTop: '5px', fontSize: '9px' }}>
              Shots: {shotsFired} | 
              Fist: {currentGestureData?.fistPercentage?.toFixed(0) || 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 