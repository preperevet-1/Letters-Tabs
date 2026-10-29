// ==UserScript==
// @name Letter Tabs Mini Player
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
// Artwork/card layout adapted from Zia (MIT; see ZIA-LICENSE.txt).
(() => {
  window.__letterTabsMiniPlayer?.destroy();
  const decorated=new Map();
  const tabMeters=new Map();
  function syncTabMeters(){
    const wanted=new Set();
    for(const tab of window.gBrowser?.tabs || []) {
      if(!(tab.hasAttribute('soundplaying') || tab.hasAttribute('muted')))continue;
      const content=tab.querySelector('.tab-content');
      if(!content)continue;
      wanted.add(tab);
      let button=tabMeters.get(tab);
      if(!button){
        button=document.createElementNS('http://www.w3.org/1999/xhtml','button');
        button.type='button';button.className='lt-tab-meter-button';
        const bars=document.createElementNS(button.namespaceURI,'span');
        bars.className='lt-tab-equalizer';bars.setAttribute('aria-hidden','true');
        for(let i=0;i<4;i++)bars.append(document.createElementNS(bars.namespaceURI,'i'));
        button.append(bars);
        button.addEventListener('mousedown',event=>event.stopPropagation());
        button.addEventListener('click',event=>{
          event.preventDefault();event.stopPropagation();
          if(tab.multiselected)window.gBrowser.toggleMuteAudioOnMultiSelectedTabs(tab);
          else tab.toggleMuteAudio();
        });
        content.prepend(button);tab.setAttribute('lt-has-meter','');tabMeters.set(tab,button);
      }
      button.setAttribute('aria-label',tab.hasAttribute('muted')?'Unmute tab':'Mute tab');
      button.title=button.getAttribute('aria-label');
    }
    for(const [tab,button] of tabMeters)if(!wanted.has(tab)){button.remove();tab.removeAttribute('lt-has-meter');tabMeters.delete(tab);}
  }
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
    syncTabMeters();
    if(Date.now()-lastRecovery>2000){lastRecovery=Date.now();try{recoverPlayback();}catch(error){console.debug('Letter Tabs media recovery',error);}}
    for(const [element,parts] of decorated)if(!element.isConnected){parts.stopTitle();element.removeEventListener('mouseenter',parts.startTitle);element.removeEventListener('mouseleave',parts.stopTitle);element.removeEventListener('mousedown',parts.onPress,true);element.removeEventListener('click',parts.onClick,true);parts.favicon.remove();parts.art.remove();parts.bars.remove();parts.title.remove();decorated.delete(element);}
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
      art.addEventListener('load',()=>{art.hidden=false;card.focusButton.setAttribute('lt-has-artwork','');parts?.cover.setAttribute('lt-has-artwork','');});
      art.addEventListener('error',()=>{art.hidden=true;card.focusButton.removeAttribute('lt-has-artwork');parts?.cover.removeAttribute('lt-has-artwork');});
      card.focusButton.append(art);
      const favicon=document.createElementNS(art.namespaceURI,'img');
      favicon.className='lt-media-favicon';favicon.alt='';favicon.hidden=true;
      favicon.addEventListener('error',()=>{favicon.hidden=true;});
      card.focusButton.append(favicon);card.focusButton.setAttribute('lt-custom-media-icon','');
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
      const cover=make('lt-player-cover');
      cover.append(art,favicon);header.append(cover);
      move('.zen-media-focus-button',footer);
      move('.zen-media-info-vbox',header);move('.zen-media-mute-button',header);
      for(const selector of ['.zen-sidebar-pip-toggle','.zen-media-previoustrack-button','.zen-media-playpause-button','.zen-media-nexttrack-button','.zen-media-pip-button','.zen-media-close-button'])move(selector,footer);
      main.prepend(header);main.append(footer);
      parts={art,favicon,cover,bars,title,text,header,footer,moved,card,url:'',failed:new Set(),marquee:null};
      const isCardSurface=target=>!target.closest('button,toolbarbutton,input,.lt-player-footer,.zen-media-progress-hbox') || !!target.closest('.zen-media-focus-button');
      parts.onPress=event=>{if(event.button===0 && isCardSurface(event.target))event.stopImmediatePropagation();};
      parts.onClick=event=>{
        if(event.button!==0 || !isCardSurface(event.target))return;
        event.preventDefault();event.stopImmediatePropagation();
        const current=parts.card;
        if(current.onFocus)current.onFocus();
        else {const tab=window.gBrowser.getTabForBrowser(current.browser);if(tab)window.gBrowser.selectedTab=tab;}
      };
      element.addEventListener('mousedown',parts.onPress,true);
      element.addEventListener('click',parts.onClick,true);
      parts.stopTitle=()=>{parts.marquee?.cancel();parts.marquee=null;};
      parts.startTitle=()=>{
        parts.stopTitle();
        const distance=Math.max(0,text.scrollWidth-title.clientWidth);
        if(distance<=2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        parts.marquee=text.animate([
          {transform:'translateX(0)',offset:0},
          {transform:'translateX(0)',offset:.15},
          {transform:`translateX(${-distance}px)`,offset:.7},
          {transform:`translateX(${-distance}px)`,offset:.85},
          {transform:'translateX(0)',offset:1}
        ],{duration:Math.max(6000,distance/25*1000+2400),iterations:Infinity,easing:'ease-in-out'});
      };
      card.element.addEventListener('mouseenter',parts.startTitle);
      card.element.addEventListener('mouseleave',parts.stopTitle);
      art.addEventListener('error',()=>{parts.failed.add(art.src);parts.url='';});decorated.set(card.element,parts);
    }
    if(card.controller)parts.card=card;
    // Zenslop can add the eye asynchronously, after the card was decorated.
    const eye=card.element.querySelector('.zen-sidebar-pip-toggle');
    if(eye && eye.parentElement!==parts.footer)parts.footer.prepend(eye);
    try{
      const sourceTab=card.browser && window.gBrowser.getTabForBrowser(card.browser);
      const icon=card.browser?.mIconURL || sourceTab?.getAttribute('image') || '';
      const faviconURL=/defaultFavicon|blank\.svg|globe\.svg/.test(icon)?'':icon;
      if(parts.favicon.getAttribute('src')!==(faviconURL || null)){
        parts.favicon.hidden=!faviconURL;
        if(faviconURL)parts.favicon.src=faviconURL;else parts.favicon.removeAttribute('src');
      }
      const images=(card.controller?.getMetadata()?.artwork || []).filter(a=>a.src && !/^(?:page-icon|chrome|resource):|favicon|globe|defaulticon/i.test(a.src) && a.src!==icon);
      let fallback='';
      try{const u=new URL(card.browser.currentURI.spec);if(/(^|\.)youtube\.com$/.test(u.hostname)&&u.searchParams.get('v'))fallback='https://i.ytimg.com/vi/'+encodeURIComponent(u.searchParams.get('v'))+'/hqdefault.jpg';}catch(_){}
      const url=[...images.map(a=>a.src),fallback].find(u=>u&&!parts.failed.has(u)) || '';
      const label=card.titleEl.textContent || '';
      if(parts.text.textContent!==label){parts.stopTitle();parts.text.textContent=label;parts.failed.clear();if(element.matches(':hover'))parts.startTitle();}
      const distance=Math.max(0,parts.text.getBoundingClientRect().width-parts.title.clientWidth);
      parts.title.toggleAttribute('overflowing',distance>2);
      parts.title.style.setProperty('--lt-title-travel',-distance+'px');
      parts.title.style.setProperty('--lt-title-duration',Math.max(7,distance/22+4)+'s');
      if(card.controller && url!==parts.url){parts.url=url;parts.art.hidden=true;card.focusButton.removeAttribute('lt-has-artwork');parts?.cover.removeAttribute('lt-has-artwork');if(url)parts.art.src=url;else parts.art.removeAttribute('src');}
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
  function destroy(){for(const [tab,button] of tabMeters){button.remove();tab.removeAttribute('lt-has-meter');}tabMeters.clear();clearTimeout(scheduled);observer.disconnect();clearInterval(timer);for(const [element,{art,favicon,bars,title,header,footer,moved,card,startTitle,stopTitle,onPress,onClick}] of decorated){stopTitle();element.removeEventListener('mousedown',onPress,true);element.removeEventListener('click',onClick,true);favicon.remove();card.focusButton.removeAttribute('lt-custom-media-icon');element.removeEventListener('mouseenter',startTitle);element.removeEventListener('mouseleave',stopTitle);card.focusButton.removeAttribute('lt-has-artwork');for(const [node,marker] of moved)marker.replaceWith(node);art.remove();bars.remove();title.remove();header.remove();footer.remove();}decorated.clear();for(const el of document.querySelectorAll('[lt-current-media]'))el.removeAttribute('lt-current-media');window.removeEventListener('unload',destroy);delete window.__letterTabsMiniPlayer;}
  window.__letterTabsMiniPlayer={destroy};window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
})();
