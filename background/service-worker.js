/**
 * BlurShield — Background Service Worker (MV3)
 *
 * Stateless between wakeups by design — all durable state lives in
 * chrome.storage. This worker's only jobs are:
 *   1. Initialize default state on install.
 *   2. Translate keyboard commands into messages for the active tab.
 *   3. Provide a right-click context menu shortcut to the panic button.
 */

const DEFAULT_STATE = {
  settings: {
    schemaVersion: 1,
    enabled: true,
    blurLevel: 'medium',
    revealMode: 'hover',
    temporaryRevealSeconds: 4,
    animationSpeedMs: 200,
    hoverDelayMs: 0,
    theme: 'dark',
    accent: 'violet',
    alwaysBlurImages: true,
    alwaysBlurCode: true,
    respectReducedMotion: true,
    screenshotProtection: false,
    panicActive: false,
    panicPreviousEnabled: true,
  },
  lists: { whitelist: [], blacklist: [], siteOverrides: {} },
  stats: { totalElementsBlurred: 0, totalReveals: 0, perSite: {} },
};

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const existing = await chrome.storage.local.get('blurshieldState');
    if (!existing.blurshieldState) {
      await chrome.storage.local.set({ blurshieldState: DEFAULT_STATE });
    }
  }
  chrome.contextMenus.create({
    id: 'blurshield-panic',
    title: 'BlurShield: Panic blur this page',
    contexts: ['page', 'selection', 'image'],
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === 'panic-toggle') {
    chrome.tabs.sendMessage(tab.id, { type: 'PANIC_TOGGLE' }).catch(() => {});
  }
  if (command === 'cycle-blur-level') {
    chrome.tabs.sendMessage(tab.id, { type: 'CYCLE_BLUR_LEVEL' }).catch(() => {});
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'blurshield-panic' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'PANIC_TOGGLE' }).catch(() => {});
  }
});

// Lets the popup ask "is BlurShield active on this tab" without duplicating
// storage-read logic — background just proxies to the content script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      sendResponse({ tabId: tab?.id, url: tab?.url });
    });
    return true; // keep the message channel open for the async sendResponse
  }
  return false;
});
