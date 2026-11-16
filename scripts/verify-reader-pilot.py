#!/usr/bin/env python3
"""Preservation and regression checks for the Advice pilot and illustrated catalogue.
Run against a static server with DEMAHS_TEST_URL (default http://127.0.0.1:8766).
Set DEMAHS_TEST_BROWSER=webkit to exercise Safari's rendering engine.
"""
from pathlib import Path
import json, os, re, subprocess
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parent.parent
BASE=os.environ.get('DEMAHS_TEST_URL','http://127.0.0.1:8766')
ENGINE=os.environ.get('DEMAHS_TEST_BROWSER','chromium')
hooks={
 'advice.html':['<script src="assets/scripts/immersive-reader-bootstrap.js"></script>\n','<link rel="stylesheet" href="assets/styles/immersive-reader.css">\n<script src="assets/scripts/immersive-reader.js" defer></script>\n'],
 'library.html':['<link rel="stylesheet" href="assets/styles/library-shelf.css">\n<script src="assets/scripts/library-shelf.js" defer></script>\n']}
for path in ROOT.glob('*.html'):
 original=subprocess.check_output(['git','show','4042953:'+path.name],cwd=ROOT).decode()
 current=path.read_text()
 for hook in hooks.get(path.name,[]):
  assert current.count(hook)==1,path.name
  current=current.replace(hook,'')
 assert current==original,(path.name,'original HTML changed')
source=(ROOT/'advice.html').read_text()
expected=[s.strip() for s in re.search(r'const CHAPTER_TEXT\s*=\s*`([\s\S]*?)`\s*;',source)[1].strip().split('\n\n') if s.strip()]
catalog=json.loads((ROOT/'assets/reader-catalog.json').read_text())
print('PASS: original text, metadata, links and inline scripts preserved across all 38 pages; only Advice and catalogue have added hooks.',flush=True)

# Check every visible glyph, including fragments of paragraphs spanning pages.
# This catches clipped words at column edges and text lost below a short viewport.
glyph_check='''()=>{
 const flow=document.querySelector('.dem-manuscript'),frame=document.querySelector('.dem-page-window'),f=frame.getBoundingClientRect(),origin=flow.getBoundingClientRect(),width=frame.clientWidth,stride=width+48,total=DemahsReader.getPagination().total;
 const bad=[],pages=new Set();let chars=0;
 for(const p of document.querySelectorAll('#dem-content p')){
  const walk=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let text;
  while(text=walk.nextNode())for(let i=0;i<text.length;i++){
   if(/\\s/.test(text.data[i]))continue;
   const r=document.createRange();r.setStart(text,i);r.setEnd(text,i+1);const rect=r.getBoundingClientRect();if(!rect.width)continue;
   const n=Math.floor((rect.left-origin.left+1)/stride),left=rect.left-origin.left-n*stride;
   pages.add(n);chars++;
   if(n<0||n>=total||left< -2||left+rect.width>width+2||rect.top<f.top-2||rect.bottom>f.bottom+2)bad.push({char:text.data[i],page:n,left,top:rect.top-f.top,bottom:rect.bottom-f.bottom});
  }
 }
 return {bad:bad.slice(0,8),chars,pages:[...pages],total};
}'''
anchor_visible='''anchor=>{
 const block=document.getElementById('dem-block-'+anchor.block);if(!block)return false;
 const w=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let n,at=anchor.char||0;
 while(n=w.nextNode()){if(at<n.length)break;at-=n.length;}if(!n)return false;
 const r=document.createRange();r.setStart(n,at);r.setEnd(n,at+1);const b=r.getBoundingClientRect(),v=document.querySelector('.dem-page-window').getBoundingClientRect();return b.left>=v.left-2&&b.right<=v.right+2&&b.top>=v.top-2&&b.bottom<=v.bottom+2;
}'''
select_passage='''()=>{const p=document.querySelector('#dem-content p');function at(pos){const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(pos<=n.length)return[n,pos];pos-=n.length;}}const r=document.createRange();r.setStart(...at(3));r.setEnd(...at(18));getSelection().removeAllRanges();getSelection().addRange(r);p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));}'''

def external(route):
 if 'api.dictionaryapi.dev' in route.request.url:route.fulfill(status=200,content_type='application/json',body=json.dumps([{'meanings':[{'partOfSpeech':'noun','definitions':[{'definition':'Test dictionary response.'}]}]}]))
 else:route.abort()

