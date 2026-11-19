// ===================================================
// FOREX ASSIST - LABORATÓRIO - FASE 0 DO PRÉ-REGISTRO 6.45 (H_M1: o MESMO sistema com base de 1 minuto). SOMENTE LEITURA.
//
// 1. Velas M1 da XM (BID, exportadas pelo usuário; fuso por data: GMT+3 no verão dos EUA, GMT+2 fora) -> candles {ts,o,h,l,c} em UTC,
//    só horário de mercado (como o Lab sempre fez).
// 2. `replayPar` (lab/replay.js) roda o MESMO `analisarPar` do scanner: base 1 min, companhia de 3 min (razão 1:3 como 5:15), mesmos
//    períodos de indicador, configuração REAL (`configuracoes/geral` do oficial, só leitura), análise a cada 5 velas (o scanner roda a
//    cada 5 min), 30 s depois do fechamento da vela, cooldown e uma posição por par (fechamento "como o app mede").
// 3. Sinais gerados de 04/10 a 13/11 (fim do dia 13/11 em Brasília), o período pré-registrado. O julgamento pode usar velas até o fim
//    da exportação (18/11) para fechar o que ficou aberto.
// 4. Julgamento em M1 com bid/ask reais (vela = BID; compra entra no ask = bid + spread da vela e sai no bid; venda entra no bid e sai
//    no ask). ENTRADA = abertura da PRIMEIRA vela que abre no instante do sinal ou depois (conservador: nada antes do sinal); essa vela
//    já conta para TP/SL. Vela que toca TP e SL = LOSS (ambíguo, errar contra). Sem desfecho até o fim das velas = ABERTA (fora da conta,
//    reportada).
// 5. Métrica da 6.25: pips líquidos por operação (spread dentro do julgamento), IC por bootstrap em blocos de dia (10.000).
//    ALEATORIO = esperança EXATA da direção sorteada nas mesmas entradas: média dos resultados de COMPRA e VENDA em cada entrada
//    (sem ruído de sorteio). t = média(real - aleatório) / erro-padrão por blocos de dia.
// 6. Braço secundário SL x3 (decisão do usuário, 6.46): mesmas entradas, TP igual, SL x3; swap em sensibilidade (0 e -1 pip por noite,
//    noite = rollover das 17h de Nova York, quarta conta 3). Dois braços => IC de 97,5% nos dois (barra mais exigente).
// Critério (6.45): (a) líquido >= +0,5 pip/op; (b) limite inferior do IC > -1,0; (c) t >= 2 contra o ALEATORIO; (d) >= 250 sinais
// (senão INCONCLUSIVO). Falhou (a) ou (b) = REPROVADO e encerra.
// ===================================================
const fs = require("fs");
const { lerCsv, paraUtc, pipDe } = require("../scripts/xm/rejulgar");
const { replayPar } = require("./replay");
const { mercadoForexAberto } = require("../scripts/horarioMercado");

const PARES = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"];
const INI = Date.UTC(2026, 9, 4, 0, 42);                 // mesma época das 400 (04/10 00:42Z)
const FIM = Date.UTC(2026, 10, 14, 3, 0);                // fim do dia 13/11 em Brasília
const NIVEL = 0.975;                                      // dois braços
const r2 = (x) => x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100;
const media = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const diaBrt = (ms) => new Date(ms - 3 * 3600e3).toISOString().slice(0, 10);
const semanaBrt = (ms) => { const d = new Date(ms - 3 * 3600e3); const dow = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10); };

// velas M1 da XM (paraUtc) -> candles do replay (BID), só horário de mercado
function candlesDoReplay(barras) {
    return barras.filter(b => mercadoForexAberto(b.ms)).map(b => ({ ts: b.ms, o: b.o, h: b.h, l: b.l, c: b.c }));
}

