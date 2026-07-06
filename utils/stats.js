/**
 * BlurShield — Stats tracker (content-script side)
 *
 * Keeps an in-memory tally per page load and flushes to chrome.storage on
 * a debounce, so we're not writing storage on every single blur event.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  let blurredCount = 0;
  let revealCount = 0;

  function recordBlur() {
    blurredCount += 1;
    scheduleFlush();
  }

  function recordReveal() {
    revealCount += 1;
    scheduleFlush();
  }

  const scheduleFlush = BlurShield.utils.debounce(async () => {
    const hostname = BlurShield.utils.currentHostname();
    const state = await BlurShield.storage.getState();
    state.stats.totalElementsBlurred += blurredCount;
    state.stats.totalReveals += revealCount;
    const site = state.stats.perSite[hostname] || { blurred: 0, revealed: 0, lastActive: 0 };
    site.blurred += blurredCount;
    site.revealed += revealCount;
    site.lastActive = Date.now();
    state.stats.perSite[hostname] = site;
    blurredCount = 0;
    revealCount = 0;
    await BlurShield.storage.setState(state);
  }, 1500);

  BlurShield.stats = { recordBlur, recordReveal };
})();
