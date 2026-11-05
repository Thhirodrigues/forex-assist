const assert = require("assert");
const { compararEnsaio, parDoId } = require("./ensaio-comparar");
assert.strictEqual(parDoId("1793840741416_NZD_USD"), "NZD/USD");
const T = Date.UTC(2026, 10, 5, 3, 0);
const ens = { janelaUtc: ["2026-11-05T00:51:00Z", "2026-11-05T17:25:00Z"], faria: [
    { id: "A_EUR_USD", dir: "BUY", preco: 1.12670, tp: 1.12920, sl: 1.12420, atrasoS: 10, derrapagemPips: 1.2 },
    { id: "B_USD_JPY", dir: "SELL", preco: 158.076, tp: 157.681, sl: 158.471, atrasoS: 4, derrapagemPips: 5.8 },
    { id: "C_AUD_USD", dir: "BUY", preco: 0.70110, tp: 0.70360, sl: 0.69860, atrasoS: 2, derrapagemPips: -0.8 }] };
const app = [
    { id: "A_EUR_USD", par: "EUR/USD", direcao: "BUY", precoEntrada: 1.12658, inicioOperacao: T, financeiro: { tpPips: 25, slPips: 25 }, status: "ENCERRADA", resultado: "WIN", resultadoFinanceiro: 5, score: 70 },
    { id: "B_USD_JPY", par: "USD/JPY", direcao: "BUY", precoEntrada: 158.134, inicioOperacao: T + 600000, financeiro: { tpPips: 39.5, slPips: 39.5 }, status: "ABERTA" },   // direção diferente de propósito
    { id: "D_GBP_USD", par: "GBP/USD", direcao: "SELL", precoEntrada: 1.35, inicioOperacao: T + 1200000, financeiro: { tpPips: 25, slPips: 25 }, status: "ABERTA" },   // o executor não viu
    { id: "Z_FORA", par: "EUR/USD", direcao: "BUY", precoEntrada: 1.1, inicioOperacao: Date.UTC(2026, 10, 6), financeiro: {}, status: "ABERTA" }   // fora da janela
];
const r = compararEnsaio(ens, app);
assert.strictEqual(r.faria, 3); assert.strictEqual(r.encontradosNoApp, 2);
assert.deepStrictEqual(r.direcaoDivergente, ["B_USD_JPY"]);
assert.deepStrictEqual(r.tpSlDivergente, [], "TP/SL em pips iguais ao do app (tolerância de 0,6 pip)");
assert.strictEqual(r.linhas[0].derrapagemRecalculadaPips, 1.2, "(1,12670 - 1,12658) x 10000");
assert.strictEqual(r.linhas[2].encontradoNoApp, false);
assert.deepStrictEqual(r.naoVistosPeloExecutor.map(x => x.id), ["D_GBP_USD"], "sinal da janela que o executor não viu; o de fora da janela não conta");
assert.strictEqual(r.atrasoMedianoS, 4);
// TP diferente é detectado
const app2 = [{ ...app[0], financeiro: { tpPips: 30, slPips: 25 } }];
assert.deepStrictEqual(compararEnsaio({ ...ens, faria: [ens.faria[0]] }, app2).tpSlDivergente, ["A_EUR_USD"]);
console.log("TODOS OS TESTES DA COMPARAÇÃO DO ENSAIO PASSARAM");
