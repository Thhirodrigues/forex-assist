// ===================================================
// FOREX ASSIST - REJULGAR OS SINAIS COM O PREÇO DA XM (SOMENTE LEITURA; não toca em sinal, conta nem banco além de ler o `historico`)
//
// Pergunta do usuário (10/11/2026): "o WIN/LOSS muda se o preço for o do MT5 e não o do TwelveData?". Base: as mesmas 400 primeiras
// (regra 6.25), velas de 5 min da XM exportadas por `mt5/XM_ExportarBarras.mq5`. Mesmo TP/SL em pips do sinal, aplicados a partir do
// preço de entrada da XM (como faz o executor).
// MODELO DA XM (velas de 5 min são BID; a XM compra no ASK = bid + spread da vela):
//   COMPRA: entra em open_bid + spread; sai no BID  -> TP se high_bid >= entrada + tp ; SL se low_bid <= entrada - sl
//   VENDA : entra em open_bid;          sai no ASK  -> TP se (low_bid + spread) <= entrada - tp ; SL se (high_bid + spread) >= entrada + sl
// Entrada = abertura da vela que contém o instante do sinal; o julgamento começa na vela SEGUINTE (a vela da entrada tem máximas e
// mínimas anteriores ao sinal: contaria movimento que já passou). Vela com TP e SL juntos = AMBIGUO (pior caso nas contas conservadoras).
// FUSO: `hora_servidor` do MT5 é hora do SERVIDOR; a XM usa GMT+3 no horário de verão dos EUA e GMT+2 fora (virou em 01/11/2026). A regra
// é aplicada por data; `escolherOffset` confere com o preço do app (o offset certo dá diferença menor).
// ===================================================
const fs = require("fs");
const { metricas } = require("../marco/regra625");
const { spreadDoPar } = require("../../lab/spreads");

const mt = (par) => String(par).replace("/", "");
const mediana = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const quantil = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const r2 = (x) => x === null || x === undefined ? null : Math.round(x * 100) / 100;

function enesimoDomingo(ano, mes, n) { const d = new Date(Date.UTC(ano, mes, 1)); const dia = 1 + ((7 - d.getUTCDay()) % 7) + 7 * (n - 1); return dia; }
// GMT+3 entre o 2º domingo de março e o 1º domingo de novembro (horário de verão dos EUA), GMT+2 no resto
function offsetServidorSeg(serverSec) {
    const y = new Date(serverSec * 1000).getUTCFullYear();
    const ini = Date.UTC(y, 2, enesimoDomingo(y, 2, 2), 2) / 1000, fim = Date.UTC(y, 10, enesimoDomingo(y, 10, 1), 2) / 1000;
    return serverSec >= ini && serverSec < fim ? 10800 : 7200;
}

function lerCsv(texto) {
    const linhas = String(texto).split(/\r?\n/).filter(Boolean);
    const m = /^offset_servidor_seg=(-?\d+)/.exec(linhas[0] || "");
    const offsetExport = m ? Number(m[1]) : null;
    const barras = {};
    for (const l of linhas.slice(2)) {
        const c = l.split(",");
        if (c.length < 8) continue;
        (barras[c[0]] = barras[c[0]] || []).push({ ts: Number(c[1]), o: Number(c[2]), h: Number(c[3]), l: Number(c[4]), c: Number(c[5]), sp: Number(c[6]), dig: Number(c[7]) });
    }
    for (const k of Object.keys(barras)) barras[k].sort((a, b) => a.ts - b.ts);
    return { offsetExport, barras };
}

// modo: "regra" (verão/inverno) ou um número fixo de segundos
function paraUtc(parsed, modo = "regra") {
    const out = {};
    for (const [sym, arr] of Object.entries(parsed.barras)) {
        out[sym] = arr.map(b => ({ ...b, ms: (b.ts - (modo === "regra" ? offsetServidorSeg(b.ts) : modo)) * 1000 }));
    }
    return out;
}

const pipDe = (dig) => 1 / Math.pow(10, dig === 3 || dig === 5 ? dig - 1 : dig);   // 1/10^k (e não 10^-k) evita erro de ponto flutuante: 5 dígitos -> 0,0001; 3 -> 0,01
const pontoDe = (dig) => 1 / Math.pow(10, dig);

// índice da vela que contém o instante (ms), ou -1 (fim de semana/lacuna: tolera até 10 min depois da abertura da vela)
function indiceDaVela(barras, ms) {
    let lo = 0, hi = barras.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (barras[m].ms <= ms) { r = m; lo = m + 1; } else hi = m - 1; }
    return r >= 0 && ms - barras[r].ms < 300000 ? r : -1;
}

