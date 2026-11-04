const assert = require("assert");
const { ZERAR, selecionarFechadas, metricas, relatorio } = require("./regra625");

const T = ZERAR + 3600e3;
const mk = (i, res, par = "EUR/USD", extra = {}) => ({ id: "s" + i, timestamp: T + i * 3600e3 * 5, fimOperacao: T + i * 3600e3 * 5 + 1800e3, par, status: "ENCERRADA", resultado: res, resultadoFinanceiro: res === "WIN" ? 5 : -5, financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 }, ...extra });
const h = [];
for (let i = 0; i < 30; i++) h.push(mk(i, i % 2 ? "WIN" : "LOSS"));
h.push(mk(31, "WIN", "EUR/USD", { timestamp: ZERAR - 1 }));                                   // antes do zerar: fora
h.push(mk(32, "WIN", "EUR/USD", { financeiro: { regimeTPSL: "OUTRO", tpPips: 25, slPips: 25 } })); // regime fora
h.push(mk(33, "WIN", "EUR/USD", { status: "ABERTA" }));                                         // aberta: não conta como fechada
h.push(mk(34, "EXPIRADA"));                                                                      // sem WIN/LOSS
const fe = selecionarFechadas(h);
assert.strictEqual(fe.length, 30);
assert.ok(fe.every((s, i) => i === 0 || fe[i - 1].fimOperacao <= s.fimOperacao), "ordem de fechamento");

const m = metricas(fe, "teste", () => 2);   // spread fixo de 2 pips
assert.strictEqual(m.n, 30); assert.strictEqual(m.acertoPct, 50); assert.strictEqual(m.brutoPips, 0);
assert.strictEqual(m.liquidoPips, -2); assert.ok(m.icLiquido[0] <= -2 && m.icLiquido[1] >= -2 || m.icLiquido[0] === m.icLiquido[1]);
assert.deepStrictEqual(metricas(fe, "teste", () => 2), m, "bootstrap determinístico (semente fixa)");
assert.strictEqual(metricas([], "x").n, 0);

const r = relatorio(h, ZERAR + 31 * 86400000);
assert.strictEqual(r.fechadasConfig, 30); assert.strictEqual(r.abertasNoApp, 1); assert.strictEqual(r.marco400Atingido, false);
assert.strictEqual(r.marcos[100], "ainda não");
assert.match(r.janelas[2].motivo, /faltam 370/);
console.log("TODOS OS TESTES DOS MARCOS 6.25 PASSARAM");
