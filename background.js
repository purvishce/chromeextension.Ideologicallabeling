chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: received', message, 'from', sender);
  if (message && message.greeting === 'hello from popup') {
    sendResponse({ farewell: 'hello from background' });
  }
  // no async response, so no need to return true here
});
