// ==UserScript==
// @name Letter Tabs Hover Actions
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsHoverActions?.destroy();
  let disposed=false, cleanup=()=>{};
  function initialize(){
    if(disposed || !window.gBrowser)return;
    const ns='http://www.w3.org/1999/xhtml';
    const make=(tag,cls,text)=>{const el=document.createElementNS(ns,tag);el.className=cls;if(text)el.textContent=text;return el;};
    const card=make('section','lt-tab-hover-card');card.id='lt-tab-hover-card';card.hidden=true;card.setAttribute('aria-label','Tab actions');
    const title=make('div','lt-tab-hover-title'),domain=make('div','lt-tab-hover-domain'),actions=make('div','lt-tab-hover-buttons');
    card.append(title,domain,actions);document.documentElement.append(card);
    let tab=null,showTimer=0,hideTimer=0;
    const buttons={};
    const icons={pin:'M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6M12 15v6',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',split:'M4 4h16v16H4zM12 4v16',bookmark:'M6 3h12v18l-6-4-6 4z'};
    function valid(){return tab?.isConnected && !tab.closing;}
    function refresh(){if(!valid()){hide();return;}title.textContent=tab.label || 'Untitled';try{domain.textContent=new URL(tab.linkedBrowser.currentURI.spec).hostname || tab.linkedBrowser.currentURI.spec;}catch(_){domain.textContent='';}
      const essential=tab.hasAttribute('zen-essential');
      buttons.pin.setAttribute('aria-pressed',String(tab.pinned && !essential));buttons.pin.title=tab.pinned?'Unpin tab':'Pin tab';
      buttons.heart.setAttribute('aria-pressed',String(essential));buttons.heart.title=essential?'Remove from Essentials':'Add to Essentials';
    }
    function hide(){clearTimeout(showTimer);clearTimeout(hideTimer);card.hidden=true;tab=null;}
    function deferHide(){clearTimeout(showTimer);clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!card.contains(document.activeElement))hide();},180);}
    function position(){if(!valid() || card.hidden)return;const r=tab.getBoundingClientRect(),c=card.getBoundingClientRect();const right=r.right+10;card.style.left=Math.max(8,Math.min(right+c.width<=window.innerWidth?right:r.left-c.width-10,window.innerWidth-c.width-8))+'px';card.style.top=Math.max(8,Math.min(r.top,window.innerHeight-c.height-8))+'px';}
    function enter(event){const target=event.target.closest?.('.tabbrowser-tab');if(!target || target.closing || target.hidden)return;if(target===tab)return;hide();tab=target;showTimer=setTimeout(()=>{if(!valid())return;refresh();card.hidden=false;position();},420);}
    function leave(event){if(!event.target.closest?.('.tabbrowser-tab'))return;if(card.contains(event.relatedTarget) || tab?.contains(event.relatedTarget))return;deferHide();}
    const handlers={
      pin(target){if(target.hasAttribute('zen-essential')){window.gZenPinnedTabManager.removeEssentials(target,false);return;}target.pinned?gBrowser.unpinTab(target):gBrowser.pinTab(target);},
      heart(target){const manager=window.gZenPinnedTabManager;target.hasAttribute('zen-essential')?manager.removeEssentials(target):manager.addToEssentials(target);},
      split(target){gBrowser.selectedTab=target;window.gZenViewSplitter.createEmptySplit();},
      bookmark(target){return window.PlacesCommandHook.bookmarkLink(target.linkedBrowser.currentURI.spec,target.label);}
    };
    for(const [name,label] of [['pin','Pin'],['heart','Essential'],['split','Split View'],['bookmark','Bookmark']]){
      const button=make('button','lt-tab-hover-action');button.type='button';button.title=label;button.setAttribute('aria-label',label);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',icons[name]);svg.append(path);button.append(svg);actions.append(button);buttons[name]=button;
      button.addEventListener('click',async()=>{if(!valid())return;const target=tab;hide();try{await handlers[name](target);}catch(error){console.error('Letter Tabs tab action:',name,error);}});
    }
    function keep(){clearTimeout(hideTimer);}
    function key(event){if(event.key==='Escape' && !card.hidden){hide();}}
    function close(event){if(event.target===tab)hide();}
    const container=gBrowser.tabContainer;
    container.addEventListener('mouseover',enter);container.addEventListener('mouseout',leave);container.addEventListener('dragstart',hide,true);container.addEventListener('TabClose',close);
    card.addEventListener('mouseenter',keep);card.addEventListener('mouseleave',deferHide);card.addEventListener('focusin',keep);card.addEventListener('focusout',deferHide);
    window.addEventListener('keydown',key,true);window.addEventListener('blur',hide);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
    cleanup=()=>{hide();container.removeEventListener('mouseover',enter);container.removeEventListener('mouseout',leave);container.removeEventListener('dragstart',hide,true);container.removeEventListener('TabClose',close);window.removeEventListener('keydown',key,true);window.removeEventListener('blur',hide);window.removeEventListener('resize',hide);window.removeEventListener('scroll',hide,true);card.remove();};
  }
  function destroy(){disposed=true;window.removeEventListener('load',initialize);window.removeEventListener('unload',destroy);cleanup();delete window.__letterTabsHoverActions;}
  window.__letterTabsHoverActions={destroy};window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
  if(document.readyState==='complete')initialize();else window.addEventListener('load',initialize,{once:true});
})();
