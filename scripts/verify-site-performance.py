#!/usr/bin/env python3
"""Measure atmosphere work and assert that warm image/font requests avoid the network."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from collections import Counter
from urllib.parse import urlsplit
import threading,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
hits=Counter()
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):hits[urlsplit(self.path).path]+=1;super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(server.server_port)
assets=re.findall(r"'([^']+)'",re.search(r'const ASSETS = \[([\s\S]*?)\];',(ROOT/'service-worker.js').read_text())[1]);cache=re.search(r"const CACHE_NAME = '([^']+)'",(ROOT/'service-worker.js').read_text())[1]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  c=b.new_context(viewport={'width':1920,'height':1080});c.route('https://**/*',lambda r:r.abort());c.add_init_script("window.atmosphereDraws=0;const original=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.id==='starfield')atmosphereDraws++;return original.apply(this,args);};")
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/index.html');page.wait_for_timeout(1200);assert page.evaluate('atmosphereDraws')==0
  print('PASS: hidden homepage starfield performs zero redraws at 1920×1080.',flush=True)
  page.wait_for_function('navigator.serviceWorker.controller');page.wait_for_function('(async()=>{const c=await caches.open('+repr(cache)+');return (await c.keys()).length>='+str(len(assets))+';})()',timeout=60000)
  paths=['/assets/images/celestial-realm.webp','/assets/fonts/cinzel-latin-wght-normal.woff2'];before={path:hits[path] for path in paths}
  for path in paths:assert page.evaluate('path=>fetch(path).then(r=>r.arrayBuffer()).then(b=>b.byteLength)',path)>0
  assert before=={path:hits[path] for path in paths},(before,dict(hits))
  print('PASS: warm artwork/font requests transfer no HTTP bytes; complete offline collection is still cached.',flush=True)
  page.goto(base+'/library.html');page.wait_for_timeout(1200);draws=page.evaluate('atmosphereDraws');assert 1<=draws<=30,draws
  assert page.locator('.nebula-blob').first.evaluate('el=>getComputedStyle(el).animationName')=='none'
  print('PASS: desktop library atmosphere limited to',draws,'draws in ~1.2s; large blurred layers are static.',flush=True)
  page.goto(base+'/advice.html');page.wait_for_function('window.DemahsReader?.getPagination().ready');c.set_offline(True);page.reload();page.wait_for_function('window.DemahsReader?.getPagination().ready');page.locator('[data-action=next-page]').click();assert page.evaluate('DemahsReader.getPagination().page')==2
  assert not errors,errors
  print('PASS: offline reader navigation and local assets remain functional; no uncaught application errors.',flush=True)
  b.close()
finally:server.shutdown();server.server_close()
print('ALL SITE PERFORMANCE CHECKS PASSED',flush=True)
