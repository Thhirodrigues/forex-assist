// ===================================================
// FOREX ASSIST - LABORATÓRIO - FAMÍLIA DE SINAL "FIBO" (pré-registro 6.66). SOMENTE LEITURA, só Lab; nunca sinal oficial.
//
// Pedido do usuário (23/11/2026): "se o gráfico de Fibonacci for favorável, o app dispara o sinal, mas no modo Lab". Aqui a regra é CAUSAL
// (a vela i só usa dados até a vela i) e FIXA (todos os parâmetros abaixo foram escritos antes de qualquer resultado):
//  - pivôs: máxima/mínima de uma vela que é a maior/menor das K = 12 velas de cada lado (confirmado K velas DEPOIS); zigzag alternado.
//  - perna = do pivô anterior ao último pivô; só vale com tamanho >= 4 x ATR(14) e com idade <= 96 velas (8 h) desde o pivô.
//  - gatilho (a favor da perna, "pullback"): o FECHAMENTO da vela i devolveu entre 50% e 61,8% da perna, a vela i fecha na direção da perna
//    (compra: fecha acima da abertura; venda: abaixo) e o nível de 78,6% ainda não foi tocado desde o pivô. UM sinal por perna.
//  - stop = nível 78,6% da perna; alvo = o próprio extremo da perna (o pivô); risco mínimo = 3 x spread da vela.
//  - entrada: abertura da vela SEGUINTE (compra no ask = bid + spread da vela; venda no bid); saída: compra no bid, venda no ask;
//    vela que toca alvo e stop = stop (errar contra). O resultado é o realizado: +distância até o alvo ou -distância até o stop, a partir do preço pago.
//  - ALEATORIO: a esperança exata da direção sorteada, com a MESMA geometria (mesmas distâncias de alvo e stop a partir do preço pago):
//    média do resultado da compra e da venda naquela vela de entrada.
// ===================================================
const { pipDe } = require("../scripts/xm/rejulgar");

const K = 12, ATR_N = 14, PERNA_MIN_ATR = 4, IDADE_MAX = 96, ZONA_INI = 0.5, ZONA_FIM = 0.618, NIVEL_STOP = 0.786, RISCO_MIN_SPREADS = 3;
const PARAMS = { K, ATR_N, PERNA_MIN_ATR, IDADE_MAX, ZONA_INI, ZONA_FIM, NIVEL_STOP, RISCO_MIN_SPREADS };

const pontoDe = (dig) => 1 / Math.pow(10, dig);
const spreadPreco = (b) => b.sp * pontoDe(b.dig);          // spread da vela em unidades de preço

function atrSerie(b, n = ATR_N) {
    const tr = b.map((x, i) => i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - b[i - 1].c), Math.abs(x.l - b[i - 1].c)));
    const out = new Array(b.length).fill(null); let soma = 0;
    for (let i = 0; i < b.length; i++) { soma += tr[i]; if (i >= n) soma -= tr[i - n]; if (i >= n - 1) out[i] = soma / n; }
    return out;
}

// pivôs confirmados: { p: índice, tipo: "H"|"L", preco, confirmadoEm: p + K }
function pivosConfirmados(b) {
    const piv = [];
    for (let p = K; p < b.length - K; p++) {
        let ehH = true, ehL = true;
        for (let q = p - K; q <= p + K; q++) {
            if (q === p) continue;
            if (b[q].h > b[p].h || (q < p && b[q].h === b[p].h)) ehH = false;       // maior das 2K+1 (o primeiro empate vale)
            if (b[q].l < b[p].l || (q < p && b[q].l === b[p].l)) ehL = false;
        }
        if (ehH) piv.push({ p, tipo: "H", preco: b[p].h, confirmadoEm: p + K });
        if (ehL) piv.push({ p, tipo: "L", preco: b[p].l, confirmadoEm: p + K });
    }
    return piv.sort((x, y) => x.confirmadoEm - y.confirmadoEm || x.p - y.p);
}

