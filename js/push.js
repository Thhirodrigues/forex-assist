const VAPID_KEY =
"BA8ztTlXcLNI4dx4RQbdkcr3divaxzaFealaXqiR4rrTODHOoKMgGZ6a1kQsY0ldc6p4u5lIZGDT9-SbhR5utKY";

async function iniciarPush() {

try {

if (!("serviceWorker" in navigator))
  return;

const permission =
  await Notification.requestPermission();

if (permission !== "granted")
  return;

const registration =
  await navigator.serviceWorker.register(
    "./sw.js"
  );

await db
  .collection("scanner")
  .doc("status")
  .set({

    debugMessaging:
      typeof firebase.messaging,

    firebaseKeys:
      Object.keys(firebase)
        .join(", "),

    firebaseVersion:
      firebase.SDK_VERSION || "desconhecida",

    firebaseDefault:
      typeof firebase.default,

    firestoreExiste:
      typeof firebase.firestore,

    appExiste:
      typeof firebase.app

  }, {
    merge: true
  });

if (
  typeof firebase.messaging !==
  "function"
) {

  await db
    .collection("scanner")
    .doc("status")
    .set({

      erroPush:
        "firebase.messaging inexistente"

    }, {
      merge: true
    });

  return;

}

const messaging =
  firebase.messaging();

const token =
  await messaging.getToken({

    vapidKey:
      VAPID_KEY,

    serviceWorkerRegistration:
      registration

  });

if (!token) {

  await db
    .collection("scanner")
    .doc("status")
    .set({

      erroPush:
        "token nao gerado"

    }, {
      merge: true
    });

  return;

}

await db
  .collection("tokens")
  .doc(token)
  .set({

    token,

    ativo: true,

    dispositivo:
      navigator.userAgent,

    criadoEm:
      firebase.firestore
        .FieldValue
        .serverTimestamp()

  }, {
    merge: true
  });

await db
  .collection("scanner")
  .doc("status")
  .set({

    pushAtivo: true,

    vapidConfigurado: true,

    tokenRegistrado: true,

    ultimoToken:
      token.substring(0, 20)

  }, {
    merge: true
  });

} catch (erro) {

await db
  .collection("scanner")
  .doc("status")
  .set({

    erroPush:
      erro.message,

    erroCompleto:
      String(erro)

  }, {
    merge: true
  });

}

}

window.addEventListener(
"load",
iniciarPush
);
