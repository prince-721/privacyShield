/**
 * BlurShield — Blur Engine
 *
 * Pure class + CSS-variable toggling. All animation is done by the browser
 * via CSS `transition: filter`, defined in content/content.css — this file
 * never runs a JS animation loop, which is what keeps hover reveal smooth
 * even on huge pages.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});
  const MARKER_ATTR = 'data-blurshield';

  /** Marks an element as tracked + blurred, without revealing it. */
  function track(el, level, mode) {
    if (el.hasAttribute(MARKER_ATTR)) return; // already tracked
    el.setAttribute(MARKER_ATTR, mode || 'default');
    el.classList.add('bs-tracked');
    applyLevel(el, level);
  }

  /** Applies (or swaps) which blur-level class is active on an element. */
  function applyLevel(el, level) {
    el.classList.remove(
      'bs-blur-light',
      'bs-blur-medium',
      'bs-blur-strong',
      'bs-blur-extreme',
      'bs-blur-pixelated',
      'bs-blur-blackbox'
    );
    const levelInfo = BlurShield.storage.BLUR_LEVELS[level] || BlurShield.storage.BLUR_LEVELS.medium;
    if (levelInfo.blackbox) {
      el.classList.add('bs-blur-blackbox');
    } else if (levelInfo.pixelated) {
      el.classList.add('bs-blur-pixelated');
      el.style.setProperty('--bs-radius', `${levelInfo.px}px`);
    } else {
      el.classList.add(`bs-blur-${level}`);
      el.style.setProperty('--bs-radius', `${levelInfo.px}px`);
    }
  }

  /** Sets the shared animation duration (ms) used by the CSS transition. */
  function setAnimationSpeed(root, ms) {
    (root || document.documentElement).style.setProperty('--bs-duration', `${ms}ms`);
  }

  function reveal(el) {
    el.classList.add('bs-revealed');
  }

  function conceal(el) {
    el.classList.remove('bs-revealed');
  }

  function isRevealed(el) {
    return el.classList.contains('bs-revealed');
  }

  function untrack(el) {
    el.removeAttribute(MARKER_ATTR);
    el.classList.remove(
      'bs-tracked',
      'bs-revealed',
      'bs-blur-light',
      'bs-blur-medium',
      'bs-blur-strong',
      'bs-blur-extreme',
      'bs-blur-pixelated',
      'bs-blur-blackbox'
    );
    el.style.removeProperty('--bs-radius');
  }

  /** Blur-everything panic mode: one class on <html>, CSS handles the rest. */
  function setPanic(active) {
    document.documentElement.classList.toggle('bs-panic', !!active);
  }

  BlurShield.engine = BlurShield.engine || {};
  BlurShield.engine.blur = {
    MARKER_ATTR,
    track,
    untrack,
    applyLevel,
    setAnimationSpeed,
    reveal,
    conceal,
    isRevealed,
    setPanic,
  };
})();
