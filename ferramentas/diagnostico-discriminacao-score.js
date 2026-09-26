// Ferramenta administrativa avulsa, SÓ LEITURA, NÃO faz parte do
// pipeline de análise/decisão do produto. Só dispara manualmente
// (workflow_dispatch), nunca por cron. Não escreve nada no Firestore.
//
// AJUSTE-031 (26/09/2026): investigação de POR QUE o score não
// discrimina WIN de LOSS (achado do AJUSTE-030: score médio WIN 73,2 vs
// LOSS 74,5; faixa 75+ acerta 38,4%, faixa 35-44 acerta 41,3%).
//
// Hipóteses testadas aqui, todas conferidas no código antes:
// 1. Rótulo contaminado: até o AJUSTE-003 (17/09/2026 11:24 UTC) o
//    checker incluía até ~50min de candles de ANTES da entrada no
//    caminho de preço (offset de timezone da TwelveData) - WIN/LOSS
//    dessas operações foi decidido em parte por preço anterior ao
//    sinal. Separa "LIMPO" (fechado depois do AJUSTE-003) do resto.
// 2. Desempate pessimista (MUD-03): TP e SL tocados no mesmo candle de
//    5min -> sempre LOSS. Detectável pelo dado salvo: LOSS com
//    maxPipsFavor >= tpPips (o TP também foi tocado, na mesma vela).
// 3. Alvo pequeno demais pro ruído: TP/SL em pips comparado ao ATR de
//    5min na entrada. Alvo < ~1 ATR = resultado decidido por ruído.
// 4. Componente do score sem poder preditivo (ou invertido): AUC por
//    componente - probabilidade de um WIN aleatório ter valor maior
//    que um LOSS aleatório. 0,5 = não discrimina nada. Com n~100, erro
//    padrão da AUC ~0,06 - só desvios acima de ~0,12 merecem atenção.

const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

const CORTE_ROTULO_LIMPO = Date.parse("2026-09-17T11:30:00Z");

function fatorPip(par) {
    return String(par || "").includes("JPY") ? 100 : 10000;
}

function pct(a, b) {
    return b ? `${((a / b) * 100).toFixed(1)}%` : "n/a";
}

function auc(wins, losses) {
    if (!wins.length || !losses.length) return null;
    let soma = 0;
    for (const w of wins) {
        for (const l of losses) {
            if (w > l) soma += 1;
            else if (w === l) soma += 0.5;
        }
    }
    return soma / (wins.length * losses.length);
}

