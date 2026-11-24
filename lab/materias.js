// ===================================================
// FOREX ASSIST - LABORATÓRIO - MATÉRIAS-PRIMAS (GOLD e OILCash), FASE A (pré-registro 6.69). SOMENTE LEITURA, só Lab; nunca sinal oficial.
//
// Modelo "alvo pequeno em dólares" (pedido do usuário em 24/11/2026), separado do forex. Tudo CAUSAL e FIXO (escrito antes de qualquer dado
// de avaliação). Valores em USD por UMA unidade do ativo (1 onça de ouro / 1 barril de petróleo), com spread real da vela (bid/ask).
//
// AVALIADOR DE ENTRADA (a cada :00 e :30 do relógio, no fechamento da vela M1 i):
//   - janela de 60 velas M1 contíguas; net = fechamento_i - fechamento_(i-60); ER = |net| / soma(|variação de fechamento|)
//   - candidato se ER >= 0,30 e |net| >= 4 x spread da vela e spread da vela <= 1,5 x mediana dos spreads das 1.440 velas anteriores
//     e hora de Brasília fora de 17h-18h (rollover). Direção = sinal do net (continuação). No máximo 1 por ativo a cada 30 min.
//   - entrada na abertura da vela SEGUINTE (compra no ask = bid + spread; venda no bid).
// GRADE (todas registradas, nada escolhido depois): alvo T por ativo (GOLD 2/3/5 US$; OIL 0,25/0,50/1,00 US$), stop = k x T com k em 1 e 2,
//   tempo máximo 480 velas (fecha a mercado). Vela que toca alvo e stop = stop. Swap cobrado se a posição atravessa a meia-noite do servidor.
// POLÍTICAS: P1 alvo fixo | P2 encerra ao chegar em 80% de T | P3 ao chegar em 80% de T, se a mesma regra do avaliador ainda aponta a favor
//   no fechamento daquela vela, o alvo passa a 2 x T (stop igual); senão encerra em 80% de T.
// CONTROLE ALEATORIO: mesma entrada e mesma geometria, direção oposta; esperança exata = média entre real e oposta.
// ===================================================
const PARAMS = { JANELA: 60, ER_MIN: 0.30, NET_MIN_SPREADS: 4, SPREAD_MAX_X_MEDIANA: 1.5, HIST_SPREAD: 1440, ROLLOVER_BRT: [17, 18], MAX_VELAS: 480, FRACAO: 0.8, K_STOP: [1, 2] };
const ATIVOS = { GOLD: { alvos: [2, 3, 5], primario: 3 }, OILCash: { alvos: [0.25, 0.5, 1], primario: 0.5 } };

