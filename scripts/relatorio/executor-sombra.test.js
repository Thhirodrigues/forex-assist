const assert = require("assert");
const { simular, exp } = require("./executor-sombra");
const H = 3600e3, T0 = Date.UTC(2026, 10, 23, 7);          // 04h de Brasília
let id = 0;
const mk = (par, dir, ab, dur, usd) => ({ id: "s" + id++, par, direcao: dir, timestamp: ab, fimOperacao: ab + dur, status: "ENCERRADA", resultado: usd > 0 ? "WIN" : "LOSS", resultadoFinanceiro: usd, financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 } });
assert.strictEqual(exp("USD", "EUR/USD", true), -1); assert.strictEqual(exp("EUR", "EUR/USD", true), 1); assert.strictEqual(exp("JPY", "EUR/JPY", true), -1); assert.strictEqual(exp("CHF", "EUR/USD", true), 0);
// o caso de 23/11: EUR/USD C, GBP/USD C, USD/CHF V (3 contra o dólar) abertos juntos; o 4º (AUD/USD) é pulado pelo limite de 3
const h = [mk("EUR/USD", "BUY", T0, 5 * H, -5), mk("GBP/USD", "BUY", T0 + 60e3, 5 * H, -5), mk("USD/CHF", "SELL", T0 + 600e3, 5 * H, -5), mk("AUD/USD", "BUY", T0 + 900e3, 5 * H, 5)];
const r = simular(h);
assert.strictEqual(r.sinais, 4); assert.strictEqual(r.tomadosPelasRegrasDeBase, 3); assert.strictEqual(r.puladosMax3, 1);
assert.strictEqual(r.quandoDispararia.moeda, 1, "o 3o contra o dólar dispararia a regra de moeda");
assert.strictEqual(r.moedasQueMaisViolam.USD, 1);
// mesmo par aberto: pulado pela regra de base
const r2 = simular([mk("EUR/USD", "BUY", T0, 5 * H, -5), mk("EUR/USD", "SELL", T0 + H, H, 5)]);
assert.strictEqual(r2.puladosMesmoPar, 1);
// 17h de Brasília (20h UTC) dispara o horário; meta do dia depois de +10 fechado
const r3 = simular([mk("EUR/USD", "BUY", T0, H, 5), mk("GBP/USD", "BUY", T0 + 2 * H / 4, H, 5), mk("USD/CAD", "BUY", T0 + 3 * H, H, 5), mk("AUD/USD", "BUY", Date.UTC(2026, 10, 23, 20, 30), H, 5)]);
assert.ok(r3.quandoDispararia.metaDia >= 1 && r3.quandoDispararia.horario === 1, JSON.stringify(r3.quandoDispararia));
console.log("executor-sombra.test.js: OK");
