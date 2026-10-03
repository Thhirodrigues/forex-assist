const assert = require("assert");
const { simularOperacao, variantesPadrao } = require("./simulador");
let n = 0;
const t = (nome, fn) => { fn(); n++; console.log("[OK] " + nome); };

const T0 = Date.UTC(2026, 9, 7, 12, 0);
const M = 5 * 60000;
// candle com preço EUR/USD (1 pip = 0,0001)
const c = (i, o, h, l, cl) => ({ timestamp: T0 + i * M, open: o, high: h, low: l, close: cl });
const base = { par: "EUR/USD", direcao: "BUY", tEntrada: T0, precoEntrada: 1.1000, tpPips: 25, slPips: 25 };

t("WIN sem spread: sobe 25 pips", () => {
  const r = simularOperacao({ ...base, candles: [c(0, 1.1, 1.1010, 1.0995, 1.1005), c(1, 1.1005, 1.1026, 1.1004, 1.1020)] });
  assert.equal(r.resultado, "WIN"); assert.equal(r.pips, 25); assert.equal(r.duracaoMin, 10);
});
t("LOSS sem spread: cai 25 pips", () => {
  const r = simularOperacao({ ...base, candles: [c(0, 1.1, 1.1005, 1.0974, 1.0980)] });
  assert.equal(r.resultado, "LOSS"); assert.equal(r.pips, -25);
});
t("spread desloca as barreiras CONTRA: 25 pips exatos não bastam com spread 1,8", () => {
  const r = simularOperacao({ ...base, spreadPips: 1.8, candles: [c(0, 1.1, 1.1025, 1.0999, 1.1020)] });
  assert.equal(r.resultado, "ABERTA");
  const r2 = simularOperacao({ ...base, spreadPips: 1.8, candles: [c(0, 1.1, 1.10269, 1.0999, 1.1020)] });
  assert.equal(r2.resultado, "WIN"); assert.equal(r2.pips, 25);
});
t("spread aproxima o stop: cair 23,2 pips já perde, e perde exatamente 25 líquidos", () => {
  const r = simularOperacao({ ...base, spreadPips: 1.8, candles: [c(0, 1.1, 1.1003, 1.09768, 1.098)] });
  assert.equal(r.resultado, "LOSS"); assert.equal(r.pips, -25);
});
t("candle que toca TP e SL: conta PERDA e marca ambiguo", () => {
  const r = simularOperacao({ ...base, candles: [c(0, 1.1, 1.1030, 1.0970, 1.1)] });
  assert.equal(r.resultado, "LOSS"); assert.equal(r.ambiguo, true);
});
t("SELL espelhado (JPY, pip 0,01)", () => {
  const r = simularOperacao({ par: "USD/JPY", direcao: "SELL", tEntrada: T0, precoEntrada: 150.00, tpPips: 25, slPips: 25,
    candles: [c(0, 150, 150.1, 149.7, 149.8)] });
  assert.equal(r.resultado, "WIN"); assert.equal(r.pips, 25);
});
t("ignora candles anteriores à entrada", () => {
  const r = simularOperacao({ ...base, candles: [{ timestamp: T0 - M, open: 1.1, high: 1.11, low: 1.1, close: 1.1 }, c(0, 1.1, 1.1005, 1.0995, 1.1)] });
  assert.equal(r.resultado, "ABERTA");
});
t("sem limite de tempo: não bate nada = ABERTA", () => {
  const cs = Array.from({ length: 50 }, (_, i) => c(i, 1.1, 1.1005, 1.0995, 1.1));
  assert.equal(simularOperacao({ ...base, candles: cs }).resultado, "ABERTA");
});
t("maxMinutos fecha a mercado no open do candle", () => {
  const cs = Array.from({ length: 6 }, (_, i) => c(i, 1.1 + i * 0.0001, 1.1005 + i * 0.0001, 1.0995, 1.1));
  const r = simularOperacao({ ...base, candles: cs, opcoes: { maxMinutos: 15 } });
  assert.equal(r.resultado, "TEMPO"); assert.equal(r.duracaoMin, 15); assert.equal(r.pips, 3);
});
t("break-even na metade: sobe 13, volta ao zero -> ZERO (não LOSS)", () => {
  const cs = [c(0, 1.1, 1.1013, 1.0999, 1.1010), c(1, 1.1010, 1.1011, 1.0999, 1.1000)];
  const r = simularOperacao({ ...base, candles: cs, opcoes: { breakEvenNaMetade: true } });
  assert.equal(r.resultado, "ZERO"); assert.equal(r.pips, 0);
  assert.equal(simularOperacao({ ...base, candles: cs }).resultado, "ABERTA");
});
t("break-even NÃO protege no próprio candle de ativação (regra 5)", () => {
  const cs = [c(0, 1.1, 1.1013, 1.0999, 1.1010)];   // ativa o BE e já mergulha abaixo do zero a zero no mesmo candle
  const r = simularOperacao({ ...base, candles: cs, opcoes: { breakEvenNaMetade: true } });
  assert.equal(r.resultado, "ABERTA");
});
t("entrada +5 min: entra no open do candle seguinte e refaz as barreiras", () => {
  const cs = [c(0, 1.1, 1.1, 1.1, 1.1), c(1, 1.1010, 1.1012, 1.0990, 1.1000), c(2, 1.1, 1.1036, 1.1, 1.1030)];
  const r = simularOperacao({ ...base, candles: cs, opcoes: { atrasoMin: 5 } });
  assert.equal(r.resultado, "WIN"); assert.equal(r.entrada, 1.1010); assert.equal(r.duracaoMin, 10);
});
t("reanálise contrária fecha na hora, a preço da análise (líquido de spread)", () => {
  const cs = Array.from({ length: 6 }, (_, i) => c(i, 1.1, 1.1005, 1.0995, 1.1));
  const r = simularOperacao({ ...base, spreadPips: 2, candles: cs,
    opcoes: { reanalises: [{ t: T0 + 12 * 60000, preco: 1.0990, tendencia: "BAIXA" }] } });
  assert.equal(r.resultado, "REANALISE"); assert.equal(r.pips, -12); assert.equal(r.tFechamento, T0 + 12 * 60000);
});
t("reanálise a favor/lateral não fecha", () => {
  const cs = Array.from({ length: 6 }, (_, i) => c(i, 1.1, 1.1005, 1.0995, 1.1));
  const r = simularOperacao({ ...base, candles: cs, opcoes: { reanalises: [
    { t: T0 + 6 * 60000, preco: 1.1, tendencia: "ALTA" }, { t: T0 + 11 * 60000, preco: 1.1, tendencia: "LATERAL" }] } });
  assert.equal(r.resultado, "ABERTA");
});
t("reanálise no mesmo candle de um TP: o TP vale primeiro (errar contra a variante)", () => {
  const cs = [c(0, 1.1, 1.1030, 1.0999, 1.1020)];
  const r = simularOperacao({ ...base, candles: cs, opcoes: { reanalises: [{ t: T0 + 2 * 60000, preco: 1.0995, tendencia: "BAIXA" }] } });
  assert.equal(r.resultado, "WIN");
});
t("entradas inválidas são recusadas, não simuladas", () => {
  assert.equal(simularOperacao({ ...base, direcao: null, candles: [] }).resultado, "INVALIDA");
  assert.equal(simularOperacao({ ...base, tpPips: 0, candles: [] }).resultado, "INVALIDA");
  assert.equal(simularOperacao({ ...base, spreadPips: 30, candles: [] }).resultado, "INVALIDA");
});
t("variantesPadrao: ids, 1:2, TP curto e ATR em pips (JPY x100)", () => {
  const v = variantesPadrao({ par: "USD/JPY", tpPips: 25, slPips: 25, indicadores: { atr: 0.08 } });
  const ids = v.map(x => x.id);
  assert.deepEqual(ids, ["ATUAL", "RR_1_2", "TP_CURTO", "BE_METADE", "ENTRADA_MAIS_5", "ENTRADA_MAIS_10", "REANALISE", "ATR_3X"]);
  assert.equal(v[1].tpPips, 50); assert.equal(v[2].tpPips, 12.5); assert.equal(v[7].tpPips, 24);
});
console.log(`TODOS OS ${n} TESTES PASSARAM`);
