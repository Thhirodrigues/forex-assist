// ===================================================
// FOREX ASSIST - LABORATÓRIO - HORIZONTE DIÁRIO (protocolo pré-registrado: DOCUMENTACAO/LABORATORIO-E-ANALISES.md 6.21)
//
// Famílias D1-D5 sobre candles DIÁRIOS (10 pares), carteira com alvo de volatilidade, custo de spread, controle nulo
// (500 sorteios), métricas de constância (meses/semanas positivos), IC por bootstrap em blocos mensais e os critérios A1-A4.
// Funções puras. NÃO alterar parâmetros depois de ver resultado: isso vira família nova, com novo registro.
// ===================================================

const { SPREADS_PIPS, SPREAD_PADRAO_PIPS } = require("./spreads");
const { taxaEm } = require("./taxas");

const BASE_USD = new Set(["USD/JPY", "USD/CAD", "USD/CHF"]);
const COTADO_USD = new Set(["EUR/USD", "GBP/USD", "AUD/USD", "NZD/USD"]);
const PARES_USD = [...COTADO_USD, ...BASE_USD];
const AQUECIMENTO = 260;
const VOL_ALVO = 0.10, ALAV_MAX = 3;

const pip = (par) => (par.includes("JPY") ? 0.01 : 0.0001);
const spreadPips = (par, mult = 1) => ((SPREADS_PIPS[par] ? SPREADS_PIPS[par].pips : SPREAD_PADRAO_PIPS) * mult);

// ---------- séries ----------
// dados: { par: [{ts,o,h,l,c}] } -> alinhado numa grade de datas comum (interseção dos dias com todos os pares da família)
function alinhar(dados, pares) {
    const conjuntos = pares.map(p => new Set(dados[p].map(c => c.ts)));
    const datas = [...conjuntos[0]].filter(t => conjuntos.every(s => s.has(t))).sort((a, b) => a - b);
    const mapas = {};
    for (const p of pares) { const m = new Map(dados[p].map(c => [c.ts, c])); mapas[p] = datas.map(t => m.get(t)); }
    return { datas, series: mapas };
}

function retornosSimples(cs) { return cs.map((c, i) => (i === 0 ? 0 : c.c / cs[i - 1].c - 1)); }

function volEWMA(ret, span = 60) {
    const a = 2 / (span + 1);
    const out = new Array(ret.length).fill(null);
    let v = null;
    for (let i = 1; i < ret.length; i++) { v = v === null ? ret[i] * ret[i] : a * ret[i] * ret[i] + (1 - a) * v; out[i] = Math.sqrt(v); }
    return out;
}

// último dia útil de cada mês (índices)
function fimDeMes(datas) {
    const out = [];
    for (let i = 0; i < datas.length; i++) {
        const m = new Date(datas[i]).getUTCMonth();
        if (i === datas.length - 1 || new Date(datas[i + 1]).getUTCMonth() !== m) out.push(i);
    }
    return out;
}

const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

// ---------- famílias: devolvem sinais[par][t] (posição efetiva a partir do fecho do dia t) ----------
function sinaisMomentum(series, pares, datas, lookback) {
    const s = {}; const reb = new Set(fimDeMes(datas));
    for (const p of pares) {
        const c = series[p]; const arr = new Array(datas.length).fill(0); let atual = 0;
        for (let t = 0; t < datas.length; t++) {
            if (t >= AQUECIMENTO && reb.has(t)) atual = sgn(c[t].c / c[t - lookback].c - 1);
            arr[t] = t >= AQUECIMENTO ? atual : 0;
        }
        s[p] = arr;
    }
    return s;
}
const sinaisD1 = (series, pares, datas) => sinaisMomentum(series, pares, datas, 252);
const sinaisD2 = (series, pares, datas) => sinaisMomentum(series, pares, datas, 63);

// força da moeda contra o USD: par com USD na cotação = retorno do par; USD na base = retorno invertido
function forcaVsUSD(par, c, t, lb) { const r = c[t].c / c[t - lb].c - 1; return COTADO_USD.has(par) ? r : -r; }

