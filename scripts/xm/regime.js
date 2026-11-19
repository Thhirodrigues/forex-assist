// ===================================================
// FOREX ASSIST - PRÉ-REGISTRO 6.51 (T1 regime e T2 alinhamento do dólar), TRIAGEM. SOMENTE LEITURA.
//
// Hipótese (6.50, gerada post hoc): o sistema segue tendência; ganha quando o dólar anda numa direção e perde no vai e volta.
// Aqui só entra informação conhecida ANTES do sinal: a cesta do dólar (7 pares com USD, velas M5 da XM) nas últimas 24 HORAS DE MERCADO
// (24 níveis horários já fechados antes do instante do sinal; fins de semana não contam).
//   ER24    = |deriva| / caminho (Efficiency Ratio de Kaufman; 1 = tendência limpa, ~0 = vai e volta)
//   deriva24 = variação da cesta (%; + = dólar subiu)
// T1: terços de ER24 (cortes nos percentis 33,3/66,7 da própria triagem); diferença = média(terço alto) - média(terço baixo).
// T2: só pares com USD; a favor = lado apostado na direção da deriva24; diferença = média(a favor) - média(contra).
// Métrica: pips por operação com bid/ask da XM (SL x1, spread dentro do julgamento). IC por bootstrap em BLOCOS DE DIA (10.000).
// Dois testes => Bonferroni: IC de 97,5% (quantis 1,25% e 98,75%).
// PASSA a triagem se: limite inferior do IC > 0 E a diferença SEM a semana de 09/11 continua > 0. Falhou = hipótese encerrada,
// sem variantes (outras janelas, limiares, filtros) nestes dados. Passou = confirmação em amostra FORWARD com os cortes fixados aqui.
// ===================================================
const fs = require("fs");
const { lerCsv, paraUtc, julgarVariante } = require("./rejulgar");
const { nivelCesta } = require("./semanas");
const { ladoDolar } = require("../relatorio/analise400");
const { semanaBrt } = require("../relatorio/depois400");

const H = 3600e3;
const r2 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100;
const r3 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
const media = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const SEMANA_EXCLUIDA = "2026-11-09";

// últimos k níveis horários JÁ FECHADOS antes de t (o nível da hora h é conhecido em (h+1)*H)
function antes(niveis, t, k = 24) {
    let lo = 0, hi = niveis.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if ((niveis[m].h + 1) * H <= t) { r = m; lo = m + 1; } else hi = m - 1; }
    if (r + 1 < k) return null;
    const l = niveis.slice(r - k + 1, r + 1);
    if (t - l[0].h * H > 7 * 24 * H) return null;          // lacuna longa: descarta
    let caminho = 0; for (let i = 1; i < l.length; i++) caminho += Math.abs(l[i].lvl - l[i - 1].lvl);
    const deriva = l[l.length - 1].lvl - l[0].lvl;
    return { deriva, er: caminho ? Math.abs(deriva) / caminho : 0 };
}

function quantil(a, q) { const s = [...a].sort((x, y) => x - y); if (!s.length) return null; const p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); }

// rng determinística (mesma semente => mesmo IC)
function rng(seed) { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }

// diferença de médias A - B com IC por bootstrap de dias
function diferenca(trades, grupo, { B = 10000, nivel = 0.975, semente = 20261119 } = {}) {
    const dif = (lista) => { const a = lista.filter(x => grupo(x) === "A").map(x => x.pnl), b = lista.filter(x => grupo(x) === "B").map(x => x.pnl); return a.length && b.length ? media(a) - media(b) : null; };
    const dias = [...new Set(trades.map(x => x.dia))], porDia = {};
    for (const x of trades) (porDia[x.dia] = porDia[x.dia] || []).push(x);
    const rnd = rng(semente), boot = [];
    for (let i = 0; i < B; i++) { const l = []; for (let j = 0; j < dias.length; j++) l.push(...porDia[dias[Math.floor(rnd() * dias.length)]]); const d = dif(l); if (d !== null) boot.push(d); }
    const a = (1 - nivel) / 2;
    const sem = trades.filter(x => semanaBrt(x.ts) !== SEMANA_EXCLUIDA);
    const desc = (g) => { const l = trades.filter(x => grupo(x) === g); return { n: l.length, pipsPorOp: r2(media(l.map(x => x.pnl))), acertoPct: l.length ? r2(100 * l.filter(x => x.win).length / l.length) : null }; };
    const d = dif(trades), dSem = dif(sem), ic = [r2(quantil(boot, a)), r2(quantil(boot, 1 - a))];
    return { A: desc("A"), B: desc("B"), diferenca: r2(d), ic: ic, nivelIc: nivel, dias: dias.length, diferencaSemSemana0911: r2(dSem), nSemSemana: sem.length,
        passa: ic[0] !== null && ic[0] > 0 && dSem !== null && dSem > 0 };
}

function triagem(tradesXm, barrasUtc) {
    const niveis = nivelCesta(barrasUtc);
    const com = [];
    for (const x of tradesXm) { const a = antes(niveis, x.t, 24); if (a) com.push({ ...x, er: a.er, deriva: a.deriva, lado: ladoDolar(x.par, x.direcao) }); }
    const c1 = quantil(com.map(x => x.er), 1 / 3), c2 = quantil(com.map(x => x.er), 2 / 3);
    const terco = (x) => x.er <= c1 ? "baixo" : x.er > c2 ? "alto" : "meio";
    const t1 = diferenca(com, x => terco(x) === "alto" ? "A" : terco(x) === "baixo" ? "B" : null);
    const meio = com.filter(x => terco(x) === "meio");
    const usd = com.filter(x => x.lado !== "cruzado" && x.deriva !== 0);
    const aFavor = (x) => (x.lado === "comprado") === (x.deriva > 0);
    const t2 = diferenca(usd, x => aFavor(x) ? "A" : "B");
    return { operacoes: tradesXm.length, comJanela24h: com.length, cortesER24: [r3(c1), r3(c2)],
        T1: { ...t1, rotulos: "A = terço alto de ER24 (tendência), B = terço baixo (vai e volta)", meio: { n: meio.length, pipsPorOp: r2(media(meio.map(x => x.pnl))) } },
        T2: { ...t2, rotulos: "A = a favor da deriva24 do dólar, B = contra (só pares com USD)" },
        periodo: com.length ? [new Date(Math.min(...com.map(x => x.t))).toISOString(), new Date(Math.max(...com.map(x => x.t))).toISOString()] : null };
}

module.exports = { antes, diferenca, triagem, quantil };

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
        for (const [k, v] of Object.entries(triagem(tr, paraUtc(parsed, "regra")))) console.log(`REG ${k} = ${semChaves(v)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
