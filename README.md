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

## 1.5.3 — supplied 1.2.11 baseline

Built from the supplied zen-mods/zen-letter-tabs-1.2.11-github folder. CSS, tab behavior, search and scroll scripts are unchanged. Only loading cleanup and an isolated native folder-animation timing module are added. No custom drag scripts or Zia modules.

Replace the previous mod installation completely (remove obsolete DragSpacing, FolderPreview and Zia files if present) and restart Zen. Mock lifecycle tests pass; live Zen visual behavior remains unverified.
