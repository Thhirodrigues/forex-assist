const assert = require("assert");
const m = require("./hoje-app-xm");
const BRT = 3 * 3600e3, T0 = Date.parse("2026-11-24T00:00:00Z") + BRT;     // 00:00 BRT
const doc = (hora, par, res, usd, status = "ENCERRADA") => ({ id: `${T0 + hora * 3600e3}_${par}`, timestamp: T0 + hora * 3600e3, par: par.replace("_", "/"), direcao: "BUY", status, resultado: res, resultadoFinanceiro: usd, fimOperacao: T0 + (hora + 1) * 3600e3, financeiro: { tpPips: 25 } });
const h = [doc(1, "EUR_USD", "WIN", 5), doc(2, "GBP_USD", "LOSS", -5), doc(3, "USD_CHF", "WIN", 5), doc(5, "USD_JPY", null, 0, "ABERTA"), { ...doc(-1, "EUR_USD", "WIN", 5) }];   // o último é do dia anterior
const dia = { dia_brt: "2026-11-24", entrou: [h[0].id], pulado_limite_3: [h[1].id], pulado_ja_existe_posicao: [], };
const r = m.cruzarDia(h, dia);
assert.strictEqual(r.sinais.length, 4, "o sinal do dia anterior fica de fora");
assert.deepStrictEqual([r.app.fechados, r.app.win, r.app.loss, r.app.abertos, r.app.usd], [3, 2, 1, 1, 5]);
assert.deepStrictEqual([r.entrou.sinais, r.entrou.usd], [1, 5]);
assert.deepStrictEqual([r.puladoLimite.sinais, r.puladoLimite.usd, r.puladoLimite.loss], [1, -5, 1]);
assert.strictEqual(r.naoChegou.sinais, 2); assert.strictEqual(r.naoChegou.usd, 5);
assert.strictEqual(m.destino("x", dia), "NAO_CHEGOU");
assert.deepStrictEqual(r.noLogSemSinal, []);
assert.deepStrictEqual(m.cruzarDia(h, { ...dia, entrou: ["999_X_Y"] }).noLogSemSinal, ["999_X_Y"]);
assert.strictEqual(r.sinaisPorHoraBrt["01"], 1); assert.strictEqual(m.hhmm(T0 + 4.5 * 3600e3), "04:30");
console.log("hoje-app-xm.test.js: OK");