function sinaisD3(series, pares, datas) {
    const usd = pares.filter(p => PARES_USD.includes(p));
    const s = {}; for (const p of pares) s[p] = new Array(datas.length).fill(0);
    const reb = new Set(fimDeMes(datas)); let atual = {};
    for (let t = AQUECIMENTO; t < datas.length; t++) {
        if (reb.has(t)) {
            const rank = usd.map(p => ({ p, f: forcaVsUSD(p, series[p], t, 63) })).sort((a, b) => b.f - a.f);
            atual = {};
            rank.slice(0, 2).forEach(x => { atual[x.p] = COTADO_USD.has(x.p) ? 1 : -1; });    // moeda forte: compra a moeda vs USD
            rank.slice(-2).forEach(x => { atual[x.p] = COTADO_USD.has(x.p) ? -1 : 1; });      // moeda fraca: vende a moeda vs USD
        }
        for (const p of usd) s[p][t] = atual[p] || 0;
    }
    return s;
}

function sinaisD4(series, pares, datas) {
    const usd = pares.filter(p => PARES_USD.includes(p));
    const idx = new Array(datas.length).fill(0);
    for (let t = 1; t < datas.length; t++) {
        let soma = 0;
        for (const p of usd) { const r = Math.log(series[p][t].c / series[p][t - 1].c); soma += COTADO_USD.has(p) ? -r : r; }
        idx[t] = idx[t - 1] + soma / usd.length;                                        // sobe quando o dólar se fortalece
    }
    const s = {}; for (const p of pares) s[p] = new Array(datas.length).fill(0);
    const reb = new Set(fimDeMes(datas)); let dir = 0;
    for (let t = AQUECIMENTO; t < datas.length; t++) {
        if (reb.has(t)) dir = sgn(idx[t] - idx[t - 126]);
        for (const p of usd) s[p][t] = COTADO_USD.has(p) ? -dir : dir;                   // dólar sobe: vende pares cotados em USD, compra os com USD na base
    }
    return s;
}

function sinaisD5(series, pares, datas) {
    const s = {};
    for (const p of pares) {
        const c = series[p]; const arr = new Array(datas.length).fill(0); let pos = 0;
        for (let t = AQUECIMENTO; t < datas.length; t++) {
            let max55 = -Infinity, min55 = Infinity, max20 = -Infinity, min20 = Infinity;
            for (let k = 1; k <= 55; k++) { max55 = Math.max(max55, c[t - k].h); min55 = Math.min(min55, c[t - k].l); if (k <= 20) { max20 = Math.max(max20, c[t - k].h); min20 = Math.min(min20, c[t - k].l); } }
            if (pos === 0) { if (c[t].c > max55) pos = 1; else if (c[t].c < min55) pos = -1; }
            else if (pos === 1 && c[t].c < min20) pos = 0;
            else if (pos === -1 && c[t].c > max20) pos = 0;
            arr[t] = pos;
        }
        s[p] = arr;
    }
    return s;
}

// ---------- carry (protocolo 6.23) ----------
// diferencial de juros por par e por dia, em fração (taxa_base - taxa_cotada)/100, com a taxa vigente EM t (sem olhar para frente)
const MARKUP_BASE = 0.01, MARKUP_ESTRESSE = 0.025, LIMIAR_C2 = 0.01;
function diferenciais(pares, datas, taxas) {
    const out = {};
    for (const p of pares) {
        const [b, q] = p.split("/");
        out[p] = datas.map(ts => { const rb = taxaEm(taxas[b], ts), rq = taxaEm(taxas[q], ts); return rb === null || rq === null ? 0 : (rb - rq) / 100; });
    }
    return out;
}

