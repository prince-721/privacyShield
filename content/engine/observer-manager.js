/**
 * BlurShield — Observer Manager
 *
 * Owns the two browser observers that make BlurShield scale to 100k+ node
 * pages without repeatedly rescanning the whole DOM:
 *
 *  - MutationObserver: watches for newly added subtrees (infinite scroll,
 *    streaming AI responses, new chat messages) and scans *only* the new
 *    nodes, batched via requestAnimationFrame so a burst of 50 mutations
 *    triggers one scan pass, not 50.
 *
 *  - IntersectionObserver: candidate elements are tagged but not force-
 *    blurred until they actually enter the viewport, so off-screen chat
 *    history costs nothing until scrolled into view.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});
  const { debounce, createRafBatcher, currentHostname } = BlurShield.utils;

  let mutationObserver = null;
  let intersectionObserver = null;
  let rafSchedule = createRafBatcher();
  let currentSettings = null;
  let pendingMutationRoots = [];

  function getSettingsSnapshot() {
    return currentSettings;
  }

  function setSettingsSnapshot(settings) {
    currentSettings = settings;
  }

  /** Processes one root (document or a subtree) end-to-end. */
  function processRoot(root) {
    if (!currentSettings || !currentSettings.enabled) return;
    const hostname = currentHostname();
    const { elements, mode } = BlurShield.engine.detection.scan(root, hostname, currentSettings);

    for (const el of elements) {
      if (el.hasAttribute(BlurShield.engine.blur.MARKER_ATTR)) continue; // already tracked
      // Tag as pending; IntersectionObserver decides when it actually blurs.
      el.setAttribute('data-blurshield-pending', mode);
      intersectionObserver.observe(el);
    }
  }

  function onIntersect(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      const mode = el.getAttribute('data-blurshield-pending');
      el.removeAttribute('data-blurshield-pending');
      intersectionObserver.unobserve(el);
      BlurShield.engine.blur.track(el, currentSettings.blurLevel, mode);
      BlurShield.stats && BlurShield.stats.recordBlur();
    }
  }

  const flushMutations = debounce(() => {
    const roots = pendingMutationRoots;
    pendingMutationRoots = [];
    rafSchedule(() => {
      for (const root of roots) processRoot(root);
    });
  }, 120);

  function onMutations(mutationList) {
    for (const mutation of mutationList) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        pendingMutationRoots.push(node);
        // Pierce open shadow roots as they appear.
        if (node.shadowRoot) {
          BlurShield.engine.reveal.attachToShadowRoot(node.shadowRoot);
          pendingMutationRoots.push(node.shadowRoot);
        }
      }
    }
    if (pendingMutationRoots.length) flushMutations();
  }

  /** Starts everything: initial scan + both observers. */
  function start(settings) {
    currentSettings = settings;

    intersectionObserver = new IntersectionObserver(onIntersect, {
      root: null,
      rootMargin: '200px 0px', // start revealing slightly before entering view
      threshold: 0.01,
    });

    mutationObserver = new MutationObserver(onMutations);
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    BlurShield.engine.blur.setAnimationSpeed(document.documentElement, settings.animationSpeedMs);
    BlurShield.engine.reveal.setMode(settings.revealMode, settings.temporaryRevealSeconds, settings.hoverDelayMs);
    BlurShield.engine.reveal.attach();

    // Initial full pass (once) — everything after this is incremental.
    processRoot(document.body);
  }

  function stop() {
    if (mutationObserver) mutationObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
    BlurShield.engine.reveal.detach();
    // Untrack everything currently blurred.
    document.querySelectorAll(`[${BlurShield.engine.blur.MARKER_ATTR}]`).forEach((el) => {
      BlurShield.engine.blur.untrack(el);
    });
  }

  /** Applies a settings update without a full restart (level/mode/speed only). */
  function applySettingsUpdate(settings) {
    const prevEnabled = currentSettings && currentSettings.enabled;
    currentSettings = settings;
    BlurShield.engine.blur.setAnimationSpeed(document.documentElement, settings.animationSpeedMs);
    BlurShield.engine.reveal.setMode(settings.revealMode, settings.temporaryRevealSeconds, settings.hoverDelayMs);

    if (settings.enabled && !prevEnabled) {
      start(settings);
      return;
    }
    if (!settings.enabled && prevEnabled) {
      stop();
      return;
    }
    // Re-level everything currently tracked.
    document.querySelectorAll(`[${BlurShield.engine.blur.MARKER_ATTR}]`).forEach((el) => {
      BlurShield.engine.blur.applyLevel(el, settings.blurLevel);
    });
  }

  BlurShield.engine.observer = {
    start,
    stop,
    applySettingsUpdate,
    getSettingsSnapshot,
    setSettingsSnapshot,
  };
})();
