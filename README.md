# Hand Gesture Recognition with p5.js

This is a real-time hand gesture recognition application built with p5.js and MediaPipe Hands. The application detects pinch gestures and allows you to interact with a 3D object in the canvas.

## Features

- **Real-time hand tracking** using MediaPipe Hands
- **Pinch gesture detection** between thumb and index finger
- **3D object interaction** - grab and move objects with hand gestures
- **Visual feedback** showing hand landmarks and gesture status
- **Responsive design** that works on different screen sizes

## How to Run

1. **Open the application**: Simply open `index.html` in a modern web browser
2. **Allow camera access**: When prompted, allow the browser to access your camera
3. **Start gesturing**: Make pinch gestures with your thumb and index finger to interact with the blue object

## How to Use

1. **Pinch Detection**: Bring your thumb and index finger close together to create a pinch gesture
2. **Object Interaction**: When you make a pinch gesture near the blue object, it will be "grabbed" and follow your hand
3. **Release**: Open your fingers to release the object
4. **Visual Feedback**:
   - Green dots show your hand landmarks
   - Red line shows pinch distance
   - Blue object can be grabbed and moved
   - Status text shows if pinch is detected

## Technical Details

- **p5.js**: For 3D graphics and canvas rendering
- **MediaPipe Hands**: For hand landmark detection
- **WebGL**: For 3D rendering
- **Real-time processing**: Hand tracking runs at camera frame rate

## Browser Requirements

- Modern browser with WebGL support
- Camera access permissions
- HTTPS recommended for camera access (some browsers require it)

## Credits

Original code by [ndr3svt from sooft.studio](https://www.instagram.com/ndr3svt/)

- Instagram: [@ndr3svt](https://www.instagram.com/ndr3svt/)
- Studio: [@sooft.studio](https://www.instagram.com/sooft.studio/)

## References

- [MediaPipe Hands Documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
- [Hand Landmark Detection Paper](https://arxiv.org/abs/2006.10214)
- [Gesture Recognition Article](https://medium.com/@andresvillatorres/bringing-gesture-recognition-to-life-with-p5-js-hand-landmarks-and-machine-learning-66f66f91ab72)
