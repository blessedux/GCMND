'use client';

import { MultiHandData } from '@/types';

interface GestureDisplayProps {
  multiHandData: MultiHandData;
  showOpenHandIndicator: boolean;
}

export default function GestureDisplay({ multiHandData, showOpenHandIndicator }: GestureDisplayProps) {
  const gestureDisplayName: Record<string, string> = {
    pinch: "Pinch",
    fist: "Fist", 
    openHand: "Open Hand",
    pointing: "Pointing",
    victory: "Victory",
    None: "No Gesture"
  };

  const getHandStatus = (hand: MultiHandData['leftHand'] | MultiHandData['rightHand']) => {
    if (!hand) return "Not detected";
    const confidence = Math.round(hand.confidence * 100);
    return `${gestureDisplayName[hand.gesture] || hand.gesture} (${confidence}%)`;
  };

  return (
    <div className="info" style={{ 
      position: 'absolute', 
      top: '20px', 
      left: '20px', 
      right: '20px',
      zIndex: 10,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '15px',
      padding: '15px',
      fontSize: '14px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '1.2em' }}>🤚 Hand Tracking</h2>
        <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
          Hands: {multiHandData.totalHands}/2
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9em' }}>
        <div>
          <strong style={{ color: '#90EE90' }}>Left:</strong> {getHandStatus(multiHandData.leftHand)}
        </div>
        <div>
          <strong style={{ color: '#87CEEB' }}>Right:</strong> {getHandStatus(multiHandData.rightHand)}
        </div>
      </div>
      
      {showOpenHandIndicator && (
        <div style={{ 
          marginTop: '10px', 
          padding: '8px', 
          background: 'rgba(0, 255, 0, 0.2)', 
          border: '1px solid #00ff00', 
          borderRadius: '5px',
          textAlign: 'center',
          fontSize: '0.8em'
        }}>
          🖐️ OPEN HAND DETECTED
        </div>
      )}
    </div>
  );
} 