function historicoView() {
  return `
    <div class="card">
      <div class="card-title">
        Histórico de Sinais
      </div>

      <div id="historicoLista">
        Carregando histórico...
      </div>
    </div>
  `;
}

setInterval(async () => {

  const lista = document.getElementById("historicoLista");

  if (!lista) return;

  try {

    const snapshot = await db
      .collection("historico")
      .limit(20)
      .get();

    let html = "";

    snapshot.forEach((doc) => {

      const sinal = doc.data();

      html += `
        <div class="list-item">

          <strong>${sinal.par || "-"}</strong>

          <br>

          ${sinal.direcao || "-"} | ${sinal.qualidade || "-"}

          <br>

          ${sinal.horario || "-"}

        </div>
      `;
    });

    if (html === "") {

      html = `
        <div class="list-item">
          Nenhum sinal registrado.
        </div>
      `;
    }

    lista.innerHTML = html;

  } catch (erro) {

    console.log("Erro histórico:", erro);

  }

}, 3000);
