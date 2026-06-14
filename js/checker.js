// =====================================================
// Forex Assist
// scripts/checker.js
// V5.1.0 - Base Profissional
// =====================================================

const admin = require("firebase-admin");
const axios = require("axios");

const serviceAccount = require("../serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// =====================================================
// Calcula quantidade de pips
// =====================================================

function calcularPips(par, direcao, entrada, fechamento) {

  const pip =
    par.endsWith("JPY")
      ? 0.01
      : 0.0001;

  let valor;

  if (direcao === "CALL") {

    valor =
      (fechamento - entrada) / pip;

  } else {

    valor =
      (entrada - fechamento) / pip;

  }

  return Number(valor.toFixed(1));

}

// =====================================================
// Busca preço atual
// =====================================================

async function buscarPreco(par) {

  const url =
    `https://api.twelvedata.com/price?symbol=${par}&apikey=${process.env.API_KEY}`;

  const resposta =
    await axios.get(url);

  return Number(resposta.data.price);

}

// =====================================================
// Processa um único sinal
// =====================================================

async function processarSinal(doc) {

  const sinal = doc.data();

  if (
    !sinal.timestamp ||
    !sinal.precoEntrada ||
    !sinal.par
  ) {
    return;
  }

  const entrada =
    sinal.timestamp.toDate().getTime();

  const minutos =
    (Date.now() - entrada) / 60000;

  if (minutos < 15) {
    return;
  }

  try {

    const precoAtual =
      await buscarPreco(sinal.par);

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
        sinal.direcao,
        sinal.precoEntrada,
        precoAtual
      );

    const variacaoPercentual =
      Number(
        (
          (
            (precoAtual - sinal.precoEntrada) /
            sinal.precoEntrada
          ) * 100
        ).toFixed(4)
      );

    await doc.ref.update({

      resultado,

      precoFechamento:
        precoAtual,

      horarioResultado:
        new Date()
          .toLocaleTimeString("pt-BR"),

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
      "Erro:",
      sinal.par,
      erro.message
    );

  }

}

// =====================================================
// Execução principal
// =====================================================

async function executar() {

  const snapshot =
    await db
      .collection("historico")
      .where("resultado", "==", null)
      .get();

  console.log(
    `Sinais pendentes: ${snapshot.size}`
  );

  for (const doc of snapshot.docs) {

    await processarSinal(doc);

  }

  console.log("Result Checker finalizado.");

}

executar();
