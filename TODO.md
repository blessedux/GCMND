# GCMD: Gesture & Voice-Controlled Web Navigation — PoC Roadmap

## Project Overview

Transform the web-based hand gesture recognition app into a comprehensive gesture and voice-controlled web navigation system that can control web interfaces using hand gestures and voice commands.

## 🧪 PoC Scope & Features

### ✅ Core Features

#### 1. Hand Landmark Detection

- [x] Render dots (for depth) and vectors (for gesture recognition)
- [x] Real-time tracking of 21 landmarks per hand
- [x] Multi-hand support (left/right hand tracking)
- [x] Enhanced gesture detection (pinch, fist, open hand, pointing, victory)

#### 2. Cursor Control via Hand Gestures

- [ ] Stable 2D cursor that follows index fingertip
- [ ] Cursor smoothing (e.g. Kalman filter or moving average)
- [ ] Prevent cursor from leaving the screen bounds
- [ ] Cursor speed sensitivity settings

#### 3. Z-Depth Interaction

- [ ] Measure hand's distance from camera
- [ ] Use depth (z-coordinate) to simulate "pushing" or "reaching"
- [ ] Map depth to 3D interaction or UI scaling/trigger zones
- [ ] Optional depth visualizer

#### 4. Gesture Recognition

- [x] Basic gesture detection (pinch, fist, open hand, pointing, victory)
- [ ] Predefined gestures for:
  - [ ] Click
  - [ ] Scroll
  - [ ] Swipe left/right
  - [ ] Grab & drop (for later 3D object manipulation)
- [ ] Inspired by ASL for intuitive ergonomics
- [ ] Gesture confidence scoring
- [ ] Gesture smoothing and filtering

#### 5. Voice Command Input

- [ ] Automatically transcribe speech when a gesture "focuses" an input field
- [ ] Pause triggers Enter key event
- [ ] Voice navigation (e.g., "next", "submit", "scroll down")
- [ ] Web Speech API integration

#### 6. Keyboard Emulation & Navigation

- [ ] Simulate Tab, Enter, and directional keys based on gestures
- [ ] Map gestures to browser events (e.g., click, hover)
- [ ] Customizable key combinations
- [ ] Application-specific gesture sets

#### 7. UI Feedback

- [x] Visual feedback on gesture detection (gesture indicators)
- [ ] Highlight buttons, show glow when in "click zone"
- [ ] Always-on-top gesture overlay
- [ ] Current gesture recognition status
- [ ] Gesture confidence indicator

#### 8. Electron Integration

- [ ] Wrap app into a macOS native .dmg app
- [ ] Optional: use system-level access to control native UI
- [ ] System tray and background running
- [ ] Hotkey to enable/disable

## 🧰 Tech Stack

### 🖐 Hand Tracking

- [x] MediaPipe Hands (via TensorFlow.js)
- [x] Real-time 3D hand landmark detection in browser
- [x] p5.js for canvas rendering

### 🧠 Gesture Recognition

- [x] Custom gesture engine using landmark vector analysis
- [ ] Threshold-based detection for basic gestures
- [ ] Optional: ML model for complex gesture classification
- [ ] Gesture recording and training system

### 🗣 Voice Recognition

- [ ] Web Speech API for real-time speech-to-text (no backend needed)
- [ ] Optional fallback: Whisper API (for more robust transcription, slower)

### 🖱 Cursor Handling

- [ ] Canvas or HTML Overlay
- [ ] Floating cursor element always within viewport
- [ ] JS logic to clamp position
- [ ] Apply moving average filter to reduce jitter

### 🎨 UI & Rendering

- [x] p5.js for canvas rendering
- [x] React.js (with Next.js) for UI & layout structure
- [x] TypeScript for type safety
- [ ] Tailwind CSS or styled-components for styling (optional)

### 📦 Desktop App Packaging

- [ ] Electron.js
- [ ] Wraps the Next.js app into a desktop app
- [ ] Allows system-level input simulation (e.g., with robotjs, node-mac-automation)

### 🧪 Dev Utilities

- [x] Next.js — Fast build/dev environment
- [ ] Tauri (optional alt to Electron, for smaller build size)

## 🗺️ Roadmap (3-Phase PoC)

### Phase 1: Browser-Based MVP ✅ (In Progress)

