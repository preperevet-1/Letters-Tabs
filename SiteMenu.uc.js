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
    let pending=false, disposed=false, openTimer=0, restoreOpen=null;
    async function openTranslation(){
      if(disposed)return;
      const anchor=document.getElementById('zen-site-data-icon-button');
      const multiView=window.PanelMultiView;
      const original=multiView.openPopup;
      // Supply the stable anchor before the native popup opens. Moving an
      // already visible panel can dismiss it on macOS.
      function anchoredOpen(popup,target,options,...rest){
        if(popup.id==='full-page-translations-panel' && anchor){
          target=anchor;
          options={...options,position:'bottomright topright'};
        }
        return original.call(this,popup,target,options,...rest);
      }
      multiView.openPopup=anchoredOpen;
      restoreOpen=()=>{if(multiView.openPopup===anchoredOpen)multiView.openPopup=original;};
      try{
        await window.FullPageTranslationsPanel.open({
          type:'command',target:anchor,stopPropagation(){}
        });
      }catch(error){console.error('Letter Tabs translation:',error);}
      finally{restoreOpen?.();restoreOpen=null;pending=false;}
    }
    function afterSiteHidden(event){
      if(event.target!==panel || !pending)return;
      // Finish the old popup's dismissal and originating command first.
      panel.removeEventListener('popuphidden',afterSiteHidden);
      openTimer=setTimeout(openTranslation,0);
    }
    translate.addEventListener('command',event=>{
      event.preventDefault();event.stopPropagation();
      if(pending)return;
      pending=true;
      if(panel.state==='closed')openTimer=setTimeout(openTranslation,0);
      else {panel.addEventListener('popuphidden',afterSiteHidden);panel.hidePopup();}
    });
    panel.setAttribute('lt-site-menu','true');
    cleanup=()=>{
      disposed=true;pending=false;clearTimeout(openTimer);restoreOpen?.();
      panel.removeEventListener('popuphidden',afterSiteHidden);
      settings.remove();translate.remove();panel.removeAttribute('lt-site-menu');
    };
  }
  function destroy(){window.removeEventListener('load',init);window.removeEventListener('unload',destroy);cleanup();delete window.__letterTabsSiteMenu;}
  window.__letterTabsSiteMenu={destroy};window.addUnloadListener?.(destroy);window.addEventListener('unload',destroy,{once:true});
  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
