// ==UserScript==
// @name           Letter Tabs Site Shortcuts
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsBangs?.destroy();
  const providers = {
    gpt: { name: 'ChatGPT', home: 'https://chatgpt.com/', path: '/', param: 'q' },
    per: { name: 'Perplexity', home: 'https://www.perplexity.ai/', path: '/search', param: 'q' },
    yt: { name: 'YouTube', home: 'https://www.youtube.com/', path: '/results', param: 'search_query' },
    gen: { name: 'Genius', home: 'https://genius.com/', path: '/search', param: 'q' },
    pin: { name: 'Pinterest', home: 'https://www.pinterest.com/', path: '/search/pins/', param: 'q' },
  };
  let cleanup = () => {}, disposed = false;
  function initialize() {
    if (disposed) return;
    const bar = document.getElementById('urlbar');
    const input = document.getElementById('urlbar-input');
    const box = input?.closest('.urlbar-input-box');
    if (!bar || !input || !box || !window.gURLBar) return;
    let active = null;
    const originalPlaceholder = input.getAttribute('placeholder');
    const make = name => document.createElementNS('http://www.w3.org/1999/xhtml', name);
    const badge = make('button');
    badge.className = 'letter-tabs-bang-chip';
    badge.type = 'button';
    badge.hidden = true;
    const icon = make('img');
    icon.alt = '';
    icon.width = icon.height = 14;
    const label = make('span');
    badge.append(icon, label);
    box.before(badge);
    const suggestions = make('div');
    suggestions.className = 'letter-tabs-bang-suggestions';
    suggestions.hidden = true;
    suggestions.id = 'letter-tabs-bang-suggestions';
    suggestions.setAttribute('role', 'listbox');
    bar.append(suggestions);
    let matches = [], selected = 0;
    function hideSuggestions() {
      suggestions.hidden = true;
      bar.removeAttribute('letter-tabs-bang-suggesting');
      input.removeAttribute('aria-activedescendant');
      matches = [];
    }
    function highlight() {
      [...suggestions.children].forEach((row, index) => {
        row.setAttribute('aria-selected', String(index === selected));
      });
      input.setAttribute('aria-activedescendant', `letter-tabs-bang-option-${matches[selected]}`);
    }
    function showSuggestions(prefix) {
      matches = Object.keys(providers).filter(key => key.startsWith(prefix.toLowerCase()));
      if (!matches.length) { hideSuggestions(); return false; }
      selected = 0;
      suggestions.replaceChildren();
      for (const key of matches) {
        const row = make('div'), image = make('img'), name = make('span'), command = make('span');
        row.id = `letter-tabs-bang-option-${key}`;
        row.setAttribute('role', 'option');
        image.src = `page-icon:${providers[key].home}`;
        image.alt = '';
        name.textContent = providers[key].name;
        command.textContent = `!${key}`;
        command.className = 'letter-tabs-bang-command';
        row.append(image, name, command);
        row.addEventListener('mousedown', event => event.preventDefault());
        row.addEventListener('click', () => { activate(key, ''); input.focus(); });
        suggestions.append(row);
      }
      suggestions.hidden = false;
      bar.setAttribute('letter-tabs-bang-suggesting', 'true');
      highlight();
      cancelResults();
      return true;
    }
    function pinnedTarget(provider) {
      const browser = window.gBrowser;
      if (!browser) return null;
      const container = browser.selectedTab?.getAttribute('usercontextid') || '0';
      const workspace = window.gZenWorkspaces?.activeWorkspace;
      const host = new URL(provider.home).hostname.replace(/^www\./, '');
      const candidates = [...browser.tabs].filter(tab => {
        if (!tab.pinned || tab.closing || tab.hasAttribute('zen-glance-tab')) return false;
        if ((tab.getAttribute('usercontextid') || '0') !== container) return false;
        const tabSpace = tab.getAttribute('zen-workspace-id');
        if (!tab.hasAttribute('zen-essential') && workspace && tabSpace && tabSpace !== workspace) return false;
        const address = tab._zenPinnedInitialState?.entry?.url || tab.linkedBrowser?.currentURI?.spec;
        try { return new URL(address).hostname.replace(/^www\./, '') === host; }
        catch { return false; }
      });
      return candidates.find(tab => tab === browser.selectedTab) || candidates[0] || null;
    }
    function setValue(value) {
      window.gURLBar.value = value;
      input.value = value;
      window.gURLBar.userTypedValue = value;
      input.setSelectionRange(value.length, value.length);
      bar.toggleAttribute('letter-tabs-search-empty', !value.trim());
    }
    function cancelResults() {
      window.gURLBar.controller?.cancelQuery();
      const view = window.gURLBar.view;
      if (view) {
        // selectedRowIndex rewrites the input from the previous native query
        // and throws when the results are closed. Preserve the typed query.
        view.clearSelection();
        if (view.oneOffSearchButtons) view.oneOffSearchButtons.selectedButton = null;
      }
    }
    function clearMode() {
      active = null;
      hideSuggestions();
      badge.hidden = true;
      bar.removeAttribute('letter-tabs-bang');
      icon.removeAttribute('src');
      if (originalPlaceholder === null) input.removeAttribute('placeholder');
      else input.setAttribute('placeholder', originalPlaceholder);
    }
    function activate(key, query) {
      hideSuggestions();
      active = key;
      const provider = providers[key];
      window.gURLBar.searchMode = null;
      badge.hidden = false;
      badge.title = `Exit ${provider.name} search`;
      badge.setAttribute('aria-label', `Exit ${provider.name} search`);
      label.textContent = provider.name;
      icon.hidden = false;
      // Firefox's local favicon service; no query is sent to the site while typing.
      icon.src = `page-icon:${provider.home}`;
      bar.setAttribute('letter-tabs-bang', key);
      input.setAttribute('placeholder', `Search ${provider.name}`);
      setValue(query);
      cancelResults();
    }
    icon.addEventListener('error', () => { icon.hidden = true; });
    function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
    function onInput(event) {
      if (event.target !== input) return;
      if (event.isComposing) {
        if (active) { event.stopImmediatePropagation(); cancelResults(); }
        return;
      }
      if (!active && /^![a-z]*$/i.test(input.value) && !providers[input.value.slice(1).toLowerCase()]) {
        if (showSuggestions(input.value.slice(1))) { event.stopImmediatePropagation(); return; }
      }
      hideSuggestions();
      const match = /^!(gpt|per|yt|gen|pin)(?:\s+(.*))?$/is.exec(input.value);
      if (match) {
        event.stopImmediatePropagation();
        activate(match[1].toLowerCase(), match[2] || '');
      } else if (active) {
        event.stopImmediatePropagation();
        window.gURLBar.userTypedValue = input.value;
        bar.toggleAttribute('letter-tabs-search-empty', !input.value.trim());
        cancelResults();
      }
    }
    function onKey(event) {
      if (event.target !== input || event.isComposing) return;
      if (!suggestions.hidden) {
        if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
          stop(event);
          if (event.key === 'Escape') hideSuggestions();
          else if (event.key === 'Enter' || event.key === 'Tab') activate(matches[selected], '');
          else {
            selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
            highlight();
          }
          return;
        }
      }
      if (!active) return;
      if (event.key === 'Escape' || (event.key === 'Backspace' && !input.value)) {
        stop(event);
        clearMode();
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Tab'].includes(event.key)) {
        if (event.key !== 'Tab') stop(event);
        return;
      }
      if (event.key !== 'Enter') return;
      stop(event);
      const query = input.value.trim();
      if (!query) return;
      const provider = providers[active];
      const url = new URL(provider.path, provider.home);
      url.searchParams.set(provider.param, query);
      const target = pinnedTarget(provider);
      cancelResults();
      clearMode();
      if (target) {
        window.gURLBar.view.close();
        window.gBrowser.selectedTab = target;
        window.gBrowser.loadURI(Services.io.newURI(url.href), {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
        target.linkedBrowser.focus();
        return;
      }
      setValue(url.href);
      window.gURLBar.handleCommand(event);
    }
    badge.addEventListener('mousedown', event => event.preventDefault());
    badge.addEventListener('click', () => { clearMode(); input.focus(); });
    const observer = new MutationObserver(() => {
      if ((active || !suggestions.hidden) && !bar.hasAttribute('focused') && !bar.hasAttribute('breakout-extend')) clearMode();
    });
    observer.observe(bar, { attributes: true, attributeFilter: ['focused', 'breakout-extend'] });
    window.addEventListener('input', onInput, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('TabSelect', clearMode);
    cleanup = () => {
      observer.disconnect();
      window.removeEventListener('input', onInput, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('TabSelect', clearMode);
      clearMode();
      badge.remove();
      suggestions.remove();
    };
  }
  function destroy() {
    disposed = true;
    window.removeEventListener('load', initialize);
    window.removeEventListener('unload', destroy);
    cleanup();
    delete window.__letterTabsBangs;
  }
  window.__letterTabsBangs = { destroy };
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  window.addEventListener('unload', destroy, { once: true });
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
