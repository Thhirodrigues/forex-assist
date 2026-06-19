function historicoView() {
return `

<div class="card">

  <div
    id="historicoHeader"
    style="
      position:sticky;
      top:0;
      z-index:999;
      background:#081733;
      padding-bottom:10px;
    "
  >

    <div class="card-title">
      Histórico de Sinais
    </div>

    <div id="historicoStats" style="margin-bottom:15px;">
      Carregando estatísticas...
    </div>

  </div>

  <div id="historicoLista">
    Carregando histórico...
  </div>

</div>

`;
 }
async function carregarHistorico() {

const lista =
document.getElementById("historicoLista");

const stats =
document.getElementById("historicoStats");

if (!lista) return;

try {

const snapshot = await db
.collection("historico")
.orderBy("timestamp", "desc")
.limit(100)
.get();

let html = "";

let sinaisHoje = "";
let sinaisOntem = "";
const gruposAntigos = {};
  
let wins = 0;
let losses = 0;

snapshot.forEach((doc) => {

const sinal = doc.data();

let dataTimestamp = null;

if (
    sinal.timestamp &&
    !isNaN(
        new Date(
            typeof sinal.timestamp === "number" &&
            sinal.timestamp < 1000000000000
                ? sinal.timestamp * 1000
                : sinal.timestamp
        ).getTime()
    )
) {
    if (
        typeof sinal.timestamp === "number" &&
        sinal.timestamp < 1000000000000
    ) {
        dataTimestamp = new Date(sinal.timestamp * 1000);
    } else {
        dataTimestamp = new Date(sinal.timestamp);
    }

} else if (sinal.horario) {

    const partes = sinal.horario.match(
        /(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})/
    );

    if (partes) {

        dataTimestamp = new Date(
            partes[3],
            partes[2] - 1,
            partes[1],
            partes[4],
            partes[5],
            partes[6]
        );

    }

}

if (sinal.resultado === "WIN")
    wins++;

if (sinal.resultado === "LOSS")
    losses++;

const isCooldown =
sinal.status === "COOLDOWN" ||
sinal.origem === "cooldown";

const dataSinal =
dataTimestamp
? dataTimestamp.toLocaleDateString(
"pt-BR",
{
timeZone:"America/Sao_Paulo"
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
      dataTimestamp
        ? dataTimestamp
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
if (dataSinal === hoje) {

sinaisHoje += card;

} else if (dataSinal === ontem) {

sinaisOntem += card;

} else {

if (!gruposAntigos[dataSinal]) {
  gruposAntigos[dataSinal] = "";
}

gruposAntigos[dataSinal] += card;

}
  
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
  dataTimestamp
    ? dataTimestamp
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
  dataTimestamp
    ? dataTimestamp
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

if (dataSinal === hoje) {

sinaisHoje += card;

} else if (dataSinal === ontem) {

sinaisOntem += card;

} else {

if (!gruposAntigos[dataSinal]) {
  gruposAntigos[dataSinal] = "";
}

gruposAntigos[dataSinal] += card;
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

<div class="card">

<div style="
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

<button
id="btnMinimizarTudo"
style="
margin-top:10px;
width:100%;
padding:8px;
border:none;
border-radius:8px;
background:#132852;
color:white;
font-size:13px;
cursor:pointer;
transition:all .15s ease;
"
>
Minimizar Tudo
</button>

`;

}
const btnMinimizarTudo =
document.getElementById(
"btnMinimizarTudo"
);

if (btnMinimizarTudo) {

btnMinimizarTudo.onclick = () => {

const ontem =
document.getElementById(
"grupoOntem"
);

if (ontem) {
ontem.style.display = "none";
}

document
.querySelectorAll('[id^="data"]')
.forEach((el) => {

el.style.display = "none";

localStorage.setItem(
`grupo_${el.id.replace('data','')}`,
'fechado'
);
});

};

}
  
if (!sinaisHoje &&
    !sinaisOntem &&
    Object.keys(gruposAntigos).length === 0) {
  
html = `
<div class="list-item">
  Nenhum sinal encontrado.
</div>
`;

lista.innerHTML = html;
return;

}

let htmlAntigos = "";

Object.keys(gruposAntigos)
.sort((a,b) => {

const [da,ma,aa] = a.split("/");
const [db,mb,ab] = b.split("/");

return new Date(ab, mb-1, db)
     - new Date(aa, ma-1, da);

})
.forEach((data) => {

const idData =
data.replaceAll("/", "");

htmlAntigos += `

<div
onclick="
const el = document.getElementById('data${idData}');

el.style.display =
el.style.display === 'none'
? 'block'
: 'none';
"
style="
margin-top:20px;
margin-bottom:15px;
font-size:12px;
color:#8c95b3;
font-weight:bold;
cursor:pointer;
"
>
▶ ${data}
</div>

<div
id="data${idData}"
style="display:none;"
>
${gruposAntigos[data]}
</div>

`;

});
  
html = `
<div style="
margin-bottom:15px;
font-size:12px;
color:#8c95b3;
font-weight:bold;
">
HOJE
</div>

${sinaisHoje}

<div
onclick="
const el = document.getElementById('grupoOntem');

el.style.display =
el.style.display === 'none'
? 'block'
: 'none';
"
style="
margin-top:20px;
margin-bottom:15px;
font-size:12px;
color:#8c95b3;
font-weight:bold;
cursor:pointer;
"
>

▶ ONTEM

</div>

<div
id="grupoOntem"
style="display:none;"
>

${sinaisOntem}

</div>

<div id="historicoAntigo">

${htmlAntigos}

</div>
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

}
