// ===================================================
// FOREX ASSIST - LABORATÓRIO - CONTEXTO DE MERCADO NA ENTRADA (protocolo 6.27; funções puras)
//
// Para cada entrada, o que o MERCADO estava fazendo ATÉ aquele instante (nunca depois):
//   m10  retorno do par nos últimos 2.880 candles de 5 min (~10 dias de mercado)
//   m24  retorno do par nos últimos 288 candles (~24 h de mercado)
//   u24  cesta do dólar: média dos retornos de 24 h dos 7 pares com USD, em termos de dólar (>0 = dólar subiu)
//   vUp / vDn  votos dos OUTROS pares com USD: a análise mais recente (até 30 min antes) com direção implica dólar
//              subindo (vUp) ou caindo (vDn)
// Quem monta os grupos (X5-X8) é nucleo.js (gruposDaEntrada). Candles: {timestamp|ts, close|c}, ordenados.
// ===================================================

const { ladoDolar, direcaoDaAnalise } = require("./nucleo");

const MIN5 = 5 * 60000;
const BARRAS_10D = 2880, BARRAS_24H = 288;
const JANELA_VOTO_MS = 30 * 60000;
const PARES_USD = ["EUR/USD", "GBP/USD", "AUD/USD", "NZD/USD", "USD/JPY", "USD/CAD", "USD/CHF"];
const MIN_PARES_CESTA = 5;

const tsDe = (c) => (c.timestamp !== undefined ? c.timestamp : c.ts);
const fechoDe = (c) => (c.close !== undefined ? c.close : c.c);

// índice do último candle JÁ FECHADO em t (abertura + 5 min <= t); -1 se não houver
function indiceAte(candles, t) {
    let lo = 0, hi = candles.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tsDe(candles[m]) + MIN5 <= t) lo = m + 1; else hi = m; }
    return lo - 1;
}

function retornoJanela(candles, t, barras) {
    if (!candles || !candles.length) return null;
    const i = indiceAte(candles, t);
    if (i - barras < 0) return null;
    const p1 = Number(fechoDe(candles[i])), p0 = Number(fechoDe(candles[i - barras]));
    return Number.isFinite(p1) && Number.isFinite(p0) && p0 > 0 ? p1 / p0 - 1 : null;
}

function cestaUsd24(candlesPorPar, t) {
    const rs = [];
    for (const par of PARES_USD) {
        const r = retornoJanela(candlesPorPar[par], t, BARRAS_24H);
        if (r === null) continue;
        rs.push(ladoDolar(par, "BUY") === "comprado" ? r : -r);   // USD na base: o retorno do par é o do dólar; na cotação: invertido
    }
    return rs.length >= MIN_PARES_CESTA ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
}

// última análise com direção de cada OUTRO par com USD, em (t - 30 min, t]
function votosSinais(analisesPorPar, par, t) {
    let vUp = 0, vDn = 0;
    for (const q of PARES_USD) {
        if (q === par) continue;
        const arr = analisesPorPar[q];
        if (!arr || !arr.length) continue;
        let lo = 0, hi = arr.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].timestamp <= t) lo = m + 1; else hi = m; }
        for (let i = lo - 1; i >= 0 && arr[i].timestamp > t - JANELA_VOTO_MS; i--) {
            const dir = direcaoDaAnalise(arr[i]);
            if (!dir) continue;
            const lado = ladoDolar(q, dir);
            if (lado === "comprado") vUp++; else if (lado === "vendido") vDn++;
            break;   // só a mais recente com direção
        }
    }
    return { vUp, vDn };
}

const arred = (x) => (Number.isFinite(x) ? Number(x.toFixed(5)) : null);

/**
 * @param {object} p
 * @param {Object<string,Array>} p.candlesPorPar    candles de 5 min por par (o próprio par e, se houver, os outros pares USD)
 * @param {Object<string,Array>} p.analisesPorPar   análises por par ordenadas por timestamp (para os votos)
 * @returns {(par:string, t:number)=>object} contexto(par, t) -> { m10, m24, u24, vUp, vDn }
 */
function construirContexto({ candlesPorPar = {}, analisesPorPar = {} }) {
    return (par, t) => {
        const votos = votosSinais(analisesPorPar, par, t);
        return {
            m10: arred(retornoJanela(candlesPorPar[par], t, BARRAS_10D)),
            m24: arred(retornoJanela(candlesPorPar[par], t, BARRAS_24H)),
            u24: arred(cestaUsd24(candlesPorPar, t)),
            vUp: votos.vUp, vDn: votos.vDn
        };
    };
}

// o mínimo que o rotulador/nucleo usam de uma análise (replay: 10 pares x ~25 mil análises não cabem inteiras na memória)
function enxugarAnalise(a) {
    return {
        id: a.id, timestamp: a.timestamp, aprovado: a.aprovado, direcao: a.direcao, tendencia: a.tendencia,
        tpPips: a.tpPips, slPips: a.slPips, precoEntrada: a.precoEntrada, perfilResolvido: a.perfilResolvido, score: a.score,
        lote: a.lote, candlestickDetectado: a.candlestickDetectado, smcDetectado: a.smcDetectado,
        indicadores: { adx: a.indicadores?.adx ?? null, rsi: a.indicadores?.rsi ?? null, atr: a.indicadores?.atr ?? null }
    };
}

module.exports = { construirContexto, retornoJanela, cestaUsd24, votosSinais, indiceAte, enxugarAnalise, PARES_USD, BARRAS_10D, BARRAS_24H };
