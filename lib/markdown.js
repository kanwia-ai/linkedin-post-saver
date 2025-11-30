// Convert post data to Obsidian-compatible markdown

const MarkdownConverter = {

  postToMarkdown(post) {
    const frontmatter = this.generateFrontmatter(post);
    const body = this.generateBody(post);

    return `---\n${frontmatter}---\n\n${body}`;
  },

  generateFrontmatter(post) {
    const lines = [];

    // Title (sanitized excerpt)
    const title = this.sanitizeForYaml(
      (post.content?.substring(0, 60) || 'Untitled').replace(/\n/g, ' ')
    );
    lines.push(`title: "${title}"`);

    // Author info
    if (post.author?.name) {
      lines.push(`author: "[[${post.author.name}]]"`);
    }
    if (post.author?.headline) {
      lines.push(`author_headline: "${this.sanitizeForYaml(post.author.headline)}"`);
    }
    if (post.author?.profileUrl) {
      lines.push(`author_url: "${post.author.profileUrl}"`);
    }

    // Dates
    if (post.postedDate) {
      lines.push(`posted_date: "${post.postedDate}"`);
    }
    lines.push(`captured_date: "${post.capturedAt}"`);

    // URL and ID
    lines.push(`url: "${post.url}"`);
    lines.push(`post_id: "${post.id}"`);

    // Engagement
    lines.push(`reactions: ${post.engagement?.reactions || 0}`);
    lines.push(`comments_count: ${post.engagement?.comments || 0}`);
    lines.push(`reposts: ${post.engagement?.reposts || 0}`);

    // Tags from hashtags
    const tags = this.extractHashtags(post.content);
    if (tags.length > 0) {
      lines.push(`tags:`);
      for (const tag of tags) {
        lines.push(`  - "${tag}"`);
      }
    }

    // Shared article
    if (post.sharedArticle?.title) {
      lines.push(`shared_article: "${this.sanitizeForYaml(post.sharedArticle.title)}"`);
    }
    if (post.sharedArticle?.url) {
      lines.push(`shared_url: "${post.sharedArticle.url}"`);
    }

    return lines.join('\n') + '\n';
  },

  generateBody(post) {
    const sections = [];

    // Author header
    if (post.author?.name) {
      sections.push(`# ${post.author.name}\n`);
      if (post.author.headline) {
        sections.push(`*${post.author.headline}*\n`);
      }
      if (post.author.profileUrl) {
        sections.push(`[View Profile](${post.author.profileUrl})\n`);
      }
    }

    // Main content
    if (post.content) {
      sections.push(`## Post\n`);
      sections.push(post.content + '\n');
    }

    // Shared article
    if (post.sharedArticle) {
      sections.push(`## Shared Article\n`);
      if (post.sharedArticle.url) {
        sections.push(`**[${post.sharedArticle.title}](${post.sharedArticle.url})**\n`);
      } else {
        sections.push(`**${post.sharedArticle.title}**\n`);
      }
      if (post.sharedArticle.domain) {
        sections.push(`*${post.sharedArticle.domain}*\n`);
      }
    }

    // External links
    if (post.links && post.links.length > 0) {
      sections.push(`## Links\n`);
      for (const link of post.links) {
        const title = link.title || link.url;
        sections.push(`- [${title}](${link.url})`);
      }
      sections.push('');
    }

    // Media
    if (post.media && post.media.length > 0) {
      sections.push(`## Media\n`);
      for (const m of post.media) {
        if (m.type === 'image') {
          sections.push(`![${m.alt || 'Image'}](${m.url})\n`);
        } else if (m.type === 'video') {
          sections.push(`[Video](${m.url})\n`);
        } else if (m.type === 'document') {
          sections.push(`[${m.title || 'Document'}](${m.url})\n`);
        }
      }
    }

    // Comments
    if (post.comments && post.comments.length > 0) {
      sections.push(`## Comments (${post.comments.length})\n`);
      for (const c of post.comments) {
        if (c.author) {
          sections.push(`### ${c.author}`);
          if (c.authorHeadline) {
            sections.push(`*${c.authorHeadline}*\n`);
          }
        } else {
          sections.push(`### Comment`);
        }

        if (c.content) {
          sections.push(c.content + '\n');
        }

        if (c.reactions > 0) {
          sections.push(`👍 ${c.reactions}\n`);
        }

        sections.push('---\n');
      }
    }

    // Engagement footer
    sections.push(`---\n`);
    sections.push(`*${post.engagement?.reactions || 0} reactions · ${post.engagement?.comments || 0} comments · ${post.engagement?.reposts || 0} reposts*\n`);
    sections.push(`\n[View on LinkedIn](${post.url})`);

    return sections.join('\n');
  },

  authorToMarkdown(name, data) {
    const lines = [];

    lines.push(`---`);
    lines.push(`name: "${name}"`);
    if (data.headline) {
      lines.push(`headline: "${this.sanitizeForYaml(data.headline)}"`);
    }
    if (data.profileUrl) {
      lines.push(`profile_url: "${data.profileUrl}"`);
    }
    lines.push(`posts_saved: ${data.posts?.length || 0}`);
    lines.push(`---\n`);

    lines.push(`# ${name}\n`);

    if (data.headline) {
      lines.push(`*${data.headline}*\n`);
    }

    if (data.profileUrl) {
      lines.push(`[View Profile](${data.profileUrl})\n`);
    }

    lines.push(`## Saved Posts\n`);

    if (data.posts && data.posts.length > 0) {
      for (const post of data.posts) {
        const title = post.title?.substring(0, 50) || 'Post';
        const date = post.date?.split('T')[0] || '';
        lines.push(`- [[${post.file.replace('.md', '')}|${title}...]] (${date})`);
      }
    }

    return lines.join('\n');
  },

  sanitizeForYaml(text) {
    if (!text) return '';
    return text
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .trim();
  },

  sanitizeTitle(text) {
    if (!text) return 'untitled';
    return text
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  extractHashtags(content) {
    if (!content) return [];
    const matches = content.match(/#(\w+)/g) || [];
    return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
  },

  generateFilename(post) {
    const date = post.capturedAt?.split('T')[0] || new Date().toISOString().split('T')[0];

    const author = (post.author?.name || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);

    const titleWords = (post.content || 'post')
      .substring(0, 50)
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join('-');

    return `${date}-${author}-${titleWords}.md`;
  }
};

// Export for popup.js
if (typeof window !== 'undefined') {
  window.MarkdownConverter = MarkdownConverter;
}
