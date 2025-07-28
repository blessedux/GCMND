# 🎯 Gesture Mouse Controller Chrome Extension

A Chrome extension that allows you to control your mouse cursor using hand gestures detected through your webcam.

## 🚀 Quick Installation

1. **Download the extension files** to a folder on your computer
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in top right)
4. **Click "Load unpacked"** and select the extension folder
5. **Grant camera permissions** when prompted

## 🎮 How to Use

1. **Click the extension icon** in your Chrome toolbar
2. **Click "Start Gesture Control"** to begin
3. **Move your hand** to control the cursor
4. **Pinch your thumb and index finger** to click/drag
5. **Adjust sensitivity** using the slider if needed

## 🎯 Gesture Controls

- **🖐️ Open Hand**: Move cursor around the screen
- **🤏 Pinch (Thumb + Index)**: Click and drag elements
- **📏 Sensitivity**: Adjust how responsive the cursor is to hand movement

## 🔧 Features

- ✅ **Real-time hand tracking** using MediaPipe
- ✅ **Pinch-to-click** functionality
- ✅ **Adjustable sensitivity**
- ✅ **Works on any website**
- ✅ **Privacy-focused** (no data sent to servers)

## 🛠️ Technical Details

- **MediaPipe Hands** for accurate hand landmark detection
- **WebRTC** for camera access
- **MouseEvent simulation** for browser interaction
- **Chrome Extension Manifest V3** for modern browser compatibility

## 🚨 Privacy & Security

- Camera access is only used for gesture detection
- No data is stored or transmitted
- All processing happens locally in your browser
- You can stop the extension at any time

## 🔄 Alternative Solutions

If you need more advanced features, consider:

1. **WebRTC + WebSocket Server**: For controlling multiple browsers
2. **Browser Automation**: For complex web interactions
3. **Native Applications**: For system-wide mouse control

## 🐛 Troubleshooting

- **Camera not working**: Check browser permissions
- **Gestures not detected**: Ensure good lighting and hand visibility
- **Extension not loading**: Verify Developer mode is enabled
- **Performance issues**: Lower sensitivity or close other camera apps

## 📝 License

This extension is provided as-is for educational and personal use.