// sinais CAUSAIS: devolve { i, compra, topo, fundo, alvo, stop, r } (i = vela do gatilho; a entrada é a abertura da vela i + 1)
function gerarSinais(b) {
    const atr = atrSerie(b), todos = pivosConfirmados(b), sinais = [], usados = new Set();
    let zig = [], prox = 0;
    for (let i = 0; i < b.length - 1; i++) {
        while (prox < todos.length && todos[prox].confirmadoEm <= i) {               // só o que já era conhecido na vela i
            const nv = todos[prox++], ult = zig[zig.length - 1];
            if (!ult || ult.tipo !== nv.tipo) zig.push(nv);
            else if ((nv.tipo === "H" && nv.preco > ult.preco) || (nv.tipo === "L" && nv.preco < ult.preco)) zig[zig.length - 1] = nv;
        }
        if (zig.length < 2 || atr[i] === null) continue;
        const a = zig[zig.length - 2], fim = zig[zig.length - 1], alta = fim.tipo === "H";
        const faixa = Math.abs(fim.preco - a.preco);
        if (faixa < PERNA_MIN_ATR * atr[i] || i - fim.p > IDADE_MAX || usados.has(fim.p)) continue;
        const x = b[i], stopPreco = alta ? fim.preco - NIVEL_STOP * faixa : fim.preco + NIVEL_STOP * faixa;
        const r = alta ? (fim.preco - x.c) / faixa : (x.c - fim.preco) / faixa;       // fração da perna devolvida
        if (r < ZONA_INI || r > ZONA_FIM) continue;
        if (alta ? !(x.c > x.o) : !(x.c < x.o)) continue;                              // vela fechando a favor da perna
        let tocou = false;
        for (let q = fim.p + 1; q <= i; q++) if (alta ? b[q].l <= stopPreco : b[q].h >= stopPreco) { tocou = true; break; }
        if (tocou) continue;
        if (Math.abs(x.c - stopPreco) < RISCO_MIN_SPREADS * spreadPreco(x)) continue;
        usados.add(fim.p);
        sinais.push({ i, compra: alta, topo: alta ? fim.preco : a.preco, fundo: alta ? a.preco : fim.preco, alvo: fim.preco, stop: stopPreco, r });
    }
    return sinais;
}

// julga uma operação a partir da abertura da vela j com as DISTÂNCIAS (preço) de alvo e stop a partir do preço PAGO
function julgarDist(b, j, compra, dTp, dSl) {
    const pip = pipDe(b[j].dig), sp0 = spreadPreco(b[j]);
    const entrada = compra ? b[j].o + sp0 : b[j].o;
    const tp = compra ? entrada + dTp : entrada - dTp, sl = compra ? entrada - dSl : entrada + dSl;
    for (let q = j; q < b.length; q++) {
        const x = b[q], sp = spreadPreco(x);
        const bateTp = compra ? x.h >= tp : x.l + sp <= tp, bateSl = compra ? x.l <= sl : x.h + sp >= sl;
        if (bateSl) return { estado: "LOSS", pnl: -dSl / pip, fimMs: x.ms + 300000 };
        if (bateTp) return { estado: "WIN", pnl: dTp / pip, fimMs: x.ms + 300000 };
    }
    return { estado: "ABERTA" };
}

// sinal -> operação (ou null se a entrada já passou do alvo/stop): real + oposta (para o ALEATORIO)
function operacao(b, s) {
    const j = s.i + 1; if (j >= b.length) return null;
    const sp0 = spreadPreco(b[j]), entrada = s.compra ? b[j].o + sp0 : b[j].o;
    const dTp = s.compra ? s.alvo - entrada : entrada - s.alvo, dSl = s.compra ? entrada - s.stop : s.stop - entrada;
    if (!(dTp > 0) || !(dSl > 0)) return null;
    return { j, ms: b[j].ms, compra: s.compra, dTp, dSl, real: julgarDist(b, j, s.compra, dTp, dSl), oposta: julgarDist(b, j, !s.compra, dTp, dSl), pip: pipDe(b[j].dig), r: s.r };
}


