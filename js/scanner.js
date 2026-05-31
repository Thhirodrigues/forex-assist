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

    const sinal = {
      par: "EURUSD",
      direcao: "CALL",
      qualidade: "88%",
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

    await db
      .collection("scanner")
      .doc("status")
      .update({
        sinaisHoje: 1,
        ultimoSinal: `${sinal.par} ${sinal.direcao} ${sinal.qualidade}`,
        ultimaAnalise: "Sinal encontrado"
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