// primeira vela com abertura >= t (busca binária); tolera até 10 min (lacuna) senão -1
function primeiraDepois(barras, t) {
    let lo = 0, hi = barras.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (barras[m].ms < t) lo = m + 1; else hi = m; }
    return lo < barras.length && barras[lo].ms - t <= 600000 ? lo : -1;
}

// julgamento em M1 com bid/ask: devolve { estado: WIN|LOSS|ABERTA|SEM_DADOS, pnl, fimMs, ambiguo }
function julgarM1(barras, { t, compra, tp, sl, comSpread = true }) {
    const i = primeiraDepois(barras, t);
    if (i < 0) return { estado: "SEM_DADOS" };
    const b0 = barras[i], pip = pipDe(b0.dig), ponto = 1 / Math.pow(10, b0.dig);
    const s0 = comSpread ? b0.sp * ponto : 0;
    const entrada = compra ? b0.o + s0 : b0.o;
    const nTp = compra ? entrada + tp * pip : entrada - tp * pip, nSl = compra ? entrada - sl * pip : entrada + sl * pip;
    for (let j = i; j < barras.length; j++) {
        const x = barras[j], sp = comSpread ? x.sp * ponto : 0;
        const bateTp = compra ? x.h >= nTp : x.l + sp <= nTp;
        const bateSl = compra ? x.l <= nSl : x.h + sp >= nSl;
        if (bateSl) return { estado: "LOSS", pnl: -sl, fimMs: x.ms + 60000, ambiguo: bateTp, entradaMs: b0.ms };
        if (bateTp) return { estado: "WIN", pnl: tp, fimMs: x.ms + 60000, ambiguo: false, entradaMs: b0.ms };
    }
    return { estado: "ABERTA", entradaMs: b0.ms };
}

// noites de rollover (17h de Nova York; quarta vale 3) entre a entrada e a saída
function noites(ini, fim) {
    let n = 0;
    for (let d = Math.floor(ini / 86400e3) - 1; d * 86400e3 <= fim + 86400e3; d++) {
        const dt = new Date(d * 86400e3);
        const verao = (() => { const y = dt.getUTCFullYear(); const dom = (m, k) => { const f = new Date(Date.UTC(y, m, 1)); return 1 + ((7 - f.getUTCDay()) % 7) + 7 * (k - 1); }; const a = Date.UTC(y, 2, dom(2, 2), 7), b = Date.UTC(y, 10, dom(10, 1), 6); return dt.getTime() >= a && dt.getTime() < b; })();
        const roll = d * 86400e3 + (verao ? 21 : 22) * 3600e3;
        const dow = new Date(roll).getUTCDay();
        if (dow === 6 || dow === 0) continue;                // sexta 17h NY rola para segunda; fim de semana sem rollover próprio
        if (roll > ini && roll <= fim) n += dow === 3 ? 3 : 1;
    }
    return n;
}

function rng(seed) { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }
function quantil(s, q) { const p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); }

// média por operação com IC por blocos de dia; `campo` escolhe o valor de cada operação
function icDias(ops, valor, { B = 10000, nivel = 0.95, semente = 20261113 } = {}) {
    const porDia = {}; for (const o of ops) (porDia[o.dia] = porDia[o.dia] || []).push(valor(o));
    const dias = Object.values(porDia), rnd = rng(semente), boot = [];
    for (let b = 0; b < B; b++) { let s = 0, c = 0; for (let k = 0; k < dias.length; k++) { const g = dias[Math.floor(rnd() * dias.length)]; for (const v of g) { s += v; c++; } } boot.push(s / c); }
    boot.sort((a, b) => a - b);
    const m = media(ops.map(valor)), a = (1 - nivel) / 2;
    const se = Math.sqrt(boot.reduce((s, x) => s + (x - m) ** 2, 0) / (boot.length - 1));
    return { media: r2(m), ic: [r2(quantil(boot, a)), r2(quantil(boot, 1 - a))], se: r2(se), dias: dias.length, n: ops.length };
}

