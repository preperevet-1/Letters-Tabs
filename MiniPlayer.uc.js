// ==UserScript==
// @name Letter Tabs Mini Player
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
// Artwork/card layout adapted from Zia (MIT; see ZIA-LICENSE.txt).
(() => {
  window.__letterTabsMiniPlayer?.destroy();
  const decorated=new Map();
  function update(){
    for(const [element,parts] of decorated)if(!element.isConnected){parts.art.remove();parts.bars.remove();parts.title.remove();decorated.delete(element);}
    const card=window.gZenMediaController?.frontCard;
    if(!card?.element?.isConnected)return;
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
      for(const selector of ['.zen-sidebar-pip-toggle','.zen-media-previoustrack-button','.zen-media-playpause-button','.zen-media-nexttrack-button','.zen-media-pip-button'])move(selector,footer);
      const pip=document.createElementNS(bars.namespaceURI,'button');pip.className='lt-window-video-action';pip.type='button';pip.title='Picture-in-Picture';pip.setAttribute('aria-label','Picture-in-Picture');
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M3 3h18v18H3z M12 12h7v7h-7z');svg.append(path);pip.append(svg);
      pip.addEventListener('click',e=>{e.stopPropagation();card.onPip();});footer.append(pip);
      main.prepend(header);main.append(footer);
      parts={art,bars,title,text,header,footer,moved,url:'',failed:new Set()};
      art.addEventListener('error',()=>{parts.failed.add(art.src);parts.url='';});decorated.set(card.element,parts);
    }
    try{
      const images=card.controller?.getMetadata()?.artwork || [];
      let fallback='';
      try{const u=new URL(card.browser.currentURI.spec);if(/(^|\.)youtube\.com$/.test(u.hostname)&&u.searchParams.get('v'))fallback='https://i.ytimg.com/vi/'+encodeURIComponent(u.searchParams.get('v'))+'/hqdefault.jpg';}catch(_){}
      const url=[...images.map(a=>a.src),fallback,card.browser?.mIconURL].find(u=>u&&!parts.failed.has(u)) || '';
      const label=card.titleEl.textContent || '';
      if(parts.text.textContent!==label){parts.text.textContent=label;parts.failed.clear();}
      const distance=Math.max(0,parts.text.scrollWidth-parts.title.clientWidth);
      parts.title.toggleAttribute('overflowing',distance>2);
      parts.title.style.setProperty('--lt-title-travel',-distance+'px');
      parts.title.style.setProperty('--lt-title-duration',Math.max(7,distance/22+4)+'s');
      if(url!==parts.url){parts.url=url;parts.art.hidden=!url;if(url)parts.art.src=url;else parts.art.removeAttribute('src');}
    }catch(_){ /* Metadata can disappear while the source tab closes. */ }
  }
  const timer=setInterval(update,750);update();
  function destroy(){clearInterval(timer);for(const {art,bars,title,header,footer,moved} of decorated.values()){for(const [node,marker] of moved)marker.replaceWith(node);art.remove();bars.remove();title.remove();header.remove();footer.remove();}decorated.clear();window.removeEventListener('unload',destroy);delete window.__letterTabsMiniPlayer;}
  window.__letterTabsMiniPlayer={destroy};window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
})();
