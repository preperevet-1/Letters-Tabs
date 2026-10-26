// ==UserScript==
// @name Letter Tabs Compact Tab Menu
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsCompactMenu?.destroy();
  const originals=new Map(), separators=new Set(), hiddenStates=new Map();
  const groups=[
    ['context_pinTab','context_unpinTab','context_pinSelectedTabs','context_unpinSelectedTabs','context_zen-add-essential','context_zen-remove-essential'],
    ['context_askChat','context_askChatSummarize','context_zenSplitTabs','context_moveTabToSplitView','context_separateSplitView','context_duplicateTab','context_duplicateTabs'],
    ['context_zenMoveToFolder','context_moveTabToNewGroup','context_moveSplitViewToNewGroup','context_moveTabToGroup','context_reopenInContainer'],
    [],
    ['context_zen-edit-tab-title','context_zen-edit-tab-icon','context_zen-edit-pinned-page'],
    ['context_closeTab']
  ];
  function restoreHidden(){
    for(const [node,value] of hiddenStates){
      if(value===null)node.removeAttribute('hidden');
      else node.setAttribute('hidden',value);
      node.removeAttribute('lt-menu-hidden');
    }
    hiddenStates.clear();
  }
  function hide(event){if(event.target.id==='tabContextMenu')restoreHidden();}
  function show(event){
    const menu=event.target;if(menu.id!=='tabContextMenu')return;
    for(const separator of separators)separator.remove();separators.clear();
    const children=[...menu.children];
    for(const node of children)if(!originals.has(node))originals.set(node,{parent:menu,index:originals.size});
    const current=groups.map(group=>[...group]);
    // Keep existing native copy-link and move-to-space commands, whose IDs
    // vary between Zen versions. Never create or rename a native command.
    for(const node of children){
      if(/copy.*(url|link)|(url|link).*copy/i.test(node.id))current[3].push(node.id);
      else if(/(move|change).*space|space.*(move|change)/i.test(node.id))current[2].push(node.id);
    }
    const allowed=new Set(current.flat());
    for(const node of children){
      if(!allowed.has(node.id)){
        // Native macOS menus use the XUL hidden attribute, not CSS display.
        if(!hiddenStates.has(node))hiddenStates.set(node,node.getAttribute('hidden'));
        node.setAttribute('hidden','true');
        node.setAttribute('lt-menu-hidden','true');
      }
    }
    let hasPrevious=false;
    for(const group of current){
      const nodes=group.map(id=>children.find(node=>node.id===id)).filter(Boolean);
      const visible=nodes.some(node=>!node.hidden && node.getAttribute('hidden')!=='true');
      if(visible && hasPrevious){const sep=document.createXULElement('menuseparator');sep.setAttribute('lt-compact-separator','true');menu.append(sep);separators.add(sep);}
      for(const node of nodes)menu.append(node);
      if(visible)hasPrevious=true;
    }
  }
  function destroy(){
    restoreHidden();window.removeEventListener('popuphidden',hide);window.removeEventListener('popupshowing',show);window.removeEventListener('unload',destroy);
    for(const separator of separators)separator.remove();
    for(const [node,{parent}] of originals){node.removeAttribute('lt-menu-hidden');if(node.parentNode===parent)parent.append(node);}
    delete window.__letterTabsCompactMenu;
  }
  window.addEventListener('popuphidden',hide);window.addEventListener('popupshowing',show);window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
  window.__letterTabsCompactMenu={destroy};
})();
