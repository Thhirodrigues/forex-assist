// ===================================================
// FOREX ASSIST - LABORATÓRIO - FAMÍLIAS DE SINAL (pré-registradas em DOCUMENTACAO/LABORATORIO-E-ANALISES.md 6.18)
//
// Regras clássicas e SIMPLES, independentes do pipeline do app, com parâmetros FIXOS (convenção, sem ajuste):
//  F1 rompimento da faixa asiática | F2 reversão por RSI extremo | F3 tendência de 1h + pullback | F4 momentum de 1h
//  C0 controle aleatório. Funções puras: recebem candles {ts,o,h,l,c} (5 min, só horário de mercado) e devolvem sinais.
// NÃO alterar parâmetros depois de ver resultado: isso vira família nova, com novo registro.
// ===================================================

const { paridadeDoId } = require("./nucleo");
const { simularOperacao } = require("./simulador");

const CINCO = 300000, HORA = 3600000, DIA = 86400000;

function emaSerie(valores, periodo) {
    const k = 2 / (periodo + 1);
    const out = new Array(valores.length);
    let e = valores[0];
    for (let i = 0; i < valores.length; i++) { e = i === 0 ? valores[0] : valores[i] * k + e * (1 - k); out[i] = e; }
    return out;
}

// RSI de Wilder (período 14 por padrão); posições iniciais = null
function rsiSerie(fechamentos, periodo = 14) {
    const out = new Array(fechamentos.length).fill(null);
    if (fechamentos.length <= periodo) return out;
    let ganho = 0, perda = 0;
    for (let i = 1; i <= periodo; i++) { const d = fechamentos[i] - fechamentos[i - 1]; if (d >= 0) ganho += d; else perda -= d; }
    ganho /= periodo; perda /= periodo;
    out[periodo] = perda === 0 ? 100 : 100 - 100 / (1 + ganho / perda);
    for (let i = periodo + 1; i < fechamentos.length; i++) {
        const d = fechamentos[i] - fechamentos[i - 1];
        ganho = (ganho * (periodo - 1) + (d > 0 ? d : 0)) / periodo;
        perda = (perda * (periodo - 1) + (d < 0 ? -d : 0)) / periodo;
        out[i] = perda === 0 ? 100 : 100 - 100 / (1 + ganho / perda);
    }
    return out;
}

const sinal = (c, i, direcao) => ({ i, ts: c[i].ts + CINCO, direcao, preco: c[i].c });

// F1: faixa 00:00-07:00 UTC; entre 07:00 e 12:00 o PRIMEIRO fechamento fora da faixa; 1 por dia
function sinaisF1(c) {
    const out = [];
    const porDia = new Map();
    c.forEach((x, i) => { const d = Math.floor(x.ts / DIA); if (!porDia.has(d)) porDia.set(d, []); porDia.get(d).push(i); });
    for (const [d, idx] of porDia) {
        const base = d * DIA;
        const asia = idx.filter(i => c[i].ts >= base && c[i].ts < base + 7 * HORA);
        if (asia.length < 60) continue;
        const maxA = Math.max(...asia.map(i => c[i].h)), minA = Math.min(...asia.map(i => c[i].l));
        for (const i of idx) {
            if (c[i].ts < base + 7 * HORA || c[i].ts >= base + 12 * HORA) continue;
            if (c[i].c > maxA) { out.push(sinal(c, i, "BUY")); break; }
            if (c[i].c < minA) { out.push(sinal(c, i, "SELL")); break; }
        }
    }
    return out;
}

// F2: RSI(14) cruza para <= 30 (compra) ou >= 70 (venda)
function sinaisF2(c) {
    const r = rsiSerie(c.map(x => x.c), 14);
    const out = [];
    for (let i = 15; i < c.length; i++) {
        if (r[i] === null || r[i - 1] === null) continue;
        if (r[i] <= 30 && r[i - 1] > 30) out.push(sinal(c, i, "BUY"));
        else if (r[i] >= 70 && r[i - 1] < 70) out.push(sinal(c, i, "SELL"));
    }
    return out;
}

// agrega 5 min em horas COMPLETAS (12 barras): [{fim, c}]
function horas(c) {
    const m = new Map();
    c.forEach(x => { const h = Math.floor(x.ts / HORA); if (!m.has(h)) m.set(h, []); m.get(h).push(x); });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).filter(([, l]) => l.length === 12).map(([h, l]) => ({ fim: (h + 1) * HORA, c: l[l.length - 1].c }));
}