- [x] Hand landmark rendering (dots + vectors)
- [x] Basic gesture recognition (pinch, fist, open hand, pointing, victory)
- [x] Multi-hand support
- [x] Real-time hand landmark visualization
- [x] Privacy mode (no video storage)
- [ ] Cursor following index finger (smoothed)
- [ ] Gesture-based click & scroll
- [ ] Voice dictation on gesture-based input focus

### Phase 2: Enhanced Interactions ⏳

- [ ] Depth-to-z-axis mapping
- [ ] Grabbing motion → 3D object manipulation
- [ ] Gesture-to-keyboard mappings
- [ ] Advanced gesture recognition
  - [ ] Machine learning for custom gestures
  - [ ] Gesture adaptation over time
  - [ ] User-specific gesture optimization
- [ ] Multi-hand support
  - [ ] Left hand for navigation
  - [ ] Right hand for actions
  - [ ] Two-handed gestures

### Phase 3: Desktop App ⏳

- [ ] Wrap into Electron
- [ ] Allow OS-level navigation (optional)
- [ ] Optimize camera permissions and packaging
- [ ] System tray integration
- [ ] Background running capability

## Detailed Implementation Tasks

### Phase 1: Browser-Based MVP (Current Focus)

#### 1.1 Enhanced Gesture Detection System ✅ (Mostly Complete)

- [x] Expand gesture library beyond pinch
  - [x] Open hand (all fingers extended)
  - [x] Closed fist (all fingers curled)
  - [x] Pointing gesture (index finger extended)
  - [x] Victory sign (index + middle finger)
  - [x] Enhanced pinch detection
- [ ] Create gesture classification system
  - [ ] Implement distance-based gesture detection
  - [ ] Add angle-based gesture recognition
  - [ ] Create gesture confidence scoring
  - [ ] Add gesture smoothing and filtering

#### 1.2 Cursor Control System ⏳

- [ ] Implement cursor control
  - [ ] Map hand position to screen coordinates
  - [ ] Add cursor smoothing and acceleration
  - [ ] Implement cursor boundaries (screen edges)
  - [ ] Add cursor speed sensitivity settings
- [ ] Click simulation
  - [ ] Pinch gesture = left click
  - [ ] Double pinch = double click
  - [ ] Right hand pinch = right click
  - [ ] Add click feedback (visual/audio)

#### 1.3 Voice Integration ⏳

- [ ] Web Speech API integration
  - [ ] Real-time speech-to-text
  - [ ] Voice command recognition
  - [ ] Input field focus detection
- [ ] Voice navigation commands
  - [ ] "next", "submit", "scroll down"
  - [ ] "click", "hover", "select"

#### 1.4 Gesture Recording & Training System ⏳

- [ ] Build gesture recording interface
  - [ ] Create "Record New Gesture" mode
  - [ ] Add gesture naming and labeling
  - [ ] Implement gesture data collection
  - [ ] Add gesture validation system
- [ ] Gesture storage system
  - [ ] Local JSON storage for custom gestures
  - [ ] Gesture export/import functionality
  - [ ] Gesture editing and deletion
  - [ ] Gesture categories (basic, advanced, custom)

### Phase 2: Enhanced Interactions

#### 2.1 Z-Depth Interaction System

- [ ] Depth measurement implementation
  - [ ] Calculate hand distance from camera
  - [ ] Map depth to interaction zones
  - [ ] 3D object manipulation
- [ ] Depth visualizer
  - [ ] Real-time depth display
  - [ ] Interaction zone indicators

#### 2.2 Advanced Gesture Recognition

- [ ] Multi-hand support
  - [ ] Left hand for navigation
  - [ ] Right hand for actions
  - [ ] Two-handed gestures
  - [ ] Hand switching detection
- [ ] Dynamic gesture recognition
  - [ ] Machine learning for custom gestures
  - [ ] Gesture adaptation over time
  - [ ] User-specific gesture optimization
  - [ ] Gesture context awareness

#### 2.3 Keyboard Emulation & Navigation

- [ ] Create action mapping system
  - [ ] Gesture → Action configuration file
  - [ ] Customizable key combinations
  - [ ] Application-specific gesture sets
  - [ ] Context-aware gesture recognition
- [ ] Basic actions to implement
  - [ ] Open hand = move cursor
  - [ ] Pinch = click
  - [ ] Fist = drag
  - [ ] Pointing = hover
  - [ ] Victory = scroll
  - [ ] Thumbs up = confirm
  - [ ] Thumbs down = cancel

### Phase 3: Desktop App

