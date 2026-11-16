/* Immersive manuscript reader. Original chapter nodes are moved, never rewritten. */
(async () => {
  'use strict';
  if (!document.body.classList.contains('realm-reader')) return;
  const file = location.pathname.split('/').pop();
  let catalog;
  try { const response = await fetch('assets/reader-catalog.json'); if (!response.ok) return; catalog = await response.json(); } catch (_) { return; }
  const current = catalog.find(item => item.file === file);
  if (!current) return;
  const title = document.querySelector('.cover-title')?.textContent.trim() || current.title;
  const legacyPages = [...document.querySelectorAll('#book .page:not(.page-cover)')];
  const legacySummary = document.querySelector('.cover-summary');
  const crown = document.querySelector('.realm-crown')?.outerHTML || '';
  const legacyLast = readLegacy('noegenesis-lastread', null);
  const prefKey = 'demahs.reader.preferences.v1', dataKey = 'demahs.reader.annotations.v1', positionKey = 'demahs.reader.positions.v1';
  const storedPrefs=read(prefKey, {});
  const prefs = Object.assign({ mode: 'light', size: 21, line: 1.8, width: 84, art: 1, view:'pages' }, storedPrefs);
  if(!storedPrefs.defaultsVersion&&storedPrefs.width===65)prefs.width=84;
  prefs.defaultsVersion=2;if(!['pages','scroll'].includes(prefs.view))prefs.view='pages';
  if (!['light', 'sepia', 'dark'].includes(prefs.mode)) prefs.mode = 'light';
  const data = Object.assign({ bookmarks: [], highlights: [], notes: [], definitions: [], imported: [] }, read(dataKey, {}));
  for (const key of ['bookmarks', 'highlights', 'notes', 'definitions', 'imported']) if (!Array.isArray(data[key])) data[key] = [];
  const positions = Object.assign({ entries: {}, last: null }, read(positionKey, {}));
  const icons = {
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',
    bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>', settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
    chapters:'<path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3Z M12 6v15"/>', note:'<path d="M5 3h11l3 3v15H5Z M8 10h8M8 14h6"/>',
    highlight:'<path d="m14 3 7 7-10 10H4v-7Z M6 11l7 7M3 22h18"/>', dictionary:'<path d="M4 3h15v18H4Z M8 3v18M11 8h5M11 12h5"/>',
    play:'<path d="m9 5 10 7-10 7Z"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>', left:'<path d="m14 5-7 7 7 7"/>', right:'<path d="m10 5 7 7-7 7"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    full:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>', share:'<path d="M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8"/>', copy:'<rect x="8" y="8" width="12" height="13" rx="1"/><path d="M16 8V3H3v13h5"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chapters}</svg>`;
  const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button = (action, icon, label, extra='') => `<button type="button" class="dem-icon ${extra}" data-action="${action}" aria-label="${label}" title="${label}">${svg(icon)}</button>`;
  const nav = () => [['continue','play','Continue Reading'],['chapters','chapters','Chapters'],['bookmarks','bookmark','Bookmarks'],['notes','note','Notes'],['highlights','highlight','Highlights'],['dictionary','dictionary','Dictionary'],['definitions','dictionary','Saved definitions'],['settings','settings','Settings']].map(([action,icon,label]) => `<button type="button" data-action="${action}">${svg(icon)}<span>${label}</span>${['bookmarks','notes','highlights','definitions'].includes(action)?`<span class="dem-count" data-count="${action}"></span>`:''}</button>`).join('');
  const app = document.createElement('div'); app.id = 'dem-app'; app.className = 'dem-app'; app.dataset.mode = prefs.mode;app.dataset.view='pages';
  app.innerHTML = `<a class="dem-skip" href="#dem-reading">Skip to chapter text</a>
    <header class="dem-top"><div style="display:flex;align-items:center;gap:5px">${button('chapters','menu','Open reader navigation','dem-menu')}<a class="dem-brand" href="library.html" aria-label="DEMAHS library">${crown}<span>DEMAHS <small>THE MANUSCRIPT READER</small></span></a></div><span class="dem-top-title">${esc(title)} <span aria-hidden="true" style="color:#766147;margin-inline:14px">/</span> By EARNLIGHT</span><nav class="dem-actions" aria-label="Reader actions">${button('search','search','Search chapters')}${button('bookmark','bookmark','Bookmark this location')}${button('settings','settings','Reader settings','dem-settings-top')}</nav></header>
    <div class="dem-workspace"><aside class="dem-sidebar" aria-label="Reader navigation"><div class="dem-cover"><img src="${esc(current.cover)}" alt="" width="1024" height="1536"><span>${esc(title)}</span></div><div class="dem-sidebar-search-slot"></div><p class="dem-sidebar-label">YOUR READING ROOM</p><nav class="dem-nav">${nav()}</nav><div class="dem-sidebar-foot">✦<a href="library.html">Return to the library</a><button class="dem-text-button" type="button" data-action="extras">About &amp; discussion</button></div></aside>
    <main id="dem-reading" class="dem-scroll" tabindex="0" aria-label="${esc(title)} manuscript"><div class="dem-page-window"><article class="dem-manuscript" aria-labelledby="dem-title"><div class="dem-panorama" aria-hidden="true"><picture><source media="(max-width:760px)" srcset="assets/images/celestial-realm-mobile.webp"><img src="assets/images/celestial-realm.webp" width="1585" height="992" alt="" decoding="async" fetchpriority="high"></picture></div><header class="dem-chapter-heading"><div class="dem-kicker"></div><h1 id="dem-title">${esc(title)}</h1><div class="dem-ornament" aria-hidden="true">✦</div></header><div class="dem-reading-content" id="dem-content"></div><div class="dem-end"><span aria-hidden="true">❧</span>End of ${esc(title)}</div></article></div><span class="dem-folio" aria-hidden="true"></span></main></div>
    <footer class="dem-bottom"><div class="dem-find-nav" role="navigation" aria-label="Search match navigation" hidden><button type="button" class="dem-icon" data-action="previous-match" aria-label="Previous search match">${svg('left')}</button><span class="dem-find-count" role="status" aria-live="polite"></span><button type="button" class="dem-icon" data-action="next-match" aria-label="Next search match">${svg('right')}</button><button type="button" class="dem-icon" data-action="clear-find" aria-label="Clear search highlights">${svg('close')}</button></div><nav class="dem-page-turns" aria-label="Page navigation"><button class="dem-text-button dem-page-previous" type="button" data-action="previous-page" aria-label="Previous page">${svg('left')}<span class="dem-label">Previous page</span></button><form class="dem-page-jump"><label for="dem-page-number">Page</label><input id="dem-page-number" type="number" inputmode="numeric" enterkeyhint="go" min="1" value="1" aria-label="Go to page" aria-describedby="dem-page-total"><span class="dem-page-total" id="dem-page-total">of 1</span><button type="submit" class="dem-text-button">Go</button></form><button class="dem-text-button dem-page-next" type="button" data-action="next-page" aria-label="Next page"><span class="dem-label">Next page</span>${svg('right')}</button></nav><span class="dem-page-announcement" role="status" aria-live="polite" aria-atomic="true"></span><div class="dem-reading-tools">${button('chapters','chapters','Open chapter shelf')}<div class="dem-progress"><div class="dem-progress-line" role="progressbar" aria-label="Chapter reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><label class="dem-progress-label">Opening manuscript</label></div>${button('settings','settings','Font and appearance settings')}${button('mode','sun','Change reading appearance')}${button('fullscreen','full','Enter distraction-free fullscreen')}</div></footer>
    <button class="dem-reveal-controls" type="button" data-action="show-controls" aria-label="Show reader controls"><span></span></button><dialog class="dem-panel" aria-labelledby="dem-panel-title"><header class="dem-panel-header"><h2 id="dem-panel-title"></h2>${button('close','close','Close panel')}</header><div class="dem-panel-body"></div></dialog>
    <div class="dem-selection" role="toolbar" aria-label="Selected passage actions" hidden><button type="button" data-action="highlight">${svg('highlight')}Highlight</button><button type="button" data-action="note">${svg('note')}Note</button><button type="button" data-action="define-selection">${svg('dictionary')}Define</button><button type="button" data-action="copy">${svg('copy')}Copy</button><button type="button" data-action="share">${svg('share')}Share</button></div><div class="dem-toast" role="status" aria-live="polite" hidden></div>`;
  document.body.append(app);
  const viewport = app.querySelector('.dem-scroll'), content = app.querySelector('#dem-content'), panel = app.querySelector('dialog'), panelBody = app.querySelector('.dem-panel-body'), panelTitle = app.querySelector('#dem-panel-title');
  const pageWindow = app.querySelector('.dem-page-window'), flow = app.querySelector('.dem-manuscript');
  let pageIndex = 0, pageCount = 1, pageStride = 1, paginationReady = false, pageFrame = 0, pageTimer = 0, lastAnchor = {block:0,char:0};
  let pageBoundaries=[],scrollMarkers=[],scrollOffsets=[],scrollBlocks=[],scrollTimer=0,layoutBusy=false;
  const historyKey='demahs.reader.search-history.v1';let searchHistory=read(historyKey,null);if(!Array.isArray(searchHistory))searchHistory=(read('noegenesis-recent-searches',[])||[]).filter(q=>typeof q==='string').slice(0,12).map(query=>({query,all:false}));
  let activeSearch={query:'',matches:[],index:0};
  const selectedNotes=new Set();let exportFormat='txt';
  const pageInput=app.querySelector('#dem-page-number'),chromeBars=[app.querySelector('.dem-top'),app.querySelector('.dem-bottom')];
  let pageJumpLock=null,jumpReleaseTimer=0,chromeTimer=0,keyboardChrome=false,suppressSelectionUntil=0;
  const panorama=flow.querySelector('.dem-panorama'),spacer=document.createElement('div');spacer.className='dem-panorama-space';spacer.setAttribute('aria-hidden','true');panorama.before(spacer);viewport.prepend(panorama);
  for(const side of ['left','right']){const ornament=document.createElement('span');ornament.className='dem-marginalia dem-marginalia-'+side;ornament.setAttribute('aria-hidden','true');viewport.append(ornament);}
  const blocks = [], segments = [], supplemental = document.createElement('div');
  let selection = null, toastTimer, saveTimer, panelType = '', opener = null, fullscreen = false, nativeFullscreen = false, searchIndexPromise,coverObserver=null;
  let suppressSave = true;
  legacyPages.forEach(page => {
    const body = page.querySelector('.page-body'); if (!body) return;
    const section = document.createElement('section'); section.dataset.legacyPage = page.dataset.page; section.className = 'dem-segment';
    [...body.childNodes].forEach(node => section.append(node)); content.append(section); segments.push(section);
    [...section.children].forEach(node => { node.classList.add('dem-block'); node.dataset.block = blocks.length; node.id = 'dem-block-' + blocks.length; blocks.push(node); });
  });
  const firstLabel = content.querySelector('.chapter-title');
  const kicker = app.querySelector('.dem-kicker');
  if (firstLabel) { kicker.append(firstLabel); firstLabel.classList.remove('dem-block'); firstLabel.removeAttribute('id'); }
  else kicker.textContent = current.chapterLabel || 'THE COLLECTED WORKS';
  const firstOrnament=content.querySelector('.chapter-ornament');
  if(firstOrnament){app.querySelector('.dem-ornament').replaceChildren(firstOrnament);firstOrnament.classList.remove('dem-block');firstOrnament.removeAttribute('id');}
  for(const corner of ['tl','tr','bl','br']){const ornament=document.createElement('span');ornament.className='dem-frame-corner '+corner;ornament.setAttribute('aria-hidden','true');app.append(ornament);}
  panel.id='dem-panel';
  app.querySelectorAll('[data-action=chapters]').forEach(button=>{button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','dem-panel');button.setAttribute('aria-expanded','false');});
  // The original summary is associated writing, not replacement chapter content.
  if (legacySummary && !legacySummary.hidden && legacySummary.textContent.trim() && legacySummary.textContent.trim() !== 'INPUT') {
    const synopsis = document.createElement('div'); synopsis.className = 'dem-synopsis';
    [...legacySummary.childNodes].forEach(node => synopsis.append(node)); app.querySelector('.dem-chapter-heading').append(synopsis);
  }
  const opening=content.querySelector('p');if(opening&&/^\p{L}/u.test(opening.textContent.trim()))opening.classList.add('dem-opening-paragraph');
  const hasChapterText = blocks.some(node => node.matches('p,ul,ol,blockquote'));
  if (!hasChapterText) {
    app.querySelector('.dem-end').hidden=true;
    const notice = document.createElement('p'); notice.className = 'dem-empty'; notice.setAttribute('role','status'); notice.textContent = 'No chapter text has been supplied in this source page yet.'; content.after(notice);
  }
  for (const id of ['comment-section','next-chapter-row','comments-display','latest-additions','realm-footer']) { const node=document.getElementById(id); if(node) supplemental.append(node); }
  const siteLinks=document.createElement('nav');siteLinks.className='dem-site-links';siteLinks.setAttribute('aria-label','Original site navigation');
  const heading=document.createElement('p');heading.textContent='Elsewhere in DEMAHS';siteLinks.append(heading);
  const seenLinks=new Set();
  document.querySelectorAll('#realm-navigation a[href]:not(.realm-skip),#home-btn').forEach(original=>{const href=original.getAttribute('href');if(seenLinks.has(href))return;seenLinks.add(href);const link=document.createElement('a');link.href=href;link.textContent=original.getAttribute('aria-label')||original.textContent.trim();siteLinks.append(link);});
  supplemental.append(siteLinks);
  document.body.classList.remove('realm-page','realm-reader'); document.body.classList.add('dem-active'); document.body.style.overflow = '';
  window.DemahsReaderBoot?.finish();
  app.querySelector('.dem-sidebar-search-slot').append(createWritingSearch());
  syncFullscreen(); applyPrefs(false); importLegacy(); refreshMarks(); refreshCounts();

  function read(key, fallback) { try { const value=JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch (_) { return fallback; } }
  function readLegacy(key,fallback){try{const stored=window.DemahsReaderBoot?.savedValues[key];return stored!==undefined?JSON.parse(stored):read(key,fallback);}catch(_){return fallback;}}
  function write(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch (_) { toast('Browser storage is unavailable. Changes will last for this session.'); return false; } }
  function uid() { return crypto.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2); }
  function toast(message) { const el=app.querySelector('.dem-toast'); el.textContent=message; el.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{el.hidden=true;},3500); }
  // CSS columns fragment the original selectable nodes into genuine viewport-sized pages.
  // Character anchors survive font changes, rotation and native/PWA fullscreen.
  function textRect(node, offset=0) {
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text,last;
    while(text=walker.nextNode()){last=text;if(offset<text.length)break;offset-=text.length;}
    if(!text){text=last;offset=Math.max(0,(last?.length||1)-1);}
    if(!text)return node.getBoundingClientRect();
    const range=document.createRange();range.setStart(text,Math.min(offset,text.length));range.setEnd(text,Math.min(offset+1,text.length));return range.getBoundingClientRect();
  }
  function continuous(){return app.dataset.view==='scroll';}
  function pageForAnchor(anchor) {
    if(continuous()){if(anchor?.end)return pageCount-1;const node=blocks[anchor?.block];if(!node||!content.contains(node)||anchor?.opening)return 0;return scrollPageAt(textRect(node,anchor.char??anchor.start??0).top-viewport.getBoundingClientRect().top+viewport.scrollTop);}
    const node=blocks[anchor?.block];if(anchor?.end)return pageCount-1;if(!node||!content.contains(node))return 0;
    const rect=textRect(node,anchor.char??anchor.start??0);
    return Math.max(0,Math.min(pageCount-1,Math.floor((rect.left-flow.getBoundingClientRect().left+1)/pageStride)));
  }
  function anchorNow() {
    if(continuous())return scrollAnchor();
    for(const node of blocks.filter(n=>content.contains(n))){
      const rects=[...node.getClientRects()];
      if(!rects.some(r=>Math.floor((r.left-flow.getBoundingClientRect().left+1)/pageStride)===pageIndex))continue;
      let lo=0,hi=Math.max(0,node.textContent.length-1);
      while(lo<hi){const mid=Math.floor((lo+hi)/2),at=Math.floor((textRect(node,mid).left-flow.getBoundingClientRect().left+1)/pageStride);if(at<pageIndex)lo=mid+1;else hi=mid;}
      return {block:Number(node.dataset.block),char:lo};
    }
    const last=blocks.filter(n=>content.contains(n)).at(-1);
    return pageIndex===pageCount-1&&last?{block:Number(last.dataset.block),char:Math.max(0,last.textContent.length-1),end:true}:{block:0,char:0};
  }
  function showPage(index, focus=false) {
    if(continuous()){const target=Math.max(0,Math.min(pageCount-1,Math.trunc(index)||0));viewport.scrollTo({top:target===0?0:Math.max(0,(scrollOffsets[target]||0)-12),behavior:'instant'});syncScroll();if(focus)viewport.focus({preventScroll:true});return;}
    pageIndex=Math.max(0,Math.min(pageCount-1,Math.trunc(index)||0));viewport.dataset.opening=String(pageIndex===0);
    flow.style.transform=`translate3d(${-pageIndex*pageStride}px,0,0)`;
    pageWindow.scrollLeft=0;viewport.scrollTop=0;
    lastAnchor=anchorNow();updateProgress();
    if(focus)viewport.focus({preventScroll:true});
  }
  function clearDividers(){flow.querySelectorAll('.dem-scroll-break').forEach(node=>node.remove());flow.normalize();}
  function rangeAt(unit,offset){const w=document.createTreeWalker(unit,NodeFilter.SHOW_TEXT);let text;while(text=w.nextNode()){if(offset<=text.length){const range=document.createRange();range.setStart(text,offset);range.collapse(true);return range;}offset-=text.length;}return null;}
  function divider(index,end=false){const node=document.createElement('span');node.className='dem-scroll-break';node.dataset.pageIndex=index;node.dataset.pageNumber=index+1;if(end)node.dataset.end='true';node.setAttribute('role','separator');if(index>0&&!end)node.dataset.endPage=index;node.setAttribute('aria-label',end?'End of chapter':index?'End of page '+index+'; beginning of page '+(index+1):'Beginning of page 1');return node;}
  function installDividers(){
    scrollMarkers=new Array(pageCount);
    for(let index=pageCount-1;index>0;index--){const boundary=pageBoundaries[index]||pageBoundaries.slice(index+1).find(Boolean)||{unit:flow.lastElementChild,char:0};const node=divider(index),range=rangeAt(boundary.unit,boundary.char);if(range)range.insertNode(node);else boundary.unit.before(node);scrollMarkers[index]=node;}
    scrollMarkers[0]=divider(0);flow.prepend(scrollMarkers[0]);flow.append(divider(pageCount-1,true));cacheScrollGeometry();
  }
  function cacheScrollGeometry(){
    const top=viewport.getBoundingClientRect().top,offset=viewport.scrollTop;
    scrollOffsets=scrollMarkers.map(node=>node.getBoundingClientRect().top-top+offset);
    scrollBlocks=blocks.filter(node=>content.contains(node)).map(node=>{const rect=node.getBoundingClientRect();return {node,bottom:rect.bottom-top+offset};});
  }
  function scrollPageAt(offset){let lo=0,hi=Math.max(0,scrollOffsets.length-1);while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(scrollOffsets[mid]<=offset+2)lo=mid;else hi=mid-1;}return lo;}
  function scrollAnchor(){
    if(viewport.scrollTop<20)return {block:0,char:0,opening:true};
    const top=viewport.getBoundingClientRect().top+36,target=viewport.scrollTop+36;
    let lo=0,hi=Math.max(0,scrollBlocks.length-1);while(lo<hi){const mid=Math.floor((lo+hi)/2);if(scrollBlocks[mid].bottom<=target)lo=mid+1;else hi=mid;}
    const node=scrollBlocks[lo]?.node;if(!node)return {block:0,char:0};
    let from=0,to=Math.max(0,node.textContent.length-1);while(from<to){const mid=Math.floor((from+to)/2);if(textRect(node,mid).bottom<top)from=mid+1;else to=mid;}
    return {block:Number(node.dataset.block),char:from};
  }
  function syncScroll(){
    if(!continuous()||layoutBusy)return;
    pageIndex=viewport.scrollTop>=viewport.scrollHeight-viewport.clientHeight-2?pageCount-1:scrollPageAt(viewport.scrollTop+48);
    viewport.dataset.opening='true';lastAnchor=scrollAnchor();updateProgress();
  }
  viewport.addEventListener('scroll',()=>{if(!continuous()||layoutBusy||scrollTimer)return;scrollTimer=setTimeout(()=>{scrollTimer=0;syncScroll();},32);},{passive:true});
  function paginate(anchor=lastAnchor) {
    if(pageJumpLock)return;layoutBusy=true;
    clearDividers();app.dataset.view='pages';viewport.scrollTop=0;
    const width=pageWindow.clientWidth;if(!width||!pageWindow.clientHeight){layoutBusy=false;return;}
    const gap=48;pageStride=width+gap;
    flow.style.setProperty('--page-width',width+'px');flow.style.setProperty('--page-gap',gap+'px');flow.style.transform='none';
    const origin=flow.getBoundingClientRect().left;
    const nodes=[...blocks.filter(n=>content.contains(n)),...flow.querySelectorAll('.dem-panorama-space,.dem-chapter-heading,.dem-end,.dem-empty')];
    let extent=width;for(const node of nodes)for(const rect of node.getClientRects())extent=Math.max(extent,rect.right-origin);
    pageBoundaries=[];
    const walker=document.createTreeWalker(flow,NodeFilter.SHOW_TEXT),range=document.createRange();let text;
    while(text=walker.nextNode()){
      if(!text.textContent.trim())continue;range.selectNodeContents(text);const rects=[...range.getClientRects()];
      for(const rect of rects){
        extent=Math.max(extent,rect.right-origin);const index=Math.floor((rect.left-origin+1)/pageStride);
        if(index<=0||pageBoundaries[index])continue;
        let lo=0,hi=text.length-1;while(lo<hi){const mid=Math.floor((lo+hi)/2);range.setStart(text,mid);range.setEnd(text,mid+1);if(Math.floor((range.getBoundingClientRect().left-origin+1)/pageStride)<index)lo=mid+1;else hi=mid;}
        const unit=text.parentElement.closest('.dem-block,.dem-kicker,h1,.dem-synopsis p,.dem-end')||text.parentElement,prefix=document.createRange();prefix.selectNodeContents(unit);prefix.setEnd(text,lo);pageBoundaries[index]={unit,char:prefix.toString().length};
      }
    }
    pageCount=Math.max(1,Math.ceil((extent+gap-1)/pageStride));paginationReady=true;
    if(prefs.view==='scroll'){app.dataset.view='scroll';flow.style.transform='none';installDividers();layoutBusy=false;go(anchor,false);}
    else {layoutBusy=false;showPage(pageForAnchor(anchor));}
    if(blocks[anchor?.block]||anchor?.end)lastAnchor=anchor;
  }
  function schedulePagination(anchor=lastAnchor) {
    if(pageJumpLock)return;
    cancelAnimationFrame(pageFrame);clearTimeout(pageTimer);
    // Safari can throttle animation frames while a native settings dialog is open.
    // The bounded fallback keeps page counts current as the reader adjusts text.
    const run=()=>{cancelAnimationFrame(pageFrame);clearTimeout(pageTimer);pageFrame=pageTimer=0;paginate(anchor);};
    pageFrame=requestAnimationFrame(run);pageTimer=setTimeout(run,60);
  }
  function go(anchor,focus=true) {
    if(!paginationReady){paginate(anchor);return;}
    if(continuous()){
      const node=blocks[anchor?.block],top=anchor?.end?viewport.scrollHeight:node&&content.contains(node)&&!anchor?.opening?viewport.scrollTop+textRect(node,anchor.char??anchor.start??0).top-viewport.getBoundingClientRect().top-36:0;
      viewport.scrollTo({top:Math.max(0,top),behavior:'instant'});syncScroll();if(focus)viewport.focus({preventScroll:true});
    }else showPage(pageForAnchor(anchor),focus);
  }
  function updateProgress() {
    const distance=viewport.scrollHeight-viewport.clientHeight;
    const progress=!hasChapterText?0:continuous()?distance>0?Math.max(0,Math.min(100,Math.round(viewport.scrollTop/distance*100))):100:pageCount===1?100:Math.round(pageIndex/(pageCount-1)*100);
    const line=app.querySelector('.dem-progress-line');line.querySelector('span').style.width=progress+'%';line.setAttribute('aria-valuenow',progress);line.setAttribute('aria-valuetext',`Page ${pageIndex+1} of ${pageCount}`);
    app.querySelector('.dem-progress-label').textContent=hasChapterText?progress+'% of chapter':'No chapter text yet';
    const input=pageInput;if(document.activeElement!==input)input.value=pageIndex+1;input.max=pageCount;
    app.querySelector('.dem-page-total').textContent='of '+pageCount;const announcement=app.querySelector('.dem-page-announcement'),pageText=`Page ${pageIndex+1} of ${pageCount}`;if(announcement.textContent!==pageText)announcement.textContent=pageText;
    app.querySelector('.dem-folio').textContent='—  '+(pageIndex+1)+'  —';
    app.querySelector('[data-action=previous-page]').disabled=pageIndex===0;
    app.querySelector('[data-action=next-page]').disabled=pageIndex===pageCount-1;
    const marked=data.bookmarks.some(item=>item.file===file&&pageForAnchor(item.anchor)===pageIndex);
    app.querySelector('[data-action="bookmark"]').setAttribute('aria-pressed',String(marked));
    app.dispatchEvent(new CustomEvent('demahs:reading-position',{detail:{file,anchor:anchorNow(),progress,page:pageIndex+1,total:pageCount}}));
    if(!suppressSave){clearTimeout(saveTimer);saveTimer=setTimeout(savePosition,160);}
  }
  function savePosition() { positions.entries[file]={anchor:lastAnchor,progress:Number(app.querySelector('.dem-progress-line').getAttribute('aria-valuenow')),page:pageIndex+1,total:pageCount,title,updatedAt:Date.now()};positions.last=file;write(positionKey,positions); }
  // A software keyboard changes the visual viewport, not the book's page size.
  // Keep the rendered geometry and typed value stable until that keyboard closes.
  function releasePageJump(force=false) {
    if(!pageJumpLock)return;
    const widthChanged=Math.abs(innerWidth-pageJumpLock.viewportWidth)>30;
    if(!force){
      clearTimeout(jumpReleaseTimer);
      if(!widthChanged&&(document.activeElement===pageInput||(window.visualViewport?.height||innerHeight)<pageJumpLock.visibleHeight-80))return;
      if(!widthChanged){jumpReleaseTimer=setTimeout(()=>{if(document.activeElement!==pageInput)releasePageJump(true);},180);return;}
    }
    const anchor=lastAnchor;pageJumpLock=null;clearTimeout(jumpReleaseTimer);app.classList.remove('dem-jump-editing');
    for(const prop of ['--dem-locked-page-width','--dem-locked-page-height'])app.style.removeProperty(prop);
    schedulePagination(anchor);revealChrome();
  }
  pageInput.addEventListener('focus',()=>{
    clearTimeout(jumpReleaseTimer);
    if(!pageJumpLock){pageJumpLock={viewportWidth:innerWidth,visibleHeight:window.visualViewport?.height||innerHeight};app.style.setProperty('--dem-locked-page-width',pageWindow.clientWidth+'px');app.style.setProperty('--dem-locked-page-height',pageWindow.clientHeight+'px');app.classList.add('dem-jump-editing');cancelAnimationFrame(pageFrame);clearTimeout(pageTimer);}
    revealChrome();pageInput.select();
  });
  pageInput.addEventListener('blur',()=>{clearTimeout(jumpReleaseTimer);jumpReleaseTimer=setTimeout(()=>releasePageJump(),220);});
  app.querySelector('.dem-page-jump').addEventListener('submit',event=>{event.preventDefault();const target=Number(pageInput.value)-1;pageInput.blur();showPage(target,true);pageInput.value=pageIndex+1;revealChrome();});
  const resize=()=>{syncFullscreen();if(!mobileReader()){clearTimeout(chromeTimer);setChromeHidden(false);}if(pageJumpLock){releasePageJump();return;}schedulePagination();};
  window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);
  window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',()=>{syncFullscreen();releasePageJump();});
  new ResizeObserver(()=>{if(paginationReady&&!pageJumpLock)schedulePagination();}).observe(viewport);
  window.addEventListener('pagehide',()=>{clearTimeout(chromeTimer);if(!suppressSave)savePosition();});
  let touchStart=null;
  viewport.addEventListener('touchstart',event=>{
    const t=event.touches[0];touchStart=event.touches.length===1&&!event.target.closest('a,button,input,select,textarea')?{x:t.clientX,y:t.clientY,time:performance.now(),horizontal:false}:null;
  },{passive:true,capture:true});
  viewport.addEventListener('touchmove',event=>{
    if(!touchStart||event.touches.length!==1){touchStart=null;return;}
    const t=event.touches[0],dx=Math.abs(t.clientX-touchStart.x),dy=Math.abs(t.clientY-touchStart.y),selected=getSelection();
    if(dx>14&&dx>dy*1.4&&(!selected||selected.isCollapsed)){touchStart.horizontal=true;if(event.cancelable)event.preventDefault();}
  },{passive:false,capture:true});
  viewport.addEventListener('touchend',event=>{
    if(!touchStart)return;const t=event.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y,age=performance.now()-touchStart.time,selected=getSelection();touchStart=null;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4&&age<1000&&(!selected||selected.isCollapsed)){suppressSelectionUntil=performance.now()+350;showPage(pageIndex+(dx<0?1:-1));}
  },{passive:true,capture:true});
  viewport.addEventListener('touchcancel',()=>touchStart=null,{passive:true});
  viewport.addEventListener('click',event=>{if(event.target.closest('a,button,input'))return;if(performance.now()<suppressSelectionUntil){event.preventDefault();return;}revealChrome();});
  content.addEventListener('focusin',event=>{const node=event.target.closest('.dem-block');if(node)showPage(pageForAnchor({block:Number(node.dataset.block)}));});

  function applyPrefs(persist=true,anchor=lastAnchor) {
    const limits={size:[16,30],line:[1.4,2.3],width:[45,84],art:[0,1]};
    for(const [key,[min,max]] of Object.entries(limits)) prefs[key]=Math.min(max,Math.max(min,Number(prefs[key])||min));
    app.dataset.mode=prefs.mode;app.style.setProperty('--font-size',prefs.size+'px');app.style.setProperty('--line-height',prefs.line);app.style.setProperty('--reading-width',prefs.width+'ch');app.style.setProperty('--art-strength',prefs.art);
    if(persist)write(prefKey,prefs);if(paginationReady)schedulePagination(anchor);
  }
  function refreshCounts() { app.querySelectorAll('[data-count]').forEach(el=>{el.textContent=el.dataset.count==='definitions'?data.definitions.length:data[el.dataset.count].filter(item=>item.file===file).length;}); }
  function storeAnnotations() { const persisted=write(dataKey,data);refreshCounts();refreshMarks();return persisted; }
  function paragraphAnchor(quote,pageIndex) {
    const candidates=blocks.filter(node=>content.contains(node));
    const node=candidates.find(node=>node.textContent.includes(quote));
    if(node){const at=node.textContent.indexOf(quote);return {block:Number(node.dataset.block),start:at,endBlock:Number(node.dataset.block),end:at+quote.length,quote};}
    // Restore legacy selections spanning paragraphs, normalising whitespace only for matching.
    let joined='',locations=[];
    for(const block of candidates){const index=Number(block.dataset.block);for(let i=0;i<block.textContent.length;i++){joined+=block.textContent[i];locations.push({block:index,offset:i});}joined+='\n';locations.push({block:index,offset:block.textContent.length});}
    let normal='',map=[];
    for(let i=0;i<joined.length;i++){if(/\s/.test(joined[i])){if(normal.endsWith(' '))continue;normal+=' ';}else normal+=joined[i];map.push(i);}
    const phrase=quote.replace(/\s+/g,' ').trim(),found=normal.indexOf(phrase);
    if(phrase&&found>=0){const start=locations[map[found]],end=locations[map[found+phrase.length-1]];return {block:start.block,start:start.offset,endBlock:end.block,end:end.offset+1,quote};}
    const fallback=segments.find(section=>Number(section.dataset.legacyPage)===Number(pageIndex))?.querySelector('.dem-block');
    return {block:Number(fallback?.dataset.block||0),quote};
  }
  function importLegacy() {
    if(data.imported.includes(file)) return;
    const bookmarks=readLegacy('noegenesis-bookmarks-v2-'+current.slug,[]);
    for(const item of Array.isArray(bookmarks)?bookmarks:[]) { const node=segments.find(s=>Number(s.dataset.legacyPage)===Number(item.page))?.querySelector('.dem-block');data.bookmarks.push({id:uid(),file,title,name:item.name||title+' · saved location',anchor:{block:Number(node?.dataset.block||0)},legacy:true}); }
    const oldHighlights=readLegacy('noegenesis-highlights-'+current.slug,[]);
    for(const item of Array.isArray(oldHighlights)?oldHighlights:[]) data.highlights.push({id:uid(),file,title,anchor:paragraphAnchor(item.text,item.pageIndex),legacy:true});
    data.imported.push(file);write(dataKey,data);
  }
  function wrap(node,start,end,kind,id) {
    if(start>=end)return;
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let offset=0;const parts=[];
    while(walker.nextNode()){const text=walker.currentNode,from=Math.max(0,start-offset),to=Math.min(text.length,end-offset);if(from<to)parts.push({text,from,to});offset+=text.length;}
    for(const {text,from,to} of parts.reverse()){const range=document.createRange();range.setStart(text,from);range.setEnd(text,to);const mark=document.createElement('mark');mark.dataset.dem='true';mark.dataset.kind=kind;mark.dataset.record=id||'';range.surroundContents(mark);}
  }
  function refreshMarks(search=null) {
    content.querySelectorAll('mark[data-dem],.user-highlight').forEach(mark=>mark.replaceWith(...mark.childNodes));content.normalize();
    for(const [kind,records] of [['highlight',data.highlights],['note',data.notes]]) for(const item of records.filter(item=>item.file===file)) {
      const a=item.anchor;if(!Number.isFinite(a.start))continue;
      for(let index=a.block;index<=(a.endBlock??a.block);index++){const node=blocks[index];if(!node||!content.contains(node))continue;wrap(node,index===a.block?a.start:0,index===(a.endBlock??a.block)?a.end:node.textContent.length,kind,item.id);}
    }
    if(search&&!activeSearch.query)wrap(blocks[search.block],search.start,search.end,'search');
    activeSearch.matches.forEach((match,index)=>wrap(blocks[match.block],match.start,match.end,'search',String(index)));updateMatchNavigation();if(continuous())cacheScrollGeometry();
  }
  function captureSelection() {
    if(performance.now()<suppressSelectionUntil)return;
    const selected=getSelection();if(!selected||selected.isCollapsed||!selected.toString().trim()){app.querySelector('.dem-selection').hidden=true;return;}
    const range=selected.getRangeAt(0),element=node=>node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
    const first=element(range.startContainer)?.closest('.dem-block'),last=element(range.endContainer)?.closest('.dem-block');
    if(!first||!last||!content.contains(first)||!content.contains(last))return;
    const offset=(block,node,at)=>{const prefix=document.createRange();prefix.selectNodeContents(block);prefix.setEnd(node,at);return prefix.toString().length;};
    selection={block:Number(first.dataset.block),start:offset(first,range.startContainer,range.startOffset),endBlock:Number(last.dataset.block),end:offset(last,range.endContainer,range.endOffset),quote:selected.toString()};
    app.querySelector('.dem-selection').hidden=false;revealChrome();
  }
  content.addEventListener('mouseup',event=>{event.stopPropagation();captureSelection();});
  content.addEventListener('touchend',event=>{event.stopPropagation();setTimeout(captureSelection,80);},{passive:true});
  document.addEventListener('selectionchange',()=>{if(!panel.open)captureSelection();});
  app.querySelector('.dem-selection').addEventListener('pointerdown',event=>event.preventDefault());

  function openPanel(type, source=document.activeElement, options={}) {
    revealChrome();coverObserver?.disconnect();
    if(panelType==='extras') supplemental.remove();
    opener=source;panelType=type;panel.dataset.panel=type;selection=selection?{...selection}:null;panelBody.replaceChildren();
    const names={chapters:'Chapters',bookmarks:'Bookmarks',notes:'Notes',highlights:'Highlights',settings:'Reader settings',search:'Search',dictionary:'Dictionary',definitions:'Saved definitions',extras:'About & discussion',editor:'Passage note'};
    panelTitle.textContent=names[type]||type;app.querySelectorAll('.dem-nav button').forEach(el=>el.setAttribute('aria-current',String(el.dataset.action===type)));
    app.querySelectorAll('[data-action=chapters]').forEach(b=>b.setAttribute('aria-expanded',String(type==='chapters')));
    if(!panel.open)panel.showModal();
    if(type==='chapters')renderChapters();
    else if(['bookmarks','notes','highlights'].includes(type))renderRecords(type);
    else if(type==='settings')renderSettings();
    else if(type==='search')renderSearch(options);
    else if(type==='dictionary')renderDictionary();
    else if(type==='definitions')renderDefinitions();
    else if(type==='extras'){panelBody.append(supplemental);}
    requestAnimationFrame(()=>{(panelBody.querySelector('input,textarea,button,a')||panel.querySelector('button')).focus();});
  }
  function closePanel() { app.querySelectorAll('[data-action=chapters]').forEach(b=>b.setAttribute('aria-expanded','false')); panel.close();app.querySelectorAll('.dem-nav button').forEach(el=>el.removeAttribute('aria-current')); }
  panel.addEventListener('close',()=>{coverObserver?.disconnect();revealChrome();if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});else viewport.focus({preventScroll:true});});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  panel.addEventListener('click',event=>{if(event.target===panel){const r=panel.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePanel();}});
  function paragraph(text){const p=document.createElement('p');p.textContent=text;return p;}
  function passageURL(item) {return new URL(item.file+'#dem-block-'+(item.anchor?.block??0),location.href).href;}
  async function copyText(text) {
    try {await navigator.clipboard.writeText(text);return true;}catch(_){}
    const input=document.createElement('textarea');input.className='dem-copy-buffer';input.value=text;(panel.open?panelBody:app).append(input);input.select();let copied=false;
    try{copied=document.execCommand('copy');}catch(_){}input.remove();return copied;
  }
  async function sharePassage(item,copyOnly=false) {
    const quote=item.anchor?.quote;if(!quote){toast('This saved highlight has no passage text to share.');return;}
    const url=passageURL(item),text=quote+'\n\n'+item.title+' — By EARNLIGHT\n'+url;
    if(!copyOnly&&navigator.share){try{await navigator.share({title:item.title,text:quote,url});return;}catch(error){if(error.name==='AbortError')return;}}
    toast(await copyText(text)?'Passage and link copied.':'Copy is unavailable. Select the saved passage and use your browser’s Copy command.');
  }
  function exportNotes(notes,format=exportFormat) {
    if(!notes.length){toast('Select at least one note to export.');return;}
    const exportedAt=new Date().toISOString();
    const records=notes.map(note=>({id:note.id,title:note.title,chapter:note.file,url:passageURL(note),passage:note.anchor?.quote||'',note:note.text||'',createdAt:note.createdAt||null}));
    const text=format==='json'?JSON.stringify({work:'DEMAHS',version:1,exportedAt,notes:records},null,2):'DEMAHS — Personal notes\n'+exportedAt+'\n\n'+records.map((note,index)=>`${index+1}. ${note.title}\n${note.url}\n\n${note.passage?'Passage:\n'+note.passage+'\n\n':''}Note:\n${note.note}`).join('\n\n────────────────────────\n\n');
    const url=URL.createObjectURL(new Blob([text],{type:format==='json'?'application/json;charset=utf-8':'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='DEMAHS-notes-'+exportedAt.slice(0,10)+'.'+format;panelBody.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Your note export is ready.');
  }
  function syncNoteSelection() {
    const selected=panelBody.querySelector('.dem-export-selected');if(selected){const count=data.notes.filter(note=>selectedNotes.has(note.id)).length;selected.disabled=count===0;selected.textContent='Export selected'+(count?' ('+count+')':'');}
    const all=panelBody.querySelector('.dem-export-all input');if(all){const count=data.notes.filter(note=>selectedNotes.has(note.id)).length;all.checked=count===data.notes.length&&count>0;all.indeterminate=count>0&&count<data.notes.length;}
  }
  function noteExportTools() {
    const tools=document.createElement('div');tools.className='dem-note-export';
    const label=document.createElement('label');label.className='dem-export-all';const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','Select all notes');label.append(check,document.createTextNode('Select all notes'));
    check.addEventListener('change',()=>{for(const note of data.notes)if(check.checked)selectedNotes.add(note.id);else selectedNotes.delete(note.id);panelBody.querySelectorAll('[data-note-select]').forEach(input=>input.checked=check.checked);syncNoteSelection();});
    const formatLabel=document.createElement('label');formatLabel.className='dem-export-format';formatLabel.textContent='Export format';const format=document.createElement('select');format.setAttribute('aria-label','Note export format');
    for(const [value,text] of [['txt','Plain text (.txt)'],['json','JSON (.json)']]){const option=document.createElement('option');option.value=value;option.textContent=text;format.append(option);}format.value=exportFormat;format.addEventListener('change',()=>exportFormat=format.value);formatLabel.append(format);
    const all=document.createElement('button');all.type='button';all.className='dem-primary';all.textContent='Export all notes';all.addEventListener('click',()=>exportNotes(data.notes));
    const selected=document.createElement('button');selected.type='button';selected.className='dem-primary dem-export-selected';selected.textContent='Export selected';selected.addEventListener('click',()=>exportNotes(data.notes.filter(note=>selectedNotes.has(note.id))));tools.append(label,formatLabel,all,selected);return tools;
  }
  function recordCard(item,kind) {
    const card=document.createElement('div');card.className='dem-record';card.dataset.recordId=item.id;
    const jump=document.createElement('button');jump.type='button';jump.textContent=item.name||item.title;
    jump.addEventListener('click',()=>{if(item.file===file){closePanel();go(item.anchor);}else location.href=item.file+'#dem-block-'+item.anchor.block;});card.append(jump);
    const meta=document.createElement('small');meta.textContent=item.file===file?'This chapter':item.title;card.append(meta);
    if(item.anchor.quote){const quote=document.createElement('blockquote');quote.textContent=item.anchor.quote;card.append(quote);}
    if(item.text)card.append(paragraph(item.text));
    if(kind==='notes'){
      const label=document.createElement('label');label.className='dem-note-selection';const check=document.createElement('input');check.type='checkbox';check.dataset.noteSelect=item.id;check.checked=selectedNotes.has(item.id);check.setAttribute('aria-label','Select note: '+item.text.slice(0,70));
      check.addEventListener('change',()=>{if(check.checked)selectedNotes.add(item.id);else selectedNotes.delete(item.id);syncNoteSelection();});label.append(check,document.createTextNode('Select for export'));card.append(label);
    }
    const actions=document.createElement('div');actions.className='dem-record-actions';
    if(kind==='notes'||kind==='bookmarks'){const edit=document.createElement('button');edit.type='button';edit.textContent=kind==='notes'?'Edit note':'Rename';edit.addEventListener('click',()=>editRecord(item,kind));actions.append(edit);}
    if(kind==='notes'){const download=document.createElement('button');download.type='button';download.textContent='Export note';download.addEventListener('click',()=>exportNotes([item]));actions.append(download);}
    if(kind==='highlights'){
      const share=document.createElement('button');share.type='button';share.innerHTML=svg('share')+'<span>Share</span>';share.setAttribute('aria-label','Share highlighted passage');share.addEventListener('click',()=>sharePassage(item));
      const copy=document.createElement('button');copy.type='button';copy.innerHTML=svg('copy')+'<span>Copy</span>';copy.setAttribute('aria-label','Copy highlighted passage');copy.addEventListener('click',()=>sharePassage(item,true));actions.append(share,copy);
    }
    const remove=document.createElement('button');remove.type='button';
    if(['highlights','bookmarks'].includes(kind)){remove.className='dem-remove-highlight'+(kind==='bookmarks'?' dem-remove-bookmark':'');remove.innerHTML=svg('close');const label=kind==='bookmarks'?'Remove bookmark':'Remove highlight';remove.setAttribute('aria-label',label);remove.title=label;if(kind==='bookmarks')card.classList.add('dem-bookmark-card');}else remove.textContent='Remove';
    remove.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();data[kind]=data[kind].filter(x=>x.id!==item.id);selectedNotes.delete(item.id);const persisted=storeAnnotations();renderRecords(kind);if(kind==='highlights'&&persisted)toast('Highlight removed.');});actions.append(remove);card.append(actions);return card;
  }
  function renderRecords(kind) {
    panelBody.replaceChildren(paragraph('Saved on this browser. Your annotations do not change the original writing.'));
    const records=data[kind];if(!records.length){panelBody.append(paragraph(kind==='bookmarks'?'Use the bookmark button to save your current location.':'Select a passage in the manuscript to '+(kind==='notes'?'attach a note.':'highlight it.')));return;}
    if(kind==='notes')panelBody.append(noteExportTools());
    const list=document.createElement('div');list.className='dem-list';records.slice().reverse().forEach(item=>list.append(recordCard(item,kind)));panelBody.append(list);if(kind==='notes')syncNoteSelection();
  }
  function editRecord(item,kind) {
    panelBody.replaceChildren();panelTitle.textContent=kind==='notes'?'Passage note':'Rename bookmark';
    if(item.anchor.quote){const quote=document.createElement('blockquote');quote.textContent=item.anchor.quote;panelBody.append(quote);}
    const form=document.createElement('form');const label=document.createElement('label');label.className='dem-field';label.textContent=kind==='notes'?'Your note':'Bookmark name';
    const input=document.createElement(kind==='notes'?'textarea':'input');input.required=true;input.value=kind==='notes'?item.text||'':item.name||'';input.setAttribute('aria-label',kind==='notes'?'Your note':'Bookmark name');label.append(input);
    const save=document.createElement('button');save.type='submit';save.className='dem-primary';save.textContent=kind==='notes'?'Save note':'Save name';form.append(label,save);
    form.addEventListener('submit',event=>{event.preventDefault();if(!input.value.trim())return;if(kind==='notes')item.text=input.value.trim();else item.name=input.value.trim();if(!data[kind].some(x=>x.id===item.id))data[kind].push(item);storeAnnotations();panelType=kind;panelTitle.textContent=kind==='notes'?'Notes':'Bookmarks';renderRecords(kind);toast('Saved.');});panelBody.append(form);requestAnimationFrame(()=>input.focus());
  }
  function renderChapters() {
    const tools=document.createElement('details');tools.className='dem-mobile-tools';const summary=document.createElement('summary');summary.textContent='Bookmarks, notes & reading tools';const mobile=document.createElement('nav');mobile.className='dem-mobile-nav dem-nav';mobile.setAttribute('aria-label','Reading tools');mobile.innerHTML=nav();tools.append(summary,mobile);panelBody.append(tools,createWritingSearch());
    const label=document.createElement('label');label.className='dem-field';label.textContent='Find a chapter';const input=document.createElement('input');input.type='search';input.setAttribute('aria-label','Find a chapter');label.append(input);panelBody.append(label);
    const routes=document.createElement('nav');routes.className='dem-chapter-routes';routes.setAttribute('aria-label','Chapter navigation');
    for(const [route,label] of [[current.previous,'← Previous chapter'],['library.html','Library'],[current.next,'Next chapter →']])if(route){const a=document.createElement('a');a.href=route;a.textContent=label;routes.append(a);}panelBody.append(routes);
    const list=document.createElement('nav');list.className='dem-chapter-shelf';list.setAttribute('aria-label','Chapter list');panelBody.append(list);
    coverObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const image=entry.target;image.src=image.dataset.src;coverObserver?.unobserve(image);}},{root:panelBody,rootMargin:'150px'}):null;
    function render(){coverObserver?.disconnect();list.replaceChildren();let section='';const matches=catalog.filter(item=>item.title.toLowerCase().includes(input.value.toLowerCase()));matches.forEach(item=>{
      if(item.section!==section){section=item.section;const head=document.createElement('h3');head.className='dem-section-label';head.textContent=section;list.append(head);}
      const link=document.createElement('a');link.className='dem-chapter-link';link.href=item.file;
      const img=document.createElement('img');img.dataset.src=item.cover;if(!coverObserver)img.src=item.cover;img.alt='';img.width=1024;img.height=1536;img.loading='lazy';img.decoding='async';
      const name=document.createElement('span');name.className='dem-shelf-title';name.textContent=item.title;
      const meta=document.createElement('span');meta.className='dem-shelf-meta';const saved=positions.entries[item.file];meta.textContent=item.file===file?'Reading now'+(saved?' · '+Math.round(saved.progress)+'%':''):saved?Math.round(saved.progress)+'% read':'Open chapter';
      link.append(img,name,meta);coverObserver?.observe(img);if(item.file===file)link.setAttribute('aria-current','page');list.append(link);
    });if(!matches.length)list.append(paragraph('No chapters match your search.'));}
    input.addEventListener('input',render);render();refreshCounts();
  }
  function renderSettings() {
    panelBody.innerHTML='<p>Shape a quiet space for the written word.</p><label class="dem-field"><span>Reading appearance</span><div class="dem-choice">'+['light','sepia','dark'].map(mode=>`<button type="button" data-mode="${mode}" aria-pressed="${prefs.mode===mode}">${mode[0].toUpperCase()+mode.slice(1)}</button>`).join('')+'</div></label>';
    const layout=document.createElement('fieldset');layout.className='dem-layout-choice';const legend=document.createElement('legend');legend.textContent='Reading layout';const options=document.createElement('div');options.className='dem-choice';
    for(const [view,label] of [['pages','Pages'],['scroll','Continuous scroll']]){const button=document.createElement('button');button.type='button';button.dataset.view=view;button.textContent=label;button.setAttribute('aria-pressed',String(prefs.view===view));button.addEventListener('click',()=>{const anchor=!continuous()&&pageIndex===0?{block:0,char:0,opening:true}:anchorNow();prefs.view=view;applyPrefs(true,anchor);options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});options.append(button);}layout.append(legend,options);panelBody.prepend(layout);
    for(const [key,label,min,max,step,unit] of [['size','Font size',16,30,1,'px'],['line','Line spacing',1.4,2.3,.1,''],['width','Reading width',45,84,1,'ch'],['art','Artwork intensity',0,1,.1,'']]) {
      const field=document.createElement('label');field.className='dem-field';const text=document.createElement('span');text.textContent=label;const output=document.createElement('output');output.textContent=prefs[key]+unit;text.append(output);
      const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=prefs[key];input.setAttribute('aria-label',label);input.addEventListener('input',()=>{prefs[key]=Number(input.value);output.textContent=input.value+unit;applyPrefs();});field.append(text,input);panelBody.append(field);
    }
    panelBody.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{prefs.mode=button.dataset.mode;applyPrefs();panelBody.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
  }
  function chapterMatches(query){
    // Literal search: regular-expression punctuation is treated as writing.
    const pattern=new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu'),matches=[];
    for(const node of blocks.filter(node=>content.contains(node))){pattern.lastIndex=0;let found;while(found=pattern.exec(node.textContent)){matches.push({block:Number(node.dataset.block),start:found.index,end:found.index+found[0].length});if(!found[0].length)break;}}
    return matches;
  }
  function setChapterSearch(query,index=0,all=activeSearch.all||false){activeSearch={query,matches:query?chapterMatches(query):[],index,all};refreshMarks();}
  function updateMatchNavigation(){
    const nav=app.querySelector('.dem-find-nav'),count=activeSearch.matches.length;nav.hidden=count===0;
    if(count){activeSearch.index=((activeSearch.index%count)+count)%count;nav.querySelector('.dem-find-count').textContent=(activeSearch.index+1)+' of '+count+' · '+activeSearch.query;}
    content.querySelectorAll('mark[data-kind=search]').forEach(mark=>{const current=Number(mark.dataset.record)===activeSearch.index;mark.classList.toggle('dem-current-match',current);if(current)mark.setAttribute('aria-current','true');else mark.removeAttribute('aria-current');});
  }
  function goToMatch(index){
    if(!activeSearch.matches.length)return;activeSearch.index=((index%activeSearch.matches.length)+activeSearch.matches.length)%activeSearch.matches.length;
    if(panel.open)closePanel();const match=activeSearch.matches[activeSearch.index];updateMatchNavigation();go({block:match.block,char:match.start});revealChrome();
  }
  function rememberSearch(query,all){searchHistory=[{query,all,at:Date.now()},...searchHistory.filter(item=>typeof item.query==='string'&&(item.query.toLowerCase()!==query.toLowerCase()||!!item.all!==all))].slice(0,12);write(historyKey,searchHistory);}
  function renderSearch({query=activeSearch.query,all=activeSearch.all||false}={}) {
    panelBody.innerHTML='<form class="dem-search-form"><input type="search" aria-label="Search text" placeholder="A word, a passage, an idea…" required><button class="dem-primary" type="submit">Search</button></form><label class="dem-search-scope"><input type="checkbox"> Search the complete work</label><details class="dem-search-history" aria-label="Previous searches"></details><p class="dem-search-status" role="status">Search this chapter or all chapters and introductory manuscripts.</p><div class="dem-search-results dem-list"></div>';
    const form=panelBody.querySelector('form'),input=form.querySelector('input'),scope=panelBody.querySelector('[type=checkbox]'),status=panelBody.querySelector('.dem-search-status'),results=panelBody.querySelector('.dem-search-results'),history=panelBody.querySelector('.dem-search-history');let generation=0,initialIndex=query===activeSearch.query?activeSearch.index:0;input.value=query;scope.checked=all;
    function renderHistory(){
      history.replaceChildren();const heading=document.createElement('summary');heading.textContent='Previous searches'+(searchHistory.length?' ('+searchHistory.length+')':'');history.append(heading);
      if(!searchHistory.length){history.append(paragraph('Your previous searches will appear here.'));return;}
      const list=document.createElement('div');list.className='dem-history-list';
      searchHistory.forEach(item=>{if(typeof item.query!=='string')return;const button=document.createElement('button');button.type='button';button.className='dem-history-query';const term=document.createElement('span');term.textContent=item.query;const where=document.createElement('small');where.textContent=item.all?'Complete work':'This chapter';button.append(term,where);button.addEventListener('click',()=>{input.value=item.query;scope.checked=!!item.all;form.requestSubmit();});list.append(button);});
      const clear=document.createElement('button');clear.type='button';clear.className='dem-text-button';clear.textContent='Clear previous searches';clear.addEventListener('click',()=>{searchHistory=[];write(historyKey,searchHistory);renderHistory();});history.append(list,clear);
    }
    form.addEventListener('submit',async event=>{event.preventDefault();const query=input.value.trim();if(!query)return;rememberSearch(query,scope.checked);renderHistory();history.open=false;setChapterSearch(query,initialIndex,scope.checked);initialIndex=0;panelBody.querySelector('.dem-open-matches')?.remove();const thisSearch=++generation;results.replaceChildren();status.textContent='Searching…';
      try {
        const index=scope.checked?await getIndex():blocks.filter(node=>content.contains(node)).map(node=>({file,title,text:node.textContent,block:Number(node.dataset.block)}));if(thisSearch!==generation)return;
        const matches=index.filter(unit=>unit.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()));status.textContent=scope.checked?matches.length+' matching passages in the complete work · '+activeSearch.matches.length+' matches in this chapter.':activeSearch.matches.length+' matches in this chapter.';
        matches.slice(0,100).forEach(unit=>{
          const card=document.createElement('div');card.className='dem-record';const a=document.createElement('a');a.textContent=unit.title;a.href=unit.file+(catalog.some(item=>item.file===unit.file)?'?find=':'#:~:text=')+encodeURIComponent(query);
          if(unit.file===file)a.addEventListener('click',event=>{event.preventDefault();const node=blocks[unit.block]||blocks.find(n=>n.textContent.includes(unit.text));if(!node)return;const match=activeSearch.matches.findIndex(m=>m.block===Number(node.dataset.block));if(match>=0)goToMatch(match);});
          const snippet=document.createElement('small'),at=unit.text.toLowerCase().indexOf(query.toLowerCase());snippet.textContent=(at>60?'…':'')+unit.text.slice(Math.max(0,at-60),at+query.length+110);card.append(a,snippet);results.append(card);
        });
        if(matches.length>100)results.append(paragraph('Showing the first 100 matching passages.'));
        if(activeSearch.matches.length){const go=document.createElement('button');go.type='button';go.className='dem-primary dem-open-matches';go.textContent='Read chapter matches';go.addEventListener('click',()=>goToMatch(0));status.after(go);}
      }catch(_){status.textContent='Some chapters could not be loaded. Please try again when connected.';}
    });
    renderHistory();if(query)form.requestSubmit();
  }
  async function getIndex() {
    if(!searchIndexPromise)searchIndexPromise=(async()=>{
      const works=[{file:'introduction.html',title:'Introduction'},{file:'foreword.html',title:'Foreword'},{file:'authors-notes.html',title:"Author's Notes"},...catalog];
      const index=[];let cursor=0;
      async function worker(){while(cursor<works.length){
        const item=works[cursor++],response=await fetch(item.file);if(!response.ok)throw new Error('Chapter unavailable');
        const doc=new DOMParser().parseFromString(await response.text(),'text/html');
        const script=[...doc.scripts].map(s=>s.textContent).find(s=>/const CHAPTER_TEXT\s*=/.test(s))||'';
        const match=script.match(/const CHAPTER_TEXT\s*=\s*`([\s\S]*?)`\s*;/);
        const paragraphs=match?.[1].trim()?match[1].trim().split(/\n{2,}/):[...doc.querySelectorAll('.page:not(.page-cover) .page-body,.manuscript')].map(n=>n.textContent);
        paragraphs.filter(Boolean).forEach(text=>index.push({file:item.file,title:item.title,text}));
      }}
      await Promise.all(Array.from({length:5},worker));return index;
    })().catch(error=>{searchIndexPromise=null;throw error;});return searchIndexPromise;
  }
  function createWritingSearch() {
    const form=document.createElement('form');form.className='dem-writing-search';form.setAttribute('role','search');
    const label=document.createElement('label');label.textContent='Search the writing';
    const row=document.createElement('div');row.className='dem-writing-search-row';
    const input=document.createElement('input');input.type='search';input.required=true;input.placeholder='A word or phrase…';input.setAttribute('aria-label','Search the writing');
    const submit=document.createElement('button');submit.type='submit';submit.className='dem-icon';submit.setAttribute('aria-label','Search writing');submit.title='Search writing';submit.innerHTML=svg('search');row.append(input,submit);label.append(row);
    const scopeLabel=document.createElement('label');scopeLabel.className='dem-scope-label';scopeLabel.textContent='Search in';const scope=document.createElement('select');scope.setAttribute('aria-label','Writing search scope');
    for(const [value,text] of [['chapter','This chapter'],['collection','The complete work']]){const option=document.createElement('option');option.value=value;option.textContent=text;scope.append(option);}scopeLabel.append(scope);
    form.append(label,scopeLabel);form.addEventListener('submit',event=>{event.preventDefault();const query=input.value.trim();if(query)openPanel('search',submit,{query,all:scope.value==='collection'});});return form;
  }
  function safeSource(value) {try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch(_){return '';}}
  function definitionCard(record,saved=false) {
    const card=document.createElement('div');card.className='dem-record dem-definition-card';card.dataset.definitionWord=record.word;
    const heading=document.createElement('h3');heading.textContent=record.word;const part=document.createElement('small');part.textContent=record.partOfSpeech;card.append(heading,part,paragraph(record.definition));
    if(record.example){const example=document.createElement('blockquote');example.textContent=record.example;card.append(example);}
    const source=document.createElement('a');source.className='dem-definition-source';source.textContent='Dictionary source';source.href=safeSource(record.source)||'https://dictionaryapi.dev/';source.target='_blank';source.rel='noopener noreferrer';card.append(source);
    if(record.license?.name){const license=document.createElement('small');license.textContent='License: '+record.license.name;if(safeSource(record.license.url)){const a=document.createElement('a');a.href=safeSource(record.license.url);a.textContent=' · View license';a.target='_blank';a.rel='noopener noreferrer';license.append(a);}card.append(license);}
    const actions=document.createElement('div');actions.className='dem-record-actions';const button=document.createElement('button');button.type='button';
    if(saved){button.textContent='Remove';button.setAttribute('aria-label','Remove saved definition of '+record.word);button.addEventListener('click',()=>{data.definitions=data.definitions.filter(item=>item.id!==record.id);write(dataKey,data);refreshCounts();renderDefinitions();});}
    else {
      const exists=()=>data.definitions.some(item=>item.word.toLowerCase()===record.word.toLowerCase()&&item.definition===record.definition);
      button.textContent=exists()?'Saved':'Save definition';button.disabled=exists();button.setAttribute('aria-label','Save definition of '+record.word);
      button.addEventListener('click',()=>{if(!exists())data.definitions.push({...record,id:uid(),savedAt:Date.now()});const persisted=write(dataKey,data);refreshCounts();button.textContent='Saved';button.disabled=true;if(persisted)toast('Definition saved.');});
    }
    actions.append(button);card.append(actions);return card;
  }
  function renderDefinitions() {
    panelBody.replaceChildren(paragraph('Your saved definitions are kept on this browser and remain available offline.'));
    if(!data.definitions.length){panelBody.append(paragraph('Look up a word in Dictionary, then choose Save definition.'));return;}
    const list=document.createElement('div');list.className='dem-list';data.definitions.slice().reverse().forEach(record=>list.append(definitionCard(record,true)));panelBody.append(list);
  }
  function renderDictionary(word='') {
    panelBody.innerHTML='<p>Look up a word and save the definitions you want to keep.</p><form class="dem-search-form"><input type="text" aria-label="Word to define" placeholder="Select or enter a word" required><button class="dem-primary" type="submit">Define</button></form><button type="button" class="dem-text-button" data-action="definitions">Saved definitions</button><div class="dem-definition" role="status"></div>';
    const form=panelBody.querySelector('form'),input=form.querySelector('input'),result=panelBody.querySelector('.dem-definition');input.value=word;let generation=0;
    form.addEventListener('submit',async event=>{
      event.preventDefault();const term=input.value.trim();if(!term)return;const request=++generation;result.textContent='Looking up '+term+'…';
      try {
        const endpoint='https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(term),response=await fetch(endpoint);if(!response.ok)throw new Error('No definition available');
        const entries=await response.json();if(request!==generation)return;result.replaceChildren();let count=0;
        for(const entry of entries)for(const meaning of entry.meanings||[])for(const definition of meaning.definitions||[]){
          if(count>=7)continue;if(typeof definition.definition!=='string'||!definition.definition.trim())continue;count++;
          result.append(definitionCard({word:entry.word||term,partOfSpeech:meaning.partOfSpeech||'',definition:definition.definition,example:definition.example||'',source:(entry.sourceUrls||[]).map(safeSource).find(Boolean)||endpoint,license:definition.license||meaning.license||entry.license||null}));
        }
        if(!count)throw new Error('No definitions');
      }catch(_){if(request===generation)result.textContent='A definition is not available right now. Check the word or your connection and try again.';}
    });
    if(word)form.requestSubmit();
  }
  function addBookmark() {
    const anchor=anchorNow(),existing=data.bookmarks.find(item=>item.file===file&&pageForAnchor(item.anchor)===pageIndex);
    if(existing){data.bookmarks=data.bookmarks.filter(item=>item!==existing);toast('Bookmark removed.');}
    else {const text=blocks[anchor.block]?.textContent.trim();data.bookmarks.push({id:uid(),file,title,name:text?text.slice(0,65):title,anchor,createdAt:Date.now()});toast('Location bookmarked.');}storeAnnotations();updateProgress();
  }
  function mobileReader(){return matchMedia('(max-width:760px), (max-height:500px) and (max-width:1000px)').matches;}
  function setChromeHidden(hidden) {
    app.classList.toggle('dem-chrome-hidden',hidden);
    chromeBars.forEach(bar=>{bar.inert=hidden;if(hidden)bar.setAttribute('aria-hidden','true');else bar.removeAttribute('aria-hidden');});
  }
  function revealChrome(keyboard=false) {
    clearTimeout(chromeTimer);setChromeHidden(false);if(keyboard)keyboardChrome=true;
    if(!fullscreen||!mobileReader())return;
    chromeTimer=setTimeout(()=>{const active=document.activeElement,selected=getSelection();if(panel.open||keyboardChrome||active?.matches('input,textarea,select')||(selected&&!selected.isCollapsed))return;setChromeHidden(true);},1100);
  }
  app.addEventListener('pointerdown',event=>{keyboardChrome=false;if(!event.target.closest('.dem-scroll'))revealChrome();},{capture:true,passive:true});
  app.addEventListener('focusin',event=>{if(event.target.closest('.dem-top,.dem-bottom'))revealChrome();});
  function nativeElement(){return document.fullscreenElement||document.webkitFullscreenElement;}
  function syncFullscreen(){
    const vv=window.visualViewport;
    for(const [name,value] of Object.entries({height:vv?.height||innerHeight,width:vv?.width||innerWidth,top:vv?.offsetTop||0,left:vv?.offsetLeft||0}))app.style.setProperty('--dem-visible-'+name,value+'px');
  }
  function fullscreenButton(){const button=app.querySelector('[data-action=fullscreen]'),label=fullscreen?'Exit distraction-free fullscreen':'Enter distraction-free fullscreen';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(fullscreen));button.innerHTML=fullscreen?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/></svg>':svg('full');}
  async function enterFullscreen(){
    const anchor=lastAnchor;pageInput.blur();releasePageJump(true);fullscreen=true;document.body.classList.add('dem-fullscreen');syncFullscreen();fullscreenButton();schedulePagination(anchor);revealChrome();
    const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
    if(!standalone){try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});else if(document.documentElement.webkitRequestFullscreen)await document.documentElement.webkitRequestFullscreen();nativeFullscreen=!!nativeElement();}catch(_){}}
    if(!fullscreen&&nativeElement()){try{await (document.exitFullscreen?.()||document.webkitExitFullscreen?.());}catch(_){}return;}
    if(!standalone&&!nativeFullscreen&&matchMedia('(max-width:760px)').matches)toast('Reader expanded. On iPhone, open from your Home Screen to hide browser bars.');
    syncFullscreen();schedulePagination(anchor);revealChrome();
  }
  function exitFullscreen(){const anchor=lastAnchor;pageInput.blur();releasePageJump(true);clearTimeout(chromeTimer);setChromeHidden(false);fullscreen=false;nativeFullscreen=false;document.body.classList.remove('dem-fullscreen');if(nativeElement()){try{Promise.resolve(document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?.()).catch(()=>{});}catch(_){}}fullscreenButton();syncFullscreen();schedulePagination(anchor);}
  function nativeChange(){if(nativeElement())nativeFullscreen=true;else if(nativeFullscreen)exitFullscreen();syncFullscreen();schedulePagination();}
  document.addEventListener('fullscreenchange',nativeChange);document.addEventListener('webkitfullscreenchange',nativeChange);
  app.addEventListener('click',async event=>{
    const target=event.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;
    if(action==='previous-match')goToMatch(activeSearch.index-1);
    else if(action==='next-match')goToMatch(activeSearch.index+1);
    else if(action==='clear-find'){activeSearch={query:'',matches:[],index:0};refreshMarks();}
    else if(action==='show-controls')revealChrome();
    else if(action==='close')closePanel();
    else if(action==='previous-page')showPage(pageIndex-1,true);
    else if(action==='next-page')showPage(pageIndex+1,true);
    else if(action==='continue'){const targetFile=positions.last||legacyLast?.file;if(targetFile&&targetFile!==file)location.href=targetFile+'?resume=1';else {if(panel.open)closePanel();go(positions.entries[file]?.anchor||{block:0});}}
    else if(action==='bookmark')addBookmark();
    else if(action==='mode'){prefs.mode=['light','sepia','dark'][(['light','sepia','dark'].indexOf(prefs.mode)+1)%3];applyPrefs();toast(prefs.mode[0].toUpperCase()+prefs.mode.slice(1)+' reading appearance.');}
    else if(action==='fullscreen'){if(fullscreen)exitFullscreen();else await enterFullscreen();}
    else if(action==='highlight'&&selection){data.highlights.push({id:uid(),file,title,anchor:{...selection},createdAt:Date.now()});storeAnnotations();getSelection()?.removeAllRanges();app.querySelector('.dem-selection').hidden=true;toast('Passage highlighted.');}
    else if(action==='note'&&selection){const anchor={...selection};openPanel('editor',target);editRecord({id:uid(),file,title,anchor,createdAt:Date.now()},'notes');}
    else if(action==='define-selection'&&selection){const word=selection.quote.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'');if(/\s/.test(word)){toast('Select a single word to look it up.');return;}openPanel('dictionary',target);renderDictionary(word);}
    else if(action==='share'&&selection){const url=new URL(file+'#dem-block-'+selection.block,location.href).href;try{if(navigator.share)await navigator.share({title,text:selection.quote,url});else{await navigator.clipboard.writeText(selection.quote+'\n\n'+title+' — By EARNLIGHT\n'+url);toast('Passage and link copied.');}}catch(error){if(error.name!=='AbortError')toast('Sharing is unavailable here. Use Copy instead.');}}
    else if(action==='copy'&&selection){try{await navigator.clipboard.writeText(selection.quote);toast('Passage copied.');}catch(_){toast('Copy is unavailable here. Use your browser’s Copy command.');}}
    else if(['chapters','bookmarks','notes','highlights','settings','search','dictionary','definitions','extras'].includes(action))openPanel(action,target);
  });
  // Capture before the legacy page-turn shortcuts; they must not change hidden pages.
  window.addEventListener('keydown',event=>{
    if(!document.body.classList.contains('dem-active'))return;
    if(event.key==='Tab')revealChrome(true);
    if(event.key==='Escape'){event.stopImmediatePropagation();if(panel.open){event.preventDefault();closePanel();}else if(fullscreen)exitFullscreen();else app.querySelector('.dem-selection').hidden=true;}
    if(['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(event.key)){
      event.stopImmediatePropagation();if(panel.open||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
      event.preventDefault();if(event.altKey){const route=event.key==='ArrowLeft'?current.previous:current.next;if(route)location.href=route;return;}
      showPage(event.key==='Home'?0:event.key==='End'?pageCount-1:pageIndex+(['ArrowLeft','PageUp'].includes(event.key)?-1:1),true);
    }
  },true);
  document.fonts.ready.then(()=>requestAnimationFrame(()=>{
    const query=new URLSearchParams(location.search),hash=location.hash.match(/^#dem-block-(\d+)$/),page=Number(query.get('page'));
    let anchor=hash?{block:Number(hash[1])}:positions.entries[file]?.anchor;
    if(query.has('page')){const node=segments.find(s=>Number(s.dataset.legacyPage)===page)?.querySelector('.dem-block');anchor={block:Number(node?.dataset.block||0)};}
    if(!anchor&&query.get('resume')==='1'&&legacyLast?.file===file){const node=segments.find(s=>Number(s.dataset.legacyPage)===legacyLast.page)?.querySelector('.dem-block');anchor={block:Number(node?.dataset.block||0)};}
    paginate(anchor||{block:0,char:0});
    if(query.get('find')){const term=query.get('find'),node=blocks.find(n=>content.contains(n)&&n.textContent.toLowerCase().includes(term.toLowerCase()));if(node){const at=node.textContent.toLowerCase().indexOf(term.toLowerCase());setChapterSearch(term);const match=activeSearch.matches.findIndex(item=>item.block===Number(node.dataset.block)&&item.start===at);if(match>=0)goToMatch(match);}}
    updateProgress();suppressSave=false;
  }));
  // Future narration can consume real paragraph anchors and aligned timing data.
  // No audio is generated, and no approximate word timers are simulated.
  window.DemahsReader=Object.freeze({file,getBlocks:()=>blocks.filter(n=>content.contains(n)).map(n=>({id:n.id,text:n.textContent})),goToAnchor:anchor=>go(anchor),getPosition:anchorNow,getPagination:()=>({page:pageIndex+1,total:pageCount,ready:paginationReady,view:prefs.view}),goToPage:page=>showPage(page-1,true)});
})();
