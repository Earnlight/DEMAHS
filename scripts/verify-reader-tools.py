#!/usr/bin/env python3
"""Reader-tool regressions: scoped search, real exports, highlight deletion and saved definitions."""
from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('DEMAHS_TEST_URL','http://127.0.0.1:8766')
ENGINE=os.environ.get('DEMAHS_TEST_BROWSER','chromium')
SELECT='''([start,end])=>{const p=document.querySelector('#dem-content p');function at(pos){const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(pos<=n.length)return[n,pos];pos-=n.length;}}const r=document.createRange();r.setStart(...at(start));r.setEnd(...at(end));getSelection().removeAllRanges();getSelection().addRange(r);p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));}'''
definition_calls=[]
def external(route):
 if 'api.dictionaryapi.dev' in route.request.url:
  definition_calls.append(route.request.url)
  if route.request.url.endswith('/missingword'):route.fulfill(status=404,content_type='application/json',body='{}');return
  route.fulfill(status=200,content_type='application/json',body=json.dumps([{'word':'truth','sourceUrls':['https://en.wiktionary.org/wiki/truth'],'license':{'name':'CC BY-SA 3.0','url':'https://creativecommons.org/licenses/by-sa/3.0/'},'meanings':[{'partOfSpeech':'noun','definitions':[{'definition':'An exact definition returned by the test dictionary.','example':'An example supplied by that dictionary.'},{'definition':'A second provider definition.'}]}]}]))
 else:route.abort()

def download_text(page,button):
 with page.expect_download() as event:button.click()
 file=event.value
 assert file.failure() is None
 return file.suggested_filename,Path(file.path()).read_text()

