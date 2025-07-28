import { HandLandmark, GestureResult, GestureThresholds } from '@/types';

export const GESTURE_THRESHOLDS: GestureThresholds = {
  PINCH: 0.15, // Much more lenient threshold for easier pinch detection
  FIST: 0.08,
  OPEN_HAND: 0.06,
  POINTING: 0.06,
  VICTORY: 0.04
};

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function detectPinch(landmarks: HandLandmark[]): GestureResult {
  const pinchDistance = distance(
    landmarks[4].x, landmarks[4].y,
    landmarks[8].x, landmarks[8].y
  );
  
  // Debug pinch distance
  if (pinchDistance < 0.2) { // Log when close to pinch
    console.log('📏 Pinch distance:', pinchDistance.toFixed(4), 'threshold:', GESTURE_THRESHOLDS.PINCH);
  }
  
  return {
    gesture: 'pinch',
    detected: pinchDistance < GESTURE_THRESHOLDS.PINCH,
    confidence: 1 - (pinchDistance / GESTURE_THRESHOLDS.PINCH),
    distance: pinchDistance
  };
}

export function detectFist(landmarks: HandLandmark[]): GestureResult {
  const fingerTips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
  const fingerBases = [5, 9, 13, 17]; // Index, middle, ring, pinky bases
  
  let totalDistance = 0;
  let validFingers = 0;
  
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    const dist = distance(tip.x, tip.y, base.x, base.y);
    totalDistance += dist;
    validFingers++;
  }
  
  const avgDistance = totalDistance / validFingers;
  return {
    gesture: 'fist',
    detected: avgDistance < GESTURE_THRESHOLDS.FIST,
    confidence: 1 - (avgDistance / GESTURE_THRESHOLDS.FIST),
    distance: avgDistance
  };
}

export function detectOpenHand(landmarks: HandLandmark[]): GestureResult {
  const fingerTips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
  const fingerBases = [5, 9, 13, 17]; // Index, middle, ring, pinky bases
  
  let totalDistance = 0;
  let validFingers = 0;
  let extendedFingers = 0;
  
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    const dist = distance(tip.x, tip.y, base.x, base.y);
    totalDistance += dist;
    validFingers++;
    
    // Count how many fingers are extended
    if (dist > GESTURE_THRESHOLDS.OPEN_HAND * 0.8) {
      extendedFingers++;
    }
  }
  
  const avgDistance = totalDistance / validFingers;
  
  // Require at least 1 out of 4 fingers to be extended for open hand
  const isOpenHand = extendedFingers >= 1 && avgDistance > GESTURE_THRESHOLDS.OPEN_HAND * 0.7;
  
  return {
    gesture: 'openHand',
    detected: isOpenHand,
    confidence: Math.min(avgDistance / GESTURE_THRESHOLDS.OPEN_HAND, 1),
    distance: avgDistance,
    extendedFingers
  };
}

export function detectPointing(landmarks: HandLandmark[]): GestureResult {
  const fingerTips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
  const fingerBases = [5, 9, 13, 17]; // Index, middle, ring, pinky bases
  
  const indexDistance = distance(
    landmarks[8].x, landmarks[8].y,
    landmarks[5].x, landmarks[5].y
  );
  
  // Check if other fingers are curled
  let otherFingersCurled = true;
  for (let i = 1; i < fingerTips.length; i++) {
    const dist = distance(
      landmarks[fingerTips[i]].x, landmarks[fingerTips[i]].y,
      landmarks[fingerBases[i]].x, landmarks[fingerBases[i]].y
    );
    if (dist > GESTURE_THRESHOLDS.POINTING) {
      otherFingersCurled = false;
      break;
    }
  }
  
  return {
    gesture: 'pointing',
    detected: indexDistance > GESTURE_THRESHOLDS.OPEN_HAND && otherFingersCurled,
    confidence: Math.min(indexDistance / GESTURE_THRESHOLDS.OPEN_HAND, 1),
    distance: indexDistance
  };
}

export function detectVictory(landmarks: HandLandmark[]): GestureResult {
  const indexDistance = distance(
    landmarks[8].x, landmarks[8].y,
    landmarks[5].x, landmarks[5].y
  );
  const middleDistance = distance(
    landmarks[12].x, landmarks[12].y,
    landmarks[9].x, landmarks[9].y
  );
  
  // Check if ring and pinky are curled
  const ringDistance = distance(
    landmarks[16].x, landmarks[16].y,
    landmarks[13].x, landmarks[13].y
  );
  const pinkyDistance = distance(
    landmarks[20].x, landmarks[20].y,
    landmarks[17].x, landmarks[17].y
  );
  
  const indexMiddleExtended = indexDistance > GESTURE_THRESHOLDS.OPEN_HAND && 
                             middleDistance > GESTURE_THRESHOLDS.OPEN_HAND;
  const othersCurled = ringDistance < GESTURE_THRESHOLDS.POINTING && 
                      pinkyDistance < GESTURE_THRESHOLDS.POINTING;
  
  return {
    gesture: 'victory',
    detected: indexMiddleExtended && othersCurled,
    confidence: Math.min((indexDistance + middleDistance) / (2 * GESTURE_THRESHOLDS.OPEN_HAND), 1),
    distance: (indexDistance + middleDistance) / 2
  };
}

export function detectAllGestures(landmarks: HandLandmark[]): GestureResult {
  const gestures = {
    pinch: detectPinch(landmarks),
    fist: detectFist(landmarks),
    openHand: detectOpenHand(landmarks),
    pointing: detectPointing(landmarks),
    victory: detectVictory(landmarks)
  };
  
  // Find the gesture with highest confidence
  let bestGesture: GestureResult = { gesture: 'None', confidence: 0, detected: false };
  
  Object.entries(gestures).forEach(([gestureName, gestureResult]) => {
    if (gestureResult.detected && gestureResult.confidence > bestGesture.confidence) {
      bestGesture = {
        gesture: gestureName,
        confidence: gestureResult.confidence,
        detected: true,
        distance: gestureResult.distance,
        extendedFingers: gestureResult.extendedFingers
      };
    }
  });
  
  return bestGesture;
} 