'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MultiHandData } from '@/types';

interface GLBHandRendererProps {
  multiHandData: MultiHandData;
}

// MediaPipe landmark indices for hand mapping
const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

// Simplified bone mapping - we'll match by index position
const FINGER_BONES = [
  // Thumb bones (3 segments)
  [HAND_LANDMARKS.THUMB_CMC, HAND_LANDMARKS.THUMB_MCP],
  [HAND_LANDMARKS.THUMB_MCP, HAND_LANDMARKS.THUMB_IP],
  [HAND_LANDMARKS.THUMB_IP, HAND_LANDMARKS.THUMB_TIP],
  
  // Index finger bones (3 segments)
  [HAND_LANDMARKS.INDEX_FINGER_MCP, HAND_LANDMARKS.INDEX_FINGER_PIP],
  [HAND_LANDMARKS.INDEX_FINGER_PIP, HAND_LANDMARKS.INDEX_FINGER_DIP],
  [HAND_LANDMARKS.INDEX_FINGER_DIP, HAND_LANDMARKS.INDEX_FINGER_TIP],
  
  // Middle finger bones (3 segments)
  [HAND_LANDMARKS.MIDDLE_FINGER_MCP, HAND_LANDMARKS.MIDDLE_FINGER_PIP],
  [HAND_LANDMARKS.MIDDLE_FINGER_PIP, HAND_LANDMARKS.MIDDLE_FINGER_DIP],
  [HAND_LANDMARKS.MIDDLE_FINGER_DIP, HAND_LANDMARKS.MIDDLE_FINGER_TIP],
  
  // Ring finger bones (3 segments)
  [HAND_LANDMARKS.RING_FINGER_MCP, HAND_LANDMARKS.RING_FINGER_PIP],
  [HAND_LANDMARKS.RING_FINGER_PIP, HAND_LANDMARKS.RING_FINGER_DIP],
  [HAND_LANDMARKS.RING_FINGER_DIP, HAND_LANDMARKS.RING_FINGER_TIP],
  
  // Pinky bones (3 segments)
  [HAND_LANDMARKS.PINKY_MCP, HAND_LANDMARKS.PINKY_PIP],
  [HAND_LANDMARKS.PINKY_PIP, HAND_LANDMARKS.PINKY_DIP],
  [HAND_LANDMARKS.PINKY_DIP, HAND_LANDMARKS.PINKY_TIP],
];

