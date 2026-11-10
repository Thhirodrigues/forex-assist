// ===================================================
// FOREX ASSIST - RELATÓRIO DESCRITIVO DAS 400 PRIMEIRAS (pedido do usuário em 09/11/2026, "antes de qualquer decisão")
//
// SOMENTE LEITURA. Mesma seleção da regra 6.25 (scripts/marco/regra625.js): fechadas CONFIG desde 04/10 00:42Z, ordem de fechamento,
// as 400 PRIMEIRAS (contagem congelada em 6.39). Tudo aqui é DESCRITIVO: com dezenas de cortes, alguns parecem "padrão" por acaso
// (Bonferroni). Serve para formular hipóteses de uma amostra NOVA, nunca para ajustar o sinal em cima destas mesmas 400.
// Horários e dias em Brasília (UTC-3), pela hora de ABERTURA do sinal.
// ===================================================
const { selecionarFechadas } = require("../marco/regra625");
const { spreadDoPar } = require("../../lab/spreads");

const BRT = 3 * 3600e3;
const diaBrt = (ms) => new Date(ms - BRT).toISOString().slice(0, 10);
const horaBrt = (ms) => new Date(ms - BRT).getUTCHours();
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const dowBrt = (ms) => DIAS[new Date(ms - BRT).getUTCDay()];
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const media = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;

// lado do dólar apostado: "comprado" (aposta USD forte), "vendido" (USD fraco) ou "cruzado" (par sem USD)
function ladoDolar(par, direcao) {
    const [base, cot] = String(par).split("/");
    const compra = String(direcao).toUpperCase() === "BUY" || String(direcao).toUpperCase() === "COMPRA";
    if (base === "USD") return compra ? "comprado" : "vendido";
    if (cot === "USD") return compra ? "vendido" : "comprado";
    return "cruzado";
}

function registro(s) {
    const tp = Math.abs(Number(s.financeiro.tpPips)), sl = Math.abs(Number(s.financeiro.slPips));
    const win = s.resultado === "WIN";
    const bruto = win ? tp : -sl;
    const spread = spreadDoPar(s.par);
    const ind = s.indicadores || {};
    return {
        id: s.id, par: s.par, direcao: s.direcao, win, tp, sl, bruto, liq: bruto - spread, spread,
        usd: Number(s.resultadoFinanceiro) || 0, t: Number(s.timestamp), dia: diaBrt(Number(s.timestamp)), hora: horaBrt(Number(s.timestamp)),
        dow: dowBrt(Number(s.timestamp)), lado: ladoDolar(s.par, s.direcao), simetrico: Math.abs(tp - sl) < 0.05,
        score: Number(s.score), adx: Number(ind.adx), rsi: Number(ind.rsi), atr: Number(ind.atr), janela: s.janelaOrigem || "?",
        candle: !!s.candlestickDetectado, durMin: (Number(s.fimOperacao) - Number(s.inicioOperacao || s.timestamp)) / 60000
    };
}

function agrupar(regs, chave) {
    const m = new Map();
    for (const r of regs) {
        const k = typeof chave === "function" ? chave(r) : r[chave];
        if (!m.has(k)) m.set(k, { chave: k, n: 0, win: 0, loss: 0, liq: 0, bruto: 0, usd: 0 });
        const g = m.get(k);
        g.n++; g.win += r.win ? 1 : 0; g.loss += r.win ? 0 : 1; g.liq += r.liq; g.bruto += r.bruto; g.usd += r.usd;
    }
    return [...m.values()].map(g => ({ ...g, acertoPct: r1(100 * g.win / g.n), liqPorOp: r2(g.liq / g.n), liq: r1(g.liq), bruto: r1(g.bruto), usd: r1(g.usd) }));
}

function perfil(regs) {
    const num = (k) => { const v = regs.map(r => r[k]).filter(Number.isFinite); return v.length ? r2(media(v)) : null; };
    const lados = agrupar(regs, "lado").reduce((o, g) => (o[g.chave] = g.n, o), {});
    const janelas = agrupar(regs, "janela").reduce((o, g) => (o[g.chave] = g.n, o), {});
    return { n: regs.length, score: num("score"), adx: num("adx"), rsi: num("rsi"), atr: num("atr"), durMin: num("durMin"),
        candlePct: regs.length ? r1(100 * regs.filter(r => r.candle).length / regs.length) : null, lados, janelas };
}

