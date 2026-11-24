const CACHE = 'malssi-garden-v3';
const CORE = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/core.js',
  './js/lesson.js',
  './js/garden.js',
  './js/home.js',
  './js/shop.js',
  './js/app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './img/bg-garden.png',
  './img/bg-map-en.png',
  './img/bg-map-ja.png',
  './img/bg-map-zh.png',
  './img/bg-room.png',
  './img/chest-closed.png',
  './img/chest-open.png',
  './img/coin.png',
  './img/flower-1.png',
  './img/flower-2.png',
  './img/flower-3.png',
  './img/flower-4.png',
  './img/flower-5.png',
  './img/flower-point.png',
  './img/furn-bed.png',
  './img/furn-books.png',
  './img/furn-chair.png',
  './img/furn-clock.png',
  './img/furn-cushion.png',
  './img/furn-desk.png',
  './img/furn-fish.png',
  './img/furn-frame.png',
  './img/furn-lamp.png',
  './img/furn-lights.png',
  './img/furn-petbed.png',
  './img/furn-plant.png',
  './img/furn-rug.png',
  './img/furn-rug2.png',
  './img/furn-sakura.png',
  './img/furn-shelf.png',
  './img/furn-sofa.png',
  './img/furn-table.png',
  './img/furn-tea.png',
  './img/furn-toys.png',
  './img/furn-window.png',
  './img/pet-1-happy.png',
  './img/pet-1-normal.png',
  './img/pet-1-sad.png',
  './img/pet-2-happy.png',
  './img/pet-2-normal.png',
  './img/pet-2-sad.png',
  './img/pet-3-happy.png',
  './img/pet-3-normal.png',
  './img/pet-3-sad.png',
  './img/tree-1.png',
  './img/tree-2.png',
  './img/tree-3.png',
  './img/tree-4.png',
  './img/tree-5.png',
  './img/water.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // 인터넷이 되면 새 파일을, 안 되면 저장해 둔 파일을 쓴다
  e.respondWith(fetch(req).then(r => {
    if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, cp)); }
    return r;
  }).catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req).then(r => r || caches.match('./'))));
});
