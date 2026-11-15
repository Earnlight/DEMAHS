/* One fullscreen controller for all chapter readers, including installed PWAs. */
(() => {
  'use strict';
  const body = document.body;
  if (!body.classList.contains('realm-reader')) return;
  const root = document.documentElement;
  const book = document.getElementById('book');
  const enterButton = document.getElementById('fullscreen-btn');
  const exitButton = document.getElementById('exit-fullscreen-btn');
  let active = false;
  let nativeSession = false;
  let savedScroll = { x: 0, y: 0 };
  let viewportFrame = 0;
  const viewportProperties = ['height', 'width', 'top', 'left'];
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;

  function updateViewport() {
    viewportFrame = 0;
    if (!active) return;
    const viewport = window.visualViewport;
    const values = [viewport?.height || innerHeight, viewport?.width || innerWidth, viewport?.offsetTop || 0, viewport?.offsetLeft || 0];
    viewportProperties.forEach((name, index) => root.style.setProperty('--reader-viewport-' + name, values[index] + 'px'));
  }
  function scheduleViewport() {
    if (active && !viewportFrame) viewportFrame = requestAnimationFrame(updateViewport);
  }
  async function leaveNative() {
    if (!fullscreenElement()) return;
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } catch (_) { /* The browser may already have left native fullscreen. */ }
  }
  async function enter() {
    if (active) return;
    savedScroll = { x: scrollX, y: scrollY };
    active = true;
    root.classList.add('reader-fullscreen-active');
    body.classList.add('reader-fullscreen');
    enterButton.hidden = true;
    updateViewport();
    window.__chromeActivity?.();
    exitButton.focus({ preventScroll: true });
    // Standalone PWAs already occupy their app window. Native requests are
    // unsupported on some phones and trigger an extra viewport transition on others.
    if (standalone()) return;
    try {
      if (document.fullscreenEnabled && root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: 'hide' });
      } else if (document.webkitFullscreenEnabled && root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      }
      nativeSession = Boolean(fullscreenElement());
      if (!active) { await leaveNative(); nativeSession = false; }
    } catch (_) { /* The viewport-sized CSS reader remains available if denied. */ }
    scheduleViewport();
  }
  function exit() {
    if (!active) return;
    active = false;
    nativeSession = false;
    cancelAnimationFrame(viewportFrame);
    viewportFrame = 0;
    body.classList.remove('reader-fullscreen', 'chrome-hidden');
    root.classList.remove('reader-fullscreen-active');
    viewportProperties.forEach(name => root.style.removeProperty('--reader-viewport-' + name));
    enterButton.hidden = false;
    void leaveNative();
    scrollTo(savedScroll.x, savedScroll.y);
    enterButton.focus({ preventScroll: true });
  }
  function nativeChange() {
    if (fullscreenElement()) nativeSession = true;
    else if (active && nativeSession) exit();
    scheduleViewport();
  }
  enterButton.addEventListener('click', enter);
  exitButton.addEventListener('click', exit);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') exit(); });
  document.addEventListener('fullscreenchange', nativeChange);
  document.addEventListener('webkitfullscreenchange', nativeChange);
  window.addEventListener('resize', scheduleViewport);
  window.addEventListener('orientationchange', scheduleViewport);
  window.addEventListener('pageshow', scheduleViewport);
  window.addEventListener('pagehide', exit);
  window.visualViewport?.addEventListener('resize', scheduleViewport);
  window.visualViewport?.addEventListener('scroll', scheduleViewport);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleViewport(); });
  document.getElementById('fs-prev').addEventListener('click', () => ReaderState.goTo(ReaderState.getCurrent() - 1, 'prev'));
  document.getElementById('fs-next').addEventListener('click', () => ReaderState.goTo(ReaderState.getCurrent() + 1, 'next'));
  let lastTap = null;
  book.addEventListener('click', event => {
    if (event.target.closest('button,a,input,textarea,[role="button"]')) return;
    const now = performance.now();
    if (lastTap && now - lastTap.time < 500 && Math.abs(event.clientX - lastTap.x) < 50 && Math.abs(event.clientY - lastTap.y) < 50) {
      lastTap = null;
      event.__dblTapFullscreen = true;
      if (active) exit(); else void enter();
    } else lastTap = { time: now, x: event.clientX, y: event.clientY };
  }, true);
})();
