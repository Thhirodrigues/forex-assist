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

    if (score < 45) {

        return {
            status: "REPROVADO"
        };

    }

    if (multi === "DIVERGENTE") {

        return {
            status: "COOLDOWN"
        };

    }

    if (

        qualidade === "LATERAL" ||

        qualidade === "CONFLITO"

    ) {

        return {
            status: "SEM_SINAL"
        };

    }

    if (tendencia === "ALTA") {

        return {
            status: "COMPRA"
        };

    }

    if (tendencia === "BAIXA") {

        return {
            status: "VENDA"
        };

    }

    return {

        status: "SEM_SINAL"

    };

}

module.exports = {

    avaliarOperacao

};
