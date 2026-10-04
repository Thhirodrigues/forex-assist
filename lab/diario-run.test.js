const assert = require("assert");
const { limparDiarios, baixarDiarios, lerDiarios } = require("./diario-run");
const D = (s) => Date.parse(s + "T00:00:00Z");
const c = (dia, v = 1) => ({ ts: D(dia), o: v, h: v + 0.1, l: v - 0.1, c: v + 0.05 });
// domingo incorporado à segunda; sábado descartado; quebrados saem
const r = limparDiarios([c("2026-09-25"), { ...c("2026-09-27", 2), o: 2, h: 2.5, l: 1.9, c: 2.1 }, { ...c("2026-09-28", 3), o: 3, h: 3.2, l: 2.9, c: 3.1 }, c("2026-09-26"), c("2026-09-29"), { ts: D("2026-09-30"), o: NaN, h: 1, l: 1, c: 1 }]);
assert.deepEqual(r.candles.map(x => new Date(x.ts).toISOString().slice(0, 10)), ["2026-09-25", "2026-09-28", "2026-09-29"]);
const seg = r.candles[1];
assert.equal(seg.o, 2, "abertura do domingo"); assert.equal(seg.h, 3.2); assert.equal(seg.l, 1.9); assert.equal(seg.c, 3.1, "fechamento da segunda");
assert.equal(r.incorporadas, 1); assert.equal(r.descartadas, 1);
// ida e volta com Firestore falso + API falsa
const docs = {};
const lab = { collection: (n) => ({ doc: (id) => ({ set: async (v) => { (docs[n] = docs[n] || {})[id] = v; }, get: async () => ({ exists: !!(docs[n] || {})[id], data: () => docs[n][id] }) }) }) };
const http = { get: async () => ({ data: { values: Array.from({ length: 300 }, (_, i) => ({ datetime: new Date(D("2026-01-01") + (299 - i) * 86400000).toISOString().slice(0, 10), open: "1.1", high: "1.2", low: "1.0", close: "1.15" })) } }) };
(async () => {
  await baixarDiarios({ lab, pares: ["EUR/USD", "USD/JPY"], chave: "k", http, esperar: async () => {}, log: () => {} });
  const dados = await lerDiarios({ lab, pares: ["EUR/USD", "USD/JPY", "GBP/USD"] });
  assert.deepEqual(Object.keys(dados), ["EUR/USD", "USD/JPY"], "par não baixado é ignorado");
  assert.ok(dados["EUR/USD"].length > 200 && dados["EUR/USD"].every((x, i, a) => i === 0 || x.ts > a[i - 1].ts));
  assert.ok([0, 6].every(d => dados["EUR/USD"].every(x => new Date(x.ts).getUTCDay() !== d)), "sem fim de semana");
  console.log("TESTES DO DIÁRIO (orquestração) PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
