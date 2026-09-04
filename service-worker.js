// My Noegenesis — Service Worker
// Caches all pages for offline use and fast loading

const CACHE_NAME = 'noegenesis-v6';

// List every file in your site here
const ASSETS = [
  '/',
  '/index.html',
  '/library.html',
  '/foreword.html',
  '/authors-notes.html',
  '/introduction.html',
  '/light-as-meaning.html',
  '/how-to-build-your-light.html',
  '/advice.html',
  '/our-heart.html',
  '/the-continuum.html',
  '/imagination.html',
  '/the-pen.html',
  '/greatness.html',
  '/our-mind.html',
  '/truth.html',
  '/reality.html',
  '/thoughts.html',
  '/honour.html',
  '/power.html',
  '/reason.html',
  '/purity.html',
  '/belief.html',
  '/pleasure.html',
  '/understanding.html',
  '/morality.html',
  '/the-unseen.html',
  '/age-vs-evolution.html',
  '/the-conscience.html',
  '/gravitation.html',
  '/the-nature-of-life.html',
  '/reading.html',
  '/delusion.html',
  '/weakness.html',
  '/weight.html',
  '/hierarchy.html',
  '/the-finality.html',
  '/paradise.html',
  '/hellfire.html',
  '/manifest.json',
  '/updates.js',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install: cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: try the network first so edits show up immediately, cache the
// result for offline use, and only fall back to the cache when offline.
//
// The network attempt explicitly forces { cache: 'no-store' } rather than
// relying on event.request's own cache mode — a page-level fetch(url, {cache:
// 'no-store'}) is not guaranteed to keep that mode once it reaches this
// handler as event.request, so without this override this "network first"
// fetch could still be quietly satisfied from the browser's own HTTP cache.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() =>
      caches.match(event.request).then(cached => cached || caches.match('/index.html'))
    )
  );
});
