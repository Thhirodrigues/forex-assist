// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// POSITION SIZING ENGINE
//
// Responsabilidade:
//
// Calcular automaticamente a melhor configuração
// financeira para cada operação.
//
// Este módulo é responsável por:
//
// • Avaliar o risco da operação;
//
// • Calcular o Position Sizing;
//
// • Definir lote recomendado;
//
// • Ajustar automaticamente TP e SL;
//
// • Calcular Risk/Reward;
//
// • Calcular Expectativa Matemática;
//
// • Validar exposição financeira;
//
// • Sugerir configurações mais conservadoras;
//
// • Proteger o capital do operador;
//
// • Preparar o sistema para operações
//   utilizando dinheiro real.
//
// Este módulo NÃO decide COMPRA ou VENDA.
// Sua responsabilidade é apenas validar se a
// operação vale financeiramente a pena.
//
// FASE 06
// Sprint 03
// ===================================================

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

// ===================================================
// EXPECTATIVA MATEMÁTICA
// ===================================================

function calcularExpectativa(

    taxaAcerto,
    tp,
    sl

) {

    const win = taxaAcerto / 100;

    const loss = 1 - win;

    const expectativa =

        (win * tp)

        -

        (loss * sl);

    return Number(

        expectativa.toFixed(2)

    );

}

// ===================================================
// RISCO POR OPERAÇÃO
// ===================================================

function calcularRiscoOperacao(

    banca,
    lote,
    stopLossUSD

) {

    const riscoPercentual =

        calcularRisco(

            banca,

            stopLossUSD

        );

    let classificacao = "ACEITÁVEL";

    if (

        riscoPercentual >=
        POSITION_CONFIG.RISCO_MAXIMO

    ) {

        classificacao = "ALTO";

    }

    else if (

        riscoPercentual <= 1

    ) {

        classificacao = "BAIXO";

    }

    return {

        lote,

        stopLossUSD,

        riscoPercentual,

        classificacao

    };

}

// ===================================================
// SUGESTÃO DE LOTE
// ===================================================

function sugerirLote(

    score,

    atr,

    confiabilidade,

    taxaAcerto,

    loteAtual

) {

    let lote = loteAtual;

    let motivo = "MANTER_LOTE";

    // ===================================================
    // MERCADO FRACO
    // ===================================================

    if (

        score < POSITION_CONFIG.SCORE_MINIMO

    ) {

        lote = Number(

            (loteAtual * 0.50)

            .toFixed(2)

        );

        motivo = "SCORE_BAIXO";

    }

    // ===================================================
    // HISTÓRICO FRACO
    // ===================================================

    else if (

        taxaAcerto < 60

    ) {

        lote = Number(

            (loteAtual * 0.75)

            .toFixed(2)

        );

        motivo = "HISTORICO_FRACO";

    }

    // ===================================================
    // BAIXA CONFIANÇA
    // ===================================================

    else if (

        confiabilidade < 70

    ) {

        lote = Number(

            (loteAtual * 0.75)

            .toFixed(2)

        );

        motivo = "CONFIANCA_BAIXA";

    }

    // ===================================================
    // BAIXA VOLATILIDADE
    // ===================================================

    else if (

        atr < 0.0012

    ) {

        lote = Number(

            (loteAtual * 0.75)

            .toFixed(2)

        );

        motivo = "ATR_BAIXO";

    }

    // ===================================================
    // CENÁRIO EXCELENTE
    // ===================================================

    else if (

        score >= POSITION_CONFIG.SCORE_EXCELENTE &&

        taxaAcerto >= 80 &&

        confiabilidade >= 90 &&

        atr >= 0.0020

    ) {

        lote = Number(

            (loteAtual * 1.25)

            .toFixed(2)

        );

        motivo = "CENARIO_EXCELENTE";

    }

    return {

        lote,

        motivo

    };

        }
// ===================================================
// SUGESTÃO DE TAKE PROFIT (TP)
// ===================================================

function sugerirTP(

    tpAtual,

    atr,

    score,

    expectativa

) {

    let tp = tpAtual;

    let motivo = "MANTER_TP";

    // ===================================================
    // VOLATILIDADE BAIXA
    // ===================================================

    if (

        atr < 0.0012

    ) {

        tp = Number(

            (tpAtual * 0.80)

            .toFixed(2)

        );

        motivo = "ATR_BAIXO";

    }

    // ===================================================
    // EXPECTATIVA NEGATIVA
    // ===================================================

    else if (

        expectativa <= 0

    ) {

        tp = Number(

            (tpAtual * 0.75)

            .toFixed(2)

        );

        motivo = "EXPECTATIVA_NEGATIVA";

    }

    // ===================================================
    // SCORE MUITO ALTO
    // ===================================================

    else if (

        score >= POSITION_CONFIG.SCORE_EXCELENTE &&

        atr >= 0.0020

    ) {

        tp = Number(

            (tpAtual * 1.20)

            .toFixed(2)

        );

        motivo = "CENARIO_EXCELENTE";

    }

    return {

        tp,

        motivo

    };

}

