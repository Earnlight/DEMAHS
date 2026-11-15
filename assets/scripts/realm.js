/* Shared navigation, appearance and search. The existing chapter readers remain independent. */
(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const mount = document.getElementById('realm-navigation');
  if (!mount) return;

  const icons = {
    crown: '<svg class="realm-crown" viewBox="0 0 56 46" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M7 34 3 12l14 11L28 4l11 19 14-11-4 22Z"/><path d="m8 30 41 0M10 36h36v5H10ZM8 26l11 4 9-17 9 17 12-4M15 27l-1-9m28 9 1-9"/><path d="m28 0 1.8 3.5L33 5l-3.2 1.5L28 10l-1.8-3.5L23 5l3.2-1.5Z" fill="currentColor"/><circle cx="3" cy="11" r="2"/><circle cx="53" cy="11" r="2"/><circle cx="17" cy="19" r="1.7"/><circle cx="39" cy="19" r="1.7"/><path d="m14 38 2-2 2 2-2 2Zm12 0 2-2 2 2-2 2Zm12 0 2-2 2 2-2 2Z" fill="currentColor"/></g></svg>',
    chevron: '<svg class="realm-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
    search: '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="11.5" cy="11.5" r="8"/><path d="m17.5 17.5 7 7"/></svg>',
    sun: '<svg class="realm-theme-sun" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="5"/><path d="M14 1v4m0 18v4M1 14h4m18 0h4M4.8 4.8l2.8 2.8m12.8 12.8 2.8 2.8M4.8 23.2l2.8-2.8M20.4 7.6l2.8-2.8"/></svg>',
    moon: '<svg class="realm-theme-moon" viewBox="0 0 28 28" aria-hidden="true"><path d="M23.5 16.5A10.5 10.5 0 0 1 11.5 3a10.5 10.5 0 1 0 12 13.5Z"/></svg>',
    menu: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 7h20M4 14h20M4 21h20"/></svg>',
    close: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="m7 7 14 14M21 7 7 21"/></svg>',
  };
  const parts = [
    ['Foundations', 'foundations'], ['The Person', 'the-person'], ['Knowledge', 'knowledge'],
    ['Expression', 'expression'], ['Character', 'character'], ['Power & Order', 'power-order'], ['Destiny', 'destiny'],
  ];
  const links = parts.map(([title, id]) => `<a href="library.html#${id}">${title.replace('&', '&amp;')}</a>`).join('');
  mount.innerHTML = `<a class="realm-skip" href="#main-content">Skip to content</a>
    <header class="realm-header">
      <a class="realm-brand" href="index.html" aria-label="DEMAHS home">${icons.crown}<span>DEMAHS</span></a>
      <nav class="realm-menu" id="realm-menu" aria-label="Main navigation">
        <details class="realm-dropdown"><summary>Library ${icons.chevron}</summary><div class="realm-dropdown-panel"><a href="library.html">The complete library</a><a href="introduction.html">Introduction</a><a href="advice.html">Advice</a><a href="library.html#library-search">Search every chapter</a></div></details>
        <details class="realm-dropdown"><summary>Explore ${icons.chevron}</summary><div class="realm-dropdown-panel">${links}</div></details>
        <details class="realm-dropdown"><summary>About ${icons.chevron}</summary><div class="realm-dropdown-panel"><a href="index.html#about">About This Work</a><a href="foreword.html">Foreword</a><a href="authors-notes.html">Author's Notes</a></div></details>
        <a class="realm-nav-link" href="library.html#updates">News</a>
        <a class="realm-nav-link" href="library.html#connect">Connect</a>
      </nav>
      <div class="realm-header-actions">
        <button type="button" class="realm-icon-button" id="realm-search-open" aria-label="Search the library">${icons.search}</button>
        <button type="button" class="realm-icon-button" id="realm-theme-toggle" aria-label="Switch to dark appearance" aria-pressed="false">${icons.sun}${icons.moon}</button>
        <a class="realm-enter" href="introduction.html">Enter the Light <span aria-hidden="true">✧</span></a>
        <button type="button" class="realm-icon-button realm-menu-toggle" id="realm-menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="realm-menu">${icons.menu}</button>
      </div>
    </header>`;

  const themeButton = document.getElementById('realm-theme-toggle');
  function applyAppearance(appearance) {
    root.dataset.appearance = appearance;
    themeButton.setAttribute('aria-pressed', String(appearance === 'dark'));
    themeButton.setAttribute('aria-label', `Switch to ${appearance === 'dark' ? 'light' : 'dark'} appearance`);
  }
  applyAppearance(root.dataset.appearance || 'light');
  themeButton.addEventListener('click', () => {
    const next = root.dataset.appearance === 'dark' ? 'light' : 'dark';
    applyAppearance(next);
    try { localStorage.setItem('demahs-appearance', next); } catch (_) {}
  });
  window.addEventListener('storage', event => {
    if (event.key === 'demahs-appearance') applyAppearance(event.newValue === 'dark' ? 'dark' : 'light');
  });

  const menu = document.getElementById('realm-menu');
  const menuButton = document.getElementById('realm-menu-toggle');
  function closeMenu(returnFocus = false) {
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    menuButton.innerHTML = icons.menu;
    menu.querySelectorAll('details[open]').forEach(details => { details.open = false; });
    if (returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    if (menu.classList.contains('is-open')) { closeMenu(); return; }
    menu.classList.add('is-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Close navigation');
    menuButton.innerHTML = icons.close;
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  const dropdowns = [...menu.querySelectorAll('details')];
  dropdowns.forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open) dropdowns.forEach(other => { if (other !== details) other.open = false; });
    });
  });
  document.addEventListener('click', event => {
    // The toggle replaces its SVG, so its original target may be detached by now.
    if (!event.composedPath().includes(mount)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = menu.querySelector('details[open]');
    if (open) { open.open = false; open.querySelector('summary').focus(); }
    else if (menu.classList.contains('is-open')) closeMenu(true);
  });
  matchMedia('(min-width: 961px)').addEventListener('change', () => closeMenu());
  let scrolled = false;
  const updateHeader = () => {
    const next = window.scrollY > 35;
    if (next !== scrolled) { body.classList.toggle('realm-scrolled', next); scrolled = next; }
  };
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  if (body.classList.contains('realm-reader') || body.classList.contains('realm-manuscript')) {
    const footer = document.createElement('footer');
    footer.id = 'realm-footer';
    footer.innerHTML = '<nav aria-label="Footer navigation"><a href="library.html">Library</a><a href="index.html#about">About This Work</a><a href="library.html#connect">Connect</a><a href="feed.xml">RSS</a></nav><p>The DEMAHS &nbsp;·&nbsp; EARNLIGHT &nbsp;·&nbsp; All rights reserved</p>';
    body.appendChild(footer);
  }

  // Frontmatter gets the same adjustable reading size as the chapter readers.
  if (body.classList.contains('realm-manuscript')) {
    const manuscript = document.querySelector('.manuscript-wrap');
    const tools = document.createElement('div');
    tools.className = 'realm-manuscript-tools';
    tools.setAttribute('role', 'group');
    tools.setAttribute('aria-label', 'Reading text size');
    tools.innerHTML = '<button type="button" aria-label="Decrease text size">A−</button><span aria-live="polite">100%</span><button type="button" aria-label="Increase text size">A+</button>';
    manuscript.before(tools);
    const steps = [.9, 1, 1.1, 1.2, 1.35];
    let scale = 1;
    try { const saved = Number(localStorage.getItem('demahs-manuscript-scale')); if (steps.includes(saved)) scale = saved; } catch (_) {}
    const buttons = tools.querySelectorAll('button');
    function updateSize() {
      root.style.setProperty('--manuscript-scale', scale);
      tools.querySelector('span').textContent = `${Math.round(scale * 100)}%`;
      buttons[0].disabled = scale === steps[0];
      buttons[1].disabled = scale === steps[steps.length - 1];
      try { localStorage.setItem('demahs-manuscript-scale', String(scale)); } catch (_) {}
    }
    buttons.forEach((button, i) => button.addEventListener('click', () => {
      scale = steps[Math.min(steps.length - 1, Math.max(0, steps.indexOf(scale) + (i ? 1 : -1)))];
      updateSize();
    }));
    updateSize();
  }

  // Search the real chapter source on demand. No generated index to become stale.
  const dialog = document.createElement('dialog');
  dialog.className = 'realm-search-dialog';
  dialog.id = 'realm-search-dialog';
  dialog.setAttribute('aria-labelledby', 'realm-search-title');
  dialog.innerHTML = `<div class="realm-search-head"><h2 id="realm-search-title">Search the library</h2><button class="realm-icon-button" type="button" aria-label="Close search">${icons.close}</button></div>
    <form class="realm-search-form" role="search"><label class="realm-sr-only" for="realm-search-input">Search every chapter</label><input id="realm-search-input" name="q" type="search" placeholder="A word, an idea, a possibility…" autocomplete="off"><button type="submit">Search</button></form>
    <p class="realm-search-status" role="status" aria-live="polite">Explore the words within the work.</p><div class="realm-search-results"></div>
    <div class="realm-search-pager" hidden><button type="button" data-direction="-1">← Previous</button><span></span><button type="button" data-direction="1">Next →</button></div>`;
  body.appendChild(dialog);
  const opener = document.getElementById('realm-search-open');
  const input = dialog.querySelector('input');
  const status = dialog.querySelector('.realm-search-status');
  const results = dialog.querySelector('.realm-search-results');
  const pager = dialog.querySelector('.realm-search-pager');
  opener.addEventListener('click', () => {
    closeMenu();
    if (!dialog.showModal) { location.href = 'library.html#library-search'; return; }
    dialog.showModal();
    input.focus();
  });
  dialog.querySelector('[aria-label="Close search"]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    // A search input can otherwise consume the first Escape to clear its value.
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => opener.focus());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });

  let indexPromise;
  let failed = 0;
  function extractUnits(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for (const script of doc.querySelectorAll('script:not([src])')) {
      const match = script.textContent.match(/const CHAPTER_TEXT\s*=\s*`([\s\S]*?)`\s*;/);
      if (!match) continue;
      if (!match[1].trim()) break;
      return match[1].trim().split(/\n{2,}/).map(text => ({ page: null, text: text.replace(/\s+/g, ' ').trim() })).filter(unit => unit.text);
    }
    const pages = [...doc.querySelectorAll('.page[data-page]')];
    if (pages.length) return pages.filter(page => Number(page.dataset.page) > 0).map(page => ({ page: Number(page.dataset.page), text: (page.querySelector('.page-body') || page).textContent.replace(/\s+/g, ' ').trim() }));
    const manuscript = doc.querySelector('.manuscript');
    return manuscript ? [{ page: null, text: manuscript.textContent.replace(/\s+/g, ' ').trim() }] : [];
  }
  async function getIndex() {
    if (!indexPromise) indexPromise = (async () => {
      let library = document;
      if (!body.classList.contains('realm-library')) {
        const response = await fetch('library.html', { cache: 'no-cache' });
        if (!response.ok) throw new Error('Library could not be loaded.');
        library = new DOMParser().parseFromString(await response.text(), 'text/html');
      }
      const books = [...library.querySelectorAll('.book-btn')].map(link => ({ file: link.getAttribute('href'), title: link.querySelector('.btn-title').textContent.trim() }));
      return (await Promise.all(books.map(async book => {
        try {
          const response = await fetch(book.file, { cache: 'no-cache' });
          if (!response.ok) throw new Error('Chapter could not be loaded.');
          return extractUnits(await response.text()).map(unit => ({ ...unit, ...book }));
        } catch (_) { failed++; return []; }
      }))).flat();
    })().catch(error => { indexPromise = null; throw error; });
    return indexPromise;
  }
  let matches = [], pageNumber = 0, generation = 0, timer;
  const perPage = 6;
  function renderResults(query) {
    results.replaceChildren();
    const start = pageNumber * perPage;
    matches.slice(start, start + perPage).forEach(unit => {
      const link = document.createElement('a');
      link.href = unit.file + (unit.page ? `?page=${unit.page}` : '');
      const title = document.createElement('strong');
      title.textContent = unit.title + (unit.page ? ` · Page ${unit.page}` : '');
      const snippet = document.createElement('p');
      const at = unit.text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
      const begin = Math.max(0, at - 65), end = Math.min(unit.text.length, at + query.length + 120);
      snippet.textContent = (begin ? '…' : '') + unit.text.slice(begin, end) + (end < unit.text.length ? '…' : '');
      link.append(title, snippet);
      results.appendChild(link);
    });
    const count = matches.length;
    status.textContent = `${count} ${count === 1 ? 'passage' : 'passages'} found${failed ? ` · ${failed} chapters unavailable` : ''}.`;
    pager.hidden = count <= perPage;
    pager.querySelector('span').textContent = `Page ${pageNumber + 1} of ${Math.max(1, Math.ceil(count / perPage))}`;
    pager.querySelector('[data-direction="-1"]').disabled = pageNumber === 0;
    pager.querySelector('[data-direction="1"]').disabled = start + perPage >= count;
  }
  async function search() {
    const current = ++generation, query = input.value.trim();
    results.replaceChildren(); pager.hidden = true;
    if (query.length < 2) { status.textContent = 'Enter at least two characters to explore the library.'; return; }
    status.textContent = 'Looking through the library…';
    try {
      const index = await getIndex();
      if (current !== generation) return;
      matches = index.filter(unit => unit.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
      pageNumber = 0;
      renderResults(query);
    } catch (_) { if (current === generation) status.textContent = 'The library could not be reached. Please try again when connected.'; }
  }
  input.addEventListener('input', () => { ++generation; clearTimeout(timer); timer = setTimeout(search, 220); });
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); search(); });
  pager.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    pageNumber += Number(button.dataset.direction);
    renderResults(input.value.trim());
    dialog.scrollTop = 0;
  }));

  // Deep links from the header and URL search are also supported by the original search.
  if (body.classList.contains('realm-library')) {
    const query = new URLSearchParams(location.search).get('q');
    if (query) {
      const libraryInput = document.getElementById('ls-input');
      libraryInput.value = query;
      libraryInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // The homepage previously had no worker registration of its own.
  if ('serviceWorker' in navigator && body.classList.contains('realm-home')) {
    // Let the panorama and fonts finish before warming the offline collection.
    const register = () => navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }
})();
