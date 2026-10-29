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

## 1.6.10

Removed the native top separator from the `.urlbarView-results` scrollport in floating minimal search. Verified the source selector against the installed Zen browser stylesheet; live appearance remains unverified.

## 1.6.11

Removed native top padding from the floating results container and scrollport, retaining a compact 4px top margin above the first row.

## 1.7.0

Hover a tab for 420ms to show its title, domain and Pin, Essential, Split View and Bookmark actions. Move into the card to use its buttons. Split View selects the hovered tab and opens Zen’s native second-tab picker. Bookmark opens the native add/edit bookmark dialog for the hovered URL. Pin on an Essential converts it to a regular pin. The card closes on drag, tab closure, scrolling, window blur and Escape. Mock lifecycle/action tests pass; native Zen visual behavior is unverified.

## 1.7.1

Hover actions use a native chrome panel anchored to the hovered tab and capture hover events at window level, including tabs relocated by Zen workspaces. Initialization retries until the tab container is ready. Native visual validation remains required.

## 1.7.2

Compact 170px arrowless hover card with tighter icon spacing and filled active icons. First hover waits 260ms with a 100ms entrance; moving between tabs updates the existing popup immediately without replaying animation. Internal tab movement cancels pending dismissal; window focus changes no longer dismiss the panel. Native tab tooltips and tab preview popups are suppressed while this module is installed. Native appearance remains unverified; mocked hover, switching, tooltip suppression, native actions and cleanup pass.

## 1.7.3

First hover waits 600ms; switching remains immediate. Popup placement uses explicit screen coordinates and moveTo, avoiding a stale first-tab anchor. Native macOS menu appearance, shadow, margins and wrapper borders are disabled so only the custom card draws the surface. Native visual verification is still required.

## 1.7.4

Reset the native popup shadow-root content margins, padding and background directly so only the card paints a surface. Active actions use explicit solid SVG paths and path-level fill instead of inherited SVG fill. Native visual verification remains required.

## 1.7.5

Hover actions inherit native Zen arrow-panel background, text and border colors, with the native panel radius and macOS window shadow. The compact layout and filled active actions remain. Styling references the installed Zen folder and popup styles; live visual verification remains required.

## 1.7.6

The hover panel now uses the folder popup’s type=arrow, nonnative and orient=vertical attributes. Removed all custom popup appearance/background/shadow overrides and the opaque card surface. Installed Zen zen-panel-ui.css now supplies macOS Menu material, native translucency, border and shadow, as for zen-folder-tabs-popup. Existing solid SVG states remain. Live visual verification is required.

## 1.7.7

Hide the Space heading row (name, chevron and actions) inside the sidebar workspace. Tab sections and the bottom workspace switcher are unchanged.

## 1.7.8

Hide Translate This Page in the urlbar. Compact the tab context menu around pin/Essential, split/duplicate, grouping/moving, existing copy-link, rename/icon/pinned-page and close commands. Native names and handlers are retained; no icons added. Workspace indicator strip scales to 80%, preserving centering.


### 1.7.9
- Broom uses an SVG mask instead of context paint; retains 0.9 stroke and separator-only hover.
- Compact tab menu hides unwanted entries using native XUL visibility and restores it after dismissal. Essentials remains next to Pin.

### 1.7.10
- Hide audio indicators only in Essentials.
- Reduce the left inset of audio tabs from 14px to 8px to align their controls with the opposite edge.

### 1.7.11
- Site menu: Translate replaces Share; permissions and cookies are removed from the main panel. Settings opens native site permissions. Footer order: Boosts, Security, Settings, More.
- Essentials hover actions open below their tile, avoiding neighboring Essentials.

### 1.7.12
- Anchor site-menu translations to the site-data button.
- Give all footer actions the same fixed 34 × 30 px footprint.

### 1.7.13
- Wait for site-panel dismissal before opening Translate; supply its anchor before opening instead of moving the visible popup.

### 1.7.14
- Restore Translate opening behavior exactly from 1.7.11; retain equal footer button sizes.

### 1.8.0
- Zia-inspired hover surfaces: 76% surface, 24px blur, soft glass edge and shadow.
- Collapsed-folder hover lists tabs with switch, close and New Tab actions.
- Bookmark action replaced by Copy Link.
- Source: https://github.com/z1n-k/zia/blob/main/src/js/27-hover-cards.js and chrome.css; attribution and MIT terms in ZIA-LICENSE.txt.

### 1.8.1
- Remove New Tab from folder hover menus; show a quiet empty state.
- Increase hover-card blur to 40px; 160ms slide-in and 110ms fade-out with cancelable dismissal.
- Paperclip for Copy Link; separate pin, heart, split and paperclip hover animations. Reduced motion respected.

### 1.8.2
- Folder hover padding reduced to 6px; row gaps only between rows.
- Softer, smaller icon motion; 17px paperclip.
- Hover surfaces: 16px corners and 64px blur.

### 1.8.3
- Add Zia remote-page compositing prerequisite for hover-card backdrop blur.
- Stop retaining the entrance transform after the animation completes.

