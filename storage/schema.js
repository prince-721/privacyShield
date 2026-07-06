/**
 * BlurShield — Storage schema
 *
 * Single source of truth for what lives in chrome.storage, its defaults,
 * and versioned migrations. Used by content scripts, popup, options page,
 * and the background service worker — all in shared, non-module scope.
 */
(function () {
  const BlurShield = (window.BlurShield = window.BlurShield || {});

  const SCHEMA_VERSION = 1;

  const BLUR_LEVELS = {
    light: { label: 'Light', px: 2 },
    medium: { label: 'Medium', px: 5 },
    strong: { label: 'Strong', px: 8 },
    extreme: { label: 'Extreme', px: 15 },
    pixelated: { label: 'Pixelated', px: 8, pixelated: true },
    blackbox: { label: 'Black Box', px: 0, blackbox: true },
  };

  const REVEAL_MODES = {
    hover: 'Hover to reveal',
    click: 'Click to reveal',
    alt: 'Hold Alt to reveal',
    space: 'Hold Space to reveal',
    timed: 'Temporary reveal (auto re-blur)',
  };

  const DEFAULT_SETTINGS = {
    schemaVersion: SCHEMA_VERSION,
    enabled: true,
    blurLevel: 'medium',
    revealMode: 'hover',
    temporaryRevealSeconds: 4,
    animationSpeedMs: 200, // within the 150–250ms spec range
    hoverDelayMs: 0,
    theme: 'dark', // 'dark' | 'light'
    accent: 'violet', // named accent, see popup/options for palette
    alwaysBlurImages: true,
    alwaysBlurCode: true,
    respectReducedMotion: true,
    screenshotProtection: false,
    panicActive: false,
    // stores the mode active before the panic button was pressed so it can restore it
    panicPreviousEnabled: true,
  };

  const DEFAULT_LISTS = {
    whitelist: [], // hostnames: never blur
    blacklist: [], // hostnames: force-blur even if generic detection is unsure
    siteOverrides: {}, // { hostname: Partial<settings> }
  };

  const DEFAULT_STATS = {
    totalElementsBlurred: 0,
    totalReveals: 0,
    perSite: {}, // { hostname: { blurred, revealed, lastActive } }
  };

  function defaultState() {
    return {
      settings: { ...DEFAULT_SETTINGS },
      lists: {
        whitelist: [...DEFAULT_LISTS.whitelist],
        blacklist: [...DEFAULT_LISTS.blacklist],
        siteOverrides: { ...DEFAULT_LISTS.siteOverrides },
      },
      stats: {
        totalElementsBlurred: 0,
        totalReveals: 0,
        perSite: {},
      },
    };
  }

  /** Merge stored (possibly partial/old) state with current defaults. */
  function migrate(stored) {
    const base = defaultState();
    if (!stored || typeof stored !== 'object') return base;
    return {
      settings: { ...base.settings, ...(stored.settings || {}) },
      lists: {
        whitelist: Array.isArray(stored.lists?.whitelist)
          ? stored.lists.whitelist
          : base.lists.whitelist,
        blacklist: Array.isArray(stored.lists?.blacklist)
          ? stored.lists.blacklist
          : base.lists.blacklist,
        siteOverrides:
          stored.lists?.siteOverrides && typeof stored.lists.siteOverrides === 'object'
            ? stored.lists.siteOverrides
            : base.lists.siteOverrides,
      },
      stats: {
        totalElementsBlurred: stored.stats?.totalElementsBlurred || 0,
        totalReveals: stored.stats?.totalReveals || 0,
        perSite: stored.stats?.perSite || {},
      },
    };
  }

  /** Reads the full BlurShield state from chrome.storage.local. */
  function getState() {
    return new Promise((resolve) => {
      chrome.storage.local.get('blurshieldState', (result) => {
        resolve(migrate(result.blurshieldState));
      });
    });
  }

  /** Persists the full BlurShield state to chrome.storage.local. */
  function setState(state) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ blurshieldState: state }, () => resolve(state));
    });
  }

  /** Subscribes to live changes; callback receives the new full state. */
  function onStateChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.blurshieldState) return;
      callback(migrate(changes.blurshieldState.newValue));
    });
  }

  /** Resolves effective settings for a hostname (defaults + site override). */
  function effectiveSettingsFor(state, hostname) {
    const override = state.lists.siteOverrides[hostname] || {};
    return { ...state.settings, ...override };
  }

  BlurShield.storage = {
    SCHEMA_VERSION,
    BLUR_LEVELS,
    REVEAL_MODES,
    DEFAULT_SETTINGS,
    defaultState,
    migrate,
    getState,
    setState,
    onStateChange,
    effectiveSettingsFor,
  };
})();