function sinaisCarry(pares, datas, diff, limiar = 0) {
    const s = {};
    for (const p of pares) s[p] = datas.map((_, t) => (t < AQUECIMENTO || Math.abs(diff[p][t]) < Math.max(limiar, 1e-12) ? 0 : sgn(diff[p][t])));
    return s;
}
const sinaisC1 = (series, pares, datas, ctx) => sinaisCarry(pares, datas, ctx.diff, 0);
const sinaisC2 = (series, pares, datas, ctx) => sinaisCarry(pares, datas, ctx.diff, LIMIAR_C2);
function sinaisC3(series, pares, datas, ctx) {
    const c = sinaisCarry(pares, datas, ctx.diff, 0), m = sinaisD1(series, pares, datas), s = {};
    for (const p of pares) s[p] = c[p].map((x, t) => (x !== 0 && x === m[p][t] ? x : 0));
    return s;
}

const FAMILIAS_DIARIAS = {
    D1: { nome: "Momentum 12 meses (série temporal)", sinais: sinaisD1, universo: "todos" },
    D2: { nome: "Momentum 3 meses (série temporal)", sinais: sinaisD2, universo: "todos" },
    D3: { nome: "Momentum entre moedas (63 d, 2 contra 2)", sinais: sinaisD3, universo: "usd" },
    D4: { nome: "Dólar como fator único (126 d)", sinais: sinaisD4, universo: "usd" },
    D5: { nome: "Rompimento Donchian 55/20", sinais: sinaisD5, universo: "todos" }
};
// famílias de carry: só rodam com taxas (ctx.diff)
const FAMILIAS_CARRY = {
    C1: { nome: "Carry por par (sinal do diferencial)", sinais: sinaisC1, universo: "todos", carry: true },
    C2: { nome: "Carry com limiar (|dif| >= 1 pp)", sinais: sinaisC2, universo: "todos", carry: true },
    C3: { nome: "Carry com filtro de tendência 12m", sinais: sinaisC3, universo: "todos", carry: true }
};

// ---------- carteira ----------
/**
 * Retornos diários da carteira. Pesos fixados no momento em que o SINAL muda (ou nos rebalanceamentos): sinal x (10% a.a. / vol do par) / N,
 * com teto de alavancagem bruta. O retorno do dia t+1+lag usa o peso decidido no fecho de t. Custo = |mudança de peso| x spread/preço no dia da mudança.
 */
function carteira({ series, pares, datas, sinais, lag = 0, multSpread = 1, swapPipDia = 0, carry = null }) {
    const n = datas.length;
    const rets = {}, vols = {};
    for (const p of pares) { rets[p] = retornosSimples(series[p]); vols[p] = volEWMA(rets[p]); }
    const N = pares.filter(p => sinais[p].some(x => x !== 0)).length || 1;
    const pesos = {}; for (const p of pares) pesos[p] = new Array(n).fill(0);
    const refresca = new Set(fimDeMes(datas));   // o peso (alvo de volatilidade) é refeito quando o sinal muda e a cada fim de mês
    for (const p of pares) {
        let w = 0, ultimoSinal = 0;
        for (let t = 0; t < n; t++) {
            const sg = sinais[p][t];
            if (sg !== ultimoSinal || (sg !== 0 && refresca.has(t))) { const v = vols[p][t]; w = sg !== 0 && v ? (sg * (VOL_ALVO / (v * Math.sqrt(252)))) / N : 0; ultimoSinal = sg; }
            else if (sg === 0) { w = 0; }
            pesos[p][t] = w;
        }
    }
    // teto de alavancagem bruta
    for (let t = 0; t < n; t++) { const g = pares.reduce((s, p) => s + Math.abs(pesos[p][t]), 0); if (g > ALAV_MAX) for (const p of pares) pesos[p][t] *= ALAV_MAX / g; }
    const diario = new Array(n).fill(0), bruto = new Array(n).fill(0);
    for (let t = AQUECIMENTO; t < n - 1 - lag; t++) {
        let r = 0, custo = 0;
        for (const p of pares) {
            const w = pesos[p][t]; const wAnt = t > 0 ? pesos[p][t - 1] : 0;
            r += w * rets[p][t + 1 + lag];
            if (carry) { const dias = (datas[t + 1 + lag] - datas[t + lag]) / 86400000; r += w * carry.diff[p][t] * dias / 365; custo += Math.abs(w) * carry.markup * dias / 365; }
            custo += Math.abs(w - wAnt) * (spreadPips(p, multSpread) * pip(p)) / series[p][t].c + Math.abs(w) * swapPipDia * pip(p) / series[p][t].c;
        }
        bruto[t + 1 + lag] = r; diario[t + 1 + lag] = r - custo;
    }
    return { diario, bruto, datas, inicio: AQUECIMENTO + 1 + lag };
}

