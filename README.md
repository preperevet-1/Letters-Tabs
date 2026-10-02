# Letter Tabs

A minimal Zen Browser sidebar: text-only tabs, editable Essential initials, fixed tab titles, Zia-based folder hover surfaces, outlines and drag animations, smaller controls, pinned URL reset on unload, scroll progress and a loading wave in tabs (excluding Essentials), and a minimal floating search with suggestions only after typing.

## Installation

1. Download and install [Sine](https://github.com/CosmoCreeper/Sine), then restart Zen.
2. Open **Settings → Sine Mods** and enable **installing JavaScript from unofficial sources** in Sine's settings.
3. Paste `https://github.com/preperevet-1/zen-letters` into the custom repository field and click **Install**.
4. Restart Zen.

## Search shortcuts

Type `!gpt`, `!per`, `!yt`, `!gen`, or `!pin` to search ChatGPT, Perplexity, YouTube, Genius, or Pinterest. Enter your query and press Enter. Press Escape to exit shortcut mode.

Type `!` to see available shortcuts. Matching pinned tabs in the current Space (including Essentials) are reused in the same container.

## Folder and drag integration (1.4.0)

The folder and drag modules are adapted from [Zia 2.81.2](https://github.com/z1n-k/zia), Copyright (c) 2026 z1nk, under the MIT license (see `Zia-LICENSE`). The port includes their lexical dependencies, folder spring animation, empty-folder drop slots, hover surfaces, insertion movement, narrowing over folders and landing cleanup. Letter Tabs supplies its light/dark palette and 32px row size.

The old Letter Tabs drag implementation and folder geometry overrides have been replaced. Dragging no longer creates a split view, in either the sidebar or page area. Existing split groups can still move; normal split commands are unchanged. Zia's search, player, hover preview cards, AI and split-Essentials features are not enabled.

**Restart Zen completely after updating or disabling this version.** The upstream drag and folder modules patch browser prototypes and do not support live unloading (`supportsUnload: false`). Restarting clears the previous version's hooks. Upload every file in the release ZIP together.

Validation: JavaScript syntax, dependency closure, CSS parsing and embedded resources; mocked checks for drag-to-split suppression, ordinary URL drag preservation and duplicate startup. Existing search-shortcut, loading and scrolling checks pass. Interactive folder/drag behavior still requires validation in Zen; these checks do not simulate its layout engine or native drag service.
