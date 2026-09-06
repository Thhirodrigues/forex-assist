const admin = require("firebase-admin");
const { getCandles } = require("../scripts/marketData");

console.log("KEY 1:", !!process.env.API_KEY_1);
console.log("KEY 2:", !!process.env.API_KEY_2);
console.log("KEY 3:", !!process.env.API_KEY_3);

const serviceAccount = require("../serviceAccount.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const configuracaoRef = db
    .collection("configuracoes")
    .doc("geral");

// ===================================================
// CONFIGURAÇÕES
// ===================================================

const CONFIG = {
    INTERVALO_MONITORAMENTO_MINUTOS: 5,

    LIMITES: {
        TP_USD: 5,
        SL_USD: -5,
        TP_PIPS: 50,
        SL_PIPS: -50
    }
};

const LIMITES = CONFIG.LIMITES;

// =====================================================
// UTILITÁRIOS
// =====================================================

function calcularPips(par, entrada, fechamento) {

    const fator = par.includes("JPY") ? 100 : 10000;

    return Number(
        ((fechamento - entrada) * fator).toFixed(1)
    );

}

function calcularLucroUSD(pips, lote) {

    const valorPip = 10 * lote;

    return Number(
        (pips * valorPip).toFixed(2)
    );

}

// BUG-007: o P&L (movimentoPips/lucroAtual) era calculado sempre como
// (preco - entrada), ignorando a direcao. Numa SELL, queda de preco e lucro
// real, mas isso aparecia como prejuizo (e vice-versa) - inverte o sinal
// financeiro de toda operacao SELL encerrada por este checker. As checagens
// de maxPipsFavor/maxPipsContra ja eram corretas (ja tratavam a direcao);
// só o P&L financeiro estava errado.
function calcularMovimentoPips(sinal, preco) {

    return sinal.direcao === "BUY"
        ? calcularPips(sinal.par, sinal.precoEntrada, preco)
        : calcularPips(sinal.par, preco, sinal.precoEntrada);

}

// O cron do result-checker (5 em 5 min, na teoria) sofre atrasos reais de
// horas por limitação do próprio agendador do GitHub Actions em contas
// gratuitas. buscarCandlesDesde() reconstrói TODOS os candles de 5min desde
// a abertura da operação (ou desde a última checagem persistida), em vez de
// olhar só o candle mais recente — senão um TP/SL tocado e revertido no
// meio do intervalo nunca seria visto.
//
// Assume-se que "datetime" da TwelveData vem em UTC (comportamento padrão
// da API para Forex quando o parâmetro "timezone" não é informado, como é
// o caso aqui). Validar contra um candle real na primeira operação
// encerrada por este código antes de confiar cegamente no resultado.
async function buscarCandlesDesde(par, desde) {

    const agora = Date.now();

    const minutosDecorridos = Math.max(
        5,
        Math.ceil((agora - desde) / (5 * 60 * 1000))
    );

    const outputsize = Math.min(5000, minutosDecorridos + 10);

    const candles = await getCandles(par, "5min", outputsize);

    return candles
        .map(c => ({
            timestamp: new Date(c.datetime.replace(" ", "T") + "Z").getTime(),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close)
        }))
        .filter(c => c.timestamp >= desde)
        .sort((a, b) => a.timestamp - b.timestamp);

}

function calcularResultadoOperacao({

    sinal,
    candles,
    configuracao

}) {

    const limites = configuracao?.limites ?? LIMITES;
    const lote = sinal.lote ?? 0.01;

    let precoMaximo = sinal.precoMaximo ?? sinal.precoEntrada;
    let precoMinimo = sinal.precoMinimo ?? sinal.precoEntrada;
    let maxPipsFavor = sinal.maxPipsFavor ?? 0;
    let maxPipsContra = sinal.maxPipsContra ?? 0;

    let motivoEncerramento = null;
    let candleEncerramento = null;

    // Percorre os candles em ordem cronológica, atualizando os extremos e
    // checando as condições de saída a cada passo - assim, um TP/SL tocado
    // no meio do caminho é detectado mesmo que candles posteriores já
    // tenham revertido o preço.
    for (const candle of candles) {

        precoMaximo = Math.max(precoMaximo, candle.high);
        precoMinimo = Math.min(precoMinimo, candle.low);

        if (sinal.direcao === "BUY") {

            maxPipsFavor = Math.max(
                maxPipsFavor,
                calcularPips(sinal.par, sinal.precoEntrada, precoMaximo)
            );

            maxPipsContra = Math.min(
                maxPipsContra,
                calcularPips(sinal.par, sinal.precoEntrada, precoMinimo)
            );

        } else {

            maxPipsFavor = Math.max(
                maxPipsFavor,
                calcularPips(sinal.par, precoMinimo, sinal.precoEntrada)
            );

            maxPipsContra = Math.min(
                maxPipsContra,
                calcularPips(sinal.par, precoMaximo, sinal.precoEntrada)
            );

        }

        const lucroCandle = calcularLucroUSD(
            calcularMovimentoPips(sinal, candle.close),
            lote
        );

        if (lucroCandle >= limites.TP_USD) {
            motivoEncerramento = "TP_FINANCEIRO";
        } else if (lucroCandle <= limites.SL_USD) {
            motivoEncerramento = "SL_FINANCEIRO";
        } else if (maxPipsFavor >= limites.TP_PIPS) {
            motivoEncerramento = "TP_PIPS";
        } else if (maxPipsContra <= limites.SL_PIPS) {
            motivoEncerramento = "SL_PIPS";
        }

        if (motivoEncerramento) {
            candleEncerramento = candle;
            break;
        }

    }

    const candleFinal = candleEncerramento ?? candles[candles.length - 1];
    const precoAtual = candleFinal.close;

    const movimentoPips = calcularMovimentoPips(sinal, precoAtual);

    const lucroAtual = calcularLucroUSD(
        movimentoPips,
        lote
    );

    const saldoAntes =
    configuracao.tipoConta === "SIMULADA"
        ? configuracao.saldoSimulado
        : configuracao.saldoReal;

const saldoDepois =
    configuracao.tipoConta === "SIMULADA"
        ? Number((saldoAntes + lucroAtual).toFixed(2))
        : saldoAntes;

const resultadoFinanceiro =
    Number(lucroAtual.toFixed(2));

const agora =
    candleEncerramento ? candleFinal.timestamp : Date.now();

const tempoOperacao =
    agora - sinal.inicioOperacao;

    const operacaoFinalizada =
        motivoEncerramento !== null &&
        sinal.status !== "ENCERRADA";

    const resultado =

    motivoEncerramento === "TP_FINANCEIRO" ||
    motivoEncerramento === "TP_PIPS"

        ? "WIN"

        : "LOSS";

    return {

precoAtual,
precoMaximo,
precoMinimo,
movimentoPips,
maxPipsFavor,
maxPipsContra,
lucroAtual,
resultadoFinanceiro,
motivoEncerramento,
resultado,
saldoAntes,
saldoDepois,
agora,
tempoOperacao,
operacaoFinalizada

    };

}

