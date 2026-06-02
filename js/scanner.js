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

    console.log(
      "Erro Firebase:",
      erro
    );

  }

}, 2000);

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