### 1.9.0
- Top Boost toggle replaces Bookmark, followed by Translate. Native boost rows hidden; unsupported or unconfigured sites disable the toggle.
- 800ms hover delay; icons gently grow 15% and tilt right.
- Bottom loading line shares progress and cleanup with the wave.
- Hide Zen Library donation button; extend the separator when not hovered.
- Native heuristic URL suggestions for common sites after three matching letters (e.g. pin → Pinterest); unmatched text stays a search.

## 1.9.1
- Unified top Boost action creates or toggles an existing boost; native disabled styling and corrected active background. Removed footer Boost button.
- Fixed asynchronous site-provider activation and added native inline address completion with selected suffix.

## 1.9.2
Active Boost uses a filled brush and three staggered sparkle animations. Reduced-motion preference keeps the stars static.

## 1.9.3
Restores original Zen Boost brush geometry with active fill. Uses the installed native boost-indicator sprite (90 frames, 3 seconds); removes custom stars. Respects reduced motion.

## 1.9.4
Equal-width site-header actions with symmetric padding, softer continuous corners, and a raised gradient surface for active Boost.

## 1.9.5
Consistent corners on all site-menu action surfaces and extension tiles. Symmetric footer insets. Active Boost shares the white buttons shadow and highlight with a gray gradient.

## 1.10.0 — compact hover menus and sidebar media

Tab and folder hover menus now participate in Zen's native compact sidebar popup tracking. The sidebar remains revealed until the menu finishes closing; each menu has an independent hold which is removed on cleanup.

The native media card gets a Zia-inspired compact layout: artwork, title, artist and an animated playback indicator. Hover or keyboard focus reveals the original playback, seek, mute, PiP and close controls. Missing artwork falls back to the native site icon. Reduced-motion preferences disable the equalizer animation.

Sidebar video mirroring is adapted from [Zenslop](https://github.com/Firebolt9907/Zenslop). It uses the native visual clone with a canvas fallback and an eye toggle beside the media controls. It follows the active source and stops presenting when hidden. The upstream preferences `mod.zenslop.renderer`, `mod.zenslop.captions` and `mod.zenslop.captionsWhenPipHidden` remain supported through about:config. Do not install a second copy of Zenslop alongside this integration.

**Restart Zen after installing, updating or disabling this version.** Window actors are registered for the browser process. The self-contained SidebarVideo script writes its bundled actor modules into `chrome/letter-tabs-video-actors` in the current profile; it downloads no runtime code. Live unloading is disabled for this release.

Media layout/artwork inspiration: [Zia](https://github.com/z1n-k/zia), MIT (`ZIA-LICENSE.txt`). Video integration: Zenslop, MIT (`ZENSLOP-LICENSE.txt`). Native video and layout regression checks run with mocked Gecko objects; actual compositor rendering, audio playback and compact-mode pointer interaction still need verification in Zen.

## 1.10.1 — mini-player controls

Library downloads hide the player and video preview. Expanded controls place the sidebar eye on the left, transport buttons centrally and native PiP on the right. The top indicator toggles mute and uses the Space accent. Only the title scrolls automatically when overflowing. Timestamps are hidden; seeking stays available. Artwork tries alternate metadata images and YouTube thumbnails before falling back to the site icon. Controls expand and collapse with short transitions. Live Zen validation is still required.

## 1.10.2
Sound bars remain visible and turn static gray when paused or muted. Symmetric outer grid columns center transport controls. The native separate-window PiP action is visible in the expanded card. Video has 18px rounded clipping. Title scrolling now runs only while hovering the card. Live browser verification remains pending.

## 1.10.3
Constrain the seek slider intrinsic width to its grid track and include padding in its width, keeping both card insets equal.

## 1.10.4
Separate header and transport layouts eliminate the shared seven-column minimum width. An explicit Picture-in-Picture button calls the native media card action. Existing playback controls retain native event handling. Layout still needs live verification in Zen.

## 1.10.5
Decorate every native media card, including newly inserted stack members. Reuse Zen’s computed PiP icon and native command. Transport buttons have hover backgrounds. Sound bars remain visible outside hover, use dark gray in light mode and become static gray dots when muted or paused. Browser visual verification remains pending.

## 1.10.6
Only the native front media card is displayed; stack offsets are removed. Footer: native close, previous/play/next, one outline eye. Eye discovery targets only the native PiP button (never its child images). Video source follows the current media card when an eligible video is available. Replaced accumulated media CSS with one layout; sound bars are always present and long titles scroll on hover. Restored native Unload Tab in the context menu. Video remains subject to source eligibility and background-tab rules. Live Zen verification remains pending.

## 1.10.7
Unified footer icon color and opacity. Current-card selection excludes retiring/removing cards, observes visibility changes and tolerates delayed native controller setup. Preview exceptions cannot abort card selection. Native source visibility rules remain intact. Four selection regression cases pass; live browser verification is pending.

## 1.10.8
Eye toggle uses inline SVG with explicit currentColor stroke, avoiding external image context-color inheritance. Both visible/hidden states share the media-control color. Native video regression checks pass; live UI verification pending.
