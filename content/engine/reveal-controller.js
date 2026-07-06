/**
 * BlurShield — Reveal Controller
 *
 * Implements all reveal modes with *delegated* listeners (one per document/
 * shadow root, not one per element) — required to stay fast at 100k+ nodes:
 *   - hover: mouseover/mouseout
 *   - click: click toggles a "pinned" reveal
 *   - alt:   keydown/keyup on Alt reveals everything currently hovered-scope
 *   - space: keydown/keyup on Space, same idea, only while a tracked element has focus/hover
 *   - timed: reveal on interaction, auto re-blur after N seconds
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});
  const { closestTracked } = BlurShield.utils;
  const MARKER_ATTR = BlurShield.engine.blur.MARKER_ATTR;

  let currentMode = 'hover';
  let timedSeconds = 4;
  let hoverDelayMs = 0;
  let pinned = new Set(); // click-mode: elements pinned open
  let hoverTimers = new WeakMap(); // element -> timeout id (temporary reveal)
  let hoverRevealTimers = new WeakMap(); // element -> timeout id (delayed reveal)
  let lastHovered = null; // for alt/space modes
  let attached = false;

  function setMode(mode, seconds, delayMs) {
    currentMode = mode;
    if (typeof seconds === 'number') timedSeconds = seconds;
    if (typeof delayMs === 'number') hoverDelayMs = delayMs;
  }

  function revealChain(el) {
    let node = el;
    while (node) {
      if (node.nodeType === 1 && node.hasAttribute(MARKER_ATTR)) {
        BlurShield.engine.blur.reveal(node);
      }
      node = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    }
  }

  function concealChain(el) {
    let node = el;
    while (node) {
      if (node.nodeType === 1 && node.hasAttribute(MARKER_ATTR)) {
        if (!pinned.has(node)) {
          BlurShield.engine.blur.conceal(node);
        }
      }
      node = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    }
  }

  function onMouseOver(e) {
    const el = closestTracked(e.target, MARKER_ATTR);
    if (!el) return;

    // If the mouse came from another element inside the same tracked container, ignore.
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;

    lastHovered = el;

    if (currentMode === 'hover') {
      if (hoverDelayMs > 0) {
        if (!hoverRevealTimers.has(el) && !BlurShield.engine.blur.isRevealed(el)) {
          const timer = setTimeout(() => {
            revealChain(el);
            hoverRevealTimers.delete(el);
          }, hoverDelayMs);
          hoverRevealTimers.set(el, timer);
        }
      } else {
        revealChain(el);
      }
    } else if (currentMode === 'alt' && altHeld) {
      revealChain(el);
    } else if (currentMode === 'space' && spaceHeld) {
      revealChain(el);
    }
  }

  function onMouseOut(e) {
    const el = closestTracked(e.target, MARKER_ATTR);
    if (!el) return;

    // If the mouse is moving to another element inside the same tracked container, ignore.
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;

    if (lastHovered === el) lastHovered = null;

    const pendingTimer = hoverRevealTimers.get(el);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      hoverRevealTimers.delete(el);
    }

    if (currentMode === 'hover') {
      concealChain(el);
    }
    if (currentMode === 'alt' || currentMode === 'space') {
      concealChain(el);
    }
  }

  function onClick(e) {
    if (currentMode !== 'click') return;
    const el = closestTracked(e.target, MARKER_ATTR);
    if (!el) return;
    // Ignore clicks on real interactive descendants (links/buttons inside a message)
    if (e.target.closest('a, button, input, textarea, select, [role="button"]')) return;

    if (pinned.has(el)) {
      pinned.delete(el);
      concealChain(el);
    } else {
      pinned.add(el);
      revealChain(el);
    }
  }

  function onTimedInteract(e) {
    if (currentMode !== 'timed') return;
    const el = closestTracked(e.target, MARKER_ATTR);
    if (!el) return;
    revealChain(el);

    const existing = hoverTimers.get(el);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      concealChain(el);
      hoverTimers.delete(el);
    }, timedSeconds * 1000);
    hoverTimers.set(el, timer);
  }

  let altHeld = false;
  let spaceHeld = false;

  function onKeyDown(e) {
    if (currentMode === 'alt' && e.key === 'Alt') {
      altHeld = true;
      if (lastHovered) revealChain(lastHovered);
    }
    if (currentMode === 'space' && e.code === 'Space' && !isTypingTarget(e.target)) {
      spaceHeld = true;
      if (lastHovered) revealChain(lastHovered);
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (currentMode === 'alt' && e.key === 'Alt') {
      altHeld = false;
      if (lastHovered) concealChain(lastHovered);
    }
    if (currentMode === 'space' && e.code === 'Space') {
      spaceHeld = false;
      if (lastHovered) concealChain(lastHovered);
    }
  }

  function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  /** Attaches all delegated listeners once, at document scope. */
  function attach() {
    if (attached) return;
    attached = true;
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onTimedInteract, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
  }

  function detach() {
    if (!attached) return;
    attached = false;
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('mouseover', onTimedInteract, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keyup', onKeyUp, true);
  }

  /** Attaches the same delegated listeners inside an open shadow root. */
  function attachToShadowRoot(root) {
    root.addEventListener('mouseover', onMouseOver, true);
    root.addEventListener('mouseout', onMouseOut, true);
    root.addEventListener('click', onClick, true);
    root.addEventListener('mouseover', onTimedInteract, true);
  }

  BlurShield.engine.reveal = { setMode, attach, detach, attachToShadowRoot };
})();