// ---------------- VEREDITO (critérios do pré-registro 6.66, fixos antes de rodar) ----------------
// base: todas as operações do período, pares M5 da XM, resultado REAL (já líquido de spread, julgado no bid/ask).
// C1 amostra : >= 150 operações decididas (WIN/LOSS) em >= 20 dias distintos
// C2 liquido : IC 97,5% (bootstrap em dias) do resultado médio por operação (pips) com limite inferior > 0
// C3 contra o acaso: IC 97,5% da diferença (real - ALEATORIO, mesma geometria) com limite inferior > 0
// C4 estabilidade: média positiva nas DUAS metades do período (dividido pela data mediana das operações)
// APROVADA só com C1..C4; qualquer falha = REPROVADA e a família é encerrada (sem variantes, sem outro K, sem outra zona).
function julgarFibo(ops, icDias, nivel = 0.975) {
    const dec = ops.filter(o => o.real.estado === "WIN" || o.real.estado === "LOSS");
    const comAle = dec.filter(o => o.oposta.estado === "WIN" || o.oposta.estado === "LOSS");
    const liquido = icDias(dec, o => o.real.pnl, { nivel });
    const difAle = icDias(comAle, o => o.real.pnl - (o.real.pnl + o.oposta.pnl) / 2, { nivel });
    const ms = dec.map(o => o.ms).sort((a, b) => a - b), meio = ms[Math.floor(ms.length / 2)];
    const media = (a) => a.length ? a.reduce((x, y) => x + y.real.pnl, 0) / a.length : null;
    const m1 = media(dec.filter(o => o.ms < meio)), m2 = media(dec.filter(o => o.ms >= meio));
    const c1 = dec.length >= 150 && liquido.dias >= 20;
    const c2 = liquido.ic[0] !== null && liquido.ic[0] > 0;
    const c3 = difAle.ic[0] !== null && difAle.ic[0] > 0;
    const c4 = m1 !== null && m2 !== null && m1 > 0 && m2 > 0;
    return { n: dec.length, liquido, difAle, metade1: m1 === null ? null : Math.round(m1 * 100) / 100, metade2: m2 === null ? null : Math.round(m2 * 100) / 100, c1, c2, c3, c4, veredito: c1 && c2 && c3 && c4 ? "APROVADA" : "REPROVADA" };
}

module.exports = { PARAMS, atrSerie, pivosConfirmados, gerarSinais, julgarDist, operacao, spreadPreco, julgarFibo };

if (require.main === module) {
    const fs = require("fs");
    const { lerCsv, paraUtc } = require("../scripts/xm/rejulgar");
    const { icDias } = require("./fase0-m1");
    const arqs = process.argv.slice(2).filter(x => fs.existsSync(x));
    if (!arqs.length) { console.log("nenhum arquivo M5"); process.exit(0); }
    const sc = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");     // o GitHub mascara chaves nos logs
    const barras = paraUtc(lerCsv(arqs.map(x => fs.readFileSync(x, "utf8")).join("\n")), "regra");
    const todas = [];
    for (const [sym, arr] of Object.entries(barras)) {
        const ops = f_ops(arr).map(o => ({ ...o, par: sym, dia: new Date(o.ms).toISOString().slice(0, 10) }));
        todas.push(...ops);
        const dec = ops.filter(o => o.real.estado === "WIN" || o.real.estado === "LOSS");
        console.log(`${sym}: ${arr.length} velas, ${ops.length} sinais, ${dec.length} decididos, acerto ${dec.length ? Math.round(100 * dec.filter(o => o.real.estado === "WIN").length / dec.length) : 0}%`);
    }
    function f_ops(arr) { return gerarSinais(arr).map(sn => operacao(arr, sn)).filter(Boolean); }
    const v = julgarFibo(todas, icDias);
    console.log(`FIBO veredito = ${sc(v)}`);
    const dec = todas.filter(o => o.real.estado === "WIN" || o.real.estado === "LOSS");
    const r2 = (x) => Math.round(x * 100) / 100;
    console.log(`FIBO geometria = ${sc({ alvoMedioPips: r2(dec.reduce((s, o) => s + o.dTp / o.pip, 0) / dec.length), stopMedioPips: r2(dec.reduce((s, o) => s + o.dSl / o.pip, 0) / dec.length), acerto: r2(dec.filter(o => o.real.estado === "WIN").length / dec.length), abertas: todas.length - dec.length })}`);
    const porPar = {}; for (const o of dec) { const g = porPar[o.par] = porPar[o.par] || { n: 0, pnl: 0 }; g.n++; g.pnl += o.real.pnl; }
    console.log(`FIBO por_par = ${sc(Object.fromEntries(Object.entries(porPar).map(([k, g]) => [k, { n: g.n, media: r2(g.pnl / g.n) }])))}`);
}

