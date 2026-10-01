// ==UserScript==
// @name           Letter Tabs Minimal Search
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsSearch?.destroy();
  let initialized = false, disposed = false;
  let cleanup = () => {};
  function initialize() {
  if (disposed || initialized) return;
  initialized = true;
  const bar = document.getElementById('urlbar');
  const input = document.getElementById('urlbar-input');
  if (!bar || !input) return;
  const floating = () => bar.hasAttribute('breakout-extend') &&
    (bar.getAttribute('zen-floating-urlbar') === 'true' ||
     document.documentElement.getAttribute('zen-single-toolbar') === 'true');
  function sync() {
    bar.toggleAttribute('letter-tabs-search-empty', !input.value.trim());
  }
  function keydown(event) {
    if (event.target !== input || !floating() || input.value.trim() || event.isComposing) return;
    // Never activate a native top-site result while its row is hidden.
    if (['Enter', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  const observer = new MutationObserver(sync);
  observer.observe(bar, { attributes: true, attributeFilter: ['open', 'breakout-extend', 'zen-floating-urlbar'] });
  input.addEventListener('input', sync);
  input.addEventListener('focus', sync);
  window.addEventListener('keydown', keydown, true);
  bar.setAttribute('letter-tabs-minimal-search', 'true');
  sync();
  function destroy() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    input.removeEventListener('input', sync);
    input.removeEventListener('focus', sync);
    window.removeEventListener('keydown', keydown, true);
    window.removeEventListener('unload', destroy);
    bar.removeAttribute('letter-tabs-search-empty');
    bar.removeAttribute('letter-tabs-minimal-search');
    delete window.__letterTabsSearch;
  }
  cleanup = destroy;
  window.__letterTabsSearch = { destroy };
  window.addEventListener('unload', destroy, { once: true });
  }
  function dispose() {
    window.removeEventListener('load', initialize);
    cleanup();
    disposed = true;
  }
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(dispose);
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
