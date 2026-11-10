const assert = require("assert");
const { offsetServidorSeg, lerCsv, paraUtc, indiceDaVela, julgar, rejulgar, pipDe } = require("./rejulgar");

// ---- fuso do servidor: GMT+3 no verão dos EUA, GMT+2 no inverno (virou no 1º domingo de novembro de 2026 = 01/11)
const S = (iso) => Date.parse(iso) / 1000;   // "hora do servidor" como segundos "UTC ingênuos"
assert.strictEqual(offsetServidorSeg(S("2026-10-15T12:00:00Z")), 10800);
assert.strictEqual(offsetServidorSeg(S("2026-10-31T23:00:00Z")), 10800);
assert.strictEqual(offsetServidorSeg(S("2026-11-02T12:00:00Z")), 7200);
assert.strictEqual(offsetServidorSeg(S("2026-01-15T12:00:00Z")), 7200);
assert.strictEqual(offsetServidorSeg(S("2026-03-07T12:00:00Z")), 7200);   // 2º domingo de março de 2026 = 08/03: antes, inverno
assert.strictEqual(offsetServidorSeg(S("2026-03-09T12:00:00Z")), 10800);   // depois, verão
assert.strictEqual(pipDe(5), 0.0001); assert.strictEqual(pipDe(3), 0.01); assert.strictEqual(pipDe(4), 0.0001);

// ---- CSV (servidor 12:00 em 15/10 = 09:00 UTC)
const t0 = S("2026-10-15T12:00:00Z");
const bar = (sym, i, o, h, l, c, sp = 20) => `${sym},${t0 + i * 300},${o},${h},${l},${c},${sp},5`;
const linhas = ["offset_servidor_seg=7200", "simbolo,hora_servidor,open,high,low,close,spread_pontos,digitos",
    bar("EURUSD", 0, "1.10000", "1.10050", "1.09980", "1.10020"),   // vela do sinal (não conta no julgamento)
    bar("EURUSD", 1, "1.10020", "1.10100", "1.10000", "1.10090"),
    bar("EURUSD", 2, "1.10090", "1.10260", "1.10080", "1.10250"),
    bar("EURUSD", 3, "1.10250", "1.10300", "1.09900", "1.10000")];
const parsed = lerCsv(linhas.join("\n"));
assert.strictEqual(parsed.offsetExport, 7200); assert.strictEqual(parsed.barras.EURUSD.length, 4);
const barras = paraUtc(parsed).EURUSD;
assert.strictEqual(barras[0].ms, Date.parse("2026-10-15T09:00:00Z"));           // 12:00 do servidor - 3 h
const sinalMs = Date.parse("2026-10-15T09:02:10Z");
assert.strictEqual(indiceDaVela(barras, sinalMs), 0);
assert.strictEqual(indiceDaVela(barras, Date.parse("2026-10-15T09:20:00Z")), -1, "depois da última vela: sem dados");
assert.strictEqual(indiceDaVela(barras, Date.parse("2026-10-15T08:00:00Z")), -1, "antes do início");

// COMPRA: entra no ask = 1,10000 + 20 pontos = 1,10020; TP 20 pips = 1,10220; SL 20 pips = 1,09820
const compra = { direcao: "BUY", t: sinalMs, tp: 20, sl: 20, precoApp: 1.1 };
let j = julgar(compra, barras);
assert.strictEqual(j.estado, "WIN"); assert.strictEqual(j.barras, 2); assert.strictEqual(j.gapPips, 2);   // 2 pips pior que o preço do app
// SL de 3 pips (1,09990) só é tocado na vela 3 (mínima 1,09900); TP grande para não vencer antes
j = julgar({ ...compra, tp: 100, sl: 3 }, barras); assert.strictEqual(j.estado, "LOSS"); assert.strictEqual(j.barras, 3);
// TP e SL na mesma vela (compra, 1 pip cada, vela 1 vai de 1,10000 a 1,10100) = ambíguo
assert.strictEqual(julgar({ ...compra, tp: 1, sl: 1 }, barras).estado, "AMBIGUO");
assert.strictEqual(julgar({ ...compra, tp: 500, sl: 500 }, barras).estado, "ABERTA");
// VENDA: entra no bid 1,10000 e sai no ask (low + 0,00020). SL 20 pips = 1,10200: high+spread da vela 2 = 1,10280 -> LOSS
const venda = { direcao: "SELL", t: sinalMs, tp: 20, sl: 20, precoApp: 1.1 };
j = julgar(venda, barras); assert.strictEqual(j.estado, "LOSS"); assert.strictEqual(j.barras, 2); assert.strictEqual(j.gapPips, 0);
// TP 7 pips = 1,09930; ask na vela 3 = 1,09900 + 0,00020 = 1,09920 <= 1,09930 -> WIN (o spread de 2 pips é pago na saída)
j = julgar({ ...venda, tp: 7, sl: 500 }, barras); assert.strictEqual(j.estado, "WIN"); assert.strictEqual(j.barras, 3);
// sem barras para o instante
assert.strictEqual(julgar({ ...compra, t: Date.parse("2026-10-16T00:00:00Z") }, barras).estado, "SEM_DADOS");

// ---- agregado: 3 sinais (compra casa, venda vira, GBP/USD sem dados)
const doc = (id, par, dir, res) => ({ id, par, direcao: dir, timestamp: sinalMs, inicioOperacao: sinalMs, fimOperacao: sinalMs + 3600e3, precoEntrada: 1.1, status: "ENCERRADA",
    resultado: res, resultadoFinanceiro: res === "WIN" ? 5 : -5, financeiro: { regimeTPSL: "CONFIG", tpPips: 20, slPips: 20 } });
const r = rejulgar([doc("a", "EUR/USD", "BUY", "WIN"), doc("b", "EUR/USD", "SELL", "WIN"), doc("c", "GBP/USD", "BUY", "LOSS")], parsed);
assert.strictEqual(r.sinais, 3); assert.strictEqual(r.comDadosXM, 2); assert.strictEqual(r.decididosWinLoss, 2);
assert.strictEqual(r.matriz.appWIN.WIN, 1); assert.strictEqual(r.matriz.appWIN.LOSS, 1); assert.strictEqual(r.matriz.appLOSS.SEM_DADOS, 1);
assert.strictEqual(r.concordanciaWinLossPct, 50); assert.deepStrictEqual(r.viradasPorPar, { "EUR/USD": 1 });
assert.strictEqual(r.acertoXmPct, 50); assert.strictEqual(r.xmAmbiguoComoLoss.n, 2);
assert.strictEqual(r.gapPips.n, 2);
assert.strictEqual(r.spreadPar[0].par, "EUR/USD"); assert.strictEqual(r.spreadPar[0].mediana, 2); assert.strictEqual(r.spreadsZerados, false);
// o diagnóstico de fuso: com a regra (GMT+3 em outubro) o preço do app casa com a vela; com GMT+2 não há vela no instante
assert.strictEqual(r.distanciaAppXmPipsPorOffset.regra, 0); assert.strictEqual(r.distanciaAppXmPipsPorOffset["GMT+2"], null);
// nada por sinal vaza no resultado agregado
assert.ok(!JSON.stringify(r).includes('"id"'));
console.log("TODOS OS TESTES DO REJULGAMENTO XM PASSARAM");
