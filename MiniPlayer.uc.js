// ==UserScript==
// @name Letter Tabs Mini Player
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
// Artwork/card layout adapted from Zia (MIT; see ZIA-LICENSE.txt).
(() => {
  window.__letterTabsMiniPlayer?.destroy();
  const decorated=new Map();
  let lastRecovery=0;
  function recoverPlayback(){
    const manager=window.gZenMediaController;
    if(!manager?.mediaControlBar)return;
    // Recheck only sustained playback; paused/closed cards are not resurrected.
    // Zen deduplicates this call by controller id and browser.
    for(const tab of window.gBrowser?.tabs || []) {
      const browser=tab.linkedBrowser;
      const controller=browser?.browsingContext?.mediaController;
      if(tab.closing || !tab.hasAttribute('soundplaying') || !controller?.isActive || !controller.isPlaying)continue;
      if(browser===window.gBrowser.selectedBrowser || controller.isBeingUsedInPIPModeOrFullscreen)continue;
      manager.onAudioPlaybackStarted(browser);
    }
    for(const [element,{card}] of decorated) {
      if(element.isConnected && !element.hasAttribute('zen-removing') && card.controller)
        card.refreshVisibility();
    }
  }
  function update(){
    if(Date.now()-lastRecovery>2000){lastRecovery=Date.now();try{recoverPlayback();}catch(error){console.debug('Letter Tabs media recovery',error);}}
    for(const [element,parts] of decorated)if(!element.isConnected){parts.art.remove();parts.bars.remove();parts.title.remove();decorated.delete(element);}
    const toolbar=document.getElementById('zen-media-controls-toolbar');
    const elements=[...document.querySelectorAll('#zen-media-controls-toolbar .zen-media-card')];
    const eligible=elements.filter(el=>!el.hidden && !el.hasAttribute('zen-hiding') && !el.hasAttribute('zen-removing'));
    const front=window.gZenMediaController?.frontCard;
    const current=eligible.includes(front?.element)?front.element:eligible.at(-1);
    // Mark every card before artwork/preview work: a stale controller must not
    // leave the whole toolbar without a selected card.
    for(const el of elements)el.toggleAttribute('lt-current-media',el===current);
    if(current && toolbar?.hidden)window.gZenMediaController?.showMediaControls?.();
    try{window.ZenPiPController?.followMediaBrowser?.(front?.element===current?front.browser:decorated.get(current)?.card?.browser);}catch(error){console.debug('Letter Tabs preview source unavailable',error);}
    for(const element of elements) {
      const card=front?.element===element?front:decorated.get(element)?.card || {
        element,focusButton:element.querySelector('.zen-media-focus-button'),titleEl:element.querySelector('.zen-media-title')
      };
      if(!card.focusButton || !card.titleEl)continue;
    let parts=decorated.get(card.element);
    if(!parts){
      const art=document.createElementNS('http://www.w3.org/1999/xhtml','img');
      art.className='lt-media-art';art.alt='';art.hidden=true;
      art.addEventListener('error',()=>{art.hidden=true;});
      card.focusButton.append(art);
      const bars=document.createElementNS('http://www.w3.org/1999/xhtml','span');
      bars.className='lt-media-equalizer';bars.setAttribute('aria-hidden','true');
      for(let i=0;i<4;i++)bars.append(document.createElementNS(bars.namespaceURI,'i'));
      card.element.querySelector('.zen-media-mute-button')?.append(bars);
      const title=document.createElementNS(bars.namespaceURI,'div');title.className='lt-media-title-clip';
      const text=document.createElementNS(bars.namespaceURI,'span');title.append(text);
      card.titleEl.before(title);
      const make=cls=>{const n=document.createElementNS(bars.namespaceURI,'div');n.className=cls;return n;};
      const header=make('lt-player-header'),footer=make('lt-player-footer');
      const main=card.element.querySelector('.zen-media-main-vbox');
      const moved=[];
      const move=(selector,parent)=>{const n=card.element.querySelector(selector);if(!n)return;const marker=document.createComment('lt-media-position');n.before(marker);moved.push([n,marker]);parent.append(n);};
      move('.zen-media-focus-button',header);move('.zen-media-info-vbox',header);move('.zen-media-mute-button',header);
      for(const selector of ['.zen-sidebar-pip-toggle','.zen-media-previoustrack-button','.zen-media-playpause-button','.zen-media-nexttrack-button','.zen-media-pip-button','.zen-media-close-button'])move(selector,footer);
      main.prepend(header);main.append(footer);
      parts={art,bars,title,text,header,footer,moved,card,url:'',failed:new Set()};
      art.addEventListener('error',()=>{parts.failed.add(art.src);parts.url='';});decorated.set(card.element,parts);
    }
    if(card.controller)parts.card=card;
    // Zenslop can add the eye asynchronously, after the card was decorated.
    const eye=card.element.querySelector('.zen-sidebar-pip-toggle');
    if(eye && eye.parentElement!==parts.footer)parts.footer.prepend(eye);
    try{
      const images=card.controller?.getMetadata()?.artwork || [];
      let fallback='';
      try{const u=new URL(card.browser.currentURI.spec);if(/(^|\.)youtube\.com$/.test(u.hostname)&&u.searchParams.get('v'))fallback='https://i.ytimg.com/vi/'+encodeURIComponent(u.searchParams.get('v'))+'/hqdefault.jpg';}catch(_){}
      const url=[...images.map(a=>a.src),fallback,card.browser?.mIconURL].find(u=>u&&!parts.failed.has(u)) || '';
      const label=card.titleEl.textContent || '';
      if(parts.text.textContent!==label){parts.text.textContent=label;parts.failed.clear();}
      const distance=Math.max(0,parts.text.getBoundingClientRect().width-parts.title.clientWidth);
      parts.title.toggleAttribute('overflowing',distance>2);
      parts.title.style.setProperty('--lt-title-travel',-distance+'px');
      parts.title.style.setProperty('--lt-title-duration',Math.max(7,distance/22+4)+'s');
      if(card.controller && url!==parts.url){parts.url=url;parts.art.hidden=!url;if(url)parts.art.src=url;else parts.art.removeAttribute('src');}
    }catch(_){ /* Metadata can disappear while the source tab closes. */ }
    }
  }
  function safeUpdate(){try{update();}catch(error){console.debug('Letter Tabs media update',error);}}
  let scheduled=0;
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.type==='attributes' || [...r.addedNodes].some(n=>n.matches?.('.zen-media-card')))) {
      clearTimeout(scheduled);scheduled=setTimeout(safeUpdate,0);
    }
  });
  const toolbar=document.getElementById('zen-media-controls-toolbar');
  if(toolbar)observer.observe(toolbar,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','zen-hiding','zen-removing']});
  const timer=setInterval(safeUpdate,250);safeUpdate();
  function destroy(){clearTimeout(scheduled);observer.disconnect();clearInterval(timer);for(const {art,bars,title,header,footer,moved} of decorated.values()){for(const [node,marker] of moved)marker.replaceWith(node);art.remove();bars.remove();title.remove();header.remove();footer.remove();}decorated.clear();for(const el of document.querySelectorAll('[lt-current-media]'))el.removeAttribute('lt-current-media');window.removeEventListener('unload',destroy);delete window.__letterTabsMiniPlayer;}
  window.__letterTabsMiniPlayer={destroy};window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
})();