export default function GLBHandRenderer({ multiHandData }: GLBHandRendererProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const leftHandRef = useRef<THREE.Group | null>(null);
  const rightHandRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const previousLeftHandRef = useRef<any>(null);
  const previousRightHandRef = useRef<any>(null);

  // Smooth interpolation function
  const smoothLandmarks = (current: any, previous: any, factor: number = 0.3) => {
    if (!previous) return current;
    
    const smoothed = { ...current };
    for (let i = 0; i < current.length; i++) {
      if (current[i] && previous[i]) {
        smoothed[i] = {
          x: previous[i].x * (1 - factor) + current[i].x * factor,
          y: previous[i].y * (1 - factor) + current[i].y * factor,
          z: previous[i].z * (1 - factor) + current[i].z * factor,
        };
      }
    }
    return smoothed;
  };

  // Calculate bone rotation from two points with simplified approach
  const calculateBoneRotation = (start: any, end: any, boneName: string) => {
    if (!start || !end) return new THREE.Euler();
    
    // Simple coordinate conversion
    const startPos = new THREE.Vector3(
      start.x - 0.5,  // Center around 0
      -(start.y - 0.5),  // Flip Y and center
      start.z * 0.5   // Scale Z
    );
    
    const endPos = new THREE.Vector3(
      end.x - 0.5,
      -(end.y - 0.5),
      end.z * 0.5
    );
    
    const direction = new THREE.Vector3().subVectors(endPos, startPos);
    const length = direction.length();
    
    if (length < 0.001) return new THREE.Euler();
    
    direction.normalize();
    
    // Simple rotation calculation
    const angle = Math.atan2(direction.y, direction.x);
    const euler = new THREE.Euler(0, 0, angle);
    
    console.log(`🔄 Bone ${boneName}: direction=(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}), angle=${(angle * 180 / Math.PI).toFixed(1)}°`);
    
    return euler;
  };

  // Update hand model based on landmarks
  const updateHandModel = (handModel: THREE.Group, landmarks: any, handedness: string) => {
    if (!landmarks || landmarks.length === 0) {
      console.log(`🤚 No landmarks for ${handedness} hand`);
      return;
    }
    
    console.log(`🤚 Updating ${handedness} hand with ${landmarks.length} landmarks`);

    // Apply smoothing
    const smoothedLandmarks = smoothLandmarks(
      landmarks,
      handedness === 'Left' ? previousLeftHandRef.current : previousRightHandRef.current
    );
    
    // Store for next frame
    if (handedness === 'Left') {
      previousLeftHandRef.current = smoothedLandmarks;
    } else {
      previousRightHandRef.current = smoothedLandmarks;
    }

    let bonesUpdated = 0;
    const bones: THREE.Bone[] = [];
    
    // Collect all bones first
    handModel.traverse((child) => {
      if (child instanceof THREE.Bone) {
        bones.push(child);
      }
    });
    
    console.log(`🦴 Found ${bones.length} bones in ${handedness} hand model`);
    
    // Update bones using index-based mapping
    bones.forEach((bone, index) => {
      if (index < FINGER_BONES.length) {
        const boneMapping = FINGER_BONES[index];
        const startLandmark = smoothedLandmarks[boneMapping[0]];
        const endLandmark = smoothedLandmarks[boneMapping[1]];
        
        if (startLandmark && endLandmark) {
          const rotation = calculateBoneRotation(startLandmark, endLandmark, bone.name);
          bone.rotation.copy(rotation);
          bonesUpdated++;
          console.log(`🦴 Updated bone ${index} (${bone.name}) with rotation:`, rotation);
        }
      }
    });
    
    console.log(`✅ Updated ${bonesUpdated} bones for ${handedness} hand`);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Load GLB models
    const loader = new GLTFLoader();
    
    // Load left hand
    loader.load('/rigged_hand.glb', 
      (gltf) => {
        console.log('✅ Left hand GLB loaded successfully:', gltf);
        const leftHand = gltf.scene.clone();
        leftHand.scale.setScalar(0.5);
        leftHand.position.set(-2, 0, 0);
        
        // Debug: Log all bones in the model
        leftHand.traverse((child) => {
          if (child instanceof THREE.Bone) {
            console.log('🦴 Left hand bone:', child.name);
          }
        });
        
        // Rotate the hand for better visibility
        leftHand.rotation.y = Math.PI / 4;
        
        scene.add(leftHand);
        leftHandRef.current = leftHand;
      },
      (progress) => {
        console.log('📦 Loading left hand GLB:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
      },
      (error) => {
        console.error('❌ Error loading left hand GLB:', error);
      }
    );

    // Load right hand
    loader.load('/rigged_hand.glb', 
      (gltf) => {
        console.log('✅ Right hand GLB loaded successfully:', gltf);
        const rightHand = gltf.scene.clone();
        rightHand.scale.setScalar(0.5);
        rightHand.position.set(2, 0, 0);
        
        // Rotate the hand for better visibility
        rightHand.rotation.y = -Math.PI / 4;
        
        scene.add(rightHand);
        rightHandRef.current = rightHand;
      },
      (progress) => {
        console.log('📦 Loading right hand GLB:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
      },
      (error) => {
        console.error('❌ Error loading right hand GLB:', error);
      }
    );

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Debug: Log hand data
      if (multiHandData.leftHand) {
        console.log('🖐️ Left hand data:', multiHandData.leftHand.landmarks.length, 'landmarks');
      }
      if (multiHandData.rightHand) {
        console.log('🖐️ Right hand data:', multiHandData.rightHand.landmarks.length, 'landmarks');
      }
      
      // Update hands based on MediaPipe data
      if (multiHandData.leftHand && leftHandRef.current) {
        updateHandModel(leftHandRef.current, multiHandData.leftHand.landmarks, 'Left');
      }
      
      if (multiHandData.rightHand && rightHandRef.current) {
        updateHandModel(rightHandRef.current, multiHandData.rightHand.landmarks, 'Right');
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
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
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

  // Update when hand data changes
  useEffect(() => {
    // Hand data updates are handled in the animation loop
  }, [multiHandData]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }} 
    />
  );
} 