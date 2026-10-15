// ===================================================
// FOREX ASSIST - LABORATÓRIO - CONTA SIMULADA E POLÍTICA DE MARGEM (pré-registro 6.31, Fase B; funções puras)
//
// Processa, em ordem cronológica e candle a candle (5 min), as entradas JÁ simuladas (saída por variante
// precomputada) numa conta com alavancagem e stop-out: margem = nocional/alavancagem; nível de margem =
// patrimônio/margem; abaixo de `stopOutPct` a corretora liquida a pior posição (como a XM, 50%).
// Patrimônio = saldo + resultado flutuante marcado no CLOSE do candle (decisão de implementação: o extremo
// adverso de cada posição não é somado, porque todos os extremos nunca ocorrem juntos). O swap só entra na hora
// do fechamento (o acumulado diário no flutuante vale centavos).
// Nada aqui toca em banco/API nem no sinal oficial.
// ===================================================

const { fatorPip } = require("./simulador");

const CINCO_MIN = 5 * 60 * 1000;

const PRECO_PADRAO = { "EUR/USD": 1.12, "GBP/USD": 1.32, "AUD/USD": 0.69, "NZD/USD": 0.56, "USD/JPY": 158, "USD/CAD": 1.42, "USD/CHF": 0.83 };

// Valor de 1 pip em USD para `unidades` do par, dado o preço mais recente de cada par
function valorPipUSD(par, unidades, px) {
    const pip = 1 / fatorPip(par);
    const p = (x) => px[x] ?? PRECO_PADRAO[x];
    const [base, cot] = par.split("/");
    if (cot === "USD") return unidades * pip;
    if (base === "USD") return unidades * pip / p(par);
    if (cot === "JPY") return unidades * pip / p("USD/JPY");        // EUR/JPY, GBP/JPY
    if (par === "EUR/GBP") return unidades * pip * p("GBP/USD");
    return unidades * pip;
}

// Nocional em USD (moeda base x preço) - base da margem
function nocionalUSD(par, unidades, px) {
    const base = par.split("/")[0];
    if (base === "USD") return unidades;
    const par$ = `${base}/USD`;
    return unidades * (px[par$] ?? PRECO_PADRAO[par$] ?? 1);
}

function construirPrecos(porPar) {
    const series = {};
    const todos = new Set();
    for (const [par, cs] of Object.entries(porPar)) {
        const ts = new Float64Array(cs.length), c = new Float64Array(cs.length);
        cs.forEach((x, i) => { ts[i] = x.ts ?? x.timestamp; c[i] = x.c ?? x.close; todos.add(ts[i]); });
        series[par] = { ts, c };
    }
    return { series, timeline: Float64Array.from([...todos].sort((a, b) => a - b)) };
}

function indiceDe(arr, t) {   // primeiro índice com arr[i] >= t
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < t) lo = m + 1; else hi = m; }
    return lo;
}

/**
 * @param {object} p
 * @param {Array} p.trades      ordenados por t: {id,par,direcao,t,precoEntrada,spreadPips,resultado,pips,swapPips?,tFechamento?}
 * @param {object} p.precos     saída de construirPrecos
 * @param {number} p.ini        ms (inclusive)
 * @param {number} p.fim        ms (exclusive)
 * @param {object} [p.politica] {porPar:Number, maxAbertas:Number, nivelMin:Number(%)}
 */
