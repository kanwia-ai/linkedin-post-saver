// Provider API configurations
const PROVIDERS = {
  gemini: {
    name: 'Gemini',
    getEmbedding: async (text, model, apiKey) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text }] }
          })
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Embedding API error');
      }
      const data = await response.json();
      return data.embedding.values;
    }
  },
  openai: {
    name: 'OpenAI',
    getEmbedding: async (text, model, apiKey) => {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: text
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Embedding API error');
      }
      const data = await response.json();
      return data.data[0].embedding;
    }
  },
  voyage: {
    name: 'Voyage AI',
    getEmbedding: async (text, model, apiKey) => {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: text
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Embedding API error');
      }
      const data = await response.json();
      return data.data[0].embedding;
    }
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Load posts and settings
  const result = await chrome.storage.local.get([
    'posts', 'embeddingProvider', 'apiKey', 'embeddingModel',
    // Legacy key for migration
    'geminiApiKey'
  ]);

  const posts = result.posts || [];

  // Handle migration from old geminiApiKey
  let provider = result.embeddingProvider || 'gemini';
  let apiKey = result.apiKey || result.geminiApiKey;
  let embeddingModel = result.embeddingModel || 'gemini-embedding-001';

  // Check session storage as fallback
  const sessionKey = sessionStorage.getItem('apiKey');
  const sessionProvider = sessionStorage.getItem('embeddingProvider');
  if (sessionKey) {
    apiKey = sessionKey;
    provider = sessionProvider || provider;
  }

  document.getElementById('postCount').textContent = posts.length;

  // Check API key status
  const apiStatus = document.getElementById('apiStatus');
  const embeddingsCheckbox = document.getElementById('generateEmbeddings');
  const providerConfig = PROVIDERS[provider];

  if (apiKey && providerConfig) {
    apiStatus.innerHTML = `<span style="color:#2e7d32">Configured (${providerConfig.name})</span>`;
  } else {
    apiStatus.innerHTML = '<span style="color:#c62828">Not set</span> - <a href="../settings/settings.html" target="_blank">Add API key</a>';
    embeddingsCheckbox.checked = false;
    embeddingsCheckbox.disabled = true;
  }

  if (posts.length === 0) {
    document.getElementById('selectFolder').disabled = true;
    document.getElementById('selectFolder').textContent = 'No posts to export';
    return;
  }

  document.getElementById('selectFolder').addEventListener('click', async () => {
    const progress = document.getElementById('progress');
    const progressText = document.getElementById('progressText');
    const shouldEmbed = embeddingsCheckbox.checked && apiKey && providerConfig;

    try {
      // Let user pick folder
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      progress.classList.add('show');
      progress.classList.remove('error');

      // Save posts.json
      progressText.textContent = 'Saving posts.json...';
      const jsonHandle = await dirHandle.getFileHandle('posts.json', { create: true });
      const jsonWritable = await jsonHandle.createWritable();
      await jsonWritable.write(JSON.stringify(posts, null, 2));
      await jsonWritable.close();

      // Generate embeddings if enabled
      let embeddingsGenerated = 0;
      if (shouldEmbed) {
        progressText.textContent = `Generating embeddings with ${providerConfig.name}...`;

        const embeddings = [];

        for (let i = 0; i < posts.length; i++) {
          const post = posts[i];
          progressText.textContent = `Generating embedding ${i + 1} of ${posts.length}...`;

          // Create text to embed
          const parts = [];
          if (post.author?.name) parts.push(`Author: ${post.author.name}`);
          if (post.author?.headline) parts.push(`Headline: ${post.author.headline}`);
          if (post.content) parts.push(`Content: ${post.content}`);
          if (post.sharedArticle?.title) parts.push(`Shared: ${post.sharedArticle.title}`);

          // Include top comments for context
          if (post.comments?.length > 0) {
            const topComments = post.comments.slice(0, 5).map(c => c.content).filter(Boolean);
            if (topComments.length > 0) {
              parts.push(`Comments: ${topComments.join(' | ')}`);
            }
          }

          const textToEmbed = parts.join('\n').substring(0, 10000);

          try {
            const embedding = await providerConfig.getEmbedding(textToEmbed, embeddingModel, apiKey);

            embeddings.push({
              id: post.id,
              url: post.url,
              author: post.author?.name || 'Unknown',
              title: post.content?.substring(0, 100) || 'No title',
              embedding: embedding
            });
            embeddingsGenerated++;

            // Small delay to avoid rate limits
            if (i < posts.length - 1) {
              await new Promise(r => setTimeout(r, 100));
            }

          } catch (err) {
            console.error('Embedding error for post', i, err);
            // Continue with other posts even if one fails
            embeddings.push({
              id: post.id,
              url: post.url,
              author: post.author?.name || 'Unknown',
              title: post.content?.substring(0, 100) || 'No title',
              embedding: null,
              error: err.message
            });
          }
        }

        // Save embeddings.json
        progressText.textContent = 'Saving embeddings.json...';
        const embeddingsHandle = await dirHandle.getFileHandle('embeddings.json', { create: true });
        const embeddingsWritable = await embeddingsHandle.createWritable();
        await embeddingsWritable.write(JSON.stringify({
          provider: provider,
          model: embeddingModel,
          generated_at: new Date().toISOString(),
          count: embeddingsGenerated,
          embeddings: embeddings
        }, null, 2));
        await embeddingsWritable.close();
      }

      // Success!
      let successMessage = `<span class="success">Done!</span><br><br>
        Saved to: <strong>${dirHandle.name}/</strong><br>
        - posts.json (${posts.length} posts)`;

      if (embeddingsGenerated > 0) {
        successMessage += `<br>- embeddings.json (${embeddingsGenerated} vectors via ${providerConfig.name})`;
      }

      successMessage += `<br><br>You can close this tab now.`;
      progressText.innerHTML = successMessage;

    } catch (err) {
      if (err.name === 'AbortError') {
        progress.classList.remove('show');
        return;
      }
      progress.classList.add('show', 'error');
      progressText.textContent = 'Error: ' + err.message;
    }
  });
});
