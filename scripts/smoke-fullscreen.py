#!/usr/bin/env python3
"""Exercise fullscreen layout with installed-PWA and denied/absent native APIs.

Uses Chromium by default. Set DEMAHS_FULLSCREEN_ENGINE=webkit (or all) and
configure Playwright's browser path to exercise WebKit. No external requests are sent.
"""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get('DEMAHS_TEST_URL', 'http://127.0.0.1:8000').rstrip('/')
READERS = sorted(p.name for p in ROOT.glob('*.html') if 'class="realm-page realm-reader"' in p.read_text())

with sync_playwright() as p:
    choice = os.environ.get('DEMAHS_FULLSCREEN_ENGINE', 'chromium')
    engines = []
    if choice in ('chromium', 'all'):
        engines.append(('Chromium', p.chromium, {'executable_path': '/usr/bin/chromium'}))
    if choice in ('webkit', 'all'):
        engines.append(('WebKit', p.webkit, {}))
    assert engines, 'Choose chromium, webkit or all'
    for engine_name, engine, options in engines:
        browser = engine.launch(headless=True, **options)
        for mode in ['standalone', 'denied', 'absent']:
            context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, service_workers='block')
            context.route('https://**/*', lambda route: route.abort())
            context.add_init_script("""window.nativeRequests=0;
              Object.defineProperty(document,'fullscreenEnabled',{value:true,configurable:true});
              Element.prototype.requestFullscreen=()=>{window.nativeRequests++;return Promise.reject(new Error('Denied for regression test'))};
            """ + ("Object.defineProperty(navigator,'standalone',{value:true});" if mode == 'standalone' else '') +
            ("Element.prototype.requestFullscreen=undefined;Element.prototype.webkitRequestFullscreen=undefined;" if mode == 'absent' else ''))
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(BASE + '/advice.html?page=1', wait_until='networkidle')
            page.wait_for_function('ReaderState.getCurrent()===1')
            for width, height in [(390, 844), (844, 390), (390, 620), (390, 844)]:
                page.locator('#fullscreen-btn').click()
                expect(page.locator('body')).to_have_class(re.compile('reader-fullscreen'))
                page.set_viewport_size({'width': width, 'height': height})
                page.wait_for_function("Math.abs(document.getElementById('book-container').getBoundingClientRect().height-visualViewport.height)<2")
                geometry = page.evaluate("""() => {
                  const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height}};
                  return {book:box('book'),container:box('book-container'),bar:box('page-bar'),exit:box('exit-fullscreen-btn'),height:visualViewport.height,width:visualViewport.width};
                }""")
                for name in ['book', 'container', 'bar', 'exit']:
                    rect = geometry[name]
                    assert rect['x'] >= -1 and rect['y'] >= -1, (engine_name, mode, name, geometry)
                    assert rect['right'] <= geometry['width'] + 1 and rect['bottom'] <= geometry['height'] + 1, (engine_name, mode, name, geometry)
                assert geometry['book']['height'] > 150
                assert geometry['book']['bottom'] <= geometry['bar']['y'] + 1
                assert page.locator('#book-scene').evaluate('(e)=>getComputedStyle(e).perspective') == 'none'
                assert page.locator('#book-container').evaluate('(e)=>getComputedStyle(e).transform') == 'none'
                old_page = page.evaluate('ReaderState.getCurrent()')
                total = page.evaluate('ReaderState.total')
                direction = 1 if old_page < total - 1 else -1
                page.locator('#bar-next' if direction == 1 else '#bar-prev').click()
                page.wait_for_function('(expected)=>ReaderState.getCurrent()===expected', arg=old_page + direction)
                current_page = page.evaluate('ReaderState.getCurrent()')
                page.locator('#exit-fullscreen-btn').click()
                expect(page.locator('body')).not_to_have_class(re.compile('reader-fullscreen'))
                assert page.evaluate('ReaderState.getCurrent()') == current_page
                expect(page.locator('#fullscreen-btn')).to_be_focused()
                assert page.evaluate('getComputedStyle(document.documentElement).overflow') != 'hidden'
            assert page.evaluate('nativeRequests') == (4 if mode == 'denied' else 0)
            # Double-tap works without a native fullscreen API, including Escape exit.
            page.locator('#book').click(position={'x': 15, 'y': 100}, click_count=2, delay=70)
            expect(page.locator('body')).to_have_class(re.compile('reader-fullscreen'))
            page.keyboard.press('Escape')
            expect(page.locator('body')).not_to_have_class(re.compile('reader-fullscreen'))
            assert not errors, (engine_name, mode, errors)
            print(f'PASS: {engine_name} {mode}: enter/exit, orientation, viewport resize, page turns and double-tap', flush=True)
            context.close()
        # Every reader uses the same controller and can enter standalone fullscreen.
        context = browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
        context.route('https://**/*', lambda route: route.abort())
        context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true});")
        page = context.new_page()
        for name in READERS:
            page.goto(BASE + '/' + name, wait_until='load')
            if page.locator('#intro-dismiss').is_visible():
                page.locator('#intro-dismiss').click()
            page.locator('#fullscreen-btn').click()
            expect(page.locator('body')).to_have_class(re.compile('reader-fullscreen'))
            page.locator('#exit-fullscreen-btn').click()
            expect(page.locator('body')).not_to_have_class(re.compile('reader-fullscreen'))
        # Long cover summaries remain reachable in a short landscape viewport.
        page.set_viewport_size({'width': 844, 'height': 390})
        for name in ['purity.html', 'how-to-build-your-light.html']:
            page.goto(BASE + '/' + name, wait_until='load')
            page.locator('#fullscreen-btn').click()
            page.wait_for_function("Math.abs(document.getElementById('book-container').getBoundingClientRect().height-visualViewport.height)<2")
            content = page.locator('.cover-content')
            assert content.evaluate('(el)=>el.clientHeight<=el.closest(".page-cover").clientHeight+1')
            if content.evaluate('(el)=>el.scrollHeight>el.clientHeight'):
                content.evaluate('(el)=>el.scrollTop=el.scrollHeight')
                assert content.evaluate('(el)=>el.scrollTop>0')
            page.locator('#exit-fullscreen-btn').click()
        print(f'PASS: {engine_name}: standalone fullscreen on all {len(READERS)} readers', flush=True)
        context.close()
        browser.close()
