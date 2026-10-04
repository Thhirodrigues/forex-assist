// ===================================================
// FOREX ASSIST - LABORATÓRIO - REPLAY (orquestração)
//
// LAB_MODO=baixar : baixa N dias de candles de 5 min por par (TwelveData, KEY_3) e guarda COMPACTO no projeto
//                   LAB (`candles/{par}_{k}`), para repetir replays de graça (hipótese nova = 0 crédito).
// LAB_MODO=replay : lê os candles guardados + a configuração REAL (`configuracoes/geral`, só leitura no
//                   oficial), roda o pipeline barra a barra (lab/replay.js), rotula pelo núcleo do laboratório
//                   e publica `replay/atual` (+ `replay/linhas_k`). Época `pre` = exploração (primeiros
//                   LAB_SPLIT do período), `pos` = validação (resto, "dado que ninguém viu").
// LAB_MODO=ambos  : os dois.
// Não escreve nada no projeto oficial, não manda push, não toca no sinal.
// ===================================================

const { baixarHistorico } = require("./historico");
const { replayPar } = require("./replay");
const { processarPar, contarEntradas } = require("./nucleo");
const { mercadoForexAberto } = require("../scripts/horarioMercado");

const TAM_CHUNK = 8000;
const LINHAS_POR_DOC = 1500;
const chavePar = (par) => par.replace("/", "_");

// ---- compactação: arrays planos de números (o Firestore não aceita array dentro de array) ----
function empacotar(candles) {
    const chunks = [];
    for (let i = 0; i < candles.length; i += TAM_CHUNK) {
        const parte = candles.slice(i, i + TAM_CHUNK);
        const dados = [];
        for (const c of parte) dados.push(c.ts, c.o, c.h, c.l, c.c);
        chunks.push({ k: chunks.length, n: parte.length, ini: parte[0].ts, fim: parte[parte.length - 1].ts, dados });
    }
    return chunks;
}
function desempacotar(chunks) {
    const out = [];
    for (const ch of [...chunks].sort((a, b) => a.k - b.k)) {
        for (let i = 0; i < ch.dados.length; i += 5) out.push({ ts: ch.dados[i], o: ch.dados[i + 1], h: ch.dados[i + 2], l: ch.dados[i + 3], c: ch.dados[i + 4] });
    }
    return out;
}

const sanos = (cs) => cs.filter(c => [c.o, c.h, c.l, c.c].every(Number.isFinite) && c.h >= c.l && mercadoForexAberto(c.ts));

async function baixarETudo({ lab, pares, dias, chave, log = console.log, baixar = baixarHistorico }) {
    for (const par of pares) {
        const r = await baixar({ par, dias, chave, log });
        const candles = sanos(r.candles);
        log(`${par}: ${candles.length} candles em horário de mercado (parou: ${r.parou})`);
        if (!candles.length) continue;
        // apaga os pedaços antigos do par e grava os novos
        const antigos = await lab.collection("candles").where("par", "==", par).get();
        for (const d of antigos.docs || []) await d.ref.delete();
        for (const ch of empacotar(candles)) await lab.collection("candles").doc(`${chavePar(par)}_${ch.k}`).set({ par, ...ch });
    }
}

async function lerCandles({ lab, par }) {
    const snap = await lab.collection("candles").where("par", "==", par).get();
    const chunks = [];
    snap.forEach(d => chunks.push(d.data()));
    return desempacotar(chunks);
}

