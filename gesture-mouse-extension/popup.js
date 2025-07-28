// Popup script for Gesture Mouse Controller
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 POPUP: DOM loaded');
  
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const sensitivitySlider = document.getElementById('sensitivity');
  const statusDiv = document.getElementById('status');
  
  // Check if extension is active
  chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    console.log('🎯 POPUP: Ping response:', response);
    if (response && response.success) {
      updateStatus('Extension Active');
      if (response.active) {
        startBtn.textContent = 'Stop Gesture Control';
        startBtn.disabled = false;
      }
    } else {
      updateStatus('Extension Inactive');
    }
  });
  
  startBtn.addEventListener('click', function() {
    console.log('🎯 POPUP: Start button clicked');
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    updateStatus('Starting camera...');
    
    chrome.runtime.sendMessage({ action: 'start' }, (response) => {
      console.log('🎯 POPUP: Start response:', response);
      if (response && response.success) {
        startBtn.textContent = 'Stop Gesture Control';
        startBtn.disabled = false;
        updateStatus('Camera Active - Gesture Control Running');
      } else {
        startBtn.textContent = 'Start Gesture Control';
        startBtn.disabled = false;
        const errorMsg = response && response.error ? response.error : 'Failed to start camera';
        updateStatus(`Error: ${errorMsg}`);
        
        // Show alert for permission issues
        if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
          alert('Camera permission denied!\n\nTo fix this:\n1. Click the camera icon in the address bar\n2. Select "Allow"\n3. Refresh the page and try again');
        }
      }
    });
  });
  
  stopBtn.addEventListener('click', function() {
    console.log('🎯 POPUP: Stop button clicked');
    stopBtn.disabled = true;
    updateStatus('Stopping camera...');
    
    chrome.runtime.sendMessage({ action: 'stop' }, (response) => {
      console.log('🎯 POPUP: Stop response:', response);
      if (response && response.success) {
        startBtn.textContent = 'Start Gesture Control';
        startBtn.disabled = false;
        stopBtn.disabled = false;
        updateStatus('Camera Stopped');
      } else {
        stopBtn.disabled = false;
        updateStatus('Failed to stop camera');
      }
    });
  });
  
  sensitivitySlider.addEventListener('input', function() {
    const value = this.value;
    console.log('🎯 POPUP: Sensitivity changed to:', value);
    chrome.runtime.sendMessage({ 
      action: 'setSensitivity', 
      sensitivity: value 
    });
  });
  
  function updateStatus(message) {
    statusDiv.textContent = message;
    console.log('🎯 POPUP: Status updated:', message);
  }
}); 