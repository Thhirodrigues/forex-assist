// ===================================================
// FOREX ASSIST - LABORATÓRIO - VALIDAÇÃO DO ROTULADOR (SOMENTE LEITURA)
//
// Cruza as entradas OFICIAL do laboratório (o que o scanner aprovou) com o resultado REAL em
// `historico` do mesmo sinal. Pergunta: o simulador, com os mesmos candles, chega ao mesmo
// WIN/LOSS que o checker oficial? Roda a variante ATUAL de duas formas:
//   - spread 0: deve bater com o oficial (o checker real não modela spread). Divergência aqui
//     = bug do simulador ou diferença de candles/horários -> investigar.
//   - spread da tabela: divergência em relação ao spread 0 é o efeito do custo, esperado.
// Não grava nada em nenhum dos dois bancos. Gasta ~1 consulta TwelveData por par (KEY_3).
// ===================================================

const { simularOperacao } = require("./simulador");
const { candlesNumericos } = require("./rotulador");

const iso = (ms) => (Number.isFinite(Number(ms)) ? new Date(Number(ms)).toISOString().slice(5, 16).replace("T", " ") : "-");

async function validar({ ofic, lab, getCandles, esperar = (ms) => new Promise(r => setTimeout(r, ms)), log = console.log }) {

    const snapLab = await lab.collection("entradas").where("tipo", "==", "OFICIAL").get();
    const entradas = [];
    snapLab.forEach(d => entradas.push(d.data()));
    entradas.sort((a, b) => a.t - b.t);
    if (!entradas.length) { log("Nenhuma entrada OFICIAL no laboratório ainda."); return { ok: true }; }

    const minT = entradas[0].t - 10 * 60000;
    const snapH = await ofic.collection("historico").where("timestamp", ">", minT).orderBy("timestamp").get();
    const reais = [];
    snapH.forEach(d => {
        const o = d.data();
        if (o.resultado === "WIN" || o.resultado === "LOSS") reais.push({ id: d.id, ...o });
    });
    log(`Entradas OFICIAL do lab: ${entradas.length} | operações reais encerradas desde ${iso(minT)}: ${reais.length}`);

    // casamento: mesmo par, mesma direção, mesmo preço de entrada, início real até 5 min depois da análise
    const usadas = new Set();
    const pares = [];
    for (const e of entradas) {
        const r = reais.find(o => !usadas.has(o.id) && o.par === e.par && o.direcao === e.direcao &&
            Math.abs(Number(o.precoEntrada) - e.precoEntrada) < 1e-9 &&
            Number(o.inicioOperacao) >= e.t - 60000 && Number(o.inicioOperacao) <= e.t + 5 * 60000);
        if (r) usadas.add(r.id);
        pares.push({ e, r });
    }

    // candles por par (uma consulta cada) para refazer a variante ATUAL SEM spread
    const porPar = {};
    for (const { e } of pares) (porPar[e.par] = porPar[e.par] || []).push(e);
    const candles = {};
    let k = 0;
    for (const [par, lista] of Object.entries(porPar)) {
        const inicio = Math.min(...lista.map(e => e.t));
        const n = Math.min(5000, Math.ceil((Date.now() - inicio) / 300000) + 10);
        if (k++ > 0) await esperar(8000);
        candles[par] = candlesNumericos(await getCandles(par, "5min", n), inicio);
    }

    let comReal = 0, igualSem = 0, igualCom = 0;
    log("\npar      direção entrada(UTC)  | REAL            | LAB spread 0     | LAB c/ spread    | obs");
    for (const { e, r } of pares) {
        const base = { par: e.par, direcao: e.direcao, tEntrada: e.t, precoEntrada: e.precoEntrada,
            tpPips: e.tpPips, slPips: e.slPips, candles: candles[e.par] };
        const s0 = simularOperacao({ ...base, spreadPips: 0 });
        const sc = simularOperacao({ ...base, spreadPips: e.spreadPips });
        const fmt = (x) => `${(x.resultado || "-").padEnd(6)} ${x.tFechamento ? iso(x.tFechamento) : "           "}`;
        let real = "sem sinal real ", obs = "";
        if (r) {
            comReal++;
            real = `${r.resultado.padEnd(4)} ${iso(r.fimOperacao)}  `;
            const igual0 = s0.resultado === r.resultado, igualC = sc.resultado === r.resultado;
            if (igual0) igualSem++; if (igualC) igualCom++;
            obs = igual0 ? (igualC ? "ok" : "ok sem spread; spread muda o desfecho") : "DIVERGE sem spread -> investigar";
            if (r.modeloFechamento) obs += ` [${r.modeloFechamento}]`;
        } else obs = "aprovada na análise mas sem operação real casada";
        log(`${e.par.padEnd(8)} ${e.direcao.padEnd(4)}  ${iso(e.t)} | ${real} | ${fmt(s0)} | ${fmt(sc)} | ${obs}`);
    }
    const semLab = reais.filter(o => !usadas.has(o.id) && o.timestamp > minT);
    log(`\nCasadas: ${comReal}/${entradas.length}. Concordância do simulador SEM spread com o oficial: ${igualSem}/${comReal}. COM spread: ${igualCom}/${comReal}.`);
    if (semLab.length) log(`Operações reais encerradas sem entrada OFICIAL no lab: ${semLab.length} (ex.: ${semLab.slice(0, 5).map(o => `${o.par} ${iso(o.inicioOperacao)}`).join("; ")})`);
    return { ok: true, comReal, igualSem, igualCom, total: entradas.length };
}

module.exports = { validar };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const ofic = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccount.json")) }, "oficial").firestore();
        const lab = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccountLab.json")) }, "lab").firestore();
        const { getCandles } = require("../scripts/marketData");
        await validar({ ofic, lab, getCandles });
    })().catch(e => { console.error("ERRO FATAL:", e); process.exit(1); });
}