async function replayETudo({ lab, config, pares, split = 0.7, passo = 3, log = console.log, ler = lerCandles }) {
    const entradasTodas = [];
    const totais = { barras: 0, analises: 0, aprovadas: 0 };
    let ini = Infinity, fim = -Infinity;
    const porPar = {};
    for (const par of pares) {
        const c5 = await ler({ lab, par });
        if (c5.length < 700) { log(`${par}: candles insuficientes (${c5.length}); ignorado`); continue; }
        porPar[par] = c5;
        ini = Math.min(ini, c5[0].ts); fim = Math.max(fim, c5[c5.length - 1].ts);
    }
    const splitTs = ini + (fim - ini) * split;
    for (const par of Object.keys(porPar)) {
        const c5 = porPar[par];
        const r = await replayPar({ par, c5, configuracao: config, passo, log });
        totais.barras += r.avaliadas; totais.analises += r.analises.length; totais.aprovadas += r.aprovacoes;
        const cm = c5.map(x => ({ timestamp: x.ts, open: x.o, high: x.h, low: x.l, close: x.c }));
        const out = processarPar({ par, analises: r.analises, abertas: [], ultimoLab: null, candles: cm, registradoEm: splitTs, agora: c5[c5.length - 1].ts });
        entradasTodas.push(...out.entradas);
        log(`${par}: ${out.entradas.length} entradas rotuladas`);
    }
    const deltas = contarEntradas(entradasTodas);
    const linhas = Object.values(deltas).map(d => ({
        tipo: d.tipo, variante: d.variante, epoca: d.epoca, grupo: d.grupo, n: d.n, pos: d.pos, neg: d.neg, zero: d.zero,
        pips: Number(d.pips.toFixed(2)), dur: d.dur, amb: d.amb, ab: d.ab || 0
    }));
    return { linhas, totais, ini, fim, splitTs, entradas: entradasTodas.length };
}

async function publicarReplay({ lab, resultado, params, agora = Date.now() }) {
    const antigos = await lab.collection("replay").get();
    for (const d of antigos.docs || []) await d.ref.delete();
    const nDocs = Math.ceil(resultado.linhas.length / LINHAS_POR_DOC);
    for (let k = 0; k < nDocs; k++) {
        await lab.collection("replay").doc(`linhas_${k}`).set({ k, linhas: resultado.linhas.slice(k * LINHAS_POR_DOC, (k + 1) * LINHAS_POR_DOC) });
    }
    await lab.collection("replay").doc("atual").set({
        geradoEm: agora, ini: resultado.ini, fim: resultado.fim, splitTs: resultado.splitTs, totais: resultado.totais,
        entradas: resultado.entradas, params, docsDeLinhas: nDocs
    });
    return nDocs;
}

module.exports = { empacotar, desempacotar, baixarETudo, replayETudo, publicarReplay, lerCandles, sanos };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
        lab.settings({ ignoreUndefinedProperties: true });
        const modo = process.env.LAB_MODO || "ambos";
        const dias = Number(process.env.LAB_DIAS || 100);
        const split = Number(process.env.LAB_SPLIT || 0.7);
        const passo = Number(process.env.LAB_PASSO || 3);

        let config = {};
        let pares = (process.env.LAB_PARES || "").split(",").map(s => s.trim()).filter(Boolean);
        if (modo !== "baixar" || !pares.length) {
            const ofic = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccount.json")) }, "oficial").firestore();
            const snap = await ofic.collection("configuracoes").doc("geral").get();   // 1 leitura, só leitura
            config = snap.exists ? snap.data() : {};
            if (!pares.length) pares = config.pares || ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/JPY"];
        }
        console.log(`Replay | modo ${modo} | pares ${pares.join(", ")} | ${dias} dias | split ${split} | passo ${passo} barras`);
        console.log(`Config real: perfil=${config.perfil} lote=${config.lote} cooldown=${config.cooldown} candles=${config.candles}`);

        if (modo === "baixar" || modo === "ambos") {
            await baixarETudo({ lab, pares, dias, chave: process.env.API_KEY_3 || process.env.API_KEY_1 });
        }
        if (modo === "replay" || modo === "ambos") {
            const configuracao = { perfil: "balanceado", cooldown: 30, candles: 500, lote: 0.04, tp: 5, sl: 5, tipoConta: "SIMULADA", saldoInicial: 1000, ...config };
            const resultado = await replayETudo({ lab, config: configuracao, pares, split, passo });
            const nDocs = await publicarReplay({ lab, resultado, params: { dias, split, passo, pares, perfil: configuracao.perfil, lote: configuracao.lote } });
            console.log(`Replay publicado: ${resultado.linhas.length} linhas em ${nDocs} docs | barras ${resultado.totais.barras}, análises ${resultado.totais.analises}, aprovadas ${resultado.totais.aprovadas}, entradas ${resultado.entradas}`);
            console.log(`Período ${new Date(resultado.ini).toISOString()} a ${new Date(resultado.fim).toISOString()}; exploração até ${new Date(resultado.splitTs).toISOString()}`);
        }
    })().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });
}
