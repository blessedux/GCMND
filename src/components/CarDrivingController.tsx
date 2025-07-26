'use client';

import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import { HandData } from '@/types';

interface CarDrivingControllerProps {
  leftHand: HandData | null;
  rightHand: HandData | null;
}

interface GestureState {
  isSteering: boolean;
  steeringDirection: 'left' | 'right' | 'center';
  isAccelerating: boolean;
  isBrabbing: boolean;
  isBraking: boolean;
  steeringAngle: number;
  steeringPercentage: number; // 0-100% steering intensity
  depthLevel: number;
  leftHandFist: boolean;
  rightHandFist: boolean;
  handsGrabbingWheel: boolean;
  wheelGrabDistance: number; // Distance between hands when grabbing wheel
  wheelGrabCenter: { x: number; y: number; z: number }; // Center point when grabbing wheel
  wheelGrabAngle: number; // Current angle of wheel rotation
}

interface RecordedPosition {
  name: string;
  leftHand: { x: number; y: number; z: number };
  rightHand: { x: number; y: number; z: number };
  timestamp: number;
}

export default function CarDrivingController({ leftHand, rightHand }: CarDrivingControllerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const handsDataRef = useRef<{ left: any[] | null; right: any[] | null }>({ left: null, right: null });
  
  // Gesture state
  const [gestureState, setGestureState] = useState<GestureState>({
    isSteering: false,
    steeringDirection: 'center',
    isAccelerating: false,
    isBrabbing: false,
    isBraking: false,
    steeringAngle: 0,
    steeringPercentage: 0,
    depthLevel: 0,
    leftHandFist: false,
    rightHandFist: false,
    handsGrabbingWheel: false,
    wheelGrabDistance: 0,
    wheelGrabCenter: { x: 0, y: 0, z: 0 },
    wheelGrabAngle: 0
  });

  // Debug controls
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [enableKeyboardSimulation, setEnableKeyboardSimulation] = useState(false);
  const [lastKeyPress, setLastKeyPress] = useState<string>('');

  // Calibration settings
  const [steeringSensitivity, setSteeringSensitivity] = useState(2.0);
  const [depthSensitivity, setDepthSensitivity] = useState(3.0);
  const [restingDepth, setRestingDepth] = useState(0.1);
  const [handsTogetherThreshold, setHandsTogetherThreshold] = useState(0.15);

  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<'idle' | 'minDepth' | 'maxDepth' | 'steeringWheel'>('idle');
  const [calibratedMinDepth, setCalibratedMinDepth] = useState(0.1);
  const [calibratedMaxDepth, setCalibratedMaxDepth] = useState(0.6);
  const [calibratedSteeringWheelDepth, setCalibratedSteeringWheelDepth] = useState(0.35);

  // Position recording
  const [recordedPositions, setRecordedPositions] = useState<RecordedPosition[]>([]);
  const [isRecordingPosition, setIsRecordingPosition] = useState(false);
  const [positionName, setPositionName] = useState('');

  // Wheel grabbing state
  const [isWheelGrabbed, setIsWheelGrabbed] = useState(false);
  const [wheelGrabStartDistance, setWheelGrabStartDistance] = useState(0);
  const [wheelGrabStartCenter, setWheelGrabStartCenter] = useState({ x: 0, y: 0, z: 0 });
  const [wheelGrabStartAngle, setWheelGrabStartAngle] = useState(0);
  


  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p: p5) => {
      let leftHandLandmarks: any[] | null = null;
      let rightHandLandmarks: any[] | null = null;
      let frameCount = 0;

      p.setup = () => {
        p.createCanvas(800, 600, p.WEBGL);
        p.frameRate(30);
        p.background(0);
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

        // Set up 3D perspective
        p.perspective(p.PI / 3, p.width / p.height, 0.1, 1000);
        p.rotateX(p.PI / 12);

        // Analyze gestures
        const newGestureState = analyzeGestures(p, leftHandLandmarks || [], rightHandLandmarks || []);
        setGestureState(newGestureState);

        // Draw hands (with distance locking when grabbing wheel)
        if (leftHandLandmarks && leftHandLandmarks.length > 0) {
          renderHand(p, leftHandLandmarks, [0, 255, 0], 'left', newGestureState.handsGrabbingWheel, newGestureState);
        }
        if (rightHandLandmarks && rightHandLandmarks.length > 0) {
          renderHand(p, rightHandLandmarks, [0, 0, 255], 'right', newGestureState.handsGrabbingWheel, newGestureState);
        }

        // Draw steering wheel visualization
        drawSteeringWheel(p, newGestureState);
        
        // Draw wheel rotation indicator when grabbing
        if (newGestureState.handsGrabbingWheel) {
          drawWheelRotationIndicator(p, newGestureState);
        }

        // Draw depth indicator
        drawDepthIndicator(p, newGestureState);

        // Draw vertical depth line
        drawVerticalDepthLine(p, newGestureState);

        // Draw control status indicators
        drawControlStatus(p, newGestureState);

        // Draw debug info
        if (showDebugInfo) {
          drawDebugInfo(p, newGestureState);
        }

        frameCount++;
      };

      const analyzeGestures = (p: p5, leftLandmarks: any[], rightLandmarks: any[]): GestureState => {
        if (!leftLandmarks || !rightLandmarks || leftLandmarks.length < 21 || rightLandmarks.length < 21) {
          return {
            isSteering: false,
            steeringDirection: 'center',
            isAccelerating: false,
            isBrabbing: false,
            isBraking: false,
            steeringAngle: 0,
            steeringPercentage: 0,
            depthLevel: 0,
            leftHandFist: false,
            rightHandFist: false,
            handsGrabbingWheel: false,
            wheelGrabDistance: 0,
            wheelGrabCenter: { x: 0, y: 0, z: 0 },
            wheelGrabAngle: 0
          };
        }

        // Get wrist positions (landmark 0)
        const leftWrist = leftLandmarks[0];
        const rightWrist = rightLandmarks[0];

        // Detect fists for both hands
        const leftHandFist = detectFist(leftLandmarks);
        const rightHandFist = detectFist(rightLandmarks);

        // Calculate average depth for acceleration/braking
        const leftAvgZ = calculateAverageZ(leftLandmarks);
        const rightAvgZ = calculateAverageZ(rightLandmarks);
        const avgDepth = (leftAvgZ + rightAvgZ) / 2;
        
        // Check if hands are together (for steering activation)
        const dx = leftWrist.x - rightWrist.x;
        const dy = leftWrist.y - rightWrist.y;
        const dz = leftWrist.z - rightWrist.z;
        const handsDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const isHandsTogether = handsDistance < handsTogetherThreshold;
        
        // Use calibrated steering wheel depth
        const steeringWheelDepth = calibratedSteeringWheelDepth;
        const steeringWheelGrabTolerance = 0.03; // Grab zone tolerance
        
        // Check if hands are at the correct depth to grab the steering wheel
        const handsAtWheelDepth = Math.abs(avgDepth - steeringWheelDepth) < steeringWheelGrabTolerance;
        
        // Check if hands are grabbing the steering wheel (both fists + close together + at correct depth)
        const handsGrabbingWheel = leftHandFist && rightHandFist && isHandsTogether && handsAtWheelDepth;
        
        // Handle wheel grabbing state transitions
        if (handsGrabbingWheel && !isWheelGrabbed) {
          // Just started grabbing the wheel
          setIsWheelGrabbed(true);
          setWheelGrabStartDistance(handsDistance);
          setWheelGrabStartCenter({ 
            x: (leftWrist.x + rightWrist.x) / 2, 
            y: (leftWrist.y + rightWrist.y) / 2, 
            z: (leftWrist.z + rightWrist.z) / 2 
          });
          setWheelGrabStartAngle(Math.atan2(rightWrist.y - leftWrist.y, rightWrist.x - leftWrist.x));
          console.log(`🎮 WHEEL GRABBED: Distance locked at ${handsDistance.toFixed(3)}`);
        } else if (!handsGrabbingWheel && isWheelGrabbed) {
          // Released the wheel
          setIsWheelGrabbed(false);
          console.log(`🎮 WHEEL RELEASED: Hands can move freely`);
        }
        
        // Log steering wheel grab status
        if (leftHandFist && rightHandFist && isHandsTogether) {
          console.log(`🎮 WHEEL GRAB: Depth: ${avgDepth.toFixed(3)} | Wheel Depth: ${steeringWheelDepth.toFixed(3)} | At Depth: ${handsAtWheelDepth ? '✅' : '❌'} | Grabbing: ${handsGrabbingWheel ? '✅' : '❌'}`);
        }
        
        // Log hands together status for debugging
        if (handsDistance < 0.3) { // Only log when hands are relatively close
          console.log(`🤝 HANDS: ${handsDistance.toFixed(3)} | FISTS: ${leftHandFist ? 'L✅' : 'L❌'} ${rightHandFist ? 'R✅' : 'R❌'} | GRABBING: ${handsGrabbingWheel ? '✅' : '❌'}`);
        }
        
        // Direct mapping: closer to camera (lower Z) = closer to user in UI
        // Z values are typically 0 (closest) to 1 (farthest)
        // We want to show this as a direct distance measurement
        const depthLevel = avgDepth; // Use raw Z value for direct distance representation

        // Determine acceleration/braking based on depth (only when not grabbing wheel)
        const isAccelerating = !handsGrabbingWheel && depthLevel < 0.2; // Hands forward = accelerate
        const isBraking = !handsGrabbingWheel && depthLevel > 0.4; // Hands back = brake
        
        // Log depth status for debugging
        const distanceInMeters = depthLevel * 2; // Convert to meters
        if (Math.abs(depthLevel) > 0.05) { // Only log when there's significant depth change
          console.log(`📏 DISTANCE: ${distanceInMeters.toFixed(2)}m from camera - ${isAccelerating ? '🚀 ACCEL' : isBraking ? '🛑 BRAKE' : '⚖️ NEUTRAL'}`);
        }

        // Calculate circular steering when grabbing wheel
        let steeringAngle = 0;
        let steeringDirection: 'left' | 'right' | 'center' = 'center';
        let isSteering = false;
        let steeringPercentage = 0;
        let wheelGrabAngle = 0;

        if (handsGrabbingWheel) {
          // Calculate circular motion based on hand positions relative to steering wheel center
          const wheelCenterX = (leftWrist.x + rightWrist.x) / 2;
          const wheelCenterY = (leftWrist.y + rightWrist.y) / 2;
          
          // Calculate angle from center for each hand
          const leftAngle = Math.atan2(leftWrist.y - wheelCenterY, leftWrist.x - wheelCenterX);
          const rightAngle = Math.atan2(rightWrist.y - wheelCenterY, rightWrist.x - wheelCenterX);
          
          // Calculate average angle (steering wheel rotation)
          const avgAngle = (leftAngle + rightAngle) / 2;
          wheelGrabAngle = avgAngle;
          
          // Calculate rotation from start position
          const angleDifference = avgAngle - wheelGrabStartAngle;
          
          // Convert angle to steering percentage (-100% to +100%)
          steeringPercentage = (angleDifference / Math.PI) * 100;
          steeringPercentage = Math.max(-100, Math.min(100, steeringPercentage)); // Clamp to -100 to +100
          
          // Determine steering direction based on angle difference
          const steeringThreshold = 0.1; // Minimum angle to register steering
          
          if (Math.abs(angleDifference) > steeringThreshold) {
            if (angleDifference > 0) {
              steeringDirection = 'right';
              isSteering = true;
              steeringAngle = Math.abs(steeringPercentage) / 100; // Convert to 0-1 range
            } else {
              steeringDirection = 'left';
              isSteering = true;
              steeringAngle = Math.abs(steeringPercentage) / 100; // Convert to 0-1 range
            }
          } else {
            steeringDirection = 'center';
            isSteering = false;
            steeringAngle = 0;
            steeringPercentage = 0;
          }
          
          console.log(`🎮 CIRCULAR STEERING: ${steeringDirection.toUpperCase()} ${steeringPercentage.toFixed(1)}% | Angle diff: ${angleDifference.toFixed(3)} | Current: ${avgAngle.toFixed(3)} | Start: ${wheelGrabStartAngle.toFixed(3)}`);
        }

        return {
          isSteering,
          steeringDirection,
          isAccelerating,
          isBrabbing: !handsGrabbingWheel && (isAccelerating || isBraking), // Only when not steering
          isBraking,
          steeringAngle,
          steeringPercentage,
          depthLevel,
          leftHandFist,
          rightHandFist,
          handsGrabbingWheel,
          wheelGrabDistance: handsDistance,
          wheelGrabCenter: { x: (leftWrist.x + rightWrist.x) / 2, y: (leftWrist.y + rightWrist.y) / 2, z: (leftWrist.z + rightWrist.z) / 2 },
          wheelGrabAngle: wheelGrabAngle
        };
      };

      const calculateAverageZ = (landmarks: any[]): number => {
        let sum = 0;
        let count = 0;
        for (const landmark of landmarks) {
          if (landmark && typeof landmark.z === 'number') {
            sum += landmark.z;
            count++;
          }
        }
        return count > 0 ? sum / count : 0;
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
        const fistThreshold = 0.08; // Adjust this threshold as needed
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

      const renderHand = (p: p5, landmarks: any[], color: number[], handType: string, isGrabbingWheel: boolean = false, gestureState?: GestureState) => {
        if (!landmarks || landmarks.length < 21) return;

        p.push();
        
        // Set up lighting
        p.ambientLight(60, 60, 60);
        p.directionalLight(255, 255, 255, 0, 0, -1);
        
        // Calculate average Z for depth positioning
        const avgZ = calculateAverageZ(landmarks);
        let depthZ = -avgZ * 200; // Scale for visualization
        
        // If grabbing wheel, fix hand position and show distance locking
        if (isGrabbingWheel && gestureState) {
          depthZ = 0; // Fixed position at steering wheel
          
          // Draw distance lock indicator
          p.push();
          p.stroke(255, 255, 0, 150); // Yellow for distance lock
          p.strokeWeight(2);
          p.noFill();
          
          // Draw a circle around the hand to show it's locked
          const wrist = landmarks[0];
          const x = p.map(wrist.x, 0, 1, -p.width/2, p.width/2);
          const y = p.map(wrist.y, 0, 1, -p.height/2, p.height/2);
          p.circle(x, y, 30);
          
          // Draw distance line between hands if both are visible
          if (gestureState.wheelGrabDistance > 0) {
            p.stroke(255, 255, 0, 100);
            p.strokeWeight(1);
            p.line(x, y, x + gestureState.wheelGrabDistance * 100, y);
          }
          
          p.pop();
        }

        // Draw hand connections
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

        for (const [start, end] of connections) {
          if (landmarks[start] && landmarks[end]) {
            const x1 = p.map(landmarks[start].x, 0, 1, -p.width/2, p.width/2);
            const y1 = p.map(landmarks[start].y, 0, 1, -p.height/2, p.height/2);
            const z1 = depthZ;
            
            const x2 = p.map(landmarks[end].x, 0, 1, -p.width/2, p.width/2);
            const y2 = p.map(landmarks[end].y, 0, 1, -p.height/2, p.height/2);
            const z2 = depthZ;

            p.line(x1, y1, z1, x2, y2, z2);
          }
        }

        // Draw landmarks with proper perspective scaling (smaller when closer to camera)
        for (let i = 0; i < landmarks.length; i++) {
          const landmark = landmarks[i];
          if (!landmark) continue;

          const x = p.map(landmark.x, 0, 1, -p.width/2, p.width/2);
          const y = p.map(landmark.y, 0, 1, -p.height/2, p.height/2);
          const z = depthZ;

          p.push();
          p.translate(x, y, z);
          
          // Calculate perspective scale: smaller when closer to camera (opposite of mirror effect)
          // Use avgZ directly: lower Z = closer to camera = smaller scale
          const avgZ = calculateAverageZ(landmarks);
          const perspectiveScale = p.map(avgZ, 0.1, 0.8, 0.3, 1.2); // Scale from 0.3 (close) to 1.2 (far)
          p.scale(perspectiveScale);
          
          let size = 6;
          if (i === 0) size = 10; // Wrist
          else if (i % 4 === 0) size = 8; // Finger tips

          p.fill(color[0], color[1], color[2], 255);
          p.noStroke();
          p.sphere(size);
          
          p.pop();
        }

        p.pop();
      };

      const drawWheelRotationIndicator = (p: p5, state: GestureState) => {
        p.push();
        p.translate(0, 0, 0);
        
        // Draw rotation indicator
        p.stroke(255, 215, 0, 200); // Gold
        p.strokeWeight(3);
        p.noFill();
        
        // Draw a circle showing the wheel rotation
        const rotationRadius = 80;
        p.circle(0, 0, rotationRadius * 2);
        
        // Draw rotation arrow
        if (state.isSteering) {
          p.push();
          p.rotate(state.wheelGrabAngle);
          
          // Draw arrow in steering direction
          const arrowLength = 60;
          const direction = state.steeringDirection === 'right' ? 1 : -1;
          
          p.stroke(255, 100, 100, 255); // Red for steering
          p.strokeWeight(4);
          p.line(0, 0, arrowLength * direction, 0);
          
          // Draw arrow head
          p.line(arrowLength * direction, 0, (arrowLength - 10) * direction, -8);
          p.line(arrowLength * direction, 0, (arrowLength - 10) * direction, 8);
          
          p.pop();
        }
        
        // Draw rotation percentage
        p.fill(255, 255, 255, 255);
        p.noStroke();
        p.textSize(16);
        p.textAlign(p.CENTER);
        p.text(`${state.steeringPercentage.toFixed(0)}°`, 0, 0);
        
        p.pop();
      };

      const drawSteeringWheel = (p: p5, state: GestureState) => {
        p.push();
        p.translate(0, -100, 0);
        
        // Draw steering wheel base
        p.stroke(100, 100, 100, 200);
        p.strokeWeight(8);
        p.noFill();
        p.circle(0, 0, 120);
        
        // Draw steering wheel spokes
        p.strokeWeight(4);
        p.line(-60, 0, 0, 60, 0, 0);
        p.line(0, -60, 0, 0, 60, 0);
        
        // Draw steering indicator
        if (state.isSteering) {
          p.push();
          
          // Calculate rotation based on steering percentage
          const maxRotation = p.PI / 3; // 60 degrees max rotation
          const rotationAngle = (state.steeringPercentage / 100) * maxRotation;
          const direction = state.steeringDirection === 'right' ? 1 : -1;
          
          p.rotate(rotationAngle * direction);
          
          // Color based on steering intensity
          const intensity = state.steeringPercentage / 100;
          const red = 255;
          const green = 255 - intensity * 100;
          const blue = 0;
          
          p.stroke(red, green, blue, 255);
          p.strokeWeight(6);
          p.line(0, -50, 0, 0, 50, 0);
          
          // Draw steering percentage text
          p.fill(255, 255, 255, 255);
          p.noStroke();
          p.textSize(14);
          p.textAlign(p.CENTER);
          p.text(`${state.steeringPercentage.toFixed(0)}%`, 0, -70);
          
          p.pop();
        }
        
        p.pop();
      };

      const drawDepthIndicator = (p: p5, state: GestureState) => {
        p.push();
        p.translate(0, 150, 0);
        
        // Show actual distance from camera (Z value)
        // Z = 0 is closest to camera, Z = 1 is farthest
        const distanceFromCamera = state.depthLevel;
        const distanceInMeters = distanceFromCamera * 2; // Rough conversion to meters
        
        // Draw distance meter background
        p.stroke(50, 50, 50, 200);
        p.strokeWeight(12);
        p.line(-120, 0, 0, 120, 0, 0);
        
        // Draw distance meter fill (shows current position)
        const fillWidth = p.map(distanceFromCamera, 0, 1, 0, 240);
        p.stroke(100, 100, 255, 150);
        p.strokeWeight(8);
        p.line(-120, 0, 0, -120 + fillWidth, 0, 0);
        
        // Draw current position indicator
        const indicatorX = p.map(distanceFromCamera, 0, 1, -120, 120);
        let indicatorColor = [255, 255, 255, 255]; // Default white
        
        if (state.isAccelerating) {
          indicatorColor = [0, 255, 0, 255]; // Green for accelerating
        } else if (state.isBraking) {
          indicatorColor = [255, 0, 0, 255]; // Red for braking
        } else if (distanceFromCamera < 0.1) {
          indicatorColor = [255, 255, 0, 255]; // Yellow for very close
        }
        
        p.stroke(indicatorColor[0], indicatorColor[1], indicatorColor[2], indicatorColor[3]);
        p.strokeWeight(12);
        p.point(indicatorX, 0);
        
        // Draw distance text
        p.fill(255, 255, 255, 255);
        p.noStroke();
        p.textSize(16);
        p.textAlign(p.CENTER);
        p.text(`${distanceInMeters.toFixed(1)}m`, indicatorX, -20);
        
        // Draw distance labels
        p.textSize(12);
        p.fill(255, 255, 255, 180);
        p.text('CLOSE (0m)', -120, 30);
        p.text('FAR (2m)', 120, 30);
        
        // Draw control zones
        p.textSize(10);
        p.fill(0, 255, 0, 200);
        p.text('ACCELERATE', 80, 45);
        p.fill(255, 0, 0, 200);
        p.text('BRAKE', -80, 45);
        p.fill(255, 255, 0, 200);
        p.text('NEUTRAL', 0, 45);
        
        // Draw tick marks for reference
        p.stroke(150, 150, 150, 100);
        p.strokeWeight(2);
        for (let i = 0; i <= 10; i++) {
          const x = p.map(i, 0, 10, -120, 120);
          p.line(x, -8, 0, x, 8, 0);
          
          // Add distance labels every 0.2m
          if (i % 2 === 0) {
            p.fill(150, 150, 150, 150);
            p.noStroke();
            p.textSize(10);
            p.textAlign(p.CENTER);
            p.text(`${(i * 0.2).toFixed(1)}m`, x, 25);
          }
        }
        
        p.pop();
      };

      const drawVerticalDepthLine = (p: p5, state: GestureState) => {
        p.push();
        p.translate(-300, 0, 0);
        
        // Use calibrated depth values
        const minDepth = calibratedMinDepth;
        const maxDepth = calibratedMaxDepth;
        const steeringWheelDepth = calibratedSteeringWheelDepth;
        
        // Map steering wheel to middle of line
        const wheelDepthY = p.map(steeringWheelDepth, minDepth, maxDepth, 200, -200);
        
        // Draw vertical depth line
        p.stroke(100, 100, 100, 150);
        p.strokeWeight(3);
        p.line(0, -200, 0, 200);
        
        // Draw steering wheel position marker (middle)
        p.stroke(255, 215, 0, 200); // Gold for steering wheel
        p.strokeWeight(6);
        p.line(-20, wheelDepthY, 20, wheelDepthY);
        
        // Draw current hand position (0% = bottom, 100% = top)
        const currentDepthY = p.map(state.depthLevel, minDepth, maxDepth, 200, -200);
        let handColor = [255, 255, 255, 200]; // Default white
        
        if (state.handsGrabbingWheel) {
          handColor = [0, 255, 0, 255]; // Green when grabbing
        } else if (Math.abs(state.depthLevel - steeringWheelDepth) < 0.03) { // Grab zone
          handColor = [255, 255, 0, 255]; // Yellow when close to wheel
        }
        
        p.stroke(handColor[0], handColor[1], handColor[2], handColor[3]);
        p.strokeWeight(8);
        p.point(0, currentDepthY);
        
        // Draw labels
        p.fill(255, 255, 255, 200);
        p.noStroke();
        p.textSize(14);
        p.textAlign(p.CENTER);
        
        // Steering wheel label
        p.fill(255, 215, 0, 200);
        p.text('STEERING WHEEL', 0, wheelDepthY - 15);
        
        // Current position label with percentage
        const depthPercentage = p.map(state.depthLevel, minDepth, maxDepth, 0, 100);
        p.fill(handColor[0], handColor[1], handColor[2], handColor[3]);
        p.text(`${depthPercentage.toFixed(0)}%`, 0, currentDepthY - 15);
        
        // Depth scale labels
        p.fill(255, 255, 255, 150);
        p.textSize(12);
        p.text('0% (CLOSE)', 0, 220); // Bottom = 0%
        p.text('100% (FAR)', 0, -220); // Top = 100%
        
        // Draw grab zone indicator
        if (Math.abs(state.depthLevel - steeringWheelDepth) < 0.03) {
          p.stroke(0, 255, 0, 100);
          p.strokeWeight(2);
          p.line(-30, wheelDepthY - 10, 30, wheelDepthY - 10);
          p.line(-30, wheelDepthY + 10, 30, wheelDepthY + 10);
          
          p.fill(0, 255, 0, 150);
          p.textSize(10);
          p.text('GRAB ZONE', 0, wheelDepthY + 25);
        }
        
        p.pop();
      };

      const drawControlStatus = (p: p5, state: GestureState) => {
        p.push();
        p.translate(0, -200, 0);
        
        // Draw control status background
        p.fill(0, 0, 0, 180);
        p.noStroke();
        p.rect(-150, -60, 300, 120, 10);
        
        // Draw status indicators
        const indicators = [];
        
        if (state.isSteering) {
          const direction = state.steeringDirection === 'left' ? '⬅️' : '➡️';
          indicators.push(`${direction} STEERING ${state.steeringPercentage.toFixed(0)}%`);
        }
        
        if (state.isAccelerating) {
          indicators.push('🚀 ACCEL');
        }
        
        if (state.isBraking) {
          indicators.push('🛑 BRAKE');
        }
        
        if (indicators.length === 0) {
          indicators.push('🎮 IDLE');
        }
        
        // Draw each indicator
        p.textSize(18);
        p.textAlign(p.CENTER);
        
        indicators.forEach((indicator, index) => {
          let color = [255, 255, 255, 200];
          
          if (indicator.includes('STEERING')) {
            color = [255, 215, 0, 255]; // Gold
          } else if (indicator.includes('ACCEL')) {
            color = [255, 68, 68, 255]; // Red
          } else if (indicator.includes('BRAKE')) {
            color = [255, 68, 68, 255]; // Red
          } else if (indicator.includes('IDLE')) {
            color = [128, 128, 128, 200]; // Gray
          }
          
          p.fill(color[0], color[1], color[2], color[3]);
          p.text(indicator, 0, index * 30 - 15);
        });
        
        p.pop();
      };

      const drawDebugInfo = (p: p5, state: GestureState) => {
        p.push();
        p.translate(-p.width/2 + 20, -p.height/2 + 20, 0);
        
        p.fill(255, 255, 255, 200);
        p.noStroke();
        p.textSize(16);
        p.textAlign(p.LEFT);
        
        const debugInfo = [
          `Steering: ${state.steeringDirection.toUpperCase()} ${state.steeringPercentage.toFixed(0)}%`,
          `Grabbing Wheel: ${state.handsGrabbingWheel ? 'YES' : 'NO'}`,
          `Left Fist: ${state.leftHandFist ? 'YES' : 'NO'}`,
          `Right Fist: ${state.rightHandFist ? 'YES' : 'NO'}`,
          `Accelerating: ${state.isAccelerating ? 'YES' : 'NO'}`,
          `Braking: ${state.isBraking ? 'YES' : 'NO'}`,
          `Steering Angle: ${state.steeringAngle.toFixed(2)}`,
          `Depth Level: ${state.depthLevel.toFixed(2)}`,
          `Last Key: ${lastKeyPress}`,
          `Keyboard Sim: ${enableKeyboardSimulation ? 'ON' : 'OFF'}`
        ];
        
        debugInfo.forEach((info, index) => {
          p.text(info, 0, index * 25);
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
  }, [showDebugInfo, steeringSensitivity, depthSensitivity, restingDepth, handsTogetherThreshold]);

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
      
      // Create and dispatch keyboard events
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

      // Dispatch events
      document.dispatchEvent(keyDownEvent);
      console.log(`⌨️ KEY DOWN: ${key.toUpperCase()} dispatched`);
      
      setTimeout(() => {
        document.dispatchEvent(keyUpEvent);
        console.log(`⌨️ KEY UP: ${key.toUpperCase()} dispatched`);
      }, 100);

      setLastKeyPress(key.toUpperCase());
    };

    // Simulate key presses based on gesture state
    if (gestureState.isSteering) {
      if (gestureState.steeringDirection === 'left') {
        simulateKeyPress('a');
      } else if (gestureState.steeringDirection === 'right') {
        simulateKeyPress('d');
      }
    }

    if (gestureState.isAccelerating) {
      simulateKeyPress('w');
    } else if (gestureState.isBraking) {
      simulateKeyPress('s');
    }

  }, [gestureState, enableKeyboardSimulation]);

  // Enhanced debug logging with visual indicators
  useEffect(() => {
    // Create visual indicators for each control state
    const indicators = [];
    
    if (gestureState.isSteering) {
      const direction = gestureState.steeringDirection === 'left' ? '⬅️' : '➡️';
      indicators.push(`${direction} STEERING ${gestureState.steeringDirection.toUpperCase()}`);
    }
    
    if (gestureState.isAccelerating) {
      indicators.push('🚀 ACCELERATING');
    }
    
    if (gestureState.isBraking) {
      indicators.push('🛑 BRAKING');
    }
    
    // Log with visual formatting
    if (indicators.length > 0) {
      const controlString = indicators.join(' | ');
      const depthInfo = `Depth: ${gestureState.depthLevel.toFixed(3)}`;
      const angleInfo = gestureState.isSteering ? `Angle: ${gestureState.steeringAngle.toFixed(3)}` : '';
      
      console.log(`🎮 ${controlString} | ${depthInfo}${angleInfo ? ` | ${angleInfo}` : ''}`);
      
      // Additional detailed logging for troubleshooting
      console.log('📊 DETAILS:', {
        'Hands Together': gestureState.isSteering ? '✅' : '❌',
        'Steering Direction': gestureState.steeringDirection,
        'Steering Angle': gestureState.steeringAngle.toFixed(3),
        'Depth Level': gestureState.depthLevel.toFixed(3),
        'Accelerating': gestureState.isAccelerating ? '✅' : '❌',
        'Braking': gestureState.isBraking ? '✅' : '❌',
        'Resting Depth': restingDepth.toFixed(3),
        'Depth Sensitivity': depthSensitivity.toFixed(1),
        'Steering Sensitivity': steeringSensitivity.toFixed(1),
        'Wheel Grabbed': isWheelGrabbed ? '✅' : '❌',
        'Wheel Distance': wheelGrabStartDistance.toFixed(3)
      });
    } else {
      // Log when no controls are active
      console.log('🎮 IDLE | No active controls');
    }
  }, [gestureState, restingDepth, depthSensitivity, steeringSensitivity, isWheelGrabbed, wheelGrabStartDistance]);

  // Position recording functions
  const recordCurrentPosition = () => {
    if (!leftHand?.landmarks || !rightHand?.landmarks) {
      alert('No hand data available to record position');
      return;
    }

    const leftWrist = leftHand.landmarks[0];
    const rightWrist = rightHand.landmarks[0];

    const newPosition: RecordedPosition = {
      name: positionName || `Position_${Date.now()}`,
      leftHand: { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z },
      rightHand: { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z },
      timestamp: Date.now()
    };

    setRecordedPositions(prev => [...prev, newPosition]);
    setPositionName('');
    setIsRecordingPosition(false);
    console.log(`📝 Position recorded: ${newPosition.name}`);
  };

  const deletePosition = (index: number) => {
    setRecordedPositions(prev => prev.filter((_, i) => i !== index));
  };

  const loadPosition = (position: RecordedPosition) => {
    // This would be used to set a target position for the hands
    console.log(`📝 Loading position: ${position.name}`);
    // You could implement position guidance here
  };

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
          🚗 Car Driving Controls
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
            Steering Sensitivity: {steeringSensitivity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={steeringSensitivity}
            onChange={(e) => setSteeringSensitivity(parseFloat(e.target.value))}
            style={{ width: '100%' }}
            aria-label="Steering sensitivity"
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc', display: 'block' }}>
            Depth Sensitivity: {depthSensitivity.toFixed(1)}
          </label>
          <input
            type="range"
            min="1.0"
            max="10.0"
            step="0.1"
            value={depthSensitivity}
            onChange={(e) => setDepthSensitivity(parseFloat(e.target.value))}
            style={{ width: '100%' }}
            aria-label="Depth sensitivity"
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc', display: 'block' }}>
            Hands Together Threshold: {handsTogetherThreshold.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.05"
            max="0.3"
            step="0.01"
            value={handsTogetherThreshold}
            onChange={(e) => setHandsTogetherThreshold(parseFloat(e.target.value))}
            style={{ width: '100%' }}
            aria-label="Hands together threshold"
          />
        </div>



        {/* Calibration Controls */}
        <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '5px', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
          <div style={{ fontSize: '11px', marginBottom: '8px', color: '#FFD700', fontWeight: 'bold' }}>
            🎯 CALIBRATION
          </div>
          
          {!isCalibrating ? (
            <button
              onClick={() => {
                setIsCalibrating(true);
                setCalibrationStep('minDepth');
                console.log('🎯 Starting calibration...');
              }}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '10px',
                width: '100%'
              }}
            >
              Start Calibration
            </button>
          ) : (
            <div>
              <div style={{ marginBottom: '8px', fontSize: '10px', color: '#FFD700' }}>
                {calibrationStep === 'minDepth' && '📏 Move hands CLOSE to camera (0% position)'}
                {calibrationStep === 'maxDepth' && '📏 Move hands FAR from camera (100% position)'}
                {calibrationStep === 'steeringWheel' && '🎮 Position hands at STEERING WHEEL depth'}
              </div>
              
              <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
                <button
                  onClick={() => {
                    if (calibrationStep === 'minDepth') {
                      setCalibratedMinDepth(gestureState.depthLevel);
                      setCalibrationStep('maxDepth');
                      console.log(`🎯 Min depth set to: ${gestureState.depthLevel.toFixed(3)}`);
                    } else if (calibrationStep === 'maxDepth') {
                      setCalibratedMaxDepth(gestureState.depthLevel);
                      setCalibrationStep('steeringWheel');
                      console.log(`🎯 Max depth set to: ${gestureState.depthLevel.toFixed(3)}`);
                    } else if (calibrationStep === 'steeringWheel') {
                      setCalibratedSteeringWheelDepth(gestureState.depthLevel);
                      setIsCalibrating(false);
                      setCalibrationStep('idle');
                      console.log(`🎯 Steering wheel depth set to: ${gestureState.depthLevel.toFixed(3)}`);
                      console.log('🎯 Calibration complete!');
                    }
                  }}
                  style={{
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    flex: 1
                  }}
                >
                  Set Position
                </button>
                
                <button
                  onClick={() => {
                    setIsCalibrating(false);
                    setCalibrationStep('idle');
                    console.log('❌ Calibration cancelled');
                  }}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    flex: 1
                  }}
                >
                  Cancel
                </button>
              </div>
              
              <div style={{ fontSize: '9px', color: '#ccc' }}>
                Current: {gestureState.depthLevel.toFixed(3)}
              </div>
            </div>
          )}
        </div>

        {/* Position Recording Controls */}
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          background: 'rgba(0, 150, 255, 0.1)', 
          borderRadius: '5px',
          border: '1px solid rgba(0, 150, 255, 0.3)'
        }}>
          <div style={{ fontSize: '11px', marginBottom: '8px', color: '#0096FF', fontWeight: 'bold' }}>
            📝 POSITION RECORDING
          </div>
          
          {!isRecordingPosition ? (
            <button
              onClick={() => setIsRecordingPosition(true)}
              style={{
                background: '#0096FF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '10px',
                width: '100%',
                marginBottom: '8px'
              }}
            >
              Record New Position
            </button>
          ) : (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Position name..."
                value={positionName}
                onChange={(e) => setPositionName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: '10px',
                  borderRadius: '3px',
                  border: '1px solid #ccc',
                  marginBottom: '5px'
                }}
              />
              <div style={{ display: 'flex', gap: '3px' }}>
                <button
                  onClick={recordCurrentPosition}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    flex: 1
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsRecordingPosition(false);
                    setPositionName('');
                  }}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    flex: 1
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Recorded Positions List */}
          {recordedPositions.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', color: '#0096FF', marginBottom: '5px' }}>
                Recorded Positions ({recordedPositions.length}):
              </div>
              {recordedPositions.map((position, index) => (
                <div key={index} style={{ 
                  fontSize: '9px', 
                  padding: '3px 6px', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '3px',
                  marginBottom: '3px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#fff' }}>{position.name}</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      onClick={() => loadPosition(position)}
                      style={{
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        padding: '2px 4px',
                        cursor: 'pointer',
                        fontSize: '8px'
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePosition(index)}
                      style={{
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        padding: '2px 4px',
                        cursor: 'pointer',
                        fontSize: '8px'
                      }}
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '10px' }}>
          <div>🎮 Controls:</div>
          <div>• Make fists + put hands together = Grab steering wheel</div>
          <div>• Rotate hands in circular motion = Steer left/right (A/D)</div>
          <div>• Release fists = Move hands forward/back for gas/brake (W/S)</div>
          <div>• Distance locked when grabbing wheel</div>
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
              color: gestureState.isSteering ? '#FFD700' : '#666',
              fontWeight: gestureState.isSteering ? 'bold' : 'normal'
            }}>
              {gestureState.isSteering ? 
                `⬅️➡️ STEERING: ${gestureState.steeringDirection.toUpperCase()} ${gestureState.steeringPercentage.toFixed(0)}%` : 
                '⬅️➡️ STEERING: IDLE'
              }
            </div>
            
            <div style={{ 
              color: gestureState.handsGrabbingWheel ? '#00FF00' : '#666',
              fontWeight: gestureState.handsGrabbingWheel ? 'bold' : 'normal'
            }}>
              {gestureState.handsGrabbingWheel ? '🤜🤛 GRABBING WHEEL' : '🤜🤛 GRAB: IDLE'}
            </div>
            
            <div style={{ 
              color: isWheelGrabbed ? '#00FF00' : '#666',
              fontWeight: isWheelGrabbed ? 'bold' : 'normal'
            }}>
              {isWheelGrabbed ? `🔒 DISTANCE LOCKED: ${wheelGrabStartDistance.toFixed(3)}` : '🔓 DISTANCE: UNLOCKED'}
            </div>
            
            <div style={{ 
              color: gestureState.isAccelerating ? '#00FF00' : '#666',
              fontWeight: gestureState.isAccelerating ? 'bold' : 'normal'
            }}>
              {gestureState.isAccelerating ? '🚀 ACCELERATING' : '🚀 ACCEL: IDLE'}
            </div>
            
            <div style={{ 
              color: gestureState.isBraking ? '#FF4444' : '#666',
              fontWeight: gestureState.isBraking ? 'bold' : 'normal'
            }}>
              {gestureState.isBraking ? '🛑 BRAKING' : '🛑 BRAKE: IDLE'}
            </div>
            
            <div style={{ color: '#888', marginTop: '5px', fontSize: '9px' }}>
              Depth: {gestureState.depthLevel.toFixed(3)} | 
              Angle: {gestureState.steeringAngle.toFixed(3)} |
              Wheel Angle: {gestureState.wheelGrabAngle.toFixed(3)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 