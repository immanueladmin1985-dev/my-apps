const CACHE = 'nanjang-pf-v22';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './hero.webp', './hero-dark.webp', './art-flute.webp',
  './vendor/fonts/GowunDodum.woff2', './vendor/fonts/SongMyung.woff2', './vendor/fonts/NanumPenScript.woff2', './vendor/fonts/GreatVibes.woff2',
  './icons/backing.webp', './icons/basics.webp', './icons/bend.webp', './icons/dotted.webp', './icons/editor.webp', './icons/firstsound.webp', './icons/follow.webp', './icons/leap.webp', './icons/legato.webp', './icons/longtone.webp', './icons/match.webp', './icons/metro.webp', './icons/pipes.webp', './icons/playalong.webp', './icons/record.webp', './icons/scale.webp', './icons/staccato.webp', './icons/stage1.webp', './icons/stage2.webp', './icons/stage3.webp', './icons/stage4.webp', './icons/tongue.webp', './icons/transcribe.webp', './icons/tuner.webp', './icons/vibrato.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 앱 화면: 저장해 둔 화면이 있으면 인터넷을 2.5초까지만 기다리고, 늦으면 저장해 둔 화면을 먼저 보여 줌.
  // 새 화면은 뒤에서 마저 받아 두고, 실제로 바뀌었으면 열린 화면에 알려 줌(다시 열면 새 버전).
  if (req.mode === 'navigate') {
    let bgDone; e.waitUntil(new Promise(r => { bgDone = r; })); // 저장해 둔 화면을 먼저 보낸 뒤에도 새 화면을 끝까지 받도록 서비스 워커를 붙잡아 둠
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('./index.html');
      const oldP = cached ? cached.clone().text().catch(() => null) : Promise.resolve(null); // 화면에 넘기기 전에 미리 복사해 둬야 나중에 비교할 수 있음
      let served = 'net';
      const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(async r => {
        if (r && r.ok) {
          const forCache = r.clone(), forCmp = r.clone();
          const old = await oldP;
          await cache.put('./index.html', forCache);
          if (served === 'cache' && old !== null && (await forCmp.text()) !== old) {
            const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            cs.forEach(c => c.postMessage({ type: 'pf-update' }));
          }
        }
        return r;
      });
      net.then(bgDone, bgDone);
      if (!cached) return net.catch(() => caches.match('./'));
      const slow = new Promise(res => setTimeout(() => { served = 'cache'; res(cached); }, 2500));
      return Promise.race([net.then(r => (r && r.ok ? r : (served = 'cache', cached)), () => (served = 'cache', cached)), slow]);
    })());
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => hit || new Response('', { status: 504, statusText: 'offline' }));
      return hit || net;
    }));
  }
});