function avaliarBraco(ops, rotulo, { nivel = NIVEL, swapPorNoite = 0 } = {}) {
    const dec = ops.filter(o => o.real.estado === "WIN" || o.real.estado === "LOSS");
    const comAle = dec.filter(o => o.compra.estado !== "ABERTA" && o.compra.estado !== "SEM_DADOS" && o.venda.estado !== "ABERTA" && o.venda.estado !== "SEM_DADOS");
    const val = (o) => o.real.pnl - swapPorNoite * noites(o.real.entradaMs, o.real.fimMs);
    const liq = icDias(dec, val, { nivel });
    const ale = (o) => (o.compra.pnl + o.venda.pnl) / 2;
    const dif = icDias(comAle, o => o.real.pnl - ale(o), { nivel });
    const t = dif.media === null ? null : dif.se ? dif.media / dif.se : (dif.media > 0 ? Infinity : dif.media < 0 ? -Infinity : 0);
    const n = ops.length;
    const crit = { a_liquidoMin05: liq.media >= 0.5, b_icInferiorMaiorQueMenos1: liq.ic[0] > -1.0, c_tContraAleatorio2: t !== null && t >= 2, d_min250: dec.length >= 250 };
    const veredito = !crit.d_min250 ? "INCONCLUSIVO" : (!crit.a_liquidoMin05 || !crit.b_icInferiorMaiorQueMenos1) ? "REPROVADO" : !crit.c_tContraAleatorio2 ? "REPROVADO (não supera o ALEATORIO)" : "PASSOU";
    return { braco: rotulo, sinais: n, decididos: dec.length, abertas: ops.filter(o => o.real.estado === "ABERTA").length, semDados: ops.filter(o => o.real.estado === "SEM_DADOS").length,
        ambiguos: dec.filter(o => o.real.ambiguo).length, acertoPct: r2(100 * dec.filter(o => o.real.estado === "WIN").length / (dec.length || 1)),
        liquidoPipsPorOp: liq, aleatorioPipsPorOp: r2(media(comAle.map(ale))), diferencaContraAleatorio: dif, t: r2(t), duracaoMediaH: r2(media(dec.map(o => (o.real.fimMs - o.real.entradaMs) / 3600e3))),
        noitesMedias: r2(media(dec.map(o => noites(o.real.entradaMs, o.real.fimMs)))), criterios: crit, veredito };
}

function porGrupo(ops, chave) {
    const g = {};
    for (const o of ops.filter(x => x.real.estado === "WIN" || x.real.estado === "LOSS")) { const k = chave(o); (g[k] = g[k] || []).push(o); }
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0])).map(([k, l]) => ({ chave: k, n: l.length, acertoPct: r2(100 * l.filter(o => o.real.estado === "WIN").length / l.length), pipsPorOp: r2(media(l.map(o => o.real.pnl))) }));
}

// sinais (do replay) -> julgados nos braços SL x1 (real, compra, venda, sem spread) e SL x3
function julgarSinais(sinais, barrasPorSym) {
    const x1 = [], x3 = [];
    for (const s of sinais) {
        const arr = barrasPorSym[s.par.replace("/", "")]; if (!arr) continue;
        const compra = s.direcao === "BUY";
        const base = { par: s.par, t: s.t, dia: diaBrt(s.t), semana: semanaBrt(s.t), direcao: s.direcao, tp: s.tpPips, sl: s.slPips, app: s.app };
        const j = (c, mult, comSpread = true) => julgarM1(arr, { t: s.t, compra: c, tp: s.tpPips, sl: s.slPips * mult, comSpread });
        x1.push({ ...base, real: j(compra, 1), compra: j(true, 1), venda: j(false, 1), bruto: j(compra, 1, false) });
        x3.push({ ...base, real: j(compra, 3), compra: j(true, 3), venda: j(false, 3) });
    }
    return { x1, x3 };
}

