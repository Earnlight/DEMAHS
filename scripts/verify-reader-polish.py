#!/usr/bin/env python3
"""Regressions for full-width artwork, immersive controls, text swipes and keyboard-stable page jumps."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('DEMAHS_TEST_URL','http://127.0.0.1:8766')
ENGINE=os.environ.get('DEMAHS_TEST_BROWSER','chromium')
SWIPE='''direction=>{
 const x=innerWidth/2;let target,y;
 for(y=90;y<innerHeight-50;y+=10){const el=document.elementFromPoint(x,y);if(el?.closest('#dem-content')){target=el;break;}}
 if(!target)throw Error('No visible chapter text for swipe');
 const start=direction==='next'?innerWidth-55:55,end=direction==='next'?55:innerWidth-55;
 function send(type,at){const t={identifier:1,target,clientX:at,clientY:y,pageX:at,pageY:y};const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:type==='touchend'?[]:[t]},changedTouches:{value:[t]}});target.dispatchEvent(e);}
 send('touchstart',start);send('touchmove',(start+end)/2);send('touchmove',end);send('touchend',end);
}'''
with sync_playwright() as p:
 browser=getattr(p,ENGINE).launch(**({'executable_path':'/usr/bin/chromium'} if ENGINE=='chromium' else {}))
 context=browser.new_context(viewport={'width':390,'height':844},service_workers='block',reduced_motion='reduce',has_touch=True,is_mobile=True)
 context.route('https://**/*',lambda r:r.abort())
 # Reproduce a software keyboard's visual-only resize without changing the layout viewport.
 context.add_init_script('''Object.defineProperty(navigator,'standalone',{value:true});const vv=new EventTarget();Object.defineProperties(vv,{height:{get:()=>window.keyboardHeight||innerHeight},width:{get:()=>innerWidth},offsetTop:{get:()=>0},offsetLeft:{get:()=>0}});Object.defineProperty(window,'visualViewport',{value:vv});''')
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/advice.html');page.wait_for_function('window.DemahsReader?.getPagination().ready');original=page.locator('#dem-content p').all_text_contents()
 assert page.locator('#dem-app').evaluate('el=>el.style.getPropertyValue("--reading-width")')=='84ch'
 expect(page.locator('#dem-app')).to_have_attribute('data-mode','light')
 image=page.locator('.dem-panorama').bounding_box();main=page.locator('.dem-scroll').bounding_box();assert abs(image['x']-main['x'])<1 and abs(image['width']-main['width'])<1
 assert 'linear-gradient' in page.locator('.dem-panorama').evaluate('el=>getComputedStyle(el,"::after").backgroundImage')
 assert page.locator('.dem-marginalia').count()==2
 page.locator('[data-action=fullscreen]').click();page.wait_for_timeout(180);before=page.evaluate('DemahsReader.getPagination()')
 expect(page.locator('#dem-app')).to_have_class(__import__('re').compile('dem-chrome-hidden'),timeout=3000)
 expect(page.locator('.dem-top')).to_be_hidden();expect(page.locator('.dem-bottom')).to_be_hidden()
 assert page.evaluate('DemahsReader.getPagination()')==before
 assert page.locator('.dem-bottom').evaluate('el=>el.inert')
 page.evaluate(SWIPE,'next');assert page.evaluate('DemahsReader.getPagination().page')==2
 page.evaluate(SWIPE,'previous');assert page.evaluate('DemahsReader.getPagination().page')==1
 assert 'dem-chrome-hidden' in page.locator('#dem-app').get_attribute('class')
 # Android/Chrome's actual touch pipeline, including default gesture handling.
 if ENGINE=='chromium':
  session=context.new_cdp_session(page)
  y=page.evaluate("()=>{for(let y=90;y<innerHeight-50;y+=10)if(document.elementFromPoint(innerWidth/2,y)?.closest('#dem-content'))return y;}")
  session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':330,'y':y}]})
  for x in [280,230,180,130,70]:session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y}]})
  session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  assert page.evaluate('DemahsReader.getPagination().page')==2
  page.evaluate(SWIPE,'previous')
 print('PASS: full-width fading artwork, 84ch default, non-interactive ornaments, ~1s chrome fade, unchanged pagination and swipes over real chapter text.',flush=True)
 page.locator('[data-action=show-controls]').click();page.locator('#dem-page-number').focus();before=page.evaluate('DemahsReader.getPagination()');total=page.locator('.dem-page-total').text_content();page.locator('#dem-page-number').fill('3')
 page.evaluate('keyboardHeight=420;visualViewport.dispatchEvent(new Event("resize"))');page.wait_for_timeout(200)
 assert page.evaluate('DemahsReader.getPagination()')==before
 assert page.locator('#dem-page-number').input_value()=='3';assert page.locator('.dem-page-total').text_content()==total
 page.evaluate('keyboardHeight=360;visualViewport.dispatchEvent(new Event("resize"))');page.wait_for_timeout(1300)
 expect(page.locator('.dem-bottom')).to_be_visible();assert page.locator('#dem-page-number').input_value()=='3';assert page.locator('.dem-page-total').text_content()==total
 page.locator('.dem-page-jump').get_by_role('button',name='Go',exact=True).click();page.evaluate('keyboardHeight=0;visualViewport.dispatchEvent(new Event("resize"))');page.wait_for_timeout(300)
 assert page.evaluate('DemahsReader.getPagination().page')==3
 assert page.evaluate('DemahsReader.getPagination().total')==before['total']
 assert 'dem-jump-editing' not in page.locator('#dem-app').get_attribute('class')
 # Cancelling an edit restores the real current page, rather than the unsubmitted draft.
 page.locator('#dem-page-number').focus();page.locator('#dem-page-number').fill('2');page.evaluate('keyboardHeight=400;visualViewport.dispatchEvent(new Event("resize"))');page.locator('#dem-page-number').blur();page.evaluate('keyboardHeight=0;visualViewport.dispatchEvent(new Event("resize"))');page.wait_for_timeout(300)
 assert page.evaluate('DemahsReader.getPagination().page')==3;assert page.locator('#dem-page-number').input_value()=='3'
 print('PASS: keyboard resize never changes the typed number or real total, active fields keep controls visible, submit reaches the correct page, cancel restores the actual page.',flush=True)
 if not page.locator('[data-action=fullscreen]').is_visible():page.locator('[data-action=show-controls]').click()
 page.locator('[data-action=fullscreen]').click();page.locator('.dem-menu').click();page.get_by_label('Find a chapter',exact=True).fill('Advice')
 card=page.locator('.dem-chapter-link');assert card.bounding_box()['height']<170;assert card.locator('img').count()==1
 expect(page.locator('.dem-chapter-shelf h3')).to_have_text('Expression')
 assert float(page.locator('.dem-chapter-shelf h3').evaluate('el=>getComputedStyle(el).fontSize').replace('px',''))>=24
 page.keyboard.press('Escape');assert page.locator('#dem-content p').all_text_contents()==original
 # A previously inherited 65ch default updates; a deliberate custom width remains custom.
 page.evaluate("localStorage.setItem('demahs.reader.preferences.v1',JSON.stringify({width:65,mode:'light',size:21,line:1.8,art:1}));")
 page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');assert page.locator('#dem-app').evaluate('el=>el.style.getPropertyValue("--reading-width")')=='84ch'
 page.evaluate("localStorage.setItem('demahs.reader.preferences.v1',JSON.stringify({width:72,mode:'light',size:21,line:1.8,art:1}));")
 page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');assert page.locator('#dem-app').evaluate('el=>el.style.getPropertyValue("--reading-width")')=='72ch'
 assert not errors,errors
 print('PASS: smaller illustrated chapter entries, larger semantic section headings, preference migration and preserved text; no uncaught application errors.',flush=True)
 browser.close()
print('ALL READER POLISH CHECKS PASSED',ENGINE,flush=True)
