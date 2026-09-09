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
// PERFIL FINANCEIRO
// ===================================================

const PERFIL_FINANCEIRO = {

    CONSERVADOR: {

        riscoPorOperacao: 1,

        riscoDiario: 3,

        perdasConsecutivas: 3,

        rrMinimo: 1.2,

        expectativaMinima: 0

    },

    BALANCEADO: {

        riscoPorOperacao: 2,

        riscoDiario: 5,

        perdasConsecutivas: 4,

        rrMinimo: 1.0,

        expectativaMinima: 0

    },

    AGRESSIVO: {

        riscoPorOperacao: 3,

        riscoDiario: 8,

        perdasConsecutivas: 5,

        rrMinimo: 1.0,

        expectativaMinima: -1

    }

};

// ===================================================
// OBTÉM PERFIL FINANCEIRO
// ===================================================

function obterPerfilFinanceiro(

    perfil = "CONSERVADOR"

) {

    return (

        PERFIL_FINANCEIRO[perfil]

        ||

        PERFIL_FINANCEIRO.CONSERVADOR

    );

}

// ===================================================
// VALIDAÇÃO DO PERFIL FINANCEIRO
// ===================================================

function validarPerfilFinanceiro(

    configuracao,

    perfil

) {

    const regras = obterPerfilFinanceiro(

        perfil

    );

    let aprovado = true;

    const motivos = [];

    if (

        configuracao.riscoMaximo >

        regras.riscoPorOperacao

    ) {

        aprovado = false;

        motivos.push(

            "RISCO_ACIMA_DO_PERMITIDO"

        );

    }

    if (

        configuracao.tpUSD /

        configuracao.slUSD

        <

        regras.rrMinimo

    ) {

        aprovado = false;

        motivos.push(

            "RISK_REWARD_INSUFICIENTE"

        );

    }

    return {

        aprovado,

        motivos,

        regras

    };

}

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
// POSITION SIZING ENGINE
// ===================================================

const {

    configurarOperacao,

    classificarOperacao

} = require("./positionSizing");

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

