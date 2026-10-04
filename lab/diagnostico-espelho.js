// ===================================================
// FOREX ASSIST - LABORATÓRIO - DIAGNÓSTICO DO ESPELHO (SOMENTE LEITURA, projeto LAB)
//
// Pergunta: "se o sinal tivesse saído invertido, os ganhos viram os perdidos?" Isso só vale quando o
// alvo é IGUAL ao stop (TP = SL). Separa as entradas OFICIAL em simétricas e assimétricas e mostra,
// para cada grupo, acerto do direto, do inverso e do sorteado, e a soma direto + inverso (que seria
// ~100% menos o custo se o espelho valesse).
// ===================================================

function resumo(lista, nome, log) {
    const n = lista.length;
    if (!n) { log(`${nome}: nenhum caso`); return; }
    const taxa = (id) => {
        const v = lista.map(e => e.variantes[id]).filter(v => v && Number.isFinite(v.p));
        return { n: v.length, p: v.length ? (100 * v.filter(x => x.p > 0).length) / v.length : NaN, e: v.length ? v.reduce((s, x) => s + x.p, 0) / v.length : NaN };
    };
    const d = taxa("ATUAL"), i = taxa("INVERSO"), a = taxa("ALEATORIO");
    log(`${nome.padEnd(34)} n=${String(n).padStart(3)} | direto ${d.p.toFixed(1)}% (${d.e.toFixed(2)} pips/op) | inverso ${i.p.toFixed(1)}% (${i.e.toFixed(2)}) | sorteado ${a.p.toFixed(1)}% (${a.e.toFixed(2)}) | direto+inverso = ${(d.p + i.p).toFixed(1)}%`);
}

async function diagnosticar({ lab, log = console.log }) {
    const snap = await lab.collection("entradas").where("tipo", "==", "OFICIAL").get();
    const es = [];
    snap.forEach(d => es.push(d.data()));
    const razao = (e) => e.tpPips / e.slPips;
    const sim = es.filter(e => Math.abs(razao(e) - 1) < 0.03);
    const ass = es.filter(e => Math.abs(razao(e) - 1) >= 0.03);
    log(`Entradas OFICIAL: ${es.length}`);
    const faixas = {};
    for (const e of es) { const k = razao(e).toFixed(2); faixas[k] = (faixas[k] || 0) + 1; }
    log("Razão TP/SL (pips) -> quantidade: " + Object.entries(faixas).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join("  "));
    log("");
    resumo(es, "Todas", log);
    resumo(sim, "TP = SL (simétricas)", log);
    resumo(ass, "TP != SL (assimétricas)", log);
    log("");
    log("Se o espelho valesse (TP = SL, sem custo), direto + inverso ~ 100%. Com spread cada lado perde ~(spread/2xSL): ~92%.");
    return { total: es.length, simetricas: sim.length, assimetricas: ass.length };
}

module.exports = { diagnosticar };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
        await diagnosticar({ lab });
    })().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });
}
