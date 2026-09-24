// ==UserScript==
// @name           Letter Tabs
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  const PREF = 'zen.letter-tabs.overrides';
  const ROOT = 'zen-letter-tabs-active';
  const ATTR = 'zen-letter-tabs-letter';
  window.__zenLetterTabs?.destroy();
  let destroyed = false, frame = 0, editor = null;
  const restorers = [];
  const titles = new WeakMap();
  const TITLE_KEY = 'letter-tabs-fixed-title';
  const { SessionStore } = ChromeUtils.importESModule('resource:///modules/sessionstore/SessionStore.sys.mjs');
  function saveTitle(tab, title) {
    titles.set(tab, title);
    if (title) SessionStore.setCustomTabValue(tab, TITLE_KEY, title);
    else SessionStore.deleteCustomTabValue(tab, TITLE_KEY);
  }
  function keepTitle(tab) {
    if (!titles.has(tab)) {
      const title = tab.zenStaticLabel || SessionStore.getCustomTabValue(tab, TITLE_KEY);
      if (title) saveTitle(tab, title);
    }
    const title = titles.get(tab);
    if (!title) return;
    tab.zenStaticLabel = title;
    if (tab.getAttribute('label') !== title) {
      window.gBrowser._setTabLabel(tab, title, { _zenChangeLabelFlag: true });
    }
  }
  function captureRename(event) {
    if (event.key !== 'Enter' || event.isComposing || event.target.id !== 'tab-label-input') return;
    const tab = event.target.closest('.tabbrowser-tab');
    if (!tab) return;
    const title = event.target.value.replace(/\s+/g, ' ').trim();
    // Run after the native rename handler, including its reset-to-default path.
    queueMicrotask(() => {
      if (destroyed) return;
      saveTitle(tab, title);
      if (title) keepTitle(tab);
      else { delete tab.zenStaticLabel; window.gBrowser.setTabTitle(tab); }
    });
  }
  function patch(object, name, replacement) {
    if (!object || typeof object[name] !== 'function') return;
    const original = object[name];
    const wrapped = replacement(original);
    object[name] = wrapped;
    restorers.push(() => { if (object[name] === wrapped) object[name] = original; });
  }
  function disablePinReset() {
    const manager = window.gZenPinnedTabManager;
    for (const name of ['_onTabResetPinButton', 'resetPinnedTab', 'pinHasChangedUrl']) {
      patch(manager, name, () => function () {});
    }
    patch(manager, 'onCloseTabShortcut', original => function (event, tab, options = {}) {
      const behavior = options.behavior ?? Services.prefs.getStringPref('zen.pinned-tab-manager.close-shortcut-behavior', 'switch');
      const safe = behavior.replace(/^reset-?/, '') || 'unload-switch';
      return original.call(this, event, tab, { ...options, behavior: safe });
    });
  }
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
      keepTitle(tab);
      tab.removeAttribute('zen-pinned-changed');
      tab.removeAttribute('had-zen-pinned-changed');
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
    if (event.button !== 0 || event.target.closest?.('.zen-letter-tabs-editor')) return;
    const tab = event.target.closest?.('.tabbrowser-tab[zen-essential]');
    if (!tab || event.target.closest('.tab-icon-overlay, .tab-close-button, .tab-audio-button')) return;
    // Capture before Zen's native double-click reset/close handler.
    event.preventDefault();
    event.stopImmediatePropagation();
    const { key, automatic } = identity(tab);
    const saved = read();
    editor?.finish(false);
    const input = document.createElementNS('http://www.w3.org/1999/xhtml', 'input');
    input.className = 'zen-letter-tabs-editor';
    input.setAttribute('aria-label', 'Літера Essentials');
    input.setAttribute('autocomplete', 'off');
    input.spellcheck = false;
    input.value = Object.hasOwn(saved, key) ? saved[key] : automatic;
    tab.setAttribute('zen-letter-tabs-editing', 'true');
    const finish = commit => {
      if (editor?.input !== input) return;
      editor = null;
      if (commit) {
        const next = read();
        const letter = first(input.value);
        if (letter) next[key] = letter;
        else delete next[key];
        Services.prefs.setStringPref(PREF, JSON.stringify(next));
      }
      input.remove();
      tab.removeAttribute('zen-letter-tabs-editing');
      refresh();
    };
    editor = { input, finish };
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        finish(e.key === 'Enter');
      }
    });
    for (const type of ['mousedown', 'mouseup', 'click', 'dblclick', 'pointerdown']) {
      input.addEventListener(type, e => e.stopPropagation());
    }
    input.addEventListener('blur', () => finish(true));
    tab.appendChild(input);
    input.focus();
    input.select();
  }

  const observer = new MutationObserver(schedule);
  const prefObserver = { observe: schedule };
  const events = ['TabOpen', 'TabClose', 'TabAttrModified', 'SSTabRestored'];
  function start() {
    if (destroyed) return;
    document.documentElement.setAttribute(ROOT, 'true');
    observer.observe(document.getElementById('navigator-toolbox') || document.documentElement, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['zen-essential', 'label', 'usercontextid', 'zen-pinned-changed', 'had-zen-pinned-changed'],
    });
    events.forEach(name => window.addEventListener(name, schedule));
    window.addEventListener('dblclick', edit, true);
    window.addEventListener('keydown', captureRename, true);
    disablePinReset();
    Services.prefs.addObserver(PREF, prefObserver);
    refresh();
  }
  function destroy() {
    editor?.finish(false);
    destroyed = true;
    restorers.reverse().forEach(restore => restore());
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('load', start);
    window.removeEventListener('unload', destroy);
    window.removeEventListener('dblclick', edit, true);
    window.removeEventListener('keydown', captureRename, true);
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
