/**
 * BlurShield — Panic Controller
 *
 * Two related "instantly protect the screen" features:
 *  1. Panic Button (Ctrl+Shift+H, relayed from the background service
 *     worker which owns the `commands` keybinding) — blurs the entire
 *     page immediately, independent of per-element tracking, and restores
 *     the previous mode on a second press.
 *  2. Screenshot Protection (optional) — best-effort key-event detection
 *     of PrintScreen / common screenshot shortcuts, since no web API can
 *     see an OS-level screenshot. Instantly applies the panic blur.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  let panicActive = false;
  let screenshotProtectionEnabled = false;

  function togglePanic(forceState) {
    panicActive = typeof forceState === 'boolean' ? forceState : !panicActive;
    BlurShield.engine.blur.setPanic(panicActive);
    return panicActive;
  }

  function isPanicActive() {
    return panicActive;
  }

  function setScreenshotProtection(enabled) {
    screenshotProtectionEnabled = !!enabled;
  }

  function looksLikeScreenshotShortcut(e) {
    // PrintScreen key itself (fires keyup, not keydown, on most systems)
    if (e.key === 'PrintScreen') return true;
    // Common OS screenshot combos we can actually observe from a page:
    // Win+Shift+S (Windows Snipping), Cmd+Shift+3/4/5 (macOS)
    if (e.shiftKey && e.metaKey && ['3', '4', '5'].includes(e.key)) return true;
    if (e.shiftKey && e.getModifierState && e.getModifierState('Meta') && e.key.toLowerCase() === 's') {
      return true;
    }
    return false;
  }

  function onKeyEvent(e) {
    if (!screenshotProtectionEnabled) return;
    if (looksLikeScreenshotShortcut(e)) {
      togglePanic(true);
    }
  }

  function attach() {
    document.addEventListener('keyup', onKeyEvent, true);
    document.addEventListener('keydown', onKeyEvent, true);
  }

  BlurShield.engine.panic = {
    togglePanic,
    isPanicActive,
    setScreenshotProtection,
    attach,
  };
})();
