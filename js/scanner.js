function scannerView() {
  return `
    <div class="card">

      <div class="card-title">
        Scanner Expert
      </div>

      <div id="scannerViewStatus" class="signal wait">
        Carregando...
      </div>

      <button
        class="button start-btn"
        id="startScanner">

        Iniciar Scanner

      </button>

      <button
        class="button stop-btn"
        id="stopScanner">

        Parar Scanner

      </button>

    </div>

    <div class="card">

      <div class="card-title">
        Última Análise
      </div>

      <div id="scannerUltimaAnalise" class="list-item">
        Carregando...
      </div>

    </div>
  `;
}

setInterval(async () => {

  const statusEl =
    document.getElementById("scannerViewStatus");

  const analiseEl =
    document.getElementById("scannerUltimaAnalise");

  if (!statusEl) return;

  try {

    const doc = await db
      .collection("scanner")
      .doc("status")
      .get();

    const dados = doc.data();

    statusEl.innerHTML =
      dados?.ativo
        ? "🟢 Scanner Online"
        : "🔴 Scanner aguardando início";

    analiseEl.innerHTML =
      dados?.ultimaAnalise ||
      "Nenhuma análise executada.";

  } catch (erro) {

    console.log(
      "Erro Firebase:",
      erro
    );

  }

}, 2000);

let scannerRodando = false;

async function scannerLoop() {

  try {

    const statusDoc = await db
      .collection("scanner")
      .doc("status")
      .get();

    const status =
      statusDoc.data();

    if (!status?.ativo) {

      scannerRodando = false;

      return;

    }

    const pares = [
      "EUR/USD",
      "GBP/USD",
      "USD/JPY",
      "AUD/USD",
      "USD/CAD",
      "EUR/JPY"
    ];

    const direcoes = [
      "CALL",
      "PUT"
    ];

    const sinal = {

      par: pares[
        Math.floor(
          Math.random() *
          pares.length
        )
      ],

      direcao: direcoes[
        Math.floor(
          Math.random() *
          direcoes.length
        )
      ],

      qualidade:
        Math.floor(
          Math.random() * 11
        ) + 85,

      modo: "EXPERT",

      origem: "scanner",

      horario:
        new Date()
        .toLocaleTimeString(
          "pt-BR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        ),

      timestamp:
        firebase.firestore
          .FieldValue
          .serverTimestamp()

    };

    const historico = await db
      .collection("historico")
      .where(
        "par",
        "==",
        sinal.par
      )
      .where(
        "direcao",
        "==",
        sinal.direcao
      )
      .get();

    let bloqueado = false;

    const agora =
      Date.now();

    historico.forEach(doc => {

      const dados =
        doc.data();

      if (!dados.timestamp) return;

      const ultimo =
        dados.timestamp
          .toDate()
          .getTime();

      const minutos =
        (
          agora -
          ultimo
        ) / 60000;

      if (minutos < 30) {
        bloqueado = true;
      }

    });

    if (bloqueado) {

      await db
        .collection("historico")
        .add({

          par: sinal.par,

          direcao: sinal.direcao,

          qualidade: 0,

          modo: "EXPERT",

          origem: "cooldown",

          status: "COOLDOWN",

          horario:
            new Date()
            .toLocaleTimeString(
              "pt-BR",
              {
                hour: "2-digit",
                minute: "2-digit"
              }
            ),

          timestamp:
            firebase.firestore
              .FieldValue
              .serverTimestamp()

        });

      await db
        .collection("scanner")
        .doc("status")
        .update({

          ultimaAnalise:
            `🚫 Cooldown ${sinal.par} ${sinal.direcao}`

        });

      setTimeout(
        scannerLoop,
        15000
      );

      return;

    }

    await db
      .collection("historico")
      .add(sinal);

    const statusAtual =
      (
        await db
          .collection("scanner")
          .doc("status")
          .get()
      ).data();

    await db
      .collection("scanner")
      .doc("status")
      .update({

        sinaisHoje:
          (
            statusAtual.sinaisHoje || 0
          ) + 1,

        ultimoSinal:
          `${sinal.par} ${sinal.direcao} ${sinal.qualidade}%`,

        ultimaAnalise:
          `Sinal encontrado em ${sinal.par}`

      });

  } catch (erro) {

    console.log(
      "Erro criando sinal:",
      erro
    );

  }

  setTimeout(
    scannerLoop,
    15000
  );

}

document.addEventListener("click", async (e) => {

  if (e.target.id === "startScanner") {

    try {

      await db
        .collection("scanner")
        .doc("status")
        .set({
          ativo: true
        }, {
          merge: true
        });

      if (!scannerRodando) {

        scannerRodando = true;

        scannerLoop();

      }

    } catch (erro) {

      console.log(
        "Erro Firebase:",
        erro
      );

    }

    app.render();

  }

  if (e.target.id === "stopScanner") {

    try {

      scannerRodando = false;

      await db
        .collection("scanner")
        .doc("status")
        .set({
          ativo: false
        }, {
          merge: true
        });

    } catch (erro) {

      console.log(
        "Erro Firebase:",
        erro
      );

    }

    app.render();

  }

});
