// LinkedIn Post Extractor
// Uses aria-labels and stable patterns for reliable extraction

const LinkedInExtractor = {

  extractPost(includeComments = true) {
    const post = {
      url: window.location.href,
      id: this.getPostId(),
      capturedAt: new Date().toISOString(),
      author: this.extractAuthor(),
      content: this.extractContent(),
      engagement: this.extractEngagement(),
      sharedArticle: this.extractSharedArticle(),
      comments: includeComments ? this.extractComments() : [],
      media: this.extractMedia(),
      postedDate: this.extractDate()
    };

    return post;
  },

  // Expand all comments before extracting
  async expandAllComments() {
    let expanded = 0;
    const maxAttempts = 20; // Safety limit

    for (let i = 0; i < maxAttempts; i++) {
      // Find "Load more comments" or "View more comments" buttons
      const loadMoreBtns = document.querySelectorAll(
        'button[aria-label*="Load more comments"], ' +
        'button[aria-label*="View more comments"], ' +
        'button[aria-label*="more comments"], ' +
        'button[aria-label*="previous replies"], ' +
        'button[aria-label*="more replies"], ' +
        '.comments-comments-list__load-more-comments-button'
      );

      if (loadMoreBtns.length === 0) break;

      for (const btn of loadMoreBtns) {
        if (btn.offsetParent !== null) { // Check if visible
          btn.click();
          expanded++;
          await this.sleep(800); // Wait for comments to load
        }
      }

      // Also click "Show more replies" for nested comments
      const showRepliesBtns = document.querySelectorAll(
        'button[aria-label*="replies"], ' +
        'button[aria-label*="Show"][aria-label*="repl"]'
      );

      for (const btn of showRepliesBtns) {
        if (btn.offsetParent !== null && !btn.disabled) {
          btn.click();
          expanded++;
          await this.sleep(500);
        }
      }

      await this.sleep(300);
    }

    return expanded;
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  getPostId() {
    const url = window.location.href;

    // Extract from /posts/ID or /feed/update/urn:li:activity:ID
    const postsMatch = url.match(/\/posts\/([^/?]+)/);
    if (postsMatch) return postsMatch[1];

    const activityMatch = url.match(/activity[:%3A](\d+)/);
    if (activityMatch) return activityMatch[1];

    // Fallback to data-urn attribute
    const urnElement = document.querySelector('[data-urn*="activity"]');
    if (urnElement) {
      const urn = urnElement.getAttribute('data-urn');
      const match = urn.match(/activity:(\d+)/);
      if (match) return match[1];
    }

    return Date.now().toString(); // Last resort
  },

  extractAuthor() {
    const author = {
      name: null,
      headline: null,
      profileUrl: null
    };

    // Method 1: "Open control menu for post by X" - most reliable
    const controlMenu = document.querySelector('[aria-label^="Open control menu for post by"]');
    if (controlMenu) {
      const label = controlMenu.getAttribute('aria-label');
      const match = label.match(/Open control menu for post by (.+)/);
      if (match) author.name = match[1].trim();
    }

    // Method 2: "View: Name • headline" aria-label - also gets headline
    if (!author.name || !author.headline) {
      const viewLinks = document.querySelectorAll('[aria-label^="View:"]');
      for (const elem of viewLinks) {
        const label = elem.getAttribute('aria-label');

        // Skip if inside a comment
        if (elem.closest('[data-id*="comment"]')) continue;

        const match = label.match(/View:\s*([^•]+?)(?:\s*Premium)?\s*•\s*(?:Following\s*|1st\s*|2nd\s*|3rd\s*)?(.+)/);
        if (match) {
          if (!author.name) author.name = match[1].trim();
          author.headline = match[2].trim();

          const href = elem.getAttribute('href');
          if (href && href.includes('/in/')) {
            author.profileUrl = href.startsWith('http')
              ? href.split('?')[0]
              : 'https://www.linkedin.com' + href.split('?')[0];
          }
          break;
        }
      }
    }

    // Method 3: From comments count label "X comments on Author's post"
    if (!author.name) {
      const commentsLabel = document.querySelector('[aria-label*="comments on"][aria-label*="post"]');
      if (commentsLabel) {
        const label = commentsLabel.getAttribute('aria-label');
        const match = label.match(/comments? on (.+)'s post/);
        if (match) author.name = match[1].trim();
      }
    }

    // Method 4: From reposts label "X reposts of Author's post"
    if (!author.name) {
      const repostsLabel = document.querySelector('[aria-label*="reposts of"][aria-label*="post"]');
      if (repostsLabel) {
        const label = repostsLabel.getAttribute('aria-label');
        const match = label.match(/reposts? of (.+)'s post/);
        if (match) author.name = match[1].trim();
      }
    }

    return author;
  },

  extractContent() {
    // Try multiple selectors for post content
    const selectors = [
      '.feed-shared-update-v2__description',
      '.feed-shared-text',
      '.update-components-text'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const elem of elements) {
        // Skip if inside a comment
        if (elem.closest('[data-id*="comment"]')) continue;
        if (elem.closest('.comments-comment-item')) continue;

        const text = elem.innerText?.trim();
        if (text && text.length > 20) return text;
      }
    }

    return null;
  },

  extractEngagement() {
    const engagement = {
      reactions: 0,
      comments: 0,
      reposts: 0
    };

    // Reactions: "29 reactions"
    const allElements = document.querySelectorAll('[aria-label]');
    for (const elem of allElements) {
      const label = elem.getAttribute('aria-label') || '';

      // Reactions
      const reactionsMatch = label.match(/^(\d[\d,]*)\s*reactions?$/i);
      if (reactionsMatch) {
        engagement.reactions = parseInt(reactionsMatch[1].replace(/,/g, ''));
      }

      // Comments: "7 comments on X's post"
      const commentsMatch = label.match(/^(\d[\d,]*)\s*comments?/i);
      if (commentsMatch) {
        engagement.comments = parseInt(commentsMatch[1].replace(/,/g, ''));
      }

      // Reposts: "4 reposts of X's post"
      const repostsMatch = label.match(/^(\d[\d,]*)\s*reposts?/i);
      if (repostsMatch) {
        engagement.reposts = parseInt(repostsMatch[1].replace(/,/g, ''));
      }
    }

    return engagement;
  },

  extractSharedArticle() {
    // Pattern: "Open article: Title by domain, graphic"
    const articleElem = document.querySelector('[aria-label^="Open article:"]');
    if (!articleElem) return null;

    const label = articleElem.getAttribute('aria-label');
    const href = articleElem.getAttribute('href');

    const match = label.match(/Open article:\s*(.+?)(?:\s+by\s+([^,]+))?(?:,\s*graphic)?$/);
    if (match) {
      return {
        title: match[1].trim(),
        domain: match[2]?.trim() || null,
        url: href || null
      };
    }

    return null;
  },

  extractComments() {
    const comments = [];

    // Find comments by data-id attribute (most reliable)
    const commentElements = document.querySelectorAll('[data-id*="urn:li:comment"]');

    for (const elem of commentElements) {
      const comment = {
        id: elem.getAttribute('data-id'),
        author: null,
        authorHeadline: null,
        authorProfileUrl: null,
        content: null,
        reactions: 0
      };

      // Author from "View: Name • headline" aria-label
      const authorLink = elem.querySelector('[aria-label^="View:"]');
      if (authorLink) {
        const label = authorLink.getAttribute('aria-label');
        const match = label.match(/View:\s*([^•]+?)(?:\s*Premium)?\s*•\s*(?:\d+(?:st|nd|rd|th)\s*)?(.+)/);
        if (match) {
          comment.author = match[1].trim();
          comment.authorHeadline = match[2].trim();
        }

        const href = authorLink.getAttribute('href');
        if (href && href.includes('/in/')) {
          comment.authorProfileUrl = href.startsWith('http')
            ? href.split('?')[0]
            : 'https://www.linkedin.com' + href.split('?')[0];
        }
      }

      // Fallback: "Reply to X's comment" button
      if (!comment.author) {
        const replyBtn = elem.querySelector('[aria-label*="Reply to"][aria-label*="comment"]');
        if (replyBtn) {
          const match = replyBtn.getAttribute('aria-label').match(/Reply to (.+)'s comment/);
          if (match) comment.author = match[1].trim();
        }
      }

      // Fallback: "React Like to X's comment" button
      if (!comment.author) {
        const reactBtn = elem.querySelector('[aria-label*="React"][aria-label*="comment"]');
        if (reactBtn) {
          const match = reactBtn.getAttribute('aria-label').match(/React \w+ to (.+)'s comment/);
          if (match) comment.author = match[1].trim();
        }
      }

      // Content from update-components-text or main-content
      const contentDiv = elem.querySelector('.update-components-text');
      if (contentDiv) {
        comment.content = contentDiv.innerText?.trim();
      }

      // Reactions: "3 Reactions on X's comment"
      const reactionsElem = elem.querySelector('[aria-label*="Reaction"][aria-label*="comment"]');
      if (reactionsElem) {
        const match = reactionsElem.getAttribute('aria-label').match(/(\d+)\s*Reaction/i);
        if (match) comment.reactions = parseInt(match[1]);
      }

      // Only add if we got meaningful data
      if (comment.author || comment.content) {
        comments.push(comment);
      }
    }

    return comments;
  },

  extractMedia() {
    const media = [];
    const seenUrls = new Set();

    // Main post images (exclude profile photos)
    const images = document.querySelectorAll('img[src*="feedshare-shrink"], img[src*="dms/image"]');
    for (const img of images) {
      const src = img.getAttribute('src');

      // Skip profile photos and duplicates
      if (!src) continue;
      if (src.includes('profile-displayphoto')) continue;
      if (seenUrls.has(src)) continue;

      seenUrls.add(src);
      media.push({
        type: 'image',
        url: src,
        alt: img.getAttribute('alt') || null
      });
    }

    // Videos
    const videoSources = document.querySelectorAll('video source');
    for (const source of videoSources) {
      const src = source.getAttribute('src');
      if (src && !seenUrls.has(src)) {
        seenUrls.add(src);
        media.push({
          type: 'video',
          url: src
        });
      }
    }

    // Document/PDF links
    const docLinks = document.querySelectorAll('a[href*="dms/document"]');
    for (const link of docLinks) {
      const href = link.getAttribute('href');
      if (href && !seenUrls.has(href)) {
        seenUrls.add(href);
        media.push({
          type: 'document',
          url: href,
          title: link.innerText?.trim() || null
        });
      }
    }

    return media;
  },

  extractDate() {
    // From time element
    const timeElem = document.querySelector('time');
    if (timeElem) {
      const datetime = timeElem.getAttribute('datetime');
      if (datetime) return datetime;

      const text = timeElem.innerText?.trim();
      if (text) return text;
    }

    // Fallback: relative date pattern like "4mo", "2w", "1d", "3h"
    const allSpans = document.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.innerText?.trim();
      if (/^\d+[mwydh]o?$/.test(text)) {
        return text;
      }
    }

    return null;
  },

  // Extract external links from post content
  extractLinks() {
    const links = [];
    const seenUrls = new Set();

    // Find all external links
    const allLinks = document.querySelectorAll('a[target="_blank"][href^="http"]');
    for (const link of allLinks) {
      const href = link.getAttribute('href');

      // Skip LinkedIn internal links
      if (!href || href.includes('linkedin.com')) continue;
      if (seenUrls.has(href)) continue;

      // Skip if inside a comment
      if (link.closest('[data-id*="comment"]')) continue;

      seenUrls.add(href);
      links.push({
        url: href,
        title: link.innerText?.trim() || null
      });
    }

    return links;
  }
};

// Export for use by content.js
window.LinkedInExtractor = LinkedInExtractor;
