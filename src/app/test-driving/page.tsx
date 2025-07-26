'use client';

import { useEffect, useState } from 'react';
import CarDrivingController from '@/components/CarDrivingController';
import { HandData } from '@/types';

export default function TestDrivingPage() {
  const [leftHand, setLeftHand] = useState<HandData | null>(null);
  const [rightHand, setRightHand] = useState<HandData | null>(null);
  const [keyLog, setKeyLog] = useState<string[]>([]);

  // Listen for keyboard events to test simulation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keyInfo = `Key Down: ${event.key} (${event.code})`;
      setKeyLog(prev => [keyInfo, ...prev.slice(0, 9)]); // Keep last 10 entries
      console.log('🎮 Keyboard Event:', keyInfo);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const keyInfo = `Key Up: ${event.key} (${event.code})`;
      setKeyLog(prev => [keyInfo, ...prev.slice(0, 9)]); // Keep last 10 entries
      console.log('🎮 Keyboard Event:', keyInfo);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Simulate hand data for testing (you can replace this with real hand tracking)
  useEffect(() => {
    const simulateHands = () => {
      // Create mock hand data for testing
      const mockLandmarks = Array.from({ length: 21 }, (_, i) => ({
        x: 0.5 + Math.sin(Date.now() * 0.001 + i * 0.1) * 0.1,
        y: 0.5 + Math.cos(Date.now() * 0.001 + i * 0.1) * 0.1,
        z: 0.1 + Math.sin(Date.now() * 0.002) * 0.05
      }));

      setLeftHand({
        landmarks: mockLandmarks,
        gesture: 'openHand',
        confidence: 0.9
      });

      setRightHand({
        landmarks: mockLandmarks.map(lm => ({
          x: lm.x + 0.1,
          y: lm.y,
          z: lm.z
        })),
        gesture: 'openHand',
        confidence: 0.9
      });
    };

    const interval = setInterval(simulateHands, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginBottom: '20px',
          fontSize: '2.5rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>
          🚗 Car Driving Test
        </h1>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 300px', 
          gap: '20px',
          alignItems: 'start'
        }}>
          {/* Main driving interface */}
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            borderRadius: '10px', 
            padding: '10px',
            minHeight: '600px'
          }}>
            <CarDrivingController 
              leftHand={leftHand}
              rightHand={rightHand}
            />
          </div>

          {/* Keyboard log */}
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            borderRadius: '10px', 
            padding: '15px',
            color: 'white'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#4CAF50' }}>
              🎮 Keyboard Events Log
            </h3>
            
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.5)', 
              borderRadius: '5px', 
              padding: '10px',
              minHeight: '200px',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {keyLog.length === 0 ? (
                <div style={{ color: '#888', fontStyle: 'italic' }}>
                  No keyboard events yet...
                </div>
              ) : (
                keyLog.map((log, index) => (
                  <div key={index} style={{ 
                    marginBottom: '5px',
                    padding: '3px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {log}
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '15px', fontSize: '12px', color: '#ccc' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>Test Instructions:</strong>
              </div>
              <div>• Enable "Keyboard Simulation" in the controls</div>
              <div>• Put hands together and rotate for steering</div>
              <div>• Move hands forward/back for acceleration/braking</div>
              <div>• Watch for keyboard events in the log</div>
            </div>

            <button
              onClick={() => setKeyLog([])}
              style={{
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                marginTop: '10px',
                width: '100%'
              }}
            >
              Clear Log
            </button>
          </div>
        </div>

        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center', 
          color: '#ccc',
          fontSize: '14px'
        }}>
          <p>
            This is a test environment for the car driving controls. 
            The keyboard simulation will trigger actual keyboard events that can be detected by games or applications.
          </p>
        </div>
      </div>
    </div>
  );
} 