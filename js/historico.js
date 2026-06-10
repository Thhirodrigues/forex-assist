function historicoView() {
return `

<div class="card">

  <div class="card-title">
    Histórico de Sinais
  </div>

  <div id="historicoStats" style="margin-bottom:15px;">
    Carregando estatísticas...
  </div>

  <div id="historicoLista">
    Carregando histórico...
  </div>

  <div style="margin-top:15px;text-align:center;">

    <button
      id="btnCarregarHistorico"
      style="
        width:100%;
        padding:12px;
        border:none;
        border-radius:10px;
        background:#132852;
        color:white;
        font-size:14px;
      "
    >
      Carregar Histórico
    </button>

  </div>

</div>

`;
}

setInterval(async () => {

const lista =
document.getElementById("historicoLista");

const stats =
document.getElementById("historicoStats");

if (!lista) return;

try {

const snapshot = await db
.collection("historico")
.orderBy("timestamp", "desc")
.limit(20)
.get();

let html = "";
let grupos = {};
let wins = 0;
let losses = 0;

snapshot.forEach((doc) => {

const sinal = doc.data();

if (sinal.resultado === "WIN")
wins++;

if (sinal.resultado === "LOSS")
losses++;

const isCooldown =
sinal.status === "COOLDOWN" ||
sinal.origem === "cooldown";

const dataSinal =
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
: "";

const hoje =
new Date()
.toLocaleDateString(
"pt-BR",
{
timeZone:
"America/Sao_Paulo"
}
);

const ontemDate = new Date();

ontemDate.setDate(
ontemDate.getDate() - 1
);

const ontem =
ontemDate.toLocaleDateString(
"pt-BR",
{
timeZone:
"America/Sao_Paulo"
}
);
  
if (isCooldown) {

const card = `
  <div class="list-item">

    🚫 ${sinal.par || "-"}

    <br>

    ${(sinal.direcao || "-")
      .replace("CALL", "🟢 COMPRA")
      .replace("PUT", "🔴 VENDA")}

    <br>

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
if (!grupos[dataSinal]) {
  grupos[dataSinal] = "";
}

grupos[dataSinal] += card;
  
} else {

const card = `

<div class="list-item">  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-size:14px;
    font-weight:bold;
  "><span>

  ${(sinal.direcao || "-")
    .replace("CALL", "🟢")
    .replace("PUT", "🔴")}

  ${sinal.par || "-"}

  |

  ${(sinal.direcao || "-")
    .replace("CALL", "COMPRA")
    .replace("PUT", "VENDA")}

</span>

<span>

  ${
    sinal.resultado === "WIN"
      ? "✅ WIN"
      : sinal.resultado === "LOSS"
      ? "❌ LOSS"
      : "⏳"
  }

</span>

  </div>  <div style="
    margin-top:4px;
    font-size:12px;
    color:#8c95b3;
  ">${
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

&nbsp;

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
        .substring(0,5)
    : "--:--"
}

|

${sinal.qualidade ?? "-"}%

  </div></div>`;

if (!grupos[dataSinal]) {
  grupos[dataSinal] = "";
}

grupos[dataSinal] += card;
  
}

}

});

const total =
wins + losses;

const taxa =
total > 0
? ((wins / total) * 100)
.toFixed(1)
: "0";

if (stats) {

stats.innerHTML = `

  <div class="card"><div style="
  text-align:center;
  font-size:17px;
  font-weight:bold;
">

  ✅ ${wins}
  &nbsp;&nbsp;&nbsp;

❌ ${losses}
  &nbsp;&nbsp;&nbsp;

  🎯 ${taxa}%

</div>

  </div>`;

}

if (Object.keys(grupos).length === 0) {

html = `
<div class="list-item">
  Nenhum sinal encontrado.
</div>
`;

lista.innerHTML = html;
return;

}

html = "";

Object.keys(grupos).forEach((data) => {

html += `

<div style="
margin-top:20px;
margin-bottom:15px;
font-size:12px;
color:#8c95b3;
font-weight:bold;
">
${data}
</div>

${grupos[data]}

});
`;
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
`;}

}, 3000);
