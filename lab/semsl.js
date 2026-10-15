// ===================================================
// FOREX ASSIST - LABORATÓRIO - "TP SEM SL" (pré-registro 6.31; funções puras, sem I/O)
//
// Mesmas regras do `simulador.js` (candle de 5 min que toca alvo e stop = pior caso; spread desloca as
// barreiras contra a posição; entrada no primeiro candle com abertura >= horário da análise), mas:
//  - stopMult = Infinity  -> NÃO existe stop (só TP);
//  - stopMult = 3 ou 5    -> stop LARGO de N x o TP;
//  - diasMax              -> prazo em "dias de mercado" (1 dia = 288 candles de 5 min = 24 h de candles existentes);
//                            passado o prazo, fecha a mercado no OPEN do candle seguinte (perda/ganho realizado);
//  - MAE                  -> pior excursão contra a posição (pips, líquida do spread), até o fechamento inclusive.
// Swap: modelo (diferencial das taxas de política do BIS menos markup), por noite que cruza 21:00 UTC; quarta x3.
// Nada aqui lê/grava banco, nem chama API, nem toca no sinal oficial.
// ===================================================

const { fatorPip } = require("./simulador");
const { taxaEm } = require("./taxas");

const CINCO_MIN = 5 * 60 * 1000;
const CANDLES_POR_DIA = 288;
const ROLLOVER_UTC_H = 21;
const MAX_CANDLES = 15000;   // ~52 dias de mercado: teto de acompanhamento (o que passar disso fica ABERTA, marcada a mercado)

// Noites cobradas entre t0 e t1 (ms): cada cruzamento de 21:00 UTC; o de quarta para quinta conta 3 (convenção de swap de FX).
function noitesCobradas(t0, t1) {
    if (!(t1 > t0)) return 0;
    let n = 0;
    const d0 = new Date(t0);
    let r = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate(), ROLLOVER_UTC_H);
    if (r <= t0) r += 86400000;
    for (; r < t1; r += 86400000) n += new Date(r).getUTCDay() === 3 ? 3 : 1;   // 3 = quarta
    return n;
}

const PARTES = (par) => String(par).split("/");

// Swap em pips (negativo = custo) de ficar de t0 a t1. `markupPp` = margem da corretora (pontos percentuais a.a.).
// diferencial(compra) = taxa_base - taxa_cotada; venda = o oposto. Sem taxas -> só o markup (errar contra).
function swapPips({ par, direcao, preco, t0, t1, taxas, markupPp }) {
    const noites = noitesCobradas(t0, t1);
    if (!noites) return 0;
    const [base, cot] = PARTES(par);
    let dif = 0;
    if (taxas && taxas[base] && taxas[cot]) {
        const rb = taxaEm(taxas[base], t0), rq = taxaEm(taxas[cot], t0);
        if (rb != null && rq != null) dif = (direcao === "BUY" ? 1 : -1) * (rb - rq);
    }
    const pctAno = dif - markupPp;                          // % a.a. sobre o nocional
    const fracPreco = (pctAno / 100) * (noites / 365);      // variação equivalente de preço
    return Number(((preco * fracPreco) * fatorPip(par)).toFixed(2));
}

/**
 * @param {object} p
 * @param {string} p.par
 * @param {"BUY"|"SELL"} p.direcao
 * @param {number} p.tEntrada
 * @param {number} p.precoEntrada
 * @param {number} p.tpPips
 * @param {number} [p.spreadPips=0]
 * @param {number} [p.stopMult=Infinity]   stop = stopMult x tpPips; Infinity = sem stop
 * @param {number} [p.slPips]              stop em pips (substitui stopMult; usado na V0 = TP/SL atual do app)
 * @param {number} [p.diasMax]             prazo em dias de mercado; omitido = sem prazo
 * @param {boolean} [p.inverter]           direção oposta (controle ALEATORIO)
 * @param {Array<{timestamp,open,high,low,close}>} p.candles  ordenados
 * @param {number} [p.maxCandles]          teto de candles acompanhados (padrão 15000)
 * @returns {{resultado:"WIN"|"STOP"|"TEMPO"|"ABERTA"|"INVALIDA", pips?, mae?, tFechamento?, duracaoMin?, entrada?, ambiguo?}}
 *   ABERTA devolve pips MARCADOS a mercado no último candle e tFechamento = fim desse candle
 */
