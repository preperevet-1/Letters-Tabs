// ==UserScript==
// @name Letter Tabs Inline Translation
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsTranslate?.destroy();
  let disposed = false, cleanup = () => {};
  function initialize() {
    if (disposed) return;
    const bar = document.getElementById('urlbar'), input = document.getElementById('urlbar-input');
    if (!bar || !input) return;
    const make = (tag, className, text) => {
      const node = document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    };
    const panel = make('section', 'lt-translate');
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Перекладач');
    const heading = make('div', 'lt-translate-heading', 'Переклад · Google');
    const card = make('div', 'lt-translate-card');
    const left = make('div', 'lt-translate-side'), right = make('div', 'lt-translate-side');
    const original = make('div', 'lt-translate-text'), result = make('div', 'lt-translate-text');
    result.setAttribute('aria-live', 'polite');
    const from = make('select'), to = make('select');
    from.setAttribute('aria-label', 'Мова оригіналу');to.setAttribute('aria-label', 'Мова перекладу');
    const languages = {en:'Англійська',uk:'Українська',pl:'Польська',de:'Німецька',fr:'Французька',es:'Іспанська',it:'Італійська',ja:'Японська',ko:'Корейська',zh:'Китайська',pt:'Португальська'};
    for (const [code,name] of Object.entries(languages)) {
      for (const select of [from,to]) {const option=make('option','',name);option.value=code;select.append(option);}
    }
    const auto=make('option','','Автовизначення');auto.value='auto';from.prepend(auto);
    from.value='auto';to.value='en';
    const arrow=make('button','lt-translate-swap','⇄');arrow.type='button';arrow.setAttribute('aria-label','Поміняти мови місцями');
    left.append(original,from);right.append(result,to);card.append(left,arrow,right);
    const footer=make('div','lt-translate-footer');
    const status=make('span','lt-translate-status','Enter — перекласти');
    const translate=make('button','','Перекласти ↵'),copy=make('button','','Копіювати');
    translate.type=copy.type='button';copy.disabled=true;
    footer.append(status,translate,copy);panel.append(heading,card,footer);bar.append(panel);
    let active=false,revision=0,controller=null,translated='',detected='',lastQuery=null;
    const parse=()=>/^\/(?:tr|translate)(?:\s+([\s\S]*))?$/i.exec(input.value);
    const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
    function invalidate(){revision++;controller?.abort();controller=null;translated='';copy.disabled=true;translate.disabled=false;}
    function sync(event) {
      if (event && event.target!==input) return;
      if (event?.isComposing) {if(active)event.stopImmediatePropagation();return;}
      const match=parse();
      if (!match || bar.hasAttribute('letter-tabs-bang')) {hide();return;}
      active=true;panel.hidden=false;bar.setAttribute('letter-tabs-translate','true');
      event?.stopImmediatePropagation();
      window.gURLBar?.controller?.cancelQuery?.();
      window.gURLBar.userTypedValue=input.value;
      window.gURLBar?.view?.clearSelection?.();
      if (lastQuery===input.value) return;
      lastQuery=input.value;
      invalidate();original.textContent=match[1]?.trim() || 'Введи текст після /tr';
      result.textContent='Переклад з’явиться тут';status.textContent='Enter — перекласти';
    }
    function hide(){invalidate();lastQuery=null;active=false;panel.hidden=true;bar.removeAttribute('letter-tabs-translate');}
    async function run(){
      const text=parse()?.[1]?.trim();if (!active || !text || translate.disabled)return;
      invalidate();const version=revision;controller=new AbortController();
      translate.disabled=true;status.textContent='Перекладаю…';result.textContent='…';
      try {
        const value=await translateText(text,from.value,to.value,controller.signal);
        if (disposed || version!==revision || !active)return;
        translated=value.text;detected=value.source;result.textContent=value.text;
        auto.textContent=detected && languages[detected] ? 'Авто · '+languages[detected] : 'Автовизначення';copy.disabled=false;status.textContent='Готово · ⌘C — копіювати';
      } catch(error){
        if (disposed || version!==revision)return;
        result.textContent='Не вдалося перекласти';status.textContent=error.message || 'Перевір підключення й спробуй знову';
      } finally {if(version===revision)translate.disabled=false;}
    }
    function copyResult(){
      if (!translated)return;
      try {Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper).copyString(translated);status.textContent='Скопійовано';}
      catch(_){status.textContent='Не вдалося скопіювати';}
    }
    function key(event){
      if(event.target!==input || event.isComposing || !parse() || bar.hasAttribute('letter-tabs-bang'))return;
      if(event.key==='Enter'){stop(event);run();}
      else if(event.key==='Escape'){stop(event);input.value='';window.gURLBar.value='';hide();}
      else if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='c'&&input.selectionStart===input.selectionEnd&&translated){stop(event);copyResult();}
      else if(['ArrowDown','ArrowUp','PageDown','PageUp'].includes(event.key))stop(event);
    }
    function languageChanged(){invalidate();result.textContent='Натисни Enter для перекладу';status.textContent='Enter — перекласти';input.focus();}
    from.addEventListener('change',languageChanged);to.addEventListener('change',languageChanged);
    arrow.addEventListener('click',()=>{
      const old=from.value==='auto'?detected:from.value;
      if(!old || !languages[old]){status.textContent='Спочатку переклади текст, щоб визначити мову';return;}
      from.value=to.value;to.value=old;
      if(translated){input.value='/tr '+translated;window.gURLBar.value=input.value;sync();}
      languageChanged();
    });
    translate.addEventListener('click',run);copy.addEventListener('click',copyResult);
    window.addEventListener('TabSelect',hide);window.addEventListener('ZenURLBarClosed',hide);
    window.addEventListener('input',sync,true);window.addEventListener('keydown',key,true);
    input.addEventListener('compositionend',sync);input.addEventListener('focus',sync);
    const observer=new MutationObserver(()=>{if(!bar.hasAttribute('breakout-extend'))hide();});
    observer.observe(bar,{attributes:true,attributeFilter:['breakout-extend']});
    cleanup=()=>{window.removeEventListener('TabSelect',hide);window.removeEventListener('ZenURLBarClosed',hide);hide();observer.disconnect();window.removeEventListener('input',sync,true);window.removeEventListener('keydown',key,true);input.removeEventListener('compositionend',sync);input.removeEventListener('focus',sync);panel.remove();};
  }
  // Provider integration is configured separately from the search interface.
  async function translateText(text,source,target,signal) {
    if(source===target)return {text,source};
    if([...text].length>1500)throw new Error('Для цієї картки — до 1500 символів за раз');
    const url=new URL('https://translate.googleapis.com/translate_a/single');
    for(const [key,value] of Object.entries({client:'gtx',sl:source,tl:target,dt:'t',dj:'1',q:text}))url.searchParams.set(key,value);
    const timeout=new AbortController();
    const abort=()=>timeout.abort();signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted)timeout.abort();
    const timer=setTimeout(abort,15000);
    try {
      const response=await fetch(url.href,{signal:timeout.signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
      if(!response.ok)throw new Error(response.status===429?'Google тимчасово обмежив запити. Спробуй пізніше':'Google Translate недоступний. Спробуй знову');
      const data=await response.json();
      const value=data.sentences?.map(item=>typeof item.trans==='string'?item.trans:'').join('');
      if(!value)throw new Error('Google повернув порожній переклад');
      return {text:value,source:typeof data.src==='string'?data.src:source};
    } catch(error){
      if(error.name==='AbortError' && !signal.aborted)throw new Error('Час очікування минув. Спробуй ще раз');
      throw error;
    } finally {clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  function destroy(){disposed=true;window.removeEventListener('load',initialize);window.removeEventListener('unload',destroy);cleanup();delete window.__letterTabsTranslate;}
  window.__letterTabsTranslate={destroy};
  window.addEventListener('unload',destroy,{once:true});
  if(typeof window.addUnloadListener==='function')window.addUnloadListener(destroy);
  if(document.readyState==='complete')initialize();else window.addEventListener('load',initialize,{once:true});
})();
