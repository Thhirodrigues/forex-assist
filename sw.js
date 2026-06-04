const CACHE_NAME =
  "forex-assist-v4";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-512.png"
];

self.addEventListener(
  "install",
  e => {

    e.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(cache =>
          cache.addAll(ASSETS)
        )
    );

    self.skipWaiting();

  }
);

self.addEventListener(
  "activate",
  e => {

    e.waitUntil(

      caches.keys().then(keys =>

        Promise.all(

          keys.map(k =>

            k !== CACHE_NAME
              ? caches.delete(k)
              : null

          )

        )

      )

    );

    self.clients.claim();

  }
);

self.addEventListener(
  "fetch",
  e => {

    if (
      e.request.url.includes(
        "api.twelvedata.com"
      )
    ) return;

    e.respondWith(

      caches.match(
        e.request
      ).then(

        res =>
          res ||
          fetch(
            e.request
          )

      )

    );

  }
);

self.addEventListener(
  "push",
  event => {

    let title =
      "Forex Assist";

    let body =
      "Novo sinal disponível";

    if (event.data) {

      try {

        const payload =
          event.data.json();

        title =
          payload.notification?.title ||
          payload.title ||
          title;

        body =
          payload.notification?.body ||
          payload.body ||
          body;

      } catch {

        body =
          event.data.text() ||
          body;

      }

    }

    event.waitUntil(

      self.registration
        .showNotification(

          title,

          {
            body,

            icon:
              "./icon-512.png",

            badge:
              "./icon-512.png",

            data: {
              url: "./"
            }
          }

        )

    );

  }
);

self.addEventListener(
  "notificationclick",
  e => {

    e.notification.close();

    e.waitUntil(

      clients.openWindow(
        "./"
      )

    );

  }
);
