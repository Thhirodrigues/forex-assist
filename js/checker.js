const admin = require("firebase-admin");
const { getCandles } = require("../scripts/marketData");

console.log("KEY 1:", !!process.env.TWELVEDATA_KEY);
console.log("KEY 2:", !!process.env.TWELVEDATA_KEY_2);
console.log("KEY 3:", !!process.env.TWELVEDATA_KEY_3);

const serviceAccount = require("../serviceAccount.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const INTERVALO_MONITORAMENTO_MINUTOS = 5;

// =====================================================
// UTILITÁRIOS
// =====================================================

function calcularPips(par, entrada, fechamento) {

    const fator = par.includes("JPY") ? 100 : 10000;

    return Number(
        ((fechamento - entrada) * fator).toFixed(1)
    );

}

function calcularVariacaoPercentual(entrada, fechamento) {

    return Number(
        (
            ((fechamento - entrada) / entrada) * 100
        ).toFixed(4)
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
// =====================================================
// PROCESSAMENTO
// =====================================================

async function verificarSinais() {

    console.log("====================================");
    console.log("Forex Assist Result Checker");
    console.log("====================================");

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

           const precoAtual = candle.close;
            
            const precoMaximo =
    Math.max(
        sinal.precoMaximo ?? sinal.precoEntrada,
        candle.high
    );

            const precoMinimo =
    Math.min(
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
            await documento.ref.update({

                precoAtual,

                precoMaximo,

                precoMinimo,

                maxPipsFavor,

                maxPipsContra,
                
                // resultado,

// precoFechamento: precoAtual,

// horarioResultado:
//     new Date().toLocaleTimeString("pt-BR"),

// movimentoPips,

// variacaoPercentual,

// tempoDecorrido:
//     Math.floor(minutos)

            });

            console.log(
`${sinal.par} | ABERTA | Atual: ${precoAtual} | Máx: ${precoMaximo} | Mín: ${precoMinimo} | Favor: ${maxPipsFavor} pips | Contra: ${maxPipsContra} pips`
);

        } catch (erro) {

            console.log(
                `Erro em ${sinal.par}: ${erro.message}`
            );

        }

    }

    console.log("Finalizado.");

}

verificarSinais();
