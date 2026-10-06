const assert = require("assert");
const { limparDiarios, baixarDiarios, lerDiarios, lerTaxas, rodarCarry } = require("./diario-run");
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
  // taxas e carry (protocolo 6.23)
  await assert.rejects(() => lerTaxas({ lab }), /lab-taxas/, "sem taxas guardadas: erro claro, não segue com carry zerado");
  const taxasFix = Object.fromEntries(["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"].map((m, i) => [m, { ts: [D("2000-01-01")], v: [i] }]));
  await lab.collection("diario").doc("_taxas").set({ series: taxasFix });
  assert.deepEqual(await lerTaxas({ lab }), taxasFix);
  const sint = (k) => { let ts = D("2012-01-02"), p = 1.1; const o = []; for (let i = 0; i < 900; i++) { while ([0, 6].includes(new Date(ts).getUTCDay())) ts += 86400000; const c = p * (1 + 0.004 * Math.sin(i * (k + 1) * 0.37)); o.push({ ts, o: p, h: Math.max(p, c) * 1.001, l: Math.min(p, c) * 0.999, c }); p = c; ts += 86400000; } return o; };
  const linhas = [];
  const res = await rodarCarry({ dados: { "EUR/USD": sint(1), "GBP/USD": sint(2), "AUD/USD": sint(3) }, taxas: taxasFix, log: (l) => linhas.push(l) });
  assert.deepEqual(Object.keys(res), ["C1", "C2", "C3", "D1_swap", "D2_swap", "D3_swap", "D4_swap", "D5_swap"]);
  assert.ok(linhas.length === 8 && linhas.slice(3).every(l => l.startsWith("[informativo]")) && /swap pior/.test(linhas[0]), "informativas marcadas, swap pior reportado");
  console.log("TESTES DO DIÁRIO (orquestração) PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
