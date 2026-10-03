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

## Translator mode (1.6.3)

Type `/tr` and press Enter, or type `/tr ` with a space. `/translate` is an alias. The English translator expands from the search surface to a wider two-column editor (25% wider, minimum 800px, constrained to the viewport). Back/Escape animates back to search and restores its native input focus. Reduced-motion preferences skip these animations.

Language labels are centered above each column, gray and transparent, with chevrons. Hover or click opens a menu; arrow keys navigate, Enter chooses, and Escape closes it. The left editor is borderless, Back is a rounded square, and the center button swaps languages. Translate in the footer is an informational label.

Source defaults to detection; target defaults to English. Translation runs automatically 500ms after typing or changing languages. Enter inserts a newline. Cmd/Ctrl+C copies the translation when no text is selected; selected text retains native copy behavior. Composition input waits until composition ends. Edits cancel pending requests and prevent stale responses from replacing newer text.

Text is automatically sent to Google's unauthenticated translate.googleapis.com endpoint. No API key is required; this is an unofficial endpoint without guaranteed availability. Requests omit cookies/referrer, time out after 15 seconds, and allow up to 1500 characters. No local text history is stored by the mod. Google processes submitted text.

Validation: JavaScript syntax and mocked activation, geometry, debounce, multiline, IME, stale responses, copy, language menu, swap, return-to-search and cleanup checks. Native Zen appearance and animation still require live verification.

## 1.6.4

Back reopens the native URL-bar query/view and restores new-tab search mode when applicable. The earlier startQuery:false call focused the input without reopening the view required for floating layout. Copied uses green text and a dot; the copy button has a pale hoverable background, swap uses a larger SVG in a circular button, and the source panel is lighter. Live Zen validation remains required.

Word and character counters are removed from the translator.

## 1.6.5

Smaller circular swap control matches the source panel. Copied dot glows twice (respects reduced motion). Return restores native search beneath the overlay before shrinking, suppressing its separate entrance animation for that search session. Live Zen verification remains required.

## 1.6.6

Return hides native search with opacity while restoring focus and shrinking the translator shell. Editor content is hidden during the handoff, and search becomes visible only once the overlay is removed. Cancelled/failed animations clean up rather than leaving both surfaces visible. Live Zen verification remains required.

## 1.6.7

Return measures only the search input row, excluding suggestions. A 180ms compositor transform replaces width/height layout animation; editor content fades rather than disappearing before motion starts. A bounded completion fallback prevents a stalled animation from stranding the surface. Live Zen verification remains required.

## 1.6.8

Slash input opens a filterable command list with Translate, keyboard selection and click activation, suppressing native file/history suggestions in command mode. Language menus open on click or keyboard only. Icon motion respects reduced motion; return lasts 320ms. Translator hiding rules apply only to the expanded urlbar, leaving its collapsed sidebar field visible. Native Zen visual validation remains required.