function julgar(sinal, barras) {
    const i = indiceDaVela(barras, sinal.t);
    if (i < 0) return { estado: "SEM_DADOS" };
    const b = barras[i], pip = pipDe(b.dig), ponto = pontoDe(b.dig);
    const compra = String(sinal.direcao).toUpperCase() === "BUY";
    const entrada = compra ? b.o + b.sp * ponto : b.o;
    const nivelTp = compra ? entrada + sinal.tp * pip : entrada - sinal.tp * pip;
    const nivelSl = compra ? entrada - sinal.sl * pip : entrada + sinal.sl * pip;
    const gapPips = Number((((compra ? entrada - sinal.precoApp : sinal.precoApp - entrada)) / pip).toFixed(2));   // positivo = pior que o preço do app
    for (let j = i + 1; j < barras.length; j++) {
        const x = barras[j], sp = x.sp * ponto;
        const tp = compra ? x.h >= nivelTp : x.l + sp <= nivelTp;
        const sl = compra ? x.l <= nivelSl : x.h + sp >= nivelSl;
        if (tp && sl) return { estado: "AMBIGUO", gapPips, barras: j - i };
        if (tp) return { estado: "WIN", gapPips, barras: j - i };
        if (sl) return { estado: "LOSS", gapPips, barras: j - i };
    }
    return { estado: "ABERTA", gapPips };
}

// diferença mediana (pips) entre o preço do app e a abertura da vela da XM no instante do sinal, para um conjunto de barras
function distanciaMediana(sinais, barrasPorSim) {
    const d = [];
    for (const s of sinais) {
        const arr = barrasPorSim[mt(s.par)]; if (!arr) continue;
        const i = indiceDaVela(arr, s.t); if (i < 0) continue;
        d.push(Math.abs(arr[i].o - s.precoApp) / pipDe(arr[i].dig));
    }
    return d.length ? mediana(d) : null;
}
function escolherOffset(sinais, parsed) {
    const r = {};
    for (const [nome, modo] of [["regra", "regra"], ["GMT+2", 7200], ["GMT+3", 10800]]) r[nome] = distanciaMediana(sinais, paraUtc(parsed, modo));
    return r;
}

