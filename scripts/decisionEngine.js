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

// ===================================================
// PERFIL DE ANÁLISE
//
// Cada perfil operacional exige um rigor diferente da
// mesma engine de análise (RMI) antes de aprovar um
// sinal - a análise em si é sempre completa e correta
// para todos os perfis; o que muda é a barra de
// aprovação. Conservador é o mais seletivo (poucos sinais,
// os mais confiáveis); Agressivo é o mais permissivo
// (mais sinais, aceita mais risco).
// ===================================================

const PERFIL_ANALISE = {

    AGRESSIVO: {
        scoreMinimo: 35,
        exigirMultiTimeframe: false,
        operacoesMinimas: 0
    },

    BALANCEADO: {
        scoreMinimo: 45,
        exigirMultiTimeframe: true,
        operacoesMinimas: 0
    },

    CONSERVADOR: {
        scoreMinimo: 55,
        exigirMultiTimeframe: true,
        // Mantido igual a OPERACOES_MINIMAS_HISTORICO em statisticsEngine.js
        // (elevado de 10 para 30 em 07/09/2026 - amostra pequena demais
        // pra ser tratada como base de conhecimento confiável).
        operacoesMinimas: 30
    }

};

function obterPerfilAnalise(perfil) {

    return PERFIL_ANALISE[perfil] || PERFIL_ANALISE.BALANCEADO;

}

function avaliarOperacao(resultado) {

    const score = resultado.scoreFinal ?? resultado.score;

    const multi = resultado.multi;

    const qualidade = resultado.qualidade;

    const tendencia = resultado.tendencia;

    const confianca = resultado.confianca ?? score;

    const recomendacaoFinanceira = resultado.recomendacaoFinanceira;

    const perfilAnalise = obterPerfilAnalise(resultado.perfil);

    const justificativas = [];

    if (score < perfilAnalise.scoreMinimo) {

    justificativas.push("Score insuficiente");

    return {
        aprovado: false,
        status: "REPROVADO",
        direcao: "NONE",
        motivo: `Score abaixo do mínimo (${perfilAnalise.scoreMinimo}, perfil ${resultado.perfil || "BALANCEADO"})`,
        score,
        qualidade,
        tendencia,
        confianca,
        justificativas
    };

    }

    if (
        perfilAnalise.operacoesMinimas > 0 &&
        (resultado.operacoesHistoricas ?? 0) < perfilAnalise.operacoesMinimas
    ) {

    justificativas.push("Histórico insuficiente para o perfil");

    return {
        aprovado: false,
        status: "SEM_VIABILIDADE",
        direcao: "NONE",
        motivo: `Histórico insuficiente para o perfil ${resultado.perfil} (mínimo ${perfilAnalise.operacoesMinimas} operações)`,
        score,
        qualidade,
        tendencia,
        confianca,
        justificativas
    };

    }

    if (multi === "DIVERGENTE" && perfilAnalise.exigirMultiTimeframe) {

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
    recomendacaoFinanceira &&
    !recomendacaoFinanceira.operar
) {

    justificativas.push("Operação reprovada pelo Money Manager");

    return {

        aprovado: false,

        status: "SEM_VIABILIDADE",

        direcao: "NONE",

        motivo: recomendacaoFinanceira.mensagem,

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

    // BUG-021 (09/09/2026): este objeto `risco` era montado com
    // resultado.financeiro?.lote/tpUSD/slUSD, mas pairAnalyzer.js
    // nunca passa `financeiro` pra avaliarOperacao() - resultado.
    // financeiro sempre foi undefined aqui, e riscoRetorno/
    // riscoPercentual já vinham hardcoded null mesmo quando
    // funcionasse. O resultado prático: pairAnalyzer.js's `const risco
    // = decisao.risco || {...}` sempre pegava ESTE objeto quebrado (é
    // truthy, então o fallback correto - que já usa o financeiro real,
    // no escopo certo - nunca era alcançado). Removido: sem `.risco`
    // aqui, pairAnalyzer.js cai no próprio fallback, que já tem acesso
    // direto ao `financeiro` calculado corretamente por moneyManager.js.
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
}

module.exports = {

    avaliarOperacao,

    obterPerfilAnalise

};
