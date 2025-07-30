'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MultiHandData, HandData } from '@/types';

interface Eth3DLogoProps {
  multiHandData: MultiHandData;
}

interface GestureState {
  isPinching: boolean;
  isGrabbing: boolean;
  isRotating: boolean;
  isSelecting: boolean;
  pinchDistance: number;
  handPosition: THREE.Vector3;
  previousHandPosition: THREE.Vector3;
  leftPinchPoint: THREE.Vector3 | null;
  rightPinchPoint: THREE.Vector3 | null;
  leftWristPosition: THREE.Vector3 | null;
  rightWristPosition: THREE.Vector3 | null;
}

interface Diamond {
  id: string;
  group: THREE.Group;
  position: THREE.Vector3;
  isSelected: boolean;
  createdAt: number;
}

export default function Eth3DLogo({ multiHandData }: Eth3DLogoProps) {

  
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const logoGroupRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  // Diamond management
  const diamondsRef = useRef<Diamond[]>([]);
  const ethModelRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  // Mouse and gesture controls
  const isMouseDownRef = useRef(false);
  const isPinchingRef = useRef(false);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const pinchPositionRef = useRef({ x: 0, y: 0 });
  const previousPinchPositionRef = useRef({ x: 0, y: 0 });
  
  // Gesture state
  const [gestureState, setGestureState] = useState<GestureState>({
    isPinching: false,
    isGrabbing: false,
    isRotating: false,
    isSelecting: false,
    pinchDistance: 0,
    handPosition: new THREE.Vector3(),
    previousHandPosition: new THREE.Vector3(),
    leftPinchPoint: null,
    rightPinchPoint: null,
    leftWristPosition: null,
    rightWristPosition: null
  });


  
  // Depth configuration for hand projection
  const [restingDepth, setRestingDepth] = useState(0.1);
  const [depthSensitivity, setDepthSensitivity] = useState(200.0);
  const [diamondCount, setDiamondCount] = useState(0);
  
  // Use ref to store latest multiHandData for animation loop
  const multiHandDataRef = useRef<MultiHandData>(multiHandData);
  
  // Track when multiHandData changes
  useEffect(() => {
    // Always update the ref with the latest data
    multiHandDataRef.current = multiHandData;
    
    if (multiHandData.totalHands > 0) {
      console.log('🔄 Eth3DLogo: multiHandData updated:', {
        leftHand: multiHandData.leftHand ? {
          gesture: multiHandData.leftHand.gesture,
          confidence: multiHandData.leftHand.confidence
        } : null,
        rightHand: multiHandData.rightHand ? {
          gesture: multiHandData.rightHand.gesture,
          confidence: multiHandData.rightHand.confidence
        } : null,
        totalHands: multiHandData.totalHands
      });
    }
  }, [multiHandData]);

  // Create a new diamond
  const createDiamond = (position: THREE.Vector3) => {
    if (!ethModelRef.current) return;
    
    const diamondId = `diamond-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Clone the ETH model for the new diamond
    const newDiamondGroup = ethModelRef.current.clone();
    newDiamondGroup.position.copy(position);
    newDiamondGroup.scale.setScalar(0.8); // Slightly smaller than original
    
    // Add some random rotation for variety
    newDiamondGroup.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    
    const diamond: Diamond = {
      id: diamondId,
      group: newDiamondGroup,
      position: position.clone(),
      isSelected: false,
      createdAt: Date.now()
    };
    
    diamondsRef.current.push(diamond);
    setDiamondCount(diamondsRef.current.length);
    
    if (sceneRef.current) {
      sceneRef.current.add(newDiamondGroup);
    }
    
    console.log('💎 Created new diamond:', diamondId, 'at position:', position);
    return diamond;
  };
  
  // Delete a diamond
  const deleteDiamond = (diamondId: string) => {
    const diamondIndex = diamondsRef.current.findIndex(d => d.id === diamondId);
    if (diamondIndex === -1) return;
    
    const diamond = diamondsRef.current[diamondIndex];
    
    // Remove from scene
    if (sceneRef.current) {
      sceneRef.current.remove(diamond.group);
    }
    
    // Remove from array
    diamondsRef.current.splice(diamondIndex, 1);
    setDiamondCount(diamondsRef.current.length);
    
    console.log('🗑️ Deleted diamond:', diamondId);
  };
  
  // Check if hand is over a diamond (for deletion)
  const checkDiamondIntersection = (handPosition: THREE.Vector3) => {
    const threshold = 0.5; // Distance threshold for selection
    
    for (const diamond of diamondsRef.current) {
      const distance = handPosition.distanceTo(diamond.position);
      if (distance < threshold) {
        return diamond;
      }
    }
    return null;
  };
  
  // Load ETH GLB model
  const loadETHModel = () => {
    return new Promise<THREE.Group>((resolve, reject) => {
      const loader = new GLTFLoader();
      
      loader.load(
        '/eth.glb',
        (gltf) => {
          console.log('✅ ETH GLB loaded successfully:', gltf);
          const model = gltf.scene;
          
          // Store reference to the model for cloning
          ethModelRef.current = model;
          
          // Scale and position the model appropriately
          model.scale.setScalar(1.0);
          model.position.set(0, 0, 0);
          
          // No glow effect - clean look
          

          resolve(model);
        },
        (progress) => {
          console.log('📦 Loading ETH GLB:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
        },
        (error) => {
          console.error('❌ Error loading ETH GLB:', error);
          reject(error);
        }
      );
    });
  };

  // Calculate distance between two landmarks
  const calculateDistance = (landmark1: any, landmark2: any): number => {
    const dx = landmark1.x - landmark2.x;
    const dy = landmark1.y - landmark2.y;
    const dz = landmark1.z - landmark2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
  
  // Function to duplicate ETH logo (will be defined inside useEffect)
  let duplicateETHLogo: (() => void) | null = null;

  // Convert hand landmarks to 3D position
  const landmarksToPosition = (landmarks: any[]): THREE.Vector3 => {
    if (!landmarks || landmarks.length === 0) {
      return new THREE.Vector3();
    }
    
    // Use wrist position (landmark 0) as hand center
    const wrist = landmarks[0];
    return new THREE.Vector3(
      (wrist.x - 0.5) * 15, // Increased scale for better sensitivity
      -(wrist.y - 0.5) * 15, // Flip Y and center, increased scale
      (wrist.z - 0.5) * 8   // Increased Z scale
    );
  };

  // Calculate depth scaling for hand projection
  const calculateDepthScaling = (landmarks: any[]): { depthFactor: number; perspectiveScale: number } => {
    if (!landmarks || landmarks.length === 0) {
      return { depthFactor: 0, perspectiveScale: 1.0 };
    }
    
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
    
    // Calculate depth offset from resting position
    const depthOffset = avgZ - restingDepth;
    const depthFactor = Math.max(-100, Math.min(100, depthOffset * depthSensitivity));
    
    // Calculate perspective scale (smaller when closer, bigger when further)
    const perspectiveScale = 0.3 + (1.2 * (depthFactor + 100) / 200);
    
    return { depthFactor, perspectiveScale };
  };



  // Create hand geometry for rendering
  const createHandGeometry = (landmarks: any[], color: number, handType: string) => {
    if (!landmarks || landmarks.length < 21) {
      return null;
    }
    
    const group = new THREE.Group();
    const { depthFactor, perspectiveScale } = calculateDepthScaling(landmarks);
    
    // Hand connections (vectors)
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

    // Draw vectors (connections) - static depth, only X/Y movement
    const vectorMaterial = new THREE.LineBasicMaterial({ 
      color: color, 
      transparent: true, 
      opacity: 0.8,
      linewidth: 3
    });
    
    for (const [start, end] of connections) {
      if (landmarks[start] && landmarks[end]) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(
            (landmarks[start].x - 0.5) * 15,
            -(landmarks[start].y - 0.5) * 15,
            0 // Constant depth at resting position
          ),
          new THREE.Vector3(
            (landmarks[end].x - 0.5) * 15,
            -(landmarks[end].y - 0.5) * 15,
            0 // Constant depth at resting position
          )
        ]);
        const line = new THREE.Line(geometry, vectorMaterial);
        group.add(line);
      }
    }

    // Draw dots (landmarks) - move with depth
    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      if (!landmark) continue;

      const x = (landmark.x - 0.5) * 15;
      const y = -(landmark.y - 0.5) * 15;
      const z = depthFactor; // Dots move with depth

      // Different sizes for different landmark types
      let size = 0.5; // Increased base size
      if (i === 0) size = 0.8; // Wrist
      else if (i % 4 === 0) size = 0.6; // Finger tips
      else size = 0.4; // Other joints

      const dotGeometry = new THREE.SphereGeometry(size * perspectiveScale);
      const dotMaterial = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 1.0 // Full opacity
      });
      
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(x, y, z);
      group.add(dot);
      
      // Add a bright outline to make dots more visible
      const outlineGeometry = new THREE.SphereGeometry(size * perspectiveScale + 0.1);
      const outlineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
      });
      const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
      outline.position.set(x, y, z);
      group.add(outline);
    }

    console.log(`✅ ${handType} hand geometry created with ${group.children.length} elements`);
    return group;
  };

  // Process gesture controls
  const processGestures = (currentMultiHandData: MultiHandData) => {
    const newGestureState = { ...gestureState };
    
      // Track gesture states
  let hasLeftPinch = false;
  let hasRightPinch = false;
  let hasLeftFist = false;
  let hasRightFist = false;
  let leftPinchX = 0, leftPinchY = 0, leftPinchZ = 0;
  let rightPinchX = 0, rightPinchY = 0, rightPinchZ = 0;
  let leftFistX = 0, leftFistY = 0, leftFistZ = 0;
  let rightFistX = 0, rightFistY = 0, rightFistZ = 0;
  
  // Track double pinch for duplication
  let leftPinchCount = 0;
  let rightPinchCount = 0;
  let lastLeftPinchTime = 0;
  let lastRightPinchTime = 0;
    
    // Check for any pinch gesture
    let hasPinch = false;
    let pinchX = 0;
    let pinchY = 0;
    let pinchZ = 0;
    
    // Process left hand
    if (currentMultiHandData.leftHand) {
      const leftHand = currentMultiHandData.leftHand;
      
      // Calculate pinch point for left hand
      const leftThumbTip = leftHand.landmarks[4];
      const leftIndexTip = leftHand.landmarks[8];
      const leftPinchDistance = calculateDistance(leftThumbTip, leftIndexTip);
      
      // Calculate fist detection (all fingers closed)
      const leftFingerTips = [
        leftHand.landmarks[8],  // Index
        leftHand.landmarks[12], // Middle
        leftHand.landmarks[16], // Ring
        leftHand.landmarks[20]  // Pinky
      ];
      const leftFingerMCPs = [
        leftHand.landmarks[5],  // Index MCP
        leftHand.landmarks[9],  // Middle MCP
        leftHand.landmarks[13], // Ring MCP
        leftHand.landmarks[17]  // Pinky MCP
      ];
      
      // Check if all fingers are closed (fist)
      let leftFistClosed = true;
      for (let i = 0; i < 4; i++) {
        const tipY = leftFingerTips[i].y;
        const mcpY = leftFingerMCPs[i].y;
        if (tipY > mcpY) { // Finger is extended
          leftFistClosed = false;
          break;
        }
      }
      
      if (leftPinchDistance < 0.05) { // Much more decisive - 95%+ sensitivity
        // Pinch detected
        hasLeftPinch = true;
        leftPinchX = (leftThumbTip.x + leftIndexTip.x) / 2;
        leftPinchY = (leftThumbTip.y + leftIndexTip.y) / 2;
        leftPinchZ = (leftThumbTip.z + leftIndexTip.z) / 2;
        
        newGestureState.leftPinchPoint = new THREE.Vector3(
          (leftPinchX - 0.5) * 20,
          -(leftPinchY - 0.5) * 20,
          (leftPinchZ - 0.5) * 10
        );
        
        // Check for double pinch
        const currentTime = Date.now();
        if (currentTime - lastLeftPinchTime < 500) { // Double pinch within 500ms
          leftPinchCount++;
                      if (leftPinchCount >= 2) {
              console.log('🔄 LEFT DOUBLE PINCH - DUPLICATE ETH LOGO');
              // Trigger duplication
              if (duplicateETHLogo) {
                duplicateETHLogo();
              }
              leftPinchCount = 0;
            }
        } else {
          leftPinchCount = 1;
        }
        lastLeftPinchTime = currentTime;
        
        console.log('🤏 LEFT PINCH DETECTED');
      } else if (leftFistClosed) {
        // Fist detected
        hasLeftFist = true;
        leftFistX = leftHand.landmarks[0].x; // Use wrist position
        leftFistY = leftHand.landmarks[0].y;
        leftFistZ = leftHand.landmarks[0].z;
        
        console.log('👊 LEFT FIST DETECTED');
      } else {
        newGestureState.leftPinchPoint = null;
      }
      
      // Store wrist position
      newGestureState.leftWristPosition = new THREE.Vector3(
        (leftHand.landmarks[0].x - 0.5) * 20,
        -(leftHand.landmarks[0].y - 0.5) * 20,
        (leftHand.landmarks[0].z - 0.5) * 10
      );
    } else {
      newGestureState.leftPinchPoint = null;
      newGestureState.leftWristPosition = null;
    }
    
    // Process right hand
    if (currentMultiHandData.rightHand) {
      const rightHand = currentMultiHandData.rightHand;
      
      // Calculate pinch point for right hand
      const rightThumbTip = rightHand.landmarks[4];
      const rightIndexTip = rightHand.landmarks[8];
      const rightPinchDistance = calculateDistance(rightThumbTip, rightIndexTip);
      
      // Calculate fist detection (all fingers closed)
      const rightFingerTips = [
        rightHand.landmarks[8],  // Index
        rightHand.landmarks[12], // Middle
        rightHand.landmarks[16], // Ring
        rightHand.landmarks[20]  // Pinky
      ];
      const rightFingerMCPs = [
        rightHand.landmarks[5],  // Index MCP
        rightHand.landmarks[9],  // Middle MCP
        rightHand.landmarks[13], // Ring MCP
        rightHand.landmarks[17]  // Pinky MCP
      ];
      
      // Check if all fingers are closed (fist)
      let rightFistClosed = true;
      for (let i = 0; i < 4; i++) {
        const tipY = rightFingerTips[i].y;
        const mcpY = rightFingerMCPs[i].y;
        if (tipY > mcpY) { // Finger is extended
          rightFistClosed = false;
          break;
        }
      }
      
      if (rightPinchDistance < 0.05) { // Much more decisive - 95%+ sensitivity
        // Pinch detected
        hasRightPinch = true;
        rightPinchX = (rightThumbTip.x + rightIndexTip.x) / 2;
        rightPinchY = (rightThumbTip.y + rightIndexTip.y) / 2;
        rightPinchZ = (rightThumbTip.z + rightIndexTip.z) / 2;
        
        newGestureState.rightPinchPoint = new THREE.Vector3(
          (rightPinchX - 0.5) * 20,
          -(rightPinchY - 0.5) * 20,
          (rightPinchZ - 0.5) * 10
        );
        
        // Check for double pinch
        const currentTime = Date.now();
        if (currentTime - lastRightPinchTime < 500) { // Double pinch within 500ms
          rightPinchCount++;
          if (rightPinchCount >= 2) {
            console.log('🔄 RIGHT DOUBLE PINCH - DUPLICATE ETH LOGO');
            // Trigger duplication
            if (duplicateETHLogo) {
              duplicateETHLogo();
            }
            rightPinchCount = 0;
          }
        } else {
          rightPinchCount = 1;
        }
        lastRightPinchTime = currentTime;
        
        // Check for corner pinch (top-right corner)
        const rightHandX = rightHand.landmarks[0].x; // Wrist X position
        const rightHandY = rightHand.landmarks[0].y; // Wrist Y position
        
        // Check if hand is in top-right corner (X > 0.7, Y < 0.3)
        if (rightHandX > 0.7 && rightHandY < 0.3) {
          console.log('🎯 TOP-RIGHT CORNER PINCH DETECTED - CREATING NEW ETH LOGO');
          if (duplicateETHLogo) {
            duplicateETHLogo();
          }
        }
        
        console.log('🤏 RIGHT PINCH DETECTED');
      } else if (rightFistClosed) {
        // Fist detected
        hasRightFist = true;
        rightFistX = rightHand.landmarks[0].x; // Use wrist position
        rightFistY = rightHand.landmarks[0].y;
        rightFistZ = rightHand.landmarks[0].z;
        
        console.log('👊 RIGHT FIST DETECTED');
      } else {
        newGestureState.rightPinchPoint = null;
      }
      
      // Store wrist position
      newGestureState.rightWristPosition = new THREE.Vector3(
        (rightHand.landmarks[0].x - 0.5) * 20,
        -(rightHand.landmarks[0].y - 0.5) * 20,
        (rightHand.landmarks[0].z - 0.5) * 10
      );
    } else {
      newGestureState.rightPinchPoint = null;
      newGestureState.rightWristPosition = null;
    }
    
    // Handle diamond creation and deletion
    // Only allow diamond creation with one hand at a time
    if (currentMultiHandData.totalHands === 1) {
      let activeHand = currentMultiHandData.leftHand || currentMultiHandData.rightHand;
      let handPosition = new THREE.Vector3();
      
      if (activeHand) {
        const fingerTips = [
          activeHand.landmarks[8],  // Index
          activeHand.landmarks[12], // Middle
          activeHand.landmarks[16], // Ring
          activeHand.landmarks[20]  // Pinky
        ];
        const fingerMCPs = [
          activeHand.landmarks[5],  // Index MCP
          activeHand.landmarks[9],  // Middle MCP
          activeHand.landmarks[13], // Ring MCP
          activeHand.landmarks[17]  // Pinky MCP
        ];
        
        // Count extended fingers
        let extendedCount = 0;
        for (let i = 0; i < 4; i++) {
          const tipY = fingerTips[i].y;
          const mcpY = fingerMCPs[i].y;
          if (tipY < mcpY) { // Finger is extended
            extendedCount++;
          }
        }
        
        handPosition = new THREE.Vector3(
          (activeHand.landmarks[0].x - 0.5) * 20,
          -(activeHand.landmarks[0].y - 0.5) * 20,
          (activeHand.landmarks[0].z - 0.5) * 10
        );
        
        // 2 fingers extended - create diamonds continuously
        if (extendedCount === 2) {
          createDiamond(handPosition);
          console.log('✌️ 2 FINGERS - Creating diamond continuously');
        }
        
        // 3 fingers extended - create only one diamond at a time
        if (extendedCount === 3) {
          // Use a ref to track if we've already created a diamond for this 3-finger gesture
          if (!gestureState.isSelecting) {
            createDiamond(handPosition);
            console.log('🖐️ 3 FINGERS - Creating single diamond');
            newGestureState.isSelecting = true;
          }
        } else {
          // Reset the flag when not doing 3-finger gesture
          newGestureState.isSelecting = false;
        }
      }
    } else {
      // Reset selection flag when multiple hands or no hands
      newGestureState.isSelecting = false;
    }
    
    // Handle diamond deletion with fist - clear all diamonds
    if (hasLeftFist || hasRightFist) {
      // Clear all diamonds when fist is detected
      const diamondsToDelete = [...diamondsRef.current];
      diamondsToDelete.forEach(diamond => deleteDiamond(diamond.id));
      console.log('👊 FIST DETECTED - Clearing all diamonds');
    }
    
    // PINCH-ONLY GESTURE DETECTION - NO MOVEMENT WITHOUT PINCHING
    if (hasLeftPinch && hasRightPinch && !hasLeftFist && !hasRightFist) {
      // BOTH HANDS PINCHING ONLY = ZOOM ONLY
      if (!isPinchingRef.current) {
        isPinchingRef.current = true;
        previousPinchPositionRef.current = { x: (leftPinchX + rightPinchX) / 2, y: (leftPinchY + rightPinchY) / 2 };
        console.log('🔍 ZOOM MODE STARTED - BOTH HANDS PINCHING ONLY');
      }
      pinchPositionRef.current = { x: (leftPinchX + rightPinchX) / 2, y: (leftPinchY + rightPinchY) / 2 };
      console.log('🔍 ZOOM MODE ACTIVE - BOTH HANDS PINCHING ONLY');
    } else if ((hasLeftPinch && !hasRightPinch && !hasLeftFist && !hasRightFist) || 
               (hasRightPinch && !hasLeftPinch && !hasLeftFist && !hasRightFist)) {
      // SINGLE HAND PINCHING ONLY = MOVE OBJECT
      if (!isPinchingRef.current) {
        isPinchingRef.current = true;
        const pinchX = hasLeftPinch ? leftPinchX : rightPinchX;
        const pinchY = hasLeftPinch ? leftPinchY : rightPinchY;
        previousPinchPositionRef.current = { x: pinchX, y: pinchY };
        console.log('🤏 MOVE MODE STARTED - SINGLE HAND PINCHING ONLY');
      }
      const pinchX = hasLeftPinch ? leftPinchX : rightPinchX;
      const pinchY = hasLeftPinch ? leftPinchY : rightPinchY;
      pinchPositionRef.current = { x: pinchX, y: pinchY };
      console.log('🤏 MOVE MODE ACTIVE - SINGLE HAND PINCHING ONLY');
    } else {
      // NO PINCH DETECTED - NO MOVEMENT ALLOWED
      if (isPinchingRef.current) {
        console.log('🎯 PINCH ENDED - NO MOVEMENT');
      }
      isPinchingRef.current = false;
    }
    
    // Return the gesture state
    setGestureState(newGestureState);
    return newGestureState;
  };

  // Apply gesture controls to the logo
  const applyGestureControls = (gestureState: GestureState) => {
    if (!logoGroupRef.current) return;
    
    const logo = logoGroupRef.current;
    
    // Enhanced pinch and grab system
    if (gestureState.leftPinchPoint && gestureState.rightPinchPoint) {
      // Two-hand pinch: scale and position
      const pinchCenter = new THREE.Vector3().addVectors(
        gestureState.leftPinchPoint,
        gestureState.rightPinchPoint
      ).multiplyScalar(0.5);
      
      const pinchDistance = gestureState.leftPinchPoint.distanceTo(gestureState.rightPinchPoint);
      
      // Scale based on pinch distance
      const baseScale = 1.0;
      const scaleFactor = Math.max(0.1, Math.min(3.0, pinchDistance / 5.0));
      logo.scale.setScalar(scaleFactor);
      
      // Position based on pinch center
      logo.position.copy(pinchCenter);
      
      console.log('🤏 Two-hand pinch: Scale:', scaleFactor.toFixed(2), 'Distance:', pinchDistance.toFixed(2));
    }
    // Single-hand pinch is now handled in the unified drag logic in the animation loop
    
    // Grab to move (using wrist position)
    if (gestureState.isGrabbing) {
      const activeWrist = gestureState.leftWristPosition || gestureState.rightWristPosition;
      if (activeWrist) {
        const movement = new THREE.Vector3().subVectors(
          activeWrist,
          gestureState.previousHandPosition
        );
        
        // Only move if there's significant movement
        if (movement.length() > 0.01) {
          logo.position.add(movement.multiplyScalar(0.3));
          console.log('🤏 Grabbing:', movement.x.toFixed(2), movement.y.toFixed(2), movement.z.toFixed(2));
        }
      }
    }
    
    // Open hand to rotate
    if (gestureState.isRotating) {
      const rotationSpeed = 0.03;
      logo.rotation.x += rotationSpeed;
      logo.rotation.y += rotationSpeed;
      console.log('🔄 Rotating');
    }
    
    // Visual feedback for active gestures
    let activeGlowColor = 0x000000; // Default: no glow
    
    if (gestureState.leftPinchPoint && gestureState.rightPinchPoint) {
      activeGlowColor = 0x00ff88; // Green for two-hand scaling
    } else if (gestureState.leftPinchPoint || gestureState.rightPinchPoint) {
      activeGlowColor = 0xff8800; // Orange for single-hand grab
    } else if (gestureState.isGrabbing) {
      activeGlowColor = 0xff0088; // Pink for grabbing
    } else if (gestureState.isRotating) {
      activeGlowColor = 0x0088ff; // Blue for rotating
    } else if (gestureState.isSelecting) {
      activeGlowColor = 0x8800ff; // Purple for selecting
    }
    
    // Apply glow effect to all mesh children
    logo.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
        child.material.emissive.setHex(activeGlowColor);
      }
    });
    
    // Add console logging for debugging
    const activeGestures = [];
    if (gestureState.leftPinchPoint && gestureState.rightPinchPoint) activeGestures.push('Two-hand scaling');
    else if (gestureState.leftPinchPoint || gestureState.rightPinchPoint) activeGestures.push('Single-hand grab');
    if (gestureState.isGrabbing) activeGestures.push('Grabbing');
    if (gestureState.isRotating) activeGestures.push('Rotating');
    if (gestureState.isSelecting) activeGestures.push('Selecting');
    
    if (activeGestures.length > 0) {
      console.log('🎯 Active gestures:', activeGestures.join(', '));
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null; // No background - let the gradient show through
    sceneRef.current = scene;

    // Camera setup - Expanded for larger scene
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000 // Increased far plane for larger scene
    );
    camera.position.set(0, 5, 25); // Elevated and moved back for better view
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0); // Transparent background to show gradient
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x00ff88, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);


    
    // No pinch indicator - clean scene
    
    // Pinch indicator removed for clean scene
    
    // Pinch indicator is ready
    console.log('🎯 Pinch indicator ready');
    
    // Load ETH logo (temporarily disabled for debugging)
    loadETHModel().then((model) => {
      logoGroupRef.current = model;
      scene.add(model);
    }).catch((error) => {
      console.error('❌ Failed to load ETH logo:', error);
    });

    // Function to duplicate ETH logo
    duplicateETHLogo = () => {
      if (logoGroupRef.current) {
        // Clone the current ETH logo
        const clonedLogo = logoGroupRef.current.clone();
        
        // Position the new logo at a random location in the expanded scene
        const randomX = (Math.random() - 0.5) * 40; // -20 to +20
        const randomY = (Math.random() - 0.5) * 20; // -10 to +10
        const randomZ = (Math.random() - 0.5) * 40; // -20 to +20
        
        clonedLogo.position.set(randomX, randomY, randomZ);
        scene.add(clonedLogo);
        
        console.log('🔄 ETH LOGO DUPLICATED at:', 
          clonedLogo.position.x.toFixed(2), 
          clonedLogo.position.y.toFixed(2), 
          clonedLogo.position.z.toFixed(2));
      }
    };

    // Hand rendering is now handled by StableHandRenderer overlay
    console.log('🎯 Hand rendering delegated to StableHandRenderer');

    // Temporarily remove particle system
    console.log('🚫 Particle system disabled for hand testing');

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Process gestures
      const currentGestureState = processGestures(multiHandDataRef.current);
      
      // Apply gesture controls
      applyGestureControls(currentGestureState);
      
      // Unified drag logic for both mouse and pinch
      if (logoGroupRef.current) {
        let isDragging = false;
        
        // Handle mouse drag
        if (isMouseDownRef.current) {
          const deltaX = mousePositionRef.current.x - previousMousePositionRef.current.x;
          const deltaY = mousePositionRef.current.y - previousMousePositionRef.current.y;
          
          // Convert screen coordinates to 3D space
          const moveSpeed = 0.01;
          logoGroupRef.current.position.x += deltaX * moveSpeed;
          logoGroupRef.current.position.y -= deltaY * moveSpeed; // Invert Y for natural feel
          
          // Update previous position
          previousMousePositionRef.current = {
            x: mousePositionRef.current.x,
            y: mousePositionRef.current.y
          };
          
          isDragging = true;
        }
        
        // Handle gesture interactions - NEW INTERACTION SYSTEM
        if (isPinchingRef.current) {
          const deltaX = pinchPositionRef.current.x - previousPinchPositionRef.current.x;
          const deltaY = pinchPositionRef.current.y - previousPinchPositionRef.current.y;
          
          // Determine interaction mode based on gesture state
          const gestureState = processGestures(multiHandDataRef.current);
          const hasLeftPinch = !!gestureState.leftPinchPoint;
          const hasRightPinch = !!gestureState.rightPinchPoint;
          const hasLeftFist = !!gestureState.leftWristPosition && !hasLeftPinch;
          const hasRightFist = !!gestureState.rightWristPosition && !hasRightPinch;
          
          // Debug: Log what gestures are detected
          console.log('🎯 GESTURE DEBUG:', {
            hasLeftPinch,
            hasRightPinch,
            hasLeftFist,
            hasRightFist,
            leftPinchPoint: gestureState.leftPinchPoint,
            rightPinchPoint: gestureState.rightPinchPoint,
            leftWrist: gestureState.leftWristPosition,
            rightWrist: gestureState.rightWristPosition,
            deltaX: deltaX.toFixed(3),
            deltaY: deltaY.toFixed(3)
          });
          
          if (hasLeftPinch && hasRightPinch && !hasLeftFist && !hasRightFist) {
            // ZOOM MODE: BOTH HANDS PINCHING ONLY = ZOOM ONLY (no movement at all)
            console.log('🔍 ZOOM MODE ACTIVE - BOTH HANDS PINCHING ONLY');
            if (logoGroupRef.current) {
              const zoomSpeed = 0.05;
              // Use the distance between hands for zoom, not deltaY
              const zoomDelta = Math.abs(deltaX + deltaY) * zoomSpeed;
              // ONLY change scale, NEVER touch position
              logoGroupRef.current.scale.x += zoomDelta;
              logoGroupRef.current.scale.y += zoomDelta;
              logoGroupRef.current.scale.z += zoomDelta;
              
              console.log('🔍 ZOOMING ETH LOGO scale:', logoGroupRef.current.scale.x.toFixed(2));
              isDragging = true;
            }
          } else if ((hasLeftPinch && !hasRightPinch && !hasLeftFist && !hasRightFist) || 
                     (hasRightPinch && !hasLeftPinch && !hasLeftFist && !hasRightFist)) {
            // MOVE MODE: SINGLE HAND PINCHING ONLY = MOVE OBJECT ONLY (NO ZOOM)
            console.log('🤏 SINGLE HAND PINCH DETECTED - SHOULD MOVE OBJECT');
            if (logoGroupRef.current) {
              const moveSpeed = 25.0; // Much more sensitive - increased from 8.0 to 25.0 (3x more sensitive!)
              // ONLY move position, NEVER touch scale - FIXED DIRECTION (corrected)
              logoGroupRef.current.position.x -= deltaX * moveSpeed;
              logoGroupRef.current.position.y -= deltaY * moveSpeed;
              
              console.log('🤏 MOVING ETH LOGO to:', 
                logoGroupRef.current.position.x.toFixed(2), logoGroupRef.current.position.y.toFixed(2));
              isDragging = true;
            }
          }
          
          // Update previous position
          previousPinchPositionRef.current = {
            x: pinchPositionRef.current.x,
            y: pinchPositionRef.current.y
          };
        }
        
        // Rotate ETH logo slowly (only when not dragging)
        if (!isDragging) {
          if (logoGroupRef.current) {
            logoGroupRef.current.rotation.y += 0.005;
          }
          
          // No test objects to reset - clean scene
        }
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Handle window resize
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }
    };
    
    // Mouse event handlers
    const handleMouseDown = (event: MouseEvent) => {
      isMouseDownRef.current = true;
      previousMousePositionRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };



    // Add mouse event listeners
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
    


    // Cleanup
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100vw', 
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 2
      }} 
    >
      {/* Diamond Controls UI */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <button
          onClick={() => {
            const randomPosition = new THREE.Vector3(
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 5
            );
            createDiamond(randomPosition);
          }}
          style={{
            padding: '12px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#45a049';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4CAF50';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          💎 Create Diamond
        </button>
        
        <button
          onClick={() => {
            diamondsRef.current.forEach(diamond => deleteDiamond(diamond.id));
          }}
          style={{
            padding: '12px 16px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#d32f2f';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f44336';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🗑️ Clear All
        </button>
        
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          <div>✌️ 2 fingers = continuous</div>
          <div>🖐️ 3 fingers = single</div>
          <div>👊 Fist = clear all</div>
          <div>💎 Count: {diamondCount}</div>
        </div>
      </div>
    </div>
  );
} 