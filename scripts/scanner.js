const { admin, db } =
  require("./firebase");

const axios =
  require("axios");
const COOLDOWN_MINUTOS = 30;

const API_KEYS = [
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  process.env.API_KEY_3
].filter(Boolean);

let apiIndex = 0;

function getApiKey() {
  const key = API_KEYS[apiIndex];
  apiIndex = (apiIndex + 1) % API_KEYS.length;
  return key;
}

const pares = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
  "USD/CHF",
  "NZD/USD",
  "EUR/JPY",
  "GBP/JPY",
  "EUR/GBP"
];

async function getCandles(symbol) {

  const url =
    `https://api.twelvedata.com/time_series` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=5min` +
    `&outputsize=120` +
    `&apikey=${getApiKey()}`;

  const res = await axios.get(url);

  if (!res.data.values)
    throw new Error("Sem candles");

  return res.data.values.reverse();
}

function ema(periodo, valores) {

  const k = 2 / (periodo + 1);

  let emaAtual = valores[0];

  for (let i = 1; i < valores.length; i++) {
    emaAtual =
      valores[i] * k +
      emaAtual * (1 - k);
  }

  return emaAtual;
}

function rsi(periodo, valores) {

  let ganhos = 0;
  let perdas = 0;

  for (let i = 1; i <= periodo; i++) {

    const dif =
      valores[i] - valores[i - 1];

    if (dif >= 0)
      ganhos += dif;
    else
      perdas -= dif;
  }

  let avgGain = ganhos / periodo;
  let avgLoss = perdas / periodo;

  if (avgLoss === 0)
    return 100;

  const rs = avgGain / avgLoss;

  return 100 - (100 / (1 + rs));
}
function calcularQualidade(ema9, ema21, rsiAtual) {

  let score = 0;

  const distancia = Math.abs(ema9 - ema21);

  if (distancia > 0.00020)
    score += 30;
  else if (distancia > 0.00010)
    score += 20;
  else
    score += 10;

  if (rsiAtual > 55 && rsiAtual < 70)
    score += 35;

  if (rsiAtual < 45 && rsiAtual > 30)
    score += 35;

  if (distancia > 0.00030)
    score += 20;

  if (score > 100)
    score = 100;

  return score;
}

async function existeCooldown(par) {

  const limite =
    Date.now() -
    COOLDOWN_MINUTOS *
      60 *
      1000;

  const snap =
    await db
      .collection("historico")
      .where("par", "==", par)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

  if (snap.empty)
    return false;

  const ultimo =
    snap.docs[0].data();

  return ultimo.timestamp > limite;
}

async function salvarOperacao(dados) {

  await db
    .collection("historico")
    .add({
      ...dados,
      horario:
        new Date().toLocaleString("pt-BR"),
      timestamp:
        Date.now()
    });
}

async function analisarPar(par) {

  try {

    if (await existeCooldown(par))
      return;

    const candles =
      await getCandles(par);

    const closes =
      candles.map(c => Number(c.close));

    const ema9 =
      ema(9, closes.slice(-30));

    const ema21 =
      ema(21, closes.slice(-50));

    const rsiAtual =
      rsi(14, closes.slice(-15));

    let direcao = null;

    if (ema9 > ema21 && rsiAtual > 55)
      direcao = "CALL";

    if (ema9 < ema21 && rsiAtual < 45)
      direcao = "PUT";

    if (!direcao)
      return;
    const qualidade =
      calcularQualidade(
        ema9,
        ema21,
        rsiAtual
      );

    await salvarOperacao({

      par,

      direcao,

      ema9,

      ema21,

      rsi: rsiAtual,

      qualidade,

      modo: "REAL",

      origem: "scanner",

      precoEntrada:
        closes[
          closes.length - 1
        ],

      resultado: "PENDENTE"

    });

    console.log(
      `${par} ${direcao} OK`
    );

  } catch (e) {

    console.log(
      `${par} erro`,
      e.message
    );

  }

}

async function main() {

  console.log(
    "Scanner iniciado..."
  );

  for (const par of pares) {

    await analisarPar(par);

  }

  console.log(
    "Scanner finalizado."
  );

}

main()
  .then(() =>
    process.exit(0)
  )
  .catch(err => {

    console.error(err);

    process.exit(1);

  });
// Fim do scanner modular.
// Nesta etapa da migração não há mais código após o main().

module.exports = {
  getCandles,
  ema,
  rsi,
  calcularQualidade,
  existeCooldown,
  salvarOperacao,
  analisarPar,
  main
};