// sinais: documentos do historico JÁ selecionados (400 primeiras). Devolve só AGREGADOS (nada por sinal).
function rejulgar(sinaisDoc, parsed, { modo = "regra" } = {}) {
    const barras = paraUtc(parsed, modo);
    const sinais = sinaisDoc.map(s => ({ id: s.id, par: s.par, direcao: s.direcao, t: Number(s.inicioOperacao || s.timestamp), tp: Math.abs(Number(s.financeiro.tpPips)), sl: Math.abs(Number(s.financeiro.slPips)),
        precoApp: Number(s.precoEntrada), appWin: s.resultado === "WIN", ts: Number(s.timestamp), doc: s }));
    const matriz = { appWIN: { WIN: 0, LOSS: 0, AMBIGUO: 0, ABERTA: 0, SEM_DADOS: 0 }, appLOSS: { WIN: 0, LOSS: 0, AMBIGUO: 0, ABERTA: 0, SEM_DADOS: 0 } };
    const gaps = [], viradasPorPar = {}, julg = [];
    for (const s of sinais) {
        const arr = barras[mt(s.par)];
        const r = arr ? julgar(s, arr) : { estado: "SEM_DADOS" };
        julg.push({ s, r });
        matriz[s.appWin ? "appWIN" : "appLOSS"][r.estado]++;
        if (r.gapPips !== undefined) gaps.push(r.gapPips);
        if ((r.estado === "WIN" || r.estado === "LOSS") && (r.estado === "WIN") !== s.appWin) { viradasPorPar[s.par] = (viradasPorPar[s.par] || 0) + 1; }
    }
    const decididos = julg.filter(x => x.r.estado === "WIN" || x.r.estado === "LOSS");
    const comAmb = (conservador) => julg.filter(x => x.r.estado === "WIN" || x.r.estado === "LOSS" || x.r.estado === "AMBIGUO")
        .map(x => ({ timestamp: x.s.ts, par: x.s.par, status: "ENCERRADA", resultado: x.r.estado === "WIN" ? "WIN" : "LOSS", resultadoFinanceiro: 0, fimOperacao: x.s.ts,
            financeiro: { regimeTPSL: "CONFIG", tpPips: x.s.tp, slPips: x.s.sl }, _amb: x.r.estado === "AMBIGUO" })).filter(x => conservador || !x._amb);
    const semSpread = () => 0;       // o spread já está dentro do julgamento (entrada no ask / saída no ask)
    const app = metricas(julg.filter(x => x.r.estado !== "SEM_DADOS").map(x => x.s.doc).map(d => ({ ...d, status: "ENCERRADA" })), "app (mesmos sinais, com spread da tabela)");
    const xmCons = metricas(comAmb(true), "XM (ambíguo = LOSS)", semSpread), xmSem = metricas(comAmb(false), "XM (sem ambíguos)", semSpread);

    // spread real das velas (pips), por par e por hora de Brasília, só no período dos sinais
    const t0 = Math.min(...sinais.map(s => s.t)), t1 = Math.max(...sinais.map(s => s.t));
    const porPar = {}, porHora = {};
    for (const [sym, arr] of Object.entries(barras)) for (const b of arr) {
        if (b.ms < t0 || b.ms > t1 + 86400e3) continue;
        const sp = b.sp * pontoDe(b.dig) / pipDe(b.dig);
        (porPar[sym] = porPar[sym] || []).push(sp);
        const h = new Date(b.ms - 3 * 3600e3).getUTCHours(); (porHora[h] = porHora[h] || []).push(sp);
    }
    const spreadPar = Object.entries(porPar).map(([sym, a]) => { const par = sym.slice(0, 3) + "/" + sym.slice(3); return { par, mediana: r2(mediana(a)), p90: r2(quantil(a, 0.9)), tabela: spreadDoPar(par), barras: a.length }; });
    const spreadHora = Object.entries(porHora).map(([h, a]) => ({ hora: Number(h), mediana: r2(mediana(a)), p90: r2(quantil(a, 0.9)) })).sort((a, b) => a.hora - b.hora);
    const spreadsZerados = Object.values(porPar).flat().length > 0 && mediana(Object.values(porPar).flat()) === 0;

    const concord = decididos.filter(x => (x.r.estado === "WIN") === x.s.appWin).length;
    return {
        sinais: sinais.length, comDadosXM: sinais.length - julg.filter(x => x.r.estado === "SEM_DADOS").length, decididosWinLoss: decididos.length,
        matriz, concordanciaWinLossPct: decididos.length ? r2(100 * concord / decididos.length) : null,
        acertoAppPct: r2(100 * sinais.filter(s => s.appWin).length / sinais.length),
        acertoXmPct: decididos.length ? r2(100 * decididos.filter(x => x.r.estado === "WIN").length / decididos.length) : null,
        viradasPorPar, gapPips: { mediana: r2(mediana(gaps)), p10: r2(quantil(gaps, 0.1)), p90: r2(quantil(gaps, 0.9)), n: gaps.length },
        app, xmAmbiguoComoLoss: xmCons, xmSemAmbiguos: xmSem, spreadPar, spreadHora, spreadsZerados, offsetExport: parsed.offsetExport,
        distanciaAppXmPipsPorOffset: escolherOffset(sinais, parsed)
    };
}

module.exports = { offsetServidorSeg, lerCsv, paraUtc, indiceDaVela, julgar, rejulgar, escolherOffset, pipDe };

if (require.main === module) {
    (async () => {
        const arq = process.argv[2];
        if (!arq || !fs.existsSync(arq)) { console.log(`arquivo de barras não encontrado (${arq}). Envie o xm_barras_m5.csv exportado pelo MT5.`); process.exit(0); }
        const admin = require("firebase-admin");
        const { selecionarFechadas } = require("../marco/regra625");
        const db = admin.initializeApp({ credential: admin.credential.cert(require("../../serviceAccount.json")) }).firestore();
        const snap = await db.collection("historico").get();
        const h = []; snap.forEach(d => h.push({ id: d.id, ...d.data() }));
        const fe = selecionarFechadas(h).slice(0, 400);
        const parsed = lerCsv(fs.readFileSync(arq, "utf8"));
        console.log(`barras lidas: ${Object.entries(parsed.barras).map(([k, v]) => `${k} ${v.length}`).join(" | ")} | offset do servidor no export: ${parsed.offsetExport} s`);
        const modoArg = process.argv.find(a => a.startsWith("--offset="));
        const res = rejulgar(fe, parsed, { modo: modoArg ? Number(modoArg.split("=")[1]) : "regra" });
        // GitHub mascara "{" e "}" no log (fazem parte do secret da credencial): imprime sem chaves
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        for (const [k, v] of Object.entries(res)) console.log(`REJ ${k} = ${semChaves(v)}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
