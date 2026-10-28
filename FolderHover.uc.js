// ==UserScript==
// @name Letter Tabs Folder Hover
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
// Adapted interaction from Zia src/js/27-hover-cards.js (MIT; ZIA-LICENSE.txt).
(() => {
  window.__letterTabsFolderHover?.destroy();
  const make=(tag,cls,text)=>{const n=document.createElementNS('http://www.w3.org/1999/xhtml',tag);n.className=cls;if(text)n.textContent=text;return n;};
  const card=make('section','lt-folder-hover-card');card.id='lt-folder-hover-card';card.hidden=true;
  document.documentElement.append(card);
  let folder=null,showTimer=0,hideTimer=0,closeTimer=0;
  // Participate in Zen's native compact-mode open-popup observer. Each menu
  // owns its marker, so switching menus cannot release another menu's hold.
  const compactHold=document.createElementNS('http://www.w3.org/1999/xhtml','span');
  compactHold.hidden=true;
  document.getElementById('navigator-toolbox').append(compactHold);

  function hide(){
    clearTimeout(showTimer);clearTimeout(hideTimer);folder=null;
    if(card.hidden || card.hasAttribute('data-closing'))return;
    card.setAttribute('data-closing','true');
    closeTimer=setTimeout(()=>{card.hidden=true;compactHold.removeAttribute('open');card.removeAttribute('data-closing');},window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:110);
  }
  function later(){clearTimeout(showTimer);clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!card.matches(':hover')&&!card.contains(document.activeElement))hide();},300);}
  function position(){
    const label=folder?.querySelector(':scope > .tab-group-label-container');if(!label)return hide();
    const r=label.getBoundingClientRect(),side=document.getElementById('navigator-toolbox').getBoundingClientRect();
    const right=document.documentElement.getAttribute('zen-right-side')==='true';
    card.style.left=Math.max(8,Math.min(right?side.left-card.offsetWidth-8:side.right+8,innerWidth-card.offsetWidth-8))+'px';
    card.style.top=Math.max(8,Math.min(r.top+(r.height-card.offsetHeight)/2,innerHeight-card.offsetHeight-8))+'px';
  }
  function fill(){
    if(!folder?.isConnected)return hide();
    const scroll=card.scrollTop;card.replaceChildren();
    for(const tab of Array.from(folder.tabs || folder.querySelectorAll('.tabbrowser-tab')).filter(t=>!t.closing&&!t.hasAttribute('zen-empty-tab'))){
      const row=make('div','lt-folder-row');row.toggleAttribute('selected',tab===gBrowser.selectedTab);
      const pick=make('button','lt-folder-pick');pick.type='button';
      const icon=make('img','lt-folder-icon');icon.alt='';icon.src=gBrowser.getIcon(tab)||'chrome://global/skin/icons/defaultFavicon.svg';
      icon.addEventListener('error',()=>{icon.src='chrome://global/skin/icons/defaultFavicon.svg';},{once:true});
      pick.append(icon,make('span','lt-folder-label',tab.label||'New Tab'));
      pick.addEventListener('click',()=>{gBrowser.selectedTab=tab;hide();});
      const close=make('button','lt-folder-close','×');close.type='button';close.title='Close tab';close.setAttribute('aria-label','Close '+(tab.label||'tab'));
      close.addEventListener('click',()=>{gBrowser.removeTab(tab,{animate:true});fill();position();});row.append(pick,close);card.append(row);
    }
    if(!card.children.length)card.append(make('div','lt-folder-empty','No tabs'));
    card.scrollTop=scroll;
  }
  function enter(e){
    const label=e.target.closest?.('.tab-group-label-container'),next=label?.parentElement;
    if(!next?.matches('zen-folder')||!next.hasAttribute('collapsed')||next.hasAttribute('split-view-group'))return;
    clearTimeout(hideTimer);if(next===folder)return;clearTimeout(showTimer);
    const switching=!card.hidden;folder=next;
    const show=()=>{if(folder!==next||!next.isConnected)return;window.__letterTabsHoverActions?.hide();clearTimeout(closeTimer);card.removeAttribute('data-closing');fill();compactHold.setAttribute('open','true');card.hidden=false;position();};
    if(switching)show();else showTimer=setTimeout(show,800);
  }
  function leave(e){const label=e.target.closest?.('.tab-group-label-container');if(!label)return;if(label.contains(e.relatedTarget)||card.contains(e.relatedTarget))return;later();}
  function suppress(e){if(e.target.id==='zen-folder-tabs-popup'){e.preventDefault();e.stopImmediatePropagation();}}
  function key(e){if(e.key==='Escape')hide();}
  function changed(){if(folder && !card.hidden){fill();position();}}
  window.addEventListener('mouseover',enter,true);window.addEventListener('mouseout',leave,true);window.addEventListener('popupshowing',suppress,true);
  window.addEventListener('keydown',key,true);window.addEventListener('dragstart',hide,true);window.addEventListener('resize',hide);window.addEventListener('deactivate',hide);
  window.addEventListener('TabClose',changed);window.addEventListener('TabAttrModified',changed);
  card.addEventListener('mouseenter',()=>clearTimeout(hideTimer));card.addEventListener('mouseleave',later);
  function destroy(){hide();clearTimeout(closeTimer);card.remove();compactHold.remove();window.removeEventListener('mouseover',enter,true);window.removeEventListener('mouseout',leave,true);window.removeEventListener('popupshowing',suppress,true);window.removeEventListener('keydown',key,true);window.removeEventListener('dragstart',hide,true);window.removeEventListener('resize',hide);window.removeEventListener('deactivate',hide);window.removeEventListener('TabClose',changed);window.removeEventListener('TabAttrModified',changed);window.removeEventListener('unload',destroy);delete window.__letterTabsFolderHover;}
  window.__letterTabsFolderHover={hide,destroy};window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
})();
