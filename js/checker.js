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

const TEMPO_RESULTADO_MINUTOS = 15;

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
async function buscarPrecoFechamento(par) {

    const candles = await getCandles(par);

    return Number(candles[candles.length - 1].close);

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
        .where("resultado", "==", "PENDENTE")
        .get();

    console.log(`Pendentes: ${snapshot.size}`);

    const agora = Date.now();

    for (const documento of snapshot.docs) {

        const sinal = documento.data();

        if (
            !sinal.timestamp ||
            !sinal.precoEntrada ||
            !sinal.par
        ) {
            continue;
        }

        const entrada =
    typeof sinal.timestamp === "number"
        ? sinal.timestamp
        : sinal.timestamp.toDate().getTime();

        const minutos =
            (agora - entrada) / 60000;

        if (minutos < TEMPO_RESULTADO_MINUTOS) {
            continue;
        }

        try {

            const precoAtual =
                await buscarPrecoFechamento(sinal.par);

            let resultado = "LOSS";

            if (
                sinal.direcao === "BUY" &&
                precoAtual > sinal.precoEntrada
            ) {
                resultado = "WIN";
            }

            if (
                sinal.direcao === "SELL" &&
                precoAtual < sinal.precoEntrada
            ) {
                resultado = "WIN";
            }

            const movimentoPips =
                calcularPips(
                    sinal.par,
                    sinal.precoEntrada,
                    precoAtual
                );

            const variacaoPercentual =
                calcularVariacaoPercentual(
                    sinal.precoEntrada,
                    precoAtual
                );

            await documento.ref.update({

                resultado,

                precoFechamento: precoAtual,

                horarioResultado:
                    new Date().toLocaleTimeString("pt-BR"),

                movimentoPips,

                variacaoPercentual,

                tempoDecorrido:
                    Math.floor(minutos)

            });

            console.log(
                `${sinal.par} | ${resultado} | ${movimentoPips} pips`
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
