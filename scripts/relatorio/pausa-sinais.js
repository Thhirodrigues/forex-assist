// ===================================================
// FOREX ASSIST - PAUSA DEPOIS DE UMA PERDA + SEQUÊNCIAS DE DIAS (SOMENTE LEITURA; só aviso, nada bloqueia; pré-registro 6.73)
//
// Pedido do usuário (24/11/2026): "esperar 2 ou 3 sinais depois de uma perda" nos sinais reais, só com banco e aviso, sem bloquear; e
// "quantos dias seguidos de win, quanto dura a perda depois do primeiro loss, quantas vezes se intercalam".
//
// PARTE A (regra): ordem de ABERTURA dos sinais fechados (regra 6.25). Quando um sinal do app fecha em LOSS, os próximos N sinais que ABREM
//   depois desse fechamento ficam "em pausa" (o aviso diria "espere"); uma nova perda reinicia a contagem em N (não acumula). Só conta o que
//   já estava fechado na ABERTURA do sinal (leitura utilizável). Medida: pips líquidos por operação (registro(): bruto - spread, e 0 de spread
//   nos sinais já julgados com spread). Comparação: média dos TOMADOS menos a dos EM PAUSA, IC 97,5% por blocos de dia da abertura.
// PARTE B (dias): resultado do dia (dia de Brasília do FECHAMENTO) em US$ do app e em pips líquidos; sequência de dias +/-; corridas de
//   ganho e de perda, alternâncias e teste de corridas (Wald-Wolfowitz). Descritivo (poucos dias).
// PARTE C (nível do sinal, descritivo): P(WIN | último resultado conhecido na abertura) e corridas na ordem de fechamento.
// ===================================================
const { selecionarFechadas } = require("../marco/regra625");
const { registro } = require("./analise400");

const BRT = 3 * 3600e3;
const diaBrt = (ms) => new Date(ms - BRT).toISOString().slice(0, 10);
const r2 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100;
function rng(seed) { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }

// ---------------- PARTE A ----------------
function estadoPausa(fechadas, N) {
    const sinais = fechadas.map(s => ({ ...registro(s), abre: Number(s.timestamp), fim: Number(s.fimOperacao), loss: s.resultado === "LOSS" }))
        .sort((a, b) => a.abre - b.abre);
    const fechamentos = [...sinais].sort((a, b) => a.fim - b.fim);
    let k = 0, restante = 0;
    const out = [];
    for (const s of sinais) {
        while (k < fechamentos.length && fechamentos[k].fim <= s.abre) { if (fechamentos[k].loss) restante = N; k++; }
        const pausa = restante > 0;
        if (pausa) restante--;
        out.push({ ...s, pausa });
    }
    return out;
}

function ic(dif, { B = 10000, nivel = 0.975, semente = 20261124 } = {}) {
    const porDia = new Map();
    for (const s of dif) { const g = porDia.get(s.dia) || { sT: 0, nT: 0, sP: 0, nP: 0 }; if (s.pausa) { g.sP += s.liq; g.nP++; } else { g.sT += s.liq; g.nT++; } porDia.set(s.dia, g); }
    const dias = [...porDia.values()], rnd = rng(semente), boot = [];
    for (let b = 0; b < B; b++) {
        let sT = 0, nT = 0, sP = 0, nP = 0;
        for (let i = 0; i < dias.length; i++) { const g = dias[Math.floor(rnd() * dias.length)]; sT += g.sT; nT += g.nT; sP += g.sP; nP += g.nP; }
        if (nT && nP) boot.push(sT / nT - sP / nP);
    }
    boot.sort((a, b) => a - b);
    const a = (1 - nivel) / 2, q = (p) => boot[Math.min(boot.length - 1, Math.floor(p * boot.length))];
    return boot.length ? [r2(q(a)), r2(q(1 - a))] : [null, null];
}

function regraPausa(fechadas, N) {
    const est = estadoPausa(fechadas, N).map(s => ({ ...s, dia: diaBrt(s.abre) }));
    const tom = est.filter(s => !s.pausa), pau = est.filter(s => s.pausa);
    const media = (a, k = "liq") => a.length ? a.reduce((x, s) => x + s[k], 0) / a.length : null;
    const win = (a) => a.length ? 100 * a.filter(s => !s.loss).length / a.length : null;
    const dif = media(tom) !== null && media(pau) !== null ? media(tom) - media(pau) : null;
    const icDif = ic(est);
    const dias = new Set(est.map(s => s.dia)).size;
    const util = pau.length >= 100 && dias >= 20 && icDif[0] !== null && icDif[0] > 0;
    return { N, total: est.length, tomados: tom.length, empausa: pau.length, pctEmPausa: r2(100 * pau.length / est.length), dias,
        liqTomados: r2(media(tom)), liqEmPausa: r2(media(pau)), acertoTomados: r2(win(tom)), acertoEmPausa: r2(win(pau)),
        usdTomados: r2(media(tom, "usd")), usdEmPausa: r2(media(pau, "usd")), diferenca: r2(dif), icDiferenca: icDif,
        veredito: util ? "PAUSA ÚTIL (candidata; confirmar em amostra nova)" : "SEM EVIDÊNCIA" };
}

