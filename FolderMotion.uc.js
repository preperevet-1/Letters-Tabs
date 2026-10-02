// ==UserScript==
// @name Letter Tabs Folder Motion
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsFolderMotion?.destroy();
  const frames = new Set();
  const adjusted = new WeakSet();
  let disposed = false;
  function smooth(group) {
    if (disposed || !group.isConnected || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.getElementById('tabbrowser-tabs')?.hasAttribute('movingtab')) return;
    for (const animation of group.getAnimations({subtree: true})) {
      if (adjusted.has(animation) || animation.playState === 'finished') continue;
      const effect = animation.effect;
      const target = effect?.target;
      if (!target || !group.contains(target) || target.closest?.('[drag-image]')) continue;
      const keys = effect.getKeyframes();
      // Only native folder geometry animations, never page loading waves.
      if (!keys.some(key => 'height' in key || 'marginTop' in key)) continue;
      adjusted.add(animation);
      effect.updateTiming({duration: 260, easing: 'cubic-bezier(.22,.61,.36,1)'});
    }
  }
  function schedule(group, second = false) {
    const id = requestAnimationFrame(() => {
      frames.delete(id);
      smooth(group);
      if (!second && !disposed) schedule(group, true);
    });
    frames.add(id);
  }
  function onFolder(event) {
    if (event.target?.localName === 'zen-folder') schedule(event.target);
  }
  function destroy() {
    disposed = true;
    for (const id of frames) cancelAnimationFrame(id);
    frames.clear();
    for (const type of ['TabGroupExpand', 'TabGroupCollapse']) window.removeEventListener(type, onFolder, true);
    window.removeEventListener('unload', destroy);
    delete window.__letterTabsFolderMotion;
  }
  for (const type of ['TabGroupExpand', 'TabGroupCollapse']) window.addEventListener(type, onFolder, true);
  window.addEventListener('unload', destroy, {once: true});
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  window.__letterTabsFolderMotion = {destroy};
})();
