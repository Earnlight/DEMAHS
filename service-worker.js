// My Noegenesis — Service Worker
// Caches all pages for offline use and fast loading

const CACHE_NAME = 'demahs-realm-v2';

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
  '/android-chrome-512x512.png',
  '/feed.xml',
  '/assets/styles/realm.css',
  '/assets/scripts/appearance.js',
  '/assets/scripts/realm.js',
  '/assets/fonts/cinzel-latin-wght-normal.woff2',
  '/assets/fonts/cormorant-garamond-latin-wght-normal.woff2',
  '/assets/fonts/cormorant-garamond-latin-wght-italic.woff2',
  '/assets/images/celestial-realm.webp',
  '/assets/images/celestial-realm-medium.webp',
  '/assets/images/card-library.webp',
  '/assets/images/card-foundations.webp',
  '/assets/images/card-person.webp',
  '/assets/images/card-destiny.webp',
  '/assets/images/celestial-realm-mobile.webp',
  '/assets/images/card-library-large.webp',
  '/assets/images/card-foundations-large.webp',
  '/assets/images/card-person-large.webp',
  '/assets/images/card-destiny-large.webp'
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
  // Leave external integrations and form POSTs to the browser. Only cache this site.
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then(response => {
      if (!response.ok) return response;
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {}));
      return response;
    }).catch(async () => {
      const cached = await caches.match(event.request) || await caches.match(url.pathname);
      if (cached) return cached;
      if (event.request.mode === 'navigate') return caches.match('/index.html');
      return new Response('Unavailable offline', { status: 503 });
    })
  );
});
