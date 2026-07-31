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

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const INTERVALO_MONITORAMENTO_MINUTOS = 5;

const TP_PIPS = 50;
const SL_PIPS = -50;

const TP_USD = 5;
const SL_USD = -5;

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

async function buscarUltimoCandle(par) {

    const candles = await getCandles(par);

    const candle = candles[candles.length - 1];

    return {

        open: Number(candle.open),

        high: Number(candle.high),

        low: Number(candle.low),

        close: Number(candle.close)

    };

}

function calcularResultadoOperacao({

    sinal,
    candle,
    configuracao

}) {

    const precoAtual = candle.close;

    const precoMaximo = Math.max(
        sinal.precoMaximo ?? sinal.precoEntrada,
        candle.high
    );

    const precoMinimo = Math.min(
        sinal.precoMinimo ?? sinal.precoEntrada,
        candle.low
    );

    let maxPipsFavor = sinal.maxPipsFavor ?? 0;
    let maxPipsContra = sinal.maxPipsContra ?? 0;

    if (sinal.direcao === "BUY") {

        maxPipsFavor = Math.max(
            maxPipsFavor,
            calcularPips(
                sinal.par,
                sinal.precoEntrada,
                precoMaximo
            )
        );

        maxPipsContra = Math.min(
            maxPipsContra,
            calcularPips(
                sinal.par,
                sinal.precoEntrada,
                precoMinimo
            )
        );

    } else {

        maxPipsFavor = Math.max(
            maxPipsFavor,
            calcularPips(
                sinal.par,
                precoMinimo,
                sinal.precoEntrada
            )
        );

        maxPipsContra = Math.min(
            maxPipsContra,
            calcularPips(
                sinal.par,
                precoMaximo,
                sinal.precoEntrada
            )
        );

    }

    const movimentoPips = calcularPips(
        sinal.par,
        sinal.precoEntrada,
        precoAtual
    );

    const lote = sinal.lote ?? 0.01;

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
    Date.now();

const tempoOperacao =
    agora - sinal.inicioOperacao;

    let motivoEncerramento = null;

    if (lucroAtual >= TP_USD) {

        motivoEncerramento = "TP_FINANCEIRO";

    } else if (lucroAtual <= SL_USD) {

        motivoEncerramento = "SL_FINANCEIRO";

    } else if (maxPipsFavor >= TP_PIPS) {

        motivoEncerramento = "TP_PIPS";

    } else if (maxPipsContra <= SL_PIPS) {

        motivoEncerramento = "SL_PIPS";

    }

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

const candle =
    await buscarUltimoCandle(sinal.par);

const {

    precoAtual,
    precoMaximo,
    precoMinimo,
    movimentoPips,
    maxPipsFavor,
    maxPipsContra,
    lucroAtual,
    motivoEncerramento,
    operacaoFinalizada

} = calcularResultadoOperacao({

    sinal,
    candle

});

            
    if (operacaoFinalizada) {

    await db.runTransaction(async (transaction) => {

        const operacaoRef = documento.ref;

        const operacaoSnap = await transaction.get(operacaoRef);

        if (!operacaoSnap.exists)
            return;

        const configuracaoTransacao =
    configuracaoSnap.data();

        const {
    saldoAntes,
    saldoDepois,
    resultadoFinanceiro,
    resultado,
    agora,
    tempoOperacao
} = calcularResultadoOperacao({
    sinal,
    candle,
    configuracao: configuracaoTransacao
            
});

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
