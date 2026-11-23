// AJUSTE-117: sinais julgados COM spread não descontam o spread de novo nas medidas; os antigos continuam descontando.
const assert = require("assert");
const { registro } = require("./analise400");
const { metricas } = require("../marco/regra625");
const { resumoSimples } = require("./montar");
const d = require("../../js/decisao");
const base = { par: "EUR/USD", direcao: "BUY", resultado: "WIN", resultadoFinanceiro: 5, status: "ENCERRADA", timestamp: Date.UTC(2026, 10, 24, 12), fimOperacao: Date.UTC(2026, 10, 24, 14), financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 } };
const antigo = { ...base }, novo = { ...base, spreadAplicadoPips: 2.0 };
assert.strictEqual(registro(antigo).spread, 1.8); assert.ok(Math.abs(registro(antigo).liq - 23.2) < 1e-9);
assert.strictEqual(registro(novo).spread, 0); assert.strictEqual(registro(novo).liq, 25);
assert.strictEqual(registro({ ...novo, resultado: "LOSS" }).liq, -25);
assert.strictEqual(metricas([antigo], "a").liquidoPips, 23.2); assert.strictEqual(metricas([novo], "n").liquidoPips, 25);
assert.ok(Math.abs(resumoSimples([antigo]).liqPips - 23.2) < 1e-9); assert.strictEqual(resumoSimples([novo]).liqPips, 25);
assert.strictEqual(registro({ ...base, spreadAplicadoPips: 0 }).spread, 1.8, "spread 0 = época antiga");
// bloco "Histórico real": nota e empate por época
const r1 = d.dcResumo([antigo], { par: "EUR/USD", timestamp: base.timestamp, financeiro: { tpPips: 25, slPips: 25 } }, 1.8, "legado");
assert.ok(Math.abs(r1.empate - 53.6) < 0.01 && d.dcHTML(r1).includes("sem spread") && d.dcHTML(r1).includes("4 a 6 pontos"));
const r2 = d.dcResumo([novo], { par: "EUR/USD", timestamp: base.timestamp, financeiro: { tpPips: 25, slPips: 25 } }, 0, "v2");
assert.strictEqual(r2.empate, 50); assert.ok(d.dcHTML(r2).includes("já com o spread da XM") && !d.dcHTML(r2).includes("4 a 6 pontos"));
console.log("spread-epoca.test.js: OK");
