// ===================================================
// FOREX ASSIST - SEMANAS BOAS x FATOR DE MERCADO (pedido do usuario em 17/11/2026; SOMENTE LEITURA)
//
// Pergunta: "a que voce atribui a melhora dessa semana? as outras semanas boas tem algo de mercado em comum, ja que o app nao foi mexido?"
// Parte A: rejulga com bid/ask da XM as operacoes DEPOIS da 400a (velas M5 exportadas, ate 13/11).
// Parte B: por semana (e por dia, Brasilia): resultado do sistema (app e XM) x o que o mercado fez, medido nas MESMAS velas M5 da XM:
//   cesta do dolar = media dos 7 pares com USD (sinal: USD/XXX +, XXX/USD -) em log; mede deriva (% no periodo), caminho (soma das
//   variacoes horarias) e eficiencia (deriva / caminho: 1 = tendencia limpa, perto de 0 = vai e volta).
// DESCRITIVO: ~6 semanas e ~30 dias nao sustentam teste formal; serve para dizer SE o ganho acompanha o dolar, nao para criar filtro.
// ===================================================
const fs = require("fs");
const { lerCsv, paraUtc, rejulgar, julgarVariante } = require("./rejulgar");
const { selecionarFechadas } = require("../marco/regra625");
const { registro } = require("../relatorio/analise400");
const { semanaBrt } = require("../relatorio/depois400");
const { spearman } = require("./gestao-busca");

const H = 3600e3, BRT = 3 * H;
const SINAL = { USDJPY: 1, USDCHF: 1, USDCAD: 1, EURUSD: -1, GBPUSD: -1, AUDUSD: -1, NZDUSD: -1 };   // +: dolar forte quando o par sobe
const r2 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100;
const r3 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
const diaBrt = (ms) => new Date(ms - BRT).toISOString().slice(0, 10);
const inicioDiaBrt = (dia) => Date.parse(dia + "T00:00:00Z") + BRT;

// nivel horario da cesta (log, em %): so horas em que os 7 pares tem vela
function nivelCesta(barrasUtc) {
    const porHora = {};
    for (const [sym, sg] of Object.entries(SINAL)) {
        const arr = barrasUtc[sym]; if (!arr) return [];
        for (const b of arr) { const h = Math.floor(b.ms / H); (porHora[h] = porHora[h] || {})[sym] = sg * Math.log(b.c) * 100; }
    }
    return Object.entries(porHora).filter(([, v]) => Object.keys(v).length === 7)
        .map(([h, v]) => ({ h: Number(h), lvl: Object.values(v).reduce((a, x) => a + x, 0) / 7 })).sort((a, b) => a.h - b.h);
}

// deriva (%), caminho (%) e eficiencia entre dois instantes (ms)
function periodoCesta(niveis, ms0, ms1) {
    const l = niveis.filter(x => x.h * H >= ms0 && x.h * H < ms1);
    if (l.length < 4) return null;
    let caminho = 0; for (let i = 1; i < l.length; i++) caminho += Math.abs(l[i].lvl - l[i - 1].lvl);
    const deriva = l[l.length - 1].lvl - l[0].lvl;
    return { derivaPct: r3(deriva), caminhoPct: r3(caminho), eficiencia: caminho ? r3(Math.abs(deriva) / caminho) : null, horas: l.length };
}

function agregarSistema(regs, chave) {
    const m = new Map();
    for (const r of regs) {
        const k = chave(r);
        if (!m.has(k)) m.set(k, { k, n: 0, win: 0, usd: 0, liq: 0, lado: { comprado: [0, 0], vendido: [0, 0], cruzado: [0, 0] } });
        const g = m.get(k); g.n++; g.win += r.win ? 1 : 0; g.usd += r.usd; g.liq += r.liq;
        g.lado[r.lado][0]++; g.lado[r.lado][1] += r.win ? 1 : 0;
    }
    return [...m.values()].sort((a, b) => a.k.localeCompare(b.k));
}
const ladoTxt = (l) => Object.fromEntries(Object.entries(l).map(([k, [n, w]]) => [k, `${w}/${n}`]));

function semanal(fe, barras, trXm) {
    const niveis = nivelCesta(barras);
    const regs = fe.map(s => ({ ...registro(s), semana: semanaBrt(Number(s.timestamp)), ts: Number(s.timestamp) }));
    const xmPorSem = {};
    for (const x of trXm) { const k = semanaBrt(x.ts); (xmPorSem[k] = xmPorSem[k] || []).push(x); }
    return agregarSistema(regs, r => r.semana).map(g => {
        const ini = Date.parse(g.k + "T00:00:00Z") + BRT, mer = periodoCesta(niveis, ini, ini + 7 * 24 * H);
        const xm = xmPorSem[g.k] || [];
        const net = g.lado.comprado[0] - g.lado.vendido[0];
        return { semana: g.k, n: g.n, acertoPct: r2(100 * g.win / g.n), usdApp: r2(g.usd), liqPipsPorOp: r2(g.liq / g.n),
            xmN: xm.length, xmAcertoPct: xm.length ? r2(100 * xm.filter(x => x.win).length / xm.length) : null, xmPipsPorOp: xm.length ? r2(xm.reduce((a, x) => a + x.pnl, 0) / xm.length) : null,
            ladoAcertos: ladoTxt(g.lado), exposicaoLiquidaDolar: r2(net / g.n), mercado: mer };
    });
}

