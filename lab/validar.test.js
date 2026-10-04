const assert = require("assert");
const { validar } = require("./validar");
const T0 = Date.UTC(2026, 9, 7, 12, 0);
const col = (docs) => { const q = (f = []) => ({ where: (k, op, v) => q([...f, [k, op, v]]), orderBy: () => q(f),
  async get() { let d = docs; for (const [k, op, v] of f) d = d.filter(x => op === ">" ? x[k] > v : x[k] === v);
    return { forEach: cb => d.forEach(x => cb({ id: x.id || "x", data: () => x })) }; } }); return q(); };
const entrada = { tipo: "OFICIAL", par: "EUR/USD", direcao: "BUY", t: T0, precoEntrada: 1.1, tpPips: 25, slPips: 25, spreadPips: 1.8 };
const real = { id: "r1", par: "EUR/USD", direcao: "BUY", precoEntrada: 1.1, inicioOperacao: T0 + 3000, timestamp: T0 + 3000, resultado: "WIN", fimOperacao: T0 + 600000 };
const dt = (i) => new Date(T0 + i * 300000).toISOString().slice(0, 19).replace("T", " ");
// candle 1 toca +25,5 pips: WIN sem spread (25) mas NÃO com spread 1,8 (precisa 26,8)
const brutos = [0, 1, 2].map(i => ({ datetime: dt(i), open: "1.1", high: i === 1 ? "1.10255" : "1.1004", low: "1.0996", close: "1.1" }));
(async () => {
  const logs = [];
  const r = await validar({ lab: { collection: () => col([entrada]) }, ofic: { collection: () => col([real]) },
    getCandles: async () => brutos, esperar: async () => {}, log: m => logs.push(m) });
  assert.equal(r.comReal, 1); assert.equal(r.igualSem, 1); assert.equal(r.igualCom, 0, "spread muda o desfecho: WIN vira ABERTA");
  assert.ok(logs.join("\n").includes("ok sem spread; spread muda o desfecho"));
  // sinal real sem correspondente -> aparece como "sem entrada OFICIAL"; entrada sem real -> obs própria
  const logs2 = [];
  await validar({ lab: { collection: () => col([entrada]) }, ofic: { collection: () => col([{ ...real, precoEntrada: 1.2 }]) },
    getCandles: async () => brutos, esperar: async () => {}, log: m => logs2.push(m) });
  assert.ok(logs2.join("\n").includes("sem operação real casada") && logs2.join("\n").includes("sem entrada OFICIAL"));
  console.log("TESTES DA VALIDAÇÃO PASSARAM");
})().catch(e => { console.error(e); process.exit(1); });
