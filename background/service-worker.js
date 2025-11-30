// Service worker handles storage and messaging

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.action) {
    case 'savePost':
      return await savePost(message.post);

    case 'getStats':
      return await getStats();

    case 'getPosts':
      return await getPosts();

    default:
      return { error: 'Unknown action' };
  }
}

async function savePost(postData) {
  try {
    // Get existing posts
    const result = await chrome.storage.local.get(['posts', 'postCount']);
    const posts = result.posts || [];
    const postCount = result.postCount || 0;

    // Check for duplicates by ID
    const exists = posts.some(p => p.id === postData.id);
    if (exists) {
      console.log('[LinkedIn Post Saver] Post already saved:', postData.id);
      return { success: true, message: 'Post already saved', duplicate: true };
    }

    // Add new post
    posts.push(postData);

    // Update storage
    await chrome.storage.local.set({
      posts: posts,
      postCount: postCount + 1
    });

    console.log('[LinkedIn Post Saver] Post saved:', postData.id, 'Total:', postCount + 1);

    return { success: true, postCount: postCount + 1 };
  } catch (err) {
    console.error('[LinkedIn Post Saver] Save error:', err);
    return { success: false, error: err.message };
  }
}

async function getStats() {
  const result = await chrome.storage.local.get(['postCount']);
  return {
    postCount: result.postCount || 0
  };
}

async function getPosts() {
  const result = await chrome.storage.local.get(['posts']);
  return {
    posts: result.posts || []
  };
}

// Log when service worker starts
console.log('[LinkedIn Post Saver] Service worker started');
