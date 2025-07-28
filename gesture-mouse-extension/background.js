// Background script for Gesture Mouse Controller
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎯 Gesture Mouse Controller extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically
}); 