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
    const source=make('textarea','lt-translate-source');source.placeholder='Enter text to translate…';source.setAttribute('aria-label','Text to translate');source.spellcheck=false;
    const result=make('div','lt-translate-result');result.setAttribute('aria-live','polite');result.setAttribute('role','status');result.tabIndex=0;
    const count=make('span','lt-translate-count');
    const swap=button('lt-translate-swap','⇄','Swap languages');swap.title='Swap languages';
    leftHead.append(back,from);rightHead.append(to);left.append(leftHead,source,count);right.append(rightHead,result);body.append(left,right,swap);
    const footer=make('div','lt-translate-footer');const translate=button('lt-translate-submit','Translate');translate.title='Translate (Enter; Shift+Enter for a new line)';
    const status=make('span','lt-translate-status');status.setAttribute('aria-live','polite');
    const copy=button('lt-translate-copy','Copy Translation');copy.title='Copy Translation (⌘/Ctrl+Enter)';copy.disabled=true;
    footer.append(translate,status,copy);panel.append(body,footer);document.documentElement.append(panel);
    let active=false,revision=0,controller=null,translated='',detected='',focusFrame=0;
    const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
    function invalidate(){result.removeAttribute('aria-busy');revision++;controller?.abort();controller=null;translated='';copy.disabled=true;translate.disabled=false;}
    function countText(){const value=source.value.trim();count.textContent=`${value?value.split(/\s+/u).length:0} Words · ${[...source.value].length} Characters`;}
    function edited(){invalidate();detected='';auto.textContent='Detect language';result.textContent='';status.textContent='Enter to translate · Shift+Enter for a new line';countText();}
    function hide(){invalidate();active=false;cancelAnimationFrame(focusFrame);panel.hidden=true;bar.removeAttribute('letter-tabs-translate');}
    function returnToSearch(){hide();window.gURLBar.focus();window.gURLBar.value='';window.gURLBar.userTypedValue='';input.value='';bar.setAttribute('letter-tabs-search-empty','true');input.focus();}
    function focusSource(){cancelAnimationFrame(focusFrame);focusFrame=requestAnimationFrame(()=>{if(active){source.focus();source.setSelectionRange(source.value.length,source.value.length);}});}
    let anchor = null;
    function positionPanel(){
      if(!anchor)return;
      const width=Math.max(280,Math.min(anchor.width,window.innerWidth-32));
      panel.style.width=width+'px';
      panel.style.left=Math.max(16,Math.min(anchor.left,window.innerWidth-width-16))+'px';
      panel.style.top=Math.max(16,Math.min(anchor.top,window.innerHeight-panel.getBoundingClientRect().height-16))+'px';
    }
    function activate(text){
      const rect=bar.getBoundingClientRect();
      anchor={left:rect.left,top:rect.top,width:Math.max(560,rect.width)};
      const style=getComputedStyle(bar);
      for(const name of ['--lt-search-surface','--lt-search-border','--lt-search-shadow']){
        const value=style.getPropertyValue(name).trim();if(value)panel.style.setProperty(name,value);
      }
      active=true;source.value=text;edited();panel.hidden=false;bar.setAttribute('letter-tabs-translate','true');
      window.gURLBar.controller?.cancelQuery?.();window.gURLBar.view?.clearSelection?.();
      // Native search owns no copy of text typed in the translator editor.
      window.gURLBar.userTypedValue='';
      positionPanel();focusSource();
    }
    function onInput(event){
      if(event.target===source){event.stopImmediatePropagation();edited();return;}
      if(event.target!==input || event.isComposing || bar.hasAttribute('letter-tabs-bang'))return;
      // A trailing space activates /tr; Enter also activates a bare command.
      if (/^\/(?:tr|translate)$/i.test(input.value)) {
        event.stopImmediatePropagation();window.gURLBar.controller?.cancelQuery?.();window.gURLBar.view?.clearSelection?.();return;
      }
      const match=/^\/(?:tr|translate)\s+([\s\S]*)$/i.exec(input.value);
      if(match){event.stopImmediatePropagation();activate(match[1]);}
    }
    async function run(){
      const text=source.value.trim();if(!active || !text || translate.disabled)return;
      invalidate();const version=revision;controller=new AbortController();translate.disabled=true;
      result.textContent='';result.setAttribute('aria-busy','true');status.textContent='Translating…';
      try{
        const value=await translateText(text,from.value,to.value,controller.signal);
        if(disposed || version!==revision || !active)return;
        translated=value.text;detected=value.source;result.textContent=value.text;copy.disabled=false;
        auto.textContent=languages[detected]?`${languages[detected]} (Detected)`:'Detect language';status.textContent='';
      }catch(error){if(disposed || version!==revision)return;status.textContent=error.message || 'Unable to translate. Please try again.';}
      finally{if(version===revision){translate.disabled=false;result.removeAttribute('aria-busy');}}
    }
    function copyResult(){if(!translated)return;try{Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper).copyString(translated);status.textContent='Copied';}catch(_){status.textContent='Unable to copy translation';}}
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
      if(event.key==='Escape'){stop(event);returnToSearch();}
      else if(event.key==='Enter' && (event.metaKey||event.ctrlKey)){stop(event);copyResult();}
      else if(event.target===source && event.key==='Enter' && !event.shiftKey){stop(event);run();}
      // Let text editing, newlines, selection and Tab navigation stay native.
    }
    function languageChanged(){invalidate();result.textContent='';status.textContent='Enter to translate';result.removeAttribute('aria-busy');}
    from.addEventListener('change',()=>{detected='';auto.textContent='Detect language';languageChanged();});to.addEventListener('change',languageChanged);
    swap.addEventListener('click',()=>{
      const old=from.value==='auto'?detected:from.value;
      if(!languages[old]){status.textContent='Choose a source language or translate first';return;}
      const value=translated;from.value=to.value;to.value=old;if(value)source.value=value;edited();focusSource();
    });
    back.addEventListener('click',returnToSearch);translate.addEventListener('click',run);copy.addEventListener('click',copyResult);
    window.addEventListener('input',onInput,true);window.addEventListener('keydown',key,true);input.addEventListener('compositionend',onInput);
    function outside(event){if(active && !panel.contains(event.target)){hide();}}
    window.addEventListener('mousedown',outside,true);
    window.addEventListener('resize',positionPanel);
    window.addEventListener('TabSelect',hide);
    cleanup=()=>{hide();window.removeEventListener('mousedown',outside,true);window.removeEventListener('resize',positionPanel);window.removeEventListener('input',onInput,true);window.removeEventListener('keydown',key,true);input.removeEventListener('compositionend',onInput);window.removeEventListener('TabSelect',hide);panel.remove();};
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
