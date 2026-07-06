/**
 * BlurShield — Media Detector
 *
 * Finds images, video frames, canvases, and embedded/attached documents
 * (PDF embeds, file-attachment cards) so they can be blurred like text
 * content. Excludes tiny UI glyphs (icons, avatars used as buttons, emoji).
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  const MIN_ICON_DIMENSION = 32; // px — below this, treat as a UI icon, not content

  function isIconSized(el) {
    const w = el.width || el.getAttribute('width') || 0;
    const h = el.height || el.getAttribute('height') || 0;
    return Number(w) > 0 && Number(w) < MIN_ICON_DIMENSION && Number(h) < MIN_ICON_DIMENSION;
  }

  function isNavOrButtonImage(el) {
    if (el.closest('button, a, [role="button"], nav, [role="navigation"], [role="toolbar"]')) {
      return true;
    }
    const alt = (el.getAttribute('alt') || '').toLowerCase();
    if (/\b(logo|icon|avatar-badge|arrow|chevron)\b/.test(alt)) return true;
    return false;
  }

  function scan(root) {
    const found = new Set();
    if (!root || typeof root.querySelectorAll !== 'function') return found;

    const media = root.querySelectorAll(
      'img, video, canvas, embed[type*="pdf" i], object[type*="pdf" i], ' +
        '[data-testid*="attachment" i], [class*="attachment" i], [class*="file-card" i]'
    );

    for (const el of media) {
      if (el.tagName === 'IMG' && (isIconSized(el) || isNavOrButtonImage(el))) continue;
      if (BlurShield.detectors.semantic.isExcluded(el)) continue;
      found.add(el);
    }
    return found;
  }

  BlurShield.detectors = BlurShield.detectors || {};
  BlurShield.detectors.media = { scan };
})();
