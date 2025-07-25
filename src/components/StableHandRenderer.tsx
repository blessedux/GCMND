'use client';

import { useEffect, useRef } from 'react';
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

      const renderHand = (p: p5, landmarks: any[], color: number[], handType: string) => {
        if (!landmarks || landmarks.length < 21) return;

        p.push();
        
        // Set up lighting
        p.ambientLight(60, 60, 60);
        p.directionalLight(255, 255, 255, 0, 0, -1);
        
        // Render each landmark as a simple sphere
        for (let i = 0; i < landmarks.length; i++) {
          const landmark = landmarks[i];
          if (!landmark) continue;

          // Use stable coordinate mapping with correct left/right positioning
          const x = landmark.x * p.width - p.width / 2;
          const y = landmark.y * p.height - p.height / 2;
          const z = landmark.z * 50;

          p.push();
          p.translate(x, y, z);
          
          // Different sizes for different landmark types
          let size = 0.02;
          if (i === 0) size = 0.04; // Wrist
          else if (i % 4 === 0) size = 0.03; // Finger tips
          else size = 0.02; // Other joints

          p.fill(color[0], color[1], color[2], 200);
          p.noStroke();
          p.sphere(size);
          p.pop();
        }

        // Draw connections between landmarks
        p.stroke(color[0], color[1], color[2], 150);
        p.strokeWeight(2);
        p.noFill();

        // Hand connections (simplified)
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
             const x1 = landmarks[start].x * p.width - p.width / 2;
             const y1 = landmarks[start].y * p.height - p.height / 2;
             const z1 = landmarks[start].z * 50;
             
             const x2 = landmarks[end].x * p.width - p.width / 2;
             const y2 = landmarks[end].y * p.height - p.height / 2;
             const z2 = landmarks[end].z * 50;

            p.line(x1, y1, z1, x2, y2, z2);
          }
        }

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
  }, []); // Empty dependency array - no React re-renders

  // Update hands data without triggering re-renders
  useEffect(() => {
    handsDataRef.current.left = leftHand?.landmarks || null;
    handsDataRef.current.right = rightHand?.landmarks || null;
  }, [leftHand, rightHand]);

  return <div ref={canvasRef} />;
} 