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
        pushAtivo: true,
        vapidConfigurado: true
      }, {
        merge: true
      });

  } catch (erro) {

    console.log(
      "Erro Push:",
      erro
    );

  }

}

window.addEventListener(
  "load",
  iniciarPush
);