// ===================================================
// SUGESTÃO DE STOP LOSS (SL)
// ===================================================

function sugerirSL(

    slAtual,

    atr,

    score,

    riscoPercentual

) {

    let sl = slAtual;

    let motivo = "MANTER_SL";

    // ===================================================
    // RISCO ELEVADO
    // ===================================================

    if (

        riscoPercentual >

        POSITION_CONFIG.RISCO_MAXIMO

    ) {

        sl = Number(

            (slAtual * 0.80)

            .toFixed(2)

        );

        motivo = "RISCO_ELEVADO";

    }

    // ===================================================
    // BAIXA VOLATILIDADE
    // ===================================================

    else if (

        atr < 0.0012

    ) {

        sl = Number(

            (slAtual * 0.85)

            .toFixed(2)

        );

        motivo = "ATR_BAIXO";

    }

    // ===================================================
    // CENÁRIO MUITO FAVORÁVEL
    // ===================================================

    else if (

        score >= POSITION_CONFIG.SCORE_EXCELENTE &&

        atr >= 0.0020 &&

        riscoPercentual < 1

    ) {

        sl = Number(

            (slAtual * 1.10)

            .toFixed(2)

        );

        motivo = "MERCADO_FORTE";

    }

    return {

        sl,

        motivo

    };

}

// ===================================================
// CONFIGURAÇÃO IDEAL
// ===================================================

function configurarOperacao(

    banca,

    score,

    atr,

    confiabilidade,

    taxaAcerto,

    loteAtual,

    tpAtual,

    slAtual

) {

    const expectativa =
        calcularExpectativa(

            taxaAcerto,

            tpAtual,

            slAtual

        );

    const lote =
        sugerirLote(

            score,

            atr,

            confiabilidade,

            taxaAcerto,

            loteAtual

        );

    const risco =
        calcularRiscoOperacao(

            banca,

            lote.lote,

            slAtual

        );

    const tp =
        sugerirTP(

            tpAtual,

            atr,

            score,

            expectativa

        );

    const sl =
        sugerirSL(

            slAtual,

            atr,

            score,

            risco.riscoPercentual

        );

    return {

        lote: lote.lote,

        tp: tp.tp,

        sl: sl.sl,

        risco: risco.riscoPercentual,

        expectativa,

        motivoLote: lote.motivo,

        motivoTP: tp.motivo,

        motivoSL: sl.motivo

    };

}

// ===================================================
// CLASSIFICAÇÃO FINAL
// ===================================================

function classificarOperacao(

    configuracao

) {

    let status = "APROVADA";

    let observacao = "CONFIGURACAO_IDEAL";

    // ===================================================
    // EXPECTATIVA NEGATIVA
    // ===================================================

    if (

        configuracao.expectativa <= 0

    ) {

        status = "REPROVADA";

        observacao = "EXPECTATIVA_NEGATIVA";

    }

    // ===================================================
    // RISCO ACIMA DO LIMITE
    // ===================================================

    else if (

        configuracao.risco >

        POSITION_CONFIG.RISCO_MAXIMO

    ) {

        status = "REDUZIR_RISCO";

        observacao = "RISCO_ELEVADO";

    }

    // ===================================================
    // LOTE REDUZIDO
    // ===================================================

    else if (

        configuracao.lote <

        POSITION_CONFIG.LOTE_PADRAO

    ) {

        status = "CONSERVADORA";

        observacao = "LOTE_REDUZIDO";

    }

    // ===================================================
    // CENÁRIO FAVORÁVEL
    // ===================================================

    else if (

        configuracao.lote >

        POSITION_CONFIG.LOTE_PADRAO

    ) {

        status = "AGRESSIVA";

        observacao = "CENARIO_EXCELENTE";

    }

    return {

        status,

        observacao

    };

        }

// ===================================================
// EXPORTS
// ===================================================

module.exports = {

    calcularRisco,

    calcularExpectativa,

    calcularRiscoOperacao,

    sugerirLote,

    sugerirTP,

    sugerirSL,

    configurarOperacao,

    classificarOperacao,

};
