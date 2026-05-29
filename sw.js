const CACHE_NAME = 'forex-assist-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.twelvedata.com')) return;
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || 'intent://#Intent;package=com.xm.webapp;scheme=xm;end';
  e.waitUntil(clients.openWindow(url));
});
