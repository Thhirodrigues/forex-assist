// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// SCANNER
//
// Responsabilidade:
// Coordenar todo o processo de varredura do mercado.
//
// Fluxo:
//
// 1. Percorrer todos os pares configurados.
//
// 2. Solicitar ao Pair Analyzer a análise
//    individual de cada ativo.
//
// 3. Registrar estatísticas da execução.
//
// 4. Consolidar os resultados do Scanner.
//
// O Scanner NÃO possui regras de análise.
//
// Toda inteligência de mercado permanece nos
// módulos especializados:
//
// • pairAnalyzer.js
// • marketAnalyzer.js
// • statisticsEngine.js
// • riskManager.js
// • marketData.js
//
// SPRINT 05
// Arquitetura Modular
// ===================================================

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
    calcularQualidade,
    avaliarOperacao
} = require("./marketAnalyzer");
const {
    obterEstatisticasPar
} = require("./statisticsEngine");
const {
    ema,
    rsi,
    calcularADX,
    calcularATR
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

let totalOperacoes = 0;
let totalSemSinal = 0;
let totalCooldown = 0;
let totalErros = 0;

const inicioExecucao = Date.now();

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

console.log("========================================");
console.log("FOREX ASSIST - REAL MONEY INTELLIGENCE");
console.log("Scanner RMI_V1");
console.log("========================================");
console.log(`Pares...............${pares.length}`);
console.log("Timeframe...........5m");
console.log("Modo................REAL");
console.log("Engine..............RMI_V1");
console.log("========================================");

  for (const par of pares) {

console.log("\n========================");
console.log("\n========================================");
console.log(`Analisando...........${par}`);
console.log("========================================");

    const estatisticas =
    await obterEstatisticasPar(
        db,
        par
    );

console.log(
    `Histórico..........${estatisticas.wins}W/${estatisticas.loss}L`
);

console.log(
    `Assertividade......${estatisticas.taxaAcerto}%`
);

console.log(
  `Confiabilidade....${estatisticas.status}`
);

console.log("========================================");

    const resultado = await analisarParNovo({
    
    db,

    par,

    estatisticas,

    getCandles,

    ema,

    rsi,

    calcularADX,

    calcularATR,

    calcularQualidade,

    verificarCooldown: existeCooldown,

    salvarOperacao

});

const decisao =
    avaliarOperacao(resultado);

switch (resultado) {

case "SALVO":
    totalOperacoes++;
    break;

case "SEM_SINAL":
    totalSemSinal++;
    break;

case "COOLDOWN":
    totalCooldown++;
    break;

case "ERRO":
    totalErros++;
    break;

case "SEM_QUALIDADE":

    totalSemSinal++;

    break;

}
    
console.log(`${par} finalizado.`);
  }

  const tempo =
    ((Date.now() - inicioExecucao) / 1000).toFixed(1);

console.log("\n========================================");
console.log("SCANNER FINALIZADO");
console.log("========================================");
console.log(`Operações..........${totalOperacoes}`);
console.log(`Sem sinal..........${totalSemSinal}`);
console.log(`Cooldown...........${totalCooldown}`);
console.log(`Erros..............${totalErros}`);
console.log(`Tempo..............${tempo}s`);
console.log("========================================");

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
