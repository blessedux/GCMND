export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface Handedness {
  label: 'Left' | 'Right';
  score: number;
}

export interface MediaPipeResults {
  multiHandLandmarks?: HandLandmark[][];
  multiHandedness?: Handedness[];
}

export interface GestureResult {
  gesture: string;
  confidence: number;
  detected: boolean;
  distance?: number;
  extendedFingers?: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  gesture: string;
  confidence: number;
}

export interface MultiHandData {
  leftHand: HandData | null;
  rightHand: HandData | null;
  totalHands: number;
}

export type GestureType = 'pinch' | 'fist' | 'openHand' | 'pointing' | 'victory' | 'None';

export interface GestureThresholds {
  PINCH: number;
  FIST: number;
  OPEN_HAND: number;
  POINTING: number;
  VICTORY: number;
}

export interface CameraStatus {
  status: 'waiting' | 'requesting' | 'active' | 'error';
  message: string;
  error?: string;
}

export interface ObjectVector {
  x: number;
  y: number;
  z: number;
} 