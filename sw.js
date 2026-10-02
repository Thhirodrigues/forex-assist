const CACHE_NAME =
  "forex-assist-v10";

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

    // vídeo da splash: o navegador pede em pedaços (Range/206), que o cache
    // não aceita guardar - deixa passar direto pela rede.
    if (/\.mp4(\?|$)/.test(e.request.url)) return;

    e.respondWith(

      fetch(
        e.request,
        { cache: "no-store" }
      ).then(res => {

        const resClone = res.clone();

        caches.open(CACHE_NAME).then(
          cache => cache.put(e.request, resClone)
        );

        return res;

      }).catch(
        () => caches.match(e.request)
      )

    );

  }
);

// AJUSTE-046 (29/09/2026): ícones da notificação + destino do toque.
//
// ÍCONE: o Android mostra na barra de status a imagem "badge" usando SÓ o
// canal alfa (a silhueta) - o icon-512.png colorido e opaco que estava
// aqui não serve (o Android o ignora/vira um bloco e cai no logo do
// Chrome). badge-96.png é a silhueta branca do logo do app sobre fundo
// transparente (gerada a partir do icon-512.png). O ícone GRANDE do
// corpo da notificação é o logo colorido (icon-192.png, mais leve).
// Caminhos relativos a ESTE arquivo (o app vive em .../forex-assist/, não
// na raiz do domínio - "/icon-512.png" apontaria pra um endereço que não
// existe).
//
// DESTINO: scripts/pushNotifier.js manda em payload.data.url a página do
// par na XM (AJUSTE-045), mas este arquivo ignorava e sempre abria o app
// ("./"): o toque nunca chegava na XM. Só aceita https://my.xm.com/ (o
// payload vem do nosso servidor, mas nunca abrir destino arbitrário);
// qualquer outra coisa/ausência = "./" (o app), como antes.
const ICONE_NOTIFICACAO = "./icon-192.png";
const BADGE_NOTIFICACAO = "./badge-96.png";

function destinoNotificacao(url) {
  return typeof url === "string" && url.startsWith("https://my.xm.com/")
    ? url
    : "./";
}

self.addEventListener(
  "push",
  event => {

    let title =
      "Forex Assist";

    let body =
      "Novo sinal disponível";

    let url =
      "./";

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

        url =
          destinoNotificacao(
            payload.data?.url
          );

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
              ICONE_NOTIFICACAO,

            badge:
              BADGE_NOTIFICACAO,

            data: {
              url
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
        destinoNotificacao(
          e.notification.data?.url
        )
      )

    );

  }
);