function simularConta(p) {
    const { trades, precos, ini, fim } = p;
    const pol = p.politica || {};
    const conta0 = p.conta0 ?? 100, unidades = p.unidades ?? 2000, alav = p.alavancagem ?? 1000, stopOutPct = p.stopOutPct ?? 50;
    const spreadDe = (t) => Number(t.spreadPips) || 0;

    let saldo = conta0;
    let abertas = [];
    const px = {};                 // último preço por par
    const ponteiro = {};
    for (const par of Object.keys(precos.series)) ponteiro[par] = -1;
    const fila = trades.filter(t => t.t >= ini && t.t < fim);
    let iFila = 0;

    const m = { equityMin: conta0, nivelMin: Infinity, minAbaixo200: 0, minAbaixo100: 0, aceitas: 0, rejeitadas: 0, stopOuts: 0, realizadas: 0, ganhos: 0, perdas: 0 };

    const flutuantePips = (pos) => {
        const ult = px[pos.par];
        if (ult === undefined) return 0;
        const dir = pos.direcao === "BUY" ? 1 : -1;
        return dir * (ult - pos.precoEntrada) * fatorPip(pos.par) - spreadDe(pos);
    };
    const flutuanteUSD = (pos) => flutuantePips(pos) * valorPipUSD(pos.par, unidades, px);
    const margemTotal = (lista) => lista.reduce((a, pos) => a + nocionalUSD(pos.par, unidades, px) / alav, 0);
    const patrimonio = () => saldo + abertas.reduce((a, pos) => a + flutuanteUSD(pos), 0);
    const realizar = (pos, pips) => {
        const usd = pips * valorPipUSD(pos.par, unidades, px);
        saldo += usd; m.realizadas++; if (usd > 0) m.ganhos++; else if (usd < 0) m.perdas++;
    };

    const i0 = indiceDe(precos.timeline, ini);
    for (let k = i0; k < precos.timeline.length && precos.timeline[k] < fim; k++) {
        const ts = precos.timeline[k];
        for (const par of Object.keys(precos.series)) {
            const s = precos.series[par];
            let j = ponteiro[par];
            while (j + 1 < s.ts.length && s.ts[j + 1] <= ts) j++;
            if (j >= 0) { ponteiro[par] = j; px[par] = s.c[j]; }
        }
        // 1) saídas programadas (resultado precomputado da variante)
        if (abertas.length) {
            const restantes = [];
            for (const pos of abertas) {
                if (pos.tFechamento !== undefined && pos.tFechamento <= ts + CINCO_MIN && pos.resultado !== "ABERTA") {
                    realizar(pos, (pos.pips || 0) + (pos.swapPips || 0));
                } else restantes.push(pos);
            }
            abertas = restantes;
        }
        // 2) entradas deste instante, sujeitas à política
        while (iFila < fila.length && fila[iFila].t <= ts) {
            const t = fila[iFila++];
            const nova = { ...t };
            let ok = true;
            if (pol.porPar && abertas.filter(a => a.par === t.par).length >= pol.porPar) ok = false;
            if (ok && pol.maxAbertas && abertas.length >= pol.maxAbertas) ok = false;
            if (ok && pol.nivelMin) {
                const mg = margemTotal([...abertas, nova]);
                if (mg > 0 && (patrimonio() / mg) * 100 < pol.nivelMin) ok = false;
            }
            if (ok) { abertas.push(nova); m.aceitas++; } else m.rejeitadas++;
        }
        if (!abertas.length) continue;
        // 3) patrimônio, margem, stop-out
        for (;;) {
            const eq = patrimonio();
            const mg = margemTotal(abertas);
            const nivel = mg > 0 ? (eq / mg) * 100 : Infinity;
            if (nivel < stopOutPct && abertas.length) {
                // liquida a pior posição (maior prejuízo flutuante) ao preço atual
                let pior = 0;
                for (let q = 1; q < abertas.length; q++) if (flutuanteUSD(abertas[q]) < flutuanteUSD(abertas[pior])) pior = q;
                const [pos] = abertas.splice(pior, 1);
                realizar(pos, flutuantePips(pos) + (pos.swapPips || 0));
                m.stopOuts++;
                continue;
            }
            m.equityMin = Math.min(m.equityMin, eq);
            if (Number.isFinite(nivel)) {
                m.nivelMin = Math.min(m.nivelMin, nivel);
                if (nivel < 200) m.minAbaixo200 += 5;
                if (nivel < 100) m.minAbaixo100 += 5;
            }
            break;
        }
    }
    const equityFinal = patrimonio();
    return { ...m, nivelMin: Number.isFinite(m.nivelMin) ? Number(m.nivelMin.toFixed(1)) : null, equityMin: Number(m.equityMin.toFixed(2)), equityFinal: Number(equityFinal.toFixed(2)), saldoFinal: Number(saldo.toFixed(2)), abertasNoFim: abertas.length };
}

// Janelas móveis (padrão 30 dias, passo 7): cada uma começa com conta nova e só vê as entradas daquela janela.
function janelasMoveis({ trades, precos, ini, fim, diasJanela = 30, passoDias = 7, ...resto }) {
    const out = [];
    for (let a = ini; a + diasJanela * 86400000 <= fim; a += passoDias * 86400000) {
        out.push({ ini: a, ...simularConta({ trades, precos, ini: a, fim: a + diasJanela * 86400000, ...resto }) });
    }
    return out;
}

const POLITICAS = {
    P0: {},
    P1: { porPar: 1 },
    P2: { maxAbertas: 4 },
    P3: { nivelMin: 300 },
    P4: { porPar: 1, nivelMin: 300 }
};

module.exports = { valorPipUSD, nocionalUSD, construirPrecos, simularConta, janelasMoveis, POLITICAS };
