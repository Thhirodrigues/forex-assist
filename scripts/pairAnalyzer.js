// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// PAIR ANALYZER
//
// Responsabilidade:
// Realizar toda a análise técnica de um único ativo.
//
// Fluxo:
//
// 1. Receber os candles do mercado.
//
// 2. Calcular os indicadores técnicos.
//
// 3. Solicitar ao Market Analyzer o cálculo
//    do Smart Score Institucional.
//
// 4. Aplicar os filtros de aprovação.
//
// 5. Registrar a operação aprovada.
//
// O Pair Analyzer NÃO executa varredura.
//
// O Pair Analyzer NÃO acessa diretamente
// o Firestore para consultas estatísticas.
//
// Toda inteligência permanece distribuída:
//
// • marketAnalyzer.js
// • statisticsEngine.js
// • riskManager.js
// • marketData.js
//
// SPRINT 05
// Arquitetura Modular
// ===================================================

const {

    analisarFinanceiro

} = require("./moneyManager");

async function analisarPar({
    db,
    par,
    estatisticas,
    getCandles,
    ema,
    rsi,
    calcularADX,
    calcularQualidade,
    verificarCooldown,
    salvarOperacao
}) {

    try {

        if (await verificarCooldown(par)) {
    console.log("Status.............COOLDOWN");
    return "COOLDOWN";
        }

const candles =
    await getCandles(par,"5min",250
    );

const candles15 =
    await getCandles(par,"15min",250
    );
        
const highs =
    candles.map(c => Number(c.high));

const lows =
    candles.map(c => Number(c.low));

const closes =
    candles.map(c => Number(c.close));

const closes15 =
    candles15.map(c => Number(c.close));
              
const ema9 =
            ema(9, closes.slice(-30));

const ema21 =
            ema(21, closes.slice(-50));

const ema50 =
    ema(50, closes.slice(-80));

const ema100 =
    ema(100, closes.slice(-120));

const ema200 =
    ema(200, closes);   

const ema9_15 =
    ema(9, closes15.slice(-30));

const ema21_15 =
    ema(21, closes15.slice(-50));

const ema50_15 =
    ema(50, closes15.slice(-80));
 
 const rsiAtual =
    rsi(14, closes.slice(-15));

const adxAtual = calcularADX(
    14,
    highs,
    lows,
    closes
);

        let direcao = null;

if (
    ema9 === null ||
    ema21 === null ||
    ema50 === null ||
    ema100 === null ||
    ema200 === null ||
    ema9_15 === null ||
    ema21_15 === null ||
    ema50_15 === null ||
    rsiAtual === null
) {
    console.log("Status.............CANDLES INSUFICIENTES");
return "SEM_DADOS";
}

if (ema9 > ema21 && rsiAtual > 55)
    direcao = "BUY";

if (ema9 < ema21 && rsiAtual < 45)
    direcao = "SELL";

if (!direcao) {
    console.log("Status.............SEM SINAL");
    return "SEM_SINAL";
}

const qualidade = calcularQualidade(
    ema9,
    ema21,
    ema50,
    ema100,
    ema200,
    rsiAtual,
    adxAtual,
    ema9_15,
    ema21_15,
    ema50_15,
    estatisticas
);

// ===================================================
// MONEY MANAGER
// ===================================================

const financeiro =
    analisarFinanceiro({

        probabilidade:
            estatisticas.taxaAcerto,

        adx:
            adxAtual,

        atr:
            0.0015

    });
        
// ===================================================
// FILTRO ESTATÍSTICO
// ===================================================

if (
    qualidade.historico === "RUIM"
) {

    console.log(
        "Histórico.........RUIM"
    );

    console.log(
        "Status............REPROVADO"
    );

    return "SEM_QUALIDADE";

}

// ===================================================
// FILTRO FINANCEIRO
// ===================================================

if (

    !financeiro.recomendacao.operar

) {

    console.log(

        "Financeiro.......REPROVADO"

    );

    console.log(

        `Sugestão.........Lote ${financeiro.configuracaoIdeal.lote}`

    );

    console.log(

        `TP...............$${financeiro.configuracaoIdeal.tpUSD}`

    );

    console.log(

        `SL...............$${financeiro.configuracaoIdeal.slUSD}`

    );

    return "SEM_VIABILIDADE";

}
    
// ===================================================
// FILTRO INSTITUCIONAL
// ===================================================

if (qualidade.score < 75) {

    console.log(`Score............${qualidade.score}`);
    console.log("Status...........REPROVADO");

    return "SEM_QUALIDADE";

}

if (qualidade.qualidade === "CONFLITO") {

    console.log(`Score............${qualidade.score}`);
    console.log("Status...........CONFLITO");

    return "SEM_QUALIDADE";

}

if (qualidade.qualidade === "LATERAL") {

    console.log(`Score............${qualidade.score}`);
    console.log("Status...........LATERAL");

    return "SEM_QUALIDADE";

}
        
await salvarOperacao(db, {

    par,
    direcao,
    ema9,
    ema21,
    ema50,
    ema100,
    ema200,
    ema9_15,
    ema21_15,
    ema50_15, 
    rsi: rsiAtual,
    score: qualidade.score,
    tendencia: qualidade.tendencia,
    situacaoRSI: qualidade.rsi,
    qualidade: qualidade.qualidade,
    multiTimeframe: qualidade.multi,
    historico: qualidade.historico,
    confiabilidade: qualidade.confiabilidade,
    pesoHistorico: qualidade.pesoHistorico,
    confidenceMultiplier: qualidade.confidenceMultiplier,
    taxaAcerto: estatisticas.taxaAcerto,
    winsHistoricos: estatisticas.wins,
    lossHistoricos: estatisticas.loss,
    operacoesHistoricas: estatisticas.operacoes,
    lote: financeiro.lote,

tpUSD: financeiro.tpUSD,

slUSD: financeiro.slUSD,

tpPips: financeiro.tpPips,

slPips: financeiro.slPips,

rewardRisk: financeiro.rewardRisk,

riscoPercentual: financeiro.riscoPercentual,

expectativa: financeiro.expectativa,

configuracaoIdeal:
    financeiro.configuracaoIdeal,

recomendacaoFinanceira:
    financeiro.recomendacao.mensagem,
    
    modo: "REAL",
    origem: "scanner",
    engine: "RMI_V1",
    precoEntrada:
        closes[
            closes.length - 1
        ],

    resultado: "PENDENTE"

});

console.log(`Direção...........${direcao}`);
console.log(`EMA9..............${ema9.toFixed(5)}`);
console.log(`EMA21.............${ema21.toFixed(5)}`);
console.log(`RSI...............${rsiAtual.toFixed(2)}`);
console.log(`ADX...............${adxAtual.toFixed(2)}`);
console.log(`Slope............${qualidade.slope}`);
console.log(`Alinhamento......${qualidade.alinhamento}`);
console.log(`Simetria.........${qualidade.simetria}`);
console.log(`Distância........${qualidade.distancia}`);
console.log(`Multi TF.........${qualidade.multi}`);
console.log(`Histórico........${qualidade.historico}`);
console.log(`Assertividade....${estatisticas.taxaAcerto}%`);
console.log(`Confiabilidade...${qualidade.confiabilidade}%`);
console.log(`Peso Histórico...${qualidade.pesoHistorico}`);
console.log(`Wins............${estatisticas.wins}`);
console.log(`Loss............${estatisticas.loss}`);
console.log(`Operações.......${estatisticas.operacoes}`);
console.log(`Score.............${qualidade.score}`);
console.log(`Qualidade.........${qualidade.qualidade}`);
console.log(`Lote............${financeiro.lote}`);
console.log(`TP USD..........${financeiro.tpUSD}`);
console.log(`SL USD..........${financeiro.slUSD}`);
console.log(`Risk/Reward.....${financeiro.rewardRisk}`);
console.log(`Expectativa.....${financeiro.expectativa}`);
console.log(`Financeiro......${financeiro.recomendacao.mensagem}`);
console.log("Status............SALVO");

return "SALVO";


    } catch (e) {
console.log("Status............ERRO");
console.log(`Motivo............${e.message}`);

return "ERRO";
    }

}

module.exports = {
    analisarPar
};
