// ==UserScript==
// @name Letter Tabs Site Suggestions
// @include chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsSites?.destroy();
  const {UrlbarProvider}=ChromeUtils.importESModule('moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs');
  const {UrlbarProvidersManager:manager}=ChromeUtils.importESModule('moz-src:///browser/components/urlbar/UrlbarProvidersManager.sys.mjs');
  const {UrlbarShared:S}=ChromeUtils.importESModule('chrome://browser/content/urlbar/UrlbarShared.mjs');
  const {UrlbarResult}=ChromeUtils.importESModule('chrome://browser/content/urlbar/UrlbarResult.mjs');
  const sites=[['Pinterest','pinterest.com'],['YouTube','youtube.com'],['ChatGPT','chatgpt.com'],['Perplexity','perplexity.ai'],['Genius','genius.com'],['GitHub','github.com'],['Google','google.com'],['Gmail','mail.google.com'],['Drive','drive.google.com'],['Sheets','sheets.google.com'],['Claude','claude.ai'],['Mobbin','mobbin.com'],['Reddit','reddit.com'],['Threads','threads.com'],['Figma','figma.com'],['Notion','notion.so'],['LinkedIn','linkedin.com'],['Behance','behance.net']];
  function match(context){
    const q=context.searchString.toLowerCase();
    if(q.length<3 || !/^[a-z0-9.]+$/.test(q) || context.searchMode || context.restrictInSearchMode?.())return null;
    return sites.find(([name,host])=>name.toLowerCase().startsWith(q)||host.startsWith(q));
  }
  class LetterTabsSites extends UrlbarProvider {
    get name(){return 'LetterTabsSites';}
    get type(){return S.PROVIDER_TYPE.HEURISTIC;}
    getPriority(){return 2;}
    isActive(context){return Boolean(match(context));}
    async startQuery(context,add){
      const found=match(context);if(!found)return;
      const [title,host]=found,url='https://'+host+'/';
      add(this,new UrlbarResult({type:S.RESULT_TYPE.URL,source:S.RESULT_SOURCE.OTHER_LOCAL,heuristic:true,payload:{title,url,icon:S.getIconForUrl(Services.io.newURI(url))},highlights:{title:S.HIGHLIGHT.TYPED,url:S.HIGHLIGHT.TYPED}}));
    }
  }
  // The providers manager is shared across browser windows.
  let provider=manager.getProvider('LetterTabsSites');
  if(!provider){provider=new LetterTabsSites();provider.owners=new Set();manager.registerProvider(provider);}
  const owner={};provider.owners.add(owner);
  function destroy(){if(!provider.owners.delete(owner))return;if(!provider.owners.size)manager.unregisterProvider(provider);window.removeEventListener('unload',destroy);delete window.__letterTabsSites;}
  window.__letterTabsSites={destroy};window.addEventListener('unload',destroy,{once:true});window.addUnloadListener?.(destroy);
})();
