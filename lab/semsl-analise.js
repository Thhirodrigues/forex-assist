// ===================================================
// FOREX ASSIST - LABORATÓRIO - "TP SEM SL": ANÁLISE (pré-registro 6.31; funções puras, sem I/O)
//
// Fase A: as MESMAS entradas do replay (OFICIAL e LAB) simuladas em V0..V5 (lab/semsl.js), com swap (markup base 1,0 pp e
//         estresse 2,5 pp), controle ALEATORIO (direção sorteada pelo id) e estatística agrupada por DIA UTC.
// Fase B: conta simulada (lab/conta.js) com 5 políticas de margem, contas de US$100 e US$1.000, em janelas móveis de 30 dias.
// Não decide nada: devolve números. Critérios de leitura estão no caderno 6.31 (escritos antes).
// ===================================================

const { simularSemSL, swapPips, VARIANTES_SEMSL } = require("./semsl");
const { construirPrecos, janelasMoveis, simularConta, POLITICAS } = require("./conta");
const { paridadeDoId } = require("./nucleo");

const MARKUP_BASE = 1.0, MARKUP_ESTRESSE = 2.5;
const dia = (t) => new Date(t).toISOString().slice(0, 10);
const mes = (t) => new Date(t).toISOString().slice(0, 7);

function percentil(ordenado, q) {
    if (!ordenado.length) return null;
    const i = Math.min(ordenado.length - 1, Math.max(0, Math.ceil(q * ordenado.length) - 1));
    return Number(ordenado[i].toFixed(2));
}

// Média com erro-padrão AGRUPADO por dia (estimador de razão; as operações do mesmo dia dividem o fator dólar)
function clusterMedia(itens) {   // itens: [{dia, v}]
    const n = itens.length;
    if (n < 2) return { n, media: n ? itens[0].v : null, ep: null, t: null };
    const media = itens.reduce((a, x) => a + x.v, 0) / n;
    const porDia = new Map();
    for (const x of itens) { const g = porDia.get(x.dia) || { s: 0, n: 0 }; g.s += x.v - media; g.n += 1; porDia.set(x.dia, g); }
    const G = porDia.size;
    if (G < 2) return { n, media: Number(media.toFixed(3)), ep: null, t: null, dias: G };
    let ss = 0;
    for (const g of porDia.values()) ss += g.s * g.s;
    const ep = Math.sqrt((G / (G - 1)) * ss) / n;
    return { n, dias: G, media: Number(media.toFixed(3)), ep: Number(ep.toFixed(3)), t: ep > 0 ? Number((media / ep).toFixed(2)) : null };
}

// Sinal da deriva do dólar por mês (cesta dos 7 pares com USD): "alta" ou "baixa"
function regimesDolar(porPar) {
    const BASE = new Set(["USD/JPY", "USD/CAD", "USD/CHF"]), COT = new Set(["EUR/USD", "GBP/USD", "AUD/USD", "NZD/USD"]);
    const acum = {};
    for (const [par, cs] of Object.entries(porPar)) {
        const lado = BASE.has(par) ? 1 : COT.has(par) ? -1 : 0;
        if (!lado || cs.length < 2) continue;
        const primeiro = {}, ultimo = {};
        for (const c of cs) { const m = mes(c.ts); if (!(m in primeiro)) primeiro[m] = c.o; ultimo[m] = c.c; }
        for (const m of Object.keys(primeiro)) {
            const r = lado * Math.log(ultimo[m] / primeiro[m]);
            (acum[m] = acum[m] || []).push(r);
        }
    }
    const out = {};
    for (const [m, rs] of Object.entries(acum)) out[m] = rs.reduce((a, b) => a + b, 0) / rs.length >= 0 ? "alta" : "baixa";
    return out;
}

// Candle com dado quebrado (preço <= 0, máxima < mínima ou amplitude > 3% do preço em 5 min) é descartado: no replay de 15/10/2026
// um desses produziu MAE de 11.324 pips. Não existe amplitude de 3% em 5 min em FX líquido no período testado.
function candleSanoSemSL(c) {
    const v = [c.o, c.h, c.l, c.c];
    if (!v.every(x => Number.isFinite(x) && x > 0)) return false;
    return c.h >= c.l && (c.h - c.l) / c.c <= 0.03;
}
function limparCandles(c5) { return c5.filter(candleSanoSemSL); }