function simularSemSL(p) {
    const { par, direcao, tEntrada, tpPips, candles } = p;
    const s = Number(p.spreadPips) || 0;
    const stopMult = p.stopMult === undefined ? Infinity : p.stopMult;
    if (direcao !== "BUY" && direcao !== "SELL") return { resultado: "INVALIDA", motivo: "direcao" };
    if (!(tpPips > 0)) return { resultado: "INVALIDA", motivo: "tp" };
    const slPips = p.slPips !== undefined ? Number(p.slPips) : stopMult * tpPips;   // V0 usa o stop REAL da entrada
    if (Number.isFinite(slPips) && !(slPips > s)) return { resultado: "INVALIDA", motivo: "spread>=sl" };

    const dir = (direcao === "BUY" ? 1 : -1) * (p.inverter ? -1 : 1);
    const pip = 1 / fatorPip(par);
    const entrada = Number(p.precoEntrada);
    if (!Number.isFinite(entrada)) return { resultado: "INVALIDA", motivo: "entrada" };
    // início = primeiro candle com abertura >= horário da análise (busca binária; sem copiar o array)
    let lo = 0, hi = candles.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (candles[m].timestamp < tEntrada) lo = m + 1; else hi = m; }
    if (lo >= candles.length) return { resultado: "ABERTA", mae: 0 };
    const fimIdx = Math.min(candles.length, lo + (p.maxCandles || MAX_CANDLES));

    const alvo = entrada + dir * (tpPips + s) * pip;
    const stop = Number.isFinite(slPips) ? entrada - dir * (slPips - s) * pip : null;
    const liquido = (preco) => Number(((dir * (preco - entrada)) / pip - s).toFixed(2));
    const piorPips = (c) => Number(((dir === 1 ? entrada - c.low : c.high - entrada) / pip + s).toFixed(2));
    const pronto = (resultado, pips, t, mae, extra = {}) => ({
        resultado, pips, mae: Math.max(0, mae), tFechamento: t, duracaoMin: Math.round((t - tEntrada) / 60000), entrada, ...extra
    });

    let mae = 0;
    for (let i = lo; i < fimIdx; i++) {
        const c = candles[i];
        if (p.diasMax && i - lo >= p.diasMax * CANDLES_POR_DIA) {
            return pronto("TEMPO", liquido(c.open), c.timestamp, mae);
        }
        const tocouAlvo = dir === 1 ? c.high >= alvo : c.low <= alvo;
        const tocouStop = stop !== null && (dir === 1 ? c.low <= stop : c.high >= stop);
        mae = Math.max(mae, piorPips(c));
        if (tocouStop) return pronto("STOP", -slPips, c.timestamp + CINCO_MIN, Math.max(mae, slPips), { ambiguo: tocouAlvo });
        if (tocouAlvo) return pronto("WIN", tpPips, c.timestamp + CINCO_MIN, mae);
    }
    // sem desfecho até onde há dados (ou até MAX_CANDLES): resultado marcado a mercado no último close, tratado como ABERTA
    const ult = candles[fimIdx - 1];
    return pronto("ABERTA", liquido(ult.close), ult.timestamp + CINCO_MIN, mae);
}

// Variantes do protocolo 6.31
const VARIANTES_SEMSL = [
    { id: "V0_ATUAL", stopMult: 1 },
    { id: "V1_TP_T3", stopMult: Infinity, diasMax: 3 },
    { id: "V2_TP_T5", stopMult: Infinity, diasMax: 5 },
    { id: "V3_TP_T10", stopMult: Infinity, diasMax: 10 },
    { id: "V4_SL_3X", stopMult: 3 },
    { id: "V5_SL_5X", stopMult: 5 }
];

module.exports = { simularSemSL, noitesCobradas, swapPips, VARIANTES_SEMSL, CANDLES_POR_DIA };
