document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await chrome.storage.local.get(['postCount', 'backfillMode']);

  document.getElementById('postCount').textContent = settings.postCount || 0;
  document.getElementById('backfillMode').checked = settings.backfillMode || false;

  // Backfill mode toggle
  document.getElementById('backfillMode').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ backfillMode: e.target.checked });
    // Notify content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url?.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleBackfillMode', enabled: e.target.checked });
    }
  });

  // Export JSON
  document.getElementById('exportJson').addEventListener('click', async () => {
    const result = await chrome.storage.local.get(['posts']);
    const posts = result.posts || [];

    if (posts.length === 0) {
      alert('No posts to export');
      return;
    }

    const blob = new Blob([JSON.stringify(posts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-posts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
  });

  // Export Markdown - opens export page
  document.getElementById('exportMarkdown').addEventListener('click', async () => {
    const result = await chrome.storage.local.get(['posts']);
    const posts = result.posts || [];

    if (posts.length === 0) {
      alert('No posts to export');
      return;
    }

    // Open export page in new tab (has full File System Access API permissions)
    chrome.tabs.create({ url: chrome.runtime.getURL('export/export.html') });
  });

  // Open settings
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
  });

  // Clear data
  document.getElementById('clearData').addEventListener('click', async () => {
    const result = await chrome.storage.local.get(['posts']);
    const count = result.posts?.length || 0;

    if (count === 0) {
      alert('No data to clear');
      return;
    }

    if (confirm(`Are you sure you want to delete ${count} saved posts?\n\nThis cannot be undone.`)) {
      await chrome.storage.local.set({ posts: [], postCount: 0 });
      document.getElementById('postCount').textContent = '0';
      alert('All data cleared');
    }
  });
});
