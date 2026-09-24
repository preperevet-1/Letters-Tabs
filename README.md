# Letter Tabs 1.0

A minimal sidebar mod for Zen Browser, installed through Sine.

## Features

- **Text-only tabs:** hides site favicons, adds a larger left inset, and uses compact 32px rows with 2px spacing.
- **Tab states:** unloaded tabs have dimmer text; the selected tab has no shadow. Close and unload buttons are smaller.
- **Essentials:** shorter 37px tiles, slightly bolder 13px letters with optical centering, no selected outline or shadow, and adjusted spacing below the tiles.
- **Editable initials:** double-click an Essential to edit its symbol inline. Enter or clicking outside saves; Escape cancels. Clear the field to restore the domain initial. Letters and emoji are saved locally per site and browser container.
- **Fixed titles:** renamed tabs retain their names during navigation and restoration. Pinned tabs fall back to their original pinned title. Submit an empty rename to restore dynamic titles.
- **Pinned tab behavior:** closing/unloading a pinned tab resets it to its original pinned URL for the next opening. The manual “Back to pinned URL” button, menu item, and changed-URL indicator are hidden. Explicit tab removal remains available.
- **Minimal folders:** removes folder icons, matches tab row sizing and spacing, and adds a right-side chevron that smoothly rotates when expanded. Nested indentation is preserved; reduced-motion preferences are respected.
- **Compact workspace header:** reduces its height and icon sizes. The centered three-dot menu uses the same rounded hover/pressed background as tab controls.

## Installation

1. Upload `theme.json`, `chrome.css`, `LetterTabs.uc.js`, and `README.md` to the repository root.
2. Add the repository URL in **Settings → Sine Mods**. Enable JavaScript from unofficial sources in Sine if required.
3. Install or update the mod, then fully restart Zen.

Disable the mod in Sine to restore the standard layout and handlers. Saved initials and titles remain available when re-enabled.

## Notes

Customizations are stored locally in browser preferences and, when available, SessionStore. A previously lost custom title must be renamed once again. The mod uses Zen's internal UI and may need updates when Zen changes.
