// ==UserScript==
// @name           Letter Tabs
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  const PREF = 'zen.letter-tabs.overrides';
  const ROOT = 'zen-letter-tabs-active';
  const ATTR = 'zen-letter-tabs-letter';
  window.__zenLetterTabs?.destroy();
  let destroyed = false, frame = 0;
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const first = text => [...segmenter.segment(text.trim())][0]?.segment || '';
  function read() {
    try {
      const value = JSON.parse(Services.prefs.getStringPref(PREF, '{}'));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  function identity(tab) {
    const raw = tab._zenPinnedInitialState?.entry?.url || tab.linkedBrowser?.currentURI?.spec || '';
    let site, key;
    try {
      const url = new URL(raw);
      site = url.hostname.replace(/^www\./i, '');
      key = url.origin === 'null' ? raw : url.origin;
    } catch { key = raw; }
    return {
      key: `${tab.getAttribute('usercontextid') || '0'}:${key}`,
      automatic: first(site || tab.label || tab.getAttribute('label') || '?').toLocaleUpperCase(),
    };
  }
  function refresh() {
    frame = 0;
    if (destroyed) return;
    const saved = read();
    for (const tab of document.querySelectorAll('.tabbrowser-tab')) {
      if (!tab.hasAttribute('zen-essential')) {
        tab.removeAttribute(ATTR);
        continue;
      }
      const { key, automatic } = identity(tab);
      const custom = Object.hasOwn(saved, key) && typeof saved[key] === 'string' ? first(saved[key]) : '';
      const letter = custom || automatic;
      if (tab.getAttribute(ATTR) !== letter) tab.setAttribute(ATTR, letter);
    }
  }
  function schedule() {
    if (!destroyed && !frame) frame = requestAnimationFrame(refresh);
  }
  function edit(event) {
    if (event.button !== 0) return;
    const tab = event.target.closest?.('.tabbrowser-tab[zen-essential]');
    if (!tab || event.target.closest('.tab-icon-overlay, .tab-close-button, .tab-audio-button')) return;
    // Capture before Zen's native double-click reset/close handler.
    event.preventDefault();
    event.stopImmediatePropagation();
    const { key, automatic } = identity(tab);
    const saved = read();
    const input = { value: Object.hasOwn(saved, key) ? saved[key] : automatic };
    const accepted = Services.prompt.prompt(window, 'Літера Essentials',
      'Введи літеру або символ. Порожнє поле — автоматична літера сайту.', input, null, {});
    if (!accepted) return;
    const next = read();
    const letter = first(input.value);
    if (letter) next[key] = letter;
    else delete next[key];
    Services.prefs.setStringPref(PREF, JSON.stringify(next));
    refresh();
  }
  const observer = new MutationObserver(schedule);
  const prefObserver = { observe: schedule };
  const events = ['TabOpen', 'TabClose', 'TabAttrModified', 'SSTabRestored'];
  function start() {
    if (destroyed) return;
    document.documentElement.setAttribute(ROOT, 'true');
    observer.observe(document.getElementById('navigator-toolbox') || document.documentElement, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['zen-essential', 'label', 'usercontextid'],
    });
    events.forEach(name => window.addEventListener(name, schedule));
    window.addEventListener('dblclick', edit, true);
    Services.prefs.addObserver(PREF, prefObserver);
    refresh();
  }
  function destroy() {
    destroyed = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('load', start);
    window.removeEventListener('unload', destroy);
    window.removeEventListener('dblclick', edit, true);
    events.forEach(name => window.removeEventListener(name, schedule));
    try { Services.prefs.removeObserver(PREF, prefObserver); } catch {}
    document.documentElement.removeAttribute(ROOT);
    document.querySelectorAll(`[${ATTR}]`).forEach(tab => tab.removeAttribute(ATTR));
    delete window.__zenLetterTabs;
  }
  window.__zenLetterTabs = { destroy };
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  window.addEventListener('unload', destroy, { once: true });
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
