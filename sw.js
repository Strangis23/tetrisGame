const CACHE_NAME = 'ttd-v10';
const ASSETS = [
  './',
  './index.html',
  './highscores.html',
  './privacy.html',
  './styles.css',
  './manifest.json',
  './audio/Pattern_in_Pine.mp3',
  './audio/Last_Row_Drop.mp3',
  './assets/blocks/wall.png',
  './assets/blocks/shooter.png',
  './assets/blocks/sniper.png',
  './assets/blocks/splash.png',
  './assets/blocks/slow.png',
  './assets/blocks/gunner.png',
  './assets/blocks/piercer.png',
  './assets/blocks/multishot.png',
  './assets/enemies/walker.png',
  './assets/enemies/brute.png',
  './assets/enemies/flyer.png',
  './assets/enemies/rusher.png',
  './assets/enemies/shielded.png',
  './assets/enemies/walker_boss.png',
  './assets/enemies/brute_boss.png',
  './assets/enemies/flyer_boss.png',
  './assets/enemies/rusher_boss.png',
  './assets/enemies/shielded_boss.png',
  './js/config.js',
  './js/settings.js',
  './js/seed.js',
  './js/audio.js',
  './js/stats.js',
  './js/achievements.js',
  './js/game-modes.js',
  './js/matchups.js',
  './js/highscores.js',
  './js/cards.js',
  './js/deck.js',
  './js/synergy.js',
  './js/grid.js',
  './js/pieces.js',
  './js/pathfinding.js',
  './js/projectiles.js',
  './js/enemies.js',
  './js/towers.js',
  './js/waves.js',
  './js/ui.js',
  './js/input.js',
  './js/mobile-controls.js',
  './js/starfield.js',
  './js/sprites.js',
  './js/render.js',
  './js/game.js',
  './js/main.js',
  './js/ads.js',
  './js/highscores-page.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
