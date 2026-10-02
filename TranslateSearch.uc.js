// ==UserScript==
// @name Letter Tabs Inline Translation
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsTranslate?.destroy();
  let disposed = false, cleanup = () => {};
  function initialize() {
    if (disposed) return;
    const bar=document.getElementById('urlbar'), input=document.getElementById('urlbar-input');
    if(!bar || !input)return;
    const make=(tag,cls,text)=>{const n=document.createElementNS('http://www.w3.org/1999/xhtml',tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
    const button=(cls,text,label)=>{const n=make('button',cls,text);n.type='button';if(label)n.setAttribute('aria-label',label);return n;};
    const panel=make('section','lt-translate');panel.id='lt-translator-panel';panel.hidden=true;panel.setAttribute('aria-label','Translator');panel.setAttribute('role','dialog');
    const body=make('div','lt-translate-body'),left=make('div','lt-translate-left'),right=make('div','lt-translate-right');
    const leftHead=make('div','lt-translate-header'),rightHead=make('div','lt-translate-header');
    const back=button('lt-translate-back','←','Back to search');back.title='Back to search (Escape)';
    const from=make('select'),to=make('select');from.setAttribute('aria-label','Source language');to.setAttribute('aria-label','Target language');
    const languages={en:'English',uk:'Ukrainian',pl:'Polish',de:'German',fr:'French',es:'Spanish',it:'Italian',ja:'Japanese',ko:'Korean',zh:'Chinese',pt:'Portuguese'};
    for(const [code,name] of Object.entries(languages))for(const select of [from,to]){const option=make('option','',name);option.value=code;select.append(option);}
    const auto=make('option','','Detect language');auto.value='auto';from.prepend(auto);from.value='auto';to.value='en';
    const menus=[];
    function languageMenu(select,label){
      const wrap=make('div','lt-translate-language'),trigger=button('lt-translate-language-trigger','',label);
      const menu=make('div','lt-translate-language-menu');menu.hidden=true;menu.setAttribute('role','listbox');menu.setAttribute('aria-label',label);
      trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
      const entries=[];
      function close(){menu.hidden=true;trigger.setAttribute('aria-expanded','false');}
      function refresh(){trigger.textContent=select.value==='auto'?auto.textContent:languages[select.value];for(const [code,item] of entries)item.setAttribute('aria-selected',String(code===select.value));}
      function open(){for(const other of menus)other.close();refresh();menu.hidden=false;trigger.setAttribute('aria-expanded','true');}
      for(const option of select.children){
        const item=button('lt-translate-language-option',option.textContent);item.setAttribute('role','option');
        item.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change'));refresh();close();trigger.focus();});
        entries.push([option.value,item]);menu.append(item);
      }
      trigger.addEventListener('click',()=>menu.hidden?open():close());
      wrap.addEventListener('mouseenter',open);wrap.addEventListener('mouseleave',close);
      wrap.addEventListener('focusout',event=>{if(!wrap.contains(event.relatedTarget))close();});
      wrap.addEventListener('keydown',event=>{
        if(event.key==='Escape' && !menu.hidden){stop(event);close();trigger.focus();}
        if(event.key==='ArrowDown' || event.key==='ArrowUp'){
          stop(event);if(menu.hidden)open();const index=entries.findIndex(([,item])=>item===event.target);
          entries[(index+(event.key==='ArrowDown'?1:entries.length-1)+entries.length)%entries.length][1].focus();
        }
      });
      wrap.append(trigger,menu);menus.push({close,refresh,menu,wrap});refresh();return wrap;
    }
    const fromMenu=languageMenu(from,'Source language'),toMenu=languageMenu(to,'Target language');
    const source=make('textarea','lt-translate-source');source.placeholder='Enter text to translate…';source.setAttribute('aria-label','Text to translate');source.spellcheck=false;
    const result=make('div','lt-translate-result');result.setAttribute('aria-live','polite');result.setAttribute('role','status');result.tabIndex=0;
    const swap=button('lt-translate-swap','','Swap languages');swap.title='Swap languages';
    const swapIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [key,value] of Object.entries({viewBox:'0 0 24 24',width:'24',height:'24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))swapIcon.setAttribute(key,value);
    const arrows=document.createElementNS('http://www.w3.org/2000/svg','path');arrows.setAttribute('d','M5 7h14m-4-4 4 4-4 4M19 17H5m4-4-4 4 4 4');swapIcon.append(arrows);swap.append(swapIcon);
    leftHead.append(back,fromMenu);rightHead.append(toMenu);left.append(leftHead,source);right.append(rightHead,result);body.append(left,right,swap);
    const footer=make('div','lt-translate-footer');const translate=make('span','lt-translate-submit','Translate');
    const status=make('span','lt-translate-status');status.setAttribute('aria-live','polite');
    const copy=button('lt-translate-copy','Copy Translation');copy.title='Copy Translation (⌘/Ctrl+C)';copy.disabled=true;
    footer.append(translate,status,copy);panel.append(body,footer);document.documentElement.append(panel);
    let active=false,revision=0,controller=null,translated='',detected='',focusFrame=0, debounce=0, motion=null, returning=false, composing=false;
    const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
    function invalidate(){status.removeAttribute('data-copied');clearTimeout(debounce);result.removeAttribute('aria-busy');revision++;controller?.abort();controller=null;translated='';copy.disabled=true;}
    function edited(){invalidate();detected='';auto.textContent='Detect language';result.textContent='';status.textContent='';for(const menu of menus)menu.refresh();schedule();}
    function schedule(){clearTimeout(debounce);if(active && !composing && source.value.trim())debounce=setTimeout(run,500);}
    function hide(){for(const menu of menus)menu.close();motion?.cancel();returning=false;invalidate();active=false;cancelAnimationFrame(focusFrame);panel.hidden=true;panel.removeAttribute('data-returning');bar.removeAttribute('letter-tabs-translate-handoff');bar.removeAttribute('letter-tabs-translate');}
    async function returnToSearch(){
      if(returning)return;returning=true;invalidate();
      cancelAnimationFrame(focusFrame);
      panel.setAttribute('data-returning','true');
      bar.setAttribute('letter-tabs-translate-handoff','true');
      // Restore native search underneath the still-visible overlay. Its own
      // entrance animation is suppressed throughout this search session.
      try {
      bar.setAttribute('letter-tabs-translate-return','true');
      bar.removeAttribute('letter-tabs-translate');
      bar.getBoundingClientRect();
      if(searchWasNewTab && window.gZenUIManager?.handleNewTab){
        window.gZenUIManager.handleNewTab(false,false,'tab',true);
      }
      window.gURLBar.search('');
      document.getElementById('Browser:OpenLocation')?.doCommand?.();
      window.gURLBar.userTypedValue='';input.value='';
      bar.setAttribute('letter-tabs-search-empty','true');input.focus();
        if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && panel.animate){
          motion?.cancel();
          const rect=panel.getBoundingClientRect();
          // Transform the surface on the compositor instead of relaying out
          // the entire editor on every width/height frame.
          motion=panel.animate([
            {transform:'translate(0,0) scale(1,1)'},
            {transform:`translate(${anchor.left-rect.left}px,${anchor.top-rect.top}px) scale(${anchor.width/rect.width},${anchor.height/rect.height})`}
          ],{duration:180,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
          let deadline;
          try {
            await Promise.race([motion.finished,new Promise(resolve=>{deadline=setTimeout(resolve,240);})]);
          }finally{clearTimeout(deadline);}

        }
      }catch(error){
        // A cancelled or unsupported animation must never strand the overlay.
        if(!disposed)console.warn('Letter Tabs translator return:',error);
      }finally{
        if(!disposed && active && returning)hide();
      }
    }
    function focusSource(){cancelAnimationFrame(focusFrame);focusFrame=requestAnimationFrame(()=>{if(active){source.focus();source.setSelectionRange(source.value.length,source.value.length);}});}
    let anchor = null, searchWasNewTab=false;
    function positionPanel(){
      if(!anchor)return;
      const width=Math.max(280,Math.min(Math.max(800,anchor.width*1.25),window.innerWidth-32));
      panel.style.width=width+'px';
      panel.style.left=Math.max(16,Math.min(anchor.left+(anchor.width-width)/2,window.innerWidth-width-16))+'px';
      panel.style.top=Math.max(16,Math.min(anchor.top,window.innerHeight-panel.getBoundingClientRect().height-16))+'px';
    }
    function activate(text){
      bar.removeAttribute('letter-tabs-translate-return');
      searchWasNewTab=bar.hasAttribute('zen-newtab');
      const rect=bar.getBoundingClientRect();
      // The urlbar rect can include suggestions. Return to the input row only.
      const row=bar.querySelector?.('.urlbar-input-container')?.getBoundingClientRect();
      anchor={left:rect.left,top:rect.top,width:rect.width,height:row?.height || 48};
      const style=getComputedStyle(bar);
      for(const name of ['--lt-search-surface','--lt-search-border','--lt-search-shadow']){
        const value=style.getPropertyValue(name).trim();if(value)panel.style.setProperty(name,value);
      }
      active=true;source.value=text;edited();panel.hidden=false;bar.setAttribute('letter-tabs-translate','true');
      window.gURLBar.controller?.cancelQuery?.();window.gURLBar.view?.clearSelection?.();
      // Native search owns no copy of text typed in the translator editor.
      window.gURLBar.userTypedValue='';
      positionPanel();
      if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && panel.animate){
        motion?.cancel();motion=panel.animate([{width:anchor.width+'px',left:anchor.left+'px',height:anchor.height+'px'},
          {width:panel.style.width,left:panel.style.left,height:panel.getBoundingClientRect().height+'px'}],{duration:300,easing:'cubic-bezier(.22,1,.36,1)'});
      }
      focusSource();
    }
    function onInput(event){
      if(event.target===source){event.stopImmediatePropagation();if(event.isComposing || composing){invalidate();return;}edited();return;}
      if(event.target!==input || event.isComposing || bar.hasAttribute('letter-tabs-bang'))return;
      // A trailing space activates /tr; Enter also activates a bare command.
      if (/^\/(?:tr|translate)$/i.test(input.value)) {
        event.stopImmediatePropagation();window.gURLBar.controller?.cancelQuery?.();window.gURLBar.view?.clearSelection?.();return;
      }
      const match=/^\/(?:tr|translate)\s+([\s\S]*)$/i.exec(input.value);
      if(match){event.stopImmediatePropagation();activate(match[1]);}
    }
    async function run(){
      const text=source.value.trim();if(!active || returning || composing || !text)return;
      invalidate();const version=revision;controller=new AbortController();
      result.textContent='';result.setAttribute('aria-busy','true');status.textContent='Translating…';
      try{
        const value=await translateText(text,from.value,to.value,controller.signal);
        if(disposed || version!==revision || !active)return;
        translated=value.text;detected=value.source;result.textContent=value.text;copy.disabled=false;
        auto.textContent=languages[detected]?`${languages[detected]} (Detected)`:'Detect language';status.textContent='';for(const menu of menus)menu.refresh();
      }catch(error){if(disposed || version!==revision)return;status.textContent=error.message || 'Unable to translate. Please try again.';}
      finally{if(version===revision){result.removeAttribute('aria-busy');}}
    }
    function copyResult(){if(!translated)return;try{Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper).copyString(translated);status.textContent='Copied';status.setAttribute('data-copied','true');}catch(_){status.textContent='Unable to copy translation';}}
    function key(event){
      if(event.isComposing)return;
      if(!active){
        if(event.target===input && event.key==='Enter' && !bar.hasAttribute('letter-tabs-bang')){
          const match=/^\/(?:tr|translate)(?:\s+([\s\S]*))?$/i.exec(input.value);
          if(match){stop(event);activate(match[1]||'');}
        }
        return;
      }
      if(!panel.contains(event.target) && event.target!==input)return;
      if(event.key==='Escape'){stop(event);const open=menus.find(item=>!item.menu.hidden);if(open){open.close();open.wrap.children[0].focus();}else returnToSearch();}
      else if(event.key.toLowerCase()==='c' && (event.metaKey||event.ctrlKey) && translated){
        const selected=(source.selectionStart!==source.selectionEnd && event.target===source) || window.getSelection?.()?.toString();
        if(!selected){stop(event);copyResult();}
      }
      // Let text editing, newlines, selection and Tab navigation stay native.
    }
    function languageChanged(){invalidate();result.textContent='';status.textContent='';result.removeAttribute('aria-busy');for(const menu of menus)menu.refresh();schedule();}
    from.addEventListener('change',()=>{detected='';auto.textContent='Detect language';languageChanged();});to.addEventListener('change',languageChanged);
    swap.addEventListener('click',()=>{
      const old=from.value==='auto'?detected:from.value;
      if(!languages[old]){status.textContent='Choose a source language or translate first';return;}
      const value=translated;from.value=to.value;to.value=old;if(value)source.value=value;edited();focusSource();
    });
    back.addEventListener('click',returnToSearch);copy.addEventListener('click',copyResult);
    source.addEventListener('compositionstart',()=>{composing=true;invalidate();});
    source.addEventListener('compositionend',()=>{composing=false;edited();});
    window.addEventListener('input',onInput,true);window.addEventListener('keydown',key,true);input.addEventListener('compositionend',onInput);
    function outside(event){if(active && !panel.contains(event.target)){hide();}}
    function searchBlur(){if(!returning)bar.removeAttribute('letter-tabs-translate-return');}
    input.addEventListener('blur',searchBlur);
    window.addEventListener('mousedown',outside,true);
    window.addEventListener('resize',positionPanel);
    window.addEventListener('TabSelect',hide);
    cleanup=()=>{hide();input.removeEventListener('blur',searchBlur);bar.removeAttribute('letter-tabs-translate-return');window.removeEventListener('mousedown',outside,true);window.removeEventListener('resize',positionPanel);window.removeEventListener('input',onInput,true);window.removeEventListener('keydown',key,true);input.removeEventListener('compositionend',onInput);window.removeEventListener('TabSelect',hide);panel.remove();};
  }
  // Provider integration is configured separately from the search interface.
  async function translateText(text,source,target,signal) {
    if(source===target)return {text,source};
    if([...text].length>1500)throw new Error('Please use up to 1500 characters per translation');
    const url=new URL('https://translate.googleapis.com/translate_a/single');
    for(const [key,value] of Object.entries({client:'gtx',sl:source,tl:target,dt:'t',dj:'1',q:text}))url.searchParams.set(key,value);
    const timeout=new AbortController();
    const abort=()=>timeout.abort();signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted)timeout.abort();
    const timer=setTimeout(abort,15000);
    try {
      const response=await fetch(url.href,{signal:timeout.signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
      if(!response.ok)throw new Error(response.status===429?'Too many requests. Please try again later.':'Translation is unavailable. Please try again.');
      const data=await response.json();
      const value=data.sentences?.map(item=>typeof item.trans==='string'?item.trans:'').join('');
      if(!value)throw new Error('No translation returned. Please try again.');
      return {text:value,source:typeof data.src==='string'?data.src:source};
    } catch(error){
      if(error.name==='AbortError' && !signal.aborted)throw new Error('Request timed out. Please try again.');
      throw error;
    } finally {clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  function destroy(){disposed=true;window.removeEventListener('load',initialize);window.removeEventListener('unload',destroy);cleanup();delete window.__letterTabsTranslate;}
  window.__letterTabsTranslate={destroy};
  window.addEventListener('unload',destroy,{once:true});
  if(typeof window.addUnloadListener==='function')window.addUnloadListener(destroy);
  if(document.readyState==='complete')initialize();else window.addEventListener('load',initialize,{once:true});
})();
