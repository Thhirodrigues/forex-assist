// ===================================================
// FOREX ASSIST - O APP JULGA COMO A XM? (SOMENTE LEITURA; dados reais)
//
// Pedido do usuário (24/11/2026): "preciso que o app e a XM trabalhem iguais". Pega os sinais do `historico` oficial desde `--desde` e os rejulga
// com as velas M5 reais da XM (bid/ask, `rejulgar.julgar`, vela com TP e SL juntos = AMBIGUO), e compara com o desfecho que o app registrou.
// Mostra: concordância por época (antes/depois do spread no app), tamanho da diferença de horário, e CADA divergência (sinal, resultado do app,
// resultado pelo preço da XM, diferença de minutos). Para o dia com leitura do executor, compara também com o que a XM de fato fez.
// ===================================================
const fs = require("fs");
const { lerCsv, paraUtc, julgar } = require("./rejulgar");
const BRT = 3 * 3600e3;
const mt = (par) => String(par).replace("/", "");
const hhmm = (ms) => ms == null ? null : new Date(Number(ms) - BRT).toISOString().slice(5, 16).replace("T", " ");
const r1 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10) / 10;
const mediana = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function compararSinais(historico, barras, { desde }) {
    const sel = historico.filter(s => Number(s.timestamp) >= desde && s.financeiro && Number(s.financeiro.tpPips) && Number(s.financeiro.slPips)).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    return sel.map(s => {
        const sinal = { t: Number(s.inicioOperacao || s.timestamp), direcao: s.direcao, tp: Math.abs(Number(s.financeiro.tpPips)), sl: Math.abs(Number(s.financeiro.slPips)), precoApp: Number(s.precoEntrada) };
        const arr = barras[mt(s.par)];
        const x = arr ? julgar(sinal, arr) : { estado: "SEM_DADOS" };
        const appEstado = s.status === "ENCERRADA" && (s.resultado === "WIN" || s.resultado === "LOSS") ? s.resultado : "ABERTA";
        const comSpread = Number(s.spreadAplicadoPips) > 0;
        return { id: s.id, par: s.par, dir: s.direcao, abre: Number(s.timestamp), epoca: comSpread ? "COM_SPREAD_NO_APP" : "SEM_SPREAD_NO_APP",
            app: appEstado, appFim: s.fimOperacao ? Number(s.fimOperacao) : null, xm: x.estado, xmFim: x.fimMs || null,
            difMin: appEstado !== "ABERTA" && x.fimMs ? (x.fimMs - Number(s.fimOperacao)) / 60000 : null, gapPips: x.gapPips ?? null };
    });
}

function resumo(linhas) {
    const out = {};
    for (const epoca of ["SEM_SPREAD_NO_APP", "COM_SPREAD_NO_APP"]) {
        const l = linhas.filter(x => x.epoca === epoca);
        const dec = l.filter(x => (x.app === "WIN" || x.app === "LOSS") && (x.xm === "WIN" || x.xm === "LOSS"));
        const igual = dec.filter(x => x.app === x.xm);
        const m = { appWIN_xmWIN: 0, appWIN_xmLOSS: 0, appLOSS_xmWIN: 0, appLOSS_xmLOSS: 0 };
        for (const x of dec) m[`app${x.app}_xm${x.xm}`]++;
        const difs = dec.filter(x => x.difMin !== null).map(x => Math.abs(x.difMin));
        out[epoca] = { sinais: l.length, decididosNosDois: dec.length, concordam: igual.length, pctConcordam: dec.length ? r1(100 * igual.length / dec.length) : null, matriz: m,
            xmAmbiguo: l.filter(x => x.xm === "AMBIGUO").length, appFechadoXmAberto: l.filter(x => (x.app === "WIN" || x.app === "LOSS") && x.xm === "ABERTA").length,
            appAbertoXmDecidido: l.filter(x => x.app === "ABERTA" && (x.xm === "WIN" || x.xm === "LOSS")).length, semDados: l.filter(x => x.xm === "SEM_DADOS").length,
            horarioMedianoAbsMin: r1(mediana(difs)), dentroDe15min: difs.length ? r1(100 * difs.filter(d => d <= 15).length / difs.length) : null };
    }
    return out;
}

module.exports = { compararSinais, resumo, hhmm };

if (require.main === module) {
    (async () => {
        const args = process.argv.slice(2), arqs = args.filter(a => !a.startsWith("--") && fs.existsSync(a));
        const desdeArg = args.find(a => a.startsWith("--desde=")), desde = Date.parse(desdeArg ? desdeArg.split("=")[1] : "2026-11-19T03:00:00Z");
        const diaArg = args.find(a => a.startsWith("--dia="));
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const barras = paraUtc(lerCsv(arqs.map(x => fs.readFileSync(x, "utf8")).join("\n")), "regra");
        const linhas = compararSinais(h, barras, { desde });
        const sc = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        console.log(`sinais desde ${new Date(desde).toISOString()}: ${linhas.length}`);
        for (const [k, v] of Object.entries(resumo(linhas))) console.log(`CONC ${k} = ${sc(v)}`);
        const div = linhas.filter(x => (x.app === "WIN" || x.app === "LOSS") && (x.xm === "WIN" || x.xm === "LOSS") && x.app !== x.xm);
        const outras = linhas.filter(x => (x.app === "WIN" || x.app === "LOSS") && (x.xm === "ABERTA" || x.xm === "AMBIGUO") || x.app === "ABERTA" && (x.xm === "WIN" || x.xm === "LOSS"));
        console.log(`DIVERGENTES (app x preço da XM): ${div.length}`);
        for (const x of div) console.log(`DIV ${sc({ id: x.id, app: x.app, appFim: hhmm(x.appFim), xm: x.xm, xmFim: hhmm(x.xmFim), difMin: r1(x.difMin), epoca: x.epoca })}`);
        console.log(`OUTRAS (app fechado x XM aberto/ambíguo, ou app aberto x XM decidido): ${outras.length}`);
        for (const x of outras) console.log(`OUT ${sc({ id: x.id, app: x.app, appFim: hhmm(x.appFim), xm: x.xm, xmFim: hhmm(x.xmFim) })}`);
        if (diaArg) {
            const dia = JSON.parse(fs.readFileSync(`DOCUMENTACAO/xm-executor-dias/${diaArg.split("=")[1]}.json`, "utf8"));
            console.log("EXECUTOR (app x preço da XM x o que a XM de fato fez):");
            for (const id of dia.entrou) { const x = linhas.find(l => l.id === id), r = (dia.xm_real || {})[id] || {};
                console.log(`EXE ${sc({ id, app: x && x.app, appFim: x && hhmm(x.appFim), xmPreco: x && x.xm, xmPrecoFim: x && hhmm(x.xmFim), xmReal: r.estado, xmRealFim: r.fechouBrt })}`); }
        }
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
