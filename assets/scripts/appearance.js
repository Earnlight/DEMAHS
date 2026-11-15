/* The leaf-green night palette is the sole appearance, applied before paint. */
(() => {
  document.documentElement.dataset.appearance = 'dark';
  document.documentElement.classList.add('realm-design');
  try { localStorage.removeItem('demahs-appearance'); } catch (_) {}
})();
