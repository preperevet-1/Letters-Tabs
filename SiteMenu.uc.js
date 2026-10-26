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
    let translateRequested=false;
    function anchorTranslation(event){
      if(!translateRequested || event.target.id!=='full-page-translations-panel')return;
      translateRequested=false;
      const anchor=document.getElementById('zen-site-data-icon-button');
      if(anchor)event.target.moveToAnchor(anchor,'bottomright topright',0,0);
    }
    window.addEventListener('popupshown',anchorTranslation);
    translate.addEventListener('command',event=>{
      translateRequested=true;
      panel.hidePopup();
      window.FullPageTranslationsPanel.open(event).catch(error=>{translateRequested=false;console.error(error);});
    });
    panel.setAttribute('lt-site-menu','true');
    cleanup=()=>{translateRequested=false;window.removeEventListener('popupshown',anchorTranslation);settings.remove();translate.remove();panel.removeAttribute('lt-site-menu');};
  }
  function destroy(){window.removeEventListener('load',init);window.removeEventListener('unload',destroy);cleanup();delete window.__letterTabsSiteMenu;}
  window.__letterTabsSiteMenu={destroy};window.addUnloadListener?.(destroy);window.addEventListener('unload',destroy,{once:true});
  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
