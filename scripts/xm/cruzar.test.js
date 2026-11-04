const assert = require("assert");
const { casar } = require("./cruzar");
const T = Date.UTC(2026, 10, 4, 5, 0) / 1000;
const op = (par, dir, atrasoMin, extra = {}) => ({ par, direcao: dir, lote: 0.02, abertoUtc: T + atrasoMin * 60, precoEntrada: 0.69721, sl: 0.69969, tp: 0.69469, motivo: "SL", liquido: -4.98, ...extra });
const sig = (id, par, dir, minAntes, extra = {}) => ({ id, par, direcao: dir, inicioOperacao: (T - minAntes * 60) * 1000, precoEntrada: 0.6973, lote: 0.02, financeiro: { tpPips: 25, slPips: 25 }, status: "ENCERRADA", resultado: "LOSS", resultadoFinanceiro: -5, score: 70, ...extra });

// casa o sinal mais recente do mesmo par e direção; atraso, derrapagem e TP/SL em pips
let r = casar([op("AUD/USD", "SELL", 0)], [sig("a", "AUD/USD", "SELL", 4), sig("b", "AUD/USD", "SELL", 30), sig("c", "AUD/USD", "BUY", 2), sig("d", "EUR/USD", "SELL", 1)]);
assert.strictEqual(r.length, 1); assert.strictEqual(r[0].casou, true); assert.strictEqual(r[0].atrasoMin, 4);
assert.strictEqual(r[0].ambiguo, true, "havia dois sinais possíveis (a e b)");
assert.strictEqual(r[0].derrapagemPips, 0.9);                       // |0.6973 - 0.69721| = 0,9 pip
assert.strictEqual(r[0].slPipsXm, 24.8); assert.strictEqual(r[0].tpPipsXm, 25.2);
assert.strictEqual(r[0].slPipsApp, 25); assert.strictEqual(r[0].resultadoApp, "LOSS"); assert.strictEqual(r[0].liquidoXm, -4.98);

// atraso e encerramento do sinal ficam marcados (sinal de 154 min atrás, já fechado há 100 min)
r = casar([op("AUD/USD", "SELL", 0)], [sig("t", "AUD/USD", "SELL", 154, { fimOperacao: (T - 100 * 60) * 1000 })]);
assert.strictEqual(r[0].casou, true); assert.strictEqual(r[0].atrasoMin, 154); assert.strictEqual(r[0].entradaAtrasada, true);
assert.strictEqual(r[0].appJaEncerradoNaEntrada, true); assert.strictEqual(r[0].appFechouEmUtc, new Date((T - 100 * 60) * 1000).toISOString());
r = casar([op("AUD/USD", "SELL", 0)], [sig("u", "AUD/USD", "SELL", 5, { fimOperacao: (T + 50 * 60) * 1000 })]);
assert.strictEqual(r[0].entradaAtrasada, false); assert.strictEqual(r[0].appJaEncerradoNaEntrada, false, "sinal ainda aberto quando entrou");
r = casar([op("AUD/USD", "SELL", 0)], [sig("v", "AUD/USD", "SELL", 5)]);
assert.strictEqual(r[0].appJaEncerradoNaEntrada, false, "sem fimOperacao = ainda aberto");
// fora da janela, direção errada ou par errado: não casa (e diz por quê)
r = casar([op("AUD/USD", "SELL", 0)], [sig("x", "AUD/USD", "SELL", 500)]);
assert.strictEqual(r[0].casou, false); assert.match(r[0].motivo, /nenhum sinal/);
r = casar([op("AUD/USD", "SELL", 0)], [sig("y", "AUD/USD", "BUY", 3)]);
assert.strictEqual(r[0].casou, false);
assert.strictEqual(r[0].sinaisProximos12h.length, 1, "diagnóstico: mostra o sinal da direção oposta");
assert.strictEqual(r[0].sinaisProximos12h[0].dir, "BUY"); assert.strictEqual(r[0].sinaisProximos12h[0].minAntesDaEntrada, 3);
assert.ok(!("pos" in r[0].op), "sem identificadores da conta/posição");
// sinal emitido DEPOIS da entrada não casa (a entrada não pode vir antes do sinal; tolerância de 1 min por relógio)
r = casar([op("AUD/USD", "SELL", 0)], [sig("z", "AUD/USD", "SELL", -10)]);
assert.strictEqual(r[0].casou, false);
// cada sinal casa com UMA operação só: duas entradas no mesmo par/direção usam sinais diferentes
r = casar([op("AUD/USD", "SELL", 0), op("AUD/USD", "SELL", 10)], [sig("p", "AUD/USD", "SELL", 2), sig("q", "AUD/USD", "SELL", -8)]);
assert.strictEqual(r.filter(x => x.casou).length, 2); assert.notStrictEqual(r[0].sinalEmUtc, r[1].sinalEmUtc);
r = casar([op("AUD/USD", "SELL", 0), op("AUD/USD", "SELL", 10)], [sig("só", "AUD/USD", "SELL", 2)]);
assert.strictEqual(r.filter(x => x.casou).length, 1, "um sinal não casa duas vezes");
// operação sem par
assert.strictEqual(casar([{ par: null, abertoUtc: null }], [])[0].casou, false);
// pips de JPY (fator 100)
r = casar([op("EUR/JPY", "SELL", 0, { precoEntrada: 177.333, sl: 177.729, tp: 176.939 })], [sig("j", "EUR/JPY", "SELL", 1, { precoEntrada: 177.333 })]);
assert.strictEqual(r[0].slPipsXm, 39.6); assert.strictEqual(r[0].tpPipsXm, 39.4); assert.strictEqual(r[0].derrapagemPips, 0);
console.log("TODOS OS TESTES DO CRUZAMENTO XM x APP PASSARAM");
