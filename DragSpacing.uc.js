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
    let hoveredFolder = null, lastEvent = null, imageInFolder = false;
    function folderFeedback(folder, event) {
      if (hoveredFolder !== folder) {
        hoveredFolder?.removeAttribute('lt-folder-drop');
        hoveredFolder = folder;
        folder?.setAttribute('lt-folder-drop', 'true');
      }
      const compact = !!folder;
      if (compact === imageInFolder) return;
      const args = strip.tabDragAndDrop?.originalDragImageArgs;
      const image = args?.[0];
      if (!image) return;
      imageInFolder = compact;
      for (const clone of image.querySelectorAll('[drag-image]')) {
        clone.toggleAttribute('lt-folder-drag-image', compact);
      }
      image.getBoundingClientRect();
      // Refresh Zen's native drag image; styling the original tab cannot resize it.
      try { event?.dataTransfer?.updateDragImage(image, args[1], args[2]); }
      catch (error) { console.debug('[Letter Tabs] Drag image refresh unavailable', error); }
    }
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
      folderFeedback(null, lastEvent);
      lastEvent = null;
      strip.removeAttribute('lt-dragging');
      strip.removeAttribute('lt-reordering');
      clear();
    }
    function start(event) {
      window.cancelAnimationFrame(ending);
      stop();
      const tab = event.target.closest?.('.tabbrowser-tab');
      if (tab && !tab.hasAttribute('zen-essential')) { dragged = tab; strip.setAttribute('lt-dragging', 'true'); }
    }
    function update() {
      frame = 0;
      if (!dragged || !dragged.isConnected) { stop(); return; }
      const data = dragged._dragData;
      const moving = data?.movingTabs || [dragged];
      const folder = hoveredFolder;
      if (folder?.hasAttribute('collapsed')) {
        clear();
        strip.setAttribute('lt-reordering', 'true');
        const node = visual(dragged);
        if (node) { node.setAttribute('lt-drag-source', ''); affected.add(node); }
        return;
      }
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
    function over(event) {
      if (!strip.contains(event.target)) { folderFeedback(null, event); return; }
      // Zen can stop bubbling and dragstart can originate from an inner control.
      // Recover the actual source from the native drag payload in capture phase.
      if (!dragged) {
        try {
          const source = event.dataTransfer.mozGetDataAt('application/x-moz-tabbrowser-tab', 0);
          if (source?.ownerDocument === document && source.matches?.('.tabbrowser-tab') && !source.hasAttribute('zen-essential')) {
            dragged = source;
            strip.setAttribute('lt-dragging', 'true');
          }
        } catch { return; }
      }
      if (!dragged) return;
      lastEvent = event;
      let folder = event.target.closest?.('zen-folder');
      const moving = dragged._dragData?.movingTabs || [dragged];
      if (folder?.isLiveFolder || moving.length !== 1) folder = null;
      if (folder?.hasAttribute('collapsed')) {
        const header = folder.querySelector('.tab-group-label-container');
        const rect = header?.getBoundingClientRect();
        // Header edges are sibling insertion zones, its center means "inside".
        if (!rect || event.clientY < rect.top + rect.height * .2 || event.clientY > rect.bottom - rect.height * .2) folder = null;
      }
      folderFeedback(folder, event);
      if (!frame) frame = window.requestAnimationFrame(update);
    }
    function leave(event) {
      if (!strip.contains(event.relatedTarget)) {folderFeedback(null, event);strip.removeAttribute('lt-reordering');clear();}
    }
    function drop() {
      // Let the native handler commit the new DOM order before clearing offsets.
      window.cancelAnimationFrame(frame);frame = 0;
      ending = window.requestAnimationFrame(stop);
    }
    strip.addEventListener('dragstart', start, true);
    window.addEventListener('dragover', over, true);
    strip.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop, true);
    window.addEventListener('dragend', drop, true);
    window.addEventListener('blur', stop);
    cleanup = () => {
      window.cancelAnimationFrame(ending);stop();
      strip.removeEventListener('dragstart', start, true);
      window.removeEventListener('dragover', over, true);
      strip.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop, true);
      window.removeEventListener('dragend', drop, true);
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
