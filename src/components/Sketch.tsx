'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';
import { MultiHandData } from '@/types';

interface SketchProps {
  multiHandData: MultiHandData;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export default function Sketch({ multiHandData, videoRef }: SketchProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  // Removed complex smoothing references for simpler approach

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p: p5) => {
      let objectVector: p5.Vector;
      let objectSize = 1;
      let lastObjectSize = 1;
      let objectSizeSmooth = 0;
      let grabbing = false;
      let locked = false;

      p.setup = () => {
        objectVector = p.createVector(100, 0, 0);
        p.createCanvas(800, 640, p.WEBGL);
        p.frameRate(60); // Set to 60 FPS for smooth rendering
        
        // Use system font instead of loading custom font
        try {
          p.textFont('system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
        } catch (error) {
          console.warn('Font loading failed, using default:', error);
          // Fallback to default font
          p.textFont('Arial');
        }
        p.textSize(12);
      };

      p.draw = () => {
        p.clear();
        p.push();
        p.translate(0, 0, -100);
        p.pop();

        // Enhanced gesture display
        p.strokeWeight(5);
        
        // Color based on gesture type (using primary hand)
        let gestureColor;
        const primaryHand = multiHandData.leftHand || multiHandData.rightHand;
        
        if (primaryHand) {
          switch(primaryHand.gesture) {
            case "pinch":
              gestureColor = p.color(255, 0, 0); // Red
              break;
            case "fist":
              gestureColor = p.color(255, 165, 0); // Orange
              break;
            case "openHand":
              gestureColor = p.color(0, 255, 0); // Green
              break;
            case "pointing":
              gestureColor = p.color(0, 255, 255); // Cyan
              break;
            case "victory":
              gestureColor = p.color(255, 0, 255); // Magenta
              break;
            default:
              gestureColor = p.color(128, 128, 128); // Gray
          }
        } else {
          gestureColor = p.color(128, 128, 128); // Gray
        }
        
        p.stroke(gestureColor);
        
        // Draw gesture indicator line
        const lineLength = primaryHand ? primaryHand.confidence * 300 : 0;
        p.line(0, 0, lineLength, 0);

        // Draw object which is being dragged
        p.push();
        p.fill(0, 0, 255, 100);
        p.stroke(0, 0, 255);
        p.translate(objectVector.x, objectVector.y, objectVector.z);
        p.ellipse(
          0,
          0,
          100 * p.map(objectVector.z, 0.1, -0.1, 0.1, objectSizeSmooth),
          100 * p.map(objectVector.z, 0.1, -0.1, 0.1, objectSizeSmooth)
        );
        p.pop();

        // Draw landmarks
        displayResults(p);

        // Enhanced gesture-based interaction
        if (primaryHand?.gesture === "pinch") {
          grabbing = true;
        } else {
          grabbing = false;
        }

        // Handle grabbing interaction with the object
        if (grabbing && primaryHand) {
          // Use thumb tip (4) and index tip (8) for pinch position
          const thumbTip = primaryHand.landmarks[4];
          const indexTip = primaryHand.landmarks[8];
          
          // Calculate pinch center position
          const pinchX = (thumbTip.x + indexTip.x) / 2;
          const pinchY = (thumbTip.y + indexTip.y) / 2;
          const pinchZ = (thumbTip.z + indexTip.z) / 2;
          
          // Map to world coordinates
          let pinchVector = p.createVector(
            pinchX * p.width - p.width / 2,
            pinchY * p.height - p.height / 2,
            pinchZ
          );
          
          if (
            p.dist(pinchVector.x, pinchVector.y, objectVector.x, objectVector.y) < 50 &&
            locked == false
          ) {
            locked = true;
            objectSize = 2;
          }
          if (locked) {
            objectVector.x = pinchVector.x;
            objectVector.y = pinchVector.y;
            objectVector.z = pinchVector.z;
          }
        } else {
          locked = false;
          objectSize = 1;
        }

        // Smooth object size
        objectSizeSmooth = objectSize * 0.5 + lastObjectSize * 0.5;
        lastObjectSize = objectSizeSmooth;

        // Draw privacy indicator only
        drawPrivacyIndicator(p);
      };

      // Simple and stable landmark processing (based on reference code)
      const processLandmarks = (landmarks: any[]) => {
        if (!landmarks || landmarks.length === 0) return null;
        
        // Simple mapping without complex smoothing
        return landmarks.map(landmark => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z
        }));
      };

