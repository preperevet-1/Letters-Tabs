// ==UserScript==
// @name Letter Tabs Drag Reordering
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsDrag?.destroy();
  let disposed = false, cleanup = () => {};
  // Match the insertion index used by Zen; shift the entire crossed range.
  function shift(index, origin, destination, height) {
    if (index < origin && index >= destination) return height;
    if (index > origin && index < destination) return -height;
    return 0;
  }
  function initialize() {
    if (disposed) return;
    const strip = document.getElementById('tabbrowser-tabs');
    if (!strip) return;
    let dragged = null, frame = 0, ending = 0;
    const affected = new Set();
    function visual(item) {
      return item.matches?.('.tabbrowser-tab') ? item.querySelector('.tab-stack') : item;
    }
    function clear() {
      for (const node of affected) {
        node.removeAttribute('lt-drag-source');
        node.removeAttribute('lt-drag-row');
        node.style.removeProperty('--lt-drag-offset');
      }
      affected.clear();
    }
    function stop() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      dragged = null;
      strip.removeAttribute('lt-reordering');
      clear();
    }
    function start(event) {
      window.cancelAnimationFrame(ending);
      stop();
      const tab = event.target.closest?.('.tabbrowser-tab');
      if (tab && !tab.hasAttribute('zen-essential')) dragged = tab;
    }
    function update() {
      frame = 0;
      if (!dragged || !dragged.isConnected) { stop(); return; }
      const data = dragged._dragData;
      const moving = data?.movingTabs || [dragged];
      // Folder/group drags and multi-selection remain under native control.
      if (moving.length !== 1 || !Number.isFinite(data?.animDropElementIndex) ||
          data.shouldDropIntoCollapsedTabGroup || data.dropElement?.hasAttribute?.('zen-essential')) {
        strip.removeAttribute('lt-reordering');clear();return;
      }
      const items = [...strip.ariaFocusableItems];
      const origin = dragged.elementIndex;
      const next = items.find(item => item.elementIndex > origin);
      const rect = dragged.getBoundingClientRect();
      const distance = next ? next.getBoundingClientRect().top - rect.top : rect.height;
      const height = distance > 0 && distance < rect.height * 1.5 ? distance : rect.height;
      strip.setAttribute('lt-reordering', 'true');
      const current = new Set();
      for (const item of items) {
        const node = visual(item);
        if (!node || item.hasAttribute?.('zen-essential')) continue;
        current.add(node);affected.add(node);
        node.setAttribute('lt-drag-row', '');
        node.toggleAttribute('lt-drag-source', item === dragged);
        node.style.setProperty('--lt-drag-offset', `${shift(item.elementIndex, origin, data.animDropElementIndex, height)}px`);
      }
      for (const node of affected) if (!current.has(node)) {
        node.removeAttribute('lt-drag-row');node.removeAttribute('lt-drag-source');
        node.style.removeProperty('--lt-drag-offset');affected.delete(node);
      }
    }
    function over() {
      if (dragged && !frame) frame = window.requestAnimationFrame(update);
    }
    function leave(event) {
      if (!strip.contains(event.relatedTarget)) {strip.removeAttribute('lt-reordering');clear();}
    }
    function drop() {
      // Let the native handler commit the new DOM order before clearing offsets.
      window.cancelAnimationFrame(frame);frame = 0;
      ending = window.requestAnimationFrame(stop);
    }
    strip.addEventListener('dragstart', start, true);
    strip.addEventListener('dragover', over);
    strip.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    window.addEventListener('dragend', drop);
    window.addEventListener('blur', stop);
    cleanup = () => {
      window.cancelAnimationFrame(ending);stop();
      strip.removeEventListener('dragstart', start, true);
      strip.removeEventListener('dragover', over);
      strip.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      window.removeEventListener('dragend', drop);
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
