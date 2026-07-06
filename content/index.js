/**
 * BlurShield — Content Script Entrypoint
 *
 * Boots on every page (document_idle). Resolves effective settings for the
 * current hostname (respecting whitelist/blacklist/site overrides), then
 * hands off to the Observer Manager, which owns the actual scan/blur loop.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});
  const { currentHostname, prefersReducedMotion } = BlurShield.utils;

  // Avoid double-injection (e.g. if the extension reloads mid-session).
  if (window.__blurshieldBooted) return;
  window.__blurshieldBooted = true;

  async function boot() {
    const hostname = currentHostname();
    const state = await BlurShield.storage.getState();

    if (state.lists.whitelist.includes(hostname)) {
      // Whitelisted: do nothing at all on this site.
      return;
    }

    let settings = BlurShield.storage.effectiveSettingsFor(state, hostname);

    // Blacklisted sites are always force-enabled regardless of the global toggle.
    if (state.lists.blacklist.includes(hostname)) {
      settings = { ...settings, enabled: true };
    }

    if (settings.respectReducedMotion && prefersReducedMotion()) {
      settings = { ...settings, animationSpeedMs: 0 };
    }

    BlurShield.engine.panic.setScreenshotProtection(settings.screenshotProtection);
    BlurShield.engine.panic.attach();

    if (settings.enabled) {
      BlurShield.engine.observer.start(settings);
    } else {
      BlurShield.engine.observer.setSettingsSnapshot(settings);
    }

    // Live-update on any settings/list change from the popup or options page.
    BlurShield.storage.onStateChange((newState) => {
      const wl = newState.lists.whitelist.includes(hostname);
      if (wl) {
        BlurShield.engine.observer.stop();
        return;
      }
      let next = BlurShield.storage.effectiveSettingsFor(newState, hostname);
      if (newState.lists.blacklist.includes(hostname)) next = { ...next, enabled: true };
      BlurShield.engine.panic.setScreenshotProtection(next.screenshotProtection);
      BlurShield.engine.observer.applySettingsUpdate(next);
    });

    // Messages from background (keyboard commands) and popup (panic button click).
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === 'PANIC_TOGGLE') {
        BlurShield.engine.panic.togglePanic();
      }
      if (message?.type === 'CYCLE_BLUR_LEVEL') {
        cycleBlurLevel();
      }
    });
  }

  async function cycleBlurLevel() {
    const order = ['light', 'medium', 'strong', 'extreme'];
    const state = await BlurShield.storage.getState();
    const idx = order.indexOf(state.settings.blurLevel);
    const next = order[(idx + 1) % order.length];
    state.settings.blurLevel = next;
    await BlurShield.storage.setState(state);
    // onStateChange listener (registered above) picks this up and re-applies.
  }

  boot();
})();
