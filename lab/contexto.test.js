const assert = require("assert");
const { construirContexto, retornoJanela, cestaUsd24, votosSinais, indiceAte, enxugarAnalise, PARES_USD, BARRAS_24H } = require("./contexto");
const { gruposDaEntrada, processarPar } = require("./nucleo");
let n = 0;
const t = (nome, fn) => { fn(); n++; console.log("[OK] " + nome); };

const T0 = Date.UTC(2026, 9, 5, 0, 0), M = 5 * 60000;
// série de N candles de 5 min cujo fechamento anda linearmente de p0 até p1
const serie = (N, p0, p1) => Array.from({ length: N }, (_, i) => { const c = p0 + (p1 - p0) * i / (N - 1); return { timestamp: T0 + i * M, open: c, high: c, low: c, close: c }; });

t("indiceAte: só candle JÁ FECHADO (abertura + 5 min <= t)", () => {
  const cs = serie(10, 1, 1.1);
  assert.equal(indiceAte(cs, T0 + 5 * M), 4, "no instante exato do fechamento do candle 4 ele já conta");
  assert.equal(indiceAte(cs, T0 + 5 * M - 1), 3, "1 ms antes ainda não fechou");
  assert.equal(indiceAte(cs, T0), -1);
});
t("retornoJanela: 288 candles para trás, sem olhar adiante", () => {
  const cs = serie(1000, 1.0, 1.2);
  const tt = T0 + 600 * M;                       // candles fechados até o índice 599
  const r = retornoJanela(cs, tt, BARRAS_24H);
  assert.ok(Math.abs(r - (cs[599].close / cs[599 - 288].close - 1)) < 1e-12);
  const futuroMudado = cs.map((c, i) => (i > 599 ? { ...c, close: c.close * 5 } : c));
  assert.equal(retornoJanela(futuroMudado, tt, BARRAS_24H), r, "mudar o futuro não muda o contexto");
  assert.equal(retornoJanela(cs, T0 + 100 * M, BARRAS_24H), null, "histórico insuficiente = null (não inventa)");
});
t("cesta do dólar: EUR/USD cai e USD/JPY sobe => dólar subiu (>0); sem 5 pares => null", () => {
  const cp = {};
  for (const par of PARES_USD) cp[par] = serie(600, 1, 1);
  cp["EUR/USD"] = serie(600, 1.1, 1.1 * 0.997);   // -0,3% no total; nos últimos 288: parte disso
  cp["USD/JPY"] = serie(600, 150, 150 * 1.003);
  const u = cestaUsd24(cp, T0 + 600 * M);
  assert.ok(u > 0, "dólar subindo");
  const curto = { "EUR/USD": cp["EUR/USD"], "USD/JPY": cp["USD/JPY"], "GBP/USD": cp["GBP/USD"] };
  assert.equal(cestaUsd24(curto, T0 + 600 * M), null);
});
t("votos de sinais: só OUTROS pares com USD, só a análise mais recente com direção, só até 30 min antes", () => {
  const A = (par, min, extra) => ({ id: par + min, timestamp: T0 + min * 60000, ...extra });
  const ap = {
    "EUR/USD": [A("EUR/USD", 1, { aprovado: true, direcao: "SELL" })],                     // SELL em EUR/USD = dólar comprado
    "AUD/USD": [A("AUD/USD", 5, { tendencia: "ALTA" }), A("AUD/USD", 20, { tendencia: "BAIXA" })],   // a última: SELL = dólar comprado
    "USD/JPY": [A("USD/JPY", 25, { tendencia: "BAIXA" })],                                  // SELL em USD/JPY = dólar vendido
    "GBP/USD": [A("GBP/USD", -40, { tendencia: "BAIXA" })],                                 // velha demais
    "USD/CAD": [A("USD/CAD", 28, { tendencia: "LATERAL" })]                                 // sem direção
  };
  const v = votosSinais(ap, "NZD/USD", T0 + 30 * 60000);
  assert.deepEqual(v, { vUp: 2, vDn: 1 });
  assert.deepEqual(votosSinais(ap, "EUR/USD", T0 + 30 * 60000), { vUp: 1, vDn: 1 }, "o próprio par não vota");
  assert.deepEqual(votosSinais(ap, "NZD/USD", T0 + 10 * 60000), { vUp: 1, vDn: 1 }, "t = 10 min: EUR/USD (SELL, dólar sobe) e AUD/USD ALTA (BUY, dólar cai); as de 20 e 25 min são futuro e não votam");
  assert.deepEqual(votosSinais({ "EUR/USD": [A("EUR/USD", 0, { aprovado: true, direcao: "SELL" })] }, "NZD/USD", T0 + 30 * 60000), { vUp: 0, vDn: 0 }, "análise com exatamente 30 min já saiu da janela");
});
t("grupos X5/X7: a favor / contra / fraca, por limiar (0,8% e 0,25%)", () => {
  const e = (extra) => ({ par: "EUR/USD", direcao: "BUY", ctx: { m10: null, m24: null, u24: null, vUp: 0, vDn: 0, ...extra } });
  assert.ok(gruposDaEntrada(e({ m10: 0.01 })).includes("X5_10d_a_favor"));
  assert.ok(gruposDaEntrada(e({ m10: -0.01 })).includes("X5_10d_contra"));
  assert.ok(gruposDaEntrada(e({ m10: 0.005 })).includes("X5_10d_fraca"));
  assert.ok(gruposDaEntrada({ ...e({ m10: -0.01 }), direcao: "SELL" }).includes("X5_10d_a_favor"), "SELL com mercado caindo = a favor");
  assert.ok(gruposDaEntrada(e({ m24: 0.003 })).includes("X7_24h_a_favor"));
  assert.ok(gruposDaEntrada(e({ m24: 0.002 })).includes("X7_24h_fraca"));
  assert.ok(!gruposDaEntrada(e({})).some(g => g.startsWith("X5") || g.startsWith("X7")), "sem dado = sem grupo (não chuta)");
  assert.ok(!gruposDaEntrada({ par: "EUR/USD", direcao: "BUY" }).some(g => /^X[5678]/.test(g)), "entrada antiga sem ctx não ganha grupos novos");
});
t("grupo X6 (cesta do dólar): compra de AUD/USD quer dólar CAINDO; USD/JPY compra quer dólar SUBINDO; cruzados não têm", () => {
  const e = (par, direcao, u24) => ({ par, direcao, ctx: { m10: null, m24: null, u24, vUp: 0, vDn: 0 } });
  assert.ok(gruposDaEntrada(e("AUD/USD", "BUY", -0.003)).includes("X6_cesta_a_favor"));
  assert.ok(gruposDaEntrada(e("AUD/USD", "BUY", 0.003)).includes("X6_cesta_contra"));
  assert.ok(gruposDaEntrada(e("USD/JPY", "BUY", 0.003)).includes("X6_cesta_a_favor"));
  assert.ok(gruposDaEntrada(e("USD/JPY", "SELL", 0.003)).includes("X6_cesta_contra"));
  assert.ok(gruposDaEntrada(e("USD/CAD", "SELL", 0.001)).includes("X6_cesta_fraca"));
  assert.ok(!gruposDaEntrada(e("EUR/JPY", "BUY", 0.01)).some(g => g.startsWith("X6") || g.startsWith("X8")), "cruzado sem lado do dólar");
});
t("grupo X8 (concordância de sinais): o caso do usuário - 3 votam dólar caindo e a entrada quer dólar subindo = diverge", () => {
  const e = (par, direcao, vUp, vDn) => ({ par, direcao, ctx: { m10: null, m24: null, u24: null, vUp, vDn } });
  assert.ok(gruposDaEntrada(e("USD/CAD", "BUY", 0, 3)).includes("X8_sinais_diverge"));
  assert.ok(gruposDaEntrada(e("USD/CAD", "SELL", 0, 3)).includes("X8_sinais_concorda"));
  assert.ok(gruposDaEntrada(e("USD/CAD", "SELL", 1, 2)).includes("X8_sinais_misto"));
  assert.ok(gruposDaEntrada(e("EUR/USD", "BUY", 1, 0)).includes("X8_sinais_sem_dados"), "< 2 votantes");
  assert.ok(gruposDaEntrada(e("EUR/USD", "SELL", 2, 0)).includes("X8_sinais_concorda"), "SELL em EUR/USD = dólar comprado; 2 votos dólar sobe");
});
t("processarPar com contexto: grava ctx na entrada e entradas SEM contexto continuam como antes; analise enxuta = mesma entrada", () => {
  const a = { id: "x1", timestamp: T0 + 3000 * M, aprovado: true, direcao: "BUY", tendencia: "ALTA", tpPips: 25, slPips: 27, precoEntrada: 1.1, perfilResolvido: "BALANCEADO", score: 50, lote: 0.02,
    candlestickDetectado: null, smcDetectado: null, indicadores: { adx: 28, rsi: 55, atr: 0.0004, ema9: 1, ema21: 2 }, textoLongo: "x".repeat(1000), historico: { a: 1 } };
  const candles = serie(4000, 1.0, 1.1);
  const contexto = construirContexto({ candlesPorPar: { "EUR/USD": candles }, analisesPorPar: { "AUD/USD": [{ timestamp: T0 + 3000 * M - 5 * M, tendencia: "ALTA" }, { timestamp: T0 + 3000 * M - 2 * M, tendencia: "ALTA" }] } });
  const base = { par: "EUR/USD", abertas: [], ultimoLab: null, candles, registradoEm: 0, agora: T0 + 4000 * M };
  const sem = processarPar({ ...base, analises: [a] });
  const com = processarPar({ ...base, analises: [a], contexto });
  const slim = processarPar({ ...base, analises: [enxugarAnalise(a)], contexto });
  assert.ok(sem.entradas.every(e => e.ctx === undefined));
  const e = com.entradas[0];
  assert.ok(e.ctx && Number.isFinite(e.ctx.m10) && Number.isFinite(e.ctx.m24) && e.ctx.u24 === null, "m10/m24 do próprio par; cesta null (só 1 par com candles)");
  assert.equal(e.ctx.vDn, 1, "voto: AUD/USD com tendência ALTA = BUY em AUD/USD = dólar vendido (só a análise mais recente)");
  assert.equal(e.ctx.vUp, 0);
  assert.ok(Object.keys(com.deltas).some(k => k.includes("X5_10d_a_favor")) || Object.keys(com.deltas).some(k => k.includes("X5_10d_fraca")), "contadores X5 criados");
  assert.deepEqual(slim.entradas.map(x => ({ ...x })), com.entradas.map(x => ({ ...x })), "enxugar a análise não muda nada na entrada");
  assert.ok(JSON.stringify(enxugarAnalise(a)).length < 500, "a análise enxuta é pequena");
});
console.log(`TODOS OS ${n} TESTES PASSARAM`);
