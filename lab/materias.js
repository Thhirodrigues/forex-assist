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
//
// EMENDA 6.78 (25/11/2026, antes de qualquer dado de avaliação): a célula PRIMÁRIA passa a ser a ADAPTATIVA (a pedido do usuário: alvo, stop e lote
// dependem do mercado). No fechamento da vela i, sobre as 1.440 velas até i: R15 = mediana da amplitude (máx-mín) das janelas de 15 min;
// spreadMed = mediana do spread; T = max(0,5 x R15, 8 x spreadMed), stop S = T (k = 1), arredondados à casa decimal do preço. Lote = o maior
// múltiplo do passo com risco (lote x US$ por unidade x S) <= US$ 5, piso no lote mínimo; sem sinal se o lote mínimo já passar de US$ 7,50 de risco.
// O resultado do veredito é medido em R (resultado / S): +1 = alvo, -1 = stop. A grade fixa de 6.69/6.70 continua só como descritivo.
// ===================================================
const mediana = (a) => { const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const PARAMS = { JANELA: 60, ER_MIN: 0.30, NET_MIN_SPREADS: 4, SPREAD_MAX_X_MEDIANA: 1.5, HIST_SPREAD: 1440, ROLLOVER_BRT: [17, 18], MAX_VELAS: 480, FRACAO: 0.8, K_STOP: [1, 2] };
// GOLD e OILCash: alvos fixos em USD por unidade (onça / barril). US100Cash (emenda 25/11/2026, antes de qualquer dado de avaliação, ver 6.77): alvos em
// MÚLTIPLOS DO SPREAD MEDIANO das primeiras 1.440 velas do arquivo (custo, não resultado; o arquivo cresce no fim, então esse trecho nunca muda).
const ATIVOS = { GOLD: { alvos: [2, 3, 5], primario: 3 }, OILCash: { alvos: [0.25, 0.5, 1], primario: 0.5 }, US100Cash: { multSpread: [8, 15, 30], primarioMult: 15 } };

const ADAPT = { FRAC_R15: 0.5, MULT_SPREAD: 8, RISCO_USD: 5, RISCO_MAX_USD: 7.5, JANELA_R15_MS: 900000, MIN_VELAS_JANELA: 10 };
// US$ por unidade de preço por lote cheio (ouro 100 onças; petróleo 100 barris; US100 US$ 1 por ponto); lote mínimo e passo conforme a XM padrão.
// A CONFERIR com a especificação real do MT5 (o exportador passa a enviá-la); o scanner ao vivo usa os valores reais quando existirem.
const ESPEC = { GOLD: { usdPorUnidadeLote: 100, minLote: 0.01, passo: 0.001 }, OILCash: { usdPorUnidadeLote: 100, minLote: 0.01, passo: 0.01 }, US100Cash: { usdPorUnidadeLote: 1, minLote: 0.10, passo: 0.10 } };      // US100Cash: min/passo 0,10 lidos do MT5 real em 25/11/2026; GOLD: passo real < 0,005 (usa-se 0,01, conservador)
const spreadPreco = (b) => b.sp / Math.pow(10, b.dig);
const arred = (x) => Math.round(x * 10) / 10;

// alvos (preço) e alvo primário de um ativo; para o índice, derivados do spread mediano das primeiras 1.440 velas
function alvosDoAtivo(ativo, b) {
    const a = ATIVOS[ativo];
    if (a.alvos) return { alvos: a.alvos, primario: a.primario };
    const med = mediana(b.slice(0, PARAMS.HIST_SPREAD).map(spreadPreco));
    return { alvos: a.multSpread.map(m => arred(m * med)), primario: arred(a.primarioMult * med) };
}
const horaBrt = (ms) => (new Date(ms).getUTCHours() + 21) % 24;

// direção favorável (+1 compra, -1 venda, 0 nenhuma) no fechamento da vela i; usa só velas <= i
function sinalEm(b, i) {
    const L = PARAMS.JANELA;
    if (i < L || b[i].ms - b[i - L].ms !== L * 60000) return 0;
    const net = b[i].c - b[i - L].c; let caminho = 0;
    for (let q = i - L + 1; q <= i; q++) caminho += Math.abs(b[q].c - b[q - 1].c);
    if (!(caminho > 0) || Math.abs(net) / caminho < PARAMS.ER_MIN || Math.abs(net) < PARAMS.NET_MIN_SPREADS * spreadPreco(b[i])) return 0;
    return net > 0 ? 1 : -1;
}

// decisão de entrada no fechamento da vela i (usa só velas <= i): { i, compra } ou null. É A MESMA função do avaliador offline e do app ao vivo.
function candidatoEm(b, i, ultimoMs = -Infinity) {
    if (i < PARAMS.HIST_SPREAD) return null;
    if (Math.floor(b[i].ms / 60000) % 30 !== 29) return null;                      // fecha em :00 / :30
    if (b[i].ms - ultimoMs < 30 * 60000) return null;
    if (PARAMS.ROLLOVER_BRT.includes(horaBrt(b[i].ms))) return null;
    const lado = sinalEm(b, i); if (!lado) return null;
    const hist = []; for (let q = i - PARAMS.HIST_SPREAD; q < i; q++) hist.push(spreadPreco(b[q]));
    if (spreadPreco(b[i]) > PARAMS.SPREAD_MAX_X_MEDIANA * mediana(hist)) return null;
    return { i, compra: lado > 0 };
}

function candidatos(b) {
    const out = []; let ultimoMs = -Infinity;
    for (let i = PARAMS.HIST_SPREAD; i < b.length - 1; i++) {
        const c = candidatoEm(b, i, ultimoMs); if (!c) continue;
        if (b[i + 1].ms - b[i].ms !== 60000) continue;                                 // a próxima vela tem de existir sem lacuna
        out.push({ i, j: i + 1, compra: c.compra, ms: b[i + 1].ms }); ultimoMs = b[i].ms;
    }
    return out;
}

// alvo e stop (preço) pela volatilidade das últimas 1.440 velas até i; null se faltarem dados
function dimensionar(b, i) {
    if (i < PARAMS.HIST_SPREAD - 1) return null;
    const sps = [], janelas = new Map();
    for (let q = i - PARAMS.HIST_SPREAD + 1; q <= i; q++) {
        sps.push(spreadPreco(b[q]));
        const k = Math.floor(b[q].ms / ADAPT.JANELA_R15_MS), g = janelas.get(k) || { h: -Infinity, l: Infinity, n: 0 };
        if (b[q].h > g.h) g.h = b[q].h; if (b[q].l < g.l) g.l = b[q].l; g.n++; janelas.set(k, g);
    }
    const amp = [...janelas.values()].filter(g => g.n >= ADAPT.MIN_VELAS_JANELA).map(g => g.h - g.l);
    if (amp.length < 20) return null;
    const r15 = mediana(amp), spMed = mediana(sps), dig = b[i].dig;
    const T = Number(Math.max(ADAPT.FRAC_R15 * r15, ADAPT.MULT_SPREAD * spMed).toFixed(dig));
    return { T, S: T, r15, spMed };
}

// lote pelo risco (US$ 5): maior múltiplo do passo com risco <= US$ 5, piso no mínimo; null se o mínimo já passa de US$ 7,50
function lotePorRisco(S, ativo, espec = ESPEC[ativo]) {
    // lotes ficam em múltiplos de 0,01 no mínimo (o passo real do GOLD é 0,001, mas o lote circula com 2 casas na fila e no executor): sem arredondar para CIMA
    const passo = Math.max(espec.passo, 0.01);
    const bruto = Math.floor(ADAPT.RISCO_USD / (S * espec.usdPorUnidadeLote) / passo + 1e-9) * passo;
    let lote = Math.round(bruto * 100) / 100;
    if (lote < espec.minLote) lote = espec.minLote;
    const risco = lote * espec.usdPorUnidadeLote * S;
    if (risco > ADAPT.RISCO_MAX_USD + 1e-9) return null;
    return { lote, riscoUsd: Math.round(risco * 100) / 100 };
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
    const cand = candidatos(b), out = [], { alvos } = alvosDoAtivo(ativo, b);
    for (const c of cand) for (const T of alvos) for (const k of PARAMS.K_STOP) for (const pol of ["P1", "P2", "P3"]) {
        const real = julgar(b, c.j, c.compra, T, k, pol, sw), oposta = julgar(b, c.j, !c.compra, T, k, pol, sw);
        if (real.motivo === "ABERTA" || oposta.motivo === "ABERTA") continue;
        out.push({ ativo, ms: c.ms, dia: new Date(c.ms).toISOString().slice(0, 10), T, prim: false, adapt: false, k, pol, real: real.pnl, oposta: oposta.pnl, compra: c.compra, motivo: real.motivo });
    }
    // braço ADAPTATIVO (primário): alvo e stop pela volatilidade, k = 1, lote pelo risco; resultado também em R
    const espec = ESPEC[ativo];
    for (const c of cand) {
        const d = dimensionar(b, c.i); if (!d) continue;
        const lp = lotePorRisco(d.S, ativo); if (!lp) continue;
        for (const pol of ["P1", "P2", "P3"]) {
            const real = julgar(b, c.j, c.compra, d.T, 1, pol, sw), oposta = julgar(b, c.j, !c.compra, d.T, 1, pol, sw);
            if (real.motivo === "ABERTA" || oposta.motivo === "ABERTA") continue;
            out.push({ ativo, ms: c.ms, dia: new Date(c.ms).toISOString().slice(0, 10), T: d.T, S: d.S, adapt: true, prim: pol === "P1", k: 1, pol, real: real.pnl, oposta: oposta.pnl,
                r: real.pnl / d.S, rOposta: oposta.pnl / d.S, lote: lp.lote, riscoUsd: lp.riscoUsd, usd: real.pnl * lp.lote * espec.usdPorUnidadeLote, compra: c.compra, motivo: real.motivo });
        }
    }
    return out;
}

// ---------------- VEREDITO (critérios do pré-registro 6.69/6.78, fixos antes de rodar) ----------------
// célula primária por ativo: braço ADAPTATIVO, política P1 (k = 1), resultado em R (alvo = +1, stop = -1, custo do spread já dentro).
// C1: >= 300 operações em >= 20 dias; C2: IC (blocos de dia, nível Bonferroni 3 ativos) do R médio com limite inferior > 0; C3: IC de (R real - ALEATORIO)
// com limite inferior > 0; C4: R médio positivo nas duas metades cronológicas.
function julgarPrimaria(ops, ativo, icDias, nivel = 1 - 0.05 / Object.keys(ATIVOS).length) {   // Bonferroni para 3 ativos: 98,33%
    const sel = ops.filter(o => o.ativo === ativo && o.adapt && o.pol === "P1");
    const liquido = icDias(sel, o => o.r, { nivel });
    const difAle = icDias(sel, o => o.r - (o.r + o.rOposta) / 2, { nivel });
    const ms = sel.map(o => o.ms).sort((a, b) => a - b), meio = ms[Math.floor(ms.length / 2)];
    const m = (a) => a.length ? a.reduce((x, o) => x + o.r, 0) / a.length : null;
    const m1 = m(sel.filter(o => o.ms < meio)), m2 = m(sel.filter(o => o.ms >= meio));
    const c1 = sel.length >= 300 && liquido.dias >= 20, c2 = liquido.ic[0] !== null && liquido.ic[0] > 0, c3 = difAle.ic[0] !== null && difAle.ic[0] > 0, c4 = m1 !== null && m2 !== null && m1 > 0 && m2 > 0;
    return { ativo, n: sel.length, liquido, difAle, metade1: m1 === null ? null : Math.round(m1 * 1000) / 1000, metade2: m2 === null ? null : Math.round(m2 * 1000) / 1000, c1, c2, c3, c4, veredito: c1 && c2 && c3 && c4 ? "APROVADA" : "REPROVADA" };
}

module.exports = { PARAMS, ADAPT, ESPEC, ATIVOS, alvosDoAtivo, sinalEm, candidatoEm, candidatos, dimensionar, lotePorRisco, julgar, operacoes, julgarPrimaria, swapUsd, spreadPreco, horaBrt };

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
        console.log(`${ativo}: dados até ${new Date(ate).toISOString()}, alvos ${JSON.stringify(alvosDoAtivo(ativo, recorte).alvos)} (primário ${alvosDoAtivo(ativo, recorte).primario}), ${ops.filter(o => o.adapt && o.pol === "P1").length} operações na célula primária (adaptativa)`);
        console.log(`MATERIAS ${ativo} veredito = ${sc(julgarPrimaria(todas, ativo, icDias))}`);
        // braço adaptativo, descritivo por política (R médio; diferença P2/P3 contra P1 pareada por instante)
        const ad = ops.filter(o => o.adapt), p1 = ad.filter(o => o.pol === "P1"), porMs1 = new Map(p1.map(o => [o.ms, o]));
        const lin = { n: p1.length, P1_R: icDias(p1, o => o.r).media, usdMedioPorOp: icDias(p1, o => o.usd).media, loteMediano: mediana(p1.map(o => o.lote)) };
        for (const pol of ["P2", "P3"]) { const p = ad.filter(o => o.pol === pol && porMs1.has(o.ms)); lin[`${pol}_R`] = icDias(p, o => o.r).media; lin[`dif_${pol}`] = icDias(p.map(o => ({ ...o, v: o.r - porMs1.get(o.ms).r })), o => o.v).ic; }
        console.log(`MATERIAS ${ativo} adaptativo = ${sc(lin)}`);
        // descritivo (sem aprovação): grade completa; a diferença P2/P3 contra P1 responde "encerrar/esticar muda a esperança?"
        for (const T of alvosDoAtivo(ativo, recorte).alvos) for (const k of PARAMS.K_STOP) {
            const base = ops.filter(o => o.T === T && o.k === k && o.pol === "P1");
            const linha = { T, k, n: base.length, P1: icDias(base, o => o.real).media };
            const porMs = new Map(base.map(o => [o.ms, o]));                       // alinhar por instante (uma política pode ter operação a menos)
            for (const pol of ["P2", "P3"]) { const p = ops.filter(o => o.T === T && o.k === k && o.pol === pol && porMs.has(o.ms)); linha[pol] = icDias(p, o => o.real).media; linha[`dif_${pol}`] = icDias(p.map(o => ({ ...o, v: o.real - porMs.get(o.ms).real })), o => o.v).ic; }
            console.log(`MATERIAS ${ativo} grade = ${sc(linha)}`);
        }
    }
}