#### 3.1 Electron Integration

- [ ] Convert to Electron app
  - [ ] Set up Electron project structure
  - [ ] Integrate existing Next.js + p5.js + MediaPipe code
  - [ ] Add system tray and background running
  - [ ] Implement hotkey to enable/disable
- [ ] System-level integration
  - [ ] Choose technology stack for computer control
  - [ ] Node.js with robotjs or Python PyAutoGUI
  - [ ] macOS native .dmg app packaging

#### 3.2 Visual Feedback System

- [ ] On-screen gesture indicator
  - [ ] Always-on-top gesture overlay
  - [ ] Real-time hand landmark display
  - [ ] Current gesture recognition status
  - [ ] Gesture confidence indicator
- [ ] System integration feedback
  - [ ] Cursor position indicator
  - [ ] Action preview before execution
  - [ ] Gesture history display
  - [ ] Error feedback for failed gestures

#### 3.3 Configuration & Settings

- [ ] Settings interface
  - [ ] Gesture sensitivity controls
  - [ ] Cursor speed settings
  - [ ] Gesture timeout settings
  - [ ] Application exclusions
- [ ] Profile system
  - [ ] Multiple user profiles
  - [ ] Application-specific profiles
  - [ ] Gesture set switching
  - [ ] Profile import/export

#### 3.4 Safety & Reliability

- [ ] Safety features
  - [ ] Emergency stop gesture
  - [ ] Gesture confirmation for destructive actions
  - [ ] Timeout for accidental gestures
  - [ ] Undo/redo functionality
- [ ] Performance optimization
  - [ ] Gesture recognition optimization
  - [ ] Memory usage optimization
  - [ ] CPU usage monitoring
  - [ ] Battery usage optimization

## Immediate Next Steps (Priority Order)

### Step 1: Cursor Control System (Week 1)

1. **Implement cursor following index finger**

   - [ ] Map hand position to screen coordinates
   - [ ] Add cursor smoothing (moving average filter)
   - [ ] Implement cursor boundaries
   - [ ] Add cursor speed sensitivity settings

2. **Basic click simulation**
   - [ ] Pinch gesture = left click
   - [ ] Add click feedback

### Step 2: Voice Integration (Week 2)

1. **Web Speech API integration**

   - [ ] Real-time speech-to-text
   - [ ] Voice command recognition
   - [ ] Input field focus detection

2. **Voice navigation commands**
   - [ ] Basic navigation commands
   - [ ] Form input assistance

### Step 3: Gesture Recording System (Week 3)

1. **Create gesture recording UI**

   - [ ] Simple UI to record new gestures
   - [ ] Basic gesture storage

2. **Gesture management**
   - [ ] Edit and delete gestures
   - [ ] Gesture validation

## Progress Tracking

### Completed ✅

- [x] Basic hand gesture recognition (pinch)
- [x] Web-based p5.js + MediaPipe integration
- [x] Camera permission handling
- [x] Basic UI and styling
- [x] Demo mode for testing
- [x] Multi-hand gesture recognition (left/right hand tracking)
- [x] Enhanced gesture detection (pinch, fist, open hand, pointing, victory)
- [x] Next.js refactor with TypeScript
- [x] Clean, centered UI without scrolling
- [x] Real-time hand landmark visualization
- [x] Privacy mode (no video storage)
- [x] Hand landmark rendering (dots + vectors)

### In Progress ⏳

- [ ] Cursor control system
- [ ] Voice integration
- [ ] Gesture recording system

### Next Up 🔄

- [ ] Z-depth interaction
- [ ] Advanced gesture recognition
- [ ] Electron integration for desktop app

## Current Focus: Phase 1 - Cursor Control System

**Goal**: Implement stable cursor control that follows the index fingertip with proper smoothing and boundaries.

**Tasks**:

1. [ ] Map hand position to screen coordinates
2. [ ] Implement cursor smoothing (moving average filter)
3. [ ] Add cursor boundaries (screen edges)
4. [ ] Add cursor speed sensitivity settings
5. [ ] Implement basic click simulation

**Success Criteria**:

- [ ] Cursor smoothly follows index finger
- [ ] Cursor stays within screen bounds
- [ ] Click simulation works with pinch gesture
- [ ] Cursor movement is responsive and accurate

---

_Last Updated: January 2025_
_Current Phase: Phase 1 - Cursor Control System_
_Project Status: Active Development_
