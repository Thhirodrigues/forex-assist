// ===================================================
// FOREX ASSIST - "QUANDO HOUVE GANHO INTERMEDIÁRIO, QUANTOS SINAIS TERMINARAM EM LOSS DEPOIS?" (SOMENTE LEITURA, dados reais)
//
// Pergunta do usuário (24/11/2026): "se quando o sistema informou um ganho intermediário, quantos sinais deram loss depois disso?".
// PARTE 1 (o que de fato aconteceu): sinais que tiveram `avisoParcial` gravado pelo checker (lucro aberto >= 60% do TP). Conta o desfecho
//   REAL de cada um e compara o que teria dado encerrar no aviso (`avisoParcial.usd`) com o desfecho que valeu.
// PARTE 2 (outros limiares, mesmos sinais reais, preço real da XM): para cada sinal fechado, até que fração do TP o preço chegou ANTES do
//   desfecho (bid/ask, regra pessimista: vela que também toca o SL não conta como "chegou"). Grade FIXA de limiares (30, 50, 60, 80% do TP),
//   todos impressos, nenhum escolhido depois. Política "encerrar ao chegar em T%" contra o desfecho normal, IC por blocos de dia.
// Descritivo: não altera sinal, conta nem banco.
// ===================================================
const fs = require("fs");
const { lerCsv, paraUtc, indiceDaVela, pipDe } = require("./rejulgar");
const mt = (par) => String(par).replace("/", "");
const pontoDe = (dig) => 1 / Math.pow(10, dig);
const r2 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100;
const LIMIARES = [30, 50, 60, 80];

// PARTE 1 ----------------------------------------------------------------------------------------------------------------------
function avisosDoApp(fechadas) {
    const com = fechadas.filter(s => s.avisoParcial), sem = fechadas.filter(s => !s.avisoParcial);
    const conta = (l) => ({ n: l.length, win: l.filter(s => s.resultado === "WIN").length, loss: l.filter(s => s.resultado === "LOSS").length });
    const c = conta(com), d = conta(sem);
    const usdValeu = com.reduce((a, s) => a + (Number(s.resultadoFinanceiro) || 0), 0);
    const usdNoAviso = com.reduce((a, s) => a + (Number(s.avisoParcial.usd) || 0), 0);
    return {
        comAviso: { ...c, pctLoss: c.n ? r2(100 * c.loss / c.n) : null }, semAviso: { ...d, pctLoss: d.n ? r2(100 * d.loss / d.n) : null },
        usdQueValeu: r2(usdValeu), usdSeEncerrasseNoAviso: r2(usdNoAviso), diferencaUsd: r2(usdNoAviso - usdValeu),
        pctMedioNoAviso: com.length ? r2(com.reduce((a, s) => a + (Number(s.avisoParcial.pctAtingido) || 0), 0) / com.length) : null
    };
}

// PARTE 2 ----------------------------------------------------------------------------------------------------------------------
// devolve { estado: WIN|LOSS|AMBIGUO|ABERTA|SEM_DADOS, alcancou: {limiar: bool}, tp, sl }
function mfeAteDesfecho(sinal, barras, limiares = LIMIARES) {
    const i = indiceDaVela(barras, sinal.t);
    if (i < 0) return { estado: "SEM_DADOS", alcancou: {}, tp: sinal.tp, sl: sinal.sl };
    const b = barras[i], pip = pipDe(b.dig), ponto = pontoDe(b.dig), compra = String(sinal.direcao).toUpperCase() === "BUY";
    const entrada = compra ? b.o + b.sp * ponto : b.o;
    const alcancou = Object.fromEntries(limiares.map(t => [t, false]));
    for (let j = i + 1; j < barras.length; j++) {
        const x = barras[j], sp = x.sp * ponto;
        const fav = (compra ? x.h - entrada : entrada - (x.l + sp)) / pip, adv = (compra ? entrada - x.l : x.h + sp - entrada) / pip;
        const EPS = 1e-9, tp = fav >= sinal.tp - EPS, sl = adv >= sinal.sl - EPS;   // tolerância contra erro de ponto flutuante (5,99999 pips)
        if (tp && sl) return { estado: "AMBIGUO", alcancou, tp: sinal.tp, sl: sinal.sl };
        if (!sl) for (const t of limiares) if (!alcancou[t] && fav >= sinal.tp * t / 100 - EPS) alcancou[t] = true;
        if (tp) return { estado: "WIN", alcancou, tp: sinal.tp, sl: sinal.sl };
        if (sl) return { estado: "LOSS", alcancou, tp: sinal.tp, sl: sinal.sl };
    }
    return { estado: "ABERTA", alcancou, tp: sinal.tp, sl: sinal.sl };
}

