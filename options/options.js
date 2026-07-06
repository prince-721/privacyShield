/**
 * BlurShield — Options page script
 */
(async function () {
  const BlurShield = window.BlurShield;

  const els = {
    themeSeg: document.getElementById('themeSeg'),
    accentSwatches: document.getElementById('accentSwatches'),
    animSpeed: document.getElementById('animSpeed'),
    animSpeedVal: document.getElementById('animSpeedVal'),
    hoverDelay: document.getElementById('hoverDelay'),
    hoverDelayVal: document.getElementById('hoverDelayVal'),
    timedSeconds: document.getElementById('timedSeconds'),
    timedSecondsVal: document.getElementById('timedSecondsVal'),
    alwaysImages: document.getElementById('alwaysImages'),
    alwaysCode: document.getElementById('alwaysCode'),
    reducedMotion: document.getElementById('reducedMotion'),
    screenshotProtection: document.getElementById('screenshotProtection'),
    whitelistInput: document.getElementById('whitelistInput'),
    whitelistAdd: document.getElementById('whitelistAdd'),
    whitelistList: document.getElementById('whitelistList'),
    blacklistInput: document.getElementById('blacklistInput'),
    blacklistAdd: document.getElementById('blacklistAdd'),
    blacklistList: document.getElementById('blacklistList'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    resetBtn: document.getElementById('resetBtn'),
  };

  function cleanHostname(raw) {
    return raw
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
  }

  function renderList(ul, items, onRemove) {
    ul.innerHTML = '';
    for (const host of items) {
      const li = document.createElement('li');
      li.textContent = host;
      const btn = document.createElement('button');
      btn.textContent = '✕';
      btn.setAttribute('aria-label', `Remove ${host}`);
      btn.addEventListener('click', () => onRemove(host));
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  function render(state) {
    const s = state.settings;
    document.documentElement.className = `bs-theme-${s.theme} bs-accent-${s.accent}`;
    els.themeSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('bs-active', b.dataset.value === s.theme));
    els.accentSwatches.querySelectorAll('button').forEach((b) => b.classList.toggle('bs-active', b.dataset.value === s.accent));

    els.animSpeed.value = s.animationSpeedMs;
    els.animSpeedVal.textContent = `${s.animationSpeedMs}ms`;
    els.hoverDelay.value = s.hoverDelayMs;
    els.hoverDelayVal.textContent = `${s.hoverDelayMs}ms`;
    els.timedSeconds.value = s.temporaryRevealSeconds;
    els.timedSecondsVal.textContent = `${s.temporaryRevealSeconds}s`;

    els.alwaysImages.checked = s.alwaysBlurImages;
    els.alwaysCode.checked = s.alwaysBlurCode;
    els.reducedMotion.checked = s.respectReducedMotion;
    els.screenshotProtection.checked = s.screenshotProtection;

    renderList(els.whitelistList, state.lists.whitelist, (host) => removeFromList('whitelist', host));
    renderList(els.blacklistList, state.lists.blacklist, (host) => removeFromList('blacklist', host));
  }

  async function patchSettings(patch) {
    const state = await BlurShield.storage.getState();
    state.settings = { ...state.settings, ...patch };
    await BlurShield.storage.setState(state);
    render(state);
  }

  async function addToList(listName, host) {
    if (!host) return;
    const state = await BlurShield.storage.getState();
    if (!state.lists[listName].includes(host)) {
      state.lists[listName] = [...state.lists[listName], host];
      // Adding to one list removes it from the opposite list to avoid conflicts.
      const other = listName === 'whitelist' ? 'blacklist' : 'whitelist';
      state.lists[other] = state.lists[other].filter((h) => h !== host);
      await BlurShield.storage.setState(state);
      render(state);
    }
  }

  async function removeFromList(listName, host) {
    const state = await BlurShield.storage.getState();
    state.lists[listName] = state.lists[listName].filter((h) => h !== host);
    await BlurShield.storage.setState(state);
    render(state);
  }

  async function boot() {
    const state = await BlurShield.storage.getState();
    render(state);
    BlurShield.storage.onStateChange(render);

    els.themeSeg.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) patchSettings({ theme: btn.dataset.value });
    });
    els.accentSwatches.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) patchSettings({ accent: btn.dataset.value });
    });

    els.animSpeed.addEventListener('input', () => patchSettings({ animationSpeedMs: Number(els.animSpeed.value) }));
    els.hoverDelay.addEventListener('input', () => patchSettings({ hoverDelayMs: Number(els.hoverDelay.value) }));
    els.timedSeconds.addEventListener('input', () => patchSettings({ temporaryRevealSeconds: Number(els.timedSeconds.value) }));

    els.alwaysImages.addEventListener('change', () => patchSettings({ alwaysBlurImages: els.alwaysImages.checked }));
    els.alwaysCode.addEventListener('change', () => patchSettings({ alwaysBlurCode: els.alwaysCode.checked }));
    els.reducedMotion.addEventListener('change', () => patchSettings({ respectReducedMotion: els.reducedMotion.checked }));
    els.screenshotProtection.addEventListener('change', () => patchSettings({ screenshotProtection: els.screenshotProtection.checked }));

    els.whitelistAdd.addEventListener('click', () => {
      addToList('whitelist', cleanHostname(els.whitelistInput.value));
      els.whitelistInput.value = '';
    });
    els.blacklistAdd.addEventListener('click', () => {
      addToList('blacklist', cleanHostname(els.blacklistInput.value));
      els.blacklistInput.value = '';
    });
    els.whitelistInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') els.whitelistAdd.click(); });
    els.blacklistInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') els.blacklistAdd.click(); });

    els.exportBtn.addEventListener('click', async () => {
      const state = await BlurShield.storage.getState();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'blurshield-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', async () => {
      const file = els.importFile.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = BlurShield.storage.migrate(JSON.parse(text));
        await BlurShield.storage.setState(parsed);
        render(parsed);
      } catch (err) {
        alert('That file could not be read as BlurShield settings.');
      }
      els.importFile.value = '';
    });

    els.resetBtn.addEventListener('click', async () => {
      if (!confirm('Reset all BlurShield settings, lists, and stats to defaults?')) return;
      const fresh = BlurShield.storage.defaultState();
      await BlurShield.storage.setState(fresh);
      render(fresh);
    });
  }

  boot();
})();
