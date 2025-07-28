// Background script for camera access
console.log('🎯 BACKGROUND: Camera script loaded');

let isActive = false;

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🎯 BACKGROUND: Received message:', request.action);
  
  if (request.action === 'start') {
    // Send message to content script to start camera
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startCamera' }, (response) => {
          console.log('🎯 BACKGROUND: Content script response:', response);
          if (response && response.success) {
            isActive = true;
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Failed to start camera' });
          }
        });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'stop') {
    // Send message to content script to stop camera
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCamera' }, (response) => {
          console.log('🎯 BACKGROUND: Stop response:', response);
          isActive = false;
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'ping') {
    sendResponse({ success: true, active: isActive });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'cameraStarted') {
    console.log('🎯 BACKGROUND: Camera started by content script');
    isActive = true;
  }
  
  if (request.action === 'cameraStopped') {
    console.log('🎯 BACKGROUND: Camera stopped by content script');
    isActive = false;
  }
}); 