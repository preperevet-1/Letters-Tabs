# Letter Tabs

A minimal Zen Browser sidebar: text-only tabs, editable Essential initials, fixed tab titles, compact folders with animated chevrons, smaller controls, pinned URL reset on unload, scroll progress and a loading wave in tabs (excluding Essentials), and a minimal floating search with suggestions only after typing.

## Installation

1. Download and install [Sine](https://github.com/CosmoCreeper/Sine), then restart Zen.
2. Open **Settings → Sine Mods** and enable **installing JavaScript from unofficial sources** in Sine's settings.
3. Paste `https://github.com/preperevet-1/zen-letters` into the custom repository field and click **Install**.
4. Restart Zen.

## Search shortcuts

Type `!gpt`, `!per`, `!yt`, `!gen`, or `!pin` to search ChatGPT, Perplexity, YouTube, Genius, or Pinterest. Enter your query and press Enter. Press Escape to exit shortcut mode.

Type `!` to see available shortcuts. Matching pinned tabs in the current Space (including Essentials) are reused in the same container.

## 1.5.0 — restored 1.2.11 baseline

Built from the original 1.2.11 release archive. Search, tabs, scroll progress and folder styling are restored without later changes. Custom drag movement, drag haptics and drag-to-split overrides are removed; Zen handles dragging normally.

Only two additions: smooth folder opening/closing, adapted from Zia 2.81.2 (MIT, Copyright (c) 2026 z1nk; see Zia-LICENSE), and loading-wave cleanup for closed/discarded tabs, including late load events after closing.

Upload the included inert `DragSpacing.uc.js` and `FolderPreview.uc.js` replacement files to overwrite previously installed modules. Replace all included files and fully restart Zen to clear old prototype hooks. The isolated folder animation module requires restart on disable (`supportsUnload: false`).

Verified: unchanged baseline files, JavaScript syntax, loading lifecycle/late-event/discard tests. Interactive folder animation remains unverified in Zen.

## 1.5.1

Suppress native insertion-line overlap on the compact drag image. Folder motion bypasses native dragging and drag images. Include inert replacement files for removed modules so upgrades overwrite cached scripts. Full browser restart is required to clear already installed hooks.

## 1.5.2

Keep the native insertion indicator visible and hide only the cloned drag image (`[drag-image]`). No custom reordering is installed. Native drag-image rendering requires verification in Zen.
