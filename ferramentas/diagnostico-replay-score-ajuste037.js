// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-037 (28/09/2026): reprocessa as operações fechadas com rótulo
// confiável pelo calcularQualidade() do código que estiver no checkout
// (rodar com ref = branch da mudança pra medir o motor NOVO antes de
// ele ir pra produção). Usa os insumos salvos em cada operação
// (indicadores, estatisticas do momento da decisão, SMC/candlestick
// detectados) e compara com o score que foi salvo de verdade.
//
// Limites (reportados junto, não escondidos):
//  - Só existem operações que o motor ANTIGO aprovou - sinais que o
//    novo aprovaria e o antigo não, nunca viraram operação e não têm
//    resultado (a coleção `analises`, AJUSTE-032, resolve isso daqui
//    pra frente).
//  - A zona de ADX foi identificada NESTES MESMOS dados (AJUSTE-036):
//    AUC do score novo aqui é otimista por construção. A parte do
//    histórico não foi tirada destes dados - o efeito dela é justo.

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const { calcularQualidade } = require("../scripts/marketAnalyzer");

const CORTE_ROTULO_CONFIAVEL = Date.parse("2026-09-17T11:30:00Z");

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function auc(wins, losses) {
    if (!wins.length || !losses.length) return null;
    let s = 0;
    for (const w of wins) for (const l of losses) s += w > l ? 1 : w === l ? 0.5 : 0;
    return s / (wins.length * losses.length);
}

function se(a, nW, nL) {
    const q1 = a / (2 - a), q2 = 2 * a * a / (1 + a);
    return Math.sqrt((a * (1 - a) + (nW - 1) * (q1 - a * a) + (nL - 1) * (q2 - a * a)) / (nW * nL));
}

// Contribuição total do ADX (analisarADX + parcela do ADX em
// analisarTendencia) na tabela ANTIGA - pra variante "só histórico".
function adxAntigo(adx) {
    if (adx < 15) return 0;
    if (adx < 20) return 3;
    if (adx < 25) return 11;
    if (adx < 30) return 14;
    if (adx < 35) return 22;
    if (adx < 40) return 24;
    return 25;
}

function relatorio(nome, ops, f) {
    const wins = [], losses = [];
    for (const o of ops) { const v = f(o); if (v === null) continue; (o.resultado === "WIN" ? wins : losses).push(v); }
    const a = auc(wins, losses);
    if (a === null) return console.log(`${nome}: sem dado`);
    const e = se(a, wins.length, losses.length);
    console.log(`${nome.padEnd(34)} AUC=${a.toFixed(3)} SE=${e.toFixed(3)} (${((a - 0.5) / e).toFixed(2)} SE de 0,5)  nW=${wins.length} nL=${losses.length}`);
}

function faixas(nome, ops, f) {
    const F = [[0, 35], [35, 45], [45, 55], [55, 65], [65, 75], [75, 85], [85, 95], [95, 101]];
    console.log(`\n${nome}:`);
    for (const [mi, ma] of F) {
        const sel = ops.filter(o => { const v = f(o); return v !== null && v >= mi && v < ma; });
        if (!sel.length) { console.log(`  ${mi}-${ma - 1}`.padEnd(10) + "  n=0"); continue; }
        const w = sel.filter(o => o.resultado === "WIN").length;
        console.log(`  ${mi}-${ma - 1}`.padEnd(10) + `  ${String(w).padStart(3)}W ${String(sel.length - w).padStart(3)}L  ${(w * 100 / sel.length).toFixed(1)}% (n=${sel.length})`);
    }
}