with sync_playwright() as p:
 engine=getattr(p,ENGINE)
 browser=engine.launch(**({'executable_path':'/usr/bin/chromium'} if ENGINE=='chromium' else {}))
 errors=[]
 for width,height in [(1440,1000),(820,1180),(390,844),(320,740),(844,390)]:
  context=browser.new_context(viewport={'width':width,'height':height},service_workers='block',reduced_motion='reduce')
  context.route('https://**/*',external)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'/advice.html');page.wait_for_function('window.DemahsReader?.getPagination().ready');page.wait_for_timeout(150)
  assert page.locator('#dem-content p').all_text_contents()==expected
  geometry=page.evaluate(glyph_check);assert not geometry['bad'],(ENGINE,width,geometry)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  total=page.evaluate('DemahsReader.getPagination().total');assert total>1
  expect(page.locator('[data-action=previous-page]')).to_be_disabled()
  for n in range(2,total+1):
   page.locator('[data-action=next-page]').click()
   assert page.evaluate('DemahsReader.getPagination().page')==n
  expect(page.locator('[data-action=next-page]')).to_be_disabled()
  assert page.locator('.dem-progress-line').get_attribute('aria-valuenow')=='100'
  page.locator('#dem-page-number').fill('2');page.locator('.dem-page-jump').get_by_role('button',name='Go',exact=True).click()
  assert page.evaluate('DemahsReader.getPagination().page')==2
  anchor=page.evaluate('DemahsReader.getPosition()')
  page.locator('[data-action=fullscreen]').click();expect(page.locator('.dem-top')).to_be_hidden(timeout=4000)
  page.wait_for_timeout(150)
  assert page.evaluate(anchor_visible,anchor),(width,'fullscreen changed passage')
  assert not (geometry:=page.evaluate(glyph_check))['bad'],geometry
  rect=page.locator('#dem-app').bounding_box();assert abs(rect['width']-page.evaluate('visualViewport.width'))<=2
  if page.locator('[data-action=show-controls]').is_visible():page.locator('[data-action=show-controls]').click()
  page.locator('[data-action=fullscreen]').click();expect(page.locator('.dem-top')).to_be_visible();page.wait_for_timeout(150)
  assert page.evaluate(anchor_visible,anchor),(width,'exit lost passage')
  page.keyboard.press('End');assert page.evaluate('DemahsReader.getPagination().page===DemahsReader.getPagination().total')
  page.keyboard.press('Home');assert page.evaluate('DemahsReader.getPagination().page')==1
  page.wait_for_timeout(200);context.close()
  print(f'PASS {ENGINE} {width}×{height}: every glyph fits, exact page turns/counts, jump, fullscreen entry/exit and keyboard navigation.',flush=True)

 context=browser.new_context(viewport={'width':390,'height':844},service_workers='block',reduced_motion='reduce')
 context.route('https://**/*',external)
 # PWA: native fullscreen is absent. The app must still occupy the full visible viewport.
 context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true});Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined,configurable:true});")
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/advice.html');page.wait_for_function('window.DemahsReader?.getPagination().ready');page.wait_for_timeout(150)
 page.locator('[data-action=next-page]').click();page.locator('.dem-top [data-action=bookmark]').click();page.wait_for_timeout(220)
 saved=page.evaluate('DemahsReader.getPosition()');page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');page.wait_for_timeout(150)
 assert page.evaluate(anchor_visible,saved)
 page.locator('[data-action=fullscreen]').click();expect(page.locator('.dem-top')).to_be_hidden(timeout=4000);page.wait_for_timeout(150)
 oldheight=page.locator('.dem-page-window').bounding_box()['height'];assert oldheight>600
 page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(200);assert not (geometry:=page.evaluate(glyph_check))['bad'],geometry;assert page.evaluate(anchor_visible,saved)
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200)
 if page.locator('[data-action=show-controls]').is_visible():page.locator('[data-action=show-controls]').click()
 page.locator('[data-action=fullscreen]').click();page.wait_for_timeout(150)
 page.locator('.dem-reading-tools [data-action=settings]').click()
 page.get_by_label('Font size',exact=True).evaluate("el=>{el.value=30;el.dispatchEvent(new Event('input',{bubbles:true}));}")
 page.get_by_label('Line spacing',exact=True).evaluate("el=>{el.value=2.3;el.dispatchEvent(new Event('input',{bubbles:true}));}")
 page.wait_for_timeout(150);assert page.evaluate(anchor_visible,saved);assert not (geometry:=page.evaluate(glyph_check))['bad'],geometry
 page.keyboard.press('Escape')
 # Annotations remain anchored to original text, not a page number that changes with layout.
 page.evaluate('DemahsReader.goToPage(1)');page.evaluate(select_passage);page.locator('[data-action=highlight]').click()
 assert page.locator('mark[data-kind=highlight]').count()>0
 page.evaluate(select_passage);page.locator('[data-action=note]').click();page.get_by_label('Your note',exact=True).fill('A persistent note');page.get_by_role('button',name='Save note',exact=True).click();page.keyboard.press('Escape')
 page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');assert page.locator('mark[data-kind=highlight]').count()>0
 page.locator('.dem-menu').click();page.locator('.dem-mobile-tools summary').click();page.locator('.dem-mobile-nav [data-action=notes]').click();expect(page.locator('.dem-panel')).to_contain_text('A persistent note');page.keyboard.press('Escape')
 page.locator('.dem-top [data-action=search]').click();page.get_by_label('Search text',exact=True).fill('truth');page.locator('.dem-search-form button').click();page.locator('.dem-search-results a').first.click();expect(page.locator('mark[data-kind=search]').first).to_be_in_viewport()
 page.locator('.dem-menu').click();assert page.locator('.dem-chapter-link img').count()==33;page.get_by_label('Find a chapter',exact=True).fill('Advice');expect(page.locator('.dem-chapter-link')).to_have_count(1);expect(page.locator('.dem-chapter-link')).to_have_attribute('aria-current','page');page.keyboard.press('Escape')
 assert page.locator('#dem-content p').all_text_contents()==expected
 print('PASS: PWA fullscreen/rotation, font/spacing reflow, bookmarks/resume, persistent highlights/notes, real search matches and illustrated chapter filtering.',flush=True)
 for width in [1440,820,390,320]:
  page.set_viewport_size({'width':width,'height':1000});page.goto(BASE+'/library.html');page.wait_for_selector('.shelf-book')
  assert page.locator('.shelf-book').count()==33
  assert page.locator('.shelf-cover').count()==33
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  links=page.locator('.shelf-book').evaluate_all('els=>els.map(a=>a.getAttribute("href"))');assert links==[i['file'] for i in catalog]
  expect(page.locator('#continue-reading-link')).to_have_attribute('href','advice.html?resume=1')
 print('PASS: illustrated library preserves all 33 chapter links and ordering, fits all viewports and resumes the pilot.',flush=True)
 assert not errors,errors
 browser.close()
print('ALL READER PILOT CHECKS PASSED',flush=True)