const pnlNormal = (r) => r.estado === "WIN" ? r.tp : -r.sl;        // AMBIGUO conta como LOSS (pior caso)

function politicaLimiar(julgados, limiar) {
    const dec = julgados.filter(x => ["WIN", "LOSS", "AMBIGUO"].includes(x.r.estado));
    const alc = dec.filter(x => x.r.alcancou[limiar]);
    const final = (x) => x.r.estado === "WIN" ? "WIN" : "LOSS";
    return {
        limiar, decididos: dec.length, alcancaram: alc.length, pctAlcancaram: dec.length ? r2(100 * alc.length / dec.length) : null,
        terminaramLoss: alc.filter(x => final(x) === "LOSS").length, pctLossDepois: alc.length ? r2(100 * alc.filter(x => final(x) === "LOSS").length / alc.length) : null,
        pnlNormal: dec.map(x => ({ ...x, v: pnlNormal(x.r) })), pnlPolitica: dec.map(x => ({ ...x, v: x.r.alcancou[limiar] ? x.r.tp * limiar / 100 : pnlNormal(x.r) }))
    };
}

function resumoPartes(julgados, icDias) {
    return LIMIARES.map(t => {
        const p = politicaLimiar(julgados, t);
        const base = icDias(p.pnlNormal, o => o.v), pol = icDias(p.pnlPolitica, o => o.v);
        const dif = icDias(p.pnlNormal.map((o, k) => ({ ...o, v: p.pnlPolitica[k].v - o.v })), o => o.v);
        return { limiar: t, decididos: p.decididos, alcancaram: p.alcancaram, pctAlcancaram: p.pctAlcancaram, terminaramLoss: p.terminaramLoss, pctLossDepois: p.pctLossDepois,
            mediaNormal: base.media, mediaPolitica: pol.media, diferenca: dif.media, icDiferenca: dif.ic, dias: dif.dias };
    });
}

module.exports = { avisosDoApp, mfeAteDesfecho, politicaLimiar, resumoPartes, LIMIARES, pnlNormal };

if (require.main === module) {
    (async () => {
        const arqs = process.argv.slice(2).filter(x => fs.existsSync(x));
        if (!arqs.length) { console.log("nenhum arquivo M5"); process.exit(0); }
        const admin = require("firebase-admin");
        const { selecionarFechadas } = require("../marco/regra625");
        const { icDias } = require("../../lab/fase0-m1");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const fechadas = selecionarFechadas(h);
        const sc = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        console.log(`documentos: ${h.length}; fechadas (regra 6.25): ${fechadas.length}`);
        console.log(`PARTE1 avisos_do_app = ${sc(avisosDoApp(fechadas))}`);
        const barras = paraUtc(lerCsv(arqs.map(x => fs.readFileSync(x, "utf8")).join("\n")), "regra");
        const julgados = fechadas.map(s => {
            const sinal = { t: Number(s.inicioOperacao || s.timestamp), par: s.par, direcao: s.direcao, tp: Math.abs(Number(s.financeiro.tpPips)), sl: Math.abs(Number(s.financeiro.slPips)) };
            const arr = barras[mt(s.par)];
            const r = arr ? mfeAteDesfecho(sinal, arr) : { estado: "SEM_DADOS", alcancou: {} };
            return { r, dia: new Date(Number(s.timestamp) - 3 * 3600e3).toISOString().slice(0, 10) };
        });
        const cont = {}; for (const x of julgados) cont[x.r.estado] = (cont[x.r.estado] || 0) + 1;
        console.log(`PARTE2 estados_XM = ${sc(cont)}`);
        for (const l of resumoPartes(julgados, icDias)) console.log(`PARTE2 limiar_${l.limiar} = ${sc(l)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
