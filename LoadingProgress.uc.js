// ==UserScript==
// @name Letter Tabs Loading Wave
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsLoading?.destroy();
  const states = new Map();
  const closedTabs = new WeakSet();
  let disposed = false, registered = false;
  const flags = Ci.nsIWebProgressListener;
  function eligible(tab) { return tab && !closedTabs.has(tab) && !tab.closing && tab.isConnected !== false && !tab.hasAttribute('pending') && !tab.hasAttribute('zen-essential') && !tab.hasAttribute('zen-glance-tab'); }
  function remove(tab) {
    const state = states.get(tab);
    if (!state) { tab?.removeAttribute('letter-tabs-loading'); return; }
    window.clearInterval(state.ticker);
    window.clearTimeout(state.finish);
    state.layer.remove();
    tab.removeAttribute('letter-tabs-loading');
    states.delete(tab);
  }
  function start(tab) {
    remove(tab);
    if (!eligible(tab)) return;
    const background = tab.querySelector('.tab-background');
    if (!background) return;
    const layer = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    layer.className = 'letter-tabs-loading-fill';
    layer.setAttribute('aria-hidden', 'true');
    background.append(layer);
    const state = { layer, value: 3, ticker: null, finish: null };
    states.set(tab, state);
    tab.setAttribute('letter-tabs-loading', 'true');
    layer.style.width = '3%';
    // When no byte total is available, provide gentle estimated progress.
    state.ticker = window.setInterval(() => {
      if (!eligible(tab) || !tab.hasAttribute('busy')) { remove(tab); return; }
      state.value += (90 - state.value) * .08;
      layer.style.width = `${state.value}%`;
    }, 180);
  }
  const listener = {
    onStateChange(browser, progress, request, stateFlags) {
      if (!progress.isTopLevel || !(stateFlags & flags.STATE_IS_NETWORK)) return;
      const tab = window.gBrowser.getTabForBrowser(browser);
      if (stateFlags & flags.STATE_START) start(tab);
      if (stateFlags & flags.STATE_STOP) {
        const state = states.get(tab);
        if (!state) return;
        window.clearInterval(state.ticker);
        state.layer.style.width = '100%';
        state.finish = window.setTimeout(() => {
          if (states.get(tab) !== state || !eligible(tab)) { if (states.get(tab) === state) remove(tab); return; }
          state.layer.classList.add('finished');
          state.finish = window.setTimeout(() => { if (states.get(tab) === state) remove(tab); }, 450);
        }, 280);
      }
    },
    onProgressChange(browser, progress, request, current, maximum, total, totalMaximum) {
      if (!progress.isTopLevel || totalMaximum <= 0) return;
      const state = states.get(window.gBrowser.getTabForBrowser(browser));
      if (!state || state.finish !== null) return;
      state.value = Math.max(state.value, Math.min(95, total / totalMaximum * 100));
      state.layer.style.width = `${state.value}%`;
    },
  };
  function tabClosed(event) { closedTabs.add(event.target); remove(event.target); }
  function tabDiscarded(event) { remove(event.target); }
  function tabChanged(event) {
    const tab = event.target;
    if (!eligible(tab) || !tab.hasAttribute('busy')) remove(tab);
  }
  function initialize() {
    if (disposed || registered) return;
    window.gBrowser.addTabsProgressListener(listener);
    window.gBrowser.tabContainer.addEventListener('TabClose', tabClosed);
    window.gBrowser.tabContainer.addEventListener('TabBrowserDiscarded', tabDiscarded);
    window.gBrowser.tabContainer.addEventListener('TabAttrModified', tabChanged);
    registered = true;
    for (const tab of window.gBrowser.tabs) if (tab.hasAttribute('busy')) start(tab);
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('load', initialize);
    window.removeEventListener('unload', destroy);
    if (registered) {
      window.gBrowser.removeTabsProgressListener(listener);
      window.gBrowser.tabContainer.removeEventListener('TabClose', tabClosed);
      window.gBrowser.tabContainer.removeEventListener('TabBrowserDiscarded', tabDiscarded);
      window.gBrowser.tabContainer.removeEventListener('TabAttrModified', tabChanged);
    }
    for (const tab of [...states.keys()]) remove(tab);
    delete window.__letterTabsLoading;
  }
  window.__letterTabsLoading = { destroy };
  window.addEventListener('unload', destroy, { once: true });
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