function analisar(historico, { limite = 400 } = {}) {
    const fe = selecionarFechadas(historico).slice(0, limite);
    const regs = fe.map(registro);
    const W = regs.filter(r => r.win), L = regs.filter(r => !r.win);
    const soma = (a, k) => r1(a.reduce((s, r) => s + r[k], 0));

    // invertido: com TP = SL em pips, o primeiro nível tocado decide os dois lados, então o resultado do sinal inverso é o OPOSTO
    // (WIN <-> LOSS). Custo continua (o spread se paga na entrada de qualquer lado). Assimétricos ficam de fora (resultado incerto).
    const sim = regs.filter(r => r.simetrico);
    const inv = { simetricas: sim.length, assimetricas: regs.length - sim.length,
        acertoInvertidoPct: sim.length ? r1(100 * sim.filter(r => !r.win).length / sim.length) : null,
        brutoInvertidoPorOp: sim.length ? r2(media(sim.map(r => -r.bruto))) : null,
        liquidoInvertidoPorOp: sim.length ? r2(media(sim.map(r => -r.bruto - r.spread))) : null,
        acertoParaEmpatarPct: sim.length ? r1(100 * media(sim.map(r => (r.sl + r.spread) / (r.tp + r.sl)))) : null };

    // dias (Brasília, pela abertura): melhores e piores, com o "perfil" de cada grupo
    const dias = agrupar(regs, "dia").sort((a, b) => a.chave.localeCompare(b.chave));
    const porLiq = [...dias].sort((a, b) => b.liq - a.liq);
    const top = porLiq.slice(0, 5), pior = porLiq.slice(-5).reverse();
    const doDia = (ds) => regs.filter(r => ds.some(d => d.chave === r.dia));
    const concentracao = (d) => {   // fração dos sinais com dólar que apostam no MESMO lado (1 = todos iguais)
        const rr = regs.filter(r => r.dia === d.chave && r.lado !== "cruzado");
        if (!rr.length) return null;
        const c = rr.filter(r => r.lado === "comprado").length;
        return r2(Math.max(c, rr.length - c) / rr.length);
    };
    const comConc = dias.map(d => ({ ...d, concentracaoDolar: concentracao(d) }));
    const bons = comConc.filter(d => d.liq > 0), ruins = comConc.filter(d => d.liq <= 0);

    return {
        janela: { n: regs.length, primeiraAbertura: regs.length ? new Date(Math.min(...regs.map(r => r.t))).toISOString() : null },
        win: { n: W.length, pipsBrutos: soma(W, "bruto"), pipsLiquidos: soma(W, "liq"), usdApp: soma(W, "usd"),
            porPar: agrupar(W, "par").sort((a, b) => b.n - a.n).map(g => ({ par: g.chave, n: g.n })),
            porHora: agrupar(W, "hora").sort((a, b) => a.chave - b.chave).map(g => ({ hora: g.chave, n: g.n })) },
        loss: { n: L.length, pipsBrutos: soma(L, "bruto"), pipsLiquidos: soma(L, "liq"), usdApp: soma(L, "usd"),
            porPar: agrupar(L, "par").sort((a, b) => b.n - a.n).map(g => ({ par: g.chave, n: g.n })),
            porHora: agrupar(L, "hora").sort((a, b) => a.chave - b.chave).map(g => ({ hora: g.chave, n: g.n })) },
        total: { n: regs.length, acertoPct: r1(100 * W.length / regs.length), pipsBrutos: soma(regs, "bruto"), pipsLiquidos: soma(regs, "liq"), usdApp: soma(regs, "usd") },
        porPar: agrupar(regs, "par").sort((a, b) => b.n - a.n),
        porHora: agrupar(regs, "hora").sort((a, b) => a.chave - b.chave),
        porDiaSemana: DIAS.map(d => agrupar(regs, "dow").find(g => g.chave === d)).filter(Boolean),
        porLadoDolar: agrupar(regs, "lado"),
        porJanela: agrupar(regs, "janela"),
        invertido: inv,
        dias: { total: dias.length, melhores: top.map(d => ({ ...d, concentracaoDolar: concentracao(d) })), piores: pior.map(d => ({ ...d, concentracaoDolar: concentracao(d) })),
            perfilMelhores5: perfil(doDia(top)), perfilPiores5: perfil(doDia(pior)),
            diasPositivos: { n: bons.length, sinaisPorDia: r1(media(bons.map(d => d.n))), concentracaoMedia: r2(media(bons.map(d => d.concentracaoDolar).filter(x => x !== null))) },
            diasNegativos: { n: ruins.length, sinaisPorDia: r1(media(ruins.map(d => d.n))), concentracaoMedia: r2(media(ruins.map(d => d.concentracaoDolar).filter(x => x !== null))) } },
        perfilWin: perfil(W), perfilLoss: perfil(L)
    };
}

