// ======================================================
// SCORE ENGINE
// Forex Assist - RMI V2
// ======================================================

const ENGINE_WEIGHTS = {
    BONUS_EXCELENTE: 5,
    BONUS_BOA: 3,
    PENALIDADE_RUIM: 10,
    PENALIDADE_SEM_BASE: 5,
    PENALIDADE_DIVERGENCIA: 10
};

// ======================================================
// SCORE BASE
// ======================================================

function calcularScoreBase(score) {

    score = Math.round(score);

    if (score > 100) score = 100;

    if (score < 0) score = 0;

    return score;

}

// ======================================================
// BÔNUS DE ALINHAMENTO
// ======================================================

function aplicarBonusDirecao(historicoDirecao) {

    if (!historicoDirecao) {
        return 0;
    }

    if (historicoDirecao.taxaAcerto >= 80) {
        return 5;
    }

    if (historicoDirecao.taxaAcerto >= 70) {
        return 3;
    }

    if (historicoDirecao.taxaAcerto < 50) {
        return -5;
    }

    return 0;

}

// ======================================================
// FILTRO DE CONFIANÇA
// ======================================================

function aplicarConfidenceLevel(
    score,
    confidenceLevel
) {

    if (confidenceLevel === "BAIXA") {

        score -= 5;

    }

    else if (confidenceLevel === "MEDIA") {

        score -= 2;

    }

    return score;

}

// ======================================================
// PENALIDADE HISTÓRICA
// ======================================================

function aplicarPenalidadeHistorico(
    score,
    historico
) {

    let penalidade = 0;

    if (historico.status === "RUIM") {

        penalidade += ENGINE_WEIGHTS.PENALIDADE_RUIM;

    }

    if (historico.status === "SEM_BASE") {

        penalidade += ENGINE_WEIGHTS.PENALIDADE_SEM_BASE;

    }

    score -= penalidade;

    return {

        score,

        penalidade

    };

}

function aplicarNormalizacao(score) {

    score = Math.max(
        0,
        Math.round(score)
    );

    if (score > 100) {
        score = 100;
    }

    if (score < 0) {
        score = 0;
    }

    return score;

}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    calcularScoreBase,

    aplicarBonusDirecao,

    aplicarConfidenceLevel,

    aplicarPenalidadeHistorico,

    aplicarNormalizacao

};
