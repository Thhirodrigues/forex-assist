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

// AJUSTE-037 (28/09/2026): tamanho de amostra a partir do qual o
// histórico do par pesa 100% no score - mesmo mínimo de
// OPERACOES_MINIMAS_HISTORICO (statisticsEngine.js) e do gate de
// expectativa (decisionEngine.js, AJUSTE-033), pra não existirem três
// definições diferentes de "histórico suficiente".
const OPERACOES_PESO_CHEIO = 30;

// AJUSTE-037: fração (0 a 1) do peso do histórico, proporcional ao
// tamanho da amostra - 0 operações = 0, 15 = 0,5, 30+ = 1.
function calcularPesoAmostra(operacoes) {

    return Math.min(1, Math.max(0, operacoes) / OPERACOES_PESO_CHEIO);

}

function analisarHistorico(estatisticas) {

    const operacoes = estatisticas?.operacoes || 0;

    // AJUSTE-037 (28/09/2026): antes, "SEM_DADOS" só saía quando
    // `estatisticas` era null - o que nunca acontece na prática
    // (statisticsEngine.js sempre devolve objeto). Par sem NENHUMA
    // operação fechada chegava aqui com taxaAcerto 0 e caía em "RUIM"
    // (taxa < 50) - "não sei" virava "sei que é ruim". Somado às outras
    // camadas (pesoHistorico -8, direção -5, penalidade RUIM -10 e o
    // ×0,8 no score inteiro em marketAnalyzer.js), histórico AUSENTE
    // custava ~30 pontos - o GBP/USD de 27/09 tinha score técnico 74 e
    // saiu com 49. Agora 0 operações = SEM_DADOS de verdade, sem peso
    // de taxa nenhum; só a penalidade leve de amostra em scoreEngine.js
    // (aplicarPenalidadeHistorico) - "par sem histórico só tem
    // pontuação menor", não um veredito.
    if (!estatisticas || operacoes === 0) {

        return {

            score: 0,
            status: "SEM_DADOS",
            confiabilidade: 0,
            consistencia: 0,
            pesoHistorico: 0,
            tendenciaRecente: 0,
            confidenceMultiplier: 0,
            pesoAmostra: 0

        };

    }

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

    // AJUSTE-037: peso proporcional ao tamanho da amostra (antes
    // confidenceMultiplier, que tinha piso de 0,8 - 3 operações pesavam
    // quase o mesmo que 40). 3 LOSS seguidos em 3 operações não são
    // evidência de par ruim; 30 operações a 40% começam a ser.
    const pesoAmostra = calcularPesoAmostra(operacoes);

    const pesoHistorico =
        Math.round(score * pesoAmostra);

    return {

        score,
        status,
        confiabilidade,
        consistencia,
        pesoHistorico,
        tendenciaRecente,
        // AJUSTE-037: mantido só pra exibição/log e compatibilidade com
        // os documentos já salvos - NÃO multiplica mais o score (ver
        // marketAnalyzer.js calcularQualidade).
        confidenceMultiplier,
        pesoAmostra

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

    calcularPesoAmostra,

    OPERACOES_PESO_CHEIO,

    calcularAdaptiveConfidence

};