      function displayResults(p: p5) {
        // Draw left hand landmarks (simple and stable approach)
        if (multiHandData.leftHand) {
          const leftLandmarks = processLandmarks(multiHandData.leftHand.landmarks);
          
          if (leftLandmarks) {
            // Draw left hand landmarks (green) - based on reference code
            p.stroke(0, 255, 0);
            p.strokeWeight(5);
            p.fill(0, 255, 0, 100);
            
            for (let i = 0; i < leftLandmarks.length; i++) {
              const landmark = leftLandmarks[i];
              // Use mirrored coordinates like reference code for better stability
              const x = -landmark.x * p.width + p.width / 2;
              const y = landmark.y * p.height - p.height / 2;
              const z = landmark.z;
              
              // Draw simple points like reference code
              p.point(x, y, z);
            }
            
            // Draw hand connections
            drawHandConnections(p, leftLandmarks, 0, 255, 0);
          }
        }
        
        // Draw right hand landmarks (simple and stable approach)
        if (multiHandData.rightHand) {
          const rightLandmarks = processLandmarks(multiHandData.rightHand.landmarks);
          
          if (rightLandmarks) {
            // Draw right hand landmarks (blue) - based on reference code
            p.stroke(0, 0, 255);
            p.strokeWeight(5);
            p.fill(0, 0, 255, 100);
            
            for (let i = 0; i < rightLandmarks.length; i++) {
              const landmark = rightLandmarks[i];
              // Use mirrored coordinates like reference code for better stability
              const x = -landmark.x * p.width + p.width / 2;
              const y = landmark.y * p.height - p.height / 2;
              const z = landmark.z;
              
              // Draw simple points like reference code
              p.point(x, y, z);
            }
            
            // Draw hand connections
            drawHandConnections(p, rightLandmarks, 0, 0, 255);
          }
        }
      }

      function drawHandConnections(p: p5, landmarks: any[], r: number, g: number, b: number) {
        // MediaPipe hand connections (finger bones)
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
          // Palm connections
          [5, 9], [9, 13], [13, 17]
        ];

        p.stroke(r, g, b, 150);
        p.strokeWeight(2);
        p.noFill();

        for (const [start, end] of connections) {
          if (landmarks[start] && landmarks[end]) {
            // Use mirrored coordinates like reference code
            const startX = -landmarks[start].x * p.width + p.width / 2;
            const startY = landmarks[start].y * p.height - p.height / 2;
            const startZ = landmarks[start].z;
            const endX = -landmarks[end].x * p.width + p.width / 2;
            const endY = landmarks[end].y * p.height - p.height / 2;
            const endZ = landmarks[end].z;

            p.line(startX, startY, startZ, endX, endY, endZ);
          }
        }
      }

      function drawGestureDebug(p: p5) {
        p.push();
        p.fill(255);
        p.textAlign(p.LEFT);
        p.textSize(14);
        
        let yPos = -p.height/2 + 20;
        p.text("Multi-Hand Gesture Debug:", -p.width/2 + 10, yPos);
        yPos += 20;
        
        // Left hand info
        if (multiHandData.leftHand) {
          p.text(`Left Hand: ${multiHandData.leftHand.gesture} (${Math.round(multiHandData.leftHand.confidence * 100)}%)`, -p.width/2 + 10, yPos);
          yPos += 15;
        } else {
          p.text("Left Hand: Not detected", -p.width/2 + 10, yPos);
          yPos += 15;
        }
        
        // Right hand info
        if (multiHandData.rightHand) {
          p.text(`Right Hand: ${multiHandData.rightHand.gesture} (${Math.round(multiHandData.rightHand.confidence * 100)}%)`, -p.width/2 + 10, yPos);
          yPos += 15;
        } else {
          p.text("Right Hand: Not detected", -p.width/2 + 10, yPos);
          yPos += 15;
        }
        
        // Combined info
        yPos += 10;
        const primaryHand = multiHandData.leftHand || multiHandData.rightHand;
        p.text(`Primary: ${primaryHand?.gesture || 'None'}`, -p.width/2 + 10, yPos);
        yPos += 15;
        p.text(`Confidence: ${Math.round((primaryHand?.confidence || 0) * 100)}%`, -p.width/2 + 10, yPos);
        yPos += 15;
        p.text(`Hands Detected: ${multiHandData.totalHands}`, -p.width/2 + 10, yPos);
        
        p.pop();
      }

      function drawPrivacyIndicator(p: p5) {
        p.push();
        p.fill(0, 255, 0, 150);
        p.textAlign(p.RIGHT);
        p.textSize(12);
        
        // Draw privacy indicator in top-right corner
        p.text("Privacy Mode: Hand Tracking Only", p.width/2 - 10, -p.height/2 + 20);
        
        p.pop();
      }
    };

    p5InstanceRef.current = new p5(sketch, canvasRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [multiHandData]);

  return <div ref={canvasRef} />;
} 