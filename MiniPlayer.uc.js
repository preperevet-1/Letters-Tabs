// ==UserScript==
// @name Letter Tabs Mini Player
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
// Artwork/card layout adapted from Zia (MIT; see ZIA-LICENSE.txt).
(() => {
  window.__letterTabsMiniPlayer?.destroy();
  const decorated=new Map();
  function update(){
    for(const [element,parts] of decorated)if(!element.isConnected){parts.art.remove();parts.bars.remove();decorated.delete(element);}
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
      card.element.querySelector('.zen-media-playpause-button')?.append(bars);
      parts={art,bars,url:''};decorated.set(card.element,parts);
    }
    try{
      const images=card.controller?.getMetadata()?.artwork || [];
      const url=images.find(a=>a.src)?.src || card.browser?.mIconURL || '';
      if(url!==parts.url){parts.url=url;parts.art.hidden=!url;if(url)parts.art.src=url;else parts.art.removeAttribute('src');}
    }catch(_){ /* Metadata can disappear while the source tab closes. */ }
  }
  const timer=setInterval(update,750);update();
  function destroy(){clearInterval(timer);for(const {art,bars} of decorated.values()){art.remove();bars.remove();}decorated.clear();window.removeEventListener('unload',destroy);delete window.__letterTabsMiniPlayer;}
  window.__letterTabsMiniPlayer={destroy};window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
})();
