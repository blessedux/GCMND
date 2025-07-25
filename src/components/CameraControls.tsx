'use client';

import { useState } from 'react';
import { CameraStatus } from '@/types';

interface CameraControlsProps {
  onCameraRequest: () => Promise<void>;
  cameraStatus: CameraStatus;
}

export default function CameraControls({ onCameraRequest, cameraStatus }: CameraControlsProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleCameraRequest = async () => {
    setIsRequesting(true);
    try {
      await onCameraRequest();
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusColor = (status: CameraStatus['status']) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'error':
        return '#f44336';
      case 'requesting':
        return '#ff9800';
      default:
        return '#ffffff';
    }
  };

  return (
    <div style={{ 
      position: 'absolute', 
      bottom: '20px', 
      left: '20px', 
      right: '20px',
      zIndex: 10,
      textAlign: 'center'
    }}>
      <div 
        style={{ 
          color: getStatusColor(cameraStatus.status),
          marginBottom: '10px',
          fontSize: '14px'
        }}
      >
        {cameraStatus.message}
      </div>
      
      {cameraStatus.status === 'waiting' && (
        <button
          style={{
            padding: '12px 24px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
          onClick={handleCameraRequest}
          disabled={isRequesting}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#45a049';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4CAF50';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isRequesting ? 'Requesting...' : '🎥 Start Hand Tracking'}
        </button>
      )}
      
      {cameraStatus.status === 'error' && cameraStatus.error && (
        <div style={{ 
          color: '#ffd700', 
          marginTop: '10px', 
          fontSize: '12px',
          background: 'rgba(255, 215, 0, 0.1)',
          padding: '8px',
          borderRadius: '5px'
        }}>
          {cameraStatus.error}
        </div>
      )}
      
      <div style={{ 
        color: '#90EE90', 
        marginTop: '10px', 
        fontSize: '11px', 
        opacity: 0.8 
      }}>
        <strong>Privacy Mode:</strong> Only hand landmarks processed • No video stored
      </div>
    </div>
  );
} 