// ---------------------------------------------------
// SEQUÊNCIAS (pedido do usuário em 10/11/2026: "existe alguma sequência que se repete?"). Descritivo.
// Duas leituras: (1) na ordem de FECHAMENTO (o que se vê no histórico); (2) "utilizável": para cada sinal, o que já estava FECHADO antes de
// ele ABRIR (só isso seria conhecido na hora de entrar). Teste de sequências de Wald-Wolfowitz: z < 0 = resultados agrupados (rachas),
// z > 0 = alternância. Atenção: operações do mesmo dia andam juntas (mesma aposta no dólar), então algum agrupamento é esperado.
// ---------------------------------------------------
function sequencias(historico, { limite = 400 } = {}) {
    const fe = selecionarFechadas(historico).slice(0, limite);
    const regs = fe.map(s => ({ ...registro(s), fim: Number(s.fimOperacao) }));
    const seq = regs.map(r => r.win);
    const n = seq.length, n1 = seq.filter(Boolean).length, n2 = n - n1;
    let runs = n ? 1 : 0, maxW = 0, maxL = 0, cur = 0;
    const tamanhos = { W: {}, L: {} };
    for (let i = 0; i < n; i++) {
        if (i > 0 && seq[i] !== seq[i - 1]) { runs++; const k = seq[i - 1] ? "W" : "L"; tamanhos[k][cur] = (tamanhos[k][cur] || 0) + 1; cur = 0; }
        cur++;
        if (seq[i]) maxW = Math.max(maxW, cur); else maxL = Math.max(maxL, cur);
    }
    if (n) { const k = seq[n - 1] ? "W" : "L"; tamanhos[k][cur] = (tamanhos[k][cur] || 0) + 1; }
    const esperado = 2 * n1 * n2 / n + 1, variancia = 2 * n1 * n2 * (2 * n1 * n2 - n) / (n * n * (n - 1));
    const z = variancia > 0 ? (runs - esperado) / Math.sqrt(variancia) : null;

    // P(WIN | os k anteriores foram ...), na ordem de fechamento
    const cond = (padrao) => {
        const k = padrao.length; let tot = 0, w = 0;
        for (let i = k; i < n; i++) {
            let ok = true;
            for (let j = 0; j < k; j++) if (seq[i - k + j] !== (padrao[j] === "W")) { ok = false; break; }
            if (ok) { tot++; if (seq[i]) w++; }
        }
        return { padrao, n: tot, winPct: tot ? r1(100 * w / tot) : null };
    };
    const padroes = ["W", "L", "WW", "LL", "WL", "LW", "WWW", "LLL", "WWL", "LLW", "WLL", "LWW", "LLLL", "WWWW"].map(cond);

    // autocorrelação do resultado (lag 1..5) na ordem de fechamento
    const p = n1 / n, x = seq.map(v => (v ? 1 : 0) - p), den = x.reduce((s, v) => s + v * v, 0);
    const autocorr = [1, 2, 3, 4, 5].map(l => ({ lag: l, r: r2(x.slice(l).reduce((s, v, i) => s + v * x[i], 0) / den) }));

    // leitura UTILIZÁVEL: ordem de abertura; só conta o que fechou ANTES de o sinal abrir
    const porAbertura = [...regs].sort((a, b) => a.t - b.t), porFim = [...regs].sort((a, b) => a.fim - b.fim);
    const util = { aposW: [0, 0], aposL: [0, 0], aposWW: [0, 0], aposLL: [0, 0], aposLLL: [0, 0], aposWWW: [0, 0], mesmoParAposW: [0, 0], mesmoParAposL: [0, 0] };
    const soma = (k, win) => { util[k][0]++; if (win) util[k][1]++; };
    for (const r of porAbertura) {
        const antes = porFim.filter(o => o.fim < r.t);
        const u = antes.slice(-3).map(o => o.win);
        if (u.length >= 1) soma(u[u.length - 1] ? "aposW" : "aposL", r.win);
        if (u.length >= 2 && u[u.length - 1] === u[u.length - 2]) soma(u[u.length - 1] ? "aposWW" : "aposLL", r.win);
        if (u.length === 3 && u[0] === u[1] && u[1] === u[2]) soma(u[0] ? "aposWWW" : "aposLLL", r.win);
        const mp = antes.filter(o => o.par === r.par).slice(-1)[0];
        if (mp) soma(mp.win ? "mesmoParAposW" : "mesmoParAposL", r.win);
    }
    const utilizavel = Object.fromEntries(Object.entries(util).map(([k, [t, w]]) => [k, { n: t, winPct: t ? r1(100 * w / t) : null }]));

    // posição do sinal dentro do dia (1º, 2º... pela abertura) e semana a semana
    const ordemNoDia = {}; const cont = {};
    for (const r of porAbertura) { cont[r.dia] = (cont[r.dia] || 0) + 1; const pos = cont[r.dia] <= 3 ? "sinais 1-3 do dia" : cont[r.dia] <= 8 ? "sinais 4-8 do dia" : "sinais 9+ do dia"; (ordemNoDia[pos] = ordemNoDia[pos] || [0, 0])[0]++; if (r.win) ordemNoDia[pos][1]++; }
    const posicaoNoDia = Object.entries(ordemNoDia).map(([k, [t, w]]) => ({ faixa: k, n: t, winPct: r1(100 * w / t) }));
    const semana = (r) => { const d = new Date(Date.parse(r.dia + "T12:00:00Z")); const seg = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000); return seg.toISOString().slice(0, 10); };
    const porSemana = agrupar(regs, semana).sort((a, b) => String(a.chave).localeCompare(String(b.chave))).map(g => ({ semanaDe: g.chave, n: g.n, win: g.win, loss: g.loss, acertoPct: g.acertoPct, liqPorOp: g.liqPorOp }));
    // blocos de 50 na ordem de fechamento
    const blocos50 = []; for (let i = 0; i < n; i += 50) { const b = seq.slice(i, i + 50); blocos50.push({ de: i + 1, ate: i + b.length, winPct: r1(100 * b.filter(Boolean).length / b.length) }); }

    const assimetricas = regs.filter(r => !r.simetrico).map(r => ({ par: r.par, direcao: r.direcao, dia: r.dia, tp: r1(r.tp), sl: r1(r.sl), resultado: r.win ? "WIN" : "LOSS", usd: r.usd }));
    // custo: spread da tabela como fração do SL, por par
    const custoPorPar = agrupar(regs, "par").map(g => { const rr = regs.filter(r => r.par === g.chave); return { par: g.chave, n: g.n, slMedio: r1(media(rr.map(r => r.sl))), spread: rr[0].spread, spreadPctDoSl: r1(100 * media(rr.map(r => r.spread / r.sl))), empatePct: r1(100 * media(rr.map(r => (r.sl + r.spread) / (r.tp + r.sl)))), acertoPct: g.acertoPct }; }).sort((a, b) => a.spreadPctDoSl - b.spreadPctDoSl);

    return { n, wins: n1, losses: n2, rachas: { observadas: runs, esperadasSeFosseAcaso: r1(esperado), z: z === null ? null : r2(z), maiorSequenciaWin: maxW, maiorSequenciaLoss: maxL, tamanhos },
        padroes, autocorr, utilizavel, posicaoNoDia, porSemana, blocos50, assimetricas, custoPorPar };
}

