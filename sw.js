const CACHE_NAME = 'forex-assist-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

// Instala o Service Worker e salva os arquivos no Cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Limpa caches antigos em caso de atualização
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepta a rede: Se estiver sem internet, carrega do Cache
self.addEventListener('fetch', e => {
  // Não fazemos cache das requisições de API (TwelveData), apenas dos arquivos do app
  if (e.request.url.includes('api.twelvedata.com')) return;
  
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});

// Lida com o clique na Notificação Push
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data && e.notification.data.url 
    ? e.notification.data.url 
    : 'intent://#Intent;package=com.xm.webapp;scheme=xm;end';
  e.waitUntil(clients.openWindow(url));
});