function simularEntrada(e, v, cm, taxas, ctrl) {
    const inverter = ctrl ? paridadeDoId(e.id) : false;
    const r = simularSemSL({
        par: e.par, direcao: e.direcao, tEntrada: e.t, precoEntrada: e.precoEntrada, tpPips: e.tpPips,
        slPips: v.id === "V0_ATUAL" ? e.slPips : undefined, stopMult: v.stopMult, diasMax: v.diasMax,
        spreadPips: e.spreadPips, inverter, candles: cm
    });
    if (r.resultado === "INVALIDA") return null;
    const dirEf = (e.direcao === "BUY") !== inverter ? "BUY" : "SELL";
    const sw = (mk) => swapPips({ par: e.par, direcao: dirEf, preco: r.entrada ?? e.precoEntrada, t0: e.t, t1: r.tFechamento ?? e.t, taxas, markupPp: mk });
    const swB = sw(MARKUP_BASE), swE = sw(MARKUP_ESTRESSE);
    return { r, swB, swE, pips: Number((r.pips + swB).toFixed(2)), pipsE: Number((r.pips + swE).toFixed(2)) };
}

function faseA({ entradas, porPar: porParBruto, splitTs, taxas, variantes = VARIANTES_SEMSL, log = () => {} }) {
    const porPar = Object.fromEntries(Object.entries(porParBruto).map(([par, c5]) => [par, limparCandles(c5)]));
    const descartados = Object.entries(porParBruto).reduce((a, [par, c5]) => a + c5.length - porPar[par].length, 0);
    if (descartados) log(`candles quebrados descartados: ${descartados}`);
    const cm = {};
    for (const [par, c5] of Object.entries(porPar)) cm[par] = c5.map(x => ({ timestamp: x.ts, open: x.o, high: x.h, low: x.l, close: x.c }));
    const regimes = regimesDolar(porPar);
    const regs = [];   // {tipo,v,ctrl,epoca,id,dia,reg,res,pips,pipsE,mae,dur}
    const paraConta = {};   // variante -> entradas OFICIAL com saída (para a Fase B)
    for (const v of variantes) paraConta[v.id] = [];
    let k = 0;
    for (const e of entradas) {
        if (e.tipo !== "OFICIAL" && e.tipo !== "LAB") continue;
        const candles = cm[e.par];
        if (!candles) continue;
        for (const v of variantes) {
            for (const ctrl of [false, true]) {
                const s = simularEntrada(e, v, candles, taxas, ctrl);
                if (!s) continue;
                regs.push({
                    tipo: e.tipo, v: v.id, ctrl, par: e.par, epoca: e.t < splitTs ? "pre" : "pos", id: e.id, dia: dia(e.t), reg: regimes[mes(e.t)] || "?",
                    res: s.r.resultado, pips: s.pips, pipsE: s.pipsE, mae: s.r.mae, dur: s.r.duracaoMin
                });
                if (!ctrl && e.tipo === "OFICIAL") {
                    paraConta[v.id].push({
                        id: e.id, par: e.par, direcao: e.direcao, t: e.t, precoEntrada: e.precoEntrada, spreadPips: e.spreadPips,
                        resultado: s.r.resultado, pips: s.r.pips, swapPips: s.swB, tFechamento: s.r.tFechamento
                    });
                }
            }
        }
        if (++k % 1000 === 0) log(`fase A: ${k} entradas`);
    }
    for (const v of Object.keys(paraConta)) paraConta[v].sort((a, b) => a.t - b.t);
    return { regs, paraConta, regimes, candlesDescartados: descartados };
}

function resumir(regs) {
    const n = regs.length;
    if (!n) return null;
    const pips = regs.map(r => ({ dia: r.dia, v: r.pips }));
    const cl = clusterMedia(pips);
    const perdas = regs.filter(r => r.pips < 0).map(r => r.pips);
    const maes = regs.map(r => r.mae).sort((a, b) => a - b);
    const durWin = regs.filter(r => r.res === "WIN").map(r => r.dur).sort((a, b) => a - b);
    const cont = (f) => regs.filter(f).length;
    return {
        n, dias: cl.dias || null,
        acerto: Number((100 * cont(r => r.res === "WIN") / n).toFixed(1)),
        pipsOp: cl.media, ep: cl.ep, t: cl.t,
        ic95: cl.ep != null ? [Number((cl.media - 1.96 * cl.ep).toFixed(2)), Number((cl.media + 1.96 * cl.ep).toFixed(2))] : null,
        pipsOpEstresse: Number((regs.reduce((a, r) => a + r.pipsE, 0) / n).toFixed(3)),
        perdaMedia: perdas.length ? Number((perdas.reduce((a, b) => a + b, 0) / perdas.length).toFixed(2)) : null,
        piorPerda: perdas.length ? Number(Math.min(...perdas).toFixed(2)) : null,
        mae: { p50: percentil(maes, 0.5), p90: percentil(maes, 0.9), p99: percentil(maes, 0.99), max: maes[maes.length - 1] },
        durWinMin: { med: percentil(durWin, 0.5), p90: percentil(durWin, 0.9) },
        pctTempo: Number((100 * cont(r => r.res === "TEMPO") / n).toFixed(1)),
        pctStop: Number((100 * cont(r => r.res === "STOP") / n).toFixed(1)),
        abertas: cont(r => r.res === "ABERTA")
    };
}

