/**
 * BlurShield — DOM & timing utilities
 * Shared-scope script (no ES modules) so it works identically across all
 * Chromium forks without relying on module-type content script support.
 * Everything is attached to window.BlurShield.utils.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  /**
   * Debounce: collapses bursts of calls into one, firing `wait` ms after
   * the last call. Used for MutationObserver bursts, resize, etc.
   */
  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /**
   * rafBatch: queues callbacks and flushes them all in a single
   * requestAnimationFrame tick, so many DOM reads/writes triggered in the
   * same burst don't each cause a separate frame / layout thrash.
   */
  function createRafBatcher() {
    let queued = [];
    let scheduled = false;
    function flush() {
      scheduled = false;
      const jobs = queued;
      queued = [];
      for (const job of jobs) {
        try {
          job();
        } catch (err) {
          console.error('[BlurShield] rafBatch job failed', err);
        }
      }
    }
    return function schedule(job) {
      queued.push(job);
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    };
  }

  /** Safe hostname getter (handles about:blank, extension pages, etc.) */
  function currentHostname() {
    try {
      return location.hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  /** True if the user's OS/browser requests reduced motion. */
  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /**
   * Walks an element's ancestor chain (including open shadow roots) looking
   * for a marker attribute. Used to find the nearest tracked element from
   * an event target during delegated event handling.
   */
  function closestTracked(el, attr) {
    let node = el;
    while (node) {
      if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute(attr)) {
        return node;
      }
      node = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    }
    return null;
  }

  /** Generates a small stable id for elements we need to reference twice. */
  let idCounter = 0;
  function nextId(prefix) {
    idCounter += 1;
    return `${prefix}-${idCounter.toString(36)}`;
  }

  BlurShield.utils = {
    debounce,
    createRafBatcher,
    currentHostname,
    prefersReducedMotion,
    closestTracked,
    nextId,
  };
})();