const spreadPreco = (b) => b.sp / Math.pow(10, b.dig);
const horaBrt = (ms) => (new Date(ms).getUTCHours() + 21) % 24;
const mediana = (a) => { const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// direção favorável (+1 compra, -1 venda, 0 nenhuma) no fechamento da vela i; usa só velas <= i
function sinalEm(b, i) {
    const L = PARAMS.JANELA;
    if (i < L || b[i].ms - b[i - L].ms !== L * 60000) return 0;
    const net = b[i].c - b[i - L].c; let caminho = 0;
    for (let q = i - L + 1; q <= i; q++) caminho += Math.abs(b[q].c - b[q - 1].c);
    if (!(caminho > 0) || Math.abs(net) / caminho < PARAMS.ER_MIN || Math.abs(net) < PARAMS.NET_MIN_SPREADS * spreadPreco(b[i])) return 0;
    return net > 0 ? 1 : -1;
}

function candidatos(b) {
    const out = []; let ultimoMs = -Infinity;
    for (let i = PARAMS.HIST_SPREAD; i < b.length - 1; i++) {
        if (Math.floor(b[i].ms / 60000) % 30 !== 29) continue;                       // fecha em :00 / :30
        if (b[i].ms - ultimoMs < 30 * 60000) continue;
        if (PARAMS.ROLLOVER_BRT.includes(horaBrt(b[i].ms))) continue;
        const lado = sinalEm(b, i); if (!lado) continue;
        const hist = []; for (let q = i - PARAMS.HIST_SPREAD; q < i; q++) hist.push(spreadPreco(b[q]));
        if (spreadPreco(b[i]) > PARAMS.SPREAD_MAX_X_MEDIANA * mediana(hist)) continue;
        if (b[i + 1].ms - b[i].ms !== 60000) continue;                                 // a próxima vela tem de existir sem lacuna
        out.push({ i, j: i + 1, compra: lado > 0, ms: b[i + 1].ms }); ultimoMs = b[i].ms;
    }
    return out;
}

// swap em USD por unidade se a posição atravessa a meia-noite do servidor (triplo na quarta: dia_triplo=3)
function swapUsd(b, j, k, compra, sw) {
    if (!sw) return 0;
    const ponto = 1 / Math.pow(10, b[j].dig), dia = (ms) => Math.floor((ms / 1000 + (sw.offsetSeg || 7200)) / 86400);
    let n = 0;
    for (let d = dia(b[j].ms) + 1; d <= dia(b[k].ms); d++) {                       // d = dia que COMEÇA; a noite cobrada é a do dia anterior (d-1)
        const dowAnterior = (d - 1 + 4) % 7;                                       // 1970-01-01 foi quinta-feira (dow 4, domingo = 0)
        if (dowAnterior === 6 || dowAnterior === 0) continue;                      // sábado/domingo: sem mercado
        n += dowAnterior === (sw.triplo ?? 3) ? 3 : 1;
    }
    return n * (compra ? sw.compra : sw.venda) * ponto;
}

// julga uma operação: política "P1" | "P2" | "P3"; devolve { pnl, fimIdx, motivo }
function julgar(b, j, compra, T, k, politica, sw) {
    const sp0 = spreadPreco(b[j]), entrada = compra ? b[j].o + sp0 : b[j].o, S = k * T, f80 = PARAMS.FRACAO * T;
    let alvo = T, estendido = false;
    const fim = Math.min(b.length - 1, j + PARAMS.MAX_VELAS - 1);
    for (let q = j; q <= fim; q++) {
        const x = b[q], sp = spreadPreco(x);
        const fav = compra ? x.h - entrada : entrada - (x.l + sp), adv = compra ? entrada - x.l : x.h + sp - entrada;
        const sl = adv >= S - 1e-9, tp = fav >= alvo - 1e-9;
        const custo = swapUsd(b, j, q, compra, sw);
        if (sl) return { pnl: -S + custo, fimIdx: q, motivo: "STOP" };
        if (politica !== "P1" && !estendido && fav >= f80 - 1e-9) {
            if (politica === "P2") return { pnl: f80 + custo, fimIdx: q, motivo: "80" };
            const lado = sinalEm(b, q);                                              // P3: reavalia com dados até o fechamento desta vela
            if ((lado > 0) === compra && lado !== 0) { alvo = 2 * T; estendido = true; continue; }
            return { pnl: f80 + custo, fimIdx: q, motivo: "80" };
        }
        if (tp) return { pnl: alvo + custo, fimIdx: q, motivo: estendido ? "ALVO2" : "ALVO" };
    }
    const x = b[fim], sp = spreadPreco(x), saida = compra ? x.c - entrada : entrada - (x.c + sp);
    return { pnl: saida + swapUsd(b, j, fim, compra, sw), fimIdx: fim, motivo: fim === b.length - 1 && fim - j + 1 < PARAMS.MAX_VELAS ? "ABERTA" : "TEMPO" };
}

// todas as operações da grade para um ativo (cada candidato x T x k x política), com o lado oposto para o ALEATORIO
function operacoes(b, sw, ativo) {
    const cand = candidatos(b), out = [];
    for (const c of cand) for (const T of ATIVOS[ativo].alvos) for (const k of PARAMS.K_STOP) for (const pol of ["P1", "P2", "P3"]) {
        const real = julgar(b, c.j, c.compra, T, k, pol, sw), oposta = julgar(b, c.j, !c.compra, T, k, pol, sw);
        if (real.motivo === "ABERTA" || oposta.motivo === "ABERTA") continue;
        out.push({ ativo, ms: c.ms, dia: new Date(c.ms).toISOString().slice(0, 10), T, k, pol, real: real.pnl, oposta: oposta.pnl, compra: c.compra, motivo: real.motivo });
    }
    return out;
}

// ---------------- VEREDITO (critérios do pré-registro 6.69, fixos antes de rodar) ----------------
// célula primária por ativo: P1, k = 1, T = ATIVOS[ativo].primario. C1: >= 300 operações em >= 20 dias; C2: IC 97,5% (blocos de dia) do resultado
// líquido médio com limite inferior > 0; C3: IC 97,5% de (real - ALEATORIO) com limite inferior > 0; C4: média positiva nas duas metades.
function julgarPrimaria(ops, ativo, icDias, nivel = 0.975) {
    const sel = ops.filter(o => o.ativo === ativo && o.pol === "P1" && o.k === 1 && o.T === ATIVOS[ativo].primario);
    const liquido = icDias(sel, o => o.real, { nivel });
    const difAle = icDias(sel, o => o.real - (o.real + o.oposta) / 2, { nivel });
    const ms = sel.map(o => o.ms).sort((a, b) => a - b), meio = ms[Math.floor(ms.length / 2)];
    const m = (a) => a.length ? a.reduce((x, o) => x + o.real, 0) / a.length : null;
    const m1 = m(sel.filter(o => o.ms < meio)), m2 = m(sel.filter(o => o.ms >= meio));
    const c1 = sel.length >= 300 && liquido.dias >= 20, c2 = liquido.ic[0] !== null && liquido.ic[0] > 0, c3 = difAle.ic[0] !== null && difAle.ic[0] > 0, c4 = m1 !== null && m2 !== null && m1 > 0 && m2 > 0;
    return { ativo, n: sel.length, liquido, difAle, metade1: m1 === null ? null : Math.round(m1 * 1000) / 1000, metade2: m2 === null ? null : Math.round(m2 * 1000) / 1000, c1, c2, c3, c4, veredito: c1 && c2 && c3 && c4 ? "APROVADA" : "REPROVADA" };
}

module.exports = { PARAMS, ATIVOS, sinalEm, candidatos, julgar, operacoes, julgarPrimaria, swapUsd, spreadPreco, horaBrt };

if (require.main === module) {
    const fs = require("fs");
    const { lerCsv, paraUtc } = require("../scripts/xm/rejulgar");
    const { icDias } = require("./fase0-m1");
    const args = process.argv.slice(2), desdeArg = args.find(a => a.startsWith("--desde="));
    const DESDE = Date.parse(desdeArg ? desdeArg.split("=")[1] : "2026-11-25T00:00:00Z");   // só dados DEPOIS do pré-registro (24/11/2026)
    const dir = args.find(a => !a.startsWith("--")) || "DOCUMENTACAO/arquivo-xm";
    const sc = (o) => JSON.stringify(o).replace(/{/g, "(").replace(/}/g, ")");
    const sw = {}; for (const l of fs.readFileSync(`${dir}/xm_swaps.csv`, "utf8").split(/\r?\n/).slice(1).filter(Boolean)) { const c = l.split(","); sw[c[0]] = { compra: Number(c[1]), venda: Number(c[2]), triplo: Number(c[4]), offsetSeg: 7200 }; }
    const todas = [];
    for (const ativo of Object.keys(ATIVOS)) {
        const arq = `${dir}/xm_barras_M1_${ativo}.csv`; if (!fs.existsSync(arq)) { console.log(`${ativo}: sem arquivo`); continue; }
        const barras = paraUtc(lerCsv(fs.readFileSync(arq, "utf8")), "regra")[ativo];
        // contexto de 1.440 velas antes de DESDE para o avaliador, mas só entradas a partir de DESDE
        const iniIdx = Math.max(0, barras.findIndex(x => x.ms >= DESDE) - PARAMS.HIST_SPREAD - 1);
        const recorte = barras.slice(iniIdx), ops = operacoes(recorte, sw[ativo], ativo).filter(o => o.ms >= DESDE);
        todas.push(...ops);
        const ate = barras[barras.length - 1].ms;
        console.log(`${ativo}: dados até ${new Date(ate).toISOString()}, ${ops.filter(o => o.pol === "P1" && o.k === 1 && o.T === ATIVOS[ativo].primario).length} operações na célula primária`);
        console.log(`MATERIAS ${ativo} veredito = ${sc(julgarPrimaria(todas, ativo, icDias))}`);
        // descritivo (sem aprovação): grade completa; a diferença P2/P3 contra P1 responde "encerrar/esticar muda a esperança?"
        for (const T of ATIVOS[ativo].alvos) for (const k of PARAMS.K_STOP) {
            const base = ops.filter(o => o.T === T && o.k === k && o.pol === "P1");
            const linha = { T, k, n: base.length, P1: icDias(base, o => o.real).media };
            const porMs = new Map(base.map(o => [o.ms, o]));                       // alinhar por instante (uma política pode ter operação a menos)
            for (const pol of ["P2", "P3"]) { const p = ops.filter(o => o.T === T && o.k === k && o.pol === pol && porMs.has(o.ms)); linha[pol] = icDias(p, o => o.real).media; linha[`dif_${pol}`] = icDias(p.map(o => ({ ...o, v: o.real - porMs.get(o.ms).real })), o => o.v).ic; }
            console.log(`MATERIAS ${ativo} grade = ${sc(linha)}`);
        }
    }
}
