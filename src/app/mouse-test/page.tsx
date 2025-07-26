'use client';

import { useState, useEffect } from 'react';
import AimBackgroundController from '@/components/AimBackgroundController';
import { HandData } from '@/types';

export default function MouseTestPage() {
  const [leftHand, setLeftHand] = useState<HandData | null>(null);
  const [rightHand, setRightHand] = useState<HandData | null>(null);
  const [mouseEvents, setMouseEvents] = useState<Array<{type: string, x: number, y: number, time: number}>>([]);

  useEffect(() => {
    // Listen for mouse events to demonstrate the simulation
    const handleMouseEvent = (event: MouseEvent) => {
      const newEvent = {
        type: event.type,
        x: event.clientX,
        y: event.clientY,
        time: Date.now()
      };
      
      setMouseEvents(prev => [newEvent, ...prev.slice(0, 9)]); // Keep last 10 events
    };

    document.addEventListener('mousedown', handleMouseEvent);
    document.addEventListener('mouseup', handleMouseEvent);
    document.addEventListener('click', handleMouseEvent);
    document.addEventListener('mousemove', handleMouseEvent);

    return () => {
      document.removeEventListener('mousedown', handleMouseEvent);
      document.removeEventListener('mouseup', handleMouseEvent);
      document.removeEventListener('click', handleMouseEvent);
      document.removeEventListener('mousemove', handleMouseEvent);
    };
  }, []);

  // Simulate hand data for testing
  useEffect(() => {
    const simulateHand = () => {
      // Simulate a hand in the center of the screen
      const mockHand: HandData = {
        landmarks: Array.from({ length: 21 }, (_, i) => ({
          x: 0.5 + (Math.random() - 0.5) * 0.1,
          y: 0.5 + (Math.random() - 0.5) * 0.1,
          z: 0.3 + (Math.random() - 0.5) * 0.1
        })),
        gesture: 'pointing',
        confidence: 0.8
      };
      
      setLeftHand(mockHand);
    };

    const interval = setInterval(simulateHand, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <AimBackgroundController leftHand={leftHand} rightHand={rightHand} />
      
      {/* Mouse Event Log */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000,
        minWidth: '300px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          🖱️ Mouse Event Log
        </div>
        
        <div style={{ fontSize: '10px', marginBottom: '10px', color: '#ccc' }}>
          Hand gestures will trigger real mouse events here:
        </div>
        
        {mouseEvents.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            No mouse events yet. Make hand gestures to see events here.
          </div>
        ) : (
          <div style={{ fontSize: '10px' }}>
            {mouseEvents.map((event, index) => (
              <div key={index} style={{ 
                marginBottom: '5px', 
                padding: '5px', 
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                borderLeft: `3px solid ${
                  event.type === 'click' ? '#4CAF50' :
                  event.type === 'mousedown' ? '#FF9800' :
                  event.type === 'mouseup' ? '#2196F3' :
                  '#666'
                }`
              }}>
                <div style={{ fontWeight: 'bold', color: '#fff' }}>
                  {event.type.toUpperCase()}
                </div>
                <div style={{ color: '#ccc' }}>
                  Position: ({event.x}, {event.y})
                </div>
                <div style={{ color: '#999', fontSize: '9px' }}>
                  {new Date(event.time).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '5px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '11px', marginBottom: '8px', color: '#4CAF50', fontWeight: 'bold' }}>
            🎯 Gesture Instructions
          </div>
          
          <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
            <div>• <strong>Pointing:</strong> Index finger extended, thumb up</div>
            <div>• <strong>Click:</strong> Make a full fist</div>
            <div>• <strong>Drag:</strong> Palm down, all fingers extended</div>
            <div>• <strong>Move:</strong> Hand movement controls cursor</div>
          </div>
        </div>
      </div>

      {/* Interactive Test Elements */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '20px',
        zIndex: 1000
      }}>
        <button
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
          onClick={() => alert('Button clicked!')}
        >
          Test Click
        </button>
        
        <div
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'grab',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            userSelect: 'none'
          }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'dragged');
          }}
        >
          Test Drag
        </div>
        
        <input
          type="text"
          placeholder="Test typing..."
          style={{
            padding: '15px',
            fontSize: '16px',
            border: '2px solid #FF9800',
            borderRadius: '8px',
            background: 'white',
            minWidth: '200px'
          }}
        />
      </div>
    </div>
  );
} 