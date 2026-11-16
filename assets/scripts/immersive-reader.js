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
  const prefs = Object.assign({ mode: 'sepia', size: 21, line: 1.8, width: 65, art: 1 }, read(prefKey, {}));
  if (!['light', 'sepia', 'dark'].includes(prefs.mode)) prefs.mode = 'sepia';
  const data = Object.assign({ bookmarks: [], highlights: [], notes: [], imported: [] }, read(dataKey, {}));
  for (const key of ['bookmarks', 'highlights', 'notes', 'imported']) if (!Array.isArray(data[key])) data[key] = [];
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
  const nav = () => [['continue','play','Continue Reading'],['chapters','chapters','Chapters'],['bookmarks','bookmark','Bookmarks'],['notes','note','Notes'],['highlights','highlight','Highlights'],['dictionary','dictionary','Dictionary'],['settings','settings','Settings']].map(([action,icon,label]) => `<button type="button" data-action="${action}">${svg(icon)}<span>${label}</span>${['bookmarks','notes','highlights'].includes(action)?`<span class="dem-count" data-count="${action}"></span>`:''}</button>`).join('');
  const app = document.createElement('div'); app.id = 'dem-app'; app.className = 'dem-app'; app.dataset.mode = prefs.mode;
  app.innerHTML = `<a class="dem-skip" href="#dem-reading">Skip to chapter text</a>
    <header class="dem-top"><div style="display:flex;align-items:center;gap:5px">${button('chapters','menu','Open reader navigation','dem-menu')}<a class="dem-brand" href="library.html" aria-label="DEMAHS library">${crown}<span>DEMAHS <small>THE MANUSCRIPT READER</small></span></a></div><span class="dem-top-title">${esc(title)} <span aria-hidden="true" style="color:#766147;margin-inline:14px">/</span> By EARNLIGHT</span><nav class="dem-actions" aria-label="Reader actions">${button('search','search','Search chapters')}${button('bookmark','bookmark','Bookmark this location')}${button('settings','settings','Reader settings','dem-settings-top')}</nav></header>
    <div class="dem-workspace"><aside class="dem-sidebar" aria-label="Reader navigation"><div class="dem-cover"><img src="${esc(current.cover)}" alt="" width="1024" height="1536"><span>${esc(title)}</span></div><p class="dem-sidebar-label">YOUR READING ROOM</p><nav class="dem-nav">${nav()}</nav><div class="dem-sidebar-foot">✦<a href="library.html">Return to the library</a><button class="dem-text-button" type="button" data-action="extras">About &amp; discussion</button></div></aside>
    <main id="dem-reading" class="dem-scroll" tabindex="0" aria-label="${esc(title)} manuscript"><article class="dem-manuscript" aria-labelledby="dem-title"><div class="dem-panorama" aria-hidden="true"><picture><source media="(max-width:760px)" srcset="assets/images/celestial-realm-mobile.webp"><img src="assets/images/celestial-realm.webp" width="1585" height="992" alt="" decoding="async"></picture></div><header class="dem-chapter-heading"><div class="dem-kicker"></div><h1 id="dem-title">${esc(title)}</h1><div class="dem-ornament" aria-hidden="true">✦</div></header><div class="dem-reading-content" id="dem-content"></div><div class="dem-end"><span aria-hidden="true">❧</span>End of ${esc(title)}</div></article></main></div>
    <footer class="dem-bottom"><div class="dem-bottom-side"><a class="dem-text-button dem-prev" aria-label="Previous chapter">${svg('left')}<span class="dem-label">Previous chapter</span></a><button class="dem-text-button dem-bottom-chapters" type="button" data-action="chapters">${svg('chapters')}<span class="dem-label">Chapters</span></button></div><div class="dem-progress"><div class="dem-progress-line" role="progressbar" aria-label="Chapter reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><label class="dem-progress-label">0% of chapter</label></div><div class="dem-bottom-side">${button('settings','settings','Font and appearance settings','dem-width-control')}${button('mode','sun','Change reading appearance')}${button('fullscreen','full','Enter distraction-free fullscreen')}<a class="dem-text-button dem-next" aria-label="Next chapter"><span class="dem-label">Next chapter</span>${svg('right')}</a></div></footer>
    <dialog class="dem-panel" aria-labelledby="dem-panel-title"><header class="dem-panel-header"><h2 id="dem-panel-title"></h2>${button('close','close','Close panel')}</header><div class="dem-panel-body"></div></dialog>
    <div class="dem-selection" role="toolbar" aria-label="Selected passage actions" hidden><button type="button" data-action="highlight">${svg('highlight')}Highlight</button><button type="button" data-action="note">${svg('note')}Note</button><button type="button" data-action="define-selection">${svg('dictionary')}Define</button><button type="button" data-action="copy">${svg('copy')}Copy</button><button type="button" data-action="share">${svg('share')}Share</button></div><div class="dem-toast" role="status" aria-live="polite" hidden></div>`;
  document.body.append(app);
  const viewport = app.querySelector('.dem-scroll'), content = app.querySelector('#dem-content'), panel = app.querySelector('dialog'), panelBody = app.querySelector('.dem-panel-body'), panelTitle = app.querySelector('#dem-panel-title');
  const blocks = [], segments = [], supplemental = document.createElement('div');
  let selection = null, toastTimer, saveTimer, scrollFrame, panelType = '', opener = null, fullscreen = false, nativeFullscreen = false, searchIndexPromise;
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
  const previous = app.querySelector('.dem-prev'), next = app.querySelector('.dem-next');
  if (current.previous) previous.href = current.previous; else { previous.setAttribute('aria-disabled','true'); previous.hidden = true; }
  if (current.next) next.href = current.next; else { next.setAttribute('aria-disabled','true'); next.hidden = true; }
  document.body.classList.remove('realm-page','realm-reader'); document.body.classList.add('dem-active'); document.body.style.overflow = '';
  window.DemahsReaderBoot?.finish();
  syncFullscreen(); applyPrefs(false); importLegacy(); refreshMarks(); refreshCounts();

  function read(key, fallback) { try { const value=JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch (_) { return fallback; } }
  function readLegacy(key,fallback){try{const stored=window.DemahsReaderBoot?.savedValues[key];return stored!==undefined?JSON.parse(stored):read(key,fallback);}catch(_){return fallback;}}
  function write(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch (_) { toast('Browser storage is unavailable. Changes will last for this session.'); return false; } }
  function uid() { return crypto.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2); }
  function toast(message) { const el=app.querySelector('.dem-toast'); el.textContent=message; el.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{el.hidden=true;},3500); }
  function anchorNow() {
    const top=viewport.getBoundingClientRect().top+36;
    const candidates=blocks.filter(node=>content.contains(node));
    const node=candidates.find(node=>node.getBoundingClientRect().bottom>top)||candidates.at(-1);
    return node ? {block:Number(node.dataset.block),offset:top-node.getBoundingClientRect().top} : {block:0,offset:0};
  }
  function go(anchor, smooth=true) {
    const node=blocks[anchor?.block];
    if(node && content.contains(node)) viewport.scrollTo({top:viewport.scrollTop+node.getBoundingClientRect().top-viewport.getBoundingClientRect().top-36+(anchor.offset||0),behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
    else viewport.scrollTo({top:0,behavior:'instant'});
    viewport.focus({preventScroll:true}); updateProgress();
  }
  function updateProgress() {
    const distance=viewport.scrollHeight-viewport.clientHeight;
    const progress=!hasChapterText?0:distance>0 ? Math.max(0,Math.min(100,Math.round(viewport.scrollTop/distance*100))) : 100;
    app.querySelector('.dem-progress-line span').style.width=progress+'%'; app.querySelector('.dem-progress-line').setAttribute('aria-valuenow',progress); app.querySelector('.dem-progress-label').textContent=hasChapterText?progress+'% of chapter':'No chapter text yet';
    const marked=data.bookmarks.some(item=>item.file===file&&item.anchor.block===anchorNow().block);
    app.querySelector('[data-action="bookmark"]').setAttribute('aria-pressed',String(marked));
    app.dispatchEvent(new CustomEvent('demahs:reading-position',{detail:{file,anchor:anchorNow(),progress}}));
    if(!suppressSave) { clearTimeout(saveTimer); saveTimer=setTimeout(savePosition,160); }
  }
  function savePosition() { positions.entries[file]={anchor:anchorNow(),progress:Number(app.querySelector('.dem-progress-line').getAttribute('aria-valuenow')),title,updatedAt:Date.now()};positions.last=file;write(positionKey,positions); }
  viewport.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateProgress();});},{passive:true});
  window.addEventListener('resize',()=>{syncFullscreen();updateProgress();});
  window.visualViewport?.addEventListener('resize',()=>{syncFullscreen();updateProgress();});
  window.visualViewport?.addEventListener('scroll',syncFullscreen);
  window.addEventListener('pagehide',()=>{if(!suppressSave)savePosition();});

  function applyPrefs(persist=true) {
    const limits={size:[16,30],line:[1.4,2.3],width:[45,84],art:[0,1]};
    for(const [key,[min,max]] of Object.entries(limits)) prefs[key]=Math.min(max,Math.max(min,Number(prefs[key])||min));
    app.dataset.mode=prefs.mode;app.style.setProperty('--font-size',prefs.size+'px');app.style.setProperty('--line-height',prefs.line);app.style.setProperty('--reading-width',prefs.width+'ch');app.style.setProperty('--art-strength',prefs.art);
    if(persist)write(prefKey,prefs);requestAnimationFrame(updateProgress);
  }
  function refreshCounts() { app.querySelectorAll('[data-count]').forEach(el=>{el.textContent=data[el.dataset.count].filter(item=>item.file===file).length;}); }
  function storeAnnotations() { write(dataKey,data);refreshCounts();refreshMarks(); }
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
    if(search)wrap(blocks[search.block],search.start,search.end,'search');
  }
  function captureSelection() {
    const selected=getSelection();if(!selected||selected.isCollapsed||!selected.toString().trim()){app.querySelector('.dem-selection').hidden=true;return;}
    const range=selected.getRangeAt(0),element=node=>node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
    const first=element(range.startContainer)?.closest('.dem-block'),last=element(range.endContainer)?.closest('.dem-block');
    if(!first||!last||!content.contains(first)||!content.contains(last))return;
    const offset=(block,node,at)=>{const prefix=document.createRange();prefix.selectNodeContents(block);prefix.setEnd(node,at);return prefix.toString().length;};
    selection={block:Number(first.dataset.block),start:offset(first,range.startContainer,range.startOffset),endBlock:Number(last.dataset.block),end:offset(last,range.endContainer,range.endOffset),quote:selected.toString()};
    app.querySelector('.dem-selection').hidden=false;
  }
  content.addEventListener('mouseup',event=>{event.stopPropagation();captureSelection();});
  content.addEventListener('touchend',event=>{event.stopPropagation();setTimeout(captureSelection,80);},{passive:true});
  document.addEventListener('selectionchange',()=>{if(!panel.open)captureSelection();});
  app.querySelector('.dem-selection').addEventListener('pointerdown',event=>event.preventDefault());

  function openPanel(type, source=document.activeElement) {
    if(panelType==='extras') supplemental.remove();
    opener=source;panelType=type;selection=selection?{...selection}:null;panelBody.replaceChildren();
    const names={chapters:'Chapters',bookmarks:'Bookmarks',notes:'Notes',highlights:'Highlights',settings:'Reader settings',search:'Search',dictionary:'Dictionary',extras:'About & discussion',editor:'Passage note'};
    panelTitle.textContent=names[type]||type;app.querySelectorAll('.dem-nav button').forEach(el=>el.setAttribute('aria-current',String(el.dataset.action===type)));
    app.querySelectorAll('[data-action=chapters]').forEach(b=>b.setAttribute('aria-expanded',String(type==='chapters')));
    if(!panel.open)panel.showModal();
    if(type==='chapters')renderChapters();
    else if(['bookmarks','notes','highlights'].includes(type))renderRecords(type);
    else if(type==='settings')renderSettings();
    else if(type==='search')renderSearch();
    else if(type==='dictionary')renderDictionary();
    else if(type==='extras'){panelBody.append(supplemental);}
    requestAnimationFrame(()=>{(panelBody.querySelector('input,textarea,button,a')||panel.querySelector('button')).focus();});
  }
  function closePanel() { app.querySelectorAll('[data-action=chapters]').forEach(b=>b.setAttribute('aria-expanded','false')); panel.close();app.querySelectorAll('.dem-nav button').forEach(el=>el.removeAttribute('aria-current')); }
  panel.addEventListener('close',()=>{if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});else viewport.focus({preventScroll:true});});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  panel.addEventListener('click',event=>{if(event.target===panel){const r=panel.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePanel();}});
  function paragraph(text){const p=document.createElement('p');p.textContent=text;return p;}
  function recordCard(item,kind) {
    const card=document.createElement('div');card.className='dem-record';
    const jump=document.createElement('button');jump.type='button';jump.textContent=item.name||item.title;
    jump.addEventListener('click',()=>{if(item.file===file){closePanel();go(item.anchor);}else location.href=item.file+'#dem-block-'+item.anchor.block;});card.append(jump);
    const meta=document.createElement('small');meta.textContent=item.file===file?'This chapter':item.title;card.append(meta);
    if(item.anchor.quote){const quote=document.createElement('blockquote');quote.textContent=item.anchor.quote;card.append(quote);}
    if(item.text)card.append(paragraph(item.text));
    const actions=document.createElement('div');actions.className='dem-record-actions';
    if(kind==='notes'||kind==='bookmarks'){const edit=document.createElement('button');edit.type='button';edit.textContent=kind==='notes'?'Edit note':'Rename';edit.addEventListener('click',()=>editRecord(item,kind));actions.append(edit);}
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',()=>{data[kind]=data[kind].filter(x=>x.id!==item.id);storeAnnotations();renderRecords(kind);});actions.append(remove);card.append(actions);return card;
  }
  function renderRecords(kind) {
    panelBody.replaceChildren(paragraph('Saved on this browser. Your annotations do not change the original writing.'));
    const records=data[kind];if(!records.length){panelBody.append(paragraph(kind==='bookmarks'?'Use the bookmark button to save your current location.':'Select a passage in the manuscript to '+(kind==='notes'?'attach a note.':'highlight it.')));return;}
    const list=document.createElement('div');list.className='dem-list';records.slice().reverse().forEach(item=>list.append(recordCard(item,kind)));panelBody.append(list);
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
    const mobile=document.createElement('nav');mobile.className='dem-mobile-nav dem-nav';mobile.setAttribute('aria-label','Reading tools');mobile.innerHTML=nav();panelBody.append(mobile);
    const label=document.createElement('label');label.className='dem-field';label.textContent='Find a chapter';const input=document.createElement('input');input.type='search';input.setAttribute('aria-label','Find a chapter');label.append(input);panelBody.append(label);
    const list=document.createElement('nav');list.setAttribute('aria-label','Chapter list');panelBody.append(list);
    function render(){list.replaceChildren();let section='';catalog.filter(item=>item.title.toLowerCase().includes(input.value.toLowerCase())).forEach(item=>{if(item.section!==section){section=item.section;const head=document.createElement('p');head.className='dem-section-label';head.textContent=section;list.append(head);}const link=document.createElement('a');link.className='dem-chapter-link';link.href=item.file;link.textContent=item.title;if(item.file===file)link.setAttribute('aria-current','page');list.append(link);});}
    input.addEventListener('input',render);render();refreshCounts();
  }
  function renderSettings() {
    panelBody.innerHTML='<p>Shape a quiet space for the written word.</p><label class="dem-field"><span>Reading appearance</span><div class="dem-choice">'+['light','sepia','dark'].map(mode=>`<button type="button" data-mode="${mode}" aria-pressed="${prefs.mode===mode}">${mode[0].toUpperCase()+mode.slice(1)}</button>`).join('')+'</div></label>';
    for(const [key,label,min,max,step,unit] of [['size','Font size',16,30,1,'px'],['line','Line spacing',1.4,2.3,.1,''],['width','Reading width',45,84,1,'ch'],['art','Artwork intensity',0,1,.1,'']]) {
      const field=document.createElement('label');field.className='dem-field';const text=document.createElement('span');text.textContent=label;const output=document.createElement('output');output.textContent=prefs[key]+unit;text.append(output);
      const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=prefs[key];input.setAttribute('aria-label',label);input.addEventListener('input',()=>{const anchor=anchorNow();prefs[key]=Number(input.value);output.textContent=input.value+unit;applyPrefs();if(key!=='art')go(anchor,false);});field.append(text,input);panelBody.append(field);
    }
    panelBody.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{prefs.mode=button.dataset.mode;applyPrefs();panelBody.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
  }
  function renderSearch() {
    panelBody.innerHTML='<form class="dem-search-form"><input type="search" aria-label="Search text" placeholder="A word, a passage, an idea…" required><button class="dem-primary" type="submit">Search</button></form><label class="dem-search-scope"><input type="checkbox"> Search all chapters</label><p class="dem-search-status" role="status">Search the current manuscript or the complete collection.</p><div class="dem-search-results dem-list"></div>';
    const form=panelBody.querySelector('form'),input=form.querySelector('input'),scope=panelBody.querySelector('[type=checkbox]'),status=panelBody.querySelector('.dem-search-status'),results=panelBody.querySelector('.dem-search-results');let generation=0;
    form.addEventListener('submit',async event=>{event.preventDefault();const query=input.value.trim();if(!query)return;const thisSearch=++generation;results.replaceChildren();status.textContent='Searching…';
      try {const index=scope.checked?await getIndex():blocks.filter(node=>content.contains(node)).map(node=>({file,title,text:node.textContent,block:Number(node.dataset.block)}));if(thisSearch!==generation)return;
        const matches=index.filter(unit=>unit.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()));status.textContent=matches.length+' matching passages'+(matches.length>100?' · showing the first 100':'')+'.';
        matches.slice(0,100).forEach(unit=>{const card=document.createElement('div');card.className='dem-record';const a=document.createElement('a');a.textContent=unit.title;a.href=unit.file+'?find='+encodeURIComponent(query);if(unit.file===file)a.addEventListener('click',event=>{event.preventDefault();const node=blocks[unit.block]||blocks.find(n=>n.textContent.includes(unit.text));if(!node)return;const at=node.textContent.toLowerCase().indexOf(query.toLowerCase());closePanel();go({block:Number(node.dataset.block)});refreshMarks({block:Number(node.dataset.block),start:at,end:at+query.length});});const snippet=document.createElement('small');const at=unit.text.toLowerCase().indexOf(query.toLowerCase());snippet.textContent=(at>60?'…':'')+unit.text.slice(Math.max(0,at-60),at+query.length+110);card.append(a,snippet);results.append(card);});
      } catch(_){status.textContent='Some chapters could not be loaded. Please try again when connected.';}
    });
  }
  async function getIndex() {
    if(!searchIndexPromise)searchIndexPromise=(async()=>{const index=[];let cursor=0;async function worker(){while(cursor<catalog.length){const item=catalog[cursor++];const response=await fetch(item.file);if(!response.ok)throw new Error('Chapter unavailable');const html=await response.text();const doc=new DOMParser().parseFromString(html,'text/html');const script=[...doc.scripts].map(s=>s.textContent).find(s=>/const CHAPTER_TEXT\s*=/.test(s))||'';const match=script.match(/const CHAPTER_TEXT\s*=\s*`([\s\S]*?)`\s*;/);const paragraphs=match?.[1].trim()?match[1].trim().split(/\n{2,}/):[...doc.querySelectorAll('.page:not(.page-cover) .page-body')].map(n=>n.textContent);paragraphs.filter(Boolean).forEach(text=>index.push({file:item.file,title:item.title,text}));}}await Promise.all(Array.from({length:5},worker));return index;})().catch(error=>{searchIndexPromise=null;throw error;});return searchIndexPromise;
  }
  function renderDictionary(word='') {
    panelBody.innerHTML='<p>Definitions are retrieved from the existing public dictionary service.</p><form class="dem-search-form"><input type="text" aria-label="Word to define" placeholder="Select or enter a word" required><button class="dem-primary" type="submit">Define</button></form><div class="dem-definition" role="status"></div>';
    const form=panelBody.querySelector('form'),input=form.querySelector('input'),result=panelBody.querySelector('.dem-definition');input.value=word;
    form.addEventListener('submit',async event=>{event.preventDefault();const term=input.value.trim();if(!term)return;result.textContent='Looking up '+term+'…';try {const response=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(term));if(!response.ok)throw new Error('No definition available');const entries=await response.json();result.replaceChildren();let count=0;for(const entry of entries)for(const meaning of entry.meanings||[])for(const definition of meaning.definitions||[]){if(count++>=7)break;const card=document.createElement('div');card.className='dem-record';const part=document.createElement('small');part.textContent=meaning.partOfSpeech;card.append(part,paragraph(definition.definition));if(definition.example)card.append(paragraph('“'+definition.example+'”'));result.append(card);}if(!count)throw new Error('No definitions');}catch(_){result.textContent='A definition is not available right now. Check the word or your connection and try again.';}});
    if(word)form.requestSubmit();
  }
  function addBookmark() {
    const anchor=anchorNow(),existing=data.bookmarks.find(item=>item.file===file&&item.anchor.block===anchor.block);
    if(existing){data.bookmarks=data.bookmarks.filter(item=>item!==existing);toast('Bookmark removed.');}
    else {const text=blocks[anchor.block]?.textContent.trim();data.bookmarks.push({id:uid(),file,title,name:text?text.slice(0,65):title,anchor,createdAt:Date.now()});toast('Location bookmarked.');}storeAnnotations();updateProgress();
  }
  function syncFullscreen(){app.style.setProperty('--dem-visible-height',(window.visualViewport?.height||innerHeight)+'px');app.style.setProperty('--dem-visible-top',(window.visualViewport?.offsetTop||0)+'px');if(fullscreen)document.documentElement.style.setProperty('--dem-height',(visualViewport?.height||innerHeight)+'px');}
  async function enterFullscreen(){fullscreen=true;document.body.classList.add('dem-fullscreen');syncFullscreen();const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;if(!standalone&&document.fullscreenEnabled&&document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen();nativeFullscreen=!!document.fullscreenElement;}catch(_){}}app.querySelector('[data-action="fullscreen"]').setAttribute('aria-label','Exit distraction-free fullscreen');requestAnimationFrame(updateProgress);}
  function exitFullscreen(){fullscreen=false;nativeFullscreen=false;document.body.classList.remove('dem-fullscreen');document.documentElement.style.removeProperty('--dem-height');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});app.querySelector('[data-action="fullscreen"]').setAttribute('aria-label','Enter distraction-free fullscreen');requestAnimationFrame(updateProgress);}
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&nativeFullscreen)exitFullscreen();});
  app.addEventListener('click',async event=>{
    const target=event.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;
    if(action==='close')closePanel();
    else if(action==='continue'){const targetFile=positions.last||legacyLast?.file;if(targetFile&&targetFile!==file)location.href=targetFile+'?resume=1';else {if(panel.open)closePanel();go(positions.entries[file]?.anchor||{block:0});}}
    else if(action==='bookmark')addBookmark();
    else if(action==='mode'){prefs.mode=['light','sepia','dark'][(['light','sepia','dark'].indexOf(prefs.mode)+1)%3];applyPrefs();toast(prefs.mode[0].toUpperCase()+prefs.mode.slice(1)+' reading appearance.');}
    else if(action==='fullscreen'){if(fullscreen)exitFullscreen();else await enterFullscreen();}
    else if(action==='highlight'&&selection){data.highlights.push({id:uid(),file,title,anchor:{...selection},createdAt:Date.now()});storeAnnotations();getSelection()?.removeAllRanges();app.querySelector('.dem-selection').hidden=true;toast('Passage highlighted.');}
    else if(action==='note'&&selection){const anchor={...selection};openPanel('editor',target);editRecord({id:uid(),file,title,anchor,createdAt:Date.now()},'notes');}
    else if(action==='define-selection'&&selection){const word=selection.quote.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'');if(/\s/.test(word)){toast('Select a single word to look it up.');return;}openPanel('dictionary',target);renderDictionary(word);}
    else if(action==='share'&&selection){const url=new URL(file+'#dem-block-'+selection.block,location.href).href;try{if(navigator.share)await navigator.share({title,text:selection.quote,url});else{await navigator.clipboard.writeText(selection.quote+'\n\n'+title+' — By EARNLIGHT\n'+url);toast('Passage and link copied.');}}catch(error){if(error.name!=='AbortError')toast('Sharing is unavailable here. Use Copy instead.');}}
    else if(action==='copy'&&selection){try{await navigator.clipboard.writeText(selection.quote);toast('Passage copied.');}catch(_){toast('Copy is unavailable here. Use your browser’s Copy command.');}}
    else if(['chapters','bookmarks','notes','highlights','settings','search','dictionary','extras'].includes(action))openPanel(action,target);
  });
  // Capture before the legacy page-turn shortcuts; they must not change hidden pages.
  window.addEventListener('keydown',event=>{
    if(!document.body.classList.contains('dem-active'))return;
    if(event.key==='Escape'){event.stopImmediatePropagation();if(panel.open){event.preventDefault();closePanel();}else if(fullscreen)exitFullscreen();else app.querySelector('.dem-selection').hidden=true;}
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.stopImmediatePropagation();if(event.altKey&&!event.target.closest('input,textarea,select')){const route=event.key==='ArrowLeft'?current.previous:current.next;if(route){event.preventDefault();location.href=route;}}}
  },true);
  document.fonts.ready.then(()=>requestAnimationFrame(()=>{
    const query=new URLSearchParams(location.search),hash=location.hash.match(/^#dem-block-(\d+)$/),page=Number(query.get('page'));
    let anchor=hash?{block:Number(hash[1])}:positions.entries[file]?.anchor;
    if(query.has('page')){const node=segments.find(s=>Number(s.dataset.legacyPage)===page)?.querySelector('.dem-block');anchor={block:Number(node?.dataset.block||0)};}
    if(!anchor&&query.get('resume')==='1'&&legacyLast?.file===file){const node=segments.find(s=>Number(s.dataset.legacyPage)===legacyLast.page)?.querySelector('.dem-block');anchor={block:Number(node?.dataset.block||0)};}
    if(anchor)go(anchor,false);
    if(query.get('find')){const term=query.get('find'),node=blocks.find(n=>content.contains(n)&&n.textContent.toLowerCase().includes(term.toLowerCase()));if(node){const at=node.textContent.toLowerCase().indexOf(term.toLowerCase());go({block:Number(node.dataset.block)},false);refreshMarks({block:Number(node.dataset.block),start:at,end:at+term.length});}}
    updateProgress();suppressSave=false;
  }));
  // Future narration can consume real paragraph anchors and aligned timing data.
  // No audio is generated, and no approximate word timers are simulated.
  window.DemahsReader=Object.freeze({file,getBlocks:()=>blocks.filter(n=>content.contains(n)).map(n=>({id:n.id,text:n.textContent})),goToAnchor:anchor=>go(anchor),getPosition:anchorNow});
})();
