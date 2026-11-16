/* Protect legacy records before the original page scripts initialise. */
(() => {
  const savedValues = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (/^noegenesis-(bookmarks?|highlights|lastread|progress|font-scale)/.test(key)) savedValues[key] = localStorage.getItem(key);
    }
  } catch (_) { /* The new reader reports unavailable storage when saving. */ }
  const request = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  const pending = new Set();
  window.requestAnimationFrame = callback => {
    // Track only the original decorative starfield, never other application callbacks.
    if (callback.name !== 'draw' || !String(callback).includes('shootingStar')) return request(callback);
    const id = request(time => { pending.delete(id); callback(time); });
    pending.add(id);
    return id;
  };
  window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  window.DemahsReaderBoot = {
    savedValues,
    finish() {
      // The legacy UI is now hidden; its decorative starfield need not keep running.
      pending.forEach(cancel);
      pending.clear();
      window.requestAnimationFrame = request;
      window.cancelAnimationFrame = cancel;
      try { Object.entries(savedValues).forEach(([key, value]) => localStorage.setItem(key, value)); } catch (_) {}
    }
  };
})();
