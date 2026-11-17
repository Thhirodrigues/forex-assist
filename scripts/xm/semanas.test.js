const assert = require("assert");
const { nivelCesta, periodoCesta, SINAL } = require("./semanas");
const H = 3600e3, T0 = Date.UTC(2026, 10, 9, 3);
// dolar sobe 1% em 10h: pares USD/XXX +1%, XXX/USD -1%
function barras(fator) {
    const out = {};
    for (const [sym, sg] of Object.entries(SINAL)) out[sym] = Array.from({ length: 12 }, (_, i) => ({ ms: T0 + i * H, c: 1 * Math.exp(sg * fator * i * 0.001) }));
    return out;
}
const sobe = nivelCesta(barras(1)), cai = nivelCesta(barras(-1));
assert.strictEqual(sobe.length, 12);
const ps = periodoCesta(sobe, T0, T0 + 12 * H), pc = periodoCesta(cai, T0, T0 + 12 * H);
assert.ok(ps.derivaPct > 0 && pc.derivaPct < 0, "sinal da deriva");
assert.ok(Math.abs(ps.derivaPct - 1.1) < 0.01, "deriva ~ 11 passos de 0,1%: " + ps.derivaPct);
assert.ok(ps.eficiencia > 0.99, "tendencia limpa");
assert.strictEqual(periodoCesta(sobe, T0, T0 + 2 * H), null);          // poucas horas
const falta = barras(1); delete falta.USDJPY;
assert.deepStrictEqual(nivelCesta(falta), []);                          // cesta incompleta
console.log("semanas.test.js: OK");
