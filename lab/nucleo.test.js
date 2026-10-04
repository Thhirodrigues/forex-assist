const assert = require("assert");
const { processarPar, gruposDaEntrada, aplicarTeto, paridadeDoId, contarEntradas } = require("./nucleo");
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
t("spread 2x: o mesmo candle que dá WIN com spread normal fica ABERTA com 2x", () => {
  const candles = [flat(0), c(1, 1.1, 1.10275, 1.0999, 1.1020)];   // +27,5 pips: bate 25+1,8, não bate 25+3,6
  const r = processarPar({ ...base, candles, analises: [an("a", 0)] });
  const v = r.entradas.find(x => x.id === "LAB_a").variantes;
  assert.equal(v.ATUAL.r, "WIN"); assert.equal(v.ATUAL_SPREAD_2X.r, "ABERTA");
});
t("grupos exploratórios: RSI esticado a favor, sessão por hora UTC, lote", () => {
  const g1 = gruposDaEntrada({ par: "EUR/USD", direcao: "BUY", rsi: 72, t: Date.UTC(2026, 9, 7, 13, 0), lote: 0.02 });
  assert.ok(g1.includes("X1_rsi_esticado") && g1.includes("X2_sessao_sobreposicao") && g1.includes("X3_lote_0.02"));
  assert.ok(gruposDaEntrada({ par: "EUR/USD", direcao: "SELL", rsi: 72, t: Date.UTC(2026, 9, 7, 3, 0) }).includes("X1_rsi_normal"), "RSI 72 vendendo não é esticado A FAVOR");
  assert.ok(gruposDaEntrada({ par: "EUR/USD", direcao: "SELL", rsi: 28, t: Date.UTC(2026, 9, 7, 3, 0) }).includes("X1_rsi_esticado"));
  assert.ok(gruposDaEntrada({ par: "EUR/USD", direcao: "BUY", rsi: 50, t: Date.UTC(2026, 9, 7, 22, 0) }).includes("X2_sessao_fora"));
});
t("ALEATORIO: direção sorteada é determinística (mesmo id, mesma direção) e varia entre ids", () => {
  assert.equal(paridadeDoId("OFICIAL_abc"), paridadeDoId("OFICIAL_abc"));
  const v = new Set(Array.from({ length: 40 }, (_, i) => paridadeDoId("x" + i)));
  assert.equal(v.size, 2, "com 40 ids aparecem os dois lados");
});
t("teto de exposição: com K=1 uma segunda compra de USD aberta é barrada; cruzado passa; fechada libera", () => {
  const e = (id, par, direcao, t, r, f) => ({ id, tipo: "OFICIAL", par, direcao, t, variantes: { ATUAL: { r, f } } });
  const H = 3600e3;
  const lista = [
    e("a", "EUR/USD", "SELL", 0, "WIN", 5 * H),          // comprado em dólar, fecha em 5 h
    e("b", "USD/JPY", "BUY", 1 * H, "ABERTA"),            // comprado em dólar de novo, com a primeira aberta -> barrada (K=1)
    e("c", "EUR/JPY", "BUY", 2 * H, "ABERTA"),            // cruzado: sem lado, passa
    e("d", "GBP/USD", "SELL", 6 * H, "LOSS", 8 * H),     // comprado em dólar, a primeira já fechou -> passa
    e("x", "EUR/USD", "BUY", 3 * H, "ABERTA")             // vendido em dólar: outro lado, passa
  ];
  assert.deepEqual(aplicarTeto(lista, 1).map(x => x.id), ["a", "c", "x", "d"].sort((p, q) => lista.find(z => z.id === p).t - lista.find(z => z.id === q).t));
  assert.equal(aplicarTeto(lista, 2).length, 5, "K=2: ninguém é barrado aqui");
  assert.ok(aplicarTeto(lista, 1).every(x => x.tipo === "OFICIAL_TETO1"));
});
t("contarEntradas inclui os tipos com teto (OFICIAL_TETO1/2) além do base", () => {
  const e = (id, t, r, f, p) => ({ id, tipo: "OFICIAL", par: "EUR/USD", direcao: "SELL", t, preRegistro: false, score: 45, adx: 20, perfil: "AGRESSIVO",
    variantes: { ATUAL: { r, f, p, d: 10, amb: false } } });
  const d = contarEntradas([e("1", 0, "WIN", 100000, 25), e("2", 50000, "LOSS", 90000, -25)]);
  assert.equal(d["OFICIAL__ATUAL__pos__TODOS"].n, 2);
  assert.equal(d["OFICIAL_TETO1__ATUAL__pos__TODOS"].n, 1, "a 2ª entra com a 1ª ainda aberta no mesmo lado: barrada");
  assert.equal(d["OFICIAL_TETO2__ATUAL__pos__TODOS"].n, 2);
});
console.log(`TODOS OS ${n} TESTES PASSARAM`);
