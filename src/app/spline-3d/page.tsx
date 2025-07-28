'use client';

import { useState, useEffect, useRef } from 'react';
import { MultiHandData } from '@/types';
import Spline3DScene from '@/components/Spline3DScene';
import StableHandRenderer from '@/components/StableHandRenderer';

export default function Spline3DPage() {
  const [multiHandData, setMultiHandData] = useState<MultiHandData>({
    leftHand: null,
    rightHand: null,
    totalHands: 0
  });

  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // MediaPipe loading state
  const [loadingAttempt, setLoadingAttempt] = useState(1);
  const maxLoadingAttempts = 3;

  // Load MediaPipe scripts
  useEffect(() => {
    const loadMediaPipeScripts = async () => {
      console.log(`Attempt ${loadingAttempt}: Starting MediaPipe script loading...`);
      
      try {
        // Load required MediaPipe scripts
        const scripts = [
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
        ];

        await Promise.all(scripts.map(src => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
              console.log(`Loaded: ${src}`);
              resolve(true);
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }));

        console.log('Loading MediaPipe scripts...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Waiting for MediaPipe to initialize...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsMediaPipeLoaded(true);
        console.log('✅ MediaPipe scripts loaded successfully');
      } catch (error) {
        console.error(`❌ Attempt ${loadingAttempt} failed:`, error);
        if (loadingAttempt < maxLoadingAttempts) {
          setLoadingAttempt(prev => prev + 1);
          setTimeout(loadMediaPipeScripts, 2000);
        } else {
          console.error('❌ Failed to load MediaPipe after all attempts');
        }
      }
    };

    loadMediaPipeScripts();
  }, [loadingAttempt]);

  // Check MediaPipe components
  useEffect(() => {
    if (!isMediaPipeLoaded) return;

    const checkComponents = () => {
      console.log('Checking MediaPipe components...');
      const components = {
        Hands: typeof (window as any).Hands !== 'undefined',
        Camera: typeof (window as any).Camera !== 'undefined',
        drawingUtils: typeof (window as any).drawingUtils !== 'undefined'
      };
      console.log('MediaPipe components check:', components);
      
      if (components.Hands && components.Camera) {
        console.log('✅ MediaPipe components check: {Hands: true, Camera: true, drawingUtils: false}');
        initializeMediaPipe();
      } else {
        setTimeout(checkComponents, 500);
      }
    };

    checkComponents();
  }, [isMediaPipeLoaded]);

  const initializeMediaPipe = async () => {
    try {
      const { Hands } = (window as any);
      
      const hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: any) => {
        const leftHand = results.multiHandLandmarks?.[0] || null;
        const rightHand = results.multiHandLandmarks?.[1] || null;
        
        // Determine which hand is which based on handedness
        let finalLeftHand = null;
        let finalRightHand = null;
        
        if (results.multiHandedness) {
          results.multiHandedness.forEach((handedness: any, index: number) => {
            const landmarks = results.multiHandLandmarks[index];
            if (handedness.label === 'Left') {
              finalLeftHand = { landmarks, handedness };
            } else if (handedness.label === 'Right') {
              finalRightHand = { landmarks, handedness };
            }
          });
        }

        const newMultiHandData: MultiHandData = {
          leftHand: finalLeftHand,
          rightHand: finalRightHand,
          totalHands: results.multiHandLandmarks?.length || 0
        };

        setMultiHandData(newMultiHandData);
        console.log('🎯 Hands detected:', newMultiHandData.totalHands);
      });

      // Request camera access
      console.log('Starting camera request...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      console.log('Camera stream obtained:', stream);
      setCameraStream(stream);
      setIsCameraActive(true);

      // Set up video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('autoplay', 'true');
      
      console.log('Video element set up successfully');

      // Start MediaPipe processing
      console.log('Initializing MediaPipe camera processing...');
      
      try {
        console.log('Attempting to use MediaPipe Camera utility...');
        const { Camera } = (window as any);
        
        const camera = new Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
          width: 1280,
          height: 720
        });

        await camera.start();
        console.log('MediaPipe camera processing started successfully with Camera utility');
      } catch (cameraError) {
        console.error('Camera utility failed, falling back to manual processing:', cameraError);
        
        // Fallback: manual processing
        video.addEventListener('loadedmetadata', () => {
          const processFrame = async () => {
            if (video.readyState >= 2) {
              await hands.send({ image: video });
            }
            requestAnimationFrame(processFrame);
          };
          processFrame();
        });
      }

    } catch (error) {
      console.error('❌ Failed to initialize MediaPipe:', error);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Spline 3D Scene */}
      <div className="absolute inset-0 z-10">
        <Spline3DScene multiHandData={multiHandData} />
      </div>

      {/* Hand Gesture Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <StableHandRenderer 
          multiHandData={multiHandData}
          isCameraActive={isCameraActive}
        />
      </div>

      {/* Loading State */}
      {!isMediaPipeLoaded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-center">
            <div className="text-2xl font-bold mb-4">Loading Spline 3D Scene</div>
            <div className="text-lg">Initializing MediaPipe (Attempt {loadingAttempt}/{maxLoadingAttempts})</div>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Status */}
      {isCameraActive && (
        <div className="absolute top-4 left-4 z-30 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          📹 Camera Active
        </div>
      )}

      {/* Hand Count Display */}
      <div className="absolute top-4 right-4 z-30 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
        🤏 Hands: {multiHandData.totalHands}
      </div>
    </div>
  );
} 