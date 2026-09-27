/* Service Worker: кеширует игру, чтобы браузер предлагал «Установить на экран» и чтобы она
   открывалась без интернета. Регистрируется только на https и не во фрейме (см. index.html) —
   локально (file://) и в Claude Artifact игра просто работает без него, как раньше.
   js/css — «сначала сеть, потом кеш»: так Сабрина не застревает на старой версии после правок.
   vendor/ и иконки почти не меняются — «сначала кеш, потом сеть», это быстрее.
   Поменяй CACHE, если нужно один раз сбросить старый кеш у всех разом (например, после большой правки). */
const CACHE = 'sh-v3';
const CORE = [
  './', './index.html', './manifest.json', './css/style.css',
  './vendor/three.min.js', './vendor/peerjs.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './js/i18n.js', './js/data.js', './js/letters.js', './js/audio.js', './js/world.js', './js/seal.js',
  './js/minigames.js', './js/shop.js', './js/shift.js', './js/pet.js', './js/walk.js', './js/home.js',
  './js/adventure.js', './js/neighbors.js', './js/mail.js', './js/holidays.js', './js/net.js', './js/coop.js',
  './js/gull.js', './js/rescue.js', './js/grotto.js', './js/blizzard.js', './js/glowcave.js', './js/kelpforest.js',
  './js/festival.js', './js/cloudroad.js', './js/icecode.js', './js/dive.js', './js/gloom.js', './js/chase.js',
  './js/sharktooth.js', './js/cloudcure.js', './js/visit.js', './js/storm.js', './js/finale.js', './js/story.js', './js/game.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const NET_FIRST = /\.(?:js|css)$/;   // js/css — свежее важнее скорости
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;   // чужие запросы (TURN, сигнализация) не трогаем
  const url = new URL(req.url), isPage = req.mode === 'navigate';
  if(isPage || NET_FIRST.test(url.pathname)){
    e.respondWith(
      fetch(req).then(res => { caches.open(CACHE).then(c => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req).then(r => r || (isPage && caches.match('./index.html'))))
    );
  }else{
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => { caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }))
    );
  }
});
