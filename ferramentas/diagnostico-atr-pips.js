// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-038 (28/09/2026): analisarATR() (marketAnalyzer.js) compara o
// ATR com limiares ABSOLUTOS de preço (0,0020 / 0,0012) - em par JPY
// (preço ~150) o ATR é ~100x maior em unidade de preço e cai sempre em
// "ALTA". Antes de corrigir, mede: distribuição do ATR EM PIPS por par
// (operações fechadas e coleção `analises`, que tem também os
// reprovados), classificação que o código atual dá, e se o ATR tem
// relação com acerto - pra que os limiares novos não sejam chutados.

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const CORTE_ROTULO_CONFIAVEL = Date.parse("2026-09-17T11:30:00Z");

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function pip(par) { return String(par).includes("JPY") ? 0.01 : 0.0001; }
function classeAtual(atr) { return atr >= 0.0020 ? "ALTA" : atr >= 0.0012 ? "NORMAL" : "BAIXA"; }
function pct(arr, p) { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
function tx(ops) { if (!ops.length) return "n/a (n=0)"; const w = ops.filter(o => o.resultado === "WIN").length; return `${(w * 100 / ops.length).toFixed(1)}% (${w}W/${ops.length - w}L, n=${ops.length})`; }

async function main() {

    const snap = await db.collection("historico").where("resultado", "in", ["WIN", "LOSS"]).get();
    const ops = [];
    snap.forEach(doc => {
        const d = doc.data();
        const fim = num(d.fimOperacao) ?? num(d.timestamp);
        const atr = num(d?.indicadores?.atr);
        if (fim === null || fim < CORTE_ROTULO_CONFIAVEL || atr === null || !d.par) return;
        ops.push({ par: d.par, resultado: d.resultado, atr, atrPips: atr / pip(d.par) });
    });

    const snapA = await db.collection("analises").select("par", "indicadores").get();
    const analises = [];
    snapA.forEach(doc => {
        const d = doc.data();
        const atr = num(d?.indicadores?.atr);
        if (atr === null || !d.par) return;
        analises.push({ par: d.par, atr, atrPips: atr / pip(d.par) });
    });

    console.log("DIAGNÓSTICO - ATR EM PIPS (só leitura)");
    console.log(`Operações fechadas com rótulo confiável: ${ops.length} | análises registradas (inclui reprovadas): ${analises.length}\n`);

    const pares = [...new Set([...ops, ...analises].map(o => o.par))].sort();

    console.log("ATR em pips por par (M5) - análises registradas | classificação do código ATUAL:");
    for (const par of pares) {
        const a = analises.filter(o => o.par === par).map(o => o.atrPips);
        const cls = analises.filter(o => o.par === par).reduce((m, o) => (m[classeAtual(o.atr)] = (m[classeAtual(o.atr)] || 0) + 1, m), {});
        if (!a.length) { console.log(`  ${par.padEnd(8)} sem análises registradas`); continue; }
        console.log(`  ${par.padEnd(8)} n=${String(a.length).padStart(4)}  p10=${pct(a, .1).toFixed(1)}  p33=${pct(a, .33).toFixed(1)}  mediana=${pct(a, .5).toFixed(1)}  p67=${pct(a, .67).toFixed(1)}  p90=${pct(a, .9).toFixed(1)}  atual=${JSON.stringify(cls)}`);
    }

    const todas = analises.map(o => o.atrPips);
    const semJPY = analises.filter(o => !o.par.includes("JPY")).map(o => o.atrPips);
    const soJPY = analises.filter(o => o.par.includes("JPY")).map(o => o.atrPips);
    console.log(`\nGeral: p33=${pct(todas, .33)?.toFixed(1)} p67=${pct(todas, .67)?.toFixed(1)} | sem JPY: p33=${pct(semJPY, .33)?.toFixed(1)} p67=${pct(semJPY, .67)?.toFixed(1)} | só JPY: p33=${pct(soJPY, .33)?.toFixed(1)} p67=${pct(soJPY, .67)?.toFixed(1)}`);

    console.log("\nAcerto por classificação do código ATUAL (operações fechadas):");
    for (const c of ["BAIXA", "NORMAL", "ALTA"]) console.log(`  ${c.padEnd(7)} ${tx(ops.filter(o => classeAtual(o.atr) === c))}`);

    console.log("\nAcerto JPY x não-JPY:");
    console.log(`  JPY      ${tx(ops.filter(o => o.par.includes("JPY")))}`);
    console.log(`  não-JPY  ${tx(ops.filter(o => !o.par.includes("JPY")))}`);

    // Tercis do ATR em pips calculados nas próprias operações.
    const p = ops.map(o => o.atrPips);
    const t1 = pct(p, 1 / 3), t2 = pct(p, 2 / 3);
    console.log(`\nAcerto por tercil de ATR em pips (tercis das operações: ${t1?.toFixed(1)} / ${t2?.toFixed(1)}):`);
    console.log(`  baixo    ${tx(ops.filter(o => o.atrPips < t1))}`);
    console.log(`  médio    ${tx(ops.filter(o => o.atrPips >= t1 && o.atrPips < t2))}`);
    console.log(`  alto     ${tx(ops.filter(o => o.atrPips >= t2))}`);

    // Relativo ao próprio par: acima/abaixo da mediana do par (análises).
    const medianaPar = {};
    for (const par of pares) { const a = analises.filter(o => o.par === par).map(o => o.atrPips); medianaPar[par] = a.length >= 20 ? pct(a, .5) : null; }
    const comMed = ops.filter(o => medianaPar[o.par] !== null);
    console.log(`\nAcerto com ATR relativo à mediana do PRÓPRIO par (n=${comMed.length}):`);
    console.log(`  abaixo da mediana do par  ${tx(comMed.filter(o => o.atrPips < medianaPar[o.par]))}`);
    console.log(`  acima da mediana do par   ${tx(comMed.filter(o => o.atrPips >= medianaPar[o.par]))}`);

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
