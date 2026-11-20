const assert = require("assert");
const t = require("./tsmom");
const D = 86400;
// série diária sintética (dias úteis), preço sobe 0,1% ao dia: momento sempre positivo -> sempre comprado, bruto > 0
function serie(ini, n, passo) { const v = []; let p = 1.1; for (let i = 0, d = ini; v.length < n; d += D) { const w = new Date(d * 1000).getUTCDay(); if (w === 0 || w === 6) continue; p *= Math.exp(passo); v.push({ t: d, o: p, h: p, l: p, c: p }); } return v; }
const ini = Date.UTC(2005, 0, 3) / 1000;
const barras = { "EUR/USD": serie(ini, 1500, 0.001), "USD/JPY": serie(ini, 1500, -0.001).map(b => ({ ...b, c: b.c * 100, o: b.o * 100, h: b.h * 100, l: b.l * 100 })) };
const swaps = { "EUR/USD": { compra: -10, venda: 2, modo: 1, triplo: 3, ponto: 0.00001 }, "USD/JPY": { compra: 2, venda: -30, modo: 1, triplo: 3, ponto: 0.001 } };
const m = t.braco(barras, swaps, { chave: t.chaveMes, retro: 12, inicio: ini });
assert.ok(m.length > 40, "períodos mensais: " + m.length);
for (const p of m) for (const x of p.pares) {
    assert.strictEqual(x.dir, x.par === "EUR/USD" ? 1 : -1, "direção segue a tendência");
    assert.ok(x.bruto > 0 && x.liqSemSwap < x.bruto && x.liq < x.liqSemSwap, "custo e swap negativos reduzem");
}
// rolagens: seg->seg = 5 dias úteis, quarta conta 3 => 7
const seg = Date.UTC(2026, 10, 9) / 1000, b = serie(seg, 10, 0);
assert.strictEqual(t.rolagens(b, 0, 5, 3), 7);
// D1: descarta a última vela; lê cabeçalho
const txt = "offset_servidor_seg=7200\nsimbolo,hora_servidor,open,high,low,close,spread_pontos,digitos\nEURUSD,100,1,1,1,1,5,5\nEURUSD,200,1,1,1,1.1,5,5\nEURUSD,300,1,1,1,1.2,5,5\n";
assert.strictEqual(t.lerD1(txt).length, 2);
// swaps
const sw = t.lerSwaps("simbolo,swap_compra,swap_venda,modo_swap,dia_triplo,ponto,tamanho_contrato,data_export\nUSDJPY,2.11,-29.59,1,3,0.001,100000,x\n");
assert.deepStrictEqual(sw["USD/JPY"], { compra: 2.11, venda: -29.59, modo: 1, triplo: 3, ponto: 0.001 });
// resumo: série positiva constante => passa; série de ruído em torno de 0 => reprova
const pos = Array.from({ length: 120 }, (_, i) => ({ tIni: ini + i * 30 * D, bruto: 0.01, liqSemSwap: 0.009, liq: 0.008 + (i % 2 ? 0.001 : -0.001), aleatorio: -0.001, usd: 0 }));
assert.ok(t.resumo(pos, { bloco: 3, porAno: 12 }).veredito.startsWith("PASSOU"));
const ruido = pos.map((p, i) => ({ ...p, liq: (i % 2 ? 0.02 : -0.0201) }));
assert.strictEqual(t.resumo(ruido, { bloco: 3, porAno: 12 }).veredito, "REPROVADO");
assert.strictEqual(t.usdLado("USD/JPY"), 1); assert.strictEqual(t.usdLado("EUR/USD"), -1); assert.strictEqual(t.usdLado("EUR/GBP"), null);
console.log("tsmom.test.js: OK");
