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

    console.log(
      "SW registrado"
    );
    await db
  .collection("scanner")
  .doc("status")
  .set({

    debugMessaging:
      typeof firebase.messaging
     debugMessaging:
  typeof firebase.messaging,

firebaseKeys:
  Object.keys(firebase)
    .join(", ")
  }, {
    merge: true
  });
    
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

      console.log(
        "Token não gerado"
      );

      return;

    }

    console.log(
      "Token FCM:",
      token
    );

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

    console.log(
      "Erro Push:",
      erro
    );

    await db
      .collection("scanner")
      .doc("status")
      .set({

        erroPush:
          erro.message

      }, {
        merge: true
      });

  }

}

window.addEventListener(
  "load",
  iniciarPush
);