function diario(fe, barras) {
    const niveis = nivelCesta(barras);
    const regs = fe.map(s => ({ ...registro(s), ts: Number(s.timestamp) }));
    const dias = agregarSistema(regs, r => r.dia).map(g => {
        const ini = inicioDiaBrt(g.k), mer = periodoCesta(niveis, ini, ini + 24 * H);
        return { dia: g.k, n: g.n, win: g.win, usd: g.usd, liq: g.liq, ladoRaw: g.lado, exposicao: (g.lado.comprado[0] - g.lado.vendido[0]) / g.n, mercado: mer };
    }).filter(d => d.mercado);
    // por operacao: o lado apostado bate com a direcao do dolar NAQUELE dia (deriva > +-0,3%)?
    const cel = { subindo: { comprado: [0, 0], vendido: [0, 0], cruzado: [0, 0] }, caindo: { comprado: [0, 0], vendido: [0, 0], cruzado: [0, 0] }, neutro: { comprado: [0, 0], vendido: [0, 0], cruzado: [0, 0] } };
    const porDia = Object.fromEntries(dias.map(d => [d.dia, d.mercado.derivaPct]));
    for (const r of regs) {
        const m = porDia[r.dia]; if (m === undefined) continue;
        const reg = m > 0.3 ? "subindo" : m < -0.3 ? "caindo" : "neutro";
        cel[reg][r.lado][0]++; cel[reg][r.lado][1] += r.win ? 1 : 0;
    }
    const v = dias.filter(d => d.n >= 4);
    const corr = {
        dias: v.length,
        liqVsExposicaoXDeriva: r2(spearman(v.map(d => d.liq / d.n), v.map(d => d.exposicao * d.mercado.derivaPct))),
        liqVsDerivaAbs: r2(spearman(v.map(d => d.liq / d.n), v.map(d => Math.abs(d.mercado.derivaPct)))),
        liqVsEficiencia: r2(spearman(v.map(d => d.liq / d.n), v.map(d => d.mercado.eficiencia))),
        liqVsCaminho: r2(spearman(v.map(d => d.liq / d.n), v.map(d => d.mercado.caminhoPct)))
    };
    return { dias: dias.map(d => ({ dia: d.dia, n: d.n, acertoPct: r2(100 * d.win / d.n), usd: r2(d.usd), liqPorOp: r2(d.liq / d.n), exposicao: r2(d.exposicao), derivaDolarPct: d.mercado.derivaPct, eficiencia: d.mercado.eficiencia, caminhoPct: d.mercado.caminhoPct })),
        ladoXdolar: Object.fromEntries(Object.entries(cel).map(([k, v]) => [k, ladoTxt(v)])), correlacaoSpearman: corr };
}

module.exports = { nivelCesta, periodoCesta, semanal, diario, SINAL };

if (require.main === module) {
    (async () => {
        const arqs = process.argv.slice(2).filter(x => fs.existsSync(x));
        if (!arqs.length) { console.log("nenhum arquivo de barras encontrado"); process.exit(0); }
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const fe = selecionarFechadas(h);
        const parsed = lerCsv(arqs.map(x => fs.readFileSync(x, "utf8")).join("\n"));
        const barras = paraUtc(parsed, "regra");
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        console.log(`fechadas: ${fe.length}; barras: ${Object.entries(parsed.barras).map(([k, v]) => `${k} ${v.length}`).join(" | ")}`);
        // Parte A: operacoes depois da 400a, rejulgadas com bid/ask da XM
        const depois = fe.slice(400);
        const res = rejulgar(depois, parsed);
        for (const k of ["sinais", "comDadosXM", "decididosWinLoss", "matriz", "concordanciaWinLossPct", "acertoAppPct", "acertoXmPct", "gapPips", "app", "xmAmbiguoComoLoss", "xmSemAmbiguos"])
            console.log(`A ${k} = ${semChaves(res[k])}`);
        // Parte B: semanas e dias x cesta do dolar (todas as fechadas; XM com SL x1)
        const trXm = julgarVariante(fe, parsed, { slMult: 1 });
        for (const l of semanal(fe, barras, trXm)) console.log(`SEM ${semChaves(l)}`);
        const d = diario(fe, barras);
        for (const l of d.dias) console.log(`DIA ${semChaves(l)}`);
        console.log(`LADOxDOLAR ${semChaves(d.ladoXdolar)}`);
        console.log(`CORR ${semChaves(d.correlacaoSpearman)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
