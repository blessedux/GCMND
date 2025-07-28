'use client';

import { useEffect, useRef, useState } from 'react';
import { MultiHandData } from '@/types';

interface Spline3DSceneProps {
  multiHandData: MultiHandData;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': any;
    }
  }
}

export default function Spline3DScene({ multiHandData }: Spline3DSceneProps) {
  const splineViewerRef = useRef<any>(null);
  const [isSplineLoaded, setIsSplineLoaded] = useState(false);
  const [splineLoadError, setSplineLoadError] = useState(false);
  const [lastPinchTime, setLastPinchTime] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  const [lastHandPosition, setLastHandPosition] = useState({ x: 0, y: 0 });

  // Load Spline viewer script
  useEffect(() => {
    const loadSplineScript = () => {
      if (document.querySelector('script[src*="spline-viewer"]')) {
        console.log('🎨 Spline viewer script already loaded');
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@splinetool/viewer@1.10.37/build/spline-viewer.js';
      script.onload = () => {
        console.log('✅ Spline viewer script loaded successfully');
      };
      script.onerror = () => {
        console.error('❌ Failed to load Spline viewer script');
        setSplineLoadError(true);
      };
      document.head.appendChild(script);
    };

    loadSplineScript();
  }, []);

  // Process gestures and translate to mouse events
  useEffect(() => {
    if (!isSplineLoaded || !splineViewerRef.current) return;

    const processGestures = () => {
      const leftHand = multiHandData.leftHand;
      const rightHand = multiHandData.rightHand;
      
      // Get hand positions (normalized 0-1)
      const leftHandX = leftHand?.landmarks[0]?.x || 0;
      const leftHandY = leftHand?.landmarks[0]?.y || 0;
      const rightHandX = rightHand?.landmarks[0]?.x || 0;
      const rightHandY = rightHand?.landmarks[0]?.y || 0;

      // Calculate pinch distances
      const leftPinchDistance = leftHand ? 
        Math.sqrt(
          Math.pow(leftHand.landmarks[4].x - leftHand.landmarks[8].x, 2) +
          Math.pow(leftHand.landmarks[4].y - leftHand.landmarks[8].y, 2)
        ) : 1;
      
      const rightPinchDistance = rightHand ? 
        Math.sqrt(
          Math.pow(rightHand.landmarks[4].x - rightHand.landmarks[8].x, 2) +
          Math.pow(rightHand.landmarks[4].y - rightHand.landmarks[8].y, 2)
        ) : 1;

      // Detect pinching (distance < 0.05)
      const leftPinching = leftPinchDistance < 0.05;
      const rightPinching = rightPinchDistance < 0.05;
      
      // Use the most active hand for interaction
      const activeHand = leftPinching ? leftHand : rightPinching ? rightHand : null;
      const activeHandX = leftPinching ? leftHandX : rightPinching ? rightHandX : 0;
      const activeHandY = leftPinching ? leftHandY : rightPinching ? rightHandY : 0;

            // Always update hand position for cursor tracking
      if (leftHand || rightHand) {
        const currentHand = leftHand || rightHand;
        if (currentHand) {
          const currentX = currentHand.landmarks[0].x * window.innerWidth;
          const currentY = currentHand.landmarks[0].y * window.innerHeight;
          
          // Update position even if not moving significantly for smooth tracking
          setLastHandPosition({ x: currentX, y: currentY });
          
          // Simulate mouse move for cursor tracking (only if hand moved significantly)
          const deltaX = Math.abs(currentX - lastHandPosition.x);
          const deltaY = Math.abs(currentY - lastHandPosition.y);
          
          if (deltaX > 2 || deltaY > 2) {
            simulateMouseEvent('mousemove', currentX, currentY);
          }
        }
      }

      if (activeHand && (leftPinching || rightPinching)) {
        const currentTime = Date.now();
        
        // Convert hand position to screen coordinates
        const screenX = activeHandX * window.innerWidth;
        const screenY = activeHandY * window.innerHeight;

        if (!isPinching) {
          // Start pinch - simulate mouse down
          simulateMouseEvent('mousedown', screenX, screenY);
          setIsPinching(true);
          setLastPinchTime(currentTime);
          console.log('🤏 SPLINE: Pinch started at', screenX.toFixed(0), screenY.toFixed(0));
        } else {
          // Continue pinch - simulate mouse move (drag)
          simulateMouseEvent('mousemove', screenX, screenY);
          console.log('🤏 SPLINE: Dragging at', screenX.toFixed(0), screenY.toFixed(0));
        }
      } else if (isPinching) {
        // End pinch - simulate mouse up
        simulateMouseEvent('mouseup', lastHandPosition.x, lastHandPosition.y);
        setIsPinching(false);
        console.log('🤏 SPLINE: Pinch ended');
      }
    };

    processGestures();
  }, [multiHandData, isSplineLoaded, isPinching, lastHandPosition, lastPinchTime]);

  // Simulate mouse events on the Spline viewer
  const simulateMouseEvent = (type: string, x: number, y: number) => {
    if (!splineViewerRef.current) return;

    try {
      console.log(`🖱️ SPLINE: Simulating ${type} at (${x}, ${y})`);

      // Get the Spline viewer element and its bounding rect
      const splineElement = splineViewerRef.current;
      const rect = splineElement.getBoundingClientRect();
      
      // Calculate coordinates relative to the Spline viewer
      const relativeX = x - rect.left;
      const relativeY = y - rect.top;

      // Create mouse event with complete properties
      const event = new MouseEvent(type, {
        clientX: relativeX,
        clientY: relativeY,
        screenX: x,
        screenY: y,
        bubbles: true,
        cancelable: true,
        view: window,
        detail: type === 'mousedown' ? 1 : 0,
        button: 0,
        buttons: type === 'mousedown' ? 1 : 0,
        relatedTarget: null,
        movementX: 0,
        movementY: 0
      });

      // Try multiple approaches to dispatch the event
      let eventDispatched = false;

      // Approach 1: Dispatch directly to Spline viewer
      try {
        splineElement.dispatchEvent(event);
        eventDispatched = true;
        console.log('✅ SPLINE: Event dispatched to Spline viewer');
      } catch (error) {
        console.log('⚠️ SPLINE: Could not dispatch to Spline viewer:', error);
      }

      // Approach 2: Try to find Spline's internal canvas/container
      if (!eventDispatched) {
        try {
          const splineCanvas = splineElement.querySelector('canvas');
          if (splineCanvas) {
            splineCanvas.dispatchEvent(event);
            eventDispatched = true;
            console.log('✅ SPLINE: Event dispatched to Spline canvas');
          }
        } catch (error) {
          console.log('⚠️ SPLINE: Could not dispatch to Spline canvas:', error);
        }
      }

      // Approach 3: Dispatch to any interactive element within Spline
      if (!eventDispatched) {
        try {
          const interactiveElements = splineElement.querySelectorAll('*');
          for (const element of interactiveElements) {
            try {
              element.dispatchEvent(event);
              eventDispatched = true;
              console.log('✅ SPLINE: Event dispatched to interactive element');
              break;
            } catch (error) {
              // Continue to next element
            }
          }
        } catch (error) {
          console.log('⚠️ SPLINE: Could not dispatch to interactive elements:', error);
        }
      }

      // Approach 4: Try to access Spline's internal methods
      if (!eventDispatched) {
        try {
          // Try to access Spline's internal viewer methods
          const splineViewer = (splineElement as any).__splineViewer;
          if (splineViewer && splineViewer.onMouseEvent) {
            splineViewer.onMouseEvent(type, relativeX, relativeY);
            eventDispatched = true;
            console.log('✅ SPLINE: Event sent via internal viewer method');
          }
        } catch (error) {
          console.log('⚠️ SPLINE: Could not access internal viewer methods:', error);
        }
      }

      // Approach 5: Fallback to document
      if (!eventDispatched) {
        try {
          document.dispatchEvent(event);
          console.log('✅ SPLINE: Event dispatched to document');
        } catch (fallbackError) {
          console.error('❌ SPLINE: Could not dispatch event:', fallbackError);
        }
      }

    } catch (error) {
      console.error('❌ SPLINE: Mouse event simulation failed:', error);
    }
  };

  return (
    <div className="w-full h-full relative bg-transparent">
      {/* Spline Scene */}
      {!splineLoadError ? (
        <spline-viewer
          ref={splineViewerRef}
          url="https://prod.spline.design/pt2gBHatXNli4gdL/scene.splinecode"
          onLoad={() => {
            setIsSplineLoaded(true);
            console.log('🎨 Spline scene loaded successfully');
          }}
          onError={() => {
            console.error('❌ Spline scene failed to load');
            setSplineLoadError(true);
          }}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent'
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
          <div className="text-white text-center">
            <div className="text-2xl font-bold mb-4">🎨 Spline Scene</div>
            <div className="text-lg mb-4">Failed to load Spline scene</div>
            <div className="text-sm opacity-75">
              The Spline scene may be temporarily unavailable or the URL may have changed.
            </div>
            <button 
              onClick={() => {
                setSplineLoadError(false);
                setIsSplineLoaded(false);
                window.location.reload();
              }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              🔄 Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {!isSplineLoaded && !splineLoadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
          <div className="text-white text-center">
            <div className="text-2xl font-bold mb-4">🎨 Loading Spline Scene</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      )}
      
      {/* Gesture Status Overlay */}
      <div className="absolute bottom-4 left-4 z-30 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm">
        <div>🎨 Spline 3D Scene</div>
        <div>🤏 Pinch to interact</div>
        <div>🖱️ Gestures → Mouse events</div>
        {isPinching && <div className="text-green-400">📍 Active interaction</div>}
      </div>

      {/* Hand Position Debug */}
      {multiHandData.totalHands > 0 && (
        <div className="absolute bottom-4 right-4 z-30 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm">
          <div>🤏 Hands: {multiHandData.totalHands}</div>
          {multiHandData.leftHand && (
            <div>👈 Left: {multiHandData.leftHand.landmarks[0].x.toFixed(2)}, {multiHandData.leftHand.landmarks[0].y.toFixed(2)}</div>
          )}
          {multiHandData.rightHand && (
            <div>👉 Right: {multiHandData.rightHand.landmarks[0].x.toFixed(2)}, {multiHandData.rightHand.landmarks[0].y.toFixed(2)}</div>
          )}
          {isPinching && <div className="text-green-400">📍 Pinching Active</div>}
        </div>
      )}

      {/* Hand Rendering Overlay */}
      {multiHandData.totalHands > 0 && (
        <div className="absolute inset-0 pointer-events-none z-40">
          {/* Left Hand */}
          {multiHandData.leftHand && (
            <div className="absolute">
              {multiHandData.leftHand.landmarks.map((landmark, index) => (
                <div
                  key={`left-${index}`}
                  className="absolute w-2 h-2 bg-blue-500 rounded-full border border-white"
                  style={{
                    left: `${landmark.x * window.innerWidth - 4}px`,
                    top: `${landmark.y * window.innerHeight - 4}px`,
                    zIndex: 50
                  }}
                />
              ))}
              {/* Hand connection lines */}
              {multiHandData.leftHand.landmarks.slice(0, 20).map((landmark, index) => {
                const nextIndex = index + 1;
                if (nextIndex < multiHandData.leftHand.landmarks.length) {
                  const nextLandmark = multiHandData.leftHand.landmarks[nextIndex];
                  const x1 = landmark.x * window.innerWidth;
                  const y1 = landmark.y * window.innerHeight;
                  const x2 = nextLandmark.x * window.innerWidth;
                  const y2 = nextLandmark.y * window.innerHeight;
                  
                  return (
                    <svg
                      key={`left-line-${index}`}
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 45 }}
                    >
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(59, 130, 246, 0.6)"
                        strokeWidth="2"
                      />
                    </svg>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Right Hand */}
          {multiHandData.rightHand && (
            <div className="absolute">
              {multiHandData.rightHand.landmarks.map((landmark, index) => (
                <div
                  key={`right-${index}`}
                  className="absolute w-2 h-2 bg-green-500 rounded-full border border-white"
                  style={{
                    left: `${landmark.x * window.innerWidth - 4}px`,
                    top: `${landmark.y * window.innerHeight - 4}px`,
                    zIndex: 50
                  }}
                />
              ))}
              {/* Hand connection lines */}
              {multiHandData.rightHand.landmarks.slice(0, 20).map((landmark, index) => {
                const nextIndex = index + 1;
                if (nextIndex < multiHandData.rightHand.landmarks.length) {
                  const nextLandmark = multiHandData.rightHand.landmarks[nextIndex];
                  const x1 = landmark.x * window.innerWidth;
                  const y1 = landmark.y * window.innerHeight;
                  const x2 = nextLandmark.x * window.innerWidth;
                  const y2 = nextLandmark.y * window.innerHeight;
                  
                  return (
                    <svg
                      key={`right-line-${index}`}
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 45 }}
                    >
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(34, 197, 94, 0.6)"
                        strokeWidth="2"
                      />
                    </svg>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Cursor Indicator */}
          <div 
            className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white pointer-events-none"
            style={{
              left: `${lastHandPosition.x - 12}px`,
              top: `${lastHandPosition.y - 12}px`,
              transform: 'translate(0, 0)',
              transition: 'all 0.1s ease',
              zIndex: 55
            }}
          />
        </div>
      )}
    </div>
  );
} 