// ---------------------------------------------------
// BUSCA AMPLA DE PADRÕES (pedido do usuário em 10/11/2026: "ache se existem outras sequências de Win e Loss padronizadas").
// Testa TODOS os padrões de 1 a 5 resultados (62) como "o que vem depois", em 3 ordens:
//   FECH  = ordem de fechamento global (o que aparece no histórico; tem a ilusão das posições simultâneas)
//   ENTR  = na hora de ABRIR cada sinal, os últimos resultados JÁ FECHADOS (única leitura utilizável na prática)
//   PAR   = sequência de cada par (o app só tem 1 posição por par, então o anterior do par sempre já fechou)
// + periodicidade ("a cada N": posição i mod N, N = 2..8) e efeito de TEMPO (minutos desde o último LOSS/WIN fechado; LOSS nas últimas 2 h).
// Significância por PERMUTAÇÃO com correção da busca inteira (estatística máxima): embaralha os resultados (a) livremente e (b) só DENTRO
// de cada dia (mantém o "dia bom/dia ruim" e testa se a ORDEM traz algo além disso). p_familia < 0,05 = sobrevive à busca.
// ---------------------------------------------------
function rngSemente(seed) { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }
const TODOS_PADROES = (() => { const out = []; for (let k = 1; k <= 5; k++) for (let m = 0; m < (1 << k); m++) { let p = ""; for (let j = k - 1; j >= 0; j--) p += (m >> j) & 1 ? "W" : "L"; out.push(p); } return out; })();

