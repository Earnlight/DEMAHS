// My Noegenesis — Service Worker
// Caches all pages for offline use and fast loading

const CACHE_NAME = 'demahs-reader-pilot-v8';

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
  '/assets/scripts/reader.js',
  '/assets/scripts/immersive-reader.js',
  '/assets/scripts/immersive-reader-bootstrap.js',
  '/assets/styles/immersive-reader.css',
  '/assets/reader-catalog.json',
  '/assets/images/manuscript-vine.svg',
  '/assets/styles/library-shelf.css',
  '/assets/scripts/library-shelf.js',
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
  '/assets/images/card-destiny-large.webp',
  '/assets/images/covers/advice.webp',
  '/assets/images/covers/age-vs-evolution.webp',
  '/assets/images/covers/belief.webp',
  '/assets/images/covers/delusion.webp',
  '/assets/images/covers/gravitation.webp',
  '/assets/images/covers/greatness.webp',
  '/assets/images/covers/hellfire.webp',
  '/assets/images/covers/hierarchy.webp',
  '/assets/images/covers/honour.webp',
  '/assets/images/covers/how-to-build-your-light.webp',
  '/assets/images/covers/imagination.webp',
  '/assets/images/covers/light-as-meaning.webp',
  '/assets/images/covers/morality.webp',
  '/assets/images/covers/our-heart.webp',
  '/assets/images/covers/our-mind.webp',
  '/assets/images/covers/paradise.webp',
  '/assets/images/covers/pleasure.webp',
  '/assets/images/covers/power.webp',
  '/assets/images/covers/purity.webp',
  '/assets/images/covers/reading.webp',
  '/assets/images/covers/reality.webp',
  '/assets/images/covers/reason.webp',
  '/assets/images/covers/the-conscience.webp',
  '/assets/images/covers/the-continuum.webp',
  '/assets/images/covers/the-finality.webp',
  '/assets/images/covers/the-nature-of-life.webp',
  '/assets/images/covers/the-pen.webp',
  '/assets/images/covers/the-unseen.webp',
  '/assets/images/covers/thoughts.webp',
  '/assets/images/covers/truth.webp',
  '/assets/images/covers/understanding.webp',
  '/assets/images/covers/weakness.webp',
  '/assets/images/covers/weight.webp'
];

// Warm the complete offline collection with bounded, low-priority requests.
// This avoids a hundred competing downloads during a first foreground visit.
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);let cursor=0;
    async function worker(){while(cursor<ASSETS.length){const path=ASSETS[cursor++],request=new Request(path,{cache:'reload'});const response=await fetch(request,{priority:'low'});if(!response.ok)throw new Error('Offline asset unavailable: '+path);await cache.put(request,response);}}
    await Promise.all(Array.from({length:3},worker));await self.skipWaiting();
  })());
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

// Documents/scripts stay network-first. Versioned worker installs refresh all
// image/font entries; repeated artwork visits can then use the local copy.
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(/\.(?:webp|png|jpe?g|svg|ico|woff2)$/i.test(url.pathname)){
      const stored=await cache.match(event.request)||await cache.match(url.pathname);if(stored)return stored;
    }
    try{
      const response=await fetch(event.request,{cache:'no-store'});
      if(response.ok)event.waitUntil(cache.put(event.request,response.clone()).catch(()=>{}));return response;
    }catch(_){
      const stored=await cache.match(event.request)||await cache.match(url.pathname);if(stored)return stored;
      if(event.request.mode==='navigate')return await cache.match('/index.html')||new Response('Unavailable offline',{status:503});
      return new Response('Unavailable offline',{status:503});
    }
  })());
});
