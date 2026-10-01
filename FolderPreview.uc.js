// ==UserScript==
// @name Letter Tabs Folder Preview
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsFolders?.destroy();
  let disposed = false, cleanup = () => {};
  function initialize() {
    if (disposed) return;
    const tabs = document.getElementById('tabbrowser-tabs');
    const popupSet = document.getElementById('mainPopupSet');
    if (!tabs || !popupSet) return;
    const panel = document.createXULElement('panel');
    panel.id = 'letter-tabs-folder-preview';
    panel.setAttribute('type', 'arrow');
    panel.setAttribute('noautofocus', 'true');
    panel.setAttribute('consumeoutsideclicks', 'never');
    popupSet.append(panel);
    let pending = null, closing = null, folder = null;
    const make = tag => document.createElementNS('http://www.w3.org/1999/xhtml', tag);
    function cancelClose() { window.clearTimeout(closing); }
    function hide() {
      window.clearTimeout(pending);
      cancelClose();
      panel.hidePopup();
      folder = null;
    }
    function leave() {
      window.clearTimeout(pending);
      cancelClose();
      closing = window.setTimeout(hide, 220);
    }
    function show(target, anchor) {
      if (!target.isConnected || !target.hasAttribute('collapsed')) return;
      panel.replaceChildren();
      folder = target;
      const header = make('div');
      header.className = 'lt-folder-preview-title';
      header.textContent = target.label || target.querySelector('.tab-group-label')?.textContent || 'Folder';
      panel.append(header);
      const list = make('div');
      list.className = 'lt-folder-preview-list';
      const entries = [...target.querySelectorAll('.tabbrowser-tab')].filter(tab => !tab.closing && !tab.hasAttribute('zen-glance-tab') && !tab.hasAttribute('zen-empty-tab'));
      if (!entries.length) {
        const empty = make('div');empty.className = 'lt-folder-preview-empty';empty.textContent = 'No tabs';list.append(empty);
      }
      for (const tab of entries) {
        const row = make('button');
        row.type = 'button';
        row.textContent = tab.label || tab.getAttribute('label') || 'Untitled';
        row.title = row.textContent;
        row.toggleAttribute('data-selected', tab === window.gBrowser.selectedTab);
        row.addEventListener('click', () => {
          if (tab.isConnected && !tab.closing) window.gBrowser.selectedTab = tab;
          hide();
        });
        list.append(row);
      }
      panel.append(list);
      panel.openPopup(anchor, 'end_before', 8, 0, false, false);
    }
    function over(event) {
      const anchor = event.target.closest?.('.tab-group-label-container');
      const target = anchor?.parentElement;
      if (target?.localName !== 'zen-folder' || !target.hasAttribute('collapsed') || tabs.hasAttribute('movingtab')) return;
      cancelClose();
      if (folder === target || anchor.contains(event.relatedTarget)) return;
      window.clearTimeout(pending);
      pending = window.setTimeout(() => show(target, anchor), 350);
    }
    function out(event) {
      const anchor = event.target.closest?.('.tab-group-label-container');
      if (anchor && !anchor.contains(event.relatedTarget)) leave();
    }
    tabs.addEventListener('mouseover', over);
    tabs.addEventListener('mouseout', out);
    tabs.addEventListener('dragstart', hide);
    tabs.addEventListener('scroll', hide, true);
    panel.addEventListener('mouseenter', cancelClose);
    panel.addEventListener('mouseleave', leave);
    window.addEventListener('blur', hide);
    cleanup = () => {
      hide();
      tabs.removeEventListener('mouseover', over);
      tabs.removeEventListener('mouseout', out);
      tabs.removeEventListener('dragstart', hide);
      tabs.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
      panel.remove();
    };
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('load', initialize);
    window.removeEventListener('unload', destroy);
    cleanup();
    delete window.__letterTabsFolders;
  }
  window.__letterTabsFolders = { destroy };
  window.addEventListener('unload', destroy, { once: true });
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