function historicos(regs, wins) {
    // regs: lista base (com t abertura, fim, par, dia); wins: array paralelo de resultados (permite permutar)
    const idx = regs.map((_, i) => i);
    const porFim = [...idx].sort((a, b) => regs[a].fim - regs[b].fim);
    const porAbr = [...idx].sort((a, b) => regs[a].t - regs[b].t);
    const ch = (i) => (wins[i] ? "W" : "L");
    // FECH: histórico = os 5 anteriores na ordem de fechamento
    const fech = porFim.map((i, k) => ({ hist: porFim.slice(Math.max(0, k - 5), k).map(ch).join(""), win: wins[i] }));
    // ENTR: ao abrir, os últimos 5 já fechados (fim < abertura)
    const entr = []; let ptr = 0; const fechados = [];
    for (const i of porAbr) {
        while (ptr < porFim.length && regs[porFim[ptr]].fim < regs[i].t) { fechados.push(porFim[ptr]); ptr++; }
        entr.push({ hist: fechados.slice(-5).map(ch).join(""), win: wins[i] });
    }
    // PAR: sequência por par (ordem de abertura dentro do par)
    const par = []; const ultimos = {};
    for (const i of porAbr) { const h = ultimos[regs[i].par] || []; par.push({ hist: h.slice(-5).map(ch).join(""), win: wins[i] }); ultimos[regs[i].par] = [...h, i]; }
    return { FECH: fech, ENTR: entr, PAR: par, porFim, porAbr };
}

function estatPadroes(lista, base, nMin) {
    const out = [];
    for (const p of TODOS_PADROES) {
        let n = 0, w = 0;
        for (const x of lista) if (x.hist.length >= p.length && x.hist.endsWith(p)) { n++; if (x.win) w++; }
        if (n < nMin) continue;
        const z = (w - n * base) / Math.sqrt(n * base * (1 - base));
        out.push({ padrao: p, n, winPct: r1(100 * w / n), z: r2(z) });
    }
    return out;
}

function estatPeriodo(seqWins) {   // "a cada N": acerto por posição i mod N; devolve o maior desvio padronizado entre as posições
    const n = seqWins.length, base = seqWins.filter(Boolean).length / n, out = [];
    for (let N = 2; N <= 8; N++) {
        let maxZ = 0, pior = null;
        for (let r = 0; r < N; r++) {
            let c = 0, w = 0; for (let i = r; i < n; i += N) { c++; if (seqWins[i]) w++; }
            const z = (w - c * base) / Math.sqrt(c * base * (1 - base));
            if (Math.abs(z) > Math.abs(maxZ)) { maxZ = z; pior = { posicao: r + 1, n: c, winPct: r1(100 * w / c) }; }
        }
        out.push({ aCada: N, ...pior, z: r2(maxZ) });
    }
    return out;
}

