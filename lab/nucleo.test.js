const assert = require("assert");
const { processarPar, gruposDaEntrada } = require("./nucleo");
let n = 0;
const t = (nome, fn) => { fn(); n++; console.log("[OK] " + nome); };

const T0 = Date.UTC(2026, 9, 7, 12, 0);
const M = 60000;
const c = (i, o, h, l, cl) => ({ timestamp: T0 + i * 5 * M, open: o, high: h, low: l, close: cl });
const an = (id, min, extra = {}) => ({ id, timestamp: T0 + min * M, par: "EUR/USD", aprovado: false, tendencia: "ALTA",
  precoEntrada: 1.1, tpPips: 25, slPips: 25, perfilResolvido: "AGRESSIVO", score: 45, indicadores: { adx: 20, rsi: 55, atr: 0.0008 }, ...extra });
const flat = (i) => c(i, 1.1, 1.1004, 1.0996, 1.1);
const base = { par: "EUR/USD", abertas: [], ultimoLab: null, registradoEm: T0 - 1, agora: T0 + 600 * M };

t("aprovada gera OFICIAL + LAB; reprovada com tendência gera só LAB", () => {
  const candles = Array.from({ length: 12 }, (_, i) => flat(i));
  const r = processarPar({ ...base, candles, analises: [an("a1", 0, { aprovado: true, direcao: "BUY" })] });
  assert.deepEqual(r.entradas.map(e => e.id).sort(), ["LAB_a1", "OFICIAL_a1"]);
  const r2 = processarPar({ ...base, candles, analises: [an("b1", 0)] });
  assert.deepEqual(r2.entradas.map(e => e.id), ["LAB_b1"]);
});
t("tendência LATERAL/CONFLITO sem aprovação é ignorada (sem direção)", () => {
  const r = processarPar({ ...base, candles: [flat(0)], analises: [an("x", 0, { tendencia: "LATERAL" })] });
  assert.equal(r.entradas.length, 0); assert.equal(r.ignoradas.semDirecao, 1);
});
t("sem TP/SL na análise é ignorada e contada (para vermos o buraco nos dados)", () => {
  const r = processarPar({ ...base, candles: [flat(0)], analises: [an("x", 0, { tpPips: null, slPips: null })] });
  assert.equal(r.entradas.length, 0); assert.equal(r.ignoradas.semTpSl, 1);
});
t("cooldown virtual: enquanto a posição está aberta, análises seguintes do par são ignoradas", () => {
  const candles = Array.from({ length: 30 }, (_, i) => flat(i));   // nada bate
  const r = processarPar({ ...base, candles, analises: [an("a", 0), an("b", 15), an("c", 40), an("d", 80)] });
  assert.deepEqual(r.entradas.map(e => e.id), ["LAB_a"]); assert.equal(r.ignoradas.cooldown, 3);
  assert.equal(r.ultimoLab.atualR, "ABERTA");
});
t("depois que fecha E passaram 30 min, libera a próxima", () => {
  const candles = [flat(0), c(1, 1.1, 1.1030, 1.0999, 1.1020), ...Array.from({ length: 28 }, (_, i) => flat(i + 2))];  // WIN no 2º candle (fecha em 10 min)
  const r = processarPar({ ...base, candles, analises: [an("a", 0), an("b", 15), an("c", 40)] });
  assert.deepEqual(r.entradas.map(e => e.id), ["LAB_a", "LAB_c"]);   // b cai dentro dos 30 min
  assert.equal(r.entradas[0].variantes.ATUAL.r, "WIN");
});
t("contadores: WIN soma pos, pips e duração; chave separa tipo/variante/época", () => {
  const candles = [flat(0), c(1, 1.1, 1.1030, 1.0999, 1.1020)];
  const r = processarPar({ ...base, registradoEm: T0 + 5 * M, candles, analises: [an("a", 0, { aprovado: true, direcao: "BUY" })] });
  const d = r.deltas["OFICIAL__ATUAL__pre__TODOS"];
  assert.ok(d); assert.equal(d.n, 1); assert.equal(d.pos, 1); assert.equal(d.pips, 25); assert.equal(d.dur, 10);
  assert.equal(r.deltas["OFICIAL__RR_1_2__pre__TODOS"], undefined);   // 1:2 precisa de 50 pips: ainda aberta
});
t("entrada aberta é retomada na rodada seguinte e conta UMA vez ao resolver", () => {
  const cedo = [flat(0), flat(1)];
  const r1 = processarPar({ ...base, candles: cedo, analises: [an("a", 0)] });
  assert.equal(Object.keys(r1.deltas).length, 0);
  const tarde = [...cedo, c(2, 1.1, 1.1030, 1.0999, 1.1020)];
  const abertas = JSON.parse(JSON.stringify(r1.entradas));
  const r2 = processarPar({ ...base, candles: tarde, analises: [], abertas, ultimoLab: r1.ultimoLab });
  assert.equal(r2.deltas["LAB__ATUAL__pos__TODOS"].n, 1);
  const r3 = processarPar({ ...base, candles: tarde, analises: [], abertas: JSON.parse(JSON.stringify(r2.entradas)), ultimoLab: r2.ultimoLab });
  assert.equal(Object.keys(r3.deltas).length, 0);   // nada novo: não conta duas vezes
});
t("REANALISE usa as análises posteriores do par (BAIXA contra uma compra)", () => {
  const candles = Array.from({ length: 10 }, (_, i) => flat(i));
  const r = processarPar({ ...base, candles, analises: [an("a", 0), an("b", 20, { tendencia: "BAIXA", precoEntrada: 1.0990 })] });
  const e = r.entradas.find(x => x.id === "LAB_a");
  assert.equal(e.variantes.REANALISE.r, "REANALISE");
  assert.equal(e.variantes.REANALISE.p, -11.8);   // (1.0990-1.1000) = -10 pips, menos spread 1,8
});
t("grupos H1-H5 + L1: score, ADX, candle, lado do dólar, perfil", () => {
  const e = { par: "EUR/USD", direcao: "SELL", score: 42, adx: 20, candlestick: false, perfil: "AGRESSIVO" };
  assert.deepEqual(gruposDaEntrada(e), ["TODOS", "H1_score35a49", "H2_adx_ate29", "H3_sem_candle", "H4_dolar_comprado", "H5_agressivo", "L1_score40a44_adx25menos"]);
  const f = { par: "USD/JPY", direcao: "SELL", score: 52, adx: 35, candlestick: true, perfil: "BALANCEADO" };
  assert.deepEqual(gruposDaEntrada(f), ["TODOS", "H1_score50mais", "H2_adx30mais", "H3_com_candle", "H4_dolar_vendido", "H5_balanceado"]);
  assert.ok(gruposDaEntrada({ par: "EUR/JPY", direcao: "BUY", score: 20, adx: null }).includes("H4_dolar_cruzado"));
  assert.ok(!gruposDaEntrada({ par: "EUR/JPY", direcao: "BUY", score: 20, adx: null }).some(g => g.startsWith("H1_")), "score<35 fica só em TODOS");
});
t("contadores por grupo: o mesmo desfecho entra em TODOS e em cada grupo da entrada", () => {
  const candles = [flat(0), c(1, 1.1, 1.1030, 1.0999, 1.1020)];
  const r = processarPar({ ...base, candles, analises: [an("a", 0, { aprovado: true, direcao: "BUY", score: 52 })] });
  assert.equal(r.deltas["OFICIAL__ATUAL__pos__H1_score50mais"].pos, 1);
  assert.equal(r.deltas["OFICIAL__ATUAL__pos__H4_dolar_vendido"].n, 1);   // compra de EUR/USD = vendido em dólar
  assert.equal(r.deltas["OFICIAL__ATUAL__pos__H1_score35a49"], undefined);
});
console.log(`TODOS OS ${n} TESTES PASSARAM`);
