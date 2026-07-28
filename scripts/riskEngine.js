// ===================================================
// FOREX ASSIST
// RISK INTELLIGENCE ENGINE (RMI V2)
// ===================================================

function calcularRisco({
    score = 0,
    historico = {},
    atr = 0,
    loteBase = 0.04,
    tpBase = 5,
    slBase = 5
}) {

    const justificativas = [];

    let lote = loteBase;
    let tpUSD = tpBase;
    let slUSD = slBase;

    let riscoPercentual = 1.0;
    let riscoRetorno = "1:1";

    const taxaAcerto =
        historico?.taxaAcerto ?? 0;

    // ==========================
    // SCORE
    // ==========================

    if (score >= 95) {

        justificativas.push("Score extremamente elevado");

        tpUSD = tpBase * 2;

    } else if (score >= 90) {

        justificativas.push("Score elevado");

        tpUSD = tpBase * 1.6;

    } else if (score >= 85) {

        justificativas.push("Score consistente");

        tpUSD = tpBase * 1.2;

    } else {

        justificativas.push("Score mínimo operacional");

    }

    // ==========================
    // HISTÓRICO
    // ==========================

    if (taxaAcerto >= 70) {

        justificativas.push("Histórico excelente");

    } else if (taxaAcerto >= 60) {

        justificativas.push("Histórico consistente");

    } else {

        justificativas.push("Histórico limitado");

    }

    // ==========================
    // ATR
    // ==========================

    if (atr > 0) {

        justificativas.push("ATR analisado");

    }

    const rewardRisk = riscoRetorno;

let expectativa = "NORMAL";

if (score >= 95)
    expectativa = "MUITO_ALTA";

else if (score >= 90)
    expectativa = "ALTA";

else if (score >= 85)
    expectativa = "BOA";

else
    expectativa = "MODERADA";

    return {

    aprovado: score >= 80,

    lote,

    tpUSD: Number(tpUSD.toFixed(2)),

    slUSD: Number(slUSD.toFixed(2)),

    riscoPercentual,

    riscoRetorno,

    rewardRisk,

    expectativa,

    justificativas

};

}

module.exports = {

    calcularRisco

};
