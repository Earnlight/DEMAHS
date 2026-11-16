/* Enhance the existing catalogue links; titles, sections and destinations stay intact. */
(async () => {
  'use strict';
  if(!document.body.classList.contains('realm-library'))return;
  let catalog;try{const response=await fetch('assets/reader-catalog.json');if(!response.ok)return;catalog=await response.json();}catch(_){return;}
  let positions;try{positions=JSON.parse(localStorage.getItem('demahs.reader.positions.v1'))||{};}catch(_){positions={};}
  const lookup=new Map(catalog.map(item=>[item.file,item]));
  const covers=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const image=entry.target;image.src=image.dataset.src;covers.unobserve(image);}},{rootMargin:'240px'}):null;
  document.querySelectorAll('.library-section .book-btn').forEach(link=>{
    const item=lookup.get(link.getAttribute('href'));if(!item)return;
    const image=document.createElement('img');image.className='shelf-cover';image.dataset.src=item.cover;if(!covers)image.src=item.cover;image.alt='';image.width=1024;image.height=1536;image.loading='lazy';image.decoding='async';link.prepend(image);link.classList.add('shelf-book');covers?.observe(image);
    const saved=positions.entries?.[item.file];
    if(saved){let label=link.querySelector('.btn-progress-label');if(!label){label=document.createElement('span');label.className='btn-progress-label';link.querySelector('.btn-text').append(label);}label.textContent=saved.progress>=100?'Finished':Math.round(saved.progress)+'% read';let bar=link.querySelector('.btn-progress-bar');if(!bar){bar=document.createElement('div');bar.className='btn-progress-bar';link.append(bar);}bar.style.width=Math.max(0,Math.min(100,saved.progress))+'%';}
  });
  const nav=document.createElement('nav');nav.className='shelf-sections';nav.setAttribute('aria-label','Browse chapter collections');
  document.querySelectorAll('.library-section[id]').forEach(section=>{const a=document.createElement('a');a.href='#'+section.id;a.textContent=section.querySelector('.section-title').textContent;nav.append(a);});
  document.querySelector('.library .section-label').after(nav);
  // The pilot uses its own exact character anchors. Resume it without converting them
  // to the legacy reader's page numbering, which changes with text size and viewport.
  const last=positions.entries?.[positions.last];let legacyTime=0;
  try{const legacy=JSON.parse(localStorage.getItem('noegenesis-lastread'));legacyTime=Number(legacy?.updatedAt||legacy?.timestamp||legacy?.ts||0);}catch(_){}
  if(last&&last.updatedAt>legacyTime&&positions.last==='advice.html'){
    const row=document.getElementById('continue-reading'),a=document.getElementById('continue-reading-link');
    if(row&&a){a.href='advice.html?resume=1';document.getElementById('continue-reading-label').textContent='Continue Reading';document.getElementById('continue-reading-title').textContent=last.title;document.getElementById('continue-reading-progress').textContent=Math.round(last.progress)+'% read';document.getElementById('continue-reading-bar').style.width=last.progress+'%';row.style.display='block';document.getElementById('start-reading').style.display='none';}
  }
})();
