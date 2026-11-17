// ===================================================
// FOREX ASSIST - OPERACOES DEPOIS DA 400a (pedido do usuario em 17/11/2026: "resultados desde a ultima verificacao")
//
// SOMENTE LEITURA. Mesma selecao da regra 6.25 (fechadas CONFIG desde 04/10 00:42Z, ordem de fechamento); as 400 primeiras ficam
// de fora (amostra ja analisada e congelada) e a amostra NOVA e o que vem depois. Descritivo + mesma metrica (pips liquidos por
// operacao, IC95 por blocos de dia). Nao altera nada e nao decide nada: so mostra se a semana boa e ruido, regime ou mudanca real.
// ===================================================
const { selecionarFechadas, metricas } = require("../marco/regra625");
const { registro } = require("./analise400");

const BRT = 3 * 3600e3;
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const semanaBrt = (ms) => {                       // segunda-feira (Brasilia) que abre a semana do sinal
    const d = new Date(ms - BRT); const dow = (d.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10);
};

function agregar(regs, chave) {
    const m = new Map();
    for (const r of regs) {
        const k = chave(r);
        if (!m.has(k)) m.set(k, { chave: k, n: 0, win: 0, usd: 0, liq: 0, pares: new Set() });
        const g = m.get(k); g.n++; g.win += r.win ? 1 : 0; g.usd += r.usd; g.liq += r.liq; g.pares.add(r.par);
    }
    return [...m.values()].sort((a, b) => String(a.chave).localeCompare(String(b.chave))).map(g => (
        { chave: g.chave, n: g.n, win: g.win, acertoPct: r1(100 * g.win / g.n), usd: r2(g.usd), liqPorOp: r2(g.liq / g.n), pares: g.pares.size }));
}

function depois400(historico, { apos = 400 } = {}) {
    const fe = selecionarFechadas(historico);
    const novas = fe.slice(apos), antigas = fe.slice(0, apos);
    const regs = novas.map(s => ({ ...registro(s), semana: semanaBrt(Number(s.timestamp)) }));
    const tps = [...new Set(novas.map(s => `${s.financeiro.tpPips}/${s.financeiro.slPips}`))];
    const lotes = [...new Set(novas.map(s => String(s.financeiro.lote ?? s.lote ?? "?")))];
    const ladoUSD = agregar(regs, r => r.lado);
    let acum = 0, pico = 0, pior = 0;
    for (const r of regs) { acum += r.usd; pico = Math.max(pico, acum); pior = Math.min(pior, acum - pico); }
    return {
        fechadasTotal: fe.length, novasDepoisDaApos: novas.length, abertasAgora: historico.filter(s => s.status === "ABERTA").length,
        primeiraNovaFechouUtc: novas.length ? new Date(novas[0].fimOperacao).toISOString() : null,
        ultimaNovaFechouUtc: novas.length ? new Date(novas[novas.length - 1].fimOperacao).toISOString() : null,
        tpSlDistintos: tps.slice(0, 12), lotesDistintos: lotes.slice(0, 6),
        usdTotalNovas: r2(regs.reduce((a, r) => a + r.usd, 0)), quedaMaximaUsd: r2(pior),
        metricaNovas: metricas(novas, `depois das ${apos}`), metricaPrimeiras: metricas(antigas, `${apos} primeiras`),
        porSemana: agregar(regs, r => r.semana), porDia: agregar(regs, r => r.dia), porPar: agregar(regs, r => r.par).sort((a, b) => b.n - a.n),
        porLadoDolar: ladoUSD, porHora: agregar(regs, r => String(r.hora).padStart(2, "0"))
    };
}

module.exports = { depois400, semanaBrt };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        console.log(`documentos lidos: ${h.length}`);
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");   // GitHub mascara chaves no log
        const r = depois400(h);
        for (const [k, v] of Object.entries(r)) console.log(`DEP ${k} = ${semChaves(v)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
