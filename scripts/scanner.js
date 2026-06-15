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

const {
  getApiKey,
  ema,
  rsi
} = require("./utils");
const {
  calcularQualidade
} = require("./marketAnalyzer");
const apiIndex = {
  value: 0
};

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
    '&apikey=${getApiKey(API_KEYS, apiIndex)}'

  const res = await axios.get(url);

  if (!res.data.values)
    throw new Error("Sem candles");

  return res.data.values.reverse();
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
