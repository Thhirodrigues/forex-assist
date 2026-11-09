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

module.exports = { analisar, ladoDolar, registro, agrupar };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        console.log(`documentos lidos: ${h.length}`);
        console.log(JSON.stringify(analisar(h), null, 1));
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
