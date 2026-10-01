// ==UserScript==
// @name           Letter Tabs Scroll Progress
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsScroll?.destroy();
  const id = `LetterTabsScroll:${Date.now()}:${Math.random()}`;
  let manager, source, disposed = false;
  function contentScript(channel) {
    // The frame script runs in the page process; no page URLs or text are sent.
    if (content !== content.top) return;
    let timer = null, scroller = null, last = -1;
    function report() {
      timer = null;
      const doc = content.document;
      const root = doc.scrollingElement;
      const element = scroller?.isConnected ? scroller : root;
      if (!element) return;
      const range = element.scrollHeight - element.clientHeight;
      const percent = range > 1 ? Math.round(Math.max(0, Math.min(1, element.scrollTop / range)) * 1000) / 10 : 0;
      if (percent !== last) {
        last = percent;
        sendAsyncMessage(channel, { percent });
      }
    }
    function schedule(event) {
      const target = event?.target;
      if (target?.ownerDocument === content.document && target.clientHeight > 0 &&
          target.scrollHeight > target.clientHeight + 1) scroller = target;
      else if (target === content.document) scroller = null;
      if (timer === null) timer = content.setTimeout(report, 40);
    }
    function reset(event) {
      if (event?.target && event.target !== content.document) return;
      if (timer !== null) content.clearTimeout(timer);
      timer = null;
      scroller = null;
      last = -1;
      sendAsyncMessage(channel, { percent: 0 });
    }
    function restore(event) { if (event?.target && event.target !== content.document) return; scroller = null; last = -1; schedule(); }
    function stop() {
      reset();
      removeEventListener('scroll', schedule, true);
      removeEventListener('resize', schedule, true);
      removeEventListener('pageshow', restore, true);
      removeEventListener('pagehide', reset, true);
      removeMessageListener(`${channel}:stop`, stop);
    }
    addEventListener('scroll', schedule, true);
    addEventListener('resize', schedule, true);
    addEventListener('pageshow', restore, true);
    addEventListener('pagehide', reset, true);
    addMessageListener(`${channel}:stop`, stop);
    schedule();
  }
  const idleTimers = new Map();
  function receive(message) {
    if (disposed) return;
    const tab = window.gBrowser?.getTabForBrowser(message.target);
    if (!tab) return;
    const value = Number(message.data?.percent);
    if (!Number.isFinite(value)) return;
    window.clearTimeout(idleTimers.get(tab));
    idleTimers.delete(tab);
    if (tab.hasAttribute('zen-essential') || value <= 0) {
      tab.removeAttribute('letter-tabs-scroll');
      tab.style.removeProperty('--letter-tabs-scroll');
      return;
    }
    tab.setAttribute('letter-tabs-scroll', 'true');
    tab.style.setProperty('--letter-tabs-scroll', `${Math.min(100, value)}%`);
    idleTimers.set(tab, window.setTimeout(() => {
      tab.removeAttribute('letter-tabs-scroll');
      idleTimers.delete(tab);
    }, 1500));
  }
  function initialize() {
    if (disposed) return;
    manager = window.messageManager;
    if (!manager?.loadFrameScript) {
      console.warn('[Letter Tabs] Scroll progress: frame messaging unavailable.');
      return;
    }
    source = 'data:application/javascript;charset=utf-8,' + encodeURIComponent(`(${contentScript})(${JSON.stringify(id)});`);
    manager.addMessageListener(id, receive);
    manager.loadFrameScript(source, true);
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('load', initialize);
    window.removeEventListener('unload', destroy);
    if (source) {
      manager.removeDelayedFrameScript(source);
      manager.broadcastAsyncMessage(`${id}:stop`);
      manager.removeMessageListener(id, receive);
    }
    for (const timer of idleTimers.values()) window.clearTimeout(timer);
    idleTimers.clear();
    for (const tab of window.gBrowser?.tabs || []) {
      tab.removeAttribute('letter-tabs-scroll');
      tab.style.removeProperty('--letter-tabs-scroll');
    }
    delete window.__letterTabsScroll;
  }
  window.__letterTabsScroll = { destroy };
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  window.addEventListener('unload', destroy, { once: true });
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
