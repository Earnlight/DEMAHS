/* Apply appearance before paint. Separate from the legacy reader's theme key. */
(() => {
  let appearance = 'light';
  try { if (localStorage.getItem('demahs-appearance') === 'dark') appearance = 'dark'; } catch (_) {}
  document.documentElement.dataset.appearance = appearance;
  document.documentElement.classList.add('realm-design');
})();
