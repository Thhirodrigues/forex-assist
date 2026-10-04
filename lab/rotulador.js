// ===================================================
// FOREX ASSIST - LABORATÓRIO - ROTULADOR (GitHub Action, fora do pipeline de sinais)
//
// Lê `analises` do projeto OFICIAL (SOMENTE LEITURA) e grava tudo no projeto LAB
// (forex-assist-lab): entradas com o desfecho de cada variante de saída, contadores por
// tipo/variante/época e um cursor. Nunca escreve no projeto oficial, nunca manda push,
// nunca mexe em `historico`. Ver DOCUMENTACAO/LABORATORIO-E-ANALISES.md (6.7, 6.8).
//
// Variáveis: LAB_DRY=1 (lê e calcula, não grava nada), LAB_BACKFILL_HORAS (1ª execução).
// Credenciais: serviceAccount.json (oficial, leitura) e serviceAccountLab.json (laboratório).
// Chave TwelveData: só a KEY_3 do workflow (API_KEY_1/2/3 apontam para ela).
// ===================================================

const CFG = require("./config");
const { processarPar, direcaoDaAnalise } = require("./nucleo");
const { mercadoForexAberto } = require("../scripts/horarioMercado");

const chavePar = (par) => par.replace("/", "_");
const dorme = (ms) => new Promise(r => setTimeout(r, ms));

function candlesNumericos(brutos, desde) {
    return brutos
        .map(c => ({
            timestamp: new Date(c.datetime.replace(" ", "T") + "Z").getTime(),
            open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close)
        }))
        .filter(c => c.timestamp >= desde)
        // mesmo filtro do checker oficial (AJUSTE-066): candle fora do horário não é preço negociável
        .filter(c => mercadoForexAberto(c.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp);
}

async function executar({ ofic, lab, getCandles, increment, agora = Date.now(), dry = false, esperar = dorme, log = console.log }) {

    const controleRef = lab.collection("controle").doc("rotulador");
    const ctrlSnap = await controleRef.get();
    const ctrl = ctrlSnap.exists ? ctrlSnap.data() : {};

    const registradoEm = ctrl.registradoEm || agora;
    const backfillMs = Number(process.env.LAB_BACKFILL_HORAS || CFG.BACKFILL_HORAS_PADRAO) * 3600e3;
    const cursorPar = { ...(ctrl.cursorPar || {}) };
    const ultimoLabPar = ctrl.ultimoLab || {};

    if (!ctrlSnap.exists) {
        log(`Primeira execução: registradoEm=${new Date(registradoEm).toISOString()} (análises anteriores = pré-registro)`);
        if (!dry) await controleRef.set({ registradoEm, criadoEm: agora });
    }

    // ---- 1) análises novas (oficial, leitura) ----
    // cursorGlobal avança sempre; cursorPar[par] só existe para segurar um par que FALHOU
    // (a leitura recomeça do menor cursor, o resto é filtrado por par abaixo).
    const cursorGlobal = ctrl.cursorGlobal ?? (agora - backfillMs);
    const cursorMin = Math.min(cursorGlobal, ...Object.values(cursorPar));
    const snap = await ofic.collection("analises")
        .where("timestamp", ">", cursorMin)
        .orderBy("timestamp").limit(CFG.LIMITE_LEITURA).get();

    const analises = [];
    snap.forEach(d => analises.push({ id: d.id, ...d.data() }));
    const truncado = analises.length >= CFG.LIMITE_LEITURA;
    const lidoAte = analises.length ? analises[analises.length - 1].timestamp : null;
    log(`Análises lidas: ${analises.length}${truncado ? " (limite - o resto fica para a próxima)" : ""}`);

    const porPar = {};
    for (const a of analises) (porPar[a.par] = porPar[a.par] || []).push(a);

    // ---- 2) entradas do laboratório ainda abertas ----
    const abertasSnap = await lab.collection("entradas").where("resolvida", "==", false).get();
    const abertasPorPar = {};
    abertasSnap.forEach(d => { const e = d.data(); (abertasPorPar[e.par] = abertasPorPar[e.par] || []).push(e); });

    const pares = [...new Set([...Object.keys(porPar), ...Object.keys(abertasPorPar)])];
    let falhas = 0, buscas = 0;
    const totalIgn = { semDirecao: 0, semTpSl: 0, cooldown: 0 };

    for (const par of pares) {

        const cursor = cursorPar[chavePar(par)] ?? cursorGlobal;
        const novas = (porPar[par] || []).filter(a => a.timestamp > cursor);
        const abertas = abertasPorPar[par] || [];

        const util = novas.some(a => direcaoDaAnalise(a) && Math.abs(Number(a.tpPips)) > 0 &&
            Math.abs(Number(a.slPips)) > 0 && Number.isFinite(Number(a.precoEntrada)));
        if (!abertas.length && !util) {
            // nada para simular; só avança o cursor (conta as ignoradas)
            const r = processarPar({ par, analises: novas, abertas: [], ultimoLab: ultimoLabPar[chavePar(par)] || null, candles: [], registradoEm, agora });
            for (const k of Object.keys(totalIgn)) totalIgn[k] += r.ignoradas[k];
            continue;
        }

        try {

            const inicio = Math.min(...novas.map(a => a.timestamp), ...abertas.map(e => e.t));
            const outputsize = Math.min(5000, Math.ceil((agora - inicio) / 300000) + 10);
            if (buscas++ > 0) await esperar(CFG.INTERVALO_ENTRE_PARES_MS);
            const candles = candlesNumericos(await getCandles(par, "5min", outputsize), inicio);

            const r = processarPar({
                par, analises: novas, abertas,
                ultimoLab: ultimoLabPar[chavePar(par)] || null,
                candles, registradoEm, agora
            });
            for (const k of Object.keys(totalIgn)) totalIgn[k] += r.ignoradas[k];

            const novasEntradas = r.entradas.filter(e => !abertas.some(x => x.id === e.id)).length;
            log(`${par}: ${novas.length} análises novas, ${novasEntradas} entradas novas, ${abertas.length} abertas retomadas, ${candles.length} candles ` +
                `| ignoradas: sem direção ${r.ignoradas.semDirecao}, sem TP/SL ${r.ignoradas.semTpSl}, cooldown ${r.ignoradas.cooldown}`);

            if (dry) continue;

            // entradas (idempotente) em lotes; contadores + cursor + estado no ÚLTIMO lote do par
            const docs = r.entradas;
            for (let i = 0; i < docs.length; i += 400) {
                const lote = lab.batch();
                docs.slice(i, i + 400).forEach(e => lote.set(lab.collection("entradas").doc(e.id), e));
                if (i + 400 >= docs.length) {
                    for (const [chave, d] of Object.entries(r.deltas)) {
                        lote.set(lab.collection("resumo").doc(chave), {
                            tipo: d.tipo, variante: d.variante, epoca: d.epoca,
                            n: increment(d.n), pos: increment(d.pos), neg: increment(d.neg), zero: increment(d.zero),
                            pips: increment(d.pips), dur: increment(d.dur), amb: increment(d.amb)
                        }, { merge: true });
                    }
                    const extra = { cursorPar: {}, ultimoLab: {} };
                    if (lidoAte) extra.cursorPar[chavePar(par)] = lidoAte;
                    if (r.ultimoLab) extra.ultimoLab[chavePar(par)] = r.ultimoLab;
                    lote.set(controleRef, extra, { merge: true });
                }
                await lote.commit();
            }
            if (!docs.length) {
                const lote = lab.batch();
                const extra = { cursorPar: {} };
                if (lidoAte) extra.cursorPar[chavePar(par)] = lidoAte;
                lote.set(controleRef, extra, { merge: true });
                await lote.commit();
            }

        } catch (e) {
            falhas++;
            log(`ERRO em ${par}: ${e.message} (cursor NÃO avança; tenta de novo na próxima execução)`);
            // segura o par no cursor antigo para o avanço global não pular as análises dele
            if (!dry) await controleRef.set({ cursorPar: { [chavePar(par)]: cursor } }, { merge: true }).catch(() => {});
        }
    }

    if (lidoAte && !dry) await controleRef.set({ cursorGlobal: lidoAte }, { merge: true });
    log(`Ignoradas no total: sem direção ${totalIgn.semDirecao}, sem TP/SL ${totalIgn.semTpSl}, cooldown ${totalIgn.cooldown}`);
    return { falhas, buscas };

}

