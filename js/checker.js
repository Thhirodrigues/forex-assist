const admin = require("firebase-admin");
const axios = require("axios");

const serviceAccount = require("../serviceAccount.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const API_KEY = process.env.API_KEY;

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

async function buscarPrecoAtual(par) {

    const url =
        `https://api.twelvedata.com/price?symbol=${par}&apikey=${API_KEY}`;

    const resposta = await axios.get(url);

    if (!resposta.data.price) {
        throw new Error("Preço não encontrado.");
    }

    return Number(resposta.data.price);

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
        .where("resultado", "==", null)
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
            sinal.timestamp.toDate().getTime();

        const minutos =
            (agora - entrada) / 60000;

        if (minutos < TEMPO_RESULTADO_MINUTOS) {
            continue;
        }

        try {

            const precoAtual =
                await buscarPrecoAtual(sinal.par);

            let resultado = "LOSS";

            if (
                sinal.direcao === "CALL" &&
                precoAtual > sinal.precoEntrada
            ) {
                resultado = "WIN";
            }

            if (
                sinal.direcao === "PUT" &&
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
