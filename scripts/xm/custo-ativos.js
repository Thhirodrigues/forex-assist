// ===================================================
// FOREX ASSIST - CUSTO REAL DE OPERAR UM ATIVO NA XM (SOMENTE LEITURA, descritivo; nenhum teste de sinal, nenhuma hipótese)
//
// Pedido do usuário (24/11/2026, opção B): "descrever o custo real de operar ouro, prata e petróleo antes de qualquer teste de sinal".
// Base: velas M1 reais da conta demo XM (arquivo-xm) + swaps lidos do MT5. Compara com EURUSD/GBPUSD como termômetro.
// Convenções: USD por unidade de preço = tamanho_contrato x lote (ativos cotados em USD). Spread = spread_pontos x ponto (preço, por vela).
// Swap em pontos (modo 1): USD por noite = swap_pontos x ponto x tamanho_contrato x lote.
// ===================================================
const fs = require("fs");
const { lerCsv, paraUtc } = require("./rejulgar");

const quantil = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const usdPorUnidade = (tamanhoContrato, lote) => tamanhoContrato * lote;                       // ativos cotados em USD
const swapUsdNoite = (swapPontos, ponto, tamanhoContrato, lote) => swapPontos * ponto * tamanhoContrato * lote;
const horaBrt = (ms) => (new Date(ms).getUTCHours() + 21) % 24;                                 // UTC-3

function agrupar(barras, chave) {
    const g = new Map();
    for (const b of barras) { const k = chave(b); const x = g.get(k); if (!x) g.set(k, { h: b.h, l: b.l }); else { if (b.h > x.h) x.h = b.h; if (b.l < x.l) x.l = b.l; } }
    return [...g.values()].map(x => x.h - x.l);
}

function analisar(simbolo, barras, contrato, swaps, lote) {
    const dig = barras[0].dig, ponto = 1 / Math.pow(10, dig);
    const sp = barras.map(b => b.sp * ponto), usd = usdPorUnidade(contrato, lote);
    const porHora = Array.from({ length: 24 }, () => []);
    barras.forEach((b, i) => porHora[horaBrt(b.ms)].push(sp[i]));
    const medHora = porHora.map(a => a.length ? quantil(a, 0.5) : null);
    const medSp = quantil(sp, 0.5);
    const r15 = agrupar(barras, b => Math.floor(b.ms / 900000)), r60 = agrupar(barras, b => Math.floor(b.ms / 3600000)), rDia = agrupar(barras, b => Math.floor(b.ms / 86400000));
    return {
        simbolo, lote, usdPorUnidade: usd, spreadMed: medSp, spreadP90: quantil(sp, 0.9), spreadMax: Math.max(...sp), medHora,
        spreadUsdMed: medSp * usd, spreadUsdP90: quantil(sp, 0.9) * usd,
        r15: quantil(r15, 0.5), r60: quantil(r60, 0.5), rDiaMed: quantil(rDia, 0.5), rDiaP95: quantil(rDia, 0.95), rDiaMax: Math.max(...rDia),
        swapCompraUsd: swaps ? swapUsdNoite(swaps.compra, ponto, contrato, lote) : null, swapVendaUsd: swaps ? swapUsdNoite(swaps.venda, ponto, contrato, lote) : null,
        distanciaUsd5: 5 / usd,                                                                  // movimento de preço que vale US$ 5 neste lote
    };
}

module.exports = { quantil, usdPorUnidade, swapUsdNoite, horaBrt, agrupar, analisar };

