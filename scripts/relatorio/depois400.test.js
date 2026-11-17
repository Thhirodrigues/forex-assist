const assert = require("assert");
const { depois400, semanaBrt } = require("./depois400");
const Z = Date.UTC(2026, 9, 5, 12);
const mk = (i, win) => ({ id: "s" + i, par: "EUR/USD", direcao: "BUY", status: "ENCERRADA", resultado: win ? "WIN" : "LOSS", timestamp: Z + i * 3600e3,
    fimOperacao: Z + i * 3600e3 + 1800e3, resultadoFinanceiro: win ? 5 : -5, financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25, lote: 0.04 } });
const h = []; for (let i = 0; i < 30; i++) h.push(mk(i, i % 3 !== 0));
const r = depois400(h, { apos: 10 });
assert.strictEqual(r.fechadasTotal, 30); assert.strictEqual(r.novasDepoisDaApos, 20);
assert.strictEqual(r.metricaNovas.n, 20); assert.ok(r.porSemana.length >= 1);
assert.strictEqual(r.porSemana.reduce((a, g) => a + g.n, 0), 20);
assert.strictEqual(semanaBrt(Date.UTC(2026, 10, 17, 12)), "2026-11-16");   // terca -> segunda
assert.strictEqual(semanaBrt(Date.UTC(2026, 10, 15, 12)), "2026-11-09");   // domingo -> segunda anterior
console.log("depois400.test.js: OK");
