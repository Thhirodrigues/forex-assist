// ===================================================
// FOREX ASSIST - PRÉ-REGISTRO 6.53 (T3, T4a-d, T5), APROVADO pelo usuário em 19/11/2026. SOMENTE LEITURA.
//
// T3  momento do PAR dentro da semana: na hora de cada sinal, ranking dos pares pelo resultado XM das operações da MESMA semana
//     (Brasília) que JÁ fecharam (>= 2 por par, >= 4 pares no ranking). A = par entre os 3 melhores, B = demais pares ranqueados.
// T4a ADX do par no sinal; T4b RSI a favor (compra: RSI; venda: 100 - RSI); T4c ATR/SL (ATR em pips dividido pelo SL em pips);
//     T4d score do próprio sistema. Terços da amostra: A = terço alto, B = terço baixo.
// T5  existe "efeito de semana"? soma de quadrados ENTRE semanas das médias semanais (semanas com >= 20 operações) contra 10.000
//     permutações dos DIAS entre as semanas (mantendo quantos dias cada semana tem). Efeito de semana = p < alfa.
// Métrica: pips por operação na XM (bid/ask, SL x1). 6 testes => Bonferroni alfa = 0,05/6 (IC de 99,17%, bootstrap em blocos de dia).
// T3/T4 passam se o IC EXCLUI 0 (qualquer lado) E a diferença sem a semana de 09/11 tem o MESMO sinal. Falhou = encerrado sem variantes.
// ===================================================
const fs = require("fs");
const { lerCsv, julgarVariante } = require("./rejulgar");
const { diferenca, quantil } = require("./regime");
const { semanaBrt } = require("../relatorio/depois400");

const K = 6, ALFA = 0.05 / K, NIVEL = 1 - ALFA;
const r2 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100;
const media = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const compra = (d) => /BUY|COMPRA/i.test(String(d));

function veredito(r) {
    const lo = r.ic[0], hi = r.ic[1];
    const exclui = lo !== null && hi !== null && (lo > 0 || hi < 0);
    const mesmoSinal = r.diferenca !== null && r.diferencaSemSemana0911 !== null && Math.sign(r.diferenca) === Math.sign(r.diferencaSemSemana0911);
    return { ...r, passa: exclui && mesmoSinal };
}

function t3(trades) {
    const ord = [...trades].sort((a, b) => a.t - b.t);
    const com = [];
    for (const x of ord) {
        const sem = semanaBrt(x.ts), porPar = {};
        for (const c of ord) { if (c.t >= x.t) break; if (semanaBrt(c.ts) === sem && c.fim < x.t) (porPar[c.par] = porPar[c.par] || []).push(c.pnl); }
        const rank = Object.entries(porPar).filter(([, v]) => v.length >= 2).map(([p, v]) => [p, media(v)]).sort((a, b) => b[1] - a[1]);
        if (rank.length < 4 || !rank.some(([p]) => p === x.par)) continue;
        com.push({ ...x, g: rank.slice(0, 3).some(([p]) => p === x.par) ? "A" : "B" });
    }
    return { ...veredito(diferenca(com, y => y.g, { nivel: NIVEL })), rotulos: "A = par entre os 3 melhores da semana até o sinal, B = demais ranqueados", elegiveis: com.length };
}

function tercos(trades, valor, rotulo) {
    const v = trades.map(x => ({ ...x, v: valor(x) })).filter(x => Number.isFinite(x.v));
    const c1 = quantil(v.map(x => x.v), 1 / 3), c2 = quantil(v.map(x => x.v), 2 / 3);
    const g = (x) => x.v <= c1 ? "B" : x.v > c2 ? "A" : null;
    const meio = v.filter(x => !g(x));
    return { ...veredito(diferenca(v, g, { nivel: NIVEL })), rotulos: rotulo, n: v.length, cortes: [r2(c1), r2(c2)], meio: { n: meio.length, pipsPorOp: r2(media(meio.map(x => x.pnl))) } };
}

