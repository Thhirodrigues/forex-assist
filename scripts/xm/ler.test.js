const assert = require("assert");
const { normalizarPar, organizar, parear, resumir } = require("./ler");

assert.strictEqual(normalizarPar("EURUSD"), "EUR/USD");
assert.strictEqual(normalizarPar("GBPJPY#"), "GBP/JPY");
assert.strictEqual(normalizarPar("usdcad.r"), "USD/CAD");
assert.strictEqual(normalizarPar(""), null);

// deals: depósito 100, compra EURUSD aberta e fechada no TP, venda USDJPY fechada no SL, reenvio do mesmo dia (não duplica)
const OFF = 10800;   // servidor = UTC+3
const T = 1_790_000_000;
const deals = [
    { id: 1, t: T, tipo: 2, ent: 0, pos: 0, sym: "", vol: 0, px: 0, sl: 0, tp: 0, lucro: 100, swap: 0, com: 0, fee: 0, razao: 0, cmt: "Deposit" },
    { id: 2, t: T + 60, tipo: 0, ent: 0, pos: 11, sym: "EURUSD", vol: 0.02, px: 1.1, sl: 1.0995, tp: 1.1005, lucro: 0, swap: 0, com: 0, fee: 0, razao: 3, cmt: "" },
    { id: 3, t: T + 600, tipo: 1, ent: 1, pos: 11, sym: "EURUSD", vol: 0.02, px: 1.1005, sl: 1.0995, tp: 1.1005, lucro: 5.1, swap: -0.2, com: 0, fee: 0, razao: 5, cmt: "" },
    { id: 4, t: T + 700, tipo: 1, ent: 0, pos: 12, sym: "USDJPY#", vol: 0.02, px: 150, sl: 150.05, tp: 149.95, lucro: 0, swap: 0, com: 0, fee: 0, razao: 3, cmt: "" },
    { id: 5, t: T + 900, tipo: 0, ent: 1, pos: 12, sym: "USDJPY#", vol: 0.02, px: 150.05, sl: 150.05, tp: 149.95, lucro: -4.9, swap: 0, com: 0, fee: 0, razao: 4, cmt: "" },
    { id: 6, t: T + 950, tipo: 0, ent: 0, pos: 13, sym: "GBPUSD", vol: 0.02, px: 1.3, sl: 0, tp: 0, lucro: 0, swap: 0, com: 0, fee: 0, razao: 3, cmt: "" }   // ainda aberta
];
const estadoJson = { v: 1, gmt: T + 1000 - OFF, srv: T + 1000, off: OFF, conta: { balance: 100, equity: 99, margin: 5, free: 94, nivel: 1980, moeda: "USD", alav: 1000 }, pos: [{ tk: 13, sym: "GBPUSD", tipo: 0, vol: 0.02, px: 1.3, sl: 0, tp: 0, atual: 1.299, lucro: -1, swap: 0, t: T + 950 }] };
const docs = [
    { id: "estado", em: "x", json: JSON.stringify(estadoJson) },
    { id: "d_20261103", json: JSON.stringify({ v: 1, dia: "2026-11-03", deals: deals.slice(0, 4) }) },
    { id: "d_20261103b".slice(0, 10), json: JSON.stringify({ v: 1, dia: "2026-11-03", deals }) },   // mesmo id lógico reenviado
    { id: "lixo", json: "{nao e json" },
    { id: "d_20261104", json: "{quebrado" }
];
const org = organizar(docs);
assert.strictEqual(org.deals.length, 6, "deals sem duplicar");
assert.ok(org.estado && org.estado.conta.balance === 100);

const { fechadas, saldos, abertasNaJanela } = parear(org.deals, OFF);
assert.strictEqual(fechadas.length, 2);
assert.deepStrictEqual(abertasNaJanela, ["13"]);
const a = fechadas.find(x => x.pos === "11"), b = fechadas.find(x => x.pos === "12");
assert.strictEqual(a.par, "EUR/USD"); assert.strictEqual(a.direcao, "BUY"); assert.strictEqual(a.motivo, "TP");
assert.strictEqual(a.liquido, 4.9); assert.strictEqual(a.abertoUtc, T + 60 - OFF);
assert.strictEqual(b.par, "USD/JPY"); assert.strictEqual(b.direcao, "SELL"); assert.strictEqual(b.motivo, "SL"); assert.strictEqual(b.liquido, -4.9);
assert.strictEqual(saldos.length, 1); assert.strictEqual(saldos[0].tipo, "BALANCE"); assert.strictEqual(saldos[0].valor, 100);

const r = resumir(org, (T + 1000 - OFF + 120) * 1000);
assert.strictEqual(r.balanceCalculado, 100); assert.strictEqual(r.diferencaBalance, 0);
assert.strictEqual(r.idadeEstadoMin, 2); assert.strictEqual(r.posicoesAbertas, 1);
assert.deepStrictEqual(r.porMotivo, { TP: 1, SL: 1 });
assert.strictEqual(r.movimentos.length, 1); assert.strictEqual(r.movimentos[0].tipo, "BALANCE"); assert.strictEqual(r.movimentos[0].valor, 100);
assert.strictEqual(r.movimentos[0].emUtc, new Date((T - OFF) * 1000).toISOString());
assert.strictEqual(Object.keys(r.porDia).length, 1); assert.strictEqual(Object.values(r.porDia)[0].n, 2); assert.strictEqual(Object.values(r.porDia)[0].liquido, 0);
assert.ok(r.primeiroFechamentoUtc <= r.ultimoFechamentoUtc);

// posição fechada cuja abertura ficou fora da janela exportada: marcada, direção vem do deal de saída invertido
const so = parear([{ id: 9, t: T, tipo: 1, ent: 1, pos: 99, sym: "AUDUSD", vol: 0.02, px: 0.7, sl: 0, tp: 0, lucro: 2, swap: 0, com: 0, fee: 0, razao: 0, cmt: "" }]);
assert.strictEqual(so.fechadas[0].semAbertura, true); assert.strictEqual(so.fechadas[0].direcao, "BUY");
console.log("TODOS OS TESTES DA LEITURA XM PASSARAM");
