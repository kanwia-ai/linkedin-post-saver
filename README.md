# LinkedIn Post Saver

A Chrome extension to save LinkedIn posts you've bookmarked, with optional AI-powered embeddings for semantic search.

**Ever saved a LinkedIn post and then couldn't find it again?** Or wished you could actually *use* all those insights you've bookmarked over the years? This extension lets you export your saved posts as structured data, so you can search them semantically, feed them into personal projects, or just make sure you never lose that one post you've been looking for.

## Features

- **Auto-capture**: Automatically saves posts when you click LinkedIn's "Save" button
- **Manual capture**: Click the floating button to save any post you're viewing
- **Backfill mode**: Efficiently capture your existing saved posts with visual progress tracking
- **Comments extraction**: Optionally include post comments (toggleable per-post)
- **Multi-provider embeddings**: Generate embeddings using Gemini, OpenAI, or Voyage AI
- **Visual indicators**: See which saved posts you've already captured with color-coded badges
- **Export options**: Export as JSON or with embeddings for semantic search

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/linkedin-post-saver.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the cloned folder

5. The extension icon should appear in your Chrome toolbar

## Usage

### Saving Posts

- **Automatic**: Just click LinkedIn's native "Save" button - the extension captures it automatically
- **Manual**: Click the floating 📥 button in the bottom-right corner when viewing a post

### Backfill Mode

To capture your existing saved posts:

1. Click the extension icon and enable "Show 'Next Post' helper"
2. Go to your [Saved Posts](https://www.linkedin.com/my-items/saved-posts/)
3. Posts show green "Captured" or orange "Not captured" badges
4. Click into uncaptured posts and use the helper panel to save them

### Export

1. Click the extension icon
2. Choose "Quick Export (JSON only)" or "Export with Embeddings"
3. For embeddings, configure your API key in Settings first

## Embedding Providers

The extension supports three embedding providers:

| Provider | Free Tier | Model |
|----------|-----------|-------|
| **Gemini** | 1,500 requests/day | gemini-embedding-001 |
| **OpenAI** | Paid only | text-embedding-3-small |
| **Voyage AI** | 200M tokens | voyage-3 |

## Project Structure

```
linkedin-post-saver/
├── manifest.json          # Extension configuration
├── background/
│   └── service-worker.js  # Handles storage and messaging
├── content/
│   ├── content.js         # Main content script
│   ├── extractor.js       # Post data extraction
│   └── ui.js              # Floating button, badges, backfill UI
├── popup/
│   ├── popup.html         # Extension popup
│   ├── popup.js           # Popup logic
│   └── popup.css          # Popup styles
├── settings/
│   ├── settings.html      # API key configuration
│   └── settings.js        # Settings logic
├── export/
│   ├── export.html        # Export page
│   └── export.js          # Export with embeddings
├── lib/
│   └── markdown.js        # Markdown conversion
└── icons/                 # Extension icons
```

## Output Format

Posts are saved as JSON with this structure:

```json
{
  "id": "activity-id",
  "url": "https://linkedin.com/feed/update/...",
  "author": {
    "name": "Author Name",
    "headline": "Author Headline",
    "profileUrl": "..."
  },
  "content": "Post text content...",
  "timestamp": "2024-01-15T10:30:00Z",
  "engagement": {
    "likes": 123,
    "comments": 45
  },
  "comments": [...],
  "links": [...]
}
```

## Privacy

- All data is stored locally in your browser
- API keys can be stored in session-only mode (cleared when browser closes)
- No data is sent anywhere except to the embedding provider you choose

---

Built with [Claude Code](https://claude.com/claude-code)
