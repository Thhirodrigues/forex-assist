// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-036 (28/09/2026): testa a hipótese do usuário - "temos muito
// mais perdas por sinais positivos [fortes] do que WIN, o sinal veio
// forte mas não seguiu a tendência" - ou seja, sinais de score/ADX
// alto tendem a REVERTER em vez de continuar. Mesmo corte de rótulo
// confiável do AJUSTE-031/035.

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const CORTE_ROTULO_CONFIAVEL = Date.parse("2026-09-17T11:30:00Z");

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function tabelaFaixas(titulo, ops, extrator, faixas) {
    const mapa = {};
    for (const f of faixas) mapa[f.nome] = { w: 0, l: 0 };
    for (const op of ops) {
        const v = extrator(op);
        const f = v === null ? null : faixas.find(x => v >= x.min && v < x.max);
        if (!f) continue;
        if (op.resultado === "WIN") mapa[f.nome].w++; else mapa[f.nome].l++;
    }
    console.log(`\n${titulo}:`);
    for (const f of faixas) {
        const v = mapa[f.nome];
        const n = v.w + v.l;
        if (n === 0) { console.log(`  ${f.nome.padEnd(14)}   0W   0L    n/a (n=0)`); continue; }
        console.log(`  ${f.nome.padEnd(14)} ${String(v.w).padStart(4)}W ${String(v.l).padStart(4)}L  ${((v.w / n) * 100).toFixed(1)}% (n=${n})`);
    }
}

async function main() {

    const snap = await db.collection("historico").where("resultado", "in", ["WIN", "LOSS"]).get();
    const limpas = [];
    snap.forEach(doc => {
        const d = doc.data();
        const fim = num(d.fimOperacao) ?? num(d.timestamp);
        if (fim !== null && fim >= CORTE_ROTULO_CONFIAVEL) limpas.push(d);
    });

    console.log("DIAGNÓSTICO - SINAIS FORTES QUE REVERTEM (só leitura)");
    console.log(`Amostra: ${limpas.length} operações com rótulo confiável\n`);

    // Faixas mais finas de score, pra ver exatamente onde as perdas se concentram.
    tabelaFaixas("Por faixa de SCORE (produção)", limpas, d => num(d.score), [
        { nome: "35-44", min: 35, max: 45 },
        { nome: "45-54", min: 45, max: 55 },
        { nome: "55-64", min: 55, max: 65 },
        { nome: "65-74", min: 65, max: 75 },
        { nome: "75-84", min: 75, max: 85 },
        { nome: "85-94", min: 85, max: 95 },
        { nome: "95+", min: 95, max: 1000 }
    ]);

    tabelaFaixas("Por faixa de ADX (indicador bruto)", limpas, d => num(d?.indicadores?.adx), [
        { nome: "< 20", min: -1000, max: 20 },
        { nome: "20-25", min: 20, max: 25 },
        { nome: "25-30", min: 25, max: 30 },
        { nome: "30-35", min: 30, max: 35 },
        { nome: "35-40", min: 35, max: 40 },
        { nome: ">= 40", min: 40, max: 1000 }
    ]);

    // Hipótese específica do usuário: "veio forte mas não seguiu" - proxy
    // pra "não seguiu": maxPipsFavor pequeno (nunca chegou a ir bem a
    // favor antes de reverter) comparado a maxPipsContra grande, MESMO
    // em score/ADX alto. Olha reversão rápida: LOSS com maxPipsFavor <
    // 30% do maxPipsContra (foi contra quase direto, sem "andar" a favor).
    const scoreAlto = limpas.filter(d => (num(d.score) ?? 0) >= 75);
    const scoreAltoLoss = scoreAlto.filter(d => d.resultado === "LOSS");
    const reversaoRapida = scoreAltoLoss.filter(d => {
        const favor = Math.abs(num(d.maxPipsFavor) ?? 0);
        const contra = Math.abs(num(d.maxPipsContra) ?? 0);
        return contra > 0 && favor < contra * 0.3;
    });

    console.log(`\nEntre score>=75 (${scoreAlto.length} sinais, ${scoreAltoLoss.length} LOSS):`);
    console.log(`  LOSS que reverteram rápido (maxPipsFavor < 30% do maxPipsContra, nunca "andou a favor"): ${reversaoRapida.length} de ${scoreAltoLoss.length}`);

    const mediaFavorLossAlto = scoreAltoLoss.length ? scoreAltoLoss.reduce((s, d) => s + Math.abs(num(d.maxPipsFavor) ?? 0), 0) / scoreAltoLoss.length : null;
    const mediaContraLossAlto = scoreAltoLoss.length ? scoreAltoLoss.reduce((s, d) => s + Math.abs(num(d.maxPipsContra) ?? 0), 0) / scoreAltoLoss.length : null;
    console.log(`  Média maxPipsFavor nos LOSS de score alto: ${mediaFavorLossAlto?.toFixed(1)} | média maxPipsContra: ${mediaContraLossAlto?.toFixed(1)}`);

    process.exit(0);

}

main().catch(e => { console.error(e); process.exit(1); });
