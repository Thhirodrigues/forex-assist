// ======================================================
// SCORE ENGINE
// Forex Assist - RMI V2
// ======================================================

const ENGINE_WEIGHTS = require("./engineWeights");

// ======================================================
// SCORE BASE
// ======================================================

function calcularScoreBase(score) {

    if (score > 100) score = 100;

    if (score < 0) score = 0;

    return score;
}

// ======================================================
// BÔNUS DE ALINHAMENTO
// ======================================================

function aplicarBonusDirecao(
    score,
    tendencia15,
    tendenciaEMA
) {

    if (
        tendencia15 === "ALTA" &&
        tendenciaEMA === "ALTA"
    ) {

        score += 5;

    }

    if (
        tendencia15 === "BAIXA" &&
        tendenciaEMA === "BAIXA"
    ) {

        score += 5;

    }

    if (
        tendencia15 !== "LATERAL" &&
        tendencia15 !== tendenciaEMA
    ) {

        score -= 10;

    }

    return score;

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

// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    calcularScoreBase,

    aplicarBonusDirecao,

    aplicarConfidenceLevel,

    aplicarPenalidadeHistorico

};