// BUG-021 (09/09/2026): usava DEFAULT_CONFIG.riscoMaximo (1.0% fixo) e
// rewardRisk < 1 fixo, ignorando o perfil (CONSERVADOR/BALANCEADO/
// AGRESSIVO) - PERFIL_FINANCEIRO define riscoPorOperacao/rrMinimo
// diferentes por perfil (1%/2%/3%), mas essa função, que é a que
// REALMENTE bloqueia o sinal (via financeiro.recomendacao ->
// decisionEngine.js's avaliarOperacao), sempre aplicava o teto do
// Conservador pra qualquer perfil. validarPerfilFinanceiro() já fazia
// a conta certa, por perfil, mas nunca era lida por ninguém (campo
// morto). Agora as duas usam a mesma fonte de regras.
function avaliarConfiguracao(

    configuracao,

    perfil = "CONSERVADOR"

) {

    const {

        rewardRisk,

        riscoPercentual

    } = configuracao;

    const regras = obterPerfilFinanceiro(perfil);

    let aprovada = true;

    let motivo = "APROVADA";

    if (rewardRisk < regras.rrMinimo) {

        aprovada = false;

        motivo = "RISK_REWARD_INVALIDO";

    }

    if (riscoPercentual > regras.riscoPorOperacao) {

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

    configuracao,

    perfil = "CONSERVADOR"

) {

    const sugestao = {

        ...configuracao

    };

    const regras = obterPerfilFinanceiro(perfil);

    if (

        sugestao.riscoPercentual >

        regras.riscoPorOperacao

    ) {

        sugestao.lote =
            Number(

                (sugestao.lote * 0.75)

                .toFixed(2)

            );

    }

    if (

        sugestao.rewardRisk < regras.rrMinimo

    ) {

        sugestao.tpUSD =
            Number(

                (sugestao.slUSD * Math.max(regras.rrMinimo, 1.2))

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
// ENGINE DE DECISÃO FINANCEIRA
// ===================================================
//
// Responsabilidade:
//
// Decidir automaticamente se:
//
// • Mantém configuração.
// • Reduz lote.
// • Aumenta TP.
// • Reduz TP.
// • Não operar.
//
// Baseado em:
//
// • Score
// • ADX
// • ATR
// • Histórico
// • Assertividade
// • Expectativa
//
// ===================================================

function decidirConfiguracaoMercado({

    score,

    adx,

    atr,

    expectativa,

    lote,

    tpUSD,

    slUSD

}) {

    let configuracao = {

        lote,

        tpUSD,

        slUSD,

        risco: "NORMAL",

        decisao: "MANTER"

    };

    // BUG-021 (09/09/2026): "score" aqui recebe estatisticas.resumo.
    // taxaAcerto (taxa de acerto HISTÓRICA do par, 0-100), não a
    // qualidade de mercado do sinal atual - nome enganoso herdado de
    // quando as funções deste arquivo foram separadas. Taxa de acerto
    // real em Forex bater 80% é raríssimo (pares reais ficam na faixa
    // de 30-50%), então "if (score < 80) return" disparava quase
    // sempre e ISSO SAÍA ANTES de qualquer ajuste por ADX/ATR/
    // expectativa abaixo - lote/TP/SL saíam sempre iguais ao valor
    // bruto do Config, nunca ajustados. E o motivo dessa saída
    // (decisao/risco aqui) nunca era lido por ninguém pra bloquear o
    // sinal de verdade (quem bloqueia é avaliarConfiguracao(), já
    // corrigida acima pra usar o perfil certo) - ou seja, essa saída
    // antecipada não protegia nada, só desligava o próprio ajuste que
    // deveria fazer. Removida: os ajustes abaixo agora sempre rodam,
    // baseados nas condições reais do mercado no momento do sinal.
    // Taxa de acerto baixa continua registrada, só que como aviso
    // informativo, não mais como bloqueio da lógica de ajuste.
    if (score < 80) {

        configuracao.risco = "HISTORICO_FRACO";

    }

    if (adx < 20) {

        configuracao.lote = 0.02;

        configuracao.tpUSD = 3;

        configuracao.slUSD = 3;

        configuracao.risco = "ALTO";

        configuracao.decisao = "REDUZIR_EXPOSICAO";
    }

    if (atr < 0.0012) {

        configuracao.tpUSD = 3;

        configuracao.slUSD = 3;

        configuracao.decisao = "MERCADO_LENTO";
    }

    if (expectativa < 0) {

        configuracao.lote = 0.02;

        configuracao.decisao = "EXPECTATIVA_NEGATIVA";
    }

    return configuracao;

}

// ===================================================
// SIMULADOR FINANCEIRO
// ===================================================

function simularOperacao(

    configuracao,

    perfil = "CONSERVADOR"

) {

    const avaliacao =
        avaliarConfiguracao(
            configuracao,
            perfil
        );

    const sugestao =
        sugerirConfiguracao(
            configuracao,
            perfil
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

    probabilidade = 80,

adx = 25,

atr = 0.0015,

perfil = "CONSERVADOR"

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

// ===================================================
// DECISÃO FINANCEIRA DO MERCADO
// ===================================================

const decisaoMercado =
    decidirConfiguracaoMercado({

        score: probabilidade,

        adx,

        atr,

        expectativa,

        lote,

        tpUSD,

        slUSD

    });
    
    const configuracao = {

        banca,

        lote: decisaoMercado.lote,

        tpUSD: decisaoMercado.tpUSD,

        slUSD: decisaoMercado.slUSD,

        tpPips,

        slPips,

        valorPip,

        rewardRisk,

        riscoPercentual,

        expectativa

    };

    const validacaoPerfil =

    validarPerfilFinanceiro(

        configuracao,

        perfil

    );
    
    const simulacao =
        simularOperacao(
            configuracao,
            perfil
        );

    const recomendacao =
        gerarRecomendacao(
            simulacao
        );

// ===================================================
// POSITION SIZING
// ===================================================

const positionSizing =

    configurarOperacao(

        banca,

        probabilidade,

        0,

        100,

        probabilidade,

        lote,

        tpUSD,

        slUSD

    );

const classificacaoFinanceira =

    classificarOperacao(

        positionSizing

    );

    return {

        ...configuracao,

        decisaoMercado,

        perfil,

        validacaoPerfil,

        configuracaoIdeal:
    simulacao.sugestao,

         avaliacao:
    simulacao.avaliacao,

        positionSizing,

        classificacaoFinanceira,

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


