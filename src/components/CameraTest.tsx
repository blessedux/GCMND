'use client';

import { useState, useRef } from 'react';

export default function CameraTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const testCamera = async () => {
    setIsTesting(true);
    setTestResult('Testing camera...');

    try {
      // Test basic camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setTestResult('✅ Camera test successful! Camera is working.');
      }

    } catch (error: any) {
      console.error('Camera test failed:', error);
      
      let errorMessage = '❌ Camera test failed';
      if (error.name === 'NotAllowedError') {
        errorMessage = '❌ Camera permission denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '❌ No camera found. Please connect a camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '❌ Camera is in use by another application.';
      } else {
        errorMessage = `❌ Camera error: ${error.message}`;
      }
      
      setTestResult(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ 
      margin: '20px 0', 
      padding: '20px', 
      border: '1px solid #ccc', 
      borderRadius: '10px',
      backgroundColor: 'rgba(255,255,255,0.1)'
    }}>
      <h3>Camera Test</h3>
      <button 
        onClick={testCamera}
        disabled={isTesting}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isTesting ? 'not-allowed' : 'pointer',
          marginBottom: '10px'
        }}
      >
        {isTesting ? 'Testing...' : 'Test Camera Access'}
      </button>
      
      {testResult && (
        <div style={{ 
          marginTop: '10px',
          padding: '10px',
          backgroundColor: testResult.includes('✅') ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)',
          borderRadius: '5px'
        }}>
          {testResult}
        </div>
      )}
      
      <video 
        ref={videoRef}
        style={{ 
          width: '320px', 
          height: '180px', 
          border: '1px solid #ccc',
          borderRadius: '5px',
          marginTop: '10px'
        }}
        autoPlay 
        muted 
        playsInline
      />
    </div>
  );
} 