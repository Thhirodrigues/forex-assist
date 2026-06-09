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

  const lista =
    document.getElementById("historicoLista");

  if (!lista) return;

  try {

    const snapshot = await db
      .collection("historico")
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    let html = "";

    snapshot.forEach((doc) => {

      const sinal = doc.data();

      const isCooldown =
        sinal.status === "COOLDOWN" ||
        sinal.origem === "cooldown";

      if (isCooldown) {

        html += `
          <div class="list-item">

            <strong>
              🚫 COOLDOWN
            </strong>

            <br>

            ${sinal.par || "-"}

            <br>

            ${(sinal.direcao || "-")
  .replace("CALL", "🟢 COMPRA")
  .replace("PUT", "🔴 VENDA")}

            <br>

            Horário:
${
  sinal.timestamp
    ? sinal.timestamp
        .toDate()
        .toLocaleTimeString(
          "pt-BR",
          {
            timeZone:
              "America/Sao_Paulo"
          }
        )
    : "--:--"
}

          </div>
        `;

      } else {

        html += `
          <div class="list-item">

            <strong>
              ${sinal.par || "-"}
            </strong>

            <br>

            ${(sinal.direcao || "-")
  .replace("CALL", "🟢 COMPRA")
  .replace("PUT", "🔴 VENDA")} |
${sinal.qualidade ?? "-"}%

            <br>

            Modo:
${sinal.modo || "EXPERT"}

${
  sinal.resultado
    ? `

      <br><br>

      ${
        sinal.resultado === "WIN"
          ? "✅ WIN"
          : "❌ LOSS"
      }

      <br>

      Entrada:
      ${sinal.precoEntrada ?? "-"}

      <br>

      Fechamento:
      ${sinal.precoFechamento ?? "-"}

    `
    : ""
}

<br>

📅 ${
  sinal.timestamp
    ? sinal.timestamp
        .toDate()
        .toLocaleDateString(
          "pt-BR",
          {
            timeZone:
              "America/Sao_Paulo"
          }
        )
    : "--/--/----"
}

<br>

🕒 ${
  sinal.timestamp
    ? sinal.timestamp
        .toDate()
        .toLocaleTimeString(
          "pt-BR",
          {
            timeZone:
              "America/Sao_Paulo"
          }
        )
    : "--:--"
}

          </div>
        `;

      }

    });

    if (!html) {

      html = `
        <div class="list-item">
          Nenhum sinal encontrado.
        </div>
      `;

    }

    lista.innerHTML = html;

  } catch (erro) {

    console.log(
      "Erro histórico:",
      erro
    );

    lista.innerHTML = `
      <div class="list-item">
        Erro ao carregar histórico.
      </div>
    `;

  }

}, 3000);