// Diferença real - controle, entrada a entrada (mesmo id), erro-padrão agrupado por dia
function diferencaContraControle(reais, controles) {
    const porId = new Map(controles.map(c => [c.id, c]));
    const d = [];
    for (const r of reais) { const c = porId.get(r.id); if (c) d.push({ dia: r.dia, v: r.pips - c.pips }); }
    return clusterMedia(d);
}

function linhasFaseA(regs) {
    const linhas = [];
    const chaves = new Set(regs.map(r => `${r.tipo}|${r.v}|${r.epoca}`));
    for (const ch of chaves) {
        const [tipo, v, epoca] = ch.split("|");
        const reais = regs.filter(r => r.tipo === tipo && r.v === v && r.epoca === epoca && !r.ctrl);
        const ctrls = regs.filter(r => r.tipo === tipo && r.v === v && r.epoca === epoca && r.ctrl);
        linhas.push({ tipo, v, epoca, grupo: "TODOS", ctrl: false, ...resumir(reais), contraControle: diferencaContraControle(reais, ctrls) });
        linhas.push({ tipo, v, epoca, grupo: "TODOS", ctrl: true, ...resumir(ctrls) });
        for (const reg of ["alta", "baixa"]) {
            const r2 = reais.filter(r => r.reg === reg), c2 = ctrls.filter(r => r.reg === reg);
            if (r2.length) linhas.push({ tipo, v, epoca, grupo: `dolar_${reg}`, ctrl: false, ...resumir(r2), contraControle: diferencaContraControle(r2, c2) });
        }
        // recortes por par e por moeda GBP (pedido do usuário em 15/10/2026, hipótese H_GBP pré-registrada em 6.32 antes da execução)
        const grupos = { com_GBP: (r) => /GBP/.test(r.par), sem_GBP: (r) => !/GBP/.test(r.par) };
        for (const par of new Set(reais.map(r => r.par))) grupos[`par_${par.replace("/", "_")}`] = (r) => r.par === par;
        for (const [g, f] of Object.entries(grupos)) {
            const r2 = reais.filter(f), c2 = ctrls.filter(f);
            if (r2.length) linhas.push({ tipo, v, epoca, grupo: g, ctrl: false, ...resumir(r2), contraControle: diferencaContraControle(r2, c2) });
        }
    }
    return linhas;
}

function faseB({ paraConta, porPar, ini, fim, politicas = POLITICAS, contas = [100, 1000], log = () => {} }) {
    const precos = construirPrecos(Object.fromEntries(Object.entries(porPar).map(([par, c5]) => [par, limparCandles(c5)])));
    const linhas = [];
    for (const [v, trades] of Object.entries(paraConta)) {
        for (const [pid, pol] of Object.entries(politicas)) {
            for (const conta0 of contas) {
                const jan = janelasMoveis({ trades, precos, ini, fim, politica: pol, conta0 });
                const todo = simularConta({ trades, precos, ini, fim, politica: pol, conta0 });
                const ord = (f) => jan.map(f).sort((a, b) => a - b);
                const semSO = jan.filter(j => j.stopOuts === 0).length;
                const quebradas = jan.filter(j => j.quebrouEm).length;
                const okMin = jan.filter(j => j.equityMin >= 0.5 * conta0 && j.stopOuts === 0).length;
                linhas.push({
                    v, politica: pid, conta0, janelas: jan.length,
                    pctSemStopOut: Number((100 * semSO / jan.length).toFixed(1)), pctQuebrou: Number((100 * quebradas / jan.length).toFixed(1)),
                    pctEquityMinOk: Number((100 * okMin / jan.length).toFixed(1)),
                    equityFinalMed: percentil(ord(j => j.equityFinal), 0.5), equityFinalP10: percentil(ord(j => j.equityFinal), 0.1),
                    nivelMinMed: percentil(ord(j => j.nivelMin ?? 99999), 0.5), nivelMinPior: Math.min(...jan.map(j => j.nivelMin ?? 99999)),
                    aceitasMed: percentil(ord(j => j.aceitas), 0.5), rejeitadasMed: percentil(ord(j => j.rejeitadas), 0.5),
                    periodoTodo: { equityFinal: todo.equityFinal, equityMin: todo.equityMin, nivelMin: todo.nivelMin, stopOuts: todo.stopOuts, quebrouEm: todo.quebrouEm, aceitas: todo.aceitas, abertasNoFim: todo.abertasNoFim, minAbaixo200: todo.minAbaixo200, minAbaixo100: todo.minAbaixo100 }
                });
            }
        }
        log(`fase B ${v} pronta`);
    }
    return linhas;
}

module.exports = { limparCandles, faseA, faseB, resumir, linhasFaseA, clusterMedia, diferencaContraControle, regimesDolar, percentil, MARKUP_BASE, MARKUP_ESTRESSE };