function media(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function tabelaCategorica(titulo, ops, extrator) {
    const mapa = {};
    for (const op of ops) {
        const chave = String(extrator(op) ?? "(ausente)");
        if (!mapa[chave]) mapa[chave] = { w: 0, l: 0 };
        if (op.resultado === "WIN") mapa[chave].w++; else mapa[chave].l++;
    }
    console.log(`  ${titulo}:`);
    Object.entries(mapa)
        .sort((a, b) => (b[1].w + b[1].l) - (a[1].w + a[1].l))
        .forEach(([k, v]) => {
            console.log(`    ${k.padEnd(22)} ${String(v.w).padStart(3)}W ${String(v.l).padStart(3)}L  ${pct(v.w, v.w + v.l).padStart(6)} (n=${v.w + v.l})`);
        });
}

function tabelaFaixas(titulo, ops, extrator, faixas) {
    const mapa = {};
    for (const f of faixas) mapa[f.nome] = { w: 0, l: 0 };
    mapa["(ausente)"] = { w: 0, l: 0 };
    for (const op of ops) {
        const v = extrator(op);
        const f = v === null ? null : faixas.find(x => v >= x.min && v < x.max);
        const chave = f ? f.nome : "(ausente)";
        if (op.resultado === "WIN") mapa[chave].w++; else mapa[chave].l++;
    }
    console.log(`  ${titulo}:`);
    Object.entries(mapa).forEach(([k, v]) => {
        if (v.w + v.l === 0) return;
        console.log(`    ${k.padEnd(22)} ${String(v.w).padStart(3)}W ${String(v.l).padStart(3)}L  ${pct(v.w, v.w + v.l).padStart(6)} (n=${v.w + v.l})`);
    });
}

function relatorio(nome, ops) {

    const wins = ops.filter(o => o.resultado === "WIN");
    const losses = ops.filter(o => o.resultado === "LOSS");

    console.log("\n========================================");
    console.log(`${nome}: ${ops.length} operações | ${wins.length}W ${losses.length}L | ${pct(wins.length, ops.length)}`);
    console.log("========================================");

    const pnl = ops.map(o => num(o.resultadoFinanceiro)).filter(v => v !== null);
    const pnlW = wins.map(o => num(o.resultadoFinanceiro)).filter(v => v !== null);
    const pnlL = losses.map(o => num(o.resultadoFinanceiro)).filter(v => v !== null);
    console.log(`  P&L total: $${pnl.reduce((a, b) => a + b, 0).toFixed(2)} | média WIN: $${(media(pnlW) ?? 0).toFixed(2)} | média LOSS: $${(media(pnlL) ?? 0).toFixed(2)}`);

    // H2 - desempate pessimista
    const lossComTpTocado = losses.filter(o => {
        const tpPips = num(o?.financeiro?.tpPips);
        const favor = num(o.maxPipsFavor);
        return tpPips !== null && favor !== null && favor >= tpPips;
    });
    console.log(`\n  [H2] LOSS em que o TP TAMBÉM foi tocado (mesmo candle -> desempate pessimista): ${lossComTpTocado.length} de ${losses.length} (${pct(lossComTpTocado.length, losses.length)})`);

    tabelaCategorica("Motivo de encerramento x resultado", ops, o => o.motivoEncerramento);

    // Duração
    tabelaFaixas("Duração da operação", ops, o => {
        const t = num(o.tempoOperacao);
        return t === null ? null : t / 60000;
    }, [
        { nome: "<= 5 min", min: -Infinity, max: 5.01 },
        { nome: "5-15 min", min: 5.01, max: 15.01 },
        { nome: "15-60 min", min: 15.01, max: 60.01 },
        { nome: "1-4 h", min: 60.01, max: 240.01 },
        { nome: "> 4 h", min: 240.01, max: Infinity }
    ]);

    // H3 - alvo em unidades de ATR
    const tpEmAtr = o => {
        const tpPips = num(o?.financeiro?.tpPips);
        const atr = num(o?.indicadores?.atr);
        if (tpPips === null || atr === null || atr <= 0) return null;
        return Math.abs(tpPips) / (atr * fatorPip(o.par));
    };
    const slEmAtr = o => {
        const slPips = num(o?.financeiro?.slPips);
        const atr = num(o?.indicadores?.atr);
        if (slPips === null || atr === null || atr <= 0) return null;
        return Math.abs(slPips) / (atr * fatorPip(o.par));
    };
    const faixasAtr = [
        { nome: "< 1 ATR", min: -Infinity, max: 1 },
        { nome: "1-2 ATR", min: 1, max: 2 },
        { nome: "2-4 ATR", min: 2, max: 4 },
        { nome: "4-8 ATR", min: 4, max: 8 },
        { nome: ">= 8 ATR", min: 8, max: Infinity }
    ];
    tabelaFaixas("[H3] Distância do TP em ATR(5min)", ops, tpEmAtr, faixasAtr);
    tabelaFaixas("[H3] Distância do SL em ATR(5min)", ops, slEmAtr, faixasAtr);
    const tpsPips = ops.map(o => num(o?.financeiro?.tpPips)).filter(v => v !== null);
    const slsPips = ops.map(o => num(o?.financeiro?.slPips)).filter(v => v !== null).map(Math.abs);
    console.log(`  TP médio: ${(media(tpsPips) ?? 0).toFixed(1)} pips | SL médio: ${(media(slsPips) ?? 0).toFixed(1)} pips`);

    // H4 - AUC por componente
    console.log("\n  [H4] Poder de discriminação por componente (AUC: 0,5 = nada; >0,5 = WIN tende a ter valor MAIOR; <0,5 = invertido):");
    const componentes = [
        ["score (final)", o => num(o.score)],
        ["scoreTecnico", o => num(o.scoreTecnico)],
        ["emaScore", o => num(o.emaScore)],
        ["rsiScore", o => num(o.rsiScore)],
        ["adxScore", o => num(o.adxScore)],
        ["tendenciaScore", o => num(o.tendenciaScore)],
        ["smcScore", o => num(o.smcScore)],
        ["candlestickScore", o => num(o.candlestickScore)],
        ["confidenceMultiplier", o => num(o.confidenceMultiplier)],
        ["RSI (valor)", o => num(o?.indicadores?.rsi)],
        ["ADX (valor)", o => num(o?.indicadores?.adx)],
        ["TP em ATR", tpEmAtr],
        ["expectativa", o => num(o.expectativa ?? o?.financeiro?.expectativa)]
    ];
    for (const [nomeComp, f] of componentes) {
        const vw = wins.map(f).filter(v => v !== null);
        const vl = losses.map(f).filter(v => v !== null);
        const a = auc(vw, vl);
        const mw = media(vw), ml = media(vl);
        console.log(`    ${nomeComp.padEnd(22)} AUC ${a === null ? " n/a " : a.toFixed(3)} | média WIN ${mw === null ? "n/a" : mw.toFixed(2)} vs LOSS ${ml === null ? "n/a" : ml.toFixed(2)} (nW=${vw.length}, nL=${vl.length})`);
    }

    tabelaCategorica("Multi-timeframe", ops, o => o.multi);
    tabelaCategorica("Histórico (bônus/penalidade)", ops, o => o.historico);
    tabelaCategorica("Qualidade (rótulo)", ops, o => o.qualidade);
    tabelaCategorica("Direção", ops, o => o.direcao);
    tabelaCategorica("Ajuste automático de lote/TP/SL", ops, o => o?.financeiro?.decisaoMercado?.decisao);

    tabelaFaixas("Faixa de score", ops, o => num(o.score), [
        { nome: "35-44", min: 35, max: 45 },
        { nome: "45-54", min: 45, max: 55 },
        { nome: "55-64", min: 55, max: 65 },
        { nome: "65-74", min: 65, max: 75 },
        { nome: "75-84", min: 75, max: 85 },
        { nome: "85+", min: 85, max: Infinity },
        { nome: "< 35", min: -Infinity, max: 35 }
    ]);

    tabelaFaixas("RSI na entrada", ops, o => num(o?.indicadores?.rsi), [
        { nome: "< 30", min: -Infinity, max: 30 },
        { nome: "30-45", min: 30, max: 45 },
        { nome: "45-55", min: 45, max: 55 },
        { nome: "55-70", min: 55, max: 70 },
        { nome: ">= 70", min: 70, max: Infinity }
    ]);

    tabelaFaixas("ADX na entrada", ops, o => num(o?.indicadores?.adx), [
        { nome: "< 20", min: -Infinity, max: 20 },
        { nome: "20-25", min: 20, max: 25 },
        { nome: "25-35", min: 25, max: 35 },
        { nome: ">= 35", min: 35, max: Infinity }
    ]);

}

async function main() {

    const snap = await db.collection("historico")
        .where("resultado", "in", ["WIN", "LOSS"])
        .get();

    const todas = [];
    snap.forEach(doc => todas.push(doc.data()));

    const fimDe = o => num(o.fimOperacao) ?? num(o.timestamp);

    const limpas = todas.filter(o => (fimDe(o) ?? 0) >= CORTE_ROTULO_LIMPO);
    const antigas = todas.filter(o => (fimDe(o) ?? 0) < CORTE_ROTULO_LIMPO);

    console.log("DIAGNÓSTICO - POR QUE O SCORE NÃO DISCRIMINA (só leitura)");
    console.log(`Corte de rótulo limpo (AJUSTE-003): fechadas a partir de ${new Date(CORTE_ROTULO_LIMPO).toISOString()}`);

    relatorio("LIMPAS (fechadas depois do AJUSTE-003)", limpas);
    relatorio("ANTIGAS (rótulo potencialmente contaminado)", antigas);

    process.exit(0);

}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
