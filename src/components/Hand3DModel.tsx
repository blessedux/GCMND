'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';
import { HandData } from '@/types';

interface Hand3DModelProps {
  leftHand: HandData | null;
  rightHand: HandData | null;
}

export default function Hand3DModel({ leftHand, rightHand }: Hand3DModelProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  
  // Smoothing and stabilization refs
  const previousLeftHand = useRef<any[] | null>(null);
  const previousRightHand = useRef<any[] | null>(null);
  const velocityLeft = useRef<any[]>([]);
  const velocityRight = useRef<any[]>([]);
  const frameCount = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p: p5) => {
      let handTexture: p5.Image;

      p.preload = () => {
        // Create a realistic hand texture programmatically
        handTexture = p.createImage(128, 128);
        handTexture.loadPixels();
        
        for (let y = 0; y < handTexture.height; y++) {
          for (let x = 0; x < handTexture.width; x++) {
            const index = (y * handTexture.width + x) * 4;
            
            // Create skin-like color with variation
            const baseR = 255;
            const baseG = 200 + Math.sin(x * 0.1) * 20;
            const baseB = 150 + Math.cos(y * 0.1) * 15;
            
            // Add some texture variation
            const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 10;
            
            handTexture.pixels[index] = Math.max(200, Math.min(255, baseR + noise));     // R
            handTexture.pixels[index + 1] = Math.max(180, Math.min(220, baseG + noise)); // G
            handTexture.pixels[index + 2] = Math.max(140, Math.min(170, baseB + noise)); // B
            handTexture.pixels[index + 3] = 255; // A
          }
        }
        handTexture.updatePixels();
      };

      p.setup = () => {
        p.createCanvas(800, 640, p.WEBGL);
        p.frameRate(30); // Lower frame rate for stability
      };

      p.draw = () => {
        p.clear();
        p.push();
        p.translate(0, 0, -100);
        
        // Set up lighting
        p.ambientLight(60, 60, 60);
        p.directionalLight(255, 255, 255, 0, 0, -1);
        p.pointLight(255, 255, 255, 0, 0, 0);
        
        // Apply smoothing to landmarks
        let smoothedLeftLandmarks = null;
        let smoothedRightLandmarks = null;
        
        if (leftHand) {
          smoothedLeftLandmarks = smoothLandmarks(leftHand.landmarks, previousLeftHand.current, velocityLeft.current, 0.25);
          previousLeftHand.current = smoothedLeftLandmarks;
        }
        
        if (rightHand) {
          smoothedRightLandmarks = smoothLandmarks(rightHand.landmarks, previousRightHand.current, velocityRight.current, 0.25);
          previousRightHand.current = smoothedRightLandmarks;
        }
        
        // Render left hand with smoothed landmarks
        if (smoothedLeftLandmarks) {
          renderHand3D(p, smoothedLeftLandmarks, [0, 255, 0], 'left');
        }
        
        // Render right hand with smoothed landmarks
        if (smoothedRightLandmarks) {
          renderHand3D(p, smoothedRightLandmarks, [0, 0, 255], 'right');
        }
        
        p.pop();
      };

      const renderHand3D = (p: p5, landmarks: any[], color: number[], handType: string) => {
        if (!landmarks || landmarks.length < 21) return;

        p.push();
        
        // Calculate hand center and orientation
        const handCenter = calculateHandCenter(landmarks);
        const handRotation = calculateHandRotation(landmarks);
        const handScale = calculateHandScale(landmarks);
        
        // Transform to hand position with stable coordinate mapping
        const screenX = -handCenter.x * p.width + p.width / 2;
        const screenY = handCenter.y * p.height - p.height / 2;
        const screenZ = handCenter.z * 50; // Reduced depth for stability
        
        p.translate(screenX, screenY, screenZ);
        p.rotateX(handRotation.x);
        p.rotateY(handRotation.y);
        p.rotateZ(handRotation.z);
        p.scale(handScale);
        
        // Render palm with texture
        renderPalm(p, landmarks, color);
        
        // Render fingers with texture
        renderFingers(p, landmarks, color);
        
        p.pop();
      };

      const calculateHandCenter = (landmarks: any[]) => {
        // Use wrist (landmark 0) as center
        return {
          x: landmarks[0].x,
          y: landmarks[0].y,
          z: landmarks[0].z
        };
      };

      const calculateHandRotation = (landmarks: any[]) => {
        // Calculate hand orientation based on palm landmarks
        const wrist = landmarks[0];
        const middleFinger = landmarks[12];
        const indexFinger = landmarks[8];
        
        // Calculate palm normal
        const palmNormal = p.createVector(
          middleFinger.x - wrist.x,
          middleFinger.y - wrist.y,
          middleFinger.z - wrist.z
        );
        
        return {
          x: Math.atan2(palmNormal.y, palmNormal.z),
          y: Math.atan2(palmNormal.x, palmNormal.z),
          z: Math.atan2(palmNormal.y, palmNormal.x)
        };
      };

      const calculateHandScale = (landmarks: any[]) => {
        // Calculate hand size based on palm width
        const wrist = landmarks[0];
        const pinky = landmarks[17];
        const thumb = landmarks[4];
        
        const palmWidth = Math.abs(pinky.x - thumb.x);
        return Math.max(0.5, Math.min(2.0, palmWidth * 10));
      };

      const renderPalm = (p: p5, landmarks: any[], color: number[]) => {
        // Create palm using textured spheres at key points
        const palmLandmarks = [0, 5, 9, 13, 17]; // Wrist and finger bases
        
        p.push();
        p.texture(handTexture);
        p.noStroke();
        
        // Draw palm center with texture
        const wrist = landmarks[0];
        const palmCenter = {
          x: (wrist.x - 0.5) * 1.5, // Reduced scale for stability
          y: (wrist.y - 0.5) * 1.5,
          z: wrist.z * 0.5 // Reduced depth for stability
        };
        
        p.push();
        p.translate(palmCenter.x, palmCenter.y, palmCenter.z);
        p.fill(255, 200, 150, 200); // Skin color
        p.sphere(0.08);
        p.pop();
        
        // Draw palm joints with texture
        for (let i = 1; i < palmLandmarks.length; i++) {
          const landmark = landmarks[palmLandmarks[i]];
          const x = (landmark.x - 0.5) * 2;
          const y = (landmark.y - 0.5) * 2;
          const z = landmark.z;
          
          p.push();
          p.translate(x, y, z);
          p.fill(255, 200, 150, 180); // Skin color
          p.sphere(0.05);
          p.pop();
        }
        
        // Draw palm connections with skin color
        p.noFill();
        p.stroke(255, 200, 150, 120);
        p.strokeWeight(4);
        
        for (let i = 0; i < palmLandmarks.length - 1; i++) {
          const current = landmarks[palmLandmarks[i]];
          const next = landmarks[palmLandmarks[i + 1]];
          
          const x1 = (current.x - 0.5) * 2;
          const y1 = (current.y - 0.5) * 2;
          const z1 = current.z;
          
          const x2 = (next.x - 0.5) * 2;
          const y2 = (next.y - 0.5) * 2;
          const z2 = next.z;
          
          p.line(x1, y1, z1, x2, y2, z2);
        }
        
        p.pop();
      };

      const renderFingers = (p: p5, landmarks: any[], color: number[]) => {
        // Finger landmark indices
        const fingerIndices = [
          [4, 3, 2, 1, 0],    // Thumb
          [8, 7, 6, 5],       // Index
          [12, 11, 10, 9],    // Middle
          [16, 15, 14, 13],   // Ring
          [20, 19, 18, 17]    // Pinky
        ];

        fingerIndices.forEach((finger, fingerIndex) => {
          renderFinger(p, landmarks, finger, color, fingerIndex);
        });
      };

      const renderFinger = (p: p5, landmarks: any[], fingerIndices: number[], color: number[], fingerIndex: number) => {
        p.push();
        p.texture(handTexture);
        
        // Draw finger joints as textured spheres
        for (let i = 0; i < fingerIndices.length; i++) {
          const landmark = landmarks[fingerIndices[i]];
          const x = (landmark.x - 0.5) * 2;
          const y = (landmark.y - 0.5) * 2;
          const z = landmark.z;
          
          p.push();
          p.translate(x, y, z);
          const jointSize = 0.025 * (1 - i * 0.1); // Smaller towards tip
          p.fill(255, 200, 150, 200); // Skin color
          p.sphere(jointSize);
          p.pop();
        }
        
        // Draw finger connections with skin color
        p.noFill();
        p.stroke(255, 200, 150, 150);
        p.strokeWeight(3);
        
        for (let i = 0; i < fingerIndices.length - 1; i++) {
          const current = landmarks[fingerIndices[i]];
          const next = landmarks[fingerIndices[i + 1]];
          
          const x1 = (current.x - 0.5) * 2;
          const y1 = (current.y - 0.5) * 2;
          const z1 = current.z;
          
          const x2 = (next.x - 0.5) * 2;
          const y2 = (next.y - 0.5) * 2;
          const z2 = next.z;
          
          p.line(x1, y1, z1, x2, y2, z2);
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
  }, [leftHand, rightHand]);

  // Smoothing function with velocity-based interpolation
  const smoothLandmarks = (currentLandmarks: any[], previousLandmarks: any[] | null, velocities: any[], smoothingFactor: number = 0.3) => {
    if (!currentLandmarks || currentLandmarks.length === 0) {
      return previousLandmarks;
    }
    
    if (!previousLandmarks || previousLandmarks.length !== currentLandmarks.length) {
      // Initialize velocities
      velocities.length = currentLandmarks.length;
      for (let i = 0; i < currentLandmarks.length; i++) {
        velocities[i] = { x: 0, y: 0, z: 0 };
      }
      return currentLandmarks;
    }
    
    const smoothedLandmarks = [];
    
    for (let i = 0; i < currentLandmarks.length; i++) {
      const current = currentLandmarks[i];
      const previous = previousLandmarks[i];
      const velocity = velocities[i];
      
      // Calculate velocity (change in position)
      const deltaX = current.x - previous.x;
      const deltaY = current.y - previous.y;
      const deltaZ = current.z - previous.z;
      
      // Update velocity with smoothing
      velocity.x = velocity.x * 0.8 + deltaX * 0.2;
      velocity.y = velocity.y * 0.8 + deltaY * 0.2;
      velocity.z = velocity.z * 0.8 + deltaZ * 0.2;
      
      // Apply velocity-based smoothing
      const smoothedX = previous.x + velocity.x * smoothingFactor;
      const smoothedY = previous.y + velocity.y * smoothingFactor;
      const smoothedZ = previous.z + velocity.z * smoothingFactor;
      
      // Clamp to prevent extreme values
      const clampedX = Math.max(0, Math.min(1, smoothedX));
      const clampedY = Math.max(0, Math.min(1, smoothedY));
      const clampedZ = Math.max(-1, Math.min(1, smoothedZ));
      
      smoothedLandmarks.push({
        x: clampedX,
        y: clampedY,
        z: clampedZ
      });
    }
    
    return smoothedLandmarks;
  };

  return <div ref={canvasRef} />;
} 