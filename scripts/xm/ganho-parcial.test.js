const assert = require("assert");
const g = require("./ganho-parcial");
const M5 = 300000, T0 = Date.UTC(2026, 10, 9, 12), PIP = 0.0001;
const bar = (i, o, h, l, c, sp = 0) => ({ ms: T0 + i * M5, o, h, l, c, sp, dig: 5 });
const sinal = { t: T0, par: "EUR/USD", direcao: "BUY", tp: 10, sl: 10 };
// compra, spread 0: sobe 6 pips (60%) e depois cai ao SL -> alcançou 30/50/60, não 80, e termina LOSS
let b = [bar(0, 1.1, 1.1001, 1.0999, 1.1), bar(1, 1.1, 1.1006, 1.0999, 1.1005), bar(2, 1.1005, 1.1005, 1.0990, 1.0991)];
let r = g.mfeAteDesfecho(sinal, b);
assert.strictEqual(r.estado, "LOSS"); assert.deepStrictEqual(r.alcancou, { 30: true, 50: true, 60: true, 80: false });
// sobe direto ao TP -> WIN e todos os limiares
b = [bar(0, 1.1, 1.1001, 1.0999, 1.1), bar(1, 1.1, 1.1011, 1.0999, 1.101)]; r = g.mfeAteDesfecho(sinal, b);
assert.strictEqual(r.estado, "WIN"); assert.ok(Object.values(r.alcancou).every(Boolean));
// vela que toca TP e SL = AMBIGUO e não marca limiar
b = [bar(0, 1.1, 1.1001, 1.0999, 1.1), bar(1, 1.1, 1.1011, 1.0989, 1.1)]; r = g.mfeAteDesfecho(sinal, b);
assert.strictEqual(r.estado, "AMBIGUO"); assert.ok(Object.values(r.alcancou).every(x => !x));
// vela que alcança 60% mas também toca o SL: pessimista, não conta
b = [bar(0, 1.1, 1.1001, 1.0999, 1.1), bar(1, 1.1, 1.1007, 1.0989, 1.0995)]; r = g.mfeAteDesfecho(sinal, b);
assert.strictEqual(r.estado, "LOSS"); assert.strictEqual(r.alcancou[60], false);
// spread come o ganho: compra com spread de 2 pips precisa de 2 pips a mais na máxima
b = [bar(0, 1.1, 1.1001, 1.0999, 1.1, 20), bar(1, 1.1, 1.1006, 1.0999, 1.1, 20)]; r = g.mfeAteDesfecho(sinal, b);
assert.strictEqual(r.alcancou[60], false); assert.strictEqual(r.alcancou[30], true === (6 - 2 >= 3));
// política: média com limiar < média normal quando o LOSS que passou pelo limiar vira ganho pequeno
const julg = [{ r: { estado: "LOSS", alcancou: { 30: true, 50: true, 60: true, 80: false }, tp: 10, sl: 10 }, dia: "a" }, { r: { estado: "WIN", alcancou: { 30: true, 50: true, 60: true, 80: true }, tp: 10, sl: 10 }, dia: "a" }];
const p = g.politicaLimiar(julg, 60);
assert.strictEqual(p.alcancaram, 2); assert.strictEqual(p.terminaramLoss, 1); assert.strictEqual(p.pctLossDepois, 50);
assert.deepStrictEqual(p.pnlNormal.map(x => x.v), [-10, 10]); assert.deepStrictEqual(p.pnlPolitica.map(x => x.v), [6, 6]);
// avisos do app
const fechadas = [
    { resultado: "LOSS", resultadoFinanceiro: -5, avisoParcial: { usd: 3, pctAtingido: 62 } },
    { resultado: "WIN", resultadoFinanceiro: 5, avisoParcial: { usd: 3.1, pctAtingido: 61 } },
    { resultado: "WIN", resultadoFinanceiro: 5 }, { resultado: "LOSS", resultadoFinanceiro: -5 }];
const a = g.avisosDoApp(fechadas);
assert.deepStrictEqual([a.comAviso.n, a.comAviso.loss, a.semAviso.n, a.semAviso.loss], [2, 1, 2, 1]);
assert.strictEqual(a.usdQueValeu, 0); assert.strictEqual(a.usdSeEncerrasseNoAviso, 6.1); assert.strictEqual(a.diferencaUsd, 6.1);
console.log("ganho-parcial.test.js: OK");
