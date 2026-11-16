#!/usr/bin/env python3
"""Continuous page boundaries, position/annotation persistence and complete search navigation."""
from pathlib import Path
import os,re
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('DEMAHS_TEST_URL','http://127.0.0.1:8766');ENGINE=os.environ.get('DEMAHS_TEST_BROWSER','chromium')
SELECT='''()=>{const p=document.querySelector('#dem-content p');function at(pos){const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(pos<=n.length)return[n,pos];pos-=n.length;}}const r=document.createRange();r.setStart(...at(3));r.setEnd(...at(18));getSelection().removeAllRanges();getSelection().addRange(r);p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));}'''
with sync_playwright() as p:
 browser=getattr(p,ENGINE).launch(**({'executable_path':'/usr/bin/chromium'} if ENGINE=='chromium' else {}))
 for width,height in [(1440,1000),(390,844),(320,740),(844,390)]:
  context=browser.new_context(viewport={'width':width,'height':height},service_workers='block',reduced_motion='reduce');context.route('https://**/*',lambda r:r.abort());page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/advice.html');page.wait_for_function('window.DemahsReader?.getPagination().ready');original=page.locator('#dem-content p').all_text_contents();pages=page.evaluate('DemahsReader.getPagination().total')
  page.locator('.dem-reading-tools [data-action=settings]').click();page.get_by_role('button',name='Continuous scroll',exact=True).click();page.wait_for_function('document.querySelector("#dem-app").dataset.view==="scroll"');page.wait_for_timeout(150);page.keyboard.press('Escape')
  assert page.evaluate('DemahsReader.getPagination().total')==pages
  assert page.locator('.dem-scroll-break').count()==pages+1
  assert page.locator('#dem-content p').all_text_contents()==original
  assert page.locator('.dem-scroll').evaluate('el=>el.scrollHeight>el.clientHeight')
  page.locator('[data-action=next-page]').click();assert page.evaluate('DemahsReader.getPagination().page')==2
  page.locator('[data-action=previous-page]').click();assert page.evaluate('DemahsReader.getPagination().page')==1
  page.locator('.dem-scroll').evaluate('el=>el.scrollTop=el.scrollHeight');page.wait_for_function('n=>DemahsReader.getPagination().page===n',arg=pages,polling=20);assert page.locator('.dem-progress-line').get_attribute('aria-valuenow')=='100'
  page.locator('[data-action=previous-page]').click();assert page.evaluate('DemahsReader.getPagination().page')==pages-1
  page.wait_for_timeout(220);page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');page.wait_for_timeout(150);assert page.evaluate('DemahsReader.getPagination().view')=='scroll';assert page.locator('#dem-content p').all_text_contents()==original
  page.evaluate('DemahsReader.goToPage(1)');page.locator('#dem-page-number').focus();total=page.evaluate('DemahsReader.getPagination().total');page.locator('#dem-page-number').fill('2');page.set_viewport_size({'width':width,'height':max(300,height-240)});page.wait_for_timeout(100);assert page.locator('#dem-page-number').input_value()=='2';assert page.evaluate('DemahsReader.getPagination().total')==total
  page.locator('.dem-page-jump').get_by_role('button',name='Go',exact=True).click();page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(300);assert page.evaluate('DemahsReader.getPagination().page')==2
  page.locator('.dem-reading-tools [data-action=settings]').click();page.get_by_role('button',name='Pages',exact=True).click();page.wait_for_function('document.querySelector("#dem-app").dataset.view==="pages"');page.keyboard.press('Escape');assert page.locator('.dem-scroll-break').count()==0;assert page.locator('#dem-content p').all_text_contents()==original
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');assert not errors,errors
  context.close();print(f'PASS {ENGINE} {width}×{height}: real shared page boundaries, scroll/page buttons, keyboard jump, persistent view and original paragraphs.',flush=True)
 context=browser.new_context(viewport={'width':1440,'height':1000},service_workers='block',reduced_motion='reduce');context.route('https://**/*',lambda r:r.abort());page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/advice.html');page.wait_for_function('window.DemahsReader?.getPagination().ready');original=page.locator('#dem-content p').all_text_contents()
 # Bookmark removal is a separate, accessible red control at the card's bottom-right.
 page.locator('.dem-top [data-action=bookmark]').click();page.locator('.dem-sidebar [data-action=bookmarks]').click();card=page.locator('.dem-bookmark-card');remove=card.get_by_role('button',name='Remove bookmark',exact=True);a=card.bounding_box();b=remove.bounding_box();assert a['x']+a['width']-b['x']-b['width']<=16 and a['y']+a['height']-b['y']-b['height']<=16;remove.click();expect(page.locator('.dem-bookmark-card')).to_have_count(0);page.keyboard.press('Escape');page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');assert page.locator('.dem-top [data-action=bookmark]').get_attribute('aria-pressed')=='false'
 # Exact matching includes every occurrence, not only the first one in a paragraph.
 count=sum(len(re.findall('truth',text,re.I)) for text in original)
 page.locator('.dem-top [data-action=search]').click();page.get_by_label('Search text',exact=True).fill('truth');page.locator('.dem-search-form button').click();expect(page.locator('mark[data-kind=search]')).to_have_count(count);page.locator('.dem-open-matches').click()
 assert page.locator('.dem-find-count').text_content().startswith('1 of '+str(count))
 first=page.locator('.dem-current-match').first.text_content();page.locator('[data-action=next-match]').click();assert page.locator('.dem-find-count').text_content().startswith('2 of ');expect(page.locator('.dem-current-match').first).to_be_in_viewport();page.locator('[data-action=previous-match]').click();assert page.locator('.dem-find-count').text_content().startswith('1 of ')
 page.locator('[data-action=previous-match]').click();assert page.locator('.dem-find-count').text_content().startswith(str(count)+' of ');expect(page.locator('.dem-current-match').first).to_be_in_viewport()
 # Search marks survive view changes; clear-search removes only search marks.
 page.locator('.dem-reading-tools [data-action=settings]').click();page.get_by_role('button',name='Continuous scroll',exact=True).click();page.wait_for_timeout(200);page.keyboard.press('Escape');page.locator('[data-action=next-match]').click();expect(page.locator('.dem-current-match').first).to_be_in_viewport()
 page.evaluate('DemahsReader.goToPage(1)');page.evaluate(SELECT);page.locator('[data-action=highlight]').click();assert page.locator('mark[data-kind=highlight]').count()>0;page.locator('[data-action=clear-find]').click();assert page.locator('mark[data-kind=search]').count()==0;assert page.locator('mark[data-kind=highlight]').count()>0
 # A passage crossing a divider remains the author's text when saved as a note.
 page.evaluate('''()=>{const ps=document.querySelectorAll('#dem-content p');function at(p,pos){const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(pos<=n.length)return[n,pos];pos-=n.length;}}const r=document.createRange();r.setStart(...at(ps[0],3));r.setEnd(...at(ps[3],15));getSelection().removeAllRanges();getSelection().addRange(r);ps[0].dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));}''');page.locator('[data-action=note]').click();page.get_by_label('Your note',exact=True).fill('A note spanning real page boundaries');page.get_by_role('button',name='Save note',exact=True).click();quote=page.locator('.dem-panel .dem-record blockquote').first.text_content();assert 'PAGE 2' not in quote and 'Step 2' in quote;page.keyboard.press('Escape')
 # Previous searches survive reload, replay faithfully and can be explicitly cleared.
 page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');page.locator('.dem-top [data-action=search]').click();page.locator('.dem-search-history summary').click();expect(page.locator('.dem-history-query')).to_contain_text('truth');page.locator('.dem-history-query').click();expect(page.locator('.dem-search-status')).to_contain_text(str(count)+' matches');page.locator('.dem-open-matches').click()
 page.locator('.dem-top [data-action=search]').click();page.get_by_label('Search text',exact=True).fill('**');page.locator('.dem-search-form button').click();literal=sum(text.count('**') for text in original);expect(page.locator('.dem-search-status')).to_contain_text(str(literal)+' matches');page.get_by_label('Search text',exact=True).fill('[');page.locator('.dem-search-form button').click();expect(page.locator('.dem-search-status')).to_contain_text('0 matches');page.locator('.dem-search-history summary').click();page.get_by_role('button',name='Clear previous searches',exact=True).click();expect(page.locator('.dem-history-query')).to_have_count(0)
 page.keyboard.press('Escape');assert page.locator('#dem-content p').all_text_contents()==original
 # Collection result links also seed the actual old search outside the Advice pilot.
 page.goto(BASE+'/reality.html?find=opening');expect(page.locator('#search-input')).to_have_value('opening');assert page.locator('mark.search-highlight').count()+page.locator('span.search-highlight').count()>0
 assert not errors,errors
 print('PASS: red bookmark × placement/persistence, all-occurrence highlights, wrapping next/previous navigation, scroll-mode search, personal highlights, persistent/replayable/clearable history, literal queries and legacy result links.',flush=True)
 browser.close()
print('ALL CONTINUOUS/SEARCH CHECKS PASSED',ENGINE,flush=True)
