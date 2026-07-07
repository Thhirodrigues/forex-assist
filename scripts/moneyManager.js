// ===================================================
// FOREX ASSIST - REAL MONEY INTELLIGENCE
// MONEY MANAGER
//
// Responsabilidade:
// Gestão financeira inteligente para operações reais.
//
// Objetivo:
//
// Transformar uma análise técnica em uma decisão
// financeiramente segura.
//
// A Engine deverá:
//
// • Proteger o capital.
// • Calcular risco.
// • Calcular retorno.
// • Adaptar TP e SL.
// • Adaptar lote.
// • Simular cenários.
// • Sugerir configurações.
//
// FASE 06
// MONEY MANAGEMENT INSTITUCIONAL
// ===================================================



// ===================================================
// CONFIGURAÇÕES PADRÃO
// ===================================================

const DEFAULT_CONFIG = {

    lote: 0.04,

    tpUSD: 5,

    slUSD: 5,

    banca: 1000,

    riscoMaximo: 1.0

};



// ===================================================
// VALOR DO PIP
// ===================================================
//
// Responsável por calcular quanto vale
// um Pip para determinado lote.
//
// Futuramente poderá utilizar:
//
// • Par negociado
// • Cotação atual
// • Conversão automática
//
// ===================================================

function calcularValorPip(

    lote

) {

    return lote * 10;

}



// ===================================================
// TP EM PIPS
// ===================================================

function calcularTP(

    tpUSD,

    valorPip

) {

    return tpUSD / valorPip;

}



// ===================================================
// SL EM PIPS
// ===================================================

function calcularSL(

    slUSD,

    valorPip

) {

    return slUSD / valorPip;

}



// ===================================================
// RISK / REWARD
// ===================================================

function calcularRiskReward(

    tpUSD,

    slUSD

) {

    return tpUSD / slUSD;

}



// ===================================================
// RISCO DA BANCA
// ===================================================

function calcularRiscoPercentual(

    banca,

    slUSD

) {

    return (

        slUSD /

        banca

    ) * 100;

}

// ===================================================
// AVALIAÇÃO DA CONFIGURAÇÃO
// ===================================================

function avaliarConfiguracao(

    configuracao

) {

    const {

        rewardRisk,

        riscoPercentual

    } = configuracao;

    let aprovada = true;

    let motivo = "APROVADA";

    if (rewardRisk < 1) {

        aprovada = false;

        motivo = "RISK_REWARD_INVALIDO";

    }

    if (riscoPercentual > DEFAULT_CONFIG.riscoMaximo) {

        aprovada = false;

        motivo = "RISCO_ELEVADO";

    }

    return {

        aprovada,

        motivo

    };

}



// ===================================================
// SUGESTÃO DE CONFIGURAÇÃO
// ===================================================

function sugerirConfiguracao(

    configuracao

) {

    const sugestao = {

        ...configuracao

    };

    if (

        sugestao.riscoPercentual >

        DEFAULT_CONFIG.riscoMaximo

    ) {

        sugestao.lote =
            Number(

                (sugestao.lote * 0.75)

                .toFixed(2)

            );

    }

    if (

        sugestao.rewardRisk < 1

    ) {

        sugestao.tpUSD =
            Number(

                (sugestao.slUSD * 1.2)

                .toFixed(2)

            );

    }

    return sugestao;

}



// ===================================================
// EXPECTATIVA MATEMÁTICA
// ===================================================

function calcularExpectativa(

    probabilidade,

    tpUSD,

    slUSD

) {

    const perda = 100 - probabilidade;

    return Number(

        (

            (

                probabilidade *

                tpUSD

            ) -

            (

                perda *

                slUSD

            )

        ) / 100

    ).toFixed(2);

}

// ===================================================
// SIMULADOR FINANCEIRO
// ===================================================

function simularOperacao(

    configuracao

) {

    const avaliacao =
        avaliarConfiguracao(
            configuracao
        );

    const sugestao =
        sugerirConfiguracao(
            configuracao
        );

    return {

        configuracaoOriginal:
            configuracao,

        avaliacao,

        sugestao

    };

}



// ===================================================
// RECOMENDAÇÃO OPERACIONAL
// ===================================================

function gerarRecomendacao(

    simulacao

) {

    if (

        simulacao.avaliacao.aprovada

    ) {

        return {

            operar: true,

            mensagem:
                "CONFIGURACAO_APROVADA"

        };

    }

    return {

        operar: false,

        mensagem:
            "UTILIZAR_CONFIGURACAO_SUGERIDA"

    };

}



// ===================================================
// ENGINE FINANCEIRA
// ===================================================

function analisarFinanceiro({

    banca = DEFAULT_CONFIG.banca,

    lote = DEFAULT_CONFIG.lote,

    tpUSD = DEFAULT_CONFIG.tpUSD,

    slUSD = DEFAULT_CONFIG.slUSD,

    probabilidade = 80

}) {

    const valorPip =
        calcularValorPip(
            lote
        );

    const tpPips =
        calcularTP(
            tpUSD,
            valorPip
        );

    const slPips =
        calcularSL(
            slUSD,
            valorPip
        );

    const rewardRisk =
        calcularRiskReward(
            tpUSD,
            slUSD
        );

    const riscoPercentual =
        calcularRiscoPercentual(
            banca,
            slUSD
        );

    const expectativa =
        calcularExpectativa(
            probabilidade,
            tpUSD,
            slUSD
        );

    const configuracao = {

        banca,

        lote,

        tpUSD,

        slUSD,

        tpPips,

        slPips,

        valorPip,

        rewardRisk,

        riscoPercentual,

        expectativa

    };

    const simulacao =
        simularOperacao(
            configuracao
        );

    const recomendacao =
        gerarRecomendacao(
            simulacao
        );

    return {

        ...configuracao,

        configuracaoIdeal:
            simulacao.sugestao,

        avaliacao:
            simulacao.avaliacao,

        recomendacao

    };

}

// ===================================================
// EXPORTS
// ===================================================

module.exports = {

    DEFAULT_CONFIG,

    calcularValorPip,

    calcularTP,

    calcularSL,

    calcularRiskReward,

    calcularRiscoPercentual,

    calcularExpectativa,

    avaliarConfiguracao,

    sugerirConfiguracao,

    simularOperacao,

    gerarRecomendacao,

    analisarFinanceiro

};


