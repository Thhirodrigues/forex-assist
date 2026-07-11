// ===================================================
// FOREX ASSIST
// RISK INTELLIGENCE ENGINE (RMI V2)
// ===================================================

function calcularRisco({
    score,
    historico,
    atr,
    loteBase = 0.04,
    tpBase = 5,
    slBase = 5
}) {

    return {

        aprovado: true,

        lote: loteBase,

        tpUSD: tpBase,

        slUSD: slBase,

        riscoRetorno: "1:1",

        observacoes: []

    };

}

module.exports = {

    calcularRisco

};
