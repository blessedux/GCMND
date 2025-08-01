'use client';


import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import CameraControls from '@/components/CameraControls';
import GestureDisplay from '@/components/GestureDisplay';
import { CameraStatus, MultiHandData, HandData, MediaPipeResults } from '@/types';
import { detectAllGestures } from '@/lib/gestureDetection';

// Dynamically import p5 to avoid SSR issues
const StableHandRenderer = dynamic(() => import('@/components/StableHandRenderer'), { ssr: false });
const GestureRecorder = dynamic(() => import('@/components/GestureRecorder'), { ssr: false });
const CarDrivingController = dynamic(() => import('@/components/CarDrivingController'), { ssr: false });
const PointShootController = dynamic(() => import('@/components/PointShootController'), { ssr: false });
const AimBackgroundController = dynamic(() => import('@/components/AimBackgroundController'), { ssr: false });

export default function Home() {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({
    status: 'waiting',
    message: 'Camera: Click button to start (Privacy Mode)'
  });
  
  const [multiHandData, setMultiHandData] = useState<MultiHandData>({
    leftHand: null,
    rightHand: null,
    totalHands: 0
  });
  
  const [showOpenHandIndicator, setShowOpenHandIndicator] = useState(false);
  const [renderMode, setRenderMode] = useState<'depth-reach' | 'gesture-recorder' | 'car-driving' | 'point-shoot' | 'aim-background'>('depth-reach');
  
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize MediaPipe Hands
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const loadMediaPipeScripts = async () => {
      if (typeof window === 'undefined') return;

      try {
        console.log(`Attempt ${retryCount + 1}: Starting MediaPipe script loading...`);
        
        // Check if scripts are already loaded
        if ((window as any).Hands && (window as any).Camera) {
          console.log('MediaPipe scripts already loaded');
          initializeMediaPipe();
          return;
        }

        // Load MediaPipe scripts dynamically
        const scripts = [
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
        ];

        // Load scripts sequentially to ensure proper initialization
        for (const src of scripts) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            script.onload = () => {
              console.log(`Loaded: ${src}`);
              resolve(true);
            };
            script.onerror = (e) => {
              console.error(`Failed to load: ${src}`, e);
              reject(new Error(`Failed to load ${src}`));
            };
            document.head.appendChild(script);
          });
        }

        console.log('Loading MediaPipe scripts...');

        // Wait for scripts to initialize
        console.log('Waiting for MediaPipe to initialize...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if all MediaPipe components are available
        console.log('Checking MediaPipe components...');
        const hasHands = !!(window as any).Hands;
        const hasCamera = !!(window as any).Camera;
        const hasDrawingUtils = !!(window as any).drawingUtils;
        
        console.log('MediaPipe components check:', {
          Hands: hasHands,
          Camera: hasCamera,
          drawingUtils: hasDrawingUtils
        });

        if (!hasHands) {
          throw new Error('MediaPipe Hands not available');
        }

        if (!hasDrawingUtils) {
          console.warn('MediaPipe Drawing Utils not available - 3D rendering may be limited');
        }

        initializeMediaPipe();
      } catch (error) {
        console.error(`Failed to load MediaPipe scripts (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying MediaPipe loading (${retryCount}/${maxRetries})...`);
          setTimeout(loadMediaPipeScripts, 2000);
        } else {
          setCameraStatus({
            status: 'error',
            message: 'Error: MediaPipe failed to load after multiple attempts',
            error: 'MediaPipe script loading failed - check internet connection'
          });
        }
      }
    };

    const initializeMediaPipe = () => {
      try {
        if ((window as any).Hands) {
          const Hands = (window as any).Hands;
          handsRef.current = new Hands({
            locateFile: (file: string) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            },
          });

          handsRef.current.setOptions({
            maxNumHands: 2,
            modelComplexity: 0, // Use lighter model for stability
            minDetectionConfidence: 0.7, // Higher confidence for stability
            minTrackingConfidence: 0.7, // Higher tracking confidence
            selfieMode: true,
          });

          handsRef.current.onResults(onResults);
          
          console.log('MediaPipe Hands initialized successfully');
          setCameraStatus({
            status: 'waiting',
            message: 'Camera: MediaPipe ready, click to start (Privacy Mode)'
          });
        } else {
          throw new Error('MediaPipe Hands not available after loading');
        }
      } catch (error) {
        console.error('Failed to initialize MediaPipe Hands:', error);
        setCameraStatus({
          status: 'error',
          message: 'Error: MediaPipe initialization failed',
          error: 'MediaPipe Hands initialization failed - try refreshing the page'
        });
      }
    };

    loadMediaPipeScripts();
  }, []);

  const onResults = (results: MediaPipeResults) => {
    console.log('MediaPipe results received:', {
      hasLandmarks: !!results.multiHandLandmarks,
      landmarkCount: results.multiHandLandmarks?.length || 0,
      hasHandedness: !!results.multiHandedness
    });

    if (results.multiHandLandmarks) {
      let leftHand: HandData | null = null;
      let rightHand: HandData | null = null;
      
      // Process each hand
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness ? results.multiHandedness[i] : null;
        
        console.log(`Processing hand ${i}:`, {
          handedness: handedness?.label,
          confidence: handedness?.score,
          landmarkCount: landmarks.length
        });
        
        // Determine which hand this is
        const isLeftHand = handedness && handedness.label === 'Left';
        const isRightHand = handedness && handedness.label === 'Right';
        
        // Process gesture detection
        const gestureResult = detectAllGestures(landmarks);
        
        console.log(`Hand ${i} gesture:`, gestureResult);
        
        const handData: HandData = {
          landmarks,
          gesture: gestureResult.gesture,
          confidence: gestureResult.confidence
        };
        
        // Store hand data
        if (isLeftHand || (!isRightHand && leftHand === null)) {
          leftHand = handData;
        }
        
        if (isRightHand || (!isLeftHand && rightHand === null)) {
          rightHand = handData;
        }
      }
      
      // Update state
      const totalHands = (leftHand ? 1 : 0) + (rightHand ? 1 : 0);
      setMultiHandData({ leftHand, rightHand, totalHands });
      
      // Check for open hand indicator
      const hasOpenHand = leftHand?.gesture === 'openHand' || rightHand?.gesture === 'openHand';
      setShowOpenHandIndicator(hasOpenHand);
      
      console.log('Updated hand data:', { leftHand: !!leftHand, rightHand: !!rightHand, totalHands });
      
    } else {
      setMultiHandData({ leftHand: null, rightHand: null, totalHands: 0 });
      setShowOpenHandIndicator(false);
      console.log('No hands detected');
    }
  };

  const handleCameraRequest = async () => {
    setCameraStatus({
      status: 'requesting',
      message: 'Camera: Requesting permission...'
    });

    try {
      console.log('Starting camera request...');
      
      // Check if we're on HTTPS (required for camera access)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('⚠️ Camera access requires HTTPS (except on localhost)');
        setCameraStatus({
          status: 'error',
          message: 'Camera: HTTPS required for camera access'
        });
        return;
      }
      
      console.log('✅ Protocol check passed:', {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        url: window.location.href
      });
      
      // Check if MediaPipe is loaded
      if (!(window as any).Hands) {
        throw new Error('MediaPipe Hands not loaded. Please refresh the page and try again.');
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      console.log('Requesting camera access...');
      console.log('📹 getUserMedia constraints:', { 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      // Request camera access with simpler constraints first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          } 
        });
      } catch (error) {
        console.warn('First camera request failed, trying with minimal constraints:', error);
        // Try with minimal constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }

      console.log('✅ Camera stream obtained:', stream);
      console.log('📹 Stream tracks:', stream.getTracks().map(track => ({
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState
      })));

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video element setup timeout'));
          }, 5000);
          
          videoRef.current!.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve(true);
          };
          
          videoRef.current!.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Video element error'));
          };
        });
        
        await videoRef.current.play();
        
        // Hide the actual video feed for privacy
        videoRef.current.style.display = 'none';
        console.log('Video element set up successfully');
      } else {
        throw new Error('Video element reference not available');
      }

      setCameraStatus({
        status: 'active',
        message: 'Camera: Active (Privacy Mode)'
      });

      // Wait a bit for video to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Initialize MediaPipe camera processing
      if (handsRef.current && videoRef.current) {
        console.log('Initializing MediaPipe camera processing...');
        
        // Try MediaPipe Camera utility first
        if ((window as any).Camera) {
          try {
            console.log('Attempting to use MediaPipe Camera utility...');
            const Camera = (window as any).Camera;
            cameraRef.current = new Camera(videoRef.current, {
              onFrame: async () => {
                if (handsRef.current && videoRef.current) {
                  try {
                    await handsRef.current.send({ image: videoRef.current });
                  } catch (frameError) {
                    console.warn('Frame processing error in Camera utility:', frameError);
                  }
                }
              },
              width: 640,
              height: 480,
            });

            await cameraRef.current.start();
            console.log('MediaPipe camera processing started successfully with Camera utility');
            return;
          } catch (cameraError) {
            console.warn('MediaPipe Camera utility failed, trying manual approach:', cameraError);
          }
        }
        
        // Stable frame processing with rate limiting
        console.log('Using stable frame processing...');
        let lastFrameTime = 0;
        const targetFPS = 20; // Lower FPS for stability
        const frameInterval = 1000 / targetFPS;
        
        const processFrame = async (currentTime: number) => {
          if (currentTime - lastFrameTime >= frameInterval) {
            if (handsRef.current && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                await handsRef.current.send({ image: videoRef.current });
                lastFrameTime = currentTime;
              } catch (error) {
                console.warn('Frame processing error:', error);
              }
            }
          }
          requestAnimationFrame(processFrame);
        };
        
        // Start manual processing
        requestAnimationFrame(processFrame);
        console.log('Manual frame processing started');
        
      } else {
        console.error('MediaPipe components not available:', {
          hands: !!handsRef.current,
          video: !!videoRef.current,
          Camera: !!(window as any).Camera
        });
        
        // More specific error message
        if (!handsRef.current) {
          throw new Error('MediaPipe Hands not initialized - try refreshing the page');
        } else if (!videoRef.current) {
          throw new Error('Video element not available');
        } else {
          throw new Error('MediaPipe not initialized - unknown error');
        }
      }

    } catch (error: any) {
      console.error('Camera access failed:', error);
      
      let errorMessage = 'Camera access failed';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application. Please close other camera apps.';
      } else if (error.message.includes('MediaPipe')) {
        errorMessage = error.message;
      }
      
      setCameraStatus({
        status: 'error',
        message: 'Camera: Failed',
        error: errorMessage
      });
    }
  };

  return (
    <div className="container">
      {/* Hidden video element for MediaPipe processing */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        muted
        playsInline
      />
      
      <GestureDisplay 
        multiHandData={multiHandData}
        showOpenHandIndicator={showOpenHandIndicator}
      />
      
      <div className="canvas-container">
        {renderMode === 'depth-reach' && (
          <StableHandRenderer 
            leftHand={multiHandData.leftHand}
            rightHand={multiHandData.rightHand}
          />
        )}
        {renderMode === 'gesture-recorder' && (
          <GestureRecorder 
            leftHand={multiHandData.leftHand}
            rightHand={multiHandData.rightHand}
          />
        )}
        {renderMode === 'car-driving' && (
          <CarDrivingController 
            leftHand={multiHandData.leftHand}
            rightHand={multiHandData.rightHand}
          />
        )}
        {renderMode === 'point-shoot' && (
          <PointShootController 
            leftHand={multiHandData.leftHand}
            rightHand={multiHandData.rightHand}
          />
        )}
        {renderMode === 'aim-background' && (
          <AimBackgroundController 
            leftHand={multiHandData.leftHand}
            rightHand={multiHandData.rightHand}
          />
        )}
      </div>
      
      {/* Render mode selector */}
      <div style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        zIndex: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '10px',
        padding: '10px',
        fontSize: '14px'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '12px', opacity: 0.8 }}>Render Mode:</div>
        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
          <button
            onClick={() => setRenderMode('depth-reach')}
            style={{
              background: renderMode === 'depth-reach' ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            📏 Depth & Reach
          </button>
          <button
            onClick={() => setRenderMode('gesture-recorder')}
            style={{
              background: renderMode === 'gesture-recorder' ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🤚 Gesture Recorder
          </button>
          <button
            onClick={() => setRenderMode('car-driving')}
            style={{
              background: renderMode === 'car-driving' ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🚗 Car Driving
          </button>
          <button
            onClick={() => setRenderMode('point-shoot')}
            style={{
              background: renderMode === 'point-shoot' ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🔫 Point & Shoot
          </button>
          <button
            onClick={() => setRenderMode('aim-background')}
            style={{
              background: renderMode === 'aim-background' ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🎯 Aim & Background
          </button>
          <button
            onClick={() => window.open('/eth-3d', '_blank')}
            style={{
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🎨 ETH Logo 3D
          </button>
        </div>
      </div>
      
      <CameraControls 
        onCameraRequest={handleCameraRequest}
        cameraStatus={cameraStatus}
      />
    </div>
  );
} 