'use client';

import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import { HandData } from '@/types';

interface GestureRecorderProps {
  leftHand: HandData | null;
  rightHand: HandData | null;
}

interface GestureCommand {
  id: string;
  name: string;
  description: string;
  recordedGesture: any[] | null;
  isActive: boolean;
  lastTriggered: number;
}

export default function GestureRecorder({ leftHand, rightHand }: GestureRecorderProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  
  const [gestureCommands, setGestureCommands] = useState<GestureCommand[]>([
    { id: 'chatgpt-enter', name: 'ChatGPT Widget', description: 'Enter ChatGPT widget', recordedGesture: null, isActive: false, lastTriggered: 0 },
    { id: 'enter-command', name: 'Enter Command', description: 'Execute enter command', recordedGesture: null, isActive: false, lastTriggered: 0 },
    { id: 'cursor-command', name: 'Cursor Command', description: 'Control cursor', recordedGesture: null, isActive: false, lastTriggered: 0 },
    { id: 'browser-command', name: 'Browser Command', description: 'Open browser', recordedGesture: null, isActive: false, lastTriggered: 0 },
    { id: 'telegram-command', name: 'Telegram Command', description: 'Open Telegram', recordedGesture: null, isActive: false, lastTriggered: 0 },
    { id: 'swipe-windows', name: 'Swipe Between Windows', description: 'Switch between windows', recordedGesture: null, isActive: false, lastTriggered: 0 },
    { id: 'show-apps', name: 'Show Every Open App', description: 'Show all open applications', recordedGesture: null, isActive: false, lastTriggered: 0 },
    { id: 'command-tab', name: 'Command Tab', description: 'Command + Tab shortcut', recordedGesture: null, isActive: false, lastTriggered: 0 },
    { id: 'tab-command', name: 'Tab Command', description: 'Tab key command', recordedGesture: null, isActive: false, lastTriggered: 0 }
  ]);
  
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [currentHandData, setCurrentHandData] = useState<any[] | null>(null);
  const [detectedGestures, setDetectedGestures] = useState<string[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p: p5) => {
      p.setup = () => {
        const canvas = p.createCanvas(800, 600, p.WEBGL);
        canvas.parent(canvasRef.current!);
        p5InstanceRef.current = p;
      };

      p.draw = () => {
        p.background(20, 30, 50);
        
        // Draw 3D scene
        draw3DScene(p);
        
        // Draw hand data if available
        if (currentHandData && currentHandData.length > 0) {
          drawHand(p, currentHandData);
        }
        
        // Draw recording indicator
        if (recordingFor) {
          drawRecordingIndicator(p);
        }
        
        // Draw detected gestures
        drawDetectedGestures(p);
      };
    };

    const p5Instance = new p5(sketch);

    return () => {
      p5Instance.remove();
    };
  }, [currentHandData, recordingFor, detectedGestures]);

  // Update hand data when props change
  useEffect(() => {
    const handData = leftHand?.landmarks || rightHand?.landmarks;
    if (handData && handData.length > 0) {
      setCurrentHandData(handData);
      
      // Check for gesture matches
      checkGestureMatches(handData);
    }
  }, [leftHand, rightHand]);

  const checkGestureMatches = (handData: any[]) => {
    const now = Date.now();
    const cooldown = 2000; // 2 second cooldown between triggers
    
    gestureCommands.forEach(command => {
      if (command.recordedGesture && command.isActive) {
        if (now - command.lastTriggered > cooldown) {
          const similarity = calculateGestureSimilarity(handData, command.recordedGesture);
          if (similarity > 0.85) { // 85% similarity threshold
            console.log(`🎯 GESTURE TRIGGERED: ${command.name}`);
            setDetectedGestures(prev => [...prev, command.name]);
            
            // Update last triggered time
            setGestureCommands(prev => prev.map(cmd => 
              cmd.id === command.id 
                ? { ...cmd, lastTriggered: now }
                : cmd
            ));
            
            // Remove from detected list after 3 seconds
            setTimeout(() => {
              setDetectedGestures(prev => prev.filter(g => g !== command.name));
            }, 3000);
          }
        }
      }
    });
  };

  const calculateGestureSimilarity = (current: any[], recorded: any[]): number => {
    if (!current || !recorded || current.length !== recorded.length) return 0;
    
    let totalDistance = 0;
    let validPoints = 0;
    
    for (let i = 0; i < current.length; i++) {
      if (current[i] && recorded[i]) {
        const dx = current[i].x - recorded[i].x;
        const dy = current[i].y - recorded[i].y;
        const dz = current[i].z - recorded[i].z;
        totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
        validPoints++;
      }
    }
    
    if (validPoints === 0) return 0;
    
    const averageDistance = totalDistance / validPoints;
    // Convert distance to similarity (0-1, where 1 is perfect match)
    return Math.max(0, 1 - (averageDistance * 10));
  };

  const startRecording = (commandId: string) => {
    setRecordingFor(commandId);
    console.log(`🎬 Started recording gesture for: ${commandId}`);
  };

  const stopRecording = () => {
    if (recordingFor && currentHandData) {
      setGestureCommands(prev => prev.map(cmd => 
        cmd.id === recordingFor 
          ? { ...cmd, recordedGesture: [...currentHandData], isActive: true }
          : cmd
      ));
      
      console.log(`✅ Recorded gesture for: ${recordingFor}`);
      setRecordingFor(null);
    }
  };

  const toggleCommand = (commandId: string) => {
    setGestureCommands(prev => prev.map(cmd => 
      cmd.id === commandId 
        ? { ...cmd, isActive: !cmd.isActive }
        : cmd
    ));
  };

  const clearGesture = (commandId: string) => {
    setGestureCommands(prev => prev.map(cmd => 
      cmd.id === commandId 
        ? { ...cmd, recordedGesture: null, isActive: false }
        : cmd
    ));
  };

  const draw3DScene = (p: p5) => {
    // Set up lighting
    p.ambientLight(60, 60, 60);
    p.directionalLight(255, 255, 255, 0, 0, -1);
    
    // Draw coordinate system
    p.push();
    p.stroke(255, 0, 0, 100);
    p.strokeWeight(2);
    p.line(0, 0, 0, 100, 0, 0); // X axis (red)
    
    p.stroke(0, 255, 0, 100);
    p.line(0, 0, 0, 0, 100, 0); // Y axis (green)
    
    p.stroke(0, 0, 255, 100);
    p.line(0, 0, 0, 0, 0, 100); // Z axis (blue)
    p.pop();
  };

  const drawHand = (p: p5, landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return;
    
    // Draw hand skeleton
    p.push();
    p.stroke(255, 255, 0, 200);
    p.strokeWeight(3);
    p.noFill();
    
    // Hand connections (simplified skeleton)
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm connections
    ];
    
    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        const x1 = p.map(landmarks[start].x, 0, 1, -p.width/2, p.width/2);
        const y1 = p.map(landmarks[start].y, 0, 1, -p.height/2, p.height/2);
        const z1 = p.map(landmarks[start].z, 0, 1, -200, 200);
        
        const x2 = p.map(landmarks[end].x, 0, 1, -p.width/2, p.width/2);
        const y2 = p.map(landmarks[end].y, 0, 1, -p.height/2, p.height/2);
        const z2 = p.map(landmarks[end].z, 0, 1, -200, 200);
        
        p.line(x1, y1, z1, x2, y2, z2);
      }
    });
    
    // Draw landmarks
    landmarks.forEach((landmark, index) => {
      if (landmark) {
        const x = p.map(landmark.x, 0, 1, -p.width/2, p.width/2);
        const y = p.map(landmark.y, 0, 1, -p.height/2, p.height/2);
        const z = p.map(landmark.z, 0, 1, -200, 200);
        
        p.push();
        p.translate(x, y, z);
        
        // Different colors for different parts
        if (index === 0) {
          p.fill(255, 0, 0); // Wrist (red)
        } else if (index <= 4) {
          p.fill(255, 255, 0); // Thumb (yellow)
        } else if (index <= 8) {
          p.fill(0, 255, 0); // Index (green)
        } else if (index <= 12) {
          p.fill(0, 255, 255); // Middle (cyan)
        } else if (index <= 16) {
          p.fill(255, 0, 255); // Ring (magenta)
        } else {
          p.fill(255, 255, 255); // Pinky (white)
        }
        
        p.noStroke();
        p.sphere(8);
        
        // Draw landmark number
        p.fill(255, 255, 255);
        p.textSize(12);
        p.textAlign(p.CENTER);
        p.text(index.toString(), 0, -15, 0);
        
        p.pop();
      }
    });
    
    p.pop();
  };

  const drawRecordingIndicator = (p: p5) => {
    p.push();
    p.translate(0, -p.height/2 + 50, 0);
    
    // Recording circle
    p.fill(255, 0, 0, 150);
    p.noStroke();
    p.circle(0, 0, 60);
    
    // Recording text
    p.fill(255, 255, 255);
    p.textSize(16);
    p.textAlign(p.CENTER);
    p.text('RECORDING', 0, 40);
    
    const command = gestureCommands.find(cmd => cmd.id === recordingFor);
    if (command) {
      p.textSize(14);
      p.text(command.name, 0, 60);
    }
    
    p.pop();
  };

  const drawDetectedGestures = (p: p5) => {
    p.push();
    p.translate(-p.width/2 + 20, -p.height/2 + 20, 0);
    
    detectedGestures.forEach((gesture, index) => {
      p.fill(0, 255, 0, 200);
      p.noStroke();
      p.rect(0, index * 30, 200, 25);
      
      p.fill(0, 0, 0);
      p.textSize(12);
      p.textAlign(p.LEFT);
      p.text(`🎯 ${gesture}`, 10, index * 30 + 17);
    });
    
    p.pop();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* 3D Canvas */}
      <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Gesture Commands Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '10px',
        padding: '20px',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '18px' }}>
          🎯 Gesture Commands
        </h3>
        
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}>
            Status: {recordingFor ? `Recording for ${recordingFor}` : 'Ready'}
          </div>
          {recordingFor && (
            <button
              onClick={stopRecording}
              style={{
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '10px'
              }}
            >
              🛑 Stop Recording
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {gestureCommands.map((command) => (
            <div
              key={command.id}
              style={{
                background: command.isActive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: command.isActive ? '1px solid #4CAF50' : '1px solid #333',
                borderRadius: '8px',
                padding: '12px',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                    {command.name}
                  </div>
                  <div style={{ color: '#ccc', fontSize: '12px' }}>
                    {command.description}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => toggleCommand(command.id)}
                    style={{
                      background: command.isActive ? '#4CAF50' : '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    {command.isActive ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => clearGesture(command.id)}
                    style={{
                      background: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>
                {command.recordedGesture ? '✅ Gesture recorded' : '❌ No gesture recorded'}
              </div>
              
              <button
                onClick={() => startRecording(command.id)}
                disabled={!!recordingFor}
                style={{
                  background: recordingFor ? '#666' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '6px 12px',
                  cursor: recordingFor ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  opacity: recordingFor ? 0.5 : 1
                }}
              >
                {recordingFor === command.id ? '🎬 Recording...' : '📹 Capture Gesture'}
              </button>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '11px', color: '#aaa' }}>
          <div>💡 Instructions:</div>
          <div>1. Click "Capture Gesture" for a command</div>
          <div>2. Hold your hand in the desired position</div>
          <div>3. Click "Stop Recording" to save</div>
          <div>4. Toggle "ON" to activate the command</div>
          <div>5. Perform the gesture to trigger the command</div>
        </div>
      </div>
    </div>
  );
} 