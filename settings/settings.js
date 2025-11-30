// Provider configurations
const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIza...',
    keyHint: 'Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>',
    models: [
      { value: 'gemini-embedding-001', label: 'gemini-embedding-001 (latest, best quality)' },
      { value: 'text-embedding-004', label: 'text-embedding-004 (legacy)' }
    ],
    modelHint: 'Free: 1,500 requests/day. 3072 dimensions.',
    testEndpoint: (model, apiKey) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: 'test' }] }
        })
      }
    })
  },
  openai: {
    name: 'OpenAI',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
    keyHint: 'Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>',
    models: [
      { value: 'text-embedding-3-small', label: 'text-embedding-3-small (fastest, cheapest)' },
      { value: 'text-embedding-3-large', label: 'text-embedding-3-large (best quality)' },
      { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002 (legacy)' }
    ],
    modelHint: 'Paid API. ~$0.02 per 1M tokens for small model.',
    testEndpoint: (model, apiKey) => ({
      url: 'https://api.openai.com/v1/embeddings',
      options: {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: 'test'
        })
      }
    })
  },
  voyage: {
    name: 'Voyage AI',
    keyPrefix: 'pa-',
    keyPlaceholder: 'pa-...',
    keyHint: 'Get your API key from <a href="https://dash.voyageai.com/api-keys" target="_blank">Voyage AI Dashboard</a>',
    models: [
      { value: 'voyage-3', label: 'voyage-3 (best quality)' },
      { value: 'voyage-3-lite', label: 'voyage-3-lite (faster, cheaper)' },
      { value: 'voyage-code-3', label: 'voyage-code-3 (optimized for code)' }
    ],
    modelHint: 'Free: 200M tokens. Great for semantic search.',
    testEndpoint: (model, apiKey) => ({
      url: 'https://api.voyageai.com/v1/embeddings',
      options: {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: 'test'
        })
      }
    })
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('provider');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('embeddingModel');
  const sessionOnlyCheckbox = document.getElementById('sessionOnly');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const toggleKey = document.getElementById('toggleKey');
  const apiKeyHint = document.getElementById('apiKeyHint');
  const modelHint = document.getElementById('modelHint');

  // Load saved settings
  const settings = await chrome.storage.local.get([
    'embeddingProvider', 'apiKey', 'embeddingModel',
    // Legacy keys for migration
    'geminiApiKey'
  ]);

  // Migrate from old geminiApiKey if exists
  if (settings.geminiApiKey && !settings.apiKey) {
    settings.apiKey = settings.geminiApiKey;
    settings.embeddingProvider = 'gemini';
    // Save migrated settings
    await chrome.storage.local.set({
      embeddingProvider: 'gemini',
      apiKey: settings.geminiApiKey
    });
    await chrome.storage.local.remove('geminiApiKey');
  }

  // Check session storage for API key
  const sessionKey = sessionStorage.getItem('apiKey');
  const sessionProvider = sessionStorage.getItem('embeddingProvider');

  // Set initial provider
  const currentProvider = sessionProvider || settings.embeddingProvider || 'gemini';
  providerSelect.value = currentProvider;

  // Update UI based on provider
  function updateProviderUI(provider) {
    const config = PROVIDERS[provider];

    // Update API key placeholder and hint
    apiKeyInput.placeholder = config.keyPlaceholder;
    apiKeyHint.innerHTML = config.keyHint;
    apiKeyHint.classList.add('show');

    // Update model dropdown
    modelSelect.innerHTML = config.models.map(m =>
      `<option value="${m.value}">${m.label}</option>`
    ).join('');

    // Update model hint
    modelHint.textContent = config.modelHint;
  }

  // Initial UI update
  updateProviderUI(currentProvider);

  // Load saved API key
  if (sessionKey) {
    apiKeyInput.value = sessionKey;
    sessionOnlyCheckbox.checked = true;
  } else if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }

  // Load saved model
  if (settings.embeddingModel) {
    // Check if model exists for current provider
    const config = PROVIDERS[currentProvider];
    const modelExists = config.models.some(m => m.value === settings.embeddingModel);
    if (modelExists) {
      modelSelect.value = settings.embeddingModel;
    }
  }

  // Provider change handler
  providerSelect.addEventListener('change', () => {
    const provider = providerSelect.value;
    updateProviderUI(provider);
    // Clear API key when switching providers
    apiKeyInput.value = '';
  });

  // Toggle API key visibility
  toggleKey.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKey.textContent = 'Hide key';
    } else {
      apiKeyInput.type = 'password';
      toggleKey.textContent = 'Show key';
    }
  });

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const sessionOnly = sessionOnlyCheckbox.checked;
    const config = PROVIDERS[provider];

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith(config.keyPrefix)) {
      showStatus(`${config.name} API key should start with "${config.keyPrefix}"`, 'error');
      return;
    }

    // Test the API key
    saveBtn.disabled = true;
    saveBtn.textContent = 'Testing...';

    try {
      const { url, options } = config.testEndpoint(model, apiKey);
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Invalid API key');
      }

      if (sessionOnly) {
        // Store in session only
        sessionStorage.setItem('apiKey', apiKey);
        sessionStorage.setItem('embeddingProvider', provider);
        // Remove from persistent storage
        await chrome.storage.local.remove(['apiKey']);
        // Save non-sensitive settings to disk
        await chrome.storage.local.set({
          embeddingProvider: provider,
          embeddingModel: model
        });
        showStatus(`API key verified! Stored for this session only.`, 'success');
      } else {
        // Store persistently
        await chrome.storage.local.set({
          embeddingProvider: provider,
          apiKey: apiKey,
          embeddingModel: model
        });
        // Clear session storage
        sessionStorage.removeItem('apiKey');
        sessionStorage.removeItem('embeddingProvider');
        showStatus('Settings saved! API key verified.', 'success');
      }

    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status show ' + type;
  }
});
