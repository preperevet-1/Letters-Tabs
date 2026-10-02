# Letter Tabs

A minimal Zen Browser sidebar: text-only tabs, editable Essential initials, fixed tab titles, original compact folders with animated chevrons and smooth tab dragging, smaller controls, pinned URL reset on unload, scroll progress and a loading wave in tabs (excluding Essentials), and a minimal floating search with suggestions only after typing.

## Installation

1. Download and install [Sine](https://github.com/CosmoCreeper/Sine), then restart Zen.
2. Open **Settings → Sine Mods** and enable **installing JavaScript from unofficial sources** in Sine's settings.
3. Paste `https://github.com/preperevet-1/zen-letters` into the custom repository field and click **Install**.
4. Restart Zen.

## Search shortcuts

Type `!gpt`, `!per`, `!yt`, `!gen`, or `!pin` to search ChatGPT, Perplexity, YouTube, Genius, or Pinterest. Enter your query and press Enter. Press Escape to exit shortcut mode.

Type `!` to see available shortcuts. Matching pinned tabs in the current Space (including Essentials) are reused in the same container.

## Folders and dragging (1.4.1)

Folder styling is restored from Letter Tabs 1.3.2: text-only headers, right-hand chevrons and the original hover treatment. Zia's folder frames, icons, opening animation, color watchers and empty-folder slots are removed. Opening and closing folders uses Zen's original behavior.

Smooth drag movement, narrowing and landing remain adapted from [Zia 2.81.2](https://github.com/z1n-k/zia), Copyright (c) 2026 z1nk, MIT (see `Zia-LICENSE`). Dragging does not create split views; ordinary split commands remain available.

**Restart Zen completely after updating or disabling this version.** The drag module patches browser prototypes and requires a restart to remove old hooks (`supportsUnload: false`). Upload all release files together.

Validation: original 1.3.2 CSS retained verbatim, folder-module removal, JavaScript syntax/dependency closure, CSS parsing, embedded resources and mocked drag-to-split/startup checks. Native drag behavior has not been verified interactively in Zen.
