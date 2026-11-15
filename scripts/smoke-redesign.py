#!/usr/bin/env python3
"""Functional and responsive checks for the static DEMAHS site.

Start the site on port 8000 first. Requires Playwright and Chromium in the test
environment, not on the deployed site. All external services are intercepted;
no public counter is incremented and no real form message is sent.
"""
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import runpy
import shutil
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get('DEMAHS_TEST_URL', 'http://127.0.0.1:8000').rstrip('/')
OUT = Path(os.environ.get('DEMAHS_SCREENSHOTS', '/tmp/demahs-redesign-screenshots'))
OUT.mkdir(parents=True, exist_ok=True)


def passed(text):
    print('PASS: ' + text, flush=True)


runpy.run_path(str(ROOT / 'scripts/verify-preservation.py'), run_name='__main__')


class References(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.refs = []
        self.ids = set()
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.add(a['id'])
        if tag in ('a', 'link') and 'href' in a:
            self.refs.append(a['href'])
        if tag in ('img', 'script', 'source') and 'src' in a:
            self.refs.append(a['src'])


pages = {p.name: References(p.read_text()) for p in ROOT.glob('*.html')}
references = set(pages)
for filename, document in pages.items():
    for ref in document.refs:
        url = urlsplit(ref)
        if url.scheme or url.netloc:
            continue
        path = unquote(url.path).lstrip('/') or filename
        assert (ROOT / path).is_file(), (filename, ref)
        if url.fragment and path in pages:
            assert unquote(url.fragment) in pages[path].ids, (filename, ref)
        references.add(path)
for path in sorted(references):
    with urlopen(BASE + '/' + path, timeout=10) as response:
        assert response.status == 200 and response.read() == (ROOT / path).read_bytes(), path
passed(f'all {len(pages)} page routes and {len(references)} local document/asset destinations serve correctly')

scripts = [(str(p.relative_to(ROOT)), p.read_text()) for p in ROOT.rglob('*.js') if '.git' not in p.parts]
for page in ROOT.glob('*.html'):
    scripts.extend((page.name, source) for source in re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', page.read_text(), re.S) if source.strip())
subprocess.run(['node', '-e', 'const fs=require("fs"),vm=require("vm");for(const [filename,src] of JSON.parse(fs.readFileSync(0,"utf8")))new vm.Script(src,{filename});'], input=json.dumps(scripts), text=True, check=True)
with tempfile.TemporaryDirectory() as d:
    target = Path(d)
    (target / 'scripts').mkdir()
    for f in ['updates.js', 'scripts/generate-feed.js']:
        shutil.copy2(ROOT / f, target / f)
    subprocess.run(['node', 'scripts/generate-feed.js'], cwd=target, check=True)
    assert (target / 'feed.xml').read_bytes() == (ROOT / 'feed.xml').read_bytes()
passed(f'{len(scripts)} JavaScript sources parse; RSS generator produces the unchanged feed')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True)
    errors = []
    local_failures = set()
    submissions = []

    def external(route):
        url = route.request.url
        if 'fonts.googleapis.com' in url:
            route.fulfill(status=200, content_type='text/css', body='/* Local fonts are used. */')
        elif 'formspree.io' in url:
            submissions.append(route.request.post_data)
            route.fulfill(status=200, content_type='application/json', body='{"ok":true}')
        elif 'api.dictionaryapi.dev' in url:
            route.fulfill(status=200, content_type='application/json', body=json.dumps([{'word': 'truth', 'meanings': [{'partOfSpeech': 'noun', 'definitions': [{'definition': 'That which is true.'}]}]}]))
        elif 'abacus.jasoncameron.dev' in url:
            route.fulfill(status=200, content_type='application/json', body='{"value":12345}')
        else:
            route.abort()

    def context(**kwargs):
        c = browser.new_context(reduced_motion='reduce', **kwargs)
        c.set_default_timeout(12000)
        c.route('https://**/*', external)
        c.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
        c.on('response', lambda response: local_failures.add(response.url) if response.url.startswith(BASE) and response.status >= 400 else None)
        return c

    desktop = context(viewport={'width': 1440, 'height': 960})
    page = desktop.new_page()
    page.goto(BASE + '/', wait_until='networkidle')
    expect(page.locator('.realm-world-card')).to_have_count(4)
    assert page.locator('.realm-landscape img').evaluate('(i)=>i.complete && i.naturalWidth > 0')
    page.keyboard.press('Tab')
    expect(page.locator('.realm-skip')).to_be_focused()
    page.keyboard.press('Enter')
    expect(page.locator('#main-content')).to_be_focused()
    expect(page.locator('#realm-theme-toggle')).to_have_count(0)
    assert page.locator('html').get_attribute('data-appearance') == 'dark'
    assert page.evaluate('getComputedStyle(document.documentElement).colorScheme') == 'dark'
    # A previously saved light choice and a light OS preference cannot restore light mode.
    page.evaluate("localStorage.setItem('demahs-appearance', 'light')")
    page.emulate_media(color_scheme='light')
    page.reload(wait_until='networkidle')
    assert page.locator('html').get_attribute('data-appearance') == 'dark'
    assert page.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(16, 31, 20)'
    assert page.evaluate("localStorage.getItem('demahs-appearance')") is None
    expect(page.locator('#realm-theme-toggle')).to_have_count(0)
    page.emulate_media(color_scheme='dark')
    page.screenshot(path=str(OUT / 'home-desktop.png'))
    summary = page.locator('.realm-menu summary').first
    summary.focus()
    page.keyboard.press('Enter')
    expect(page.locator('.realm-menu details').first).to_have_attribute('open', '')
    page.keyboard.press('Escape')
    expect(summary).to_be_focused()
    page.locator('#realm-search-open').click()
    expect(page.locator('#realm-search-input')).to_be_focused()
    page.locator('#realm-search-input').fill('the')
    expect(page.locator('.realm-search-results a')).to_have_count(6)
    expect(page.locator('.realm-search-pager')).to_be_visible()
    page.locator('.realm-search-pager [data-direction="1"]').click()
    expect(page.locator('.realm-search-pager span')).to_contain_text('Page 2')
    page.locator('#realm-search-input').fill('light')
    expect(page.locator('.realm-search-results a')).to_have_count(5)
    expect(page.locator('.realm-search-results strong').first).to_have_text('Advice')
    page.keyboard.press('Escape')
    expect(page.locator('#realm-search-open')).to_be_focused()
    page.locator('.realm-primary').click()
    page.wait_for_url('**/library.html')
    expect(page.locator('.book-btn')).to_have_count(36)
    expect(page.locator('.update-card')).to_have_count(4)
    assert page.locator('#library-search').evaluate('(el)=>getComputedStyle(el).opacity') == '1'
    page.locator('#ls-input').fill('light')
    expect(page.locator('.ls-row-link')).to_have_count(5)
    page.locator('.ls-row-save').first.click()
    expect(page.locator('#ls-saved-count')).to_contain_text('1')
    page.locator('#ls-saved-toggle').click()
    expect(page.locator('.ls-saved-item')).to_have_count(1)
    page.locator('.ls-row-link').first.click()
    page.wait_for_url('**/advice.html')
    passed('keyboard skip/dropdown, sole leaf-green appearance, modal search/pagination, original search and saved searches')

    assert page.evaluate('ReaderState.total') > 1
    page.locator('#bar-next').click()
    page.wait_for_function('ReaderState.getCurrent() === 1')
    expect(page.locator('.page.active .page-body')).to_contain_text('Remember truth often')
    page.locator('#font-inc-btn').click()
    expect(page.locator('#font-size-pct')).to_have_text('110%')
    page.locator('#bookmark-ribbon').focus()
    page.keyboard.press('Enter')
    page.locator('#bm-add-btn').click()
    expect(page.locator('.bm-item')).to_have_count(1)
    page.locator('.bm-name-input').fill('A saved place')
    page.locator('.bm-name-input').press('Tab')
    page.locator('#bm-panel-close').click()
    page.locator('.page.active .page-body p').first.click()
    expect(page.locator('.user-highlight').first).to_be_visible()
    page.locator('#home-btn').click()
    expect(page.locator('#continue-reading-link')).to_have_attribute('href', 'advice.html?resume=1')
    page.locator('#continue-reading-link').click()
    page.wait_for_function('ReaderState.getCurrent() === 1')
    expect(page.locator('#font-size-pct')).to_have_text('110%')
    expect(page.locator('.page.active .user-highlight').first).to_be_visible()
    page.locator('#bookmark-ribbon').focus()
    page.keyboard.press('Enter')
    expect(page.locator('.bm-name-input')).to_have_value('A saved place')
    page.locator('#bm-tab-highlights').click()
    expect(page.locator('.bm-hl-item')).to_have_count(1)
    page.locator('#bm-panel-close').click()
    page.locator('#search-input').fill('truth')
    page.locator('#search-btn').click()
    expect(page.locator('#search-result')).to_contain_text('results')
    expect(page.locator('mark.search-highlight.current')).to_have_count(1)
    page.locator('#search-next-btn').click()
    expect(page.locator('#search-count')).to_contain_text('2 of')
    page.locator('#search-clear').click()
    expect(page.locator('mark.search-highlight')).to_have_count(0)
    page.locator('#recent-btn').click()
    expect(page.locator('#recent-menu')).to_contain_text('truth')
    page.locator('#recent-btn').click()
    page.locator('#fullscreen-btn').click()
    expect(page.locator('body')).to_have_class(re.compile('reader-fullscreen'))
    expect(page.locator('.realm-header')).to_be_hidden()
    page.keyboard.press('Escape')
    expect(page.locator('body')).not_to_have_class(re.compile('reader-fullscreen'))
    page.wait_for_function('document.fullscreenElement === null')
    passed('page turns, deep links/resume, persistent font size, named bookmarks, highlights, chapter search, recent searches and fullscreen')

    # Use a fresh reader for text-selection tools, independent of native fullscreen
    # focus restoration and the preceding search's asynchronous page-turn timers.
    reader_page = page
    text_tools = context(viewport={'width':1440,'height':960}, permissions=['clipboard-read','clipboard-write'])
    page = text_tools.new_page()
    page.goto(BASE + '/advice.html?page=1', wait_until='load')
    page.wait_for_function('ReaderState.getCurrent() === 1')
    paragraph = page.locator('.page.active .page-body p').first
    paragraph.scroll_into_view_if_needed()
    select_word = '''() => {
      const p=document.querySelector('.page.active .page-body p');
      const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT); let n;
      while(n=walker.nextNode()) { const at=n.textContent.indexOf('truth'); if(at<0) continue;
        const range=document.createRange(); range.setStart(n,at); range.setEnd(n,at+5);
        const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range); return;
      } throw Error('Expected word not found');
    }'''
    page.evaluate(select_word)
    paragraph.dispatch_event('contextmenu', {'clientX':500, 'clientY':500})
    expect(page.locator('#def-text')).to_have_text('That which is true.')
    page.locator('#search-input').click()
    paragraph.scroll_into_view_if_needed()
    page.evaluate(select_word)
    paragraph.dispatch_event('mouseup')
    expect(page.locator('#hl-btn-copy')).to_be_visible()
    page.locator('#hl-btn-copy').click()
    expect(page.locator('#share-toast')).to_have_text('Copied to clipboard')
    assert page.evaluate('navigator.clipboard.readText()') == 'truth'
    page.evaluate('Object.defineProperty(navigator,"share",{value:undefined,configurable:true})')
    page.evaluate(select_word)
    paragraph.dispatch_event('mouseup')
    expect(page.locator('#hl-btn-share')).to_be_visible()
    page.locator('#hl-btn-share').click()
    expect(page.locator('#share-toast')).to_have_text('Passage copied to clipboard')
    assert 'From “Advice” by EARNLIGHT' in page.evaluate('navigator.clipboard.readText()')
    passed('dictionary response UI, selection copy and share clipboard fallback (mock dictionary; real browser clipboard)')
    text_tools.close()
    page = reader_page

    # Exercise form UI and rate limiting against a local Playwright response only.
    for n in range(2):
        page.locator('#c-name').fill('Local smoke check')
        page.locator('#c-message').fill('Intercepted test; this message never leaves the browser.')
        if n == 0:
            page.locator('.toggle-wrap').click()
            expect(page.locator('#public-value')).to_have_value('Yes')
        page.locator('#submit-btn').click()
        expect(page.locator('#form-message')).to_contain_text('Your message has been received')
        page.wait_for_function("JSON.parse(localStorage.getItem('noegenesis-form-submits-advice') || '{}').count === " + str(n + 1))
        expect(page.locator('#submit-btn')).to_be_enabled()
    assert len(submissions) == 2
    page.locator('#c-name').fill('Local smoke check')
    page.locator('#c-message').fill('This request must be blocked by the local daily limit.')
    page.locator('#submit-btn').click()
    expect(page.locator('#form-message')).to_contain_text('daily message limit')
    assert len(submissions) == 2
    passed('comment consent, success handling and daily submission limit (mock service; no message sent)')

    page.goto(BASE + '/foreword.html', wait_until='networkidle')
    expect(page.locator('.realm-manuscript-tools')).to_be_visible()
    page.locator('.realm-manuscript-tools [aria-label="Increase text size"]').click()
    expect(page.locator('.realm-manuscript-tools span')).to_have_text('110%')
    page.reload(wait_until='networkidle')
    expect(page.locator('.realm-manuscript-tools span')).to_have_text('110%')
    passed('frontmatter content and persistent reading-size controls')

    # Readiness requires all precached URLs, not merely an active worker.
    assets = re.findall(r"'(/[^']*)'", (ROOT / 'service-worker.js').read_text().split('const ASSETS = [', 1)[1].split('];', 1)[0])
    page.wait_for_function('navigator.serviceWorker.controller !== null')
    page.wait_for_function("async (assets) => {const c=await caches.open('demahs-realm-v2'); return (await Promise.all(assets.map(a=>c.match(a)))).every(Boolean);}", arg=assets)
    desktop.set_offline(True)
    page.goto(BASE + '/advice.html?page=1', wait_until='domcontentloaded')
    page.wait_for_function('ReaderState.getCurrent() === 1')
    expect(page.locator('.page.active .page-body')).to_contain_text('Remember truth often')
    assert page.locator('body').evaluate('(el)=>getComputedStyle(el).backgroundColor') == 'rgb(16, 31, 20)'
    page.locator('#realm-search-open').click()
    page.locator('#realm-search-input').fill('light')
    expect(page.locator('.realm-search-results a')).to_have_count(5)
    page.keyboard.press('Escape')
    desktop.set_offline(False)
    passed(f'offline deep links, styles/fonts/artwork cache and offline global search ({len(assets)} precached URLs)')
    desktop.close()

    for label, width, height in [('desktop', 1440, 960), ('tablet', 820, 1180), ('mobile', 390, 844), ('narrow', 320, 740)]:
        c = context(viewport={'width': width, 'height': height}, is_mobile=width < 700, has_touch=width < 700)
        pg = c.new_page()
        for name in sorted(pages):
            pg.goto(BASE + '/' + name, wait_until='load')
            assert pg.locator('.realm-header').is_visible(), (label, name)
            expect(pg.locator('#realm-theme-toggle')).to_have_count(0)
            assert pg.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(16, 31, 20)', (label, name)
            assert pg.evaluate('getComputedStyle(document.documentElement).colorScheme') == 'dark', (label, name)
            assert pg.locator('main').count() == 1, (label, name)
            assert pg.locator('h1').count() == 1, (label, name)
            assert not pg.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), (label, name, 'horizontal overflow')
            if name == 'advice.html':
                pg.locator('#bar-next').click()
                pg.wait_for_function('ReaderState.getCurrent() === 1')
                assert pg.locator('.page.active .page-body').evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)') >= 17
            if name in ('index.html', 'library.html', 'advice.html', 'foreword.html'):
                pg.evaluate('scrollTo(0, 0)')
                pg.screenshot(path=str(OUT / f'{name[:-5]}-{label}.png'))
        pg.goto(BASE + '/index.html', wait_until='load')
        if width <= 960:
            pg.locator('#realm-menu-toggle').click()
            expect(pg.locator('#realm-menu')).to_be_visible()
            expect(pg.locator('#realm-menu-toggle')).to_have_attribute('aria-expanded', 'true')
            pg.keyboard.press('Escape')
            expect(pg.locator('#realm-menu-toggle')).to_be_focused()
            expect(pg.locator('#realm-menu')).to_be_hidden()
        assert pg.locator('.realm-hero').evaluate('(el)=>getComputedStyle(el,"::before").animationName') == 'none'
        for image in pg.locator('img').all():
            image.scroll_into_view_if_needed()
            expect(image).to_have_js_property('complete', True)
            assert image.evaluate('(img)=>img.naturalWidth > 0')
        c.close()
        passed(f'all 38 pages at {label} {width}×{height}: no overflow, main/title landmarks, shared layout, reduced motion and imagery')

    # Also inspect the actual animated appearance after its short entry animation.
    animated = browser.new_context(viewport={'width':1440,'height':960}, reduced_motion='no-preference')
    animated.route('https://**/*', external)
    animated.add_init_script('''window.realmMetrics={cls:0,lcp:0};
      new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!e.hadRecentInput)realmMetrics.cls+=e.value})).observe({type:'layout-shift',buffered:true});
      new PerformanceObserver(list=>{realmMetrics.lcp=list.getEntries().at(-1).startTime}).observe({type:'largest-contentful-paint',buffered:true});''')
    pg = animated.new_page()
    pg.goto(BASE + '/', wait_until='networkidle')
    pg.wait_for_function('document.getAnimations().filter(a=>a.effect?.target?.matches(".hero-title")).every(a=>a.playState==="finished")')
    pg.screenshot(path=str(OUT / 'home-animated.png'))
    metrics = pg.evaluate('realmMetrics')
    assert metrics['cls'] < 0.1, metrics
    passed(f'local Chromium loading observation: LCP {round(metrics["lcp"])} ms, CLS {metrics["cls"]:.4f} (not a public-network benchmark)')
    animated.close()
    assert not errors, errors
    # Missing approved comments is an audited pre-existing optional data file.
    assert local_failures <= {BASE + '/comments.json'}, local_failures
    passed('no uncaught browser errors; only the pre-existing optional comments.json 404 is allowed')
    browser.close()

print(f'All checks complete. Screenshots: {OUT}', flush=True)
