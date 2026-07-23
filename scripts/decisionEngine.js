// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// DECISION ENGINE
//
// Responsabilidade:
//
// Tomar a decisão operacional utilizando
// apenas as informações produzidas pelo
// Market Analyzer.
//
// SPRINT 07
// ===================================================

function avaliarOperacao(resultado) {

    const score = resultado.scoreFinal ?? resultado.score;
    
    const multi = resultado.multi;

    const qualidade = resultado.qualidade;

    const tendencia = resultado.tendencia;

    const confianca = resultado.confianca ?? score;

    const justificativas = [];

    if (score < 45) {

    justificativas.push("Score insuficiente");

    return {
        aprovado: false,
        status: "REPROVADO",
        direcao: "NONE",
        motivo: "Score abaixo do mínimo",
        score,
        qualidade,
        tendencia,
        confianca,
        justificativas
    };

    }

    if (multi === "DIVERGENTE") {

    justificativas.push("Multi-timeframe divergente");

    return {
        aprovado: false,
        status: "COOLDOWN",
        direcao: "NONE",
        motivo: "Conflito entre timeframes",
        score,
        qualidade,
        tendencia,
        confianca,
        justificativas
    };

    }

    if (

    qualidade === "LATERAL" ||

    qualidade === "CONFLITO"

) {

    justificativas.push("Mercado sem tendência definida");

    return {
        aprovado: false,
        status: "SEM_SINAL",
        direcao: "NONE",
        motivo: "Qualidade insuficiente",
        score,
        qualidade,
        tendencia,
        confianca,
        justificativas
    };

    }

    if (tendencia === "ALTA") {

    justificativas.push("Tendência de alta confirmada");

    return {
        aprovado: true,
        status: "COMPRA",
        direcao: "BUY",
        motivo: "Todos os critérios atendidos",
        score,
        qualidade,
        tendencia,
        confianca,
        justificativas
    };

    }

    if (tendencia === "BAIXA") {

    justificativas.push("Tendência de baixa confirmada");

    return {
        aprovado: true,
        status: "VENDA",
        direcao: "SELL",
        motivo: "Todos os critérios atendidos",
        score,
        qualidade,
        tendencia,
        confianca,
        justificativas
    };

    }

    return {

    aprovado: false,
    status: "SEM_SINAL",
    direcao: "NONE",
    motivo: "Nenhuma condição de entrada encontrada",
    score,
    qualidade,
    tendencia,
    confianca,
    justificativas

};

module.exports = {

    avaliarOperacao

};
