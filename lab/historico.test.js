const assert = require("assert");
const { baixarHistorico, fmt, paraMs } = require("./historico");
// API falsa: devolve páginas de 5000 candles de 5 min terminando em end_date (inclusive), do mais novo ao mais antigo
const BASE = Date.UTC(2026, 9, 1, 0, 0, 0);
function http(limiteAntigo) {
  return { get: async (url) => {
    const end = paraMs(decodeURIComponent(url.match(/end_date=([^&]+)/)[1]));
    const values = [];
    for (let k = 0; k < 5000; k++) { const ts = end - k * 300000; if (ts < limiteAntigo) break; values.push({ datetime: fmt(ts), open: "1.1", high: "1.2", low: "1.0", close: "1.1" }); }
    return { data: values.length ? { values } : { status: "error", code: 400, message: "No data is available" } };
  } };
}
(async () => {
  const logs = [];
  // pede 30 dias, a API tem 100: 2 páginas (5000 candles = 17,4 dias) e para ao alcançar o período
  let r = await baixarHistorico({ par: "EUR/USD", dias: 30, chave: "k", agora: BASE, http: http(BASE - 100 * 86400000), esperar: async () => {}, log: m => logs.push(m) });
  assert.equal(r.paginas, 2);
  assert.ok(r.candles[0].ts >= BASE - 30 * 86400000 && r.candles[r.candles.length - 1].ts <= BASE);
  assert.equal(new Set(r.candles.map(c => c.ts)).size, r.candles.length, "sem duplicados");
  assert.ok(r.candles.every((c, i) => i === 0 || c.ts > r.candles[i - 1].ts), "ordenado do mais antigo ao mais novo");
  // histórico mais curto que o pedido: para sem inventar
  r = await baixarHistorico({ par: "EUR/USD", dias: 90, chave: "k", agora: BASE, http: http(BASE - 20 * 86400000), esperar: async () => {}, log: () => {} });
  assert.ok(/sem mais candles|erro/.test(r.parou), r.parou);
  assert.ok((BASE - r.candles[0].ts) / 86400000 <= 20.01);
  // erro da API não derruba: devolve o que já tinha
  const ruim = { get: async () => ({ data: { status: "error", code: 429, message: "limit" } }) };
  r = await baixarHistorico({ par: "EUR/USD", dias: 30, chave: "k", agora: BASE, http: ruim, esperar: async () => {}, log: () => {} });
  assert.equal(r.candles.length, 0); assert.ok(/429/.test(r.parou));
  console.log("TESTES DO HISTÓRICO PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
