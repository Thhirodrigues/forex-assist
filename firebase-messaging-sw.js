importScripts(
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);

importScripts(
"https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
apiKey: "AIzaSyA6u3X0ClWLL4s6M8lxOdA_82p-AOWRBfE",
authDomain: "forex-assist.firebaseapp.com",
projectId: "forex-assist",
storageBucket: "forex-assist.firebasestorage.app",
messagingSenderId: "930868016103",
appId: "1:930868016103:web:148d6405e4ac5cc5900342"
});

const messaging =
  firebase.messaging();

messaging.onBackgroundMessage(
  payload => {

    self.registration.showNotification(
      payload.notification?.title ||
      "Forex Assist",
      {
        body:
          payload.notification?.body ||
          "Novo sinal",

        icon:
          "/icon-512.png",

        badge:
          "/icon-512.png",

        tag:
          "forex-assist",

        requireInteraction:
          true,

        // "data" nunca era repassado pra cá antes - sem isso, o clique
        // na notificação não tinha como saber pra onde abrir (ver
        // listener de notificationclick abaixo). scripts/pushNotifier.js
        // manda a URL de destino em payload.data.url.
        data:
          payload.data || {}
      }
    );

  }
);

// Antes desta correção, não existia NENHUM listener de clique - tocar
// na notificação não fazia nada (o usuário via o alerta, mas precisava
// abrir a XM manualmente por fora). Reaproveita uma aba já aberta do
// app, se existir; senão abre uma nova na URL informada pelo push
// (scripts/pushNotifier.js's URL_XM_MEMBER).
self.addEventListener("notificationclick", event => {

  event.notification.close();

  const url =
    event.notification.data?.url ||
    "https://my.xm.com/pt/member";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(janelas => {

      for (const janela of janelas) {

        if (janela.url === url && "focus" in janela) {
          return janela.focus();
        }

      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }

    })
  );

});