if (require.main === module) {
    const dir = process.argv[2] || "DOCUMENTACAO/arquivo-xm", LOTE = Number(process.argv[3] || 0.02);
    const sw = {}; for (const l of fs.readFileSync(`${dir}/xm_swaps.csv`, "utf8").split(/\r?\n/).slice(1).filter(Boolean)) { const c = l.split(","); sw[c[0]] = { compra: Number(c[1]), venda: Number(c[2]), modo: Number(c[3]), triplo: Number(c[4]), contrato: Number(c[6]) }; }
    const f = (x, d = 3) => x === null ? "-" : Number(x).toFixed(d);
    const res = [];
    for (const s of ["GOLD", "SILVER", "OILCash", "EURUSD", "GBPUSD"]) {
        const arq = `${dir}/xm_barras_M1_${s}.csv`; if (!fs.existsSync(arq)) { console.log(`${s}: sem arquivo`); continue; }
        const barras = paraUtc(lerCsv(fs.readFileSync(arq, "utf8")), "regra")[s];
        const info = sw[s] || {};
        res.push({ ...analisar(s, barras, info.contrato, sw[s] ? { compra: info.compra, venda: info.venda } : null, LOTE), modo: info.modo, n: barras.length });
    }
    console.log(`LOTE ${LOTE} (o do executor na demo) | USD por unidade de preço = contrato x lote\n`);
    console.log("ativo     | spread mediana (preço) | por operação US$ (med / p90) | US$5 = mover | spread / mover US$5 | mediana 15min | 1h | dia | dia p95 | dia máx");
    for (const r of res) {
        const mover = r.distanciaUsd5;
        console.log(`${r.simbolo.padEnd(9)} | ${f(r.spreadMed, 5).padEnd(10)} | ${f(r.spreadUsdMed, 2)} / ${f(r.spreadUsdP90, 2)} | ${f(mover, 5)} | ${f(100 * r.spreadMed / mover, 0)}% | ${f(r.r15, 4)} | ${f(r.r60, 4)} | ${f(r.rDiaMed, 4)} | ${f(r.rDiaP95, 4)} | ${f(r.rDiaMax, 4)}`);
    }
    console.log("\nspread / movimento mediano (quanto o custo representa do que o preço anda): 15min | 1h | dia");
    for (const r of res) console.log(`${r.simbolo.padEnd(9)} | ${f(100 * r.spreadMed / r.r15, 1)}% | ${f(100 * r.spreadMed / r.r60, 1)}% | ${f(100 * r.spreadMed / r.rDiaMed, 2)}%`);
    console.log("\nquanto o dia MEXE em US$ neste lote (mediana / p95 / máximo do intervalo máx-mín do dia) e o lote que igualaria o risco diário do EURUSD no mesmo lote");
    const ref = res.find(r => r.simbolo === "EURUSD");
    for (const r of res) console.log(`${r.simbolo.padEnd(9)} | ${f(r.rDiaMed * r.usdPorUnidade, 0)} / ${f(r.rDiaP95 * r.usdPorUnidade, 0)} / ${f(r.rDiaMax * r.usdPorUnidade, 0)} US$ | lote equivalente ${ref ? f(LOTE * (ref.rDiaMed * ref.usdPorUnidade) / (r.rDiaMed * r.usdPorUnidade), 4) : "-"}`);
    console.log("\nswap por noite em US$ neste lote (compra / venda); modo 1 = pontos; quarta cobra triplo (dia_triplo=3)");
    for (const r of res) console.log(`${r.simbolo.padEnd(9)} | ${f(r.swapCompraUsd, 2)} / ${f(r.swapVendaUsd, 2)} | modo ${r.modo === undefined ? "?" : r.modo}`);
    console.log("\nspread mediano por hora BRT (em unidades do preço do ativo; hora 0-23)");
    for (const r of res) console.log(`${r.simbolo.padEnd(9)} | ` + r.medHora.map((x, h) => `${String(h).padStart(2, "0")}h ${x === null ? "-" : Number(x).toPrecision(3)}`).join("  "));
    console.log("\nspread da hora do rollover (17-18h BRT) / spread mediano do dia");
    for (const r of res) { const roll = Math.max(r.medHora[17] || 0, r.medHora[18] || 0); console.log(`${r.simbolo.padEnd(9)} | ${f(roll / r.spreadMed, 1)}x`); }
}
