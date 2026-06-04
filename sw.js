const CACHE_NAME =
  "forex-assist-v3";

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

    let payload = {};

    try {

      payload =
        event.data
          ? event.data.json()
          : {};

    } catch {

      payload = {
        texto:
          event.data
            ? event.data.text()
            : "sem dados"
      };

    }

    event.waitUntil(

      self.registration
        .showNotification(

          "DEBUG PUSH",

          {

            body:
              JSON.stringify(
                payload
              ).substring(
                0,
                250
              ),

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
