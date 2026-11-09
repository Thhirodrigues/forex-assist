const assert = require("assert");
const { ZERAR } = require("../marco/regra625");
const { analisar, ladoDolar } = require("./analise400");

assert.strictEqual(ladoDolar("EUR/USD", "BUY"), "vendido");
assert.strictEqual(ladoDolar("EUR/USD", "SELL"), "comprado");
assert.strictEqual(ladoDolar("USD/JPY", "BUY"), "comprado");
assert.strictEqual(ladoDolar("USD/CHF", "SELL"), "vendido");
assert.strictEqual(ladoDolar("EUR/JPY", "SELL"), "cruzado");

// 10 operações sintéticas (segunda 05/10/2026 em diante), TP=SL=25, EUR/USD com spread 1,8
const seg = Date.parse("2026-10-05T13:00:00Z");
const mk = (i, res, par = "EUR/USD", dir = "BUY", extra = {}) => ({ id: "s" + i, par, direcao: dir, timestamp: seg + i * 3600e3, inicioOperacao: seg + i * 3600e3,
    fimOperacao: seg + i * 3600e3 + 1800e3, status: "ENCERRADA", resultado: res, resultadoFinanceiro: res === "WIN" ? 5 : -5,
    financeiro: { regimeTPSL: "CONFIG", tpPips: 25, slPips: 25 }, score: 40 + i, indicadores: { adx: 20 + i, rsi: 50, atr: 0.001 }, janelaOrigem: "londres", ...extra });
const h = [];
for (let i = 0; i < 10; i++) h.push(mk(i, i < 4 ? "WIN" : "LOSS"));
h.push(mk(20, "WIN", "EUR/USD", "BUY", { timestamp: ZERAR - 1 }));   // antes do zerar: fora
const a = analisar(h);
assert.strictEqual(a.total.n, 10); assert.strictEqual(a.win.n, 4); assert.strictEqual(a.loss.n, 6);
assert.strictEqual(a.total.acertoPct, 40);
assert.strictEqual(a.win.pipsBrutos, 100); assert.strictEqual(a.loss.pipsBrutos, -150);
assert.strictEqual(a.win.usdApp, 20); assert.strictEqual(a.loss.usdApp, -30);
assert.strictEqual(a.total.pipsLiquidos, -50 - 18);
// invertido: 6 LOSS viram WIN => 60%; bruto invertido +5 pips/op; líquido +5 - 1,8 = 3,2
assert.strictEqual(a.invertido.simetricas, 10); assert.strictEqual(a.invertido.acertoInvertidoPct, 60);
assert.strictEqual(a.invertido.brutoInvertidoPorOp, 5); assert.strictEqual(a.invertido.liquidoInvertidoPorOp, 3.2);
assert.strictEqual(a.invertido.acertoParaEmpatarPct, 53.6);   // (25 + 1,8) / 50
// horas em Brasília: 13Z = 10h
assert.strictEqual(a.porHora[0].chave, 10);
assert.strictEqual(a.porDiaSemana[0].chave, "seg");
assert.ok(a.dias.melhores.length >= 1 && a.dias.piores.length >= 1);
assert.strictEqual(a.perfilWin.n, 4); assert.strictEqual(a.perfilLoss.n, 6);
assert.strictEqual(a.porLadoDolar[0].chave, "vendido");
// limite: só as N primeiras por ordem de fechamento
assert.strictEqual(analisar(h, { limite: 3 }).total.n, 3);
console.log("TODOS OS TESTES DO RELATÓRIO DAS 400 PASSARAM");
