// ===================================================
// FOREX ASSIST - MATÉRIAS-PRIMAS: MOTOR (puro, sem banco): decide entradas novas e julga os sinais abertos. Pré-registro 6.78.
// A decisão de entrada é `candidatoEm` de lab/materias.js, A MESMA função do avaliador offline (paridade por construção).
// ===================================================
const mat = require("../../lab/materias");

const pipEA = (dig) => (dig === 3 || dig === 5) ? Math.pow(10, -(dig - 1)) : Math.pow(10, -dig);   // igual ao executor: pip = ponto x 10 em 3/5 dígitos
const r2 = (x) => Math.round(x * 100) / 100;

function especDe(meta, ativo) {
    return meta && meta.contrato > 0 ? { usdPorUnidadeLote: meta.contrato, minLote: meta.volMin, passo: meta.passo } : mat.ESPEC[ativo];
}

function er(b, i) {
    const L = mat.PARAMS.JANELA; let caminho = 0;
    for (let q = i - L + 1; q <= i; q++) caminho += Math.abs(b[q].c - b[q - 1].c);
    return caminho > 0 ? Math.abs(b[i].c - b[i - L].c) / caminho : 0;
}

function montarSinal(b, c, ativo, meta) {
    const d = mat.dimensionar(b, c.i); if (!d) return { motivo: "SEM_DIMENSAO" };
    const espec = especDe(meta, ativo), lp = mat.lotePorRisco(d.S, ativo, espec); if (!lp) return { motivo: "RISCO_ACIMA_DO_LIMITE", dim: d };
    const ms = b[c.i].ms + 60000, sp = mat.spreadPreco(b[c.i]), pip = pipEA(b[c.i].dig), usdUnid = espec.usdPorUnidadeLote;
    return { sinal: {
        id: `${ms}_${ativo}`, par: ativo, direcao: c.compra ? "BUY" : "SELL", status: "ABERTA", tipo: "MATERIAS", origem: "TESTE", regra: "6.78",
        timestamp: ms, inicioOperacao: ms, precoEntrada: Number((c.compra ? b[c.i].c + sp : b[c.i].c).toFixed(b[c.i].dig)), lote: lp.lote, riscoUsd: lp.riscoUsd,
        financeiro: { regimeTPSL: "ADAPTATIVO", tpPreco: d.T, slPreco: d.S, tpPips: Number((d.T / pip).toFixed(1)), slPips: Number((d.S / pip).toFixed(1)),
            tpUsd: r2(d.T * lp.lote * usdUnid), slUsd: r2(d.S * lp.lote * usdUnid), lote: lp.lote },
        indicadores: { er: Number(er(b, c.i).toFixed(3)), r15: d.r15, spreadMediano: d.spMed, spread: sp, janela: mat.PARAMS.JANELA }
    } };
}

// entradas novas: decisões das velas fechadas DEPOIS de `aposMs` (ms da última vela já processada)
function novosSinais(barras, ativo, meta, { aposMs }) {
    const out = [], descartados = [];
    for (let i = Math.max(mat.PARAMS.HIST_SPREAD, 0); i < barras.length; i++) {
        if (barras[i].ms <= aposMs) continue;
        const c = mat.candidatoEm(barras, i); if (!c) continue;
        const r = montarSinal(barras, c, ativo, meta);
        if (r.sinal) out.push(r.sinal); else descartados.push({ ms: barras[i].ms + 60000, motivo: r.motivo });
    }
    return { sinais: out, descartados };
}

// julga um sinal com as velas (mesmo `julgar` do offline): P1 (a ordem real), P2 e P3 (virtuais)
function julgarSinal(doc, barras, meta) {
    const j = barras.findIndex(x => x.ms === doc.timestamp);
    if (j < 0) return { estado: "SEM_BARRA" };
    const T = doc.financeiro.tpPreco, compra = doc.direcao === "BUY", usd = doc.lote * (especDe(meta, doc.par).usdPorUnidadeLote);
    const sw = meta ? { compra: meta.swapCompra, venda: meta.swapVenda, triplo: meta.triplo, offsetSeg: meta.offsetSeg, modo: (mat.ESPEC[doc.par] || {}).swapModo, contrato: meta.contrato } : null;
    const pol = {};
    for (const p of ["P1", "P2", "P3"]) {
        const r = mat.julgar(barras, j, compra, T, 1, p, sw);
        pol[p] = r.motivo === "ABERTA" ? { estado: "ABERTA" } : { estado: r.pnl > 0 ? "WIN" : "LOSS", pnlUnidade: r2(r.pnl), r: Number((r.pnl / T).toFixed(3)), usd: r2(r.pnl * usd), motivo: r.motivo, fimMs: barras[r.fimIdx].ms + 60000 };
    }
    const ult = barras[barras.length - 1], b0 = barras[j], sp0 = mat.spreadPreco(b0);
    const flutuante = compra ? ult.c - (b0.o + sp0) : b0.o - (ult.c + mat.spreadPreco(ult));
    return { estado: "OK", politicas: pol, flutuanteUsd: r2(flutuante * usd), precoAtual: ult.c, ultimaBarraMs: ult.ms };
}

module.exports = { pipEA, especDe, montarSinal, novosSinais, julgarSinal };
