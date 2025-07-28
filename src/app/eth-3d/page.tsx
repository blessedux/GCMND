'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { CameraStatus, MultiHandData, HandData, MediaPipeResults } from '@/types';
import { detectAllGestures } from '@/lib/gestureDetection';

// Dynamically import the working hand renderer and 3D ETH logo component
const StableHandRenderer = dynamic(() => import('@/components/StableHandRenderer'), { ssr: false });
const Eth3DLogo = dynamic(() => import('@/components/Eth3DLogo'), { ssr: false });

export default function Eth3DPage() {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({
    status: 'waiting',
    message: 'Loading MediaPipe... Please wait.'
  });
  
  const [multiHandData, setMultiHandData] = useState<MultiHandData>({
    leftHand: null,
    rightHand: null,
    totalHands: 0
  });
  
  const [showOpenHandIndicator, setShowOpenHandIndicator] = useState(false);
  
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

        console.log('✅ MediaPipe scripts loaded successfully');
        initializeMediaPipe();

      } catch (error) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying in 2 seconds... (${retryCount}/${maxRetries})`);
          setTimeout(loadMediaPipeScripts, 2000);
        } else {
          console.error('❌ Max retries reached. MediaPipe initialization failed.');
          setCameraStatus({
            status: 'error',
            message: 'Failed to load MediaPipe after multiple attempts',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    };

    const initializeMediaPipe = () => {
      try {
        const Hands = (window as any).Hands;
        const Camera = (window as any).Camera;
        const drawingUtils = (window as any).drawingUtils;

        if (!Hands) {
          throw new Error('MediaPipe Hands not available');
        }

        handsRef.current = new Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        handsRef.current.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        handsRef.current.onResults(onResults);

        console.log('✅ MediaPipe Hands initialized successfully');
        setCameraStatus({
          status: 'waiting',
          message: 'Camera: Click button to start (Privacy Mode)'
        });

      } catch (error) {
        console.error('❌ Error initializing MediaPipe:', error);
        setCameraStatus({
          status: 'error',
          message: 'Failed to initialize MediaPipe',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    loadMediaPipeScripts();
  }, []);

  const onResults = (results: MediaPipeResults) => {
    // Only log when hands are detected
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      console.log('🎯 Hands detected:', results.multiHandLandmarks.length);
    }
    
    if (!results.multiHandLandmarks || !results.multiHandedness) {
      setMultiHandData({
        leftHand: null,
        rightHand: null,
        totalHands: 0
      });
      setShowOpenHandIndicator(false);
      return;
    }

    let leftHand: HandData | null = null;
    let rightHand: HandData | null = null;
    let hasOpenHand = false;

    results.multiHandLandmarks.forEach((landmarks, index) => {
      const handedness = results.multiHandedness?.[index];
      if (!handedness || !landmarks) return;



      const gestureResult = detectAllGestures(landmarks);
      
      // Debug gesture detection
      if (gestureResult.gesture === 'pinch') {
        console.log('🎯 PINCH GESTURE DETECTED:', {
          hand: handedness.label,
          confidence: gestureResult.confidence,
          gesture: gestureResult.gesture
        });
      }
      
      const handData: HandData = {
        landmarks,
        gesture: gestureResult.gesture,
        confidence: gestureResult.confidence
      };

      // Assign hands based on their actual handedness (no swapping)
      if (handedness.label === 'Right') {
        rightHand = handData;
      } else if (handedness.label === 'Left') {
        leftHand = handData;
      }

      // Check for open hand gesture
      if (gestureResult.gesture === 'openHand' && gestureResult.confidence > 0.7) {
        hasOpenHand = true;
      }
    });

    const finalData = {
      leftHand,
      rightHand,
      totalHands: results.multiHandLandmarks.length
    };
    
    setMultiHandData(finalData);
    setShowOpenHandIndicator(hasOpenHand);
  };

  const handleCameraRequest = async () => {
    // Check if MediaPipe is properly initialized
    if (!handsRef.current) {
      setCameraStatus({
        status: 'error',
        message: 'MediaPipe not initialized. Please wait and try again.',
        error: 'MediaPipe Hands not initialized'
      });
      return;
    }

    setCameraStatus({
      status: 'requesting',
      message: 'Camera: Requesting permission...'
    });

    try {
      console.log('Starting camera request...');
      
      // Check if MediaPipe is loaded
      if (!(window as any).Hands) {
        throw new Error('MediaPipe Hands not loaded. Please refresh the page and try again.');
      }

      // Request camera access with simpler constraints first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });

      console.log('Camera stream obtained:', stream);

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
        message: 'Camera: Active (Privacy Mode) - Make gestures to control the 3D ETH logo!'
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
            } else {

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

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setCameraStatus({
      status: 'waiting',
      message: 'Camera: Click button to start (Privacy Mode)'
    });
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      position: 'relative', 
      background: 'radial-gradient(circle at center, #333333 0%, #000000 100%)',
      overflow: 'hidden'
    }}>
      
      {/* Clean Background - No animated circles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none'
      }}>
        {/* Background is now clean with just the gradient */}
      </div>
      {/* Hidden video element for MediaPipe */}
      <video
        ref={videoRef}
        style={{ 
          position: 'fixed',
          top: '10px',
          left: '10px',
          width: '160px',
          height: '120px',
          border: '2px solid red',
          zIndex: 1000,
          display: 'block' // Temporarily visible for debugging
        }}
        autoPlay
        playsInline
        muted
      />
      
      {/* Working Hand Renderer (for testing) */}
      <StableHandRenderer 
        leftHand={multiHandData.leftHand}
        rightHand={multiHandData.rightHand}
      />
      
      {/* 3D ETH Logo */}
      <Eth3DLogo multiHandData={multiHandData} />
      
      {/* Gesture Display - Removed for minimal interface */}
      
      {/* Minimal Retro Debug Panel */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        fontFamily: '"Courier New", "Monaco", "Menlo", monospace',
        fontSize: '11px',
        lineHeight: '1.2',
        color: '#00FF00',
        textShadow: '0 0 5px #00FF00',
        pointerEvents: 'none'
      }}>
        {/* Camera Status */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#FFFF00' }}>CAMERA:</span> {cameraStatus.status.toUpperCase()}
        </div>
        
        {/* Hand Status */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#FFFF00' }}>HANDS:</span> {multiHandData.totalHands}/2
        </div>
        
        {multiHandData.leftHand && (
          <div style={{ marginBottom: '4px', fontSize: '10px' }}>
            <span style={{ color: '#00FFFF' }}>L:</span> {multiHandData.leftHand.gesture.toUpperCase()} ({(multiHandData.leftHand.confidence * 100).toFixed(0)}%)
          </div>
        )}
        
        {multiHandData.rightHand && (
          <div style={{ marginBottom: '4px', fontSize: '10px' }}>
            <span style={{ color: '#00FFFF' }}>R:</span> {multiHandData.rightHand.gesture.toUpperCase()} ({(multiHandData.rightHand.confidence * 100).toFixed(0)}%)
          </div>
        )}
        
        {/* Gesture Debug */}
        {multiHandData.leftHand && multiHandData.leftHand.gesture === 'pinch' && (
          <div style={{ marginTop: '8px', fontSize: '9px', color: '#FF8800' }}>
            <span style={{ color: '#FFFF00' }}>PINCH:</span> L-HAND ACTIVE
          </div>
        )}
        {multiHandData.rightHand && multiHandData.rightHand.gesture === 'pinch' && (
          <div style={{ fontSize: '9px', color: '#FF8800' }}>
            <span style={{ color: '#FFFF00' }}>PINCH:</span> R-HAND ACTIVE
          </div>
        )}
        
        {/* Test Objects Info */}
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#00FFFF' }}>
          <span style={{ color: '#FFFF00' }}>TEST:</span> RED SPHERE | BLUE SPHERE | GREEN CUBE
        </div>
        <div style={{ fontSize: '8px', color: '#888' }}>
          Pinch near objects to drag them
        </div>
        <div style={{ fontSize: '8px', color: '#FF8800', marginTop: '4px' }}>
          Yellow dot shows pinch point
        </div>

        
        {/* Camera Controls */}
        <div style={{ 
          marginTop: '12px', 
          pointerEvents: 'auto',
          display: 'flex',
          gap: '8px'
        }}>
          {cameraStatus.status === 'waiting' ? (
            <button
              onClick={handleCameraRequest}
              style={{
                padding: '4px 8px',
                background: 'transparent',
                color: '#00FF00',
                border: '1px solid #00FF00',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '10px',
                fontFamily: '"Courier New", monospace',
                textShadow: '0 0 3px #00FF00'
              }}
              disabled={!handsRef.current}
            >
              {handsRef.current ? 'START' : 'LOADING...'}
            </button>
          ) : cameraStatus.status === 'error' ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleCameraRequest}
                style={{
                  padding: '4px 6px',
                  background: 'transparent',
                  color: '#FF8800',
                  border: '1px solid #FF8800',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '9px',
                  fontFamily: '"Courier New", monospace'
                }}
              >
                RETRY
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '4px 6px',
                  background: 'transparent',
                  color: '#0088FF',
                  border: '1px solid #0088FF',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '9px',
                  fontFamily: '"Courier New", monospace'
                }}
              >
                RELOAD
              </button>
            </div>
          ) : (
            <button
              onClick={stopCamera}
              style={{
                padding: '4px 8px',
                background: 'transparent',
                color: '#FF4444',
                border: '1px solid #FF4444',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '10px',
                fontFamily: '"Courier New", monospace'
              }}
            >
              STOP
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 