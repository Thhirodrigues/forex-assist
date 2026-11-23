// Testes do spread no julgamento de TP/SL (AJUSTE-117). js/checker.js é um script com efeitos (Firebase, serviceAccount), então a função pura
// calcularResultadoOperacao é extraída do texto do arquivo e executada num sandbox com o moneyManager real.
const assert = require("assert");
const fs = require("fs");
const { calcularValorPip } = require("../scripts/moneyManager");
const { spreadAppDoPar, SPREAD_APP_PIPS } = require("../scripts/spreadApp");

const src = fs.readFileSync(__dirname + "/checker.js", "utf8");
const trecho = src.slice(src.indexOf("const CONFIG = {"), src.indexOf("// PROCESSAMENTO"));
const calcular = new Function("calcularValorPip", "getCandles", "return (function(){" + trecho + "; return { calcularResultadoOperacao }; })()")(calcularValorPip, () => []).calcularResultadoOperacao;

const mk = (par, dir, p0) => ({ par, direcao: dir, precoEntrada: p0, lote: 0.02, tpUSD: 5, slUSD: 5, status: "ABERTA", inicioOperacao: 0, financeiro: { tpPips: 25, slPips: 25 } });
const vela = (i, o, h, l, c) => ({ timestamp: (i + 1) * 300000, open: o, high: h, low: l, close: c });
const cfg = { saldoSimulado: 1000 };
const roda = (sinal, candles, spreadPips) => calcular({ sinal, candles, configuracao: cfg, spreadPips });

// 1. COMPRA EUR/USD: o preço anda +26 pips (>= TP de 25). Sem spread: WIN. Com spread 2,0: ainda não (precisa 27).
const compra = mk("EUR/USD", "BUY", 1.1);
const sobe26 = [vela(0, 1.1, 1.1026, 1.0999, 1.1020)];
assert.strictEqual(roda(compra, sobe26, 0).resultado, "WIN");
let r = roda(compra, sobe26, 2.0);
assert.ok(!r.operacaoFinalizada, "26 pips não bastam com spread 2,0");
// anda +27: WIN, e o valor gravado é o do alvo (+US$ 5), não US$ 5,40
r = roda(compra, [vela(0, 1.1, 1.1027, 1.0999, 1.1020)], 2.0);
assert.ok(r.operacaoFinalizada && r.resultado === "WIN" && r.motivoEncerramento === "TP_FINANCEIRO" && r.resultadoFinanceiro === 5, JSON.stringify(r));
assert.strictEqual(r.spreadAplicadoPips, 2.0);

// 2. O SL dispara ANTES: cai 23,5 pips (< 25): sem spread segue aberta; com spread 2,0 (SL em 23) fecha LOSS e grava -US$ 5
const cai = [vela(0, 1.1, 1.1001, 1.09765, 1.0980)];
assert.ok(!roda(compra, cai, 0).operacaoFinalizada);
r = roda(compra, cai, 2.0);
assert.ok(r.operacaoFinalizada && r.resultado === "LOSS" && r.motivoEncerramento === "SL_FINANCEIRO" && r.resultadoFinanceiro === -5, JSON.stringify(r));

// 3. VENDA: simetria (TP precisa de 25 + spread para baixo; SL dispara em 25 - spread para cima)
const venda = mk("GBP/USD", "SELL", 1.3);
assert.strictEqual(roda(venda, [vela(0, 1.3, 1.3001, 1.2974, 1.298)], 0).resultado, "WIN");
assert.ok(!roda(venda, [vela(0, 1.3, 1.3001, 1.2974, 1.298)], 2.3).operacaoFinalizada, "26 pips não bastam");
assert.strictEqual(roda(venda, [vela(0, 1.3, 1.3001, 1.29726, 1.298)], 2.3).resultado, "WIN");   // 27,4 pips >= 25 + 2,3
assert.strictEqual(roda(venda, [vela(0, 1.3, 1.30235, 1.2999, 1.301)], 2.3).resultado, "LOSS");   // +23,5 pips contra, SL em 22,7

// 4. JPY (pip de 0,01) e par cruzado
const jpy = mk("USD/JPY", "BUY", 150);
assert.ok(!roda(jpy, [vela(0, 150, 150.26, 149.99, 150.2)], 2.3).operacaoFinalizada);
assert.strictEqual(roda(jpy, [vela(0, 150, 150.28, 149.99, 150.2)], 2.3).resultado, "WIN");

// 5. mesma vela toca TP e SL: continua LOSS (regra pessimista), com ou sem spread
const ambigua = [vela(0, 1.1, 1.1040, 1.0960, 1.1)];
assert.strictEqual(roda(compra, ambigua, 0).resultado, "LOSS");
assert.strictEqual(roda(compra, ambigua, 2.0).resultado, "LOSS");

// 6. spreadPips ausente ou inválido = comportamento anterior
for (const sp of [undefined, 0, -1, NaN, "x"]) assert.strictEqual(calcular({ sinal: compra, candles: sobe26, configuracao: cfg, spreadPips: sp }).resultado, "WIN");
assert.strictEqual(calcular({ sinal: compra, candles: sobe26, configuracao: cfg }).spreadAplicadoPips, 0);

// 7. trava de segurança: spread absurdo (100 pips) nunca passa de 40% do SL
r = roda(compra, [vela(0, 1.1, 1.1001, 1.0989, 1.0990)], 100);
assert.ok(r.operacaoFinalizada && r.resultado === "LOSS", "SL em 60% do original");

// 8. a tabela: 10 pares, valores plausíveis, par desconhecido = pior caso
for (const par of ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"]) assert.ok(SPREAD_APP_PIPS[par] >= 1.8 && SPREAD_APP_PIPS[par] <= 4, par);
assert.strictEqual(spreadAppDoPar("EUR/USD"), 2.0); assert.strictEqual(spreadAppDoPar("XXX/YYY"), 3.8);
console.log("checker.spread.test.js: OK");
