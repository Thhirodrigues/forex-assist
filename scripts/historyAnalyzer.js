// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// HISTORY ANALYZER
//
// Responsabilidade:
// Analisar o histórico estatístico do ativo e gerar
// métricas adaptativas utilizadas pelo Scanner.
//
// FASE 05
// ===================================================


// ===================================================
// ANÁLISE DO HISTÓRICO ESTATÍSTICO
// ===================================================

function analisarHistorico(estatisticas) {

    if (!estatisticas) {

        return {

            score: 0,
            status: "SEM_DADOS",
            confiabilidade: 0,
            consistencia: 0,
            pesoHistorico: 0,
            tendenciaRecente: 0,
            confidenceMultiplier: 0

        };

    }

    const operacoes = estatisticas.operacoes || 0;
    const taxa = estatisticas.taxaAcerto || 0;

    const ultimos5 = estatisticas.ultimos5 || [];
    const ultimos10 = estatisticas.ultimos10 || [];

    const confiabilidade = Math.min(
        100,
        Math.round((operacoes / 50) * 100)
    );

    let confidenceMultiplier = 1.0;

if (confiabilidade >= 80) {

    confidenceMultiplier = 1.00;

}

else if (confiabilidade >= 50) {

    confidenceMultiplier = 0.90;

}

else {

    confidenceMultiplier = 0.80;

}

    let score = 0;
    let status = "NEUTRA";

    if (taxa >= 80) {

        score = 10;
        status = "EXCELENTE";

    }

    else if (taxa >= 70) {

        score = 5;
        status = "BOA";

    }

    else if (taxa < 50) {

        score = -10;
        status = "RUIM";

    }

    const winsRecentes =
        ultimos5.filter(op => op.resultado === "WIN").length;

    const lossesRecentes =
        ultimos5.filter(op => op.resultado === "LOSS").length;

    const wins10 =
        ultimos10.filter(op => op.resultado === "WIN").length;

    const losses10 =
        ultimos10.filter(op => op.resultado === "LOSS").length;

    let consistencia = 0;

    if (wins10 >= 8) {

        consistencia = 5;

    }

    else if (wins10 >= 6) {

        consistencia = 3;

    }

    else if (losses10 >= 8) {

        consistencia = -5;

    }

    else if (losses10 >= 6) {

        consistencia = -3;

    }

    score += consistencia;

    let tendenciaRecente = 0;

    if (winsRecentes >= 4) {

        tendenciaRecente = 3;

    }

    else if (lossesRecentes >= 4) {

        tendenciaRecente = -3;

    }

    score += tendenciaRecente;

    const pesoHistorico =
        Math.round(score * confidenceMultiplier);

    return {

        score,
        status,
        confiabilidade,
        consistencia,
        pesoHistorico,
        tendenciaRecente,
        confidenceMultiplier

    };

}


// ===================================================
// ADAPTIVE CONFIDENCE LAYER
// ===================================================

function calcularAdaptiveConfidence(historico) {

    const confidenceMultiplier =
        historico.confidenceMultiplier;

    const pesoHistorico =
    historico.pesoHistorico;

    return {

        confiabilidade:
            historico.confiabilidade,

        confidenceMultiplier,

        pesoHistorico

    };

}


// ===================================================
// EXPORTS
// ===================================================

module.exports = {

    analisarHistorico,

    calcularAdaptiveConfidence

};