async function imprimirResumo(lab, log = console.log) {
    const snap = await lab.collection("resumo").get();
    const linhas = [];
    snap.forEach(d => linhas.push(d.data()));
    linhas.sort((a, b) => (a.tipo + a.epoca + a.variante).localeCompare(b.tipo + b.epoca + b.variante));
    log("\n=== PLACAR DO LABORATÓRIO (pips líquidos de spread; 'pre' = dados anteriores ao registro, NÃO é prova) ===");
    log("tipo     época  variante         n   acerto  zero  exp(pips/op)  dur(min)  ambíguas");
    for (const l of linhas) {
        const acerto = l.n ? (100 * l.pos / l.n).toFixed(0) + "%" : "-";
        log(`${l.tipo.padEnd(8)} ${l.epoca.padEnd(5)} ${l.variante.padEnd(15)} ${String(l.n).padStart(3)}  ${acerto.padStart(6)}  ${String(l.zero).padStart(4)}  ` +
            `${(l.n ? (l.pips / l.n).toFixed(2) : "-").padStart(12)}  ${(l.n ? Math.round(l.dur / l.n) : "-").toString().padStart(8)}  ${String(l.amb).padStart(8)}`);
    }
}

module.exports = { executar, imprimirResumo, candlesNumericos };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const ofic = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccount.json")) }, "oficial").firestore();
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
        lab.settings({ ignoreUndefinedProperties: true });
        const { getCandles } = require("../scripts/marketData");
        const dry = process.env.LAB_DRY === "1";
        // mercado fechado: nada novo a rotular e cada consulta gasta crédito (mesma regra do checker)
        if (!mercadoForexAberto() && process.env.LAB_IGNORAR_HORARIO !== "1") {
            console.log("Mercado de forex fechado - nada a rotular agora (LAB_IGNORAR_HORARIO=1 força).");
            return;
        }
        console.log(`Rotulador do Laboratório${dry ? " (DRY: não grava nada)" : ""}`);
        const { falhas } = await executar({ ofic, lab, getCandles, increment: admin.firestore.FieldValue.increment, dry });
        if (!dry) await imprimirResumo(lab);
        if (falhas) { console.log(`\n${falhas} par(es) com ERRO - ver acima.`); process.exitCode = 1; }
    })().catch(e => { console.error("ERRO FATAL:", e); process.exit(1); });
}