function rng(seed) { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }
function t5(trades, { P = 10000, minOps = 20, semente = 20261119 } = {}) {
    const porSem = {}; for (const x of trades) (porSem[semanaBrt(x.ts)] = porSem[semanaBrt(x.ts)] || []).push(x);
    const semanas = Object.keys(porSem).filter(k => porSem[k].length >= minOps).sort();
    const dias = []; const slots = [];
    for (const s of semanas) {
        const pd = {}; for (const x of porSem[s]) (pd[x.dia] = pd[x.dia] || []).push(x.pnl);
        for (const v of Object.values(pd)) { dias.push(v); slots.push(s); }
    }
    const ssEntre = (atrib) => {
        const ag = {}; let tot = 0, n = 0;
        dias.forEach((v, i) => { const a = (ag[atrib[i]] = ag[atrib[i]] || [0, 0]); for (const p of v) { a[0] += p; a[1]++; tot += p; n++; } });
        const g = tot / n; return Object.values(ag).reduce((s, [sm, c]) => s + c * (sm / c - g) ** 2, 0);
    };
    const obs = ssEntre(slots), rnd = rng(semente); let maior = 0;
    for (let i = 0; i < P; i++) {
        const p = [...slots]; for (let j = p.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [p[j], p[k]] = [p[k], p[j]]; }
        if (ssEntre(p) >= obs) maior++;
    }
    const pValor = (maior + 1) / (P + 1);
    // descritivo (fora da família): autocorrelação dia a dia do resultado médio
    const diario = {}; for (const x of trades) (diario[x.dia] = diario[x.dia] || []).push(x.pnl);
    const serie = Object.keys(diario).sort().filter(d => diario[d].length >= 4).map(d => media(diario[d]));
    const m = media(serie); let num = 0, den = 0;
    for (let i = 0; i < serie.length; i++) { den += (serie[i] - m) ** 2; if (i) num += (serie[i] - m) * (serie[i - 1] - m); }
    return { semanas: semanas.map(s => ({ semana: s, n: porSem[s].length, pipsPorOp: r2(media(porSem[s].map(x => x.pnl))) })), dias: dias.length,
        somaQuadradosEntre: r2(obs), pValor: Number(pValor.toFixed(4)), alfa: Number(ALFA.toFixed(4)), efeitoDeSemana: pValor < ALFA,
        descritivoAutocorrDiaADia: { dias: serie.length, lag1: r2(den ? num / den : null) } };
}

function rodada(trades, docsPorId) {
    const com = trades.map(x => ({ ...x, doc: docsPorId[x.id] })).filter(x => x.doc);
    const ind = (x) => x.doc.indicadores || {};
    const pip = (par) => /JPY/.test(par) ? 0.01 : 0.0001;
    return {
        operacoes: com.length, nivelIc: Number(NIVEL.toFixed(4)),
        T3: t3(com),
        T4a_ADX: tercos(com, x => Number(ind(x).adx), "A = ADX alto, B = ADX baixo"),
        T4b_RSI: tercos(com, x => { const r = Number(ind(x).rsi); return Number.isFinite(r) ? (compra(x.direcao) ? r : 100 - r) : NaN; }, "A = RSI mais a favor da direção, B = menos"),
        T4c_ATRsobreSL: tercos(com, x => { const a = Number(ind(x).atr), sl = Math.abs(Number(x.doc.financeiro.slPips)); return a / pip(x.par) / sl; }, "A = ATR grande em relação ao SL, B = pequeno"),
        T4d_score: tercos(com, x => Number(x.doc.score), "A = score alto, B = score baixo"),
        T5: t5(com)
    };
}

module.exports = { t3, tercos, t5, rodada, veredito };

if (require.main === module) {
    (async () => {
        const arqs = process.argv.slice(2).filter(x => fs.existsSync(x));
        if (!arqs.length) { console.log("nenhum arquivo de barras"); process.exit(0); }
        const admin = require("firebase-admin");
        const { selecionarFechadas } = require("../marco/regra625");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const fe = selecionarFechadas(h);
        const parsed = lerCsv(arqs.map(x => fs.readFileSync(x, "utf8")).join("\n"));
        const tr = julgarVariante(fe, parsed, { slMult: 1 });
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        console.log(`fechadas: ${fe.length}; decididas na XM (SL x1): ${tr.length}`);
        for (const [k, v] of Object.entries(rodada(tr, Object.fromEntries(fe.map(d => [d.id, d]))))) console.log(`R2 ${k} = ${semChaves(v)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
