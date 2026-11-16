/* The leaf-green night palette is the sole appearance, applied before paint. */
(() => {
  document.documentElement.dataset.appearance = 'dark';
  document.documentElement.classList.add('realm-design');
  try { localStorage.removeItem('demahs-appearance'); } catch (_) {}
})();

/* Keep the legacy atmosphere economical on large displays; other callbacks are untouched. */
(() => {
  const request=window.requestAnimationFrame.bind(window),last=new WeakMap(),paused=new Set();
  function atmosphereFrame(callback){
    if(callback.name!=='draw'||!String(callback).includes('shootingStar'))return request(callback);
    const canvas=document.getElementById('starfield'),parent=canvas?.closest('.cosmic-bg');
    if(!canvas||parent&&getComputedStyle(parent).display==='none')return 0;
    if(document.hidden){paused.add(callback);return 0;}
    return request(time=>{if(document.hidden){paused.add(callback);return;}if(parent&&getComputedStyle(parent).display==='none')return;
      if(time-(last.get(callback)??-Infinity)<50){atmosphereFrame(callback);return;}
      last.set(callback,time);callback(time);
    });
  }
  window.requestAnimationFrame=atmosphereFrame;
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){const callbacks=[...paused];paused.clear();callbacks.forEach(atmosphereFrame);}});
})();