function buscaPadroes(historico, { limite = 400, perms = 1000, nMin = 15, semente = 20261110 } = {}) {
    const fe = selecionarFechadas(historico).slice(0, limite);
    const regs = fe.map(s => ({ ...registro(s), fim: Number(s.fimOperacao) }));
    const wins = regs.map(r => r.win), base = wins.filter(Boolean).length / wins.length;
    const ordens = ["FECH", "ENTR", "PAR"];
    const calc = (w) => {
        const h = historicos(regs, w);
        const pad = Object.fromEntries(ordens.map(o => [o, estatPadroes(h[o], base, nMin)]));
        const per = { FECH: estatPeriodo(h.porFim.map(i => w[i])), ENTR: estatPeriodo(h.porAbr.map(i => w[i])) };
        return { pad, per };
    };
    const obs = calc(wins);
    const maxAbs = (arr) => arr.reduce((m, x) => Math.max(m, Math.abs(x.z)), 0);

    // nulos por permutação: livre e dentro do dia
    const rnd = rngSemente(semente);
    const embaralhar = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const porDia = {}; regs.forEach((r, i) => (porDia[r.dia] = porDia[r.dia] || []).push(i));
    const nulos = { livre: { FECH: [], ENTR: [], PAR: [], perFECH: [], perENTR: [] }, dentroDoDia: { FECH: [], ENTR: [], PAR: [], perFECH: [], perENTR: [] } };
    for (let k = 0; k < perms; k++) {
        for (const tipo of ["livre", "dentroDoDia"]) {
            let w;
            if (tipo === "livre") w = embaralhar(wins);
            else { w = [...wins]; for (const ids of Object.values(porDia)) { const v = embaralhar(ids.map(i => wins[i])); ids.forEach((i, j) => (w[i] = v[j])); } }
            const c = calc(w);
            for (const o of ordens) nulos[tipo][o].push(maxAbs(c.pad[o]));
            nulos[tipo].perFECH.push(maxAbs(c.per.FECH)); nulos[tipo].perENTR.push(maxAbs(c.per.ENTR));
        }
    }
    const pFam = (z, dist) => r2((dist.filter(m => m >= Math.abs(z)).length + 1) / (dist.length + 1));
    const top = (o) => [...obs.pad[o]].sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 8)
        .map(x => ({ ...x, pFamiliaLivre: pFam(x.z, nulos.livre[o]), pFamiliaDentroDoDia: pFam(x.z, nulos.dentroDoDia[o]) }));
    const per = (o) => obs.per[o].map(x => ({ ...x, pFamiliaLivre: pFam(x.z, nulos.livre["per" + o]), pFamiliaDentroDoDia: pFam(x.z, nulos.dentroDoDia["per" + o]) }));

    // efeito de TEMPO (ordem de abertura; só o que já fechou), descritivo com z contra a base
    const porFim = [...regs].sort((a, b) => a.fim - b.fim), porAbr = [...regs].sort((a, b) => a.t - b.t);
    const balde = (min) => min === null ? "nenhum ainda" : min < 30 ? "< 30 min" : min < 120 ? "30 min - 2 h" : min < 360 ? "2 - 6 h" : min < 1440 ? "6 - 24 h" : "> 24 h";
    const acc = { desdeLoss: {}, desdeWin: {}, lossUltimas2h: {} };
    const add = (g, k, win) => { (acc[g][k] = acc[g][k] || [0, 0])[0]++; if (win) acc[g][k][1]++; };
    for (const r of porAbr) {
        const antes = porFim.filter(o => o.fim < r.t);
        const ultL = [...antes].reverse().find(o => !o.win), ultW = [...antes].reverse().find(o => o.win);
        add("desdeLoss", balde(ultL ? (r.t - ultL.fim) / 60000 : null), r.win);
        add("desdeWin", balde(ultW ? (r.t - ultW.fim) / 60000 : null), r.win);
        const l2 = antes.filter(o => !o.win && r.t - o.fim <= 2 * 3600e3).length;
        add("lossUltimas2h", l2 >= 3 ? "3+" : String(l2), r.win);
    }
    const tempo = Object.fromEntries(Object.entries(acc).map(([g, m]) => [g, Object.entries(m).map(([k, [n, w]]) => ({ faixa: k, n, winPct: r1(100 * w / n), z: r2((w - n * base) / Math.sqrt(n * base * (1 - base))) }))]));

    const testados = ordens.reduce((s, o) => s + obs.pad[o].length, 0) + 14;
    return { n: regs.length, baseWinPct: r1(100 * base), permutacoes: perms, padroesTestados: testados, nMinimo: nMin,
        topFECH: top("FECH"), topENTR: top("ENTR"), topPAR: top("PAR"), periodoFECH: per("FECH"), periodoENTR: per("ENTR"), tempo };
}

module.exports = { analisar, sequencias, buscaPadroes, ladoDolar, registro, agrupar, TODOS_PADROES };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        console.log(`documentos lidos: ${h.length}`);
        console.log(JSON.stringify(analisar(h), null, 1));
        // segunda parte em uma linha por chave e SEM chaves: o GitHub mascara "{" e "}" no log (fazem parte do secret da credencial)
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        console.log("=== SEQUENCIAS ===");
        for (const [k, v] of Object.entries(sequencias(h))) console.log(`SEQ ${k} = ${semChaves(v)}`);
        console.log("=== BUSCA DE PADROES ===");
        for (const [k, v] of Object.entries(buscaPadroes(h))) console.log(`PAD ${k} = ${semChaves(v)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
