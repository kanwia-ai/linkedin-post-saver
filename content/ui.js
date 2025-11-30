// Injected UI elements for LinkedIn Post Saver

const LinkedInSaverUI = {
  initialized: false,
  floatingBtn: null,
  toast: null,
  backfillHelper: null,
  scrollThrottleTimer: null,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.injectStyles();
    this.createFloatingButton();
    this.observeSaveButton();

    // If on saved posts page, mark which ones are already captured
    if (window.location.pathname.includes('/my-items/saved-posts')) {
      // Try multiple times with increasing delays to catch LinkedIn's lazy loading
      this.markSavedPosts();
      setTimeout(() => this.markSavedPosts(), 500);
      setTimeout(() => this.markSavedPosts(), 1500);
      setTimeout(() => this.markSavedPosts(), 3000);

      // Also watch for new cards being added to the DOM
      this.observeNewCards();

      // Re-check when user scrolls (LinkedIn lazy loads) - throttled
      window.addEventListener('scroll', () => {
        if (this.scrollThrottleTimer) return;
        this.scrollThrottleTimer = setTimeout(() => {
          this.markSavedPosts();
          this.scrollThrottleTimer = null;
        }, 500);
      }, { passive: true });
    }

    console.log('[LinkedIn Post Saver] UI initialized');
  },

  injectStyles() {
    if (document.getElementById('lps-styles')) return;

    const style = document.createElement('style');
    style.id = 'lps-styles';
    style.textContent = `
      .lps-floating-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .lps-comments-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        background: white;
        padding: 6px 10px;
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-size: 12px;
        color: #333;
        cursor: pointer;
        user-select: none;
      }
      .lps-comments-toggle input[type="checkbox"] {
        width: 14px !important;
        height: 14px !important;
        min-width: 14px !important;
        min-height: 14px !important;
        cursor: pointer;
        appearance: checkbox !important;
        -webkit-appearance: checkbox !important;
        opacity: 1 !important;
        position: relative !important;
        pointer-events: auto !important;
        margin: 0 !important;
      }
      .lps-floating-btn {
        background: #0a66c2;
        color: white;
        border: none;
        border-radius: 50%;
        width: 56px;
        height: 56px;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, background 0.2s;
      }
      .lps-floating-btn:hover {
        transform: scale(1.1);
        background: #004182;
      }
      .lps-floating-btn.success {
        background: #057642;
      }
      .lps-floating-btn.error {
        background: #cc1016;
      }
      .lps-floating-btn.loading {
        pointer-events: none;
        opacity: 0.8;
      }

      .lps-toast {
        position: fixed;
        bottom: 100px;
        right: 24px;
        z-index: 10001;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s, transform 0.3s;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .lps-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
      .lps-toast.success {
        background: #057642;
      }
      .lps-toast.error {
        background: #cc1016;
      }

      .lps-backfill-helper {
        position: fixed;
        bottom: 100px;
        right: 24px;
        z-index: 10000;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        padding: 16px;
        display: none;
        flex-direction: column;
        gap: 12px;
        min-width: 220px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .lps-backfill-helper.show {
        display: flex;
      }
      .lps-backfill-helper h3 {
        margin: 0;
        font-size: 16px;
        color: #333;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .lps-backfill-helper h3::before {
        content: "📋";
      }
      .lps-backfill-helper .lps-progress {
        font-size: 14px;
        color: #666;
      }
      .lps-backfill-helper .lps-count {
        font-weight: bold;
        color: #0a66c2;
        font-size: 18px;
      }
      .lps-backfill-helper button {
        background: #0a66c2;
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 24px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      }
      .lps-backfill-helper button:hover {
        background: #004182;
      }
      .lps-backfill-helper button.secondary {
        background: #666;
      }
      .lps-backfill-helper button.secondary:hover {
        background: #444;
      }
      .lps-backfill-helper button:disabled {
        opacity: 0.7;
        cursor: wait;
      }
      .lps-backfill-helper button.success {
        background: #057642 !important;
        color: white !important;
      }
      .lps-backfill-comments {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        cursor: pointer;
        font-size: 14px;
        color: #333;
        margin-bottom: 4px;
      }
      .lps-backfill-comments input[type="checkbox"] {
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        min-height: 16px !important;
        cursor: pointer;
        appearance: checkbox !important;
        -webkit-appearance: checkbox !important;
        opacity: 1 !important;
        position: relative !important;
        pointer-events: auto !important;
        margin: 0 !important;
      }
      .lps-floating-container.hidden {
        display: none;
      }

      /* Saved post indicators on the list page */
      .lps-post-badge {
        position: absolute !important;
        top: 12px !important;
        left: 12px !important;
        z-index: 9999 !important;
        padding: 6px 12px !important;
        border-radius: 16px !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
        pointer-events: none !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        border: 2px solid white !important;
      }
      .lps-post-badge.saved {
        background: #057642 !important;
        color: white !important;
      }
      .lps-post-badge.unsaved {
        background: #ff6b00 !important;
        color: white !important;
      }
      .lps-post-card-overlay {
        position: relative !important;
      }
      .lps-post-card-overlay.is-saved {
        opacity: 0.5 !important;
      }

      /* Progress bar for backfill */
      .lps-backfill-progress {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: #e0e0e0;
        z-index: 10002;
      }
      .lps-backfill-progress-bar {
        height: 100%;
        background: #057642;
        transition: width 0.3s;
      }
    `;
    document.head.appendChild(style);
  },

  createFloatingButton() {
    // Container for toggle + button
    const container = document.createElement('div');
    container.className = 'lps-floating-container';

    // Comments toggle
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'lps-comments-toggle';
    toggleLabel.innerHTML = `
      <input type="checkbox" id="lps-include-comments" checked>
      <span>Include comments</span>
    `;
    container.appendChild(toggleLabel);
    this.commentsToggle = toggleLabel.querySelector('input');

    // Main capture button
    const btn = document.createElement('button');
    btn.className = 'lps-floating-btn';
    btn.innerHTML = '📥';
    btn.title = 'Save this post to your collection';
    btn.addEventListener('click', () => this.captureCurrentPost());
    container.appendChild(btn);
    this.floatingBtn = btn;

    document.body.appendChild(container);
    this.floatingContainer = container;

    // Toast notification
    const toast = document.createElement('div');
    toast.className = 'lps-toast';
    document.body.appendChild(toast);
    this.toast = toast;

    // Backfill helper panel
    const helper = document.createElement('div');
    helper.className = 'lps-backfill-helper';
    helper.innerHTML = `
      <h3>Backfill Mode</h3>
      <div class="lps-progress">
        Posts saved: <span class="lps-count" id="lps-count">0</span>
      </div>
      <label class="lps-backfill-comments">
        <input type="checkbox" id="lps-backfill-comments" checked>
        <span>Include comments</span>
      </label>
      <button id="lps-capture-next">📥 Save Post</button>
      <button id="lps-next" class="secondary">← Back to List</button>
      <button id="lps-done" class="secondary" style="display: none;">✓ Done</button>
    `;
    document.body.appendChild(helper);
    this.backfillHelper = helper;
    this.backfillCommentsToggle = helper.querySelector('#lps-backfill-comments');
    this.backfillSaveBtn = helper.querySelector('#lps-capture-next');
    this.backfillDoneBtn = helper.querySelector('#lps-done');

    // Backfill helper buttons
    this.backfillSaveBtn.addEventListener('click', async () => {
      await this.captureCurrentPost();
      // Don't auto-navigate - let user control the flow
    });
    helper.querySelector('#lps-next').addEventListener('click', () => {
      // Navigate to saved posts list
      window.location.href = 'https://www.linkedin.com/my-items/saved-posts/';
    });
    helper.querySelector('#lps-done').addEventListener('click', () => this.exitBackfillMode());
  },

  observeSaveButton() {
    // Watch for clicks on LinkedIn's "Save" button
    document.addEventListener('click', (e) => {
      const target = e.target;

      // Check if clicked element or its parent has "Save" in aria-label
      const saveBtn = target.closest('[aria-label*="Save"]');
      if (saveBtn) {
        const label = saveBtn.getAttribute('aria-label') || '';
        // Make sure it's the save action, not "Saved" (already saved)
        if (label.includes('Save') && !label.includes('Saved') && !label.includes('Unsave')) {
          console.log('[LinkedIn Post Saver] Save button clicked, capturing post...');
          // Delay to let LinkedIn's UI update
          setTimeout(() => this.captureCurrentPost(), 500);
        }
      }
    }, true);
  },

  async captureCurrentPost() {
    // Check if we're on an individual post page
    const url = window.location.href;
    const isPostPage = url.includes('/feed/update/') || url.includes('/posts/');

    if (!isPostPage) {
      this.showToast('Click into a post first, then save', 'error');
      return;
    }

    // Check if we're in backfill mode to update the correct button
    const isBackfillMode = this.backfillHelper?.classList.contains('show');
    const activeBtn = isBackfillMode ? this.backfillSaveBtn : this.floatingBtn;
    const originalContent = activeBtn.innerHTML;

    // Show loading state
    activeBtn.innerHTML = '⏳ Saving...';
    activeBtn.disabled = true;
    if (!isBackfillMode) {
      this.floatingBtn.classList.add('loading');
    }

    try {
      // Check if we should extract comments (from the appropriate toggle)
      const shouldExtractComments = isBackfillMode
        ? (this.backfillCommentsToggle?.checked ?? true)
        : (this.commentsToggle?.checked ?? true);

      if (shouldExtractComments) {
        // First, expand all comments
        this.showToast('Expanding comments...');
        const expanded = await window.LinkedInExtractor.expandAllComments();
        if (expanded > 0) {
          this.showToast(`Expanded ${expanded} comment sections`);
          await new Promise(r => setTimeout(r, 500)); // Wait for final load
        }
      }

      const postData = window.LinkedInExtractor.extractPost(shouldExtractComments);

      // Also extract external links
      postData.links = window.LinkedInExtractor.extractLinks();

      console.log('[LinkedIn Post Saver] Extracted post:', postData);

      // Send to background script for saving
      const response = await chrome.runtime.sendMessage({
        action: 'savePost',
        post: postData
      });

      if (response.success) {
        activeBtn.innerHTML = '✓ Saved!';
        if (!isBackfillMode) {
          this.floatingBtn.classList.remove('loading');
          this.floatingBtn.classList.add('success');
        } else {
          // Show the Done button (green) after first successful save
          this.backfillDoneBtn.style.display = 'block';
          this.backfillDoneBtn.classList.add('success');
        }

        if (response.duplicate) {
          this.showToast('Already saved!', 'success');
        } else {
          this.showToast(`Saved: ${postData.author?.name || 'Post'}`, 'success');
          this.updateBackfillCount();
        }
      } else {
        throw new Error(response.error || 'Save failed');
      }
    } catch (err) {
      console.error('[LinkedIn Post Saver] Error:', err);
      activeBtn.innerHTML = '✗ Error';
      if (!isBackfillMode) {
        this.floatingBtn.classList.remove('loading');
        this.floatingBtn.classList.add('error');
      }
      this.showToast(`Error: ${err.message}`, 'error');
    }

    // Reset button after delay
    setTimeout(() => {
      activeBtn.innerHTML = originalContent;
      activeBtn.disabled = false;
      if (!isBackfillMode) {
        this.floatingBtn.classList.remove('success', 'error', 'loading');
      }
    }, 2000);
  },

  showToast(message, type = '') {
    this.toast.textContent = message;
    this.toast.className = 'lps-toast show' + (type ? ' ' + type : '');

    setTimeout(() => {
      this.toast.classList.remove('show');
    }, 3000);
  },

  setBackfillMode(enabled) {
    if (enabled) {
      this.backfillHelper.classList.add('show');
      this.floatingContainer?.classList.add('hidden');
      this.updateBackfillCount();
    } else {
      this.backfillHelper.classList.remove('show');
      this.floatingContainer?.classList.remove('hidden');
    }
  },

  async updateBackfillCount() {
    try {
      const result = await chrome.storage.local.get(['postCount']);
      const postCount = result.postCount || 0;
      const countElem = this.backfillHelper.querySelector('#lps-count');
      if (countElem) {
        countElem.textContent = postCount;
      }
      // Note: Done button is shown only after saving THIS post, not based on total count
    } catch (err) {
      console.error('[LinkedIn Post Saver] Error updating count:', err);
    }
  },

  exitBackfillMode() {
    chrome.storage.local.set({ backfillMode: false });
    this.backfillHelper.classList.remove('show');
    this.floatingContainer?.classList.remove('hidden');
    this.showToast('Backfill mode disabled');
  },

  observeNewCards() {
    // Watch for new post cards being added to the DOM
    const observer = new MutationObserver((mutations) => {
      let hasNewCards = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && (
              node.matches?.('[data-chameleon-result-urn]') ||
              node.querySelector?.('[data-chameleon-result-urn]')
            )) {
              hasNewCards = true;
              break;
            }
          }
        }
        if (hasNewCards) break;
      }
      if (hasNewCards) {
        // Debounce to avoid too many calls
        clearTimeout(this.cardObserverTimer);
        this.cardObserverTimer = setTimeout(() => this.markSavedPosts(), 200);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  async markSavedPosts() {
    // Only run on saved posts list page
    if (!window.location.pathname.includes('/my-items/saved-posts')) return;

    console.log('[LPS Debug] markSavedPosts() called on:', window.location.pathname);

    try {
      // Get all saved post URLs from storage
      const result = await chrome.storage.local.get(['posts']);
      const savedPosts = result.posts || [];
      const savedUrls = new Set(savedPosts.map(p => p.url));
      const savedIds = new Set(savedPosts.map(p => p.id));

      console.log('[LPS Debug] Saved posts in storage:', savedPosts.length);
      console.log('[LPS Debug] Saved IDs:', [...savedIds].slice(0, 3));

      // LinkedIn uses data-chameleon-result-urn on saved posts page
      const postCards = document.querySelectorAll('[data-chameleon-result-urn]');
      console.log('[LPS Debug] Found post cards with [data-chameleon-result-urn]:', postCards.length);

      // Also try other selectors LinkedIn might use
      if (postCards.length === 0) {
        const altCards1 = document.querySelectorAll('[data-urn]');
        const altCards2 = document.querySelectorAll('.entity-result');
        const altCards3 = document.querySelectorAll('.reusable-search__result-container');
        console.log('[LPS Debug] Alt selectors - [data-urn]:', altCards1.length,
          '.entity-result:', altCards2.length,
          '.reusable-search__result-container:', altCards3.length);
      }

      let savedCount = 0;
      let unsavedCount = 0;

      postCards.forEach((card, index) => {
        // Check if already processed
        const existingBadge = card.querySelector('.lps-post-badge');
        if (existingBadge) {
          // Still count it for the stats
          if (existingBadge.classList.contains('saved')) {
            savedCount++;
          } else {
            unsavedCount++;
          }
          return;
        }

        // Get the URN from the chameleon attribute
        const chameleonUrn = card.getAttribute('data-chameleon-result-urn') || '';

        // Try to get post URL from card - look for any link to a post
        const linkElem = card.querySelector('a[href*="/feed/update/"], a[href*="/posts/"], a[href*="activity"]');
        const postUrl = linkElem?.href || '';

        // Extract post ID from chameleon URN (format: urn:li:activity:123456)
        const postId = chameleonUrn.split(':').pop() || this.extractIdFromUrl(postUrl);

        // Check if this post is already saved
        const isSaved = savedUrls.has(postUrl) || savedIds.has(postId);

        // Add visual indicator
        card.classList.add('lps-post-card-overlay');
        if (isSaved) {
          card.classList.add('is-saved');
          savedCount++;
        } else {
          unsavedCount++;
        }

        // Add badge
        const badge = document.createElement('div');
        badge.className = `lps-post-badge ${isSaved ? 'saved' : 'unsaved'}`;
        badge.textContent = isSaved ? '✓ Captured' : '● Not captured';

        // Position badge - ensure card is positioned
        card.style.position = 'relative';
        card.style.overflow = 'visible';
        card.appendChild(badge);
      });

      // Update backfill helper with counts if visible
      if (this.backfillHelper.classList.contains('show')) {
        this.updateBackfillStats(savedCount, unsavedCount);
      }

    } catch (err) {
      console.error('[LinkedIn Post Saver] Error marking saved posts:', err);
    }
  },

  extractIdFromUrl(url) {
    if (!url) return '';
    // Extract activity ID from URL like /feed/update/urn:li:activity:123456/
    const match = url.match(/activity[:%](\d+)/);
    return match ? match[1] : '';
  },

  updateBackfillStats(saved, unsaved) {
    const countElem = this.backfillHelper.querySelector('#lps-count');
    if (countElem) {
      countElem.innerHTML = `${saved} <span style="color:#666;font-size:14px;">captured</span> · <span style="color:#f5c518;">${unsaved}</span> <span style="color:#666;font-size:14px;">remaining</span>`;
    }
  }
};

window.LinkedInSaverUI = LinkedInSaverUI;