with sync_playwright() as p:
 browser=getattr(p,ENGINE).launch(**({'executable_path':'/usr/bin/chromium'} if ENGINE=='chromium' else {}))
 context=browser.new_context(viewport={'width':1440,'height':1000},service_workers='block',accept_downloads=True,reduced_motion='reduce')
 context.route('https://**/*',external)
 # A pre-existing legacy highlight must be removable without reappearing on reload.
 context.add_init_script("if(!localStorage.getItem('tools-test-seeded')){localStorage.setItem('tools-test-seeded','1');localStorage.setItem('noegenesis-highlights-advice',JSON.stringify([{text:'Remember truth often',pageIndex:1}]));}")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/advice.html');page.wait_for_function('window.DemahsReader?.getPagination().ready')
 original=page.locator('#dem-content p').all_text_contents()
 form=page.locator('.dem-sidebar .dem-writing-search')
 form.get_by_label('Search the writing',exact=True).fill('truth');form.get_by_role('button',name='Search writing',exact=True).click()
 expect(page.locator('.dem-search-results a').first).to_be_visible()
 assert set(page.locator('.dem-search-results a').all_text_contents())=={'Advice'}
 page.locator('.dem-search-results a').first.click();expect(page.locator('mark[data-kind=search]').first).to_be_in_viewport()
 form.get_by_label('Search the writing',exact=True).fill('quotation');form.get_by_label('Writing search scope',exact=True).select_option('collection');form.get_by_role('button',name='Search writing',exact=True).click()
 expect(page.locator('.dem-search-results a[href^="introduction.html"]')).to_be_visible(timeout=20000)
 expect(page.get_by_label('Search the complete work',exact=True)).to_be_checked();page.keyboard.press('Escape')
 print('PASS: sidebar current-chapter search and full collection search include introductory quotations and lead to real passages.',flush=True)
 # Export two real notes, individually, selected and all together.
 for start,end,text in [(3,18,'Alpha note <script>literal text</script>'),(40,58,'Beta note with a second thought')]:
  page.evaluate('DemahsReader.goToPage(1)');page.evaluate(SELECT,[start,end]);page.locator('[data-action=note]').click();page.get_by_label('Your note',exact=True).fill(text);page.get_by_role('button',name='Save note',exact=True).click();page.keyboard.press('Escape')
 page.locator('.dem-sidebar [data-action=notes]').click()
 name,body=download_text(page,page.get_by_role('button',name='Export all notes',exact=True));assert name.endswith('.txt');assert 'Alpha note' in body and 'Beta note' in body and '#dem-block-' in body
 name,body=download_text(page,page.locator('.dem-panel .dem-record').first.get_by_role('button',name='Export note',exact=True));assert 'Beta note' in body and 'Alpha note' not in body
 page.get_by_role('checkbox',name='Select note: Alpha note <script>literal text</script>',exact=True).check()
 name,body=download_text(page,page.get_by_role('button',name='Export selected (1)',exact=True));assert 'Alpha note' in body and 'Beta note' not in body
 page.get_by_label('Note export format',exact=True).select_option('json');name,body=download_text(page,page.get_by_role('button',name='Export all notes',exact=True));assert name.endswith('.json');payload=json.loads(body);assert len(payload['notes'])==2;assert all(n['passage'] and n['note'] and n['url'] for n in payload['notes'])
 page.get_by_role('checkbox',name='Select all notes',exact=True).check();expect(page.get_by_role('button',name='Export selected (2)',exact=True)).to_be_enabled()
 page.keyboard.press('Escape');print('PASS: actual all/single/selected TXT downloads and JSON exports contain only the requested notes and exact selected source passages.',flush=True)
 # Highlight share/copy and persistent deletion, including imported data.
 page.evaluate('DemahsReader.goToPage(1)');page.evaluate(SELECT,[45,68]);page.locator('[data-action=highlight]').click();page.locator('.dem-sidebar [data-action=highlights]').click()
 expect(page.locator('.dem-panel .dem-record')).to_have_count(2)
 page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedText=text;}}});Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.sharedPayload=payload;}});")
 card=page.locator('.dem-panel .dem-record').first;quote=card.locator('blockquote').text_content();card.get_by_role('button',name='Share highlighted passage',exact=True).click();assert page.evaluate('window.sharedPayload.text')==quote
 card.get_by_role('button',name='Copy highlighted passage',exact=True).click();assert quote in page.evaluate('window.copiedText')
 page.evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:undefined});window.copiedText='';")
 card.get_by_role('button',name='Share highlighted passage',exact=True).click();assert quote in page.evaluate('window.copiedText')
 legacy=page.locator('.dem-panel .dem-record').filter(has=page.locator('blockquote',has_text='Remember truth often'));remove=legacy.get_by_role('button',name='Remove highlight',exact=True);assert remove.bounding_box()['width']>=44;remove.click()
 expect(page.locator('.dem-panel .dem-record')).to_have_count(1);page.keyboard.press('Escape');page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready')
 page.locator('.dem-sidebar [data-action=highlights]').click();expect(page.locator('.dem-panel .dem-record')).to_have_count(1);assert 'Remember truth often' not in page.locator('.dem-panel .dem-record blockquote').text_content()
 page.get_by_role('button',name='Remove highlight',exact=True).click();page.keyboard.press('Escape');page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');assert page.locator('mark[data-kind=highlight]').count()==0
 print('PASS: native-share payload, copy, share-to-copy fallback, touch-sized red remove button and deletion that survives reload without legacy resurrection.',flush=True)
 # Save exact provider results, keep source/licensing, revisit offline, remove persistently.
 page.locator('.dem-sidebar [data-action=dictionary]').click();page.get_by_label('Word to define',exact=True).fill('truth');page.get_by_role('button',name='Define',exact=True).click();expect(page.locator('.dem-definition-card')).to_have_count(2)
 page.get_by_role('button',name='Save definition of truth',exact=True).first.click();expect(page.get_by_role('button',name='Save definition of truth',exact=True).first).to_be_disabled()
 page.get_by_role('button',name='Save definition of truth',exact=True).nth(1).click();page.keyboard.press('Escape');page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');calls=len(definition_calls)
 context.set_offline(True);page.locator('.dem-sidebar [data-action=definitions]').click();expect(page.locator('.dem-definition-card')).to_have_count(2);expect(page.locator('.dem-panel')).to_contain_text('An exact definition returned by the test dictionary.');expect(page.locator('.dem-panel')).to_contain_text('CC BY-SA 3.0');assert len(definition_calls)==calls
 page.get_by_role('button',name='Remove saved definition of truth',exact=True).first.click();expect(page.locator('.dem-definition-card')).to_have_count(1);page.keyboard.press('Escape');context.set_offline(False);page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready')
 page.locator('.dem-sidebar [data-action=dictionary]').click();page.get_by_label('Word to define',exact=True).fill('missingword');page.get_by_role('button',name='Define',exact=True).click();expect(page.locator('.dem-definition')).to_contain_text('not available');assert page.locator('.dem-definition-card').count()==0;page.keyboard.press('Escape')
 print('PASS: exact provider definitions with source/license, duplicate prevention, offline local access, persistent removal and honest lookup failures.',flush=True)
 page.set_viewport_size({'width':390,'height':844});page.locator('.dem-menu').click();form=page.locator('.dem-panel .dem-writing-search');expect(form).to_be_visible();form.get_by_label('Search the writing',exact=True).fill('truth');form.get_by_label('Writing search scope',exact=True).select_option('collection');form.get_by_role('button',name='Search writing',exact=True).click();expect(page.locator('.dem-search-results a').first).to_be_visible(timeout=20000);page.keyboard.press('Escape')
 page.locator('.dem-menu').click();page.locator('.dem-mobile-tools summary').click();page.locator('.dem-mobile-nav [data-action=definitions]').click();expect(page.locator('.dem-definition-card')).to_have_count(1)
 assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
 page.screenshot(path='/tmp/demahs-saved-definitions-'+ENGINE+'.png');page.keyboard.press('Escape')
 assert page.locator('#dem-content p').all_text_contents()==original
 assert not errors,errors
 print('PASS: mobile drawer search, saved definitions and unchanged author paragraphs; no uncaught application errors.',flush=True)
 browser.close()
print('ALL READER TOOL CHECKS PASSED',ENGINE,flush=True)
