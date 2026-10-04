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
const { FAMILIAS, sinaisParaAnalises } = require("./familias");

const TAM_CHUNK = 8000;
const LINHAS_POR_DOC = 1500;
const chavePar = (par) => par.replace("/", "_");

// ---- compactação em BINÁRIO (Float64): o Firestore indexa cada elemento de um array e recusa >40 mil entradas
//      de índice por documento; um campo "bytes" vale 1 entrada e cabe até ~1 MB. ----
function empacotar(candles) {
    const chunks = [];
    for (let i = 0; i < candles.length; i += TAM_CHUNK) {
        const parte = candles.slice(i, i + TAM_CHUNK);
        const f = new Float64Array(parte.length * 5);
        parte.forEach((c, j) => { f[j * 5] = c.ts; f[j * 5 + 1] = c.o; f[j * 5 + 2] = c.h; f[j * 5 + 3] = c.l; f[j * 5 + 4] = c.c; });
        chunks.push({ k: chunks.length, n: parte.length, ini: parte[0].ts, fim: parte[parte.length - 1].ts, dados: Buffer.from(f.buffer) });
    }
    return chunks;
}
function numerosDe(dados) {
    if (Array.isArray(dados)) return dados;   // formato antigo (array de números)
    const b = Buffer.from(dados);
    return new Float64Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
function desempacotar(chunks) {
    const out = [];
    for (const ch of [...chunks].sort((a, b) => a.k - b.k)) {
        const d = numerosDe(ch.dados);
        for (let i = 0; i < d.length; i += 5) out.push({ ts: d[i], o: d[i + 1], h: d[i + 2], l: d[i + 3], c: d[i + 4] });
    }
    return out;
}

const sanos = (cs) => cs.filter(c => [c.o, c.h, c.l, c.c].every(Number.isFinite) && c.h >= c.l && mercadoForexAberto(c.ts));

async function baixarETudo({ lab, pares, dias, chave, log = console.log, baixar = baixarHistorico, forcar = false }) {
    for (const par of pares) {
        // já guardado e cobrindo o período? pula (0 crédito), a menos que LAB_REBAIXAR=1
        if (!forcar) {
            const existente = await lab.collection("candles").where("par", "==", par).get();
            const cs = [];
            existente.forEach(d => cs.push(d.data()));
            if (cs.length) {
                const ini = Math.min(...cs.map(c => c.ini)), fim = Math.max(...cs.map(c => c.fim));
                if ((fim - ini) / 86400000 >= dias * 0.95) { log(`${par}: já guardado (${((fim - ini) / 86400000).toFixed(0)} dias); pulando o download`); continue; }
            }
        }
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

// Estende o histórico guardado PARA TRÁS (só baixa o trecho que falta; reescreve os pedaços já ordenados)
async function estenderHistorico({ lab, pares, ateDias, chave, agora = Date.now(), log = console.log, baixar = baixarHistorico, ler = lerCandles }) {
    const alvo = agora - ateDias * 86400000;
    for (const par of pares) {
        const existentes = await ler({ lab, par });
        if (!existentes.length) { log(`${par}: nada guardado; use o modo baixar`); continue; }
        const ini = existentes[0].ts;
        if (ini <= alvo + 86400000) { log(`${par}: já cobre até ${new Date(ini).toISOString().slice(0, 10)}; pulando`); continue; }
        const r = await baixar({ par, dias: (ini - alvo) / 86400000 + 0.5, chave, agora: ini - 1000, log });
        const novos = sanos(r.candles).filter(c => c.ts < ini);
        log(`${par}: +${novos.length} candles antigos (parou: ${r.parou})`);
        if (!novos.length) continue;
        const porTs = new Map();
        for (const c of [...novos, ...existentes]) porTs.set(c.ts, c);
        const todos = [...porTs.values()].sort((a, b) => a.ts - b.ts);
        const antigos = await lab.collection("candles").where("par", "==", par).get();
        for (const d of antigos.docs || []) await d.ref.delete();
        for (const ch of empacotar(todos)) await lab.collection("candles").doc(`${chavePar(par)}_${ch.k}`).set({ par, ...ch });
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
    // controle da deriva do dólar: quanto "comprar dólar e segurar" ganhou em cada época (pips por par)
    const BASE_USD = new Set(["USD/JPY", "USD/CAD", "USD/CHF"]), COTADO_USD = new Set(["EUR/USD", "GBP/USD", "AUD/USD", "NZD/USD"]);
    const deriva = { pre: {}, pos: {} };
    for (const par of Object.keys(porPar)) {
        const lado = BASE_USD.has(par) ? 1 : COTADO_USD.has(par) ? -1 : 0;
        if (!lado) continue;
        const fator = par.includes("JPY") ? 100 : 10000;
        for (const [ep, filtro] of [["pre", (c) => c.ts < splitTs], ["pos", (c) => c.ts >= splitTs]]) {
            const cs = porPar[par].filter(filtro);
            if (cs.length > 1) deriva[ep][par] = Number((lado * (cs[cs.length - 1].c - cs[0].o) * fator).toFixed(0));
        }
    }
    // barreira por par para as famílias de sinal: mediana do stop (pips) das entradas OFICIAL do app
    const barreiras = {};
    for (const par of Object.keys(porPar)) {
        const sls = entradasTodas.filter(e => e.tipo === "OFICIAL" && e.par === par).map(e => e.slPips).sort((a, b) => a - b);
        if (sls.length) barreiras[par] = Number(sls[Math.floor(sls.length / 2)].toFixed(1));
    }
    const deltas = contarEntradas(entradasTodas);
    const linhas = Object.values(deltas).map(d => ({
        tipo: d.tipo, variante: d.variante, epoca: d.epoca, grupo: d.grupo, n: d.n, pos: d.pos, neg: d.neg, zero: d.zero,
        pips: Number(d.pips.toFixed(2)), pips2: Number((d.pips2 || 0).toFixed(2)), dur: d.dur, amb: d.amb, ab: d.ab || 0
    }));
    return { linhas, totais, ini, fim, splitTs, entradas: entradasTodas.length, deriva, barreiras, porPar };
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
        entradas: resultado.entradas, deriva: resultado.deriva || null, params, docsDeLinhas: nDocs
    });
    return nDocs;
}

// ---- famílias de sinal (pré-registradas em 6.18): mesmos candles, mesma divisão de épocas, mesmo simulador ----
const VARIANTES_FAMILIA = ["ATUAL", "ATUAL_SEM_SPREAD", "INVERSO", "ALEATORIO"];

async function familiasETudo({ porPar, barreiras, splitTs, fim, log = console.log, familias = Object.keys(FAMILIAS) }) {
    const saida = {};
    for (const f of familias) {
        const entradas = [];
        let nSinais = 0;
        for (const par of Object.keys(porPar)) {
            if (!barreiras[par]) continue;
            const c5 = porPar[par];
            const sinais = FAMILIAS[f].gerar(c5, par);
            const analises = sinaisParaAnalises({ par, c5, sinais, barreiraPips: barreiras[par] });
            nSinais += analises.length;
            const cm = c5.map(x => ({ timestamp: x.ts, open: x.o, high: x.h, low: x.l, close: x.c }));
            const out = processarPar({ par, analises, abertas: [], ultimoLab: null, candles: cm, registradoEm: splitTs, agora: fim });
            entradas.push(...out.entradas.filter(e => e.tipo === "OFICIAL"));
        }
        const deltas = contarEntradas(entradas, { tetos: [] });
        const linhas = Object.values(deltas)
            .filter(d => d.grupo === "TODOS" && VARIANTES_FAMILIA.includes(d.variante))
            .map(d => ({ variante: d.variante, epoca: d.epoca, n: d.n, pos: d.pos, neg: d.neg, zero: d.zero, pips: Number(d.pips.toFixed(2)), pips2: Number(d.pips2.toFixed(2)), ab: d.ab || 0 }));
        saida[f] = { nome: FAMILIAS[f].nome, nSinais, linhas };
        log(`${f} ${FAMILIAS[f].nome}: ${nSinais} sinais, ${entradas.length} entradas`);
    }
    return saida;
}

async function publicarFamilias({ lab, familias, meta, agora = Date.now() }) {
    await lab.collection("replay").doc("familias").set({ geradoEm: agora, ...meta, familias });
}

module.exports = { empacotar, desempacotar, baixarETudo, estenderHistorico, replayETudo, publicarReplay, lerCandles, sanos, familiasETudo, publicarFamilias };

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

        if (modo === "estender") {
            await estenderHistorico({ lab, pares, ateDias: dias, chave: process.env.API_KEY_3 || process.env.API_KEY_1 });
        }
        if (modo === "familias-rep") {
            // MESMAS famílias/parâmetros/barreiras do registro 6.18, agora em período independente (6.19)
            const ant = (await lab.collection("replay").doc("familias").get()).data();
            const porPar = {};
            let ini = Infinity, fim = -Infinity;
            for (const par of pares) { const c = await lerCandles({ lab, par }); if (c.length > 700) { porPar[par] = c; ini = Math.min(ini, c[0].ts); fim = Math.max(fim, c[c.length - 1].ts); } }
            const splitTs = Number(process.env.LAB_SPLIT_TS) || ant.ini;   // `pre` = ANTES do período do registro (novo); `pos` = o período já visto
            console.log(`Replicação: ${new Date(ini).toISOString()} a ${new Date(fim).toISOString()}; período NOVO = antes de ${new Date(splitTs).toISOString()}`);
            const familias = await familiasETudo({ porPar, barreiras: ant.barreiras, splitTs, fim });
            const doc = { geradoEm: Date.now(), ini, fim, splitTs, barreiras: ant.barreiras, pares, familias };
            for (let tentativa = 1; ; tentativa++) {   // a computação longa pode deixar a conexão gRPC velha: tenta de novo
                try { await lab.collection("replay").doc("familias_rep").set(doc); break; }
                catch (e) { if (tentativa >= 4) throw e; console.log(`gravação falhou (${e.message}); tentativa ${tentativa + 1}/4`); await new Promise(r => setTimeout(r, 3000 * tentativa)); }
            }
            console.log("Replicação publicada em replay/familias_rep (epoca `pre` = período novo, `pos` = período já visto).");
        }
        if (modo === "familias") {
            const configuracao = { perfil: "balanceado", cooldown: 30, candles: 500, lote: 0.04, tp: 5, sl: 5, tipoConta: "SIMULADA", saldoInicial: 1000, ...config };
            const base = await replayETudo({ lab, config: configuracao, pares, split, passo });   // só para a barreira por par (stop mediano do app)
            console.log("Barreiras (stop mediano do app, pips):", JSON.stringify(base.barreiras));
            const familias = await familiasETudo({ porPar: base.porPar, barreiras: base.barreiras, splitTs: base.splitTs, fim: base.fim });
            for (let tentativa = 1; ; tentativa++) {
                try { await publicarFamilias({ lab, familias, meta: { ini: base.ini, fim: base.fim, splitTs: base.splitTs, barreiras: base.barreiras, pares } }); break; }
                catch (e) { if (tentativa >= 4) throw e; console.log(`gravação falhou (${e.message}); tentativa ${tentativa + 1}/4`); await new Promise(r => setTimeout(r, 3000 * tentativa)); }
            }
            console.log("Famílias publicadas em replay/familias.");
        }
        if (modo === "baixar" || modo === "ambos") {
            await baixarETudo({ lab, pares, dias, chave: process.env.API_KEY_3 || process.env.API_KEY_1, forcar: process.env.LAB_REBAIXAR === "1" });
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
