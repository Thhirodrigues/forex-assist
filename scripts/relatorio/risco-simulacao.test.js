const assert = require("assert");
const { simular } = require("./risco-simulacao");
const H = 3600e3, T0 = Date.UTC(2026, 10, 9, 12);
let id = 0;
const mk = (par, dir, ab, dur, win) => ({ id: "s" + id++, par, direcao: dir, timestamp: ab, fimOperacao: ab + dur, status: "ENCERRADA", resultado: win ? "WIN" : "LOSS", resultadoFinanceiro: win ? 5 : -5, financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 } });
// 5 sinais EUR/USD de compra (dólar fraco = "vendido") abertos juntos, todos perdem
const h = [0, 1, 2, 3, 4].map(i => mk("EUR/USD", "BUY", T0 + i * 600e3, 10 * H, false));
const r = simular(h);
assert.strictEqual(r.total.n, 5);
assert.strictEqual(r.tomados.n, 2, "limite de 2 por lado do dólar aberto: " + JSON.stringify(r.tomados));
assert.strictEqual(r.bloqueados.n, 3);
assert.strictEqual(r.tomados.usdTotal, -10); assert.strictEqual(r.total.usdTotal, -25);
assert.ok(r.motivosQualquer.mesmoLado >= 3);
console.log("risco-simulacao.test.js: OK");