module.exports = { candlesDoReplay, primeiraDepois, julgarM1, noites, icDias, avaliarBraco, julgarSinais, porGrupo, INI, FIM };

if (require.main === module) {
    (async () => {
        const arqs = process.argv.slice(2).filter(x => fs.existsSync(x));
        if (!arqs.length) { console.log("nenhum arquivo M1"); process.exit(0); }
        let config = {};
        try {
            const admin = require("firebase-admin");
            const db = admin.initializeApp({ credential: admin.credential.cert(require("../serviceAccount.json")) }).firestore();
            const snap = await db.collection("configuracoes").doc("geral").get();   // 1 leitura, só leitura
            config = snap.exists ? snap.data() : {};
        } catch (e) { console.log(`AVISO: configuração real não lida (${e.message}); usando o padrão do Lab`); }
        const configuracao = { perfil: "balanceado", cooldown: 30, candles: 500, lote: 0.04, tp: 5, sl: 5, tipoConta: "SIMULADA", saldoInicial: 1000, ...config };
        console.log(`CONFIG perfil=${configuracao.perfil} lote=${configuracao.lote} tp=${configuracao.tp} sl=${configuracao.sl} cooldown=${configuracao.cooldown} candles=${configuracao.candles}`);
        const parsed = lerCsv(arqs.map(x => fs.readFileSync(x, "utf8")).join("\n"));
        const barras = paraUtc(parsed, "regra");
        const sinais = [];
        const t0 = Date.now();
        for (const par of PARES) {
            const arr = barras[par.replace("/", "")]; if (!arr) { console.log(`${par}: sem velas`); continue; }
            const c1 = candlesDoReplay(arr).filter(c => c.ts < FIM);
            const r = await replayPar({ par, c5: c1, configuracao, janela: 500, passo: 5, atrasoSeg: 30, baseMs: 60000, razao: 3, janelaSimulacao: 20000, guardarAnalises: false });
            const ops = r.operacoes.filter(o => o.t >= INI && o.t < FIM).map(o => ({ ...o, par }));
            sinais.push(...ops);
            console.log(`${par}: ${c1.length} velas, ${r.avaliadas} análises, ${r.aprovacoes} aprovadas, ${ops.length} no período (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
        }
        const semChaves = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
        const { x1, x3 } = julgarSinais(sinais, barras);
        const dias = new Set(x1.map(o => o.dia)).size;
        console.log(`F0 sinais = ${sinais.length}; dias com sinal = ${dias}; sinais por dia = ${r2(sinais.length / (dias || 1))}`);
        console.log(`F0 principal_SLx1 = ${semChaves(avaliarBraco(x1, "SL x1 (principal)"))}`);
        const brutos = x1.filter(o => o.bruto.estado === "WIN" || o.bruto.estado === "LOSS");
        console.log(`F0 bruto_sem_spread = ${semChaves(icDias(brutos, o => o.bruto.pnl, { nivel: NIVEL }))}`);
        console.log(`F0 secundario_SLx3_sem_swap = ${semChaves(avaliarBraco(x3, "SL x3, sem swap"))}`);
        console.log(`F0 secundario_SLx3_swap1 = ${semChaves(avaliarBraco(x3, "SL x3, swap -1 pip/noite", { swapPorNoite: 1 }))}`);
        console.log(`F0 app_como_mede = ${semChaves({ WIN: sinais.filter(s => s.app === "WIN").length, LOSS: sinais.filter(s => s.app === "LOSS").length, outros: sinais.filter(s => s.app !== "WIN" && s.app !== "LOSS").length })}`);
        console.log(`F0 por_semana = ${semChaves(porGrupo(x1, o => o.semana))}`);
        console.log(`F0 por_par = ${semChaves(porGrupo(x1, o => o.par))}`);
        console.log(`F0 por_direcao = ${semChaves(porGrupo(x1, o => o.direcao))}`);
    })().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
}
