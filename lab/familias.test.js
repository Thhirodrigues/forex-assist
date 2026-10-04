const assert = require("assert");
const { emaSerie, rsiSerie, sinaisF1, sinaisF2, sinaisF3, sinaisF4, sinaisC0, sinaisParaAnalises, horas } = require("./familias");
const CINCO = 300000, HORA = 3600000;
const seg = Date.UTC(2026, 8, 7, 0, 0, 0);   // segunda 00:00 UTC
const cd = (ts, o, h, l, c) => ({ ts, o, h, l, c });

// ---- indicadores ----
assert.ok(Math.abs(emaSerie([10, 10, 10, 10], 3)[3] - 10) < 1e-12);
const subindo = Array.from({ length: 40 }, (_, i) => 1 + i * 0.01);
assert.equal(rsiSerie(subindo, 14)[39], 100, "só alta -> RSI 100");
assert.equal(rsiSerie(subindo.slice().reverse(), 14)[39], 0, "só queda -> RSI 0");
assert.equal(rsiSerie([1, 2], 14)[1], null);

// ---- F1: faixa asiática ----
const dia = [];
for (let i = 0; i < 12 * 7; i++) dia.push(cd(seg + i * CINCO, 1.1005, 1.1010, 1.1000, 1.1005));   // 00-07h: faixa 1,1000-1,1010
dia.push(cd(seg + 7 * HORA, 1.1005, 1.1008, 1.1002, 1.1006));                                        // 07:00 dentro da faixa
dia.push(cd(seg + 7 * HORA + CINCO, 1.1006, 1.1020, 1.1005, 1.1015));                                // 07:05 fecha acima -> COMPRA
dia.push(cd(seg + 7 * HORA + 2 * CINCO, 1.1015, 1.1016, 1.0990, 1.0995));                            // 07:10 fecha abaixo, mas já houve sinal no dia
const f1 = sinaisF1(dia);
assert.equal(f1.length, 1); assert.equal(f1[0].direcao, "BUY"); assert.equal(f1[0].ts, seg + 7 * HORA + 2 * CINCO, "sinal no fechamento do candle");
assert.equal(sinaisF1(dia.slice(12 * 6)).length, 0, "faixa com poucos candles: sem sinal");
const tarde = dia.slice(0, 12 * 7); for (let i = 0; i < 12 * 6; i++) tarde.push(cd(seg + 7 * HORA + i * CINCO, 1.1005, 1.1008, 1.1002, 1.1005));
tarde.push(cd(seg + 13 * HORA, 1.1, 1.103, 1.1, 1.102));
assert.equal(sinaisF1(tarde).length, 0, "rompimento depois das 12:00 não vale");

// ---- F2: RSI cruzando ----
let p = 1.1; const f2c = [];
for (let i = 0; i < 40; i++) { const o = p; p = i < 20 ? p + (i % 2 ? 0.0001 : -0.00005) : p - 0.0004; f2c.push(cd(seg + i * CINCO, o, Math.max(o, p), Math.min(o, p), p)); }
const f2 = sinaisF2(f2c);
assert.ok(f2.length >= 1 && f2.every(s => s.direcao === "BUY"), "queda forte cruza o RSI para <= 30: compra");

// ---- F4: momentum de 1h, só em horas cheias ----
const f4c = Array.from({ length: 30 }, (_, i) => cd(seg + i * CINCO, 1 + i * 1e-4, 1 + i * 1e-4 + 1e-5, 1 + i * 1e-4 - 1e-5, 1 + i * 1e-4));
const f4 = sinaisF4(f4c);
assert.ok(f4.length >= 1 && f4.every(s => s.ts % HORA === 0 && s.direcao === "BUY"));

// ---- F3: tendência de 1h + cruzamento ----
const f3c = []; let q = 1.1;
for (let i = 0; i < 12 * 90; i++) { const o = q; q = q + 0.00004 + Math.sin(i / 7) * 0.0002; f3c.push(cd(seg + i * CINCO, o, Math.max(o, q) + 1e-5, Math.min(o, q) - 1e-5, q)); }
const f3 = sinaisF3(f3c);
assert.ok(f3.length > 5, "em tendência de alta com oscilação há vários pullbacks");
assert.ok(f3.filter(s => s.direcao === "BUY").length > f3.filter(s => s.direcao === "SELL").length * 3, "quase só COMPRA em alta de 1h");
assert.equal(horas(f3c).length, 90);
assert.equal(sinaisF3(f3c.slice(0, 100)).length, 0, "pouca história: sem sinal");

// ---- C0: determinístico e equilibrado ----
const c0a = sinaisC0(f3c, "EUR/USD"), c0b = sinaisC0(f3c, "EUR/USD");
assert.deepEqual(c0a, c0b);
const compras = c0a.filter(s => s.direcao === "BUY").length;
assert.ok(compras > c0a.length * 0.4 && compras < c0a.length * 0.6, `equilíbrio ${compras}/${c0a.length}`);

// ---- bloqueio: posição aberta bloqueia; depois de fechar e 30 min, o próximo passa ----
const plano = Array.from({ length: 200 }, (_, i) => cd(seg + i * CINCO, 1.1, 1.1003, 1.0997, 1.1));
const sig = [0, 3, 40, 120].map(i => ({ i, ts: plano[i].ts + CINCO, direcao: "BUY", preco: 1.1 }));
assert.equal(sinaisParaAnalises({ par: "EUR/USD", c5: plano, sinais: sig, barreiraPips: 25 }).length, 1, "nada fecha: a 1ª posição fica aberta e bloqueia as demais");
plano[10] = cd(plano[10].ts, 1.1, 1.1030, 1.0999, 1.1020);   // bate o alvo de +25 pips no candle 10
const an2 = sinaisParaAnalises({ par: "EUR/USD", c5: plano, sinais: sig, barreiraPips: 25 });
// sinal 0 abre e fecha no candle 10; o de i=3 cai DENTRO da posição -> ignorado; o de i=40 passa e fica aberto (plano), bloqueando o de i=120
assert.deepEqual(an2.map(a => a.timestamp), [sig[0].ts, sig[2].ts]);
assert.ok(an2[0].aprovado === true && an2[0].tpPips === 25 && an2[0].direcao === "BUY");
console.log("TESTES DAS FAMÍLIAS PASSARAM");
