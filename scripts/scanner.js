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

const CONFIG = {

    COOLDOWN_MINUTOS: 30,

    DELAY_ANALISE_MS: 1500

};

const {

    COOLDOWN_MINUTOS,

    DELAY_ANALISE_MS

} = CONFIG;

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

const {
    calcularRisco
} = require("./riskEngine");

// ===================================================
// LISTA PADRÃO DE PARES
//
// Futuramente esta lista será carregada da coleção
// "configuracoes" do Firestore.
//
// Enquanto isso, esta permanece como lista padrão
// do Scanner RMI.
// ===================================================
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
    "EUR/GBP",
    "EUR/AUD",
    "EUR/CAD",
    "EUR/CHF",
    "GBP/CHF",
    "GBP/CAD",
    "AUD/JPY",
    "CAD/JPY",
    "CHF/JPY",
    "AUD/NZD",
    "NZD/JPY"
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

function mercadoAberto() {

    const agora = new Date();

    const diaSemana = agora.getDay();

    if (diaSemana === 0 || diaSemana === 6) {
        return false;
    }

    const horaAtual = agora.toLocaleTimeString(
        "pt-BR",
        {
            timeZone: "America/Sao_Paulo",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit"
        }
    );

    const [hora, minuto] =
        horaAtual.split(":").map(Number);

    const minutosAtuais =
        hora * 60 + minuto;

    const inicio = 7 * 60 + 30;

    const fim = 18 * 60;

    return (
        minutosAtuais >= inicio &&
        minutosAtuais <= fim
    );
}

async function main() {

if (!mercadoAberto()) {

    console.log("========================================");
    console.log("MERCADO FECHADO");
    console.log("Scanner encerrado.");
    console.log("========================================");

    return;
}

const scannerStatus = await db
    .collection("scanner")
    .doc("status")
    .get();

if (!scannerStatus.exists || !scannerStatus.data()?.ativo) {

    console.log("========================================");
    console.log("SCANNER DESATIVADO");
    console.log("Execução encerrada.");
    console.log("========================================");

    return;
}

if (!pares.length) {

    console.log("========================================");
    console.log("NENHUM PAR CONFIGURADO");
    console.log("Scanner encerrado.");
    console.log("========================================");

    return;
}

console.log("========================================");
console.log("FOREX ASSIST - REAL MONEY INTELLIGENCE");
console.log("Scanner RMI_V2");
console.log("========================================");
console.log(`Pares...............${pares.length}`);
console.log("Timeframe...........5m");
console.log("Modo................REAL");
console.log("Engine..............RMI_V2");
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

    let risco = null;

if (
    resultado &&
    typeof resultado === "object" &&
    resultado.status === "SALVO"
) {

    risco = calcularRisco({

        score: resultado.operacao.score,

        historico: estatisticas,

        atr: resultado.operacao.atr,

        loteBase: resultado.operacao.lote,

        tpBase: resultado.operacao.tpUSD,

        slBase: resultado.operacao.slUSD

    });
console.log("========== RMI V2 ==========");
console.log(`Lote..............${resultado.operacao.lote}`);
console.log(`TP................${resultado.operacao.tpUSD} USD`);
console.log(`SL................${resultado.operacao.slUSD} USD`);
console.log(`Risco.............${resultado.operacao.riscoPercentual}%`);
console.log(`R/R...............${resultado.operacao.rewardRisk}`);
console.log(`Expectativa.......${resultado.operacao.expectativa}`);
console.log("============================");

}

switch (
    typeof resultado === "object"
        ? resultado.status
        : resultado
) {

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

// Aguarda 1,5 segundo antes de analisar o próximo par

    await new Promise(resolve =>
    setTimeout(resolve, DELAY_ANALISE_MS)
);
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
