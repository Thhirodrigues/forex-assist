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
const { construirContexto } = require("./contexto");
const { mercadoForexAberto } = require("../scripts/horarioMercado");

const JANELA_VOTO_MS = 30 * 60000;

const chavePar = (par) => par.replace("/", "_");
const dorme = (ms) => new Promise(r => setTimeout(r, ms));

// Firestore que não responde (banco não criado, API desligada, credencial errada) pode
// ficar tentando de novo por minutos sem erro nenhum: falhar alto, com nome, em 45 s.
function comTimeout(promessa, rotulo, ms = 45000) {
    let t;
    const limite = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`TIMEOUT ${ms / 1000}s em: ${rotulo} (banco criado? API Firestore ativa? credencial do projeto certo?)`)), ms); });
    return Promise.race([promessa, limite]).finally(() => clearTimeout(t));
}

function candlesNumericos(brutos, desde = -Infinity) {
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
    const ctrlSnap = await comTimeout(controleRef.get(), "ler controle/rotulador no projeto LAB");
    const ctrl = ctrlSnap.exists ? ctrlSnap.data() : {};

    const registradoEm = ctrl.registradoEm || agora;
    const backfillMs = Number(process.env.LAB_BACKFILL_HORAS || CFG.BACKFILL_HORAS_PADRAO) * 3600e3;
    const cursorPar = { ...(ctrl.cursorPar || {}) };
    const ultimoLabPar = ctrl.ultimoLab || {};

    if (!ctrlSnap.exists) {
        log(`Primeira execução: registradoEm=${new Date(registradoEm).toISOString()} (análises anteriores = pré-registro)`);
        if (!dry) await comTimeout(controleRef.set({ registradoEm, criadoEm: agora }), "criar controle/rotulador no projeto LAB");
    }

    // ---- 1) análises novas (oficial, leitura) ----
    // cursorGlobal avança sempre; cursorPar[par] só existe para segurar um par que FALHOU
    // (a leitura recomeça do menor cursor, o resto é filtrado por par abaixo).
    const cursorGlobal = ctrl.cursorGlobal ?? (agora - backfillMs);
    const cursorMin = Math.min(cursorGlobal, ...Object.values(cursorPar));
    const snap = await comTimeout(ofic.collection("analises")
        .where("timestamp", ">", cursorMin - JANELA_VOTO_MS)   // 30 min a mais só para os votos dos outros pares (6.27); novas = > cursor, abaixo
        .orderBy("timestamp").limit(CFG.LIMITE_LEITURA).get(), "ler analises no projeto OFICIAL");

    const analises = [];
    snap.forEach(d => analises.push({ id: d.id, ...d.data() }));
    const truncado = analises.length >= CFG.LIMITE_LEITURA;
    const lidoAte = analises.length ? analises[analises.length - 1].timestamp : null;
    log(`Análises lidas: ${analises.length}${truncado ? " (limite - o resto fica para a próxima)" : ""}`);

    const porPar = {};
    for (const a of analises) (porPar[a.par] = porPar[a.par] || []).push(a);
    const porParOrdenado = porPar;   // `analises` já vem ordenado por timestamp (orderBy): serve para os votos de 6.27

    // ---- 2) entradas do laboratório ainda abertas ----
    const abertasSnap = await comTimeout(lab.collection("entradas").where("resolvida", "==", false).get(), "ler entradas abertas no projeto LAB");
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
            // 5000 candles (~17 dias de mercado) SEMPRE: custa o mesmo 1 crédito e dá o histórico anterior à entrada, que o
            // contexto de mercado do 6.27 precisa (tendência de ~10 dias e 24 h). A simulação só enxerga de `e.t` em diante.
            const outputsize = 5000;
            if (buscas++ > 0) await esperar(CFG.INTERVALO_ENTRE_PARES_MS);
            const candles = candlesNumericos(await getCandles(par, "5min", outputsize));
            // ao vivo só este par tem candles nesta execução: m10/m24 existem, a cesta do dólar (X6) fica só no replay; os votos (X8) usam as análises lidas
            const contexto = construirContexto({ candlesPorPar: { [par]: candles }, analisesPorPar: porParOrdenado });

            const r = processarPar({
                par, analises: novas, abertas,
                ultimoLab: ultimoLabPar[chavePar(par)] || null,
                candles, registradoEm, agora, contexto
            });
            for (const k of Object.keys(totalIgn)) totalIgn[k] += r.ignoradas[k];

            const novasEntradas = r.entradas.filter(e => !abertas.some(x => x.id === e.id)).length;
            log(`${par}: ${novas.length} análises novas, ${novasEntradas} entradas novas, ${abertas.length} abertas retomadas, ${candles.length} candles ` +
                `| ignoradas: sem direção ${r.ignoradas.semDirecao}, sem TP/SL ${r.ignoradas.semTpSl}, cooldown ${r.ignoradas.cooldown}`);

            if (dry) continue;

            // entradas (idempotente) em lotes; contadores + cursor + estado no ÚLTIMO lote do par
            const docs = r.entradas;
            // lotes pequenos: cada entrada carrega até 400 reanálises e o Firestore limita o lote a ~10 MB
            const TAM = 60;
            for (let i = 0; i < docs.length; i += TAM) {
                const lote = lab.batch();
                docs.slice(i, i + TAM).forEach(e => lote.set(lab.collection("entradas").doc(e.id), e));
                if (i + TAM >= docs.length) {
                    for (const [chave, d] of Object.entries(r.deltas)) {
                        lote.set(lab.collection("resumo").doc(chave), {
                            tipo: d.tipo, variante: d.variante, epoca: d.epoca, grupo: d.grupo,
                            n: increment(d.n), pos: increment(d.pos), neg: increment(d.neg), zero: increment(d.zero),
                            pips: increment(d.pips), pips2: increment(d.pips2 || 0), dur: increment(d.dur), amb: increment(d.amb), ab: increment(d.ab || 0)
                        }, { merge: true });
                    }
                    const extra = { cursorPar: {}, ultimoLab: {} };
                    if (lidoAte) extra.cursorPar[chavePar(par)] = lidoAte;
                    if (r.ultimoLab) extra.ultimoLab[chavePar(par)] = r.ultimoLab;
                    lote.set(controleRef, extra, { merge: true });
                }
                await comTimeout(lote.commit(), `gravar lote de ${par} no projeto LAB`);
            }
            if (!docs.length) {
                const lote = lab.batch();
                const extra = { cursorPar: {} };
                if (lidoAte) extra.cursorPar[chavePar(par)] = lidoAte;
                lote.set(controleRef, extra, { merge: true });
                await comTimeout(lote.commit(), `gravar cursor de ${par} no projeto LAB`);
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
    const { montarPlacar, formatarPlacar } = require("./placar");
    const snap = await lab.collection("resumo").get();
    const linhas = [];
    snap.forEach(d => linhas.push(d.data()));
    linhas.sort((a, b) => (a.tipo + a.epoca + a.variante + a.grupo).localeCompare(b.tipo + b.epoca + b.variante + b.grupo));
    log("\n=== PLACAR DO LABORATÓRIO - todas as entradas (pips líquidos de spread; 'pre' = anterior ao registro, NÃO é prova) ===");
    log("tipo     época  variante         n   acerto  zero  exp(pips/op)  dur(min)  ambíguas");
    for (const l of linhas.filter(x => (x.grupo || "TODOS") === "TODOS")) {
        const acerto = l.n ? (100 * l.pos / l.n).toFixed(0) + "%" : "-";
        log(`${l.tipo.padEnd(8)} ${l.epoca.padEnd(5)} ${l.variante.padEnd(15)} ${String(l.n).padStart(3)}  ${acerto.padStart(6)}  ${String(l.zero).padStart(4)}  ` +
            `${(l.n ? (l.pips / l.n).toFixed(2) : "-").padStart(12)}  ${(l.n ? Math.round(l.dur / l.n) : "-").toString().padStart(8)}  ${String(l.amb).padStart(8)}`);
    }
    for (const tipo of ["OFICIAL", "LAB"]) {
        for (const epoca of ["pos", "pre"]) {
            log(`\n--- HIPÓTESES H1-H5 | ${tipo} | época ${epoca}${epoca === "pre" ? " (dados que geraram a regra - sem valor de prova)" : ""} | saída ATUAL ---`);
            log(formatarPlacar(montarPlacar(linhas, { tipo, epoca })));
        }
    }
    return linhas;
}

// Publica UM documento (`placar/atual`) com todos os contadores: a aba Laboratório do app lê só
// ele (1 leitura por abertura, em vez de varrer `resumo`). Só números agregados, nada por operação.
async function publicarPlacar(lab, linhas, agora = Date.now()) {
    const ctrl = await comTimeout(lab.collection("controle").doc("rotulador").get(), "ler controle/rotulador");
    const registradoEm = ctrl.exists ? ctrl.data().registradoEm || null : null;
    const limpas = linhas.map(l => ({
        tipo: l.tipo, variante: l.variante, epoca: l.epoca, grupo: l.grupo || "TODOS",
        n: l.n || 0, pos: l.pos || 0, neg: l.neg || 0, zero: l.zero || 0,
        pips: Number((l.pips || 0).toFixed(2)), pips2: Number((l.pips2 || 0).toFixed(2)), dur: l.dur || 0, amb: l.amb || 0, ab: l.ab || 0
    }));
    await comTimeout(lab.collection("placar").doc("atual").set({ geradoEm: agora, registradoEm, linhas: limpas }), "gravar placar/atual");
    return { linhas: limpas.length };
}

module.exports = { executar, imprimirResumo, publicarPlacar, candlesNumericos };

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
        if (!dry) { const linhas = await imprimirResumo(lab); await publicarPlacar(lab, linhas); console.log("Placar publicado em placar/atual."); }
        if (falhas) { console.log(`\n${falhas} par(es) com ERRO - ver acima.`); process.exitCode = 1; }
    })().catch(e => { console.error("ERRO FATAL:", e); process.exit(1); });
}
