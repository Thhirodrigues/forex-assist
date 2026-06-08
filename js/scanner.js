function scannerView() {
  return `
    <div class="card">

      <div class="card-title">
        Scanner Expert
      </div>

      <div id="scannerViewStatus" class="signal wait">
        Carregando...
      </div>

      <div
        id="scannerProximaAnalise"
        class="list-item">

        Aguardando...

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
    document.getElementById(
      "scannerViewStatus"
    );

  const analiseEl =
    document.getElementById(
      "scannerUltimaAnalise"
    );

  const proximaEl =
    document.getElementById(
      "scannerProximaAnalise"
    );

  const startBtn =
    document.getElementById(
      "startScanner"
    );

  const stopBtn =
    document.getElementById(
      "stopScanner"
    );

  if (!statusEl) return;

  try {

    const doc = await db
      .collection("scanner")
      .doc("status")
      .get();

    const dados =
      doc.data() || {};

    if (dados.ativo) {

      statusEl.innerHTML =
        "🟢 Scanner Online<br>⏳ Analisando mercado";

      if (startBtn)
        startBtn.disabled = true;

      if (stopBtn)
        stopBtn.disabled = false;

    } else {

      statusEl.innerHTML =
        "🔴 Scanner Parado";

      if (startBtn)
        startBtn.disabled = false;

      if (stopBtn)
        stopBtn.disabled = true;

    }

    if (analiseEl) {

      let texto =
        dados.ultimaAnalise ||
        "Nenhuma análise executada.";

      texto = texto
        .replaceAll(
          "CALL",
          "COMPRA"
        )
        .replaceAll(
          "PUT",
          "VENDA"
        );

      analiseEl.innerHTML =
        texto;

    }

    if (proximaEl) {

      if (dados.ativo) {

        proximaEl.innerHTML =
          "⏱ Próxima análise em até 5 minutos";

      } else {

        proximaEl.innerHTML =
          "Scanner aguardando ativação";

      }

    }

  } catch (erro) {

    console.log(
      "Erro Firebase:",
      erro
    );

  }

}, 2000);

async function verificarResetDiario() {

  const hoje =
    new Date()
      .toLocaleDateString("pt-BR");

  const statusRef =
    db.collection("scanner")
      .doc("status");

  const statusDoc =
    await statusRef.get();

  const status =
    statusDoc.data() || {};

  if (status.ultimaData !== hoje) {

    await statusRef.set({

      sinaisHoje: 0,

      cooldownsHoje: 0,

      ultimaData: hoje

    }, {
      merge: true
    });

  }

}

document.addEventListener("click", async (e) => {

  if (e.target.id === "startScanner") {

    try {

      await verificarResetDiario();

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
