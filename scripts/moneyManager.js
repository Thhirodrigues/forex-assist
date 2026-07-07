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
