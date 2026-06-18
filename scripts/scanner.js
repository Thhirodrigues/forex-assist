const { admin, db } =
  require("./firebase");

const COOLDOWN_MINUTOS = 30;

const {
    analisarPar: analisarParNovo
} = require("./pairAnalyzer");
const {
    getCandles
} = require("./marketData");
const {
  calcularQualidade
} = require("./marketAnalyzer");
const {
    ema,
    rsi
} = require("./utils");
const {
  existeCooldown: verificarCooldown,
  salvarOperacao
} = require("./riskManager");

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

  return verificarCooldown(
  ultimo.timestamp,
  COOLDOWN_MINUTOS
);
}
async function main() {

  console.log(
    "Scanner iniciado..."
  );

  for (const par of pares) {

    console.log("\n========================");
    console.log(`Analisando ${par}`);

    await analisarParNovo({
    db,
    par,
    getCandles,
    ema,
    rsi,
    calcularQualidade,
    verificarCooldown: existeCooldown,
    salvarOperacao
});

console.log(`${par} finalizado.`);
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
    main
};
