// ===================================================
// CONFIGURAÇÕES
// ===================================================

const POSITION_CONFIG = {

    LOTE_PADRAO: 0.04,

    TP_PADRAO: 5,

    SL_PADRAO: 5,

    RISCO_MAXIMO: 2,

    SCORE_MINIMO: 60,

    SCORE_EXCELENTE: 85

};

// ===================================================
// CÁLCULO DO RISCO
// ===================================================

function calcularRisco(

    banca,
    stopLoss

) {

    if (!banca || banca <= 0) {

        return 0;

    }

    return Number(

        ((stopLoss / banca) * 100)

        .toFixed(2)

    );

}
