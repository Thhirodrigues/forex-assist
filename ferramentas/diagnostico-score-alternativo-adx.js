// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-035 (28/09/2026): teste formal da hipótese do AJUSTE-031
// (ADX/força de tendência puxando o score na direção ERRADA nos dados
// limpos - AUC 0,417, não significativo a 95% com n=114, mas a
// direção do usuário foi clara: testar antes de mexer em produção).
//
// Candidatas definidas ANTES de rodar (não escolhidas depois de ver o
// resultado, pra não cair em garimpo de hipótese sobre amostra
// pequena):
//   A) remover o componente de ADX inteiro
//   B) remover ADX e reduzir a força de tendência pela metade
//   C) inverter o sinal do ADX (penalizar ADX alto em vez de premiar)
//   D) usar só EMA+RSI, sem ADX nem tendência
// Todas testadas e reportadas juntas - nenhuma escolhida a dedo.
//
// Mesmo corte de rótulo confiável do AJUSTE-031/032 (fechado a partir
// de 17/09/2026 11:30 UTC).

const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

const CORTE_ROTULO_CONFIAVEL = Date.parse("2026-09-17T11:30:00Z");

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function auc(wins, losses) {
    if (!wins.length || !losses.length) return null;
    let soma = 0;
    for (const w of wins) for (const l of losses) {
        if (w > l) soma += 1;
        else if (w === l) soma += 0.5;
    }
    return soma / (wins.length * losses.length);
}

function erroPadraoAuc(a, nW, nL) {
    const q1 = a / (2 - a);
    const q2 = 2 * a * a / (1 + a);
    return Math.sqrt((a * (1 - a) + (nW - 1) * (q1 - a * a) + (nL - 1) * (q2 - a * a)) / (nW * nL));
}

function media(arr) {
    return arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null;
}

async function main() {

    const snap = await db.collection("historico")
        .where("resultado", "in", ["WIN", "LOSS"])
        .get();

    const limpas = [];
    snap.forEach(doc => {
        const d = doc.data();
        const fim = num(d.fimOperacao) ?? num(d.timestamp);
        if (fim !== null && fim >= CORTE_ROTULO_CONFIAVEL) limpas.push(d);
    });

    console.log("DIAGNÓSTICO - SCORE ALTERNATIVO (teste formal do ADX), só leitura");
    console.log(`Amostra: ${limpas.length} operações com rótulo confiável (fechadas >= 17/09/2026 11:30 UTC)\n`);

    const candidatas = {
        "ORIGINAL (score de produção)": d => num(d.score),
        "A) sem ADX": d => (num(d.score) ?? 0) - (num(d.adxScore) ?? 0),
        "B) sem ADX, tendência pela metade": d => (num(d.score) ?? 0) - (num(d.adxScore) ?? 0) - (num(d.tendenciaScore) ?? 0) / 2,
        "C) ADX invertido (penaliza ADX alto)": d => (num(d.score) ?? 0) - 2 * (num(d.adxScore) ?? 0),
        "D) só EMA + RSI": d => (num(d.emaScore) ?? 0) + (num(d.rsiScore) ?? 0)
    };

    for (const [nome, formula] of Object.entries(candidatas)) {

        const wins = [], losses = [];
        for (const d of limpas) {
            const v = formula(d);
            if (v === null || Number.isNaN(v)) continue;
            if (d.resultado === "WIN") wins.push(v); else losses.push(v);
        }

        const a = auc(wins, losses);
        if (a === null) { console.log(`${nome}: sem dado suficiente`); continue; }

        const se = erroPadraoAuc(a, wins.length, losses.length);
        const desvios = (0.5 - a) / se;

        console.log(`${nome}`);
        console.log(`  AUC=${a.toFixed(3)}  SE=${se.toFixed(3)}  desvios de 0.5=${desvios.toFixed(2)}  média WIN=${media(wins).toFixed(2)}  média LOSS=${media(losses).toFixed(2)}  (nW=${wins.length}, nL=${losses.length})`);

    }

    console.log("\nReferência: precisa de ~1.96 desvios de 0.5 pra significância de 95%.");

    process.exit(0);

}

main().catch(e => { console.error(e); process.exit(1); });