// F3: tendência 1h (EMA20 > EMA50 das horas completas) + cruzamento do fechamento sobre a EMA21 de 5 min
function sinaisF3(c) {
    const hs = horas(c);
    if (hs.length < 60) return [];
    const e20 = emaSerie(hs.map(h => h.c), 20), e50 = emaSerie(hs.map(h => h.c), 50);
    const e21 = emaSerie(c.map(x => x.c), 21);
    const out = [];
    let j = -1;   // última hora completa já fechada no instante do candle
    for (let i = 1; i < c.length; i++) {
        const t = c[i].ts + CINCO;
        while (j + 1 < hs.length && hs[j + 1].fim <= t) j++;
        if (j < 50) continue;
        const alta = e20[j] > e50[j], baixa = e20[j] < e50[j];
        if (alta && c[i].c > e21[i] && c[i - 1].c <= e21[i - 1]) out.push(sinal(c, i, "BUY"));
        else if (baixa && c[i].c < e21[i] && c[i - 1].c >= e21[i - 1]) out.push(sinal(c, i, "SELL"));
    }
    return out;
}

// F4: no fechamento de cada hora cheia, direção do retorno das últimas 12 barras
function sinaisF4(c) {
    const out = [];
    for (let i = 12; i < c.length; i++) {
        if ((c[i].ts + CINCO) % HORA !== 0) continue;
        const ret = c[i].c - c[i - 12].c;
        if (ret > 0) out.push(sinal(c, i, "BUY")); else if (ret < 0) out.push(sinal(c, i, "SELL"));
    }
    return out;
}

// C0: direção sorteada (determinística) a cada 15 min
function sinaisC0(c, par) {
    const out = [];
    for (let i = 0; i < c.length; i++) {
        if ((c[i].ts + CINCO) % (3 * CINCO) !== 0) continue;
        out.push(sinal(c, i, paridadeDoId(`${par}_${c[i].ts}`) ? "BUY" : "SELL"));
    }
    return out;
}

const FAMILIAS = {
    F1: { nome: "Rompimento da faixa asiática", gerar: sinaisF1 },
    F2: { nome: "Reversão por RSI extremo", gerar: sinaisF2 },
    F3: { nome: "Tendência 1h + pullback", gerar: sinaisF3 },
    F4: { nome: "Momentum de 1h", gerar: sinaisF4 },
    C0: { nome: "Controle aleatório", gerar: (c, par) => sinaisC0(c, par) }
};

/**
 * Aplica o bloqueio do oficial (uma posição por par: >= cooldown e até FECHAR, "como o app mede") e devolve
 * análises no formato de `analises` (todas aprovadas), prontas para o núcleo do laboratório.
 */
function sinaisParaAnalises({ par, c5, sinais, barreiraPips, cooldownMin = 30 }) {
    const out = [];
    let bloqueadoAte = 0;
    for (const s of sinais) {
        if (s.ts < bloqueadoAte) continue;
        const r = simularOperacao({
            par, direcao: s.direcao, tEntrada: s.ts, precoEntrada: s.preco, tpPips: barreiraPips, slPips: barreiraPips, spreadPips: 0,
            candles: c5.slice(s.i + 1, s.i + 1 + 4000).map(x => ({ timestamp: x.ts, open: x.o, high: x.h, low: x.l, close: x.c }))   // janela de ~14 dias de mercado (igual ao núcleo)
        });
        bloqueadoAte = Math.max(s.ts + cooldownMin * 60000, r.resultado === "ABERTA" ? Infinity : r.tFechamento);
        out.push({
            id: `${s.ts}_${par.replace("/", "_")}`, timestamp: s.ts, par, aprovado: true, direcao: s.direcao, tendencia: null,
            precoEntrada: s.preco, tpPips: barreiraPips, slPips: barreiraPips, perfilResolvido: "FAMILIA", score: null,
            indicadores: { adx: null, rsi: null, atr: null }
        });
    }
    return out;
}

module.exports = { FAMILIAS, emaSerie, rsiSerie, sinaisF1, sinaisF2, sinaisF3, sinaisF4, sinaisC0, sinaisParaAnalises, horas };
