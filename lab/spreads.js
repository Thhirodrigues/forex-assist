// ===================================================
// FOREX ASSIST - LABORATÓRIO - SPREADS (pips, conta XM Standard)
//
// Fonte: tabela informada pelo usuário em 03/10/2026 (origem: Gemini) - NÃO conferida
// no app da XM (usuário vai conferir). Usado o ponto médio da faixa. NZD/USD e EUR/JPY
// não estavam na tabela: valores abaixo são ESTIMATIVA minha (marcados estimado:true)
// e devem ser trocados quando o usuário conferir. Trocar aqui, num lugar só.
// ===================================================

const SPREADS_PIPS = {
    "EUR/USD": { pips: 1.8,  estimado: false },   // faixa 1,6-2,0
    "GBP/USD": { pips: 2.15, estimado: false },   // 2,0-2,3
    "USD/JPY": { pips: 1.95, estimado: false },   // 1,8-2,1
    "AUD/USD": { pips: 2.05, estimado: false },   // 1,9-2,2
    "USD/CAD": { pips: 2.2,  estimado: false },   // 2,0-2,4
    "USD/CHF": { pips: 2.3,  estimado: false },   // 2,1-2,5
    "EUR/GBP": { pips: 2.45, estimado: false },   // 2,2-2,7
    "GBP/JPY": { pips: 3.15, estimado: false },   // 2,8-3,5
    "NZD/USD": { pips: 2.3,  estimado: true },    // sem dado: parecido com AUD/USD, arredondado p/ cima
    "EUR/JPY": { pips: 2.6,  estimado: true }     // sem dado: entre USD/JPY e GBP/JPY
};

// par desconhecido: usa o pior caso conhecido (errar contra, nunca a favor)
const SPREAD_PADRAO_PIPS = 3.5;

function spreadDoPar(par, multiplicador = 1) {
    const s = SPREADS_PIPS[par];
    return Number(((s ? s.pips : SPREAD_PADRAO_PIPS) * multiplicador).toFixed(3));
}

module.exports = { SPREADS_PIPS, SPREAD_PADRAO_PIPS, spreadDoPar };
