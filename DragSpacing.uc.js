// ==UserScript==
// @name Letter Tabs Drag Spacing
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsDrag?.destroy();
  let disposed = false, cleanup = () => {};
  function initialize() {
    if (disposed) return;
    const strip = document.getElementById('tabbrowser-tabs');
    if (!strip) return;
    let dragged = null, frame = 0;
    const shifted = new Set();
    function clear() {
      for (const node of shifted) node.removeAttribute('lt-drag-gap');
      shifted.clear();
    }
    function stop() { window.cancelAnimationFrame(frame); frame = 0; dragged = null; clear(); }
    function start(event) {
      stop();
      const tab = event.target.closest?.('.tabbrowser-tab');
      if (tab && !tab.hasAttribute('zen-essential')) dragged = tab;
    }
    function update() {
      frame = 0;
      clear();
      if (!dragged || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // Use the destination calculated by Zen instead of changing its drop logic.
      const data = dragged._dragData;
      const target = data?.dropElement;
      if (!target?.matches?.('.tabbrowser-tab') || target.hasAttribute('zen-essential')) return;
      const moving = new Set(data.movingTabs || [dragged]);
      const siblings = [...target.parentElement.children].filter(node =>
        node.matches('.tabbrowser-tab') && !moving.has(node) && node.getBoundingClientRect().height > 0);
      const index = siblings.indexOf(target);
      if (index < 0) return;
      const boundary = index + (data.dropBefore ? 0 : 1);
      for (const [tab, direction] of [[siblings[boundary - 1], 'up'], [siblings[boundary], 'down']]) {
        const stack = tab?.querySelector('.tab-stack');
        if (stack) { stack.setAttribute('lt-drag-gap', direction); shifted.add(stack); }
      }
    }
    function over() {
      if (dragged && !frame) frame = window.requestAnimationFrame(update);
    }
    function leave(event) { if (!strip.contains(event.relatedTarget)) clear(); }
    strip.addEventListener('dragstart', start, true);
    strip.addEventListener('dragover', over);
    strip.addEventListener('dragleave', leave);
    window.addEventListener('drop', stop, true);
    window.addEventListener('dragend', stop, true);
    window.addEventListener('blur', stop);
    cleanup = () => {
      stop();
      strip.removeEventListener('dragstart', start, true);
      strip.removeEventListener('dragover', over);
      strip.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', stop, true);
      window.removeEventListener('dragend', stop, true);
      window.removeEventListener('blur', stop);
    };
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('load', initialize);
    window.removeEventListener('unload', destroy);
    cleanup();
    delete window.__letterTabsDrag;
  }
  window.__letterTabsDrag = { destroy };
  window.addEventListener('unload', destroy, { once: true });
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
