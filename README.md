# Multi-Hand Gesture Recognition

A modern, real-time multi-hand gesture recognition application built with **Next.js**, **MediaPipe Hands**, and **p5.js**. This application can detect and track both hands simultaneously, recognizing various gestures and enabling interactive 3D object manipulation.

## ✨ Features

- **Multi-Hand Support**: Track both left and right hands simultaneously
- **Real-time Gesture Recognition**: Detect pinch, fist, open hand, pointing, and victory gestures
- **Individual Hand Tracking**: Separate gesture detection for each hand
- **3D Object Interaction**: Grab and manipulate 3D objects with hand gestures
- **Privacy-First Design**: Only hand landmarks are processed, no video is stored or displayed
- **Modern UI**: Built with Next.js and TypeScript for a responsive, modern interface
- **Cross-Platform**: Works on desktop and mobile browsers
- **Multiple Render Modes**:
  - 🎯 **Vector**: Jitter-free hand tracking with smooth interpolation
  - 🤚 **3D Hand**: Animated 3D GLB hand models with bone mapping

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Modern browser with camera access
- Camera permissions enabled

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd multi-hand-gesture-recognition
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

5. **Allow camera access**
   Click "Allow Camera Access (Privacy Mode)" and grant camera permissions

## 🎮 How to Use

### Gesture Recognition

The app recognizes the following gestures:

- **Pinch** 🤏: Bring thumb and index finger together
- **Fist** ✊: Close all fingers into a fist
- **Open Hand** 🖐️: Extend all fingers
- **Pointing** 👆: Extend only index finger
- **Victory** ✌️: Extend index and middle fingers

### Multi-Hand Features

- **Left Hand**: Displayed with green landmarks
- **Right Hand**: Displayed with blue landmarks
- **Individual Detection**: Each hand's gestures are detected separately
- **Combined Interaction**: Both hands can interact simultaneously

### 3D Object Interaction

- **Grab Objects**: Use pinch gesture near the blue 3D object
- **Move Objects**: Drag objects around the 3D space
- **Release**: Open your hand to release objects

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with MediaPipe scripts
│   ├── page.tsx           # Main application page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── CameraControls.tsx # Camera permission and controls
│   ├── GestureDisplay.tsx # Gesture status display
│   └── Sketch.tsx         # p5.js canvas component
├── lib/                   # Utility functions
│   └── gestureDetection.ts # Gesture detection algorithms
└── types/                 # TypeScript type definitions
    └── index.ts           # Application types
```

## 🔧 Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Graphics**: p5.js for 3D rendering and canvas manipulation
- **Computer Vision**: MediaPipe Hands for hand landmark detection
- **Styling**: CSS with modern features (backdrop-filter, gradients)
- **Build Tool**: Next.js with webpack optimization

## 🎯 Performance

- **Multi-Hand Processing**: Minimal performance impact (~5-10% additional CPU)
- **Real-time Tracking**: 30-60 FPS hand tracking
- **Optimized Rendering**: Efficient p5.js WebGL rendering
- **Memory Efficient**: No video storage, only landmark processing

## 🔒 Privacy & Security

- **No Video Storage**: Camera feed is never stored or transmitted
- **Landmark Only**: Only hand landmark coordinates are processed
- **Local Processing**: All processing happens in the browser
- **Privacy Mode**: Video feed is hidden, only landmarks are displayed

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect Next.js and deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🐛 Troubleshooting

### Camera Permission Issues

1. **Browser Permissions**: Check browser camera settings
2. **System Permissions**: Ensure camera access is allowed at system level
3. **HTTPS Required**: Some browsers require HTTPS for camera access
4. **Other Apps**: Close other camera-using applications

### Performance Issues

1. **Lower Resolution**: Reduce camera resolution in code
2. **Close Tabs**: Close other browser tabs
3. **Update Browser**: Use the latest browser version
4. **Check Hardware**: Ensure adequate CPU/GPU performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MediaPipe**: Google's hand tracking technology
- **p5.js**: Creative coding library
- **Next.js**: React framework for production
- **Original Author**: ndr3svt from sooft.studio

## 🔮 Future Enhancements

- [ ] Gesture recording and training system
- [ ] Custom gesture recognition
- [ ] Desktop application (Electron)
- [ ] Advanced 3D interactions
- [ ] Gesture-based computer control
- [ ] Machine learning integration
- [ ] Multi-user support
- [ ] VR/AR integration

---

**Built with ❤️ using Next.js, MediaPipe, and p5.js**
