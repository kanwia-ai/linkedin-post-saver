// Main content script - initializes extraction and UI

(function() {
  // Only run on LinkedIn
  if (!window.location.hostname.includes('linkedin.com')) return;

  console.log('[LinkedIn Post Saver] Content script loaded');

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Small delay to ensure LinkedIn's own scripts have loaded
    setTimeout(() => {
      // Initialize UI
      window.LinkedInSaverUI.init();

      // Check if backfill mode is enabled
      chrome.storage.local.get(['backfillMode'], (result) => {
        if (result.backfillMode) {
          window.LinkedInSaverUI.setBackfillMode(true);
        }
      });

      console.log('[LinkedIn Post Saver] Initialized');
    }, 1000);

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggleBackfillMode') {
        window.LinkedInSaverUI.setBackfillMode(message.enabled);
        sendResponse({ success: true });
      }
      return true;
    });
  }
})();
