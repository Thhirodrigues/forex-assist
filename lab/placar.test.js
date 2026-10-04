const assert = require("assert");
const { montarPlacar, formatarPlacar } = require("./placar");
const { processarPar, contarEntradas } = require("./nucleo");

const linha = (grupo, n, pos, pips = 0, extra = {}) => ({ tipo: "OFICIAL", epoca: "pos", variante: "ATUAL", grupo, n, pos, neg: n - pos, zero: 0, pips, dur: 0, amb: 0, ...extra });

// H1: A (score>=50) 36% x B 52% -> -16 pts, n pequeno: "só triagem" mas no sentido da hipótese
let p = montarPlacar([linha("H1_score50mais", 25, 9), linha("H1_score35a49", 25, 13), linha("TODOS", 50, 22)]);
const h1 = p.find(x => x.id === "H1");
assert.equal(h1.diferenca, -16); assert.equal(h1.sentidoDaHipotese, false, "n=25: ruído, não marca"); assert.equal(h1.diferencaGrandeMasAmostraPequena, true); assert.equal(h1.amostra, "só triagem");
const h1grande = montarPlacar([linha("H1_score50mais", 120, 43), linha("H1_score35a49", 120, 62)]).find(x => x.id === "H1");
assert.equal(h1grande.sentidoDaHipotese, true); assert.equal(h1grande.amostra, "indício");
// sem dados: não inventa
const h2 = p.find(x => x.id === "H2");
assert.equal(h2.diferenca, null); assert.equal(h2.sentidoDaHipotese, false); assert.equal(h2.nA, 0);
// diferença menor que 10 pontos não conta; faixas de amostra
p = montarPlacar([linha("H5_balanceado", 300, 126), linha("H5_agressivo", 300, 135)]);
const h5 = p.find(x => x.id === "H5");
assert.equal(h5.diferenca, -3); assert.equal(h5.sentidoDaHipotese, false); assert.equal(h5.amostra, "teste");
// época/tipo certos: linha da época pre não entra no placar pos
assert.equal(montarPlacar([linha("H1_score50mais", 9, 1, 0, { epoca: "pre" })]).find(x => x.id === "H1").nA, 0);
assert.ok(formatarPlacar(montarPlacar([])).includes("H4"));

// contarEntradas (recontagem) tem que dar EXATAMENTE os mesmos contadores do caminho incremental
const T0 = Date.UTC(2026, 9, 7, 12, 0), M = 60000;
const c = (i, o, h, l, cl) => ({ timestamp: T0 + i * 5 * M, open: o, high: h, low: l, close: cl });
const an = (id, min, extra = {}) => ({ id, timestamp: T0 + min * M, par: "EUR/USD", aprovado: true, direcao: "BUY", tendencia: "ALTA",
  precoEntrada: 1.1, tpPips: 25, slPips: 25, perfilResolvido: "AGRESSIVO", score: 52, indicadores: { adx: 33, rsi: 55, atr: 0.0008 }, ...extra });
const candles = [c(0, 1.1, 1.1004, 1.0996, 1.1), c(1, 1.1, 1.1030, 1.0999, 1.1020), c(2, 1.1, 1.1004, 1.0996, 1.1)];
const r = processarPar({ par: "EUR/USD", analises: [an("a", 0), an("b", 60, { score: 41, adx: 20 })], abertas: [], ultimoLab: null,
  candles: [...candles, ...Array.from({ length: 20 }, (_, i) => c(i + 3, 1.1, 1.1, 1.0996, 1.1)), c(23, 1.1, 1.1, 1.0970, 1.0980)], registradoEm: T0 - 1, agora: T0 + 900 * M });
const refeito = contarEntradas(r.entradas);
assert.deepEqual(Object.keys(refeito).sort(), Object.keys(r.deltas).sort());
for (const k of Object.keys(refeito)) assert.deepEqual(refeito[k], r.deltas[k], `contador ${k} difere`);
console.log("TESTES DO PLACAR/RECONTAGEM PASSARAM");
