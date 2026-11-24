const assert = require("assert");
const c = require("./custo-ativos");
assert.strictEqual(c.usdPorUnidade(100, 0.02), 2);                       // ouro: 0,02 lote = 2 onças
assert.strictEqual(c.usdPorUnidade(100000, 0.02), 2000);                 // EURUSD: 0,02 lote = 2.000 unidades
assert.ok(Math.abs(c.swapUsdNoite(-69.5, 0.01, 100, 0.01) - (-0.695)) < 1e-9);   // ouro, compra, 0,01 lote
assert.strictEqual(c.quantil([5, 1, 3], 0.5), 3);
assert.strictEqual(c.horaBrt(Date.UTC(2026, 10, 24, 3)), 0);              // 03:00 UTC = 00:00 BRT
assert.strictEqual(c.horaBrt(Date.UTC(2026, 10, 24, 20)), 17);
assert.deepStrictEqual(c.agrupar([{ ms: 0, h: 5, l: 1 }, { ms: 1000, h: 4, l: 0 }, { ms: 900000, h: 9, l: 8 }], b => Math.floor(b.ms / 900000)).sort(), [1, 5]);
console.log("custo-ativos.test.js: OK");
