/**
 * BlurShield — Heuristic Detector
 *
 * Fallback for pages that use neither semantic HTML nor ARIA roles (many
 * React/Vue apps built entirely from generic <div>s). Flags leaf-ish blocks
 * that look like read content: enough text, not interactive, reasonable
 * paragraph-like shape.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  const MIN_TEXT_LENGTH = 24; // shorter than this reads as a label/button, not content
  const MAX_CANDIDATES_PER_SCAN = 400; // safety valve on huge pages

  function isLikelyInteractive(el) {
    const tag = el.tagName;
    if (['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'].includes(tag)) return true;
    if (el.isContentEditable) return false; // editable is content, handled by semantic detector
    if (el.getAttribute('role') === 'button') return true;
    if (el.onclick) return true;
    return false;
  }

  function hasOwnSubstantialText(el) {
    // Only count *direct* text, not nested block children's text, so we pick
    // the innermost wrapping element rather than blurring an entire page body.
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) text += node.textContent;
    }
    return text.trim().length >= MIN_TEXT_LENGTH;
  }

  function looksLikeChrome(el) {
    const cls = (el.className && el.className.toString()) || '';
    const id = el.id || '';
    return /\b(nav|navbar|toolbar|menu|sidebar-header|breadcrumb|pagination|footer-legal)\b/i.test(
      cls + ' ' + id
    );
  }

  /**
   * Scans a root and returns leaf-level elements with substantial *own* text
   * that aren't interactive controls or obvious chrome. Used only when a
   * page yields too few semantic matches, so it never runs unconditionally.
   */
  function scan(root) {
    const found = new Set();
    if (!root || typeof root.querySelectorAll !== 'function') return found;

    // Prefer common textual leaf tags — cheaper than walking every div.
    const candidates = root.querySelectorAll('p, li, span, div, td, h1, h2, h3, h4, blockquote');
    let checked = 0;

    for (const el of candidates) {
      if (checked >= MAX_CANDIDATES_PER_SCAN) break;
      checked += 1;

      if (isLikelyInteractive(el)) continue;
      if (looksLikeChrome(el)) continue;
      if (BlurShield.detectors.semantic.isExcluded(el)) continue;
      if (!hasOwnSubstantialText(el)) continue;

      found.add(el);
    }
    return found;
  }

  BlurShield.detectors = BlurShield.detectors || {};
  BlurShield.detectors.heuristic = { scan };
})();
