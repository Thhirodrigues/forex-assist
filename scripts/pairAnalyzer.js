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

const {
    avaliarOperacao
} = require("./decisionEngine");

async function analisarPar({
db,
par,
estatisticas,
getCandles,
ema,
rsi,
calcularADX,
calcularATR,
calcularQualidade,
existeCooldown

}) {

    try {

        if (await existeCooldown(db, par)) {

    console.log("Status............COOLDOWN");
    console.log("Motivo............Operação recente");

    return {
        status: "COOLDOWN"
    };

        }

const candles =
    await getCandles(par);

const candles15 =
    await getCandles(
        par,
        "15min"
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

 const atrAtual = calcularATR(
    14,
    highs,
    lows,
    closes
);

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
return {
    status: "SEM_DADOS"
};
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
    estatisticas,
    atrAtual
    
);

// ===================================================
// DIREÇÃO DEFINIDA PELO MARKET ANALYZER
// ===================================================

direcao = qualidade.tendencia;

// ===================================================
// MONEY MANAGER
// ===================================================

const financeiro =
    analisarFinanceiro({

        probabilidade:
             estatisticas.resumo.taxaAcerto,

        adx:
            adxAtual,

        atr:
            atrAtual

    });
        
const decisao = avaliarOperacao({

    score: qualidade.score,

    qualidade: qualidade.qualidade,

    tendencia: qualidade.tendencia,

    multi: qualidade.multi,

    confianca: qualidade.confidenceLevel,

    recomendacaoFinanceira: financeiro.recomendacao

});

if (!decisao.aprovado) {

    console.log(`Status............${decisao.status}`);
    console.log(`Motivo............${decisao.motivo}`);

    return {
        status: decisao.status,
        motivo: decisao.motivo
    };

}

direcao = decisao.direcao;
        
// ===================================================
// FILTRO DE CONFIANÇA
// ===================================================

// Apenas registra a confiança.
// Nesta fase ela não reprova operações.
// O peso já é aplicado pelo Market Analyzer.

console.log(
    `Confidence.......${qualidade.confidenceLevel}`
);
        

// ===================================================
// FILTRO ESTATÍSTICO
// ===================================================

if (qualidade.historico === "RUIM") {

    console.log(
        "Histórico.........RUIM (penalizado no score)"
    );

}
    
// ===================================================
// FILTRO INSTITUCIONAL
// ===================================================

        // ===================================================
// RISCO
// (temporariamente vindo do Decision Engine)
// ===================================================

const risco = decisao.risco || {
    lote: financeiro.lote,
    tpUSD: financeiro.tpUSD,
    slUSD: financeiro.slUSD,
    riscoRetorno: null,
    riscoPercentual: null,
    aprovado: true,
    justificativas: []
};

const operacao = {

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

atr: atrAtual,

score: qualidade.score,

scoreTecnico: qualidade.scoreTecnico,

emaScore: qualidade.emaScore,

rsiScore: qualidade.rsiScore,

adxScore: qualidade.adxScore,

tendenciaScore: qualidade.tendenciaScore,

penalizacao: qualidade.penalizacao,

tendencia: qualidade.tendencia,

situacaoRSI: qualidade.rsi,

qualidade: qualidade.qualidade,

multiTimeframe: qualidade.multi,

historico: qualidade.historico,

confiabilidade: qualidade.confiabilidade,

pesoHistorico: qualidade.pesoHistorico,

confidenceMultiplier: qualidade.confidenceMultiplier,

confidenceLevel: qualidade.confidenceLevel,

taxaAcerto: estatisticas.resumo.taxaAcerto,

winsHistoricos: estatisticas.wins,

lossHistoricos: estatisticas.loss,

operacoesHistoricas: estatisticas.operacoes,

lote: risco.lote,

tpUSD: risco.tpUSD,

slUSD: risco.slUSD,

tpPips: financeiro.tpPips,

slPips: financeiro.slPips,

rewardRisk: risco.riscoRetorno,

riscoPercentual: risco.riscoPercentual,

aprovado: risco.aprovado,

justificativasRisco: risco.justificativas,

decisao: decisao.status,

motivoDecisao: decisao.motivo,

justificativasDecisao: decisao.justificativas,

confiancaDecisao: decisao.confianca,

expectativa: financeiro.expectativa,

configuracaoIdeal: financeiro.configuracaoIdeal,

recomendacaoFinanceira: financeiro.recomendacao.mensagem,

modo: "REAL",

origem: "scanner",

engine: "RMI_V2",

precoEntrada: closes[closes.length - 1],

status: "ABERTA",

inicioOperacao: Date.now(),

fimOperacao: null,

tempoOperacao: null,

precoAtual: closes[closes.length - 1],

precoMaximo: closes[closes.length - 1],

precoMinimo: closes[closes.length - 1],

maxPipsFavor: 0,

maxPipsContra: 0,

precoSaida: null,

resultado: null,

resultadoFinanceiro: null,

lucroUSD: null
    
};
        
await salvarOperacao(db, operacao);

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
console.log(`Assertividade....${estatisticas.resumo.taxaAcerto}%`);
console.log(`Confiabilidade...${qualidade.confiabilidade}%`);
console.log(`Confidence.......${qualidade.confidenceLevel}`);
console.log(`Peso Histórico...${qualidade.pesoHistorico}`);
console.log(`Wins............${estatisticas.wins}`);
console.log(`Loss............${estatisticas.loss}`);
console.log(`Operações.......${estatisticas.operacoes}`);
console.log(`EMA Score........${qualidade.emaScore}`);
console.log(`RSI Score........${qualidade.rsiScore}`);
console.log(`ADX Score........${qualidade.adxScore}`);
console.log(`Trend Score......${qualidade.tendenciaScore}`);
console.log(`Score Técnico....${qualidade.scoreTecnico}`);
console.log(`Penalização......${qualidade.penalizacao}`);
console.log(`Qualidade.........${qualidade.qualidade}`);
console.log(`Score.............${qualidade.score}`);
console.log(`Lote............${operacao.lote}`);
console.log(`TP USD..........${operacao.tpUSD}`);
console.log(`SL USD..........${operacao.slUSD}`);
console.log(`Risk/Reward.....${operacao.rewardRisk}`);
console.log(`Expectativa.....${operacao.expectativa}`);
console.log(`Financeiro......${financeiro.recomendacao.mensagem}`);
console.log("Status............SALVO");

return {
    status: "SALVO",
    operacao
};

    } catch (e) {
console.log("Status............ERRO");
console.log(`Motivo............${e.message}`);

return {
    status: "ERRO",
    motivo: e.message
};
    }

}

module.exports = {
    analisarPar
};
