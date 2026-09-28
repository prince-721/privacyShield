/**
 * BlurShield — Site Profiles
 *
 * Each profile is a thin refinement: extra selectors to include, selectors
 * to force-exclude (e.g. sidebar/file-tree), and an optional display "mode"
 * ('default' | 'code' | 'document') that changes reveal granularity.
 *
 * Profiles never replace the generic detectors — a site with no profile
 * still gets full protection from semantic/heuristic/media detection.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  const profiles = {
    // ---- AI chat assistants ----
    'chat.openai.com': aiProfile(),
    'chatgpt.com': aiProfile(),
    'claude.ai': aiProfile(),
    'gemini.google.com': aiProfile(),
    'www.perplexity.ai': aiProfile(),
    'perplexity.ai': aiProfile(),

    // ---- Messaging ----
    'web.whatsapp.com': {
      mode: 'default',
      include: [
        // --- Conversation message bubbles ---
        '[data-testid="msg-container"]',
        'div.message-in .copyable-text',
        'div.message-out .copyable-text',
        'div.message-in .selectable-text',
        'div.message-out .selectable-text',
        '[data-pre-plain-text]',           // message text wrapper (carries timestamp metadata)

        // --- Chat list: last-message preview snippet under each contact name ---
        '[data-testid="last-msg-status"]',
        'span[dir="ltr"][class*="_"]',      // preview text spans in sidebar list items
        'div[data-testid="cell-frame-secondary"]', // secondary line = preview text row

        // --- Media, voice notes, attachments ---
        '[data-testid="media-viewer-image"]',
        '[data-testid="ptt-audio"]',
        'img[src*="blob:"]',

        // --- Quoted / forwarded / link previews inside bubbles ---
        '[data-testid="quoted-message"]',
        '[data-testid="link-preview"]',
        'span[data-testid="forwarded-label"]',
      ],
      exclude: [
        '[data-testid="chat-list-search"]',
        'header',
        '[role="navigation"]',
        '[data-testid="chatlist-header"]',
        '[data-testid="btn-context-menu"]',
        'button',
        '[role="button"]',
        'input',
        'textarea',
        '[contenteditable="true"]',
        '[data-testid="compose-btn"]',
        '[data-testid="send"]',
        '[data-testid="attach"]',
        '[data-testid="menu-bar"]',
      ],
    },
    'discord.com': {
      mode: 'default',
      include: ['[class*="messageContent" i]', '[class*="message-" i]', 'li[id^="chat-messages-"]'],
      exclude: ['[class*="sidebar" i]', '[class*="guilds" i]', '[role="toolbar"]'],
    },
    'app.slack.com': {
      mode: 'default',
      include: ['[data-qa="message_content"]', '[data-qa="message-text"]', '[role="listitem"]'],
      exclude: ['[data-qa="channel_sidebar"]', '[data-qa="workspace-nav"]'],
    },
    'web.telegram.org': {
      mode: 'default',
      include: ['.message', '.bubble', '.Message'],
      exclude: ['.sidebar', '.LeftColumn', '.chat-list'],
    },
    'www.messenger.com': {
      mode: 'default',
      include: ['[role="row"]', '[data-testid*="message" i]'],
      exclude: ['[aria-label="Chats"]'],
    },

    // ---- Email ----
    'mail.google.com': {
      mode: 'default',
      include: ['.a3s', '[role="listitem"] .y6', '.adn'], // Gmail message body classes
      exclude: ['[role="navigation"]', '.aeN', '.gb_'],
    },
    'outlook.live.com': emailProfile(),
    'outlook.office.com': emailProfile(),
    'outlook.office365.com': emailProfile(),

    // ---- Professional / social ----
    'www.linkedin.com': {
      mode: 'default',
      include: ['.msg-s-message-list-container *', '.msg-s-event-listitem'],
      exclude: ['.msg-overlay-list-bubble', 'nav'],
    },
    'x.com': socialProfile(),
    'twitter.com': socialProfile(),
    'www.reddit.com': socialProfile(),
    'www.facebook.com': socialProfile(),
    'www.instagram.com': socialProfile(),

    // ---- Dev / code (Code Mode: blur code, keep file tree visible, reveal line-by-line) ----
    'github.com': codeProfile(['.blob-code', '.react-code-line', '.js-file-line', 'table.highlight td.blob-code-inner']),
    'gitlab.com': codeProfile(['.line', '.blob-content .line', 'span.line']),

    // ---- Docs / sheets (Document Mode: paragraph-level reveal) ----
    'docs.google.com': {
      mode: 'document',
      include: ['.kix-paragraphrenderer', '.kix-lineview', '[role="textbox"] > div'],
      exclude: ['.docs-material-menu-item', '[role="toolbar"]', '.docs-titlebar'],
    },
    'notion.so': {
      mode: 'document',
      include: ['[data-block-id]'],
      exclude: ['.notion-topbar', '.notion-sidebar'],
    },
    'www.notion.so': {
      mode: 'document',
      include: ['[data-block-id]'],
      exclude: ['.notion-topbar', '.notion-sidebar'],
    },
  };

  function aiProfile() {
    return {
      mode: 'default',
      include: [
        '[data-message-author-role]',      // ChatGPT
        '.font-claude-message',             // Claude
        '[data-testid="conversation-turn"]',
        '.model-response-text',             // Gemini
        '[class*="prose" i]',
        'pre code',
        'table',
        '[class*="markdown" i]',
        '[data-testid*="attachment" i]',
      ],
      exclude: [
        'nav',
        '[data-testid="history-item-0"] ~ *', // never touch conversation list nav in sidebars keyed this way
        '[class*="sidebar" i]',
        '[role="navigation"]',
      ],
    };
  }

  function emailProfile() {
    return {
      mode: 'default',
      include: ['[role="document"]', '[aria-label*="Message body" i]'],
      exclude: ['[role="navigation"]', '[role="banner"]'],
    };
  }

  function socialProfile() {
    return {
      mode: 'default',
      include: ['article', '[data-testid="tweet"]', '[data-testid="post-container"]', '[role="article"]'],
      exclude: ['nav', '[role="navigation"]', 'header'],
    };
  }

  function codeProfile(codeLineSelectors) {
    return {
      mode: 'code',
      include: codeLineSelectors,
      exclude: ['.file-tree', '.js-tree-browser-result-path', 'nav', '[role="navigation"]', '.tree-view'],
    };
  }

  /** Resolves the profile for the current page, falling back to a generic one. */
  function resolve(hostname) {
    return profiles[hostname] || { mode: 'default', include: [], exclude: [] };
  }

  BlurShield.sites = { profiles, resolve };
})();
