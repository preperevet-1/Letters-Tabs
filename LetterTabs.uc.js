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
  // Current Firefox/Zen moved SessionStore to moz-src. Retain older builds.
  let sessionStore = null;
  for (const uri of [
    'moz-src:///browser/components/sessionstore/SessionStore.sys.mjs',
    'resource:///modules/sessionstore/SessionStore.sys.mjs',
  ]) {
    try {
      sessionStore = ChromeUtils.importESModule(uri).SessionStore;
      if (sessionStore) break;
    } catch { /* Try the next supported module location. */ }
  }
  let storageWarningShown = false;
  function storage(method, ...args) {
    try {
      return sessionStore?.[method]?.(...args) ?? '';
    } catch (error) {
      // A tab may not yet be registered with SessionStore during restoration.
      if (!storageWarningShown) {
        console.warn('[Letter Tabs] Session storage unavailable; keeping titles in memory.', error);
        storageWarningShown = true;
      }
      return '';
    }
  }
  const TITLES_PREF = 'zen.letter-tabs.fixed-titles';
  function readTitles() {
    try {
      const value = JSON.parse(Services.prefs.getStringPref(TITLES_PREF, '{}'));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  function titleId(tab) {
    // Zen persists this id as zenSyncId across navigation, discard and restore.
    return tab.getAttribute('id') || '';
  }
  function saveTitle(tab, title) {
    titles.set(tab, title);
    const id = titleId(tab);
    // SessionStore also preserves names for tabs without a persistent Zen id.
    storage('setCustomTabValue', tab, TITLE_KEY, title || '\u0001');
    if (id && !window.PrivateBrowsingUtils?.isWindowPrivate?.(window)) {
      const saved = readTitles();
      saved[id] = title; // Empty string explicitly restores dynamic titles.
      Services.prefs.setStringPref(TITLES_PREF, JSON.stringify(saved));
    }
  }
  function fixedTitle(tab) {
    if (titles.has(tab)) return titles.get(tab);
    const saved = readTitles();
    const id = titleId(tab);
    const stored = storage('getCustomTabValue', tab, TITLE_KEY);
    let title;
    if (id && Object.hasOwn(saved, id)) title = saved[id];
    else if (stored) title = stored === '\u0001' ? '' : stored;
    else title = tab.zenStaticLabel ||
      (tab.pinned && tab._zenPinnedInitialState?.entry?.title) || '';
    if (typeof title !== 'string') return '';
    // Don't cache an unknown empty title before session restoration finishes.
    if (title || stored || (id && Object.hasOwn(saved, id))) {
      titles.set(tab, title);
      if (title && !stored && !(id && Object.hasOwn(saved, id))) saveTitle(tab, title);
    }
    return title;
  }
  function keepTitle(tab) {
    const title = fixedTitle(tab);
    if (!title) return;
    tab.zenStaticLabel = title;
    // Directly update the label: Zen's _setTabLabel can reject changes for
    // unloaded/background tabs and can be overwritten by window sync.
    if (tab.getAttribute('label') !== title) tab.setAttribute('label', title);
    tab._fullLabel = title;
  }
  function protectTitleUpdates() {
    for (const name of ['setTabTitle', '_setTabLabel']) {
      patch(window.gBrowser, name, original => function (tab, ...args) {
        const title = tab && fixedTitle(tab);
        if (title) tab.zenStaticLabel = title;
        const result = original.call(this, tab, ...args);
        if (tab) keepTitle(tab);
        return result;
      });
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
      // Preserve explicit removal; closing a loaded pin unloads and resets it.
      const safe = behavior === 'close' ? 'close' : 'reset-unload-switch';
      return original.call(this, event, tab, { ...options, behavior: safe });
    });
  }
  function closePinnedCommand(event) {
    if (event.target.id !== 'cmd_close' || !window.gBrowser.selectedTab?.pinned) return;
    // Zen registered a bound handler before mods loaded; route this command
    // through the updated method too. Ordinary tab closing remains native.
    event.preventDefault();
    event.stopImmediatePropagation();
    const selected = window.gBrowser.selectedTabs?.length
      ? window.gBrowser.selectedTabs : window.gBrowser.selectedTab;
    window.gZenPinnedTabManager.onCloseTabShortcut(event, selected, {
      behavior: 'reset-unload-switch',
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
      // Transient Glance child tabs must keep their native title/lifecycle.
      if (tab.hasAttribute('zen-glance-tab')) continue;
      try { keepTitle(tab); } catch (error) { console.warn('[Letter Tabs] Could not restore tab title.', error); }
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
      attributeFilter: ['zen-essential', 'label', 'usercontextid', 'zen-pinned-changed', 'had-zen-pinned-changed', 'id'],
    });
    events.forEach(name => window.addEventListener(name, schedule));
    window.addEventListener('dblclick', edit, true);
    window.addEventListener('keydown', captureRename, true);
    window.addEventListener('command', closePinnedCommand, true);
    disablePinReset();
    protectTitleUpdates();
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
    window.removeEventListener('command', closePinnedCommand, true);
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