// ---------------- PARTE B ----------------
function corridas(sinais) {                              // sinais: array de +1 / -1 (dias zerados já descartados)
    const n = sinais.length, n1 = sinais.filter(v => v > 0).length, n2 = n - n1;
    let runs = n ? 1 : 0; const tam = { G: {}, P: {} }; let cur = 0, maxG = 0, maxP = 0;
    for (let i = 0; i < n; i++) {
        if (i > 0 && sinais[i] !== sinais[i - 1]) { runs++; const c = sinais[i - 1] > 0 ? "G" : "P"; tam[c][cur] = (tam[c][cur] || 0) + 1; cur = 0; }
        cur++; if (sinais[i] > 0) maxG = Math.max(maxG, cur); else maxP = Math.max(maxP, cur);
    }
    if (n) { const c = sinais[n - 1] > 0 ? "G" : "P"; tam[c][cur] = (tam[c][cur] || 0) + 1; }
    const esp = n ? 2 * n1 * n2 / n + 1 : null, vari = n > 1 ? 2 * n1 * n2 * (2 * n1 * n2 - n) / (n * n * (n - 1)) : null;
    const z = vari > 0 ? (runs - esp) / Math.sqrt(vari) : null;
    const seg = (de, para) => { let t = 0, c = 0; for (let i = 0; i + 1 < n; i++) if (sinais[i] === de) { t++; if (sinais[i + 1] === para) c++; } return { n: t, pct: t ? r2(100 * c / t) : null }; };
    return { dias: n, ganhos: n1, perdas: n2, corridas: runs, corridasEsperadasAoAcaso: r2(esp), z: r2(z), alternancias: Math.max(0, runs - 1), maiorSequenciaGanho: maxG, maiorSequenciaPerda: maxP,
        tamanhosGanho: tam.G, tamanhosPerda: tam.P, proximoGanhaDepoisDeGanho: seg(1, 1), proximoGanhaDepoisDePerda: seg(-1, 1) };
}

function dias(fechadas) {
    const m = new Map();
    for (const s of fechadas) { const r = registro(s), d = diaBrt(Number(s.fimOperacao)); const g = m.get(d) || { dia: d, usd: 0, liq: 0, n: 0 }; g.usd += r.usd; g.liq += r.liq; g.n++; m.set(d, g); }
    const lista = [...m.values()].sort((a, b) => a.dia.localeCompare(b.dia));
    const sinal = (k) => lista.map(g => Math.sign(g[k])).filter(v => v !== 0);
    return { totalDias: lista.length, porUsd: corridas(sinal("usd")), porPipsLiquidos: corridas(sinal("liq")) };
}

// ---------------- PARTE C ----------------
function nivelSinal(fechadas) {
    const est = estadoPausa(fechadas, 1);                   // reaproveita a ordem de abertura
    const fech = [...est].sort((a, b) => a.fim - b.fim);
    let k = 0, ultimo = null; const c = { depoisWIN: { n: 0, win: 0 }, depoisLOSS: { n: 0, win: 0 } };
    for (const s of est) {
        while (k < fech.length && fech[k].fim <= s.abre) { ultimo = fech[k].loss ? "L" : "W"; k++; }
        if (!ultimo) continue;
        const g = ultimo === "W" ? c.depoisWIN : c.depoisLOSS; g.n++; if (!s.loss) g.win++;
    }
    const f = (g) => ({ n: g.n, winPct: g.n ? r2(100 * g.win / g.n) : null });
    return { depoisDeWIN: f(c.depoisWIN), depoisDeLOSS: f(c.depoisLOSS) };
}

module.exports = { estadoPausa, regraPausa, corridas, dias, nivelSinal, ic, diaBrt };

if (require.main === module) {
    (async () => {
        const admin = require("firebase-admin");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const fe = selecionarFechadas(h);
        const sc = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        console.log(`documentos: ${h.length}; fechadas (regra 6.25): ${fe.length}`);
        for (const N of [2, 3]) console.log(`PAUSA N${N} = ${sc(regraPausa(fe, N))}`);
        console.log(`SINAL nivel = ${sc(nivelSinal(fe))}`);
        const d = dias(fe);
        console.log(`DIAS usd = ${sc({ totalDias: d.totalDias, ...d.porUsd })}`);
        console.log(`DIAS pips_liquidos = ${sc(d.porPipsLiquidos)}`);
        const epoca = fe.filter(s => Number(s.spreadAplicadoPips) > 0);
        console.log(`EPOCA com_spread_no_app = ${epoca.length} fechadas (as demais foram julgadas sem spread; liq já desconta a tabela nelas)`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