// ---------- métricas ----------
function media(a) { return a.reduce((s, x) => s + x, 0) / (a.length || 1); }
function desvio(a) { const m = media(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, a.length - 1)); }
function sharpe(rets) { const sd = desvio(rets); return sd > 0 ? (media(rets) / sd) * Math.sqrt(252) : 0; }

function agrupar(rets, datas, chave) {
    const m = new Map();
    rets.forEach((r, i) => { const k = chave(datas[i]); m.set(k, (m.get(k) || 0) + r); });
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
const chaveMes = (ts) => { const d = new Date(ts); return d.getUTCFullYear() * 100 + d.getUTCMonth(); };
const chaveSemana = (ts) => Math.floor((ts / 86400000 + 4) / 7);   // semanas começando na segunda (1970-01-01 foi quinta)
const chaveAno = (ts) => new Date(ts).getUTCFullYear();

function drawdownMaximo(rets) { let pico = 0, c = 0, dd = 0; for (const r of rets) { c += r; pico = Math.max(pico, c); dd = Math.max(dd, pico - c); } return dd; }

function prng(semente) { let a = semente >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// bootstrap em blocos mensais do Sharpe (média/desvio dos retornos MENSAIS, anualizado)
function bootstrapSharpeMensal(mensais, sorteios = 3000, semente = 12345) {
    const r = prng(semente), n = mensais.length, out = [];
    for (let b = 0; b < sorteios; b++) { const a = []; for (let i = 0; i < n; i++) a.push(mensais[Math.floor(r() * n)]); const sd = desvio(a); out.push(sd > 0 ? (media(a) / sd) * Math.sqrt(12) : 0); }
    out.sort((x, y) => x - y);
    return { lo: out[Math.floor(0.025 * sorteios)], hi: out[Math.floor(0.975 * sorteios)] };
}

function percentil(sorted, q) { return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]; }

// controle nulo: posições aleatórias (sinal sorteado por par a cada mês), mesma máquina de pesos/custos
function distribuicaoNula({ series, pares, datas, sorteios = 500, semente = 777, carry = null }) {
    const reb = new Set(fimDeMes(datas)); const out = [];
    for (let k = 0; k < sorteios; k++) {
        const r = prng(semente + k);
        const sinais = {};
        for (const p of pares) { const a = new Array(datas.length).fill(0); let atual = 1; for (let t = AQUECIMENTO; t < datas.length; t++) { if (reb.has(t)) atual = r() < 0.5 ? 1 : -1; a[t] = atual; } sinais[p] = a; }
        const c = carteira({ series, pares, datas, sinais, carry });
        out.push(sharpe(c.diario.slice(c.inicio)));
    }
    return out.sort((a, b) => a - b);
}

function metricasDe(c) {
    const rets = c.diario.slice(c.inicio), datas = c.datas.slice(c.inicio);
    const meses = agrupar(rets, datas, chaveMes).map(x => x[1]), semanas = agrupar(rets, datas, chaveSemana).map(x => x[1]);
    const anos = Object.fromEntries(agrupar(rets, datas, chaveAno).map(([a, v]) => [a, Number((100 * v).toFixed(1))]));
    const meio = Math.floor(rets.length / 2), blocos = [0, 1, 2, 3].map(k => rets.slice(Math.floor(k * rets.length / 4), Math.floor((k + 1) * rets.length / 4)));
    return {
        sharpe: sharpe(rets), sharpeBruto: sharpe(c.bruto.slice(c.inicio)),
        retornoAnual: 100 * media(rets) * 252, volAnual: 100 * desvio(rets) * Math.sqrt(252), drawdownMax: 100 * drawdownMaximo(rets),
        pctMesesPos: 100 * meses.filter(x => x > 0).length / meses.length, pctSemanasPos: 100 * semanas.filter(x => x > 0).length / semanas.length,
        nMeses: meses.length, metades: [sharpe(rets.slice(0, meio)), sharpe(rets.slice(meio))], blocos: blocos.map(sharpe), anos, mensais: meses
    };
}

function avaliarFamilia({ familia, dados, paresTodos, nuloCache = {}, sorteiosNulo = 500, sorteiosBoot = 3000, taxas = null, comSwap = false }) {
    const def = FAMILIAS_DIARIAS[familia] || FAMILIAS_CARRY[familia];
    const usaCarry = !!def.carry || comSwap;
    if (usaCarry && !taxas) throw new Error("família com carry exige taxas");
    const pares = def.universo === "usd" ? paresTodos.filter(p => PARES_USD.includes(p)) : paresTodos;
    const { datas, series } = alinhar(dados, pares);
    const diff = usaCarry ? diferenciais(pares, datas, taxas) : null;
    const ctx = { diff };
    const sinais = def.sinais(series, pares, datas, ctx);
    const carryDe = (markup) => (usaCarry ? { diff, markup } : null);
    const roda = (extra = {}, markup = MARKUP_BASE) => carteira({ series, pares, datas, sinais, carry: carryDe(markup), ...extra });
    const base = roda();
    const m = metricasDe(base);
    const lag1 = metricasDe(roda({ lag: 1 })).sharpe;
    const sp2 = metricasDe(roda({ multSpread: 2 })).sharpe;
    const swap = usaCarry ? metricasDe(roda({}, MARKUP_ESTRESSE)).sharpe : metricasDe(carteira({ series, pares, datas, sinais, swapPipDia: 0.5 })).sharpe;
    const chaveNulo = pares.join("|") + (usaCarry ? "|carry" : "");
    if (!nuloCache[chaveNulo]) nuloCache[chaveNulo] = distribuicaoNula({ series, pares, datas, sorteios: sorteiosNulo, carry: carryDe(MARKUP_BASE) });
    const nulo = nuloCache[chaveNulo];
    const ic = bootstrapSharpeMensal(m.mensais, sorteiosBoot);
    const a1 = m.sharpe > 0 && ic.lo > 0 && m.sharpe >= percentil(nulo, 0.99);
    const a2 = m.metades.every(x => x > 0) && m.blocos.filter(x => x > 0).length >= 3;
    const a3 = lag1 > 0 && sp2 > 0 && (!def.carry || swap > 0);   // carry: também precisa sobreviver ao swap pior (markup 2,5 pp)
    const a4 = m.pctMesesPos >= 55 && m.drawdownMax <= 25;
    const { mensais, ...resto } = m;
    return {
        familia, nome: def.nome + (comSwap ? " + swap (informativo)" : ""), pares: pares.length, dias: datas.length, de: datas[AQUECIMENTO], ate: datas[datas.length - 1], ...resto,
        ic95: [ic.lo, ic.hi], nulo: { p50: percentil(nulo, 0.5), p95: percentil(nulo, 0.95), p99: percentil(nulo, 0.99), n: nulo.length },
        robustez: { lag1, spread2x: sp2, [usaCarry ? "markup25" : "swap05"]: swap }, criterios: { A1: a1, A2: a2, A3: a3, A4: a4 },
        veredito: a1 && a2 && a3 ? (a4 ? "UTILIZÁVEL" : "VANTAGEM DEMONSTRADA (não atende A4)") : "SEM EVIDÊNCIA"
    };
}

module.exports = { FAMILIAS_DIARIAS, FAMILIAS_CARRY, diferenciais, sinaisC1, sinaisC2, sinaisC3, MARKUP_BASE, MARKUP_ESTRESSE, avaliarFamilia, carteira, sinaisD1, sinaisD2, sinaisD3, sinaisD4, sinaisD5, alinhar, fimDeMes, sharpe, bootstrapSharpeMensal, distribuicaoNula, metricasDe, prng, PARES_USD, AQUECIMENTO };
