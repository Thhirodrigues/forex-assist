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
      dados.ativo
        ? "🟢 Scanner Online"
        : "🔴 Scanner aguardando início";

    analiseEl.innerHTML =
      dados.ultimaAnalise ||
      "Nenhuma análise executada.";

  } catch (erro) {

    console.log("Erro Firebase:", erro);

  }

}, 2000);

document.addEventListener("click", async (e) => {

  if (e.target.id === "startScanner") {

    try {

      await db
        .collection("scanner")
        .doc("status")
        .update({
          ativo: true
        });

    } catch (erro) {

      console.log("Erro Firebase:", erro);

    }

    app.render();
setTimeout(async () => {

  try {

const pares = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "EURJPY"
];

const direcoes = [
  "CALL",
  "PUT"
];

const qualidade =
  Math.floor(Math.random() * 11) + 85;

const sinal = {
  par: pares[
    Math.floor(Math.random() * pares.length)
  ],

  direcao: direcoes[
    Math.floor(Math.random() * direcoes.length)
  ],

  qualidade: qualidade,

  modo: "EXPERT",

  origem: "scanner",

  horario: new Date().toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  ),

  timestamp:
    firebase.firestore.FieldValue.serverTimestamp()
};

  direcao: direcoes[
    Math.floor(Math.random() * direcoes.length)
  ],

  qualidade: qualidade + "%",

  horario: new Date().toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  )
};

    await db
      .collection("historico")
      .add(sinal);

    const statusDoc = await db
  .collection("scanner")
  .doc("status")
  .get();

const statusAtual = statusDoc.data();

await db
.collection("scanner")
.doc("status")
.update({

  sinaisHoje:
    (statusAtual.sinaisHoje || 0) + 1,

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

}, 15000);
  }

  if (e.target.id === "stopScanner") {

    try {

      await db
        .collection("scanner")
        .doc("status")
        .update({
          ativo: false
        });

    } catch (erro) {

      console.log("Erro Firebase:", erro);

    }

    app.render();

  }

});
