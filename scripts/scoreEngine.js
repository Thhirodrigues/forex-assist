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
// BÔNUS DE DIREÇÃO
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
// ===================================================
// BÔNUS DO HISTÓRICO
// ===================================================

function aplicarBonusHistorico(historico) {

    let bonus = 0;

    if (historico.status === "EXCELENTE") {

        bonus += Math.round(
            ENGINE_WEIGHTS.BONUS_EXCELENTE *
            historico.confidenceMultiplier
        );

    }

    else if (historico.status === "BOA") {

        bonus += Math.round(
            ENGINE_WEIGHTS.BONUS_BOA *
            historico.confidenceMultiplier
        );

    }

    return bonus;

}

// ======================================================
// FILTRO DE CONFIANÇA
// ======================================================

function aplicarConfidenceLevel(
    score,
    historico
) {

    if (historico.confiabilidade >= 90) {
        score += 2;
    }

    else if (historico.confiabilidade <= 30) {
        score -= 2;
    }

    return score;

}

// ======================================================
// PENALIDADE HISTÓRICA
// ======================================================

function aplicarPenalidadeHistorico(
    historico,
    multi
) {

    let penalidade = 0;

    if (multi.status === "DIVERGENTE") {
        penalidade += ENGINE_WEIGHTS.PENALIDADE_DIVERGENCIA;
    }

    if (historico.status === "RUIM") {
        penalidade += ENGINE_WEIGHTS.PENALIDADE_RUIM;
    }

    if (historico.status === "SEM_BASE") {
        penalidade += ENGINE_WEIGHTS.PENALIDADE_SEM_BASE;
    }

    return penalidade;

}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    calcularScoreBase,

    aplicarBonusDirecao,

    aplicarBonusHistorico,

    aplicarConfidenceLevel,

    aplicarPenalidadeHistorico,

};
