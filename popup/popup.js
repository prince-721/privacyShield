/**
 * BlurShield — Popup script
 * Reads/writes the shared chrome.storage state (via storage/schema.js) and
 * reflects the active tab's hostname/whitelist/blacklist status.
 */
(async function () {
  const BlurShield = window.BlurShield;

  const els = {
    masterToggle: document.getElementById('masterToggle'),
    siteHost: document.getElementById('siteHost'),
    protectionState: document.getElementById('protectionState'),
    modeGrid: document.getElementById('modeGrid'),
    levelGrid: document.getElementById('levelGrid'),
    statBlurred: document.getElementById('statBlurred'),
    statReveals: document.getElementById('statReveals'),
    panicBtn: document.getElementById('panicBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
  };

  let hostname = '';
  let tabId = null;

  function getActiveTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => resolve(tab));
    });
  }

  function render(state) {
    document.documentElement.className = `bs-theme-${state.settings.theme} bs-accent-${state.settings.accent}`;
    const settings = BlurShield.storage.effectiveSettingsFor(state, hostname);
    const isWhitelisted = state.lists.whitelist.includes(hostname);
    const isBlacklisted = state.lists.blacklist.includes(hostname);

    els.masterToggle.checked = !isWhitelisted && settings.enabled;
    els.protectionState.textContent = isWhitelisted
      ? 'Whitelisted'
      : settings.enabled
      ? isBlacklisted
        ? 'Forced (blacklist)'
        : 'Active'
      : 'Paused';
    els.protectionState.classList.toggle('bs-pill-off', isWhitelisted || !settings.enabled);

    [...els.modeGrid.children].forEach((btn) => {
      btn.classList.toggle('bs-active', btn.dataset.mode === settings.revealMode);
    });
    [...els.levelGrid.children].forEach((btn) => {
      btn.classList.toggle('bs-active', btn.dataset.level === settings.blurLevel);
    });

    const site = state.stats.perSite[hostname] || { blurred: 0, revealed: 0 };
    els.statBlurred.textContent = site.blurred || 0;
    els.statReveals.textContent = site.revealed || 0;
  }

  async function updateSettings(patch) {
    const state = await BlurShield.storage.getState();
    state.settings = { ...state.settings, ...patch };
    await BlurShield.storage.setState(state);
    render(state);
  }

  async function toggleMaster() {
    const state = await BlurShield.storage.getState();
    const enabled = els.masterToggle.checked;
    state.settings.enabled = enabled;
    // Remove from whitelist if the user explicitly re-enables via the toggle.
    if (enabled) {
      state.lists.whitelist = state.lists.whitelist.filter((h) => h !== hostname);
    }
    await BlurShield.storage.setState(state);
    render(state);
  }

  async function boot() {
    const tab = await getActiveTab();
    tabId = tab?.id ?? null;
    try {
      hostname = new URL(tab.url).hostname.replace(/^www\./, '');
    } catch {
      hostname = '';
    }
    els.siteHost.textContent = hostname || 'this page';

    const state = await BlurShield.storage.getState();
    render(state);

    BlurShield.storage.onStateChange(render);

    els.masterToggle.addEventListener('change', toggleMaster);

    els.modeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.bs-mode-btn');
      if (!btn) return;
      updateSettings({ revealMode: btn.dataset.mode });
    });

    els.levelGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.bs-level-swatch');
      if (!btn) return;
      updateSettings({ blurLevel: btn.dataset.level });
    });

    els.panicBtn.addEventListener('click', () => {
      if (tabId) chrome.tabs.sendMessage(tabId, { type: 'PANIC_TOGGLE' }).catch(() => {});
    });

    els.settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  boot();
})();
