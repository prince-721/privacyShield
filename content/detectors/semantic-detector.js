/**
 * BlurShield — Semantic Detector
 *
 * Generic, site-agnostic rules based on semantic HTML, ARIA roles/labels,
 * and contenteditable regions. This is what makes BlurShield work on
 * "any webpage containing text" without a site profile.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  // Roles/selectors that strongly indicate "content the user is reading/writing",
  // as opposed to chrome/navigation.
  const CONTENT_SELECTORS = [
    '[role="log"]',              // chat logs (Discord, Slack, many chat widgets)
    '[role="feed"]',              // social feeds
    '[role="article"]',
    'article',
    'main [role="listitem"]',
    '[contenteditable="true"]',   // compose boxes, docs, notes
    '[contenteditable=""]',
    'pre',                        // code blocks
    'code',
    'blockquote',
    '[data-testid*="message" i]',
    '[data-testid*="conversation" i]',
    '[class*="message" i]',
    '[class*="chat-message" i]',
    '[class*="comment" i]',
  ];

  // Selectors that indicate chrome/navigation — never touched even if they
  // happen to nest inside a content container.
  const EXCLUDE_SELECTORS = [
    'nav',
    'header nav',
    '[role="navigation"]',
    '[role="toolbar"]',
    '[role="menu"]',
    '[role="menubar"]',
    '[role="menuitem"]',
    '[role="search"]',
    '[role="button"]',
    'button',
    'a[href]',
    'input',
    'textarea',
    'select',
    '[role="dialog"] input',
    '.bs-no-blur',
    '[data-blurshield-exclude]',
  ];

  function matchesAny(el, selectors) {
    for (const sel of selectors) {
      try {
        if (el.matches(sel)) return true;
      } catch {
        /* invalid selector on this browser — skip */
      }
    }
    return false;
  }

  /**
   * Scans a root node (document or a newly-added subtree) and returns the
   * set of elements that look like sensitive content, per semantic rules.
   */
  function scan(root) {
    const found = new Set();
    if (!root || typeof root.querySelectorAll !== 'function') return found;

    for (const sel of CONTENT_SELECTORS) {
      let matches;
      try {
        matches = root.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of matches) {
        if (isExcluded(el)) continue;
        found.add(el);
      }
    }
    return found;
  }

  /** True if this element (or an ancestor) is explicitly navigation/UI chrome. */
  function isExcluded(el) {
    let node = el;
    let depth = 0;
    while (node && depth < 6) {
      if (node.nodeType === 1 && matchesAny(node, EXCLUDE_SELECTORS)) return true;
      node = node.parentElement;
      depth += 1;
    }
    return false;
  }

  BlurShield.detectors = BlurShield.detectors || {};
  BlurShield.detectors.semantic = { scan, isExcluded, CONTENT_SELECTORS, EXCLUDE_SELECTORS };
})();
