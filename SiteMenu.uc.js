// ==UserScript==
// @name Letter Tabs Site Menu
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsSiteMenu?.destroy();
  let cleanup=()=>{};
  function init(){
    const panel=document.getElementById('zen-unified-site-data-panel');
    const footer=document.getElementById('zen-site-data-footer');
    const share=document.getElementById('zen-site-data-header-share');
    if(!panel || !footer || !share)return;
    const make=(id,label,icon)=>{
      const b=document.createXULElement('toolbarbutton');b.id=id;
      b.setAttribute('class','subviewbutton zen-interactive-button');
      b.setAttribute('tooltiptext',label);b.setAttribute('aria-label',label);
      b.style.listStyleImage=`url("${icon}")`;return b;
    };
    const settings=make('lt-site-settings','Settings','chrome://global/skin/icons/settings.svg');
    footer.insertBefore(settings,document.getElementById('zen-site-data-actions'));
    const translate=make('lt-site-translate','Translate','chrome://browser/skin/translations.svg');
    translate.setAttribute('class','zen-squircle-before');translate.setAttribute('flex','1');
    share.before(translate);
    settings.addEventListener('command',()=>{panel.hidePopup();window.BrowserCommands.pageInfo(null,'permTab');});
    translate.addEventListener('command',event=>{
      panel.hidePopup();
      window.FullPageTranslationsPanel.open(event).catch(console.error);
    });
    const boost=make('lt-site-toggle-boost','Enable Boost','');
    boost.setAttribute('class','zen-squircle-before');boost.setAttribute('flex','1');boost.setAttribute('closemenu','none');
    const header=document.getElementById('zen-site-data-header');header.append(boost,translate);
    const list=document.getElementById('zen-site-data-boost-list');
    const nativeBoost=document.getElementById('zen-site-data-boost');
    function boostRows(){return [...list.querySelectorAll('[data-action-id="zen-site-data-toggle-boost"]')];}
    let lastBoostId=null;
    function updateBoost(){
      const rows=boostRows(),active=rows.find(row=>row.getAttribute('state')==='enabled');
      if(active)lastBoostId=active.getAttribute('data-boost-id');
      boost.disabled=nativeBoost.disabled;
      boost.setAttribute('aria-pressed',String(Boolean(active)));
      boost.setAttribute('tooltiptext',boost.disabled?'Boost unavailable':active?'Disable Boost':rows.length?'Enable Boost':'Create Boost');
      const image=getComputedStyle(nativeBoost).listStyleImage;
      boost.style.listStyleImage=image;
    }
    boost.addEventListener('command',()=>{
      if(boost.disabled)return;
      const rows=boostRows();
      const row=rows.find(r=>r.getAttribute('state')==='enabled') || rows.find(r=>r.getAttribute('data-boost-id')===lastBoostId) || rows[0];
      if(row)row.dispatchEvent(new MouseEvent('click',{bubbles:true,button:0}));
      else nativeBoost.doCommand();
      updateBoost();
    });
    const observer=new MutationObserver(updateBoost);
    observer.observe(list,{childList:true,subtree:true,attributes:true,attributeFilter:['state']});
    observer.observe(nativeBoost,{attributes:true,attributeFilter:['disabled','boosting']});
    function shown(e){if(e.target===panel)updateBoost();}
    panel.addEventListener('popupshown',shown);
    updateBoost();
    panel.setAttribute('lt-site-menu','true');
    cleanup=()=>{observer.disconnect();panel.removeEventListener('popupshown',shown);boost.remove();settings.remove();translate.remove();panel.removeAttribute('lt-site-menu');};
  }
  function destroy(){window.removeEventListener('load',init);window.removeEventListener('unload',destroy);cleanup();delete window.__letterTabsSiteMenu;}
  window.__letterTabsSiteMenu={destroy};window.addUnloadListener?.(destroy);window.addEventListener('unload',destroy,{once:true});
  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
