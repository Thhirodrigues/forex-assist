// ===================================================
// FOREX ASSIST - SPREAD QUE O APP APLICA AO JULGAR TP/SL (AJUSTE-117, 23/11/2026)
//
// Pedido do usuário: "colocar um spread de médio pra alto no app, levando em conta que na XM temos o valor real".
// Valor por par = MÉDIA do spread real das velas M5 da XM (10 pares, 05/10 a 20/11/2026; spread_pontos / 10 para 5 e 3 casas), que fica
// entre a mediana e os picos do rollover ("médio para alto"). Medianas: EUR/USD 1,9; GBP/USD 2,0; USD/JPY 2,0; AUD/USD 2,3; USD/CHF 2,4;
// EUR/GBP 2,4; EUR/JPY 2,6; USD/CAD 2,7; NZD/USD 2,8; GBP/JPY 3,0 (pips).
//
// COMO ENTRA (js/checker.js): o preço do app é médio; na XM a COMPRA entra no ask e sai no bid, a VENDA entra no bid e sai no ask. O efeito
// líquido é o do simulador do Laboratório (regra 2): o TP só vale depois de andar tp + spread e o SL dispara depois de andar sl - spread.
// O valor GRAVADO continua o do alvo (+TP / -SL em US$): na XM o líquido também é exatamente +TP / -SL, porque o spread já está dentro
// do preço de entrada. Cada sinal fechado passa a levar `spreadAplicadoPips`: quem mede resultado NÃO deve descontar o spread de novo
// nesses sinais (ver registro() em scripts/relatorio/analise400.js e metricas() em scripts/marco/regra625.js).
// Desligar: SPREAD_APP_ATIVO = false (volta ao julgamento sem spread; os sinais já gravados não mudam).
// ===================================================
const SPREAD_APP_ATIVO = true;
const SPREAD_APP_PIPS = {
    "EUR/USD": 2.0, "GBP/USD": 2.3, "USD/JPY": 2.3, "AUD/USD": 2.4, "USD/CAD": 3.0,
    "USD/CHF": 2.9, "NZD/USD": 2.9, "EUR/GBP": 2.6, "EUR/JPY": 2.9, "GBP/JPY": 3.8
};
const SPREAD_APP_PADRAO = 3.8;       // par desconhecido: o pior caso conhecido (errar contra)

function spreadAppDoPar(par) {
    if (!SPREAD_APP_ATIVO) return 0;
    const v = SPREAD_APP_PIPS[par];
    return Number.isFinite(v) ? v : SPREAD_APP_PADRAO;
}

module.exports = { SPREAD_APP_ATIVO, SPREAD_APP_PIPS, SPREAD_APP_PADRAO, spreadAppDoPar };
