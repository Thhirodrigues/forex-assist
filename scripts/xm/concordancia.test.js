const assert = require("assert");
const c = require("./concordancia");
const M5 = 300000, T0 = Date.UTC(2026, 10, 24, 12), PIP = 0.0001;
const bar = (i, o, h, l, cl, sp = 0) => ({ ms: T0 + i * M5, o, h, l, c: cl, sp, dig: 5 });
// compra EUR/USD, TP/SL 10 pips; sobe 12 pips -> a XM julga WIN
const barras = { EURUSD: [bar(0, 1.1, 1.1001, 1.0999, 1.1), bar(1, 1.1, 1.1013, 1.0999, 1.1012), bar(2, 1.1012, 1.1012, 1.1008, 1.101)] };
const sin = (id, res, status = "ENCERRADA", extra = {}) => ({ id, par: "EUR/USD", direcao: "BUY", timestamp: T0 + 60000, inicioOperacao: T0 + 60000, precoEntrada: 1.1, status, resultado: res,
    fimOperacao: T0 + 2 * M5, financeiro: { tpPips: 10, slPips: 10 }, ...extra });
const h = [sin("a", "WIN"), sin("b", "LOSS"), sin("c", null, "ABERTA", { fimOperacao: null }), sin("d", "WIN", "ENCERRADA", { spreadAplicadoPips: 2 })];
const l = c.compararSinais(h, barras, { desde: T0 });
assert.strictEqual(l.length, 4);
assert.strictEqual(l[0].xm, "WIN"); assert.strictEqual(l[0].app, "WIN"); assert.strictEqual(l[1].app, "LOSS");
assert.strictEqual(l[2].app, "ABERTA"); assert.strictEqual(l[3].epoca, "COM_SPREAD_NO_APP");
const r = c.resumo(l);
assert.deepStrictEqual([r.SEM_SPREAD_NO_APP.decididosNosDois, r.SEM_SPREAD_NO_APP.concordam, r.SEM_SPREAD_NO_APP.matriz.appLOSS_xmWIN], [2, 1, 1]);
assert.strictEqual(r.SEM_SPREAD_NO_APP.appAbertoXmDecidido, 1);
assert.strictEqual(r.COM_SPREAD_NO_APP.pctConcordam, 100);
// sinal antes de `desde` fica de fora; par sem barras = SEM_DADOS
assert.strictEqual(c.compararSinais(h, barras, { desde: T0 + 10 * M5 }).length, 0);
assert.strictEqual(c.compararSinais([{ ...sin("e", "WIN"), par: "NZD/USD" }], barras, { desde: T0 })[0].xm, "SEM_DADOS");
assert.strictEqual(c.hhmm(Date.UTC(2026, 10, 24, 15, 30)), "11-24 12:30");
console.log("concordancia.test.js: OK");
