const VAPID_KEY =
"BA8ztTlXcLNI4dx4RQbdkcr3divaxzaFealaXqiR4rrTODHOoKMgGZ6a1kQsY0ldc6p4u5lIZGDT9-SbhR5utKY";

async function iniciarPush() {

  try {

    const pushDebug = {

      data:
        new Date().toISOString(),

      sdkVersion:
        firebase.SDK_VERSION,

      messagingType:
        typeof firebase.messaging,

      firestoreType:
        typeof firebase.firestore,

      appType:
        typeof firebase.app,

      keysAntes:
        window.firebaseDebugAntes || [],

      keysDepois:
        window.firebaseDebugDepois || [],

      messagingTipoJanela:
        window.firebaseMessagingTipo || "indefinido",

      userAgent:
        navigator.userAgent,

      url:
        location.href

    };

    await db
      .collection("scanner")
      .doc("status")
      .set({

        pushDebug

      }, {
        merge: true
      });

    if (!("serviceWorker" in navigator)) {

      await db
        .collection("scanner")
        .doc("status")
        .set({

          erroPush:
            "serviceWorker inexistente"

        }, {
          merge: true
        });

      return;

    }

    const permission =
      await Notification.requestPermission();

    await db
      .collection("scanner")
      .doc("status")
      .set({

        permissaoPush:
          permission

      }, {
        merge: true
      });

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

        serviceWorkerRegistrado:
          true

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
