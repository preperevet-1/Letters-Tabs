// ==UserScript==
// @name Letter Tabs Hover Actions
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsHoverActions?.destroy();
  let disposed=false, cleanup=()=>{}, retry=0;
  function initialize(){
    if(disposed)return;
    if(!window.gBrowser?.tabContainer){retry=setTimeout(initialize,100);return;}
    const ns='http://www.w3.org/1999/xhtml';
    const make=(tag,cls,text)=>{const el=document.createElementNS(ns,tag);el.className=cls;if(text)el.textContent=text;return el;};
    const card=make('section','lt-tab-hover-card');card.id='lt-tab-hover-card';card.hidden=true;card.setAttribute('aria-label','Tab actions');
    const title=make('div','lt-tab-hover-title'),domain=make('div','lt-tab-hover-domain'),actions=make('div','lt-tab-hover-buttons');
    card.append(title,domain,actions);
    const popup=make('div','lt-hover-shell');popup.id='lt-tab-hover-popup';popup.hidden=true;
    popup.append(card);document.documentElement.append(popup);
    let tab=null,showTimer=0,hideTimer=0;
    const nativePreviews=new Set(['tabbrowser-tab-tooltip','tab-preview-panel']);
    function suppressTooltip(event){if(nativePreviews.has(event.target.id)){event.preventDefault();event.stopImmediatePropagation();}}
    window.addEventListener('popupshowing',suppressTooltip,true);
    for(const id of nativePreviews)document.getElementById(id)?.hidePopup?.();
    const buttons={};
    const icons={pin:'M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6M12 15v6',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',split:'M4 4h16v16H4zM12 4v16',copy:'M9 9h11v12H9zM15 9V3H4v12h5'};
    const solidIcons={
      pin:'M8 2h8l-1 7 4 4v3h-6v6h-2v-6H5v-3l4-4-1-7Z',
      heart:icons.heart,
      split:'M3 3h18v18H3V3Zm8 2v14h2V5h-2Z',
      copy:'M5 2h14v20l-7-5-7 5V2Z'
    };
    function setPressed(name,active){
      const button=buttons[name],path=button.querySelector('path');
      button.setAttribute('aria-pressed',String(active));
      path.setAttribute('d',active?solidIcons[name]:icons[name]);
      path.setAttribute('fill-rule','evenodd');
      path.style.setProperty('fill',active?'currentColor':'none','important');
      path.style.setProperty('stroke',active?'none':'currentColor','important');
    }
    function valid(){return tab?.isConnected && !tab.closing;}
    function refresh(){if(!valid()){hide();return;}title.textContent=tab.label || 'Untitled';try{domain.textContent=new URL(tab.linkedBrowser.currentURI.spec).hostname || tab.linkedBrowser.currentURI.spec;}catch(_){domain.textContent='';}
      const essential=tab.hasAttribute('zen-essential');
      setPressed('pin',Boolean(tab.pinned && !essential));buttons.pin.title=tab.pinned?'Unpin tab':'Pin tab';
      setPressed('heart',essential);buttons.heart.title=essential?'Remove from Essentials':'Add to Essentials';
      setPressed('split',Boolean(tab.splitView || tab.closest?.('[split-view-group]')));

    }
    function hide(){clearTimeout(showTimer);clearTimeout(hideTimer);card.hidden=true;tab=null;popup.hidden=true;}
    function deferHide(){clearTimeout(showTimer);clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!card.contains(document.activeElement))hide();},180);}
    function position(){
      if(!valid() || card.hidden)return;
      // Explicit screen coordinates avoid retaining the first popup anchor.
      const r=tab.getBoundingClientRect(),c=card.getBoundingClientRect();
      const width=c.width || 170,height=c.height || 110;
      // Essentials form a horizontal row: a side popup crosses adjacent tabs.
      // Put it directly below its own tile so the pointer has a clear route.
      const essential=tab.hasAttribute('zen-essential');
      const x=Math.max(8,Math.min(essential?r.left:r.right+10,window.innerWidth-width-8));
      const y=Math.max(8,Math.min(essential?r.bottom+6:r.top+(r.height-height)/2,window.innerHeight-height-8));
      popup.hidden=false;
      popup.style.left=x+'px';popup.style.top=y+'px';
    }
    const tabOf=node=>node?.closest?.('.tabbrowser-tab');
    function enter(event){
      const target=(event.composedPath?.() || [event.target]).map(tabOf).find(Boolean);
      if(!target || target.closing || target.hidden)return;
      window.__letterTabsFolderHover?.hide();
      clearTimeout(hideTimer);
      if(target===tab)return;
      clearTimeout(showTimer);
      const switching=!card.hidden;
      tab=target;
      const show=()=>{if(!valid())return;refresh();card.hidden=false;position();};
      if(switching){card.setAttribute('data-switching','true');show();}
      else {card.removeAttribute('data-switching');showTimer=setTimeout(show,600);}
    }
    function leave(event){
      const origin=tabOf(event.target);if(!origin)return;
      const related=event.relatedTarget;
      if(tabOf(related)===tab || card.contains(related) || popup.contains(related))return;
      // Anonymous XUL children may retarget mouseout to the window. Ignore
      // that boundary if the pointer is still geometrically inside the tab.
      const r=tab?.getBoundingClientRect();
      if(r && Number.isFinite(event.clientX) && event.clientX>=r.left && event.clientX<=r.right && event.clientY>=r.top && event.clientY<=r.bottom)return;
      deferHide();
    }
    const handlers={
      pin(target){if(target.hasAttribute('zen-essential')){window.gZenPinnedTabManager.removeEssentials(target,false);return;}target.pinned?gBrowser.unpinTab(target):gBrowser.pinTab(target);},
      heart(target){const manager=window.gZenPinnedTabManager;target.hasAttribute('zen-essential')?manager.removeEssentials(target):manager.addToEssentials(target);},
      split(target){gBrowser.selectedTab=target;window.gZenViewSplitter.createEmptySplit();},
      copy(target){const helper=Components.classes['@mozilla.org/widget/clipboardhelper;1'].getService(Components.interfaces.nsIClipboardHelper);helper.copyString(target.linkedBrowser.currentURI.spec);}
    };
    for(const [name,label] of [['pin','Pin'],['heart','Essential'],['split','Split View'],['copy','Copy Link']]){
      const button=make('button','lt-tab-hover-action');button.type='button';button.title=label;button.setAttribute('aria-label',label);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',icons[name]);svg.append(path);button.append(svg);actions.append(button);buttons[name]=button;
      button.addEventListener('click',async()=>{if(!valid())return;const target=tab;hide();try{await handlers[name](target);}catch(error){console.error('Letter Tabs tab action:',name,error);}});
    }
    function keep(){clearTimeout(hideTimer);}
    function key(event){if(event.key==='Escape' && !card.hidden){hide();}}
    function close(event){if(event.target===tab)hide();}
    const container=window;
    container.addEventListener('mouseover',enter,true);container.addEventListener('mouseout',leave,true);container.addEventListener('dragstart',hide,true);container.addEventListener('TabClose',close);
    card.addEventListener('mouseenter',keep);card.addEventListener('mouseleave',deferHide);card.addEventListener('focusin',keep);card.addEventListener('focusout',deferHide);
    window.addEventListener('keydown',key,true);window.addEventListener('deactivate',hide);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);function popupHidden(event){if(event.target===popup)hide();}
    popup.addEventListener('popuphidden',popupHidden);
    cleanup=()=>{hide();container.removeEventListener('mouseover',enter,true);container.removeEventListener('mouseout',leave,true);container.removeEventListener('dragstart',hide,true);container.removeEventListener('TabClose',close);window.removeEventListener('keydown',key,true);window.removeEventListener('deactivate',hide);window.removeEventListener('resize',hide);window.removeEventListener('scroll',hide,true);window.removeEventListener('popupshowing',suppressTooltip,true);popup.removeEventListener('popuphidden',popupHidden);popup.remove();};
    cleanup.hide=hide;
  }
  function destroy(){disposed=true;clearTimeout(retry);window.removeEventListener('load',initialize);window.removeEventListener('unload',destroy);cleanup();delete window.__letterTabsHoverActions;}
  window.__letterTabsHoverActions={destroy,hide:()=>cleanup.hide?.()};window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
  if(document.readyState==='complete')initialize();else window.addEventListener('load',initialize,{once:true});
})();