async function main() {

    const snap = await db.collection("historico").where("resultado", "in", ["WIN", "LOSS"]).get();

    const ops = [];
    let semInsumo = 0;

    snap.forEach(doc => {
        const d = doc.data();
        const fim = num(d.fimOperacao) ?? num(d.timestamp);
        if (fim === null || fim < CORTE_ROTULO_CONFIAVEL) return;

        const i = d.indicadores || {};
        const campos = ["ema9", "ema21", "ema50", "ema100", "ema200", "rsi", "adx", "ema9_15", "ema21_15", "ema50_15", "atr"];
        if (campos.some(c => num(i[c]) === null) || !d.estatisticas) { semInsumo++; return; }

        const q = calcularQualidade(
            i.ema9, i.ema21, i.ema50, i.ema100, i.ema200,
            i.rsi, i.adx, i.ema9_15, i.ema21_15, i.ema50_15,
            d.estatisticas, i.atr,
            d.smcDetectado || null,
            d.candlestickDetectado || null
        );

        const adxNovo = q.adxScore + (q.adx === "MODERADA" || q.adx === "BOA" ? 5 : 0);

        ops.push({
            resultado: d.resultado,
            antigo: num(d.score),
            novo: q.score,
            // variante aproximada: ADX novo, histórico antigo (score salvo
            // + diferença de ADX escalada pelo multiplicador que valia).
            soADX: num(d.score) === null ? null : Math.min(100, Math.max(0, Math.round(
                num(d.score) + (adxNovo - adxAntigo(i.adx)) * (num(d.confidenceMultiplier) ?? 1)))),
            tecnicoSalvo: num(d.scoreTecnico),
            tecnicoNovo: q.scoreTecnico,
            operacoesHist: num(d.estatisticas.operacoes) ?? 0,
            historicoNovo: q.historico,
            adx: i.adx
        });
    });

    console.log("REPLAY DO SCORE - AJUSTE-037 (só leitura)");
    console.log(`Operações com rótulo confiável reprocessadas: ${ops.length} (sem insumo completo: ${semInsumo})`);
    console.log(`Com 0 operações no histórico no momento da decisão: ${ops.filter(o => o.operacoesHist === 0).length}`);
    console.log(`Histórico no motor novo: ${JSON.stringify(ops.reduce((m, o) => (m[o.historicoNovo] = (m[o.historicoNovo] || 0) + 1, m), {}))}\n`);

    // Fidelidade da reconstrução: com histórico >= 40 operações
    // (confidenceMultiplier 1,0 no antigo, peso cheio no novo) e ADX <
    // 30 (tabela igual), o motor novo tem que reproduzir o score salvo.
    // Se não reproduz, os insumos salvos não bastam pra confiar no
    // replay - reportado antes de qualquer conclusão.
    const controle = ops.filter(o => o.operacoesHist >= 40 && o.adx < 30 && o.antigo !== null);
    const iguais = controle.filter(o => Math.abs(o.novo - o.antigo) <= 1).length;
    console.log(`Fidelidade (hist >= 40 ops e ADX < 30, deveria bater): ${iguais} de ${controle.length} iguais (±1)\n`);

    relatorio("Score salvo (produção)", ops, o => o.antigo);
    relatorio("Score do motor do checkout", ops, o => o.novo);
        relatorio("Só ADX novo (histórico antigo, aprox.)", ops, o => o.soADX);
    relatorio("Score técnico salvo (EMA+RSI+tend+ADX)", ops, o => o.tecnicoSalvo);
    relatorio("Score técnico novo", ops, o => o.tecnicoNovo);
    console.log("Referência: ~1,96 SE de 0,5 = significativo a 95%. AUC do score novo é otimista (ADX tirado destes dados).");

    const tx = s => s.length ? `${(s.filter(o => o.resultado === "WIN").length * 100 / s.length).toFixed(1)}% (n=${s.length})` : "n/a";
    console.log(`\nAcerto com 0 operações no histórico: ${tx(ops.filter(o => o.operacoesHist === 0))}`);
    console.log(`Acerto com 1-39 operações:           ${tx(ops.filter(o => o.operacoesHist > 0 && o.operacoesHist < 40))}`);
    console.log(`Acerto com 40+ operações:            ${tx(ops.filter(o => o.operacoesHist >= 40))}`);

    const media = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "n/a";
    console.log(`\nMédia score: salvo ${media(ops.map(o => o.antigo).filter(v => v !== null))} | novo ${media(ops.map(o => o.novo))}`);
    console.log(`Score novo >= 95 (saturação): ${ops.filter(o => o.novo >= 95).length} de ${ops.length}`);

    for (const corte of [35, 45, 55]) {
        const a = ops.filter(o => (o.antigo ?? 0) >= corte), n = ops.filter(o => o.novo >= corte);
        const tx = s => s.length ? (s.filter(o => o.resultado === "WIN").length * 100 / s.length).toFixed(1) + "%" : "n/a";
        console.log(`Corte ${corte}: salvo aprova ${a.length} (acerto ${tx(a)}) | novo aprova ${n.length} (acerto ${tx(n)})`);
    }

    faixas("Acerto por faixa - score SALVO", ops, o => o.antigo);
    faixas("Acerto por faixa - score NOVO", ops, o => o.novo);

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
