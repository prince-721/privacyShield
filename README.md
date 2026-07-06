# BlurShield

Automatically blurs sensitive on-screen content — chats, AI prompts and
responses, code, documents, images — and reveals it only the way you choose
(hover, click, hold Alt, hold Space, or a timed peek). Everything runs
locally in the browser; there are no servers and no data collection.

## Install (unpacked, for Chrome / Edge / Brave / Arc / Opera)

1. Open `chrome://extensions` (or the equivalent page in your browser).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Pin the BlurShield icon from the extensions toolbar menu for one-click access.

That's it — no build step required. This is a plain-JS Manifest V3 extension,
so "Load unpacked" runs it exactly as-is.

## What's implemented

- **Generic detection engine** (semantic HTML / ARIA roles / contenteditable
  + a text-heuristic fallback) so it protects *any* page, not just the sites
  listed below.
- **Site profiles** that sharpen accuracy on: ChatGPT, Claude, Gemini,
  Perplexity, WhatsApp Web, Discord, Slack, Telegram Web, Gmail, Outlook,
  LinkedIn messages, Messenger, X/Twitter, Reddit, GitHub, GitLab, Notion,
  Google Docs, Facebook, Instagram — while explicitly keeping nav/sidebar/
  file-tree elements unblurred.
- **Code Mode** (GitHub/GitLab): blurs code lines only, file tree stays visible.
- **Document Mode** (Google Docs/Notion): paragraph-level reveal.
- **6 blur levels**: Light, Medium, Strong, Extreme, Pixelated, Black Box.
- **5 reveal modes**: Hover, Click, Hold Alt, Hold Space, Timed auto-re-blur.
- **Whitelist / Blacklist** with per-site override storage.
- **Panic Button** — `Ctrl+Shift+H` (also right-click → BlurShield), blurs
  the entire page instantly and restores on a second press.
- **Screenshot protection** (optional, best-effort key-event detection —
  no web API can see an OS-level screenshot, so this reacts to PrintScreen /
  common OS screenshot shortcuts rather than guaranteeing capture-block).
- **Performance**: one initial DOM scan, then MutationObserver-driven
  incremental scans (batched via requestAnimationFrame) plus an
  IntersectionObserver so off-screen content isn't blurred until it scrolls
  into view. All hover-reveal animation is pure CSS (`filter` + `transition`),
  never a JS loop — this is what keeps it smooth on huge pages.
- **Popup + Options UI**, dark glass aesthetic, with live stats, mode/level
  switchers, theme/accent, timing sliders, list management, and JSON
  import/export.

## Folder structure

```
manifest.json
background/service-worker.js       Keyboard commands, context menu, install defaults
content/
  index.js                         Entry point, boots the engine per page
  content.css                      Blur levels, transitions, panic mode
  engine/                          detection / blur / reveal / observer / panic
  detectors/                       semantic, heuristic, media
  sites/site-profiles.js           Per-site refinements
popup/                             Toolbar popup UI
options/                           Full settings page
storage/schema.js                  Shared state shape, defaults, migrations
utils/                             dom-utils, stats
assets/icons/                      16/32/48/128 px icons
```

## Notes / limitations to be upfront about

- "Pixelated Mode" approximates a mosaic using blur + contrast (true
  per-pixel mosaic would require canvas-rewriting every image, which is
  heavier and was intentionally avoided for the RAM/perf target).
- Screenshot protection can only react to key events a page can observe —
  it cannot intercept OS-level screen capture APIs.
- Site profiles use current selectors/class names for each service; those
  apps change their markup periodically, so a profile occasionally needing
  a selector refresh is expected maintenance, not a bug in the detection
  engine itself (the generic detectors keep protecting the page either way).
