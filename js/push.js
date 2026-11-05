const VAPID_KEY =
"BA8ztTlXcLNI4dx4RQbdkcr3divaxzaFealaXqiR4rrTODHOoKMgGZ6a1kQsY0ldc6p4u5lIZGDT9-SbhR5utKY";

async function iniciarPush() {

  // AJUSTE-105: com login obrigatório e banco trancado, as gravações abaixo (token, status) só funcionam DEPOIS que a sessão é
  // restaurada. Este código roda no evento "load", cedo demais: esperar o estado de login (no máx. 8 s). Sem login não há como
  // registrar o aparelho; depois de entrar, a página recarrega e roda de novo.
  try {
    if (window.auth && typeof window.auth.onAuthStateChanged === "function") {
      const usuario = await new Promise((resolve) => {
        const limite = setTimeout(() => resolve(null), 8000);
        const parar = window.auth.onAuthStateChanged((u) => { clearTimeout(limite); parar(); resolve(u); });
      });
      if (!usuario && window.LoginApp && window.LoginApp.EXIGIR_LOGIN) return;
    }
  } catch (e) { /* falha do Auth nunca derruba o app */ }

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

    // AJUSTE-102: esperar o service worker ficar ATIVO antes de pedir o token. Sem isso, o getToken falhava com
    // "Subscription failed - no active Service Worker" (erro guardado em scanner/status) e o aparelho ficava sem token.
    await navigator.serviceWorker.ready;

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

        // limpa o erro antigo: ele ficava guardado para sempre mesmo depois de o registro dar certo
        erroPush: null,

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
