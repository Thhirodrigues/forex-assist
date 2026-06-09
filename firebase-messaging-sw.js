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
          true
      }
    );

  }
);
