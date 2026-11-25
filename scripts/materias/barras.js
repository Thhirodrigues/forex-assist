// ===================================================
// FOREX ASSIST - MATÉRIAS-PRIMAS: leitura das velas M1 enviadas pelo exportador do MT5 (mt5/XM_Exporter.mq5 v1.1). SOMENTE LEITURA/PURO.
// Formato do documento `xm_barras/<símbolo>` do projeto LAB (campo `json`, texto):
//   v1;SIMBOLO;digitos;lote_min;passo;contrato;offset_servidor_seg;swap_compra;swap_venda;dia_triplo|ts,o,h,l,c,spread_pontos;ts,o,h,l,c,spread_pontos;...
// `ts` é a hora do SERVIDOR da XM em segundos (como no CSV de exportação); aqui vira UTC em ms (ts - offset). Só velas FECHADAS.
// ===================================================
function parseBarras(texto, { agoraMs = Date.now() } = {}) {
    const t = String(texto || "");
    const corte = t.indexOf("|"); if (corte < 0) return null;
    const h = t.slice(0, corte).split(";");
    if (h[0] !== "v1" || h.length < 10) return null;
    const [, simbolo, dig, volMin, passo, contrato, offset, swC, swV, triplo] = h;
    const meta = { simbolo, dig: Number(dig), volMin: Number(volMin), passo: Number(passo), contrato: Number(contrato), offsetSeg: Number(offset), swapCompra: Number(swC), swapVenda: Number(swV), triplo: Number(triplo) };
    if (![meta.dig, meta.volMin, meta.passo, meta.contrato, meta.offsetSeg].every(Number.isFinite) || meta.contrato <= 0 || meta.passo <= 0) return null;
    const barras = [];
    for (const par of t.slice(corte + 1).split(";")) {
        if (!par) continue;
        const c = par.split(",");
        if (c.length < 6) continue;
        const [ts, o, hh, l, cl, sp] = c.map(Number);
        if (![ts, o, hh, l, cl, sp].every(Number.isFinite)) continue;
        const ms = (ts - meta.offsetSeg) * 1000;
        if (ms + 60000 > agoraMs) continue;                         // vela ainda se formando: não vale
        barras.push({ ms, o, h: hh, l, c: cl, sp, dig: meta.dig });
    }
    barras.sort((a, b) => a.ms - b.ms);
    for (let i = barras.length - 1; i > 0; i--) if (barras[i].ms === barras[i - 1].ms) barras.splice(i, 1);
    return { meta, barras };
}

function montarTexto(meta, barras) {
    const h = ["v1", meta.simbolo, meta.dig, meta.volMin, meta.passo, meta.contrato, meta.offsetSeg, meta.swapCompra ?? 0, meta.swapVenda ?? 0, meta.triplo ?? 3].join(";");
    return h + "|" + barras.map(b => [Math.round(b.ms / 1000) + meta.offsetSeg, b.o, b.h, b.l, b.c, b.sp].join(",")).join(";");
}

module.exports = { parseBarras, montarTexto };