// =====================================================
// PROCESSAMENTO
// =====================================================

async function verificarSinais() {

    console.log("====================================");
    console.log("Forex Assist Result Checker");
    console.log("====================================");
    
   const configuracaoSnap = await configuracaoRef.get();
    
    const snapshot = await db
    .collection("historico")
    .where("status", "==", "ABERTA")
    .get();
    
    console.log(`Pendentes: ${snapshot.size}`);


    for (const documento of snapshot.docs) {

        const sinal = documento.data();

        if (
            !sinal.inicioOperacao ||
            !sinal.precoEntrada ||
            !sinal.par
        ) {
            continue;
        }

        try {

const desde = sinal.inicioOperacao;

const candles =
    await buscarCandlesDesde(sinal.par, desde);

if (!candles.length) {

    console.log(
        `${sinal.par}: nenhum candle novo desde a abertura, pulando.`
    );

    continue;

}

const {

    precoAtual,
    precoMaximo,
    precoMinimo,
    movimentoPips,
    maxPipsFavor,
    maxPipsContra,
    lucroAtual,
    resultadoFinanceiro,
    saldoAntes,
    saldoDepois,
    resultado,
    agora,
    tempoOperacao,
    motivoEncerramento,
    operacaoFinalizada

} = calcularResultadoOperacao({

    sinal,
    candles,
    configuracao: configuracaoSnap.data()

});


    if (operacaoFinalizada) {

    await db.runTransaction(async (transaction) => {

        const operacaoRef = documento.ref;

        const operacaoSnap = await transaction.get(operacaoRef);

        if (!operacaoSnap.exists)
            return;

        const operacao = operacaoSnap.data();

        const configuracaoTransacao =
    configuracaoSnap.data();


        // Outro processo já encerrou esta operação
        if (operacao.status !== "ABERTA")
            return;


        transaction.update(operacaoRef, {

            precoAtual,

            precoMaximo,

            precoMinimo,

            maxPipsFavor,

            maxPipsContra,

            lucroAtual,

            resultadoFinanceiro,

            saldoAntes,

            saldoDepois,

            status: "ENCERRADA",
            
            resultado,

            motivoEncerramento,

            precoFechamento: precoAtual,

            fimOperacao: agora,

            tempoOperacao
            
        });

        if (configuracaoTransacao.tipoConta === "SIMULADA") {

            transaction.update(configuracaoRef, {

                saldoSimulado: saldoDepois

            });

        }

    });

} 
    else {

    await documento.ref.update({

        precoAtual,

        precoMaximo,

        precoMinimo,

        maxPipsFavor,

        maxPipsContra,

        lucroAtual,

        resultadoFinanceiro,
    });

    }

    if (operacaoFinalizada) {

    console.log(
        `Operação encerrada: ${sinal.par} -> ${motivoEncerramento}`
    );

            }

    const resumoOperacao = [
    sinal.par,
    operacaoFinalizada ? "ENCERRADA" : "ABERTA",
    `Atual: ${precoAtual}`,
    `Máx: ${precoMaximo}`,
    `Mín: ${precoMinimo}`,
    `Favor: ${maxPipsFavor} pips`,
    `Contra: ${maxPipsContra} pips`,
    `USD: ${lucroAtual.toFixed(2)}`,
    operacaoFinalizada ? motivoEncerramento : null
]
.filter(Boolean)
.join(" | ");

console.log(resumoOperacao);

        } catch (erro) {

            console.log(
                `Erro em ${sinal.par}: ${erro.message}`
            );

        }

    }

    console.log("Finalizado.");

}

verificarSinais();
