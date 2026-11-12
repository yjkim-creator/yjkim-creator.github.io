// 인터넷이 되면 새 파일을 받고, 끊기면 저장해 둔 파일로 실행한다.
const CACHE = 'kungkung-v16';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'src/style.css', 'src/fonts/Jua-Regular.ttf', 'src/data.js', 'src/state.js', 'src/idle.js', 'src/battle.js', 'src/art.js', 'src/sound.js', 'src/adventure.js', 'src/play.js', 'src/game.